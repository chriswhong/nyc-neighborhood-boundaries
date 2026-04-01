import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const boundariesFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
const centroidsFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids.geojson')
const summariesDir = join(__dirname, '../src/summaries')
const distDir = join(__dirname, '../dist')

const boundaries = JSON.parse(readFileSync(boundariesFile, 'utf8'))
const centroids = JSON.parse(readFileSync(centroidsFile, 'utf8'))

// Check every feature has a summary file before writing anything
const missing = []
boundaries.features.forEach(feature => {
  const { slug } = feature.properties
  if (!existsSync(join(summariesDir, `${slug}.md`))) {
    missing.push(slug)
  }
})

if (missing.length > 0) {
  console.error(`Build failed: missing summary file(s) for ${missing.length} neighborhood(s):`)
  missing.forEach(slug => console.error(`  - ${slug}`))
  process.exit(1)
}

// Build a properties map keyed by slug (with summary attached)
const propsMap = new Map()
boundaries.features.forEach(feature => {
  const { slug } = feature.properties
  const summary = readFileSync(join(summariesDir, `${slug}.md`), 'utf8').trim()
  propsMap.set(slug, { ...feature.properties, summary })
})

// Attach summaries to boundary features
boundaries.features.forEach(feature => {
  feature.properties = propsMap.get(feature.properties.slug)
})

// Attach full properties to centroid features
centroids.features.forEach(feature => {
  const { slug } = feature.properties
  if (propsMap.has(slug)) {
    feature.properties = propsMap.get(slug)
  }
})

mkdirSync(distDir, { recursive: true })

function writeGeoJSON(filePath, data) {
  let output = '{\n'
  output += `  "type": "${data.type}",\n`
  Object.keys(data).forEach(key => {
    if (key !== 'type' && key !== 'features') {
      output += `  "${key}": ${JSON.stringify(data[key])},\n`
    }
  })
  output += '  "features": [\n'
  data.features.forEach((feature, index) => {
    const comma = index < data.features.length - 1 ? ',' : ''
    output += `    ${JSON.stringify(feature)}${comma}\n`
  })
  output += '  ]\n'
  output += '}\n'
  writeFileSync(filePath, output, 'utf8')
}

const boundariesOut = join(distDir, 'nyc-neighborhood-boundaries.geojson')
const centroidsOut = join(distDir, 'nyc-neighborhood-boundaries-centroids.geojson')

writeGeoJSON(boundariesOut, boundaries)
console.log(`Built ${boundaries.features.length} features → ${boundariesOut}`)

writeGeoJSON(centroidsOut, centroids)
console.log(`Built ${centroids.features.length} features → ${centroidsOut}`)
