import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import centroid from '@turf/centroid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get slug from command line argument
const slug = process.argv[2]

if (!slug) {
  console.error('Usage: node scripts/add-centroid.js <neighborhood-slug>')
  console.error('Example: node scripts/add-centroid.js fort-george-manhattan')
  process.exit(1)
}

const boundariesFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
const centroidsFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids.geojson')

// Load the data
const boundaries = JSON.parse(readFileSync(boundariesFile, 'utf8'))
const centroids = JSON.parse(readFileSync(centroidsFile, 'utf8'))

// Find the boundary feature
const boundaryFeature = boundaries.features.find(f => f.properties?.slug === slug)

if (!boundaryFeature) {
  console.error(`❌ Error: No boundary feature found with slug "${slug}"`)
  console.error('\nRun "node scripts/export-names.js" to see all available slugs')
  process.exit(1)
}

// Check if centroid already exists
const existingCentroid = centroids.features.find(f => f.properties?.slug === slug)

if (existingCentroid) {
  console.error(`❌ Error: Centroid already exists for "${slug}"`)
  console.error('If you want to update it, manually remove it first from the centroids file.')
  process.exit(1)
}

// Calculate centroid
const centroidFeature = centroid(boundaryFeature)

// Add properties (will be synced later by apply-properties)
centroidFeature.properties = {
  slug: boundaryFeature.properties.slug,
  name: boundaryFeature.properties.name,
  color: boundaryFeature.properties.color
}

// Add to centroids
centroids.features.push(centroidFeature)

// Update metadata if it exists
if (centroids.metadata && typeof centroids.metadata.features_count === 'number') {
  centroids.metadata.features_count = centroids.features.length
}

// Write back in the same format (features on single lines)
let output = '{\n'
output += `  "type": "${centroids.type}",\n`

// Add other top-level properties (like metadata)
Object.keys(centroids).forEach(key => {
  if (key !== 'type' && key !== 'features') {
    output += `  "${key}": ${JSON.stringify(centroids[key])},\n`
  }
})

output += '  "features": [\n'
centroids.features.forEach((feature, index) => {
  const comma = index < centroids.features.length - 1 ? ',' : ''
  output += `    ${JSON.stringify(feature)}${comma}\n`
})
output += '  ]\n'
output += '}\n'

writeFileSync(centroidsFile, output, 'utf8')

console.log(`✅ Successfully added centroid for "${boundaryFeature.properties.name}" (${slug})`)
console.log(`📍 Location: [${centroidFeature.geometry.coordinates[0].toFixed(6)}, ${centroidFeature.geometry.coordinates[1].toFixed(6)}]`)
console.log(`\nTotal centroids: ${centroids.features.length}`)
