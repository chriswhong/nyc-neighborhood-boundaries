import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function roundCoordinate(coord, precision = 6) {
    return Math.round(coord * Math.pow(10, precision)) / Math.pow(10, precision)
}

function calculateCentroid(geometry) {
    if (geometry.type === 'Polygon') {
        return calculatePolygonCentroid(geometry.coordinates[0])
    } else if (geometry.type === 'MultiPolygon') {
        // For MultiPolygon, find the largest polygon and use its centroid
        let largestArea = 0
        let largestPolygon = null
        
        geometry.coordinates.forEach(polygon => {
            const area = calculatePolygonArea(polygon[0])
            if (area > largestArea) {
                largestArea = area
                largestPolygon = polygon[0]
            }
        })
        
        return calculatePolygonCentroid(largestPolygon)
    }
    
    throw new Error(`Unsupported geometry type: ${geometry.type}`)
}

function calculatePolygonCentroid(coordinates) {
    let area = 0
    let x = 0
    let y = 0
    
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [x0, y0] = coordinates[i]
        const [x1, y1] = coordinates[i + 1]
        const a = x0 * y1 - x1 * y0
        area += a
        x += (x0 + x1) * a
        y += (y0 + y1) * a
    }
    
    area *= 0.5
    x /= (6.0 * area)
    y /= (6.0 * area)
    
    return [roundCoordinate(x), roundCoordinate(y)]
}

function calculatePolygonArea(coordinates) {
    let area = 0
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [x0, y0] = coordinates[i]
        const [x1, y1] = coordinates[i + 1]
        area += x0 * y1 - x1 * y0
    }
    return Math.abs(area) * 0.5
}

function generateCentroids() {
    try {
        const inputFile = join(__dirname, '../data/nyc-neighborhood-boundaries.geojson')
        const outputFile = join(__dirname, '../data/nyc-neighborhood-boundaries-centroids.geojson')
        
        console.log(`Reading: ${inputFile}`)
        const data = JSON.parse(readFileSync(inputFile, 'utf8'))
        
        // Generate centroids for each feature
        const centroids = {
            type: 'FeatureCollection',
            // Copy metadata from source if it exists
            ...(data.metadata && { metadata: { ...data.metadata } }),
            features: data.features.map(feature => {
                const centroidCoords = calculateCentroid(feature.geometry)
                
                return {
                    type: 'Feature',
                    id: feature.id,
                    properties: { ...feature.properties },
                    geometry: {
                        type: 'Point',
                        coordinates: centroidCoords
                    }
                }
            })
        }
        
        // Write the output file with pretty formatting
        writeFileSync(outputFile, JSON.stringify(centroids, null, 2), 'utf8')
        
        console.log(`✅ Centroids generated successfully: ${outputFile}`)
        console.log(`📊 Generated ${centroids.features.length} centroid points`)
        console.log(`🎯 Coordinates rounded to 6 decimal places`)
        
        if (data.metadata) {
            console.log(`📋 Copied metadata from source file`)
        }
        
    } catch (error) {
        console.error('❌ Error generating centroids:', error.message)
        process.exit(1)
    }
}

// Run the script
generateCentroids()
