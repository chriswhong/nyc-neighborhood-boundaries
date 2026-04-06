import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const boundariesFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
const centroidsFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids.geojson')
const boundariesSubFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-sub.geojson')
const centroidsSubFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids-sub.geojson')
const summariesDir = join(__dirname, '../src/summaries')
const distDir = join(__dirname, '../dist')

const boundaries = JSON.parse(readFileSync(boundariesFile, 'utf8'))
const centroids = JSON.parse(readFileSync(centroidsFile, 'utf8'))
const boundariesSub = JSON.parse(readFileSync(boundariesSubFile, 'utf8'))
const centroidsSub = JSON.parse(readFileSync(centroidsSubFile, 'utf8'))

// Check every main neighborhood has a summary file before writing anything
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

// Build a slug → name lookup for denormalizing relationship arrays
const slugToName = new Map()
boundaries.features.forEach(f => slugToName.set(f.properties.slug, f.properties.name))
boundariesSub.features.forEach(f => slugToName.set(f.properties.slug, f.properties.name))

// Build child_neighborhoods map: parentSlug → [{slug, name}]
const childrenByParent = new Map()
boundariesSub.features.forEach(feature => {
  const { slug, parent_neighborhoods = [] } = feature.properties
  parent_neighborhoods.forEach(parentSlug => {
    if (!childrenByParent.has(parentSlug)) childrenByParent.set(parentSlug, [])
    childrenByParent.get(parentSlug).push({ slug, name: slugToName.get(slug) })
  })
})

// Build main neighborhoods properties map (with summary + kind + child_neighborhoods)
const propsMap = new Map()
boundaries.features.forEach(feature => {
  const { slug } = feature.properties
  const summary = readFileSync(join(summariesDir, `${slug}.md`), 'utf8').trim()
  const child_neighborhoods = childrenByParent.get(slug) ?? []
  propsMap.set(slug, { ...feature.properties, kind: 'neighborhood', child_neighborhoods, summary })
})

// Build sub-neighborhoods properties map: expand parent slugs to {slug, name} objects
const propsMapSub = new Map()
boundariesSub.features.forEach(feature => {
  const { slug, parent_neighborhoods = [] } = feature.properties
  const parents = parent_neighborhoods.map(s => ({ slug: s, name: slugToName.get(s) }))
  const firstParentSlug = parent_neighborhoods[0]
  const color = firstParentSlug && propsMap.has(firstParentSlug)
    ? propsMap.get(firstParentSlug).color
    : 0
  const summaryPath = join(summariesDir, `${slug}.md`)
  const summary = existsSync(summaryPath) ? readFileSync(summaryPath, 'utf8').trim() : ''
  propsMapSub.set(slug, { ...feature.properties, kind: 'sub-neighborhood', color, parent_neighborhoods: parents, summary })
})

// Attach enriched properties to boundary features
boundaries.features.forEach(feature => {
  feature.properties = propsMap.get(feature.properties.slug)
})
boundariesSub.features.forEach(feature => {
  feature.properties = propsMapSub.get(feature.properties.slug)
})

// Attach name, color, kind, and relationship arrays to centroid features
centroids.features.forEach(feature => {
  const { slug } = feature.properties
  if (propsMap.has(slug)) {
    const { name, color, child_neighborhoods } = propsMap.get(slug)
    feature.properties = { slug, name, color, kind: 'neighborhood', child_neighborhoods }
  }
})
centroidsSub.features.forEach(feature => {
  const { slug } = feature.properties
  if (propsMapSub.has(slug)) {
    const { name, color, parent_neighborhoods } = propsMapSub.get(slug)
    feature.properties = { slug, name, color, kind: 'sub-neighborhood', parent_neighborhoods }
  }
})

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })

function writeGeoJSON(filePath, data, features) {
  let output = '{\n'
  output += `  "type": "FeatureCollection",\n`
  output += `  "features": [\n`
  features.forEach((feature, index) => {
    const comma = index < features.length - 1 ? ',' : ''
    output += `    ${JSON.stringify(feature)}${comma}\n`
  })
  output += '  ]\n'
  output += '}\n'
  writeFileSync(filePath, output, 'utf8')
}

// Merge and write boundaries (main first, then sub)
const mergedBoundaries = [...boundaries.features, ...boundariesSub.features]
const boundariesOut = join(distDir, 'nyc-neighborhood-boundaries.geojson')
writeGeoJSON(boundariesOut, {}, mergedBoundaries)
console.log(`Built ${mergedBoundaries.length} boundary features (${boundaries.features.length} neighborhoods + ${boundariesSub.features.length} sub-neighborhoods) → ${boundariesOut}`)

// Merge and write centroids (main first, then sub)
const mergedCentroids = [...centroids.features, ...centroidsSub.features]
const centroidsOut = join(distDir, 'nyc-neighborhood-boundaries-centroids.geojson')
writeGeoJSON(centroidsOut, {}, mergedCentroids)
console.log(`Built ${mergedCentroids.length} centroid features (${centroids.features.length} neighborhoods + ${centroidsSub.features.length} sub-neighborhoods) → ${centroidsOut}`)
