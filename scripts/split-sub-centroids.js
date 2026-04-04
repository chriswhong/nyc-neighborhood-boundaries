import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse CSV file to get sub-neighborhood slugs
const csvPath = join(__dirname, '../src/data/hierarcical.csv')
const csvContent = readFileSync(csvPath, 'utf8')
const lines = csvContent.trim().split('\n')

const subNeighborhoodSlugs = new Set()

for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  const parts = line.split(',')
  
  const subNeighborhood = parts[2]
  const geojsonSlug = parts[3]
  
  if (!geojsonSlug || geojsonSlug === 'no GeoJSON slug' || geojsonSlug.trim() === '') {
    continue
  }
  
  if (subNeighborhood && subNeighborhood.trim() !== '') {
    subNeighborhoodSlugs.add(geojsonSlug.trim())
  }
}

console.log(`Found ${subNeighborhoodSlugs.size} sub-neighborhood slugs from CSV`)

// Read the centroids file
const centroidsPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids.geojson')
const centroids = JSON.parse(readFileSync(centroidsPath, 'utf8'))

// Split centroid features
const topLevelCentroids = []
const subCentroids = []

centroids.features.forEach(feature => {
  const slug = feature.properties?.slug
  
  if (subNeighborhoodSlugs.has(slug)) {
    subCentroids.push(feature)
  } else {
    topLevelCentroids.push(feature)
  }
})

console.log(`\nSplitting ${centroids.features.length} total centroid features:`)
console.log(`  - ${topLevelCentroids.length} top-level centroids`)
console.log(`  - ${subCentroids.length} sub-neighborhood centroids`)

// Create the top-level centroids GeoJSON
const topLevelGeoJSON = {
  type: 'FeatureCollection',
  metadata: {
    version: centroids.metadata?.version || 4,
    features_count: topLevelCentroids.length
  },
  features: topLevelCentroids
}

// Create the sub-neighborhoods centroids GeoJSON
const subGeoJSON = {
  type: 'FeatureCollection',
  metadata: {
    description: 'Centroids for sub-neighborhoods of NYC',
    features_count: subCentroids.length
  },
  features: subCentroids
}

// Write both files with formatting
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

const topLevelPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids.geojson')
const subPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids-sub.geojson')

writeGeoJSON(topLevelPath, topLevelGeoJSON)
console.log(`\n✅ Updated top-level centroids: ${topLevelPath}`)
console.log(`   ${topLevelCentroids.length} features`)

writeGeoJSON(subPath, subGeoJSON)
console.log(`\n✅ Created sub-neighborhood centroids: ${subPath}`)
console.log(`   ${subCentroids.length} features`)
