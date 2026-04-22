import http from 'http'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PORT = 3000

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.geojson': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

// SSE clients waiting for reload signals
const clients = new Set()

const RELOAD_SCRIPT = `
<script>
(function() {
  const es = new EventSource('/__reload');
  es.onmessage = () => location.reload();
  es.onerror = () => { es.close(); setTimeout(() => location.reload(), 1000); };
})();
</script>`

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime })

    // Inject reload script into HTML responses
    if (ext === '.html') {
      const html = data.toString().replace('</body>', `${RELOAD_SCRIPT}</body>`)
      res.end(html)
    } else {
      res.end(data)
    }
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

// Allowed centroid source files (guards against path traversal)
const CENTROID_FILES = new Set([
  'nyc-neighborhood-boundaries-centroids.geojson',
  'nyc-neighborhood-boundaries-centroids-sub.geojson',
])

function writeCentroidFile(filename, features) {
  const filePath = path.join(ROOT, 'src', 'data', filename)
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  let out = '{\n'
  out += `  "type": "FeatureCollection",\n`
  if (existing.metadata) {
    out += `  "metadata": ${JSON.stringify({ ...existing.metadata, features_count: features.length })},\n`
  }
  out += `  "features": [\n`
  features.forEach((f, i) => {
    const comma = i < features.length - 1 ? ',' : ''
    out += `    ${JSON.stringify(f)}${comma}\n`
  })
  out += `  ]\n}\n`
  fs.writeFileSync(filePath, out, 'utf8')
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // Save centroid edits
  if (url.pathname === '/api/save-centroids' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const { files } = JSON.parse(body)
      for (const [filename, features] of Object.entries(files)) {
        if (!CENTROID_FILES.has(filename)) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: `Not allowed: ${filename}` }))
          return
        }
        writeCentroidFile(filename, features)
        console.log(`[save] Wrote ${features.length} features to src/data/${filename}`)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } catch (err) {
      console.error('[save] Error:', err)
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  // SSE endpoint for live reload
  if (url.pathname === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    res.write(':\n\n') // keep-alive comment
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return
  }

  let filePath = path.join(ROOT, url.pathname)

  // Default to map/index.html at root
  if (url.pathname === '/' || url.pathname === '') {
    filePath = path.join(ROOT, 'map', 'index.html')
  }

  fs.stat(filePath, async (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }
    serveFile(res, filePath)
  })
})

server.listen(PORT, () => {
  console.log(`Dev server: http://localhost:${PORT}`)
  console.log(`Watching src/data/ for changes...`)
})

function notifyReload() {
  for (const client of clients) {
    client.write('data: reload\n\n')
  }
}

let buildInProgress = false
let pendingBuild = false

function runBuild() {
  if (buildInProgress) {
    pendingBuild = true
    return
  }
  buildInProgress = true
  console.log('[watch] Change detected — running build...')
  const proc = spawn('node', ['scripts/build.js'], { cwd: ROOT, stdio: 'inherit' })
  proc.on('close', (code) => {
    buildInProgress = false
    if (code === 0) {
      console.log('[watch] Build complete — reloading browser')
      notifyReload()
    } else {
      console.error(`[watch] Build failed (exit ${code})`)
    }
    if (pendingBuild) {
      pendingBuild = false
      runBuild()
    }
  })
}

// Watch src/data recursively (Node 18+ supports recursive on macOS/Windows)
const watchDir = path.join(ROOT, 'src', 'data')
let debounceTimer = null
fs.watch(watchDir, { recursive: true }, (event, filename) => {
  if (!filename) return
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(runBuild, 200)
})
