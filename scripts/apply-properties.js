import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function applyProperties() {
    try {
        const boundariesFile = join(__dirname, '../data/nyc-neighborhood-boundaries.geojson')
        const centroidsFile = join(__dirname, '../data/nyc-neighborhood-boundaries-centroids.geojson')
        
        console.log(`Reading boundaries: ${boundariesFile}`)
        console.log(`Reading centroids: ${centroidsFile}`)
        
        const boundaries = JSON.parse(readFileSync(boundariesFile, 'utf8'))
        const centroids = JSON.parse(readFileSync(centroidsFile, 'utf8'))
        
        // Create a map of slug -> {name, color} from boundaries
        const propertyMap = new Map()
        boundaries.features.forEach(feature => {
            if (feature.properties?.slug) {
                propertyMap.set(feature.properties.slug, {
                    name: feature.properties.name,
                    color: feature.properties.color
                })
            }
        })
        
        // Apply properties to centroids, keeping only name and color
        let matched = 0
        let unmatched = 0
        
        centroids.features.forEach(feature => {
            if (feature.properties?.slug && propertyMap.has(feature.properties.slug)) {
                const props = propertyMap.get(feature.properties.slug)
                feature.properties = {
                    slug: feature.properties.slug,
                    name: props.name,
                    color: props.color
                }
                matched++
            } else {
                // Clear properties if no match found
                feature.properties = {}
                unmatched++
            }
        })
        
        // Write the updated centroids file with each feature on one line
        let output = '{\n';
        output += `  "type": "${centroids.type}",\n`;
        
        // Add any other top-level properties
        Object.keys(centroids).forEach(key => {
            if (key !== 'type' && key !== 'features') {
                output += `  "${key}": ${JSON.stringify(centroids[key])},\n`;
            }
        });
        
        output += '  "features": [\n';
        
        centroids.features.forEach((feature, index) => {
            // Reorder feature to put properties before geometry
            const reorderedFeature = {
                type: feature.type,
                properties: feature.properties,
                geometry: feature.geometry,
                ...Object.keys(feature)
                    .filter(key => key !== 'type' && key !== 'properties' && key !== 'geometry')
                    .reduce((acc, key) => ({ ...acc, [key]: feature[key] }), {})
            };
            
            const featureStr = JSON.stringify(reorderedFeature);
            const comma = index < centroids.features.length - 1 ? ',' : '';
            output += `    ${featureStr}${comma}\n`;
        });
        
        output += '  ]\n';
        output += '}\n';
        
        writeFileSync(centroidsFile, output, 'utf8')
        
        console.log(`✅ Properties applied successfully: ${centroidsFile}`)
        console.log(`📊 Matched features: ${matched}`)
        console.log(`⚠️  Unmatched features: ${unmatched}`)
        console.log(`🎯 Only 'name' and 'color' properties preserved in centroids`)
        
    } catch (error) {
        console.error('❌ Error applying properties:', error.message)
        process.exit(1)
    }
}

// Run the script
applyProperties()
