import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse CSV file
const csvPath = join(__dirname, '../src/data/hierarcical.csv')
const csvContent = readFileSync(csvPath, 'utf8')
const lines = csvContent.trim().split('\n')
const headers = lines[0].split(',')

// Extract sub-neighborhood slugs
const subNeighborhoodSlugs = new Set()
const topLevelSlugs = new Set()

for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  const parts = line.split(',')
  
  const subNeighborhood = parts[2] // sub_neighborhood column
  const geojsonSlug = parts[3] // geojson_slug column
  
  // Skip rows without a geojson slug or with "no GeoJSON slug"
  if (!geojsonSlug || geojsonSlug === 'no GeoJSON slug' || geojsonSlug.trim() === '') {
    continue
  }
  
  // If sub_neighborhood has a value and is not empty, it's a sub-neighborhood
  if (subNeighborhood && subNeighborhood.trim() !== '') {
    subNeighborhoodSlugs.add(geojsonSlug.trim())
  } else {
    // Otherwise it's a top-level neighborhood
    topLevelSlugs.add(geojsonSlug.trim())
  }
}

console.log(`Found ${subNeighborhoodSlugs.size} sub-neighborhoods`)
console.log(`Found ${topLevelSlugs.size} top-level neighborhoods`)
console.log('\nSub-neighborhoods to be moved:')
Array.from(subNeighborhoodSlugs).sort().forEach(slug => console.log(`  - ${slug}`))

// Read the main boundaries file
const boundariesPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
const boundaries = JSON.parse(readFileSync(boundariesPath, 'utf8'))

// Split features
const topLevelFeatures = []
const subFeatures = []

boundaries.features.forEach(feature => {
  const slug = feature.properties?.slug
  
  if (subNeighborhoodSlugs.has(slug)) {
    subFeatures.push(feature)
  } else {
    topLevelFeatures.push(feature)
  }
})

console.log(`\nSplitting ${boundaries.features.length} total features:`)
console.log(`  - ${topLevelFeatures.length} top-level neighborhoods`)
console.log(`  - ${subFeatures.length} sub-neighborhoods`)

// Create the top-level GeoJSON
const topLevelGeoJSON = {
  type: 'FeatureCollection',
  features: topLevelFeatures
}

// Create the sub-neighborhoods GeoJSON
const subGeoJSON = {
  type: 'FeatureCollection',
  metadata: {
    description: 'Sub-neighborhoods of NYC - areas that are part of larger parent neighborhoods',
    features_count: subFeatures.length
  },
  features: subFeatures
}

// Write both files
const topLevelPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
const subPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-sub.geojson')

// Write with formatting (features on separate lines)
function writeGeoJSON(filePath, data) {
  let output = '{\n'
  output += `  "type": "${data.type}",\n`
  
  // Add other top-level properties
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

writeGeoJSON(topLevelPath, topLevelGeoJSON)
console.log(`\n✅ Updated top-level neighborhoods: ${topLevelPath}`)
console.log(`   ${topLevelFeatures.length} features`)

writeGeoJSON(subPath, subGeoJSON)
console.log(`\n✅ Created sub-neighborhoods file: ${subPath}`)
console.log(`   ${subFeatures.length} features`)

console.log('\n⚠️  Note: You may also want to:')
console.log('   1. Update centroids file to match')
console.log('   2. Create matching summary files for any new structure')
console.log('   3. Run tests to verify data integrity')
