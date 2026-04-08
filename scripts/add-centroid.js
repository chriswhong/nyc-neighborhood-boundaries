import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import centroid from '@turf/centroid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Helper function to round coordinates to specified decimal places
function roundCoordinates(coords, precision = 6) {
  if (typeof coords[0] === 'number') {
    // Single coordinate pair [lon, lat]
    return coords.map(c => Number(c.toFixed(precision)))
  }
  // Nested arrays
  return coords.map(c => roundCoordinates(c, precision))
}

// Get slug from command line argument
const slug = process.argv[2]
const isSub = process.argv.includes('--sub')

if (!slug || slug.startsWith('--')) {
  console.error('Usage: node scripts/add-centroid.js <neighborhood-slug> [--sub]')
  console.error('Example: node scripts/add-centroid.js fort-george-manhattan')
  console.error('Example (sub): node scripts/add-centroid.js gramercy-park-manhattan --sub')
  process.exit(1)
}

// Determine which files to use
let boundariesFile, centroidsFile
if (isSub) {
  boundariesFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-sub.geojson')
  centroidsFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids-sub.geojson')
  if (!existsSync(boundariesFile)) {
    console.error('❌ Error: Sub-neighborhood boundaries file does not exist')
    process.exit(1)
  }
  if (!existsSync(centroidsFile)) {
    console.error('❌ Error: Sub-neighborhood centroids file does not exist')
    process.exit(1)
  }
} else {
  boundariesFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
  centroidsFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids.geojson')
}

// Load the data
const boundaries = JSON.parse(readFileSync(boundariesFile, 'utf8'))
const centroids = JSON.parse(readFileSync(centroidsFile, 'utf8'))

// Find the boundary feature
const boundaryFeature = boundaries.features.find(f => f.properties?.slug === slug)

if (!boundaryFeature) {
  console.error(`❌ Error: No ${isSub ? 'sub-neighborhood' : 'neighborhood'} boundary feature found with slug "${slug}"`)
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

// Round coordinates to 6 decimal places
centroidFeature.geometry.coordinates = roundCoordinates(centroidFeature.geometry.coordinates, 6)

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

const neighborhoodType = isSub ? 'sub-neighborhood' : 'neighborhood'
console.log(`✅ Successfully added ${neighborhoodType} centroid for "${boundaryFeature.properties.name}" (${slug})`)
console.log(`📍 Location: [${centroidFeature.geometry.coordinates[0].toFixed(6)}, ${centroidFeature.geometry.coordinates[1].toFixed(6)}]`)
console.log(`\nTotal centroids: ${centroids.features.length}`)
