import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const csvPath = join(__dirname, '../src/data/hierarcical.csv')
const subGeoJsonPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-sub.geojson')

// Parse CSV
const csvContent = readFileSync(csvPath, 'utf8')
const rows = csvContent.trim().split('\n').slice(1).map(row => {
    const [borough, parent_neighborhood, sub_neighborhood, geojson_slug, notes] = row.split(',')
    return { borough, parent_neighborhood, sub_neighborhood, geojson_slug, notes }
})

// Build parent slug lookup: parent_neighborhood name → geojson_slug
// (rows where sub_neighborhood is empty and geojson_slug is present)
const parentSlugByName = {}
rows.forEach(row => {
    if (!row.sub_neighborhood && row.geojson_slug && row.geojson_slug !== '') {
        parentSlugByName[row.parent_neighborhood.trim()] = row.geojson_slug.trim()
    }
})

// Build sub slug → array of parent slugs
const parentsBySubSlug = {}
rows.forEach(row => {
    const subSlug = row.geojson_slug?.trim()
    const subName = row.sub_neighborhood?.trim()
    if (subName && subSlug && subSlug !== '') {
        const parentName = row.parent_neighborhood?.trim()
        const parentSlug = parentSlugByName[parentName]
        if (parentSlug) {
            if (!parentsBySubSlug[subSlug]) parentsBySubSlug[subSlug] = []
            if (!parentsBySubSlug[subSlug].includes(parentSlug)) {
                parentsBySubSlug[subSlug].push(parentSlug)
            }
        } else {
            console.warn(`Warning: no parent slug found for parent "${parentName}" (sub: ${subSlug})`)
        }
    }
})

console.log('Parent mappings:')
Object.entries(parentsBySubSlug).forEach(([sub, parents]) => {
    console.log(`  ${sub} → [${parents.join(', ')}]`)
})

// Update sub GeoJSON
const subGeoJson = JSON.parse(readFileSync(subGeoJsonPath, 'utf8'))

let updated = 0
let missing = 0

subGeoJson.features = subGeoJson.features.map(feature => {
    const slug = feature.properties.slug
    const parents = parentsBySubSlug[slug]
    if (parents) {
        feature.properties.parent_neighborhoods = parents
        updated++
    } else {
        console.warn(`Warning: no parent mapping found for sub-neighborhood "${slug}" — setting empty array`)
        feature.properties.parent_neighborhoods = []
        missing++
    }
    return feature
})

// Write back formatted with single-line features
const header = {
    type: subGeoJson.type,
    metadata: subGeoJson.metadata,
    features: null
}

const headerStr = JSON.stringify({ ...header, features: [] })
    .replace('"features":[]', '')
    .replace(/\s*\}\s*$/, '')

const featureLines = subGeoJson.features.map(f => '  ' + JSON.stringify(f))
const output = headerStr + '"features": [\n' + featureLines.join(',\n') + '\n]}'

writeFileSync(subGeoJsonPath, output + '\n')

console.log(`\nDone: ${updated} features updated, ${missing} missing mappings`)
