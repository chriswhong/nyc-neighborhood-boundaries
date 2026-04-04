import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const boundariesFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
const boundaries = JSON.parse(readFileSync(boundariesFile, 'utf8'))

console.log(`Total neighborhoods: ${boundaries.features.length}\n`)

// Check for features without slugs
const missingSlug = []
boundaries.features.forEach((feature, index) => {
  if (!feature.properties?.slug) {
    missingSlug.push({
      index: index + 1,
      name: feature.properties?.name || 'unknown',
      borough: feature.properties?.borough || 'unknown'
    })
  }
})

if (missingSlug.length > 0) {
  console.error(`⚠️  Found ${missingSlug.length} features without slug:\n`)
  missingSlug.forEach(item => {
    console.error(`  [${item.index}] ${item.name} (${item.borough})`)
  })
  console.error('\n')
}

// Export all neighborhood names with their boroughs and slugs
boundaries.features.forEach(feature => {
  const { name, borough, slug } = feature.properties
  console.log(`${slug}`)
})
