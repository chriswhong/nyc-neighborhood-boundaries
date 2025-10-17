import { describe, test, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
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

describe('NYC Neighborhood Boundaries GeoJSON Validation', () => {
    let geojson
    let fileContent

    beforeAll(() => {
        const filePath = join(__dirname, '../data/nyc-neighborhood-boundaries.geojson')
        
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

        test('should not have any null or undefined geometries', () => {
            geojson.features.forEach((feature, index) => {
                expect(feature.geometry, `Feature ${index + 1} should have geometry`).not.toBeNull()
                expect(feature.geometry, `Feature ${index + 1} should have geometry`).toBeDefined()
                expect(feature.geometry.type, `Feature ${index + 1} should have geometry type`).toBeDefined()
                expect(feature.geometry.coordinates, `Feature ${index + 1} should have coordinates`).toBeDefined()
            })
        })
    })
})
