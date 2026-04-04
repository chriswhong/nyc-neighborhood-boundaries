import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const boundariesSubFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-sub.geojson')
const centroidsSubFile = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids-sub.geojson')

const boundaries = JSON.parse(readFileSync(boundariesSubFile, 'utf8'))
const centroids = JSON.parse(readFileSync(centroidsSubFile, 'utf8'))

const boundarySlugs = new Set(boundaries.features.map(f => f.properties?.slug).filter(Boolean))
const centroidSlugs = new Set(centroids.features.map(f => f.properties?.slug).filter(Boolean))

const missing = []
boundarySlugs.forEach(slug => {
  if (!centroidSlugs.has(slug)) {
    missing.push(slug)
  }
})

console.log(`Boundaries: ${boundaries.features.length}`)
console.log(`Centroids: ${centroids.features.length}`)
console.log(`Missing centroids: ${missing.length}`)

if (missing.length > 0) {
  console.log('\nMissing slugs:')
  missing.forEach(slug => console.log(slug))
}
