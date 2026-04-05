import { describe, test, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Helper function to convert string to kebab-case
function toKebabCase(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Valid NYC boroughs
const VALID_BOROUGHS = ['manhattan', 'queens', 'bronx', 'brooklyn', 'staten-island']

// Check that all coordinates in a feature collection have at most maxDecimals decimal places
function checkCoordinatePrecision(features, maxDecimals = 6) {
    const violations = []

    function decimalPlaces(num) {
        const str = num.toString()
        const dot = str.indexOf('.')
        return dot === -1 ? 0 : str.length - dot - 1
    }

    function checkCoords(coords, slug) {
        if (typeof coords[0] === 'number') {
            coords.forEach(val => {
                if (decimalPlaces(val) > maxDecimals) {
                    violations.push(`"${slug}": ${val}`)
                }
            })
        } else {
            coords.forEach(c => checkCoords(c, slug))
        }
    }

    features.forEach(feature => {
        const slug = feature.properties?.slug || 'unknown'
        if (feature.geometry?.coordinates) {
            checkCoords(feature.geometry.coordinates, slug)
        }
    })

    return violations
}

describe('Sub-Neighborhoods GeoJSON Validation', () => {
    let subGeojson
    let mainGeojson

    beforeAll(() => {
        const subPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-sub.geojson')
        const mainPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')

        try {
            subGeojson = JSON.parse(readFileSync(subPath, 'utf8'))
            mainGeojson = JSON.parse(readFileSync(mainPath, 'utf8'))
        } catch (error) {
            throw new Error(`Failed to load sub-neighborhoods GeoJSON: ${error.message}`)
        }
    })

    test('all sub-neighborhoods must have a summary markdown file', () => {
        const summariesDir = join(__dirname, '../src/summaries')
        const missing = subGeojson.features
            .filter(f => !existsSync(join(summariesDir, `${f.properties.slug}.md`)))
            .map(f => f.properties.slug)
        expect(missing, `Missing summary files:\n${missing.map(s => `  src/summaries/${s}.md`).join('\n')}`).toHaveLength(0)
    })

    test('sub-neighborhoods should not have a color property (derived from parent at build)', () => {
        const withColor = subGeojson.features
            .filter(f => Object.prototype.hasOwnProperty.call(f.properties, 'color'))
            .map(f => f.properties.slug)
        expect(withColor, `Sub-neighborhoods must not have color in source: ${withColor.join(', ')}`).toHaveLength(0)
    })

    test('sub-neighborhoods should not have unexpected properties', () => {
        const allowed = ['name', 'borough', 'slug', 'wikipedia_url', 'parent_neighborhoods']
        subGeojson.features.forEach((feature) => {
            const unexpected = Object.keys(feature.properties).filter(p => !allowed.includes(p))
            expect(unexpected, `"${feature.properties.slug}" has unexpected properties: ${unexpected.join(', ')}`).toHaveLength(0)
        })
    })

    test('all sub-neighborhoods must have a parent_neighborhoods property', () => {
        const missing = []
        subGeojson.features.forEach((feature, index) => {
            if (!Object.prototype.hasOwnProperty.call(feature.properties, 'parent_neighborhoods')) {
                missing.push(feature.properties.slug || `feature ${index + 1}`)
            }
        })
        expect(missing, `Sub-neighborhoods missing parent_neighborhoods: ${missing.join(', ')}`).toHaveLength(0)
    })

    test('parent_neighborhoods must be an array', () => {
        subGeojson.features.forEach((feature) => {
            expect(
                Array.isArray(feature.properties.parent_neighborhoods),
                `"${feature.properties.slug}" parent_neighborhoods must be an array`
            ).toBe(true)
        })
    })

    test('all parent_neighborhoods slugs must exist in nyc-neighborhood-boundaries.geojson', () => {
        const mainSlugs = new Set(mainGeojson.features.map(f => f.properties.slug))
        const invalid = []

        subGeojson.features.forEach((feature) => {
            const parents = feature.properties.parent_neighborhoods || []
            parents.forEach(parentSlug => {
                if (!mainSlugs.has(parentSlug)) {
                    invalid.push(`"${feature.properties.slug}" references unknown parent "${parentSlug}"`)
                }
            })
        })

        expect(invalid, `Invalid parent slugs:\n${invalid.join('\n')}`).toHaveLength(0)
    })

    test('all coordinates should have at most 6 decimal places', () => {
        const violations = checkCoordinatePrecision(subGeojson.features)
        expect(violations, `Coordinates with too many decimal places:\n${violations.join('\n')}`).toHaveLength(0)
    })

    test('all sub-neighborhoods must have at least one parent', () => {
        const noParent = subGeojson.features
            .filter(f => !f.properties.parent_neighborhoods || f.properties.parent_neighborhoods.length === 0)
            .map(f => f.properties.slug)
        expect(noParent, `Sub-neighborhoods with empty parent_neighborhoods: ${noParent.join(', ')}`).toHaveLength(0)
    })
})

describe('NYC Neighborhood Boundaries GeoJSON Validation', () => {
    let geojson
    let fileContent

    beforeAll(() => {
        const filePath = join(__dirname, '../src/data/nyc-neighborhood-boundaries.geojson')
        
        try {
            fileContent = readFileSync(filePath, 'utf8')
            geojson = JSON.parse(fileContent)
        } catch (error) {
            throw new Error(`Failed to load GeoJSON: ${error.message}`)
        }
    })

    describe('Basic GeoJSON Structure', () => {
        test('should be a valid FeatureCollection', () => {
            expect(geojson.type).toBe('FeatureCollection')
            expect(Array.isArray(geojson.features)).toBe(true)
            expect(geojson.features.length).toBeGreaterThan(0)
        })

        test('should have metadata with correct feature count', () => {
            if (geojson.metadata) {
                expect(geojson.metadata).toBeDefined()
                expect(typeof geojson.metadata.features_count).toBe('number')
                expect(geojson.metadata.features_count).toBe(geojson.features.length)
            }
        })

        test('all features should have valid GeoJSON structure', () => {
            geojson.features.forEach((feature, index) => {
                expect(feature.type, `Feature ${index + 1} should have type "Feature"`).toBe('Feature')
                expect(feature.geometry, `Feature ${index + 1} should have geometry`).toBeDefined()
                expect(feature.properties, `Feature ${index + 1} should have properties`).toBeDefined()
            })
        })
    })

    describe('Single Line Formatting', () => {
        test('all features should be on single lines', () => {
            const lines = fileContent.split('\n')
            
            // Find feature lines (lines containing "type":"Feature")
            const featureLines = lines.filter(line => line.includes('"type":"Feature"'))
            
            expect(featureLines.length, 'Should find feature lines').toBe(geojson.features.length)
            
            featureLines.forEach((line, index) => {
                // Count braces to ensure feature is complete on one line
                let braceCount = 0
                for (const char of line) {
                    if (char === '{') braceCount++
                    if (char === '}') braceCount--
                }
                expect(braceCount, `Feature ${index + 1} should be complete on one line (balanced braces)`).toBe(0)
            })
        })

        test('features should not span multiple lines', () => {
            const lines = fileContent.split('\n')
            let insideFeature = false
            let featureStartLine = null
            
            lines.forEach((line, index) => {
                if (line.includes('"type":"Feature"')) {
                    // Count braces to see if feature is complete
                    let braceCount = 0
                    for (const char of line) {
                        if (char === '{') braceCount++
                        if (char === '}') braceCount--
                    }
                    
                    if (braceCount !== 0) {
                        insideFeature = true
                        featureStartLine = index + 1
                    }
                } else if (insideFeature && line.includes('}')) {
                    // Feature ended on a different line
                    expect.fail(`Feature spans multiple lines (${featureStartLine}-${index + 1})`)
                }
            })
        })
    })

    describe('Feature ID Validation', () => {
        test('all features must have a slug property', () => {
            const missingSlug = []
            geojson.features.forEach((feature, index) => {
                if (!feature.properties?.slug) {
                    missingSlug.push({
                        index: index + 1,
                        name: feature.properties?.name || 'unknown',
                        borough: feature.properties?.borough || 'unknown'
                    })
                }
            })
            
            expect(missingSlug, `Features missing slug: ${JSON.stringify(missingSlug, null, 2)}`).toHaveLength(0)
        })

        test('all features should have kebab-case slugs matching name-borough pattern', () => {
            geojson.features.forEach((feature, index) => {
                expect(feature.properties.name, `Feature ${index + 1} should have a name`).toBeDefined()
                expect(feature.properties.borough, `Feature ${index + 1} should have a borough`).toBeDefined()

                const expectedSlug = toKebabCase(`${feature.properties.name}-${feature.properties.borough}`)
                expect(feature.properties.slug, `Feature "${feature.properties.name}" in "${feature.properties.borough}" should have slug "${expectedSlug}"`).toBe(expectedSlug)
            })
        })

        test('kebab-case conversion should work correctly for name-borough pattern', () => {
            const testCases = [
                ['Rego Park', 'queens', 'rego-park-queens'],
                ['Belle Harbor', 'queens', 'belle-harbor-queens'],
                ['Roosevelt Island', 'manhattan', 'roosevelt-island-manhattan'],
                ['Fort Hamilton', 'brooklyn', 'fort-hamilton-brooklyn'],
                ['South Ozone Park', 'queens', 'south-ozone-park-queens'],
                ['Bay Terrace', 'staten-island', 'bay-terrace-staten-island'],
                ['Far Rockaway', 'queens', 'far-rockaway-queens'],
                ['St. George', 'staten-island', 'st-george-staten-island'],
                ['Long Island City', 'queens', 'long-island-city-queens'],
                ['Upper East Side', 'manhattan', 'upper-east-side-manhattan'],
                ['Co-op City', 'bronx', 'co-op-city-bronx'],
                ['Two Bridges', 'manhattan', 'two-bridges-manhattan']
            ]
            
            testCases.forEach(([name, borough, expected]) => {
                expect(toKebabCase(`${name}-${borough}`)).toBe(expected)
            })
        })

        test('all feature slugs should be unique', () => {
            const slugs = geojson.features.map(f => f.properties.slug)
            const uniqueSlugs = new Set(slugs)
            
            if (uniqueSlugs.size !== slugs.length) {
                // Find duplicates
                const slugCounts = {}
                slugs.forEach(slug => {
                    slugCounts[slug] = (slugCounts[slug] || 0) + 1
                })
                
                const duplicates = Object.entries(slugCounts)
                    .filter(([slug, count]) => count > 1)
                    .map(([slug, count]) => `  - "${slug}" appears ${count} times`)
                    .join('\n')
                
                expect(uniqueSlugs.size, `All feature slugs should be unique.\n\nDuplicate slugs found:\n${duplicates}`).toBe(slugs.length)
            }
            
            expect(uniqueSlugs.size, 'All feature slugs should be unique').toBe(slugs.length)
        })
    })

    describe('Property Structure Validation', () => {
        test('all features should have exactly three lowercase properties: name, borough, and color', () => {
            geojson.features.forEach((feature, index) => {
                const properties = feature.properties
                const propertyNames = Object.keys(properties)
                
                expect(propertyNames, `Feature ${index + 1} should have 'name' property`).toContain('name')
                expect(propertyNames, `Feature ${index + 1} should have 'borough' property`).toContain('borough')
                expect(propertyNames, `Feature ${index + 1} should have 'color' property`).toContain('color')

                
                // Ensure no uppercase versions exist
                expect(propertyNames, `Feature ${index + 1} should not have uppercase 'Name'`).not.toContain('Name')
                expect(propertyNames, `Feature ${index + 1} should not have uppercase 'Borough'`).not.toContain('Borough')
            })
        })

        test('should not have any unexpected properties', () => {
            geojson.features.forEach((feature, index) => {
                const properties = feature.properties
                const propertyNames = Object.keys(properties)
                const unexpectedProps = propertyNames.filter(prop => !['name', 'borough', 'color', 'wikipedia_url', 'slug'].includes(prop))
                
                expect(unexpectedProps, `Feature ${index + 1} should not have unexpected properties: ${unexpectedProps.join(', ')}`).toHaveLength(0)
            })
        })

        test('name and borough properties should be non-empty strings', () => {
            geojson.features.forEach((feature, index) => {
                expect(typeof feature.properties.name, `Feature ${index + 1} name should be a string`).toBe('string')
                expect(feature.properties.name.length, `Feature ${index + 1} name should not be empty`).toBeGreaterThan(0)
                
                expect(typeof feature.properties.borough, `Feature ${index + 1} borough should be a string`).toBe('string')
                expect(feature.properties.borough.length, `Feature ${index + 1} borough should not be empty`).toBeGreaterThan(0)
            })
        })

        test('color property should be an integer between 0-4', () => {
            geojson.features.forEach((feature, index) => {
                expect(typeof feature.properties.color, `Feature ${index + 1} color should be a number`).toBe('number')
                expect(Number.isInteger(feature.properties.color), `Feature ${index + 1} color should be an integer`).toBe(true)
                expect(feature.properties.color, `Feature ${index + 1} color should be between 0-4`).toBeGreaterThanOrEqual(0)
                expect(feature.properties.color, `Feature ${index + 1} color should be between 0-4`).toBeLessThanOrEqual(4)
            })
        })
    })

    describe('Borough Validation', () => {
        test('all borough values should be valid NYC boroughs', () => {
            geojson.features.forEach((feature, index) => {
                expect(feature.properties.borough, `Feature ${index + 1} should have a borough`).toBeDefined()
                expect(VALID_BOROUGHS, `Feature ${index + 1} borough "${feature.properties.borough}" should be valid`).toContain(feature.properties.borough)
            })
        })

        test('should cover all NYC boroughs', () => {
            const boroughs = [...new Set(geojson.features.map(f => f.properties.borough))]
            
            // Check that we have neighborhoods in all 5 boroughs
            VALID_BOROUGHS.forEach(borough => {
                expect(boroughs, `Should have neighborhoods in ${borough}`).toContain(borough)
            })
        })
    })

    describe('Data Quality', () => {
        test('should have expected number of features', () => {
            // Based on the filename mentioning 277 features
            expect(geojson.features.length, 'Should have approximately 277 features').toBeGreaterThan(250)
        })

        test('all neighborhood names should be unique to the borough', () => {
            const boroughGroups = geojson.features.reduce((acc, feature) => {
                const borough = feature.properties.borough
                if (!acc[borough]) {
                    acc[borough] = new Set()
                }
                acc[borough].add(feature.properties.name)
                return acc
            }, {})

            Object.entries(boroughGroups).forEach(([borough, names]) => {
                expect(names.size, `All neighborhood names in ${borough} should be unique`).toBe(geojson.features.filter(f => f.properties.borough === borough).length)
            })
        })

        test('all neighborhoods must have a summary markdown file', () => {
            const summariesDir = join(__dirname, '../src/summaries')
            const missing = geojson.features
                .filter(f => !existsSync(join(summariesDir, `${f.properties.slug}.md`)))
                .map(f => f.properties.slug)
            expect(missing, `Missing summary files:\n${missing.map(s => `  src/summaries/${s}.md`).join('\n')}`).toHaveLength(0)
        })

        test('all coordinates should have at most 6 decimal places', () => {
            const violations = checkCoordinatePrecision(geojson.features)
            expect(violations, `Coordinates with too many decimal places:\n${violations.join('\n')}`).toHaveLength(0)
        })

        test('should not have any null or undefined geometries', () => {
            geojson.features.forEach((feature, index) => {
                expect(feature.geometry, `Feature ${index + 1} should have geometry`).not.toBeNull()
                expect(feature.geometry, `Feature ${index + 1} should have geometry`).toBeDefined()
                expect(feature.geometry.type, `Feature ${index + 1} should have geometry type`).toBeDefined()
                expect(feature.geometry.coordinates, `Feature ${index + 1} should have coordinates`).toBeDefined()
            })
        })
    })

    describe('Sub-Neighborhood Centroids Validation', () => {
        let centroidsSubGeojson
        let boundariesSubGeojson

        beforeAll(() => {
            const centroidsSubPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids-sub.geojson')
            const boundariesSubPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-sub.geojson')

            try {
                centroidsSubGeojson = JSON.parse(readFileSync(centroidsSubPath, 'utf8'))
                boundariesSubGeojson = JSON.parse(readFileSync(boundariesSubPath, 'utf8'))
            } catch (error) {
                throw new Error(`Failed to load sub-neighborhood centroids GeoJSON: ${error.message}`)
            }
        })

        test('every sub boundary should have a corresponding centroid', () => {
            const boundarySlugs = new Set(boundariesSubGeojson.features.map(f => f.properties.slug))
            const centroidSlugs = new Set(centroidsSubGeojson.features.filter(f => f.properties?.slug).map(f => f.properties.slug))

            const missing = []
            boundarySlugs.forEach(slug => {
                if (!centroidSlugs.has(slug)) missing.push(slug)
            })

            if (missing.length > 0) {
                const commands = missing.map(slug => `node scripts/add-centroid.js ${slug} --sub`).join('\n')
                expect(missing, `Missing sub centroids for: ${missing.join(', ')}\n\nRun these commands to generate them:\n${commands}`).toHaveLength(0)
            }
            expect(missing).toHaveLength(0)
        })

        test('every sub centroid should have a corresponding boundary', () => {
            const boundarySlugs = new Set(boundariesSubGeojson.features.map(f => f.properties.slug))
            const orphaned = centroidsSubGeojson.features
                .filter(f => f.properties?.slug && !boundarySlugs.has(f.properties.slug))
                .map(f => f.properties.slug)

            expect(orphaned, `Orphaned sub centroids without boundaries: ${orphaned.join(', ')}`).toHaveLength(0)
        })

        test('all sub centroids should have a slug and be Points', () => {
            centroidsSubGeojson.features.forEach((feature, index) => {
                expect(feature.properties?.slug, `Sub centroid ${index + 1} should have slug`).toBeDefined()
                expect(feature.geometry.type, `Sub centroid ${index + 1} should be a Point`).toBe('Point')
            })
        })

        test('all sub centroid coordinates should have at most 6 decimal places', () => {
            const violations = checkCoordinatePrecision(centroidsSubGeojson.features)
            expect(violations, `Coordinates with too many decimal places:\n${violations.join('\n')}`).toHaveLength(0)
        })
    })

    describe('Centroids Validation', () => {
        let centroidsGeojson

        beforeAll(() => {
            const centroidsPath = join(__dirname, '../src/data/nyc-neighborhood-boundaries-centroids.geojson')
            
            try {
                const centroidsContent = readFileSync(centroidsPath, 'utf8')
                centroidsGeojson = JSON.parse(centroidsContent)
            } catch (error) {
                throw new Error(`Failed to load centroids GeoJSON: ${error.message}`)
            }
        })

        test('every boundary feature should have a corresponding centroid', () => {
            const boundarySlugs = new Set(geojson.features.map(f => f.properties.slug))
            const centroidSlugs = new Set(
                centroidsGeojson.features
                    .filter(f => f.properties?.slug)
                    .map(f => f.properties.slug)
            )

            const missing = []
            boundarySlugs.forEach(slug => {
                if (!centroidSlugs.has(slug)) {
                    missing.push(slug)
                }
            })

            if (missing.length > 0) {
                const commands = missing.map(slug => `node scripts/add-centroid.js ${slug}`).join('\n')
                expect(missing, `Missing centroids for: ${missing.join(', ')}\n\nRun these commands to generate them:\n${commands}`).toHaveLength(0)
            }

            expect(missing).toHaveLength(0)
        })

        test('every centroid should have a corresponding boundary', () => {
            const boundarySlugs = new Set(geojson.features.map(f => f.properties.slug))
            const centroidSlugs = centroidsGeojson.features
                .filter(f => f.properties?.slug)
                .map(f => f.properties.slug)

            const orphaned = []
            centroidSlugs.forEach(slug => {
                if (!boundarySlugs.has(slug)) {
                    orphaned.push(slug)
                }
            })

            expect(orphaned, `Orphaned centroids without boundaries: ${orphaned.join(', ')}`).toHaveLength(0)
        })

        test('all centroids should have valid properties', () => {
            const centroidsWithProps = centroidsGeojson.features.filter(f => f.properties?.slug)
            const centroidsWithoutSlug = []
            
            centroidsGeojson.features.forEach((feature, index) => {
                if (!feature.properties?.slug) {
                    centroidsWithoutSlug.push({
                        index: index + 1,
                        coordinates: feature.geometry?.coordinates,
                        properties: feature.properties
                    })
                }
            })
            
            if (centroidsWithoutSlug.length > 0) {
                const details = centroidsWithoutSlug.map(c => 
                    `  [${c.index}] coords: [${c.coordinates?.[0]?.toFixed(6)}, ${c.coordinates?.[1]?.toFixed(6)}], props: ${JSON.stringify(c.properties)}`
                ).join('\n')
                expect(centroidsWithProps.length, `All centroids should have slug property.\n\n${centroidsWithoutSlug.length} centroids missing slug:\n${details}`).toBe(centroidsGeojson.features.length)
            }
            
            expect(centroidsWithProps.length, 'All centroids should have slug property').toBe(centroidsGeojson.features.length)

            centroidsWithProps.forEach((feature, index) => {
                expect(feature.properties.slug, `Centroid ${index + 1} should have slug`).toBeDefined()
                expect(feature.geometry.type, `Centroid ${index + 1} should be a Point`).toBe('Point')
            })
        })

        test('all centroid coordinates should have at most 6 decimal places', () => {
            const violations = checkCoordinatePrecision(centroidsGeojson.features)
            expect(violations, `Coordinates with too many decimal places:\n${violations.join('\n')}`).toHaveLength(0)
        })

        test('centroids and boundaries should have same feature count', () => {
            const boundarySlugs = geojson.features.filter(f => f.properties?.slug)
            const centroidSlugs = centroidsGeojson.features.filter(f => f.properties?.slug)
            
            if (centroidSlugs.length !== boundarySlugs.length) {
                // Find which ones are missing
                const boundarySlugSet = new Set(geojson.features.filter(f => f.properties?.slug).map(f => f.properties.slug))
                const centroidSlugSet = new Set(centroidsGeojson.features.filter(f => f.properties?.slug).map(f => f.properties.slug))
                
                const missingCentroids = []
                boundarySlugSet.forEach(slug => {
                    if (!centroidSlugSet.has(slug)) {
                        missingCentroids.push(slug)
                    }
                })
                
                const orphanedCentroids = []
                centroidSlugSet.forEach(slug => {
                    if (!boundarySlugSet.has(slug)) {
                        orphanedCentroids.push(slug)
                    }
                })
                
                let errorMsg = `Centroids count should match boundaries count.\n`
                errorMsg += `Boundaries: ${boundarySlugs.length}, Centroids: ${centroidSlugs.length}\n\n`
                
                if (missingCentroids.length > 0) {
                    const commands = missingCentroids.map(slug => `node scripts/add-centroid.js ${slug}`).join('\n')
                    errorMsg += `Missing ${missingCentroids.length} centroids:\n${missingCentroids.map(s => `  - ${s}`).join('\n')}\n\n`
                    errorMsg += `Run these commands to generate them:\n${commands}\n`
                }
                
                if (orphanedCentroids.length > 0) {
                    errorMsg += `\nOrphaned ${orphanedCentroids.length} centroids (no matching boundary):\n${orphanedCentroids.map(s => `  - ${s}`).join('\n')}\n`
                }
                
                expect(centroidSlugs.length, errorMsg).toBe(boundarySlugs.length)
            }
            
            expect(centroidSlugs.length, 'Centroids count should match boundaries count').toBe(boundarySlugs.length)
        })
    })
})
