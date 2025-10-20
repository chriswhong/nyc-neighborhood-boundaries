import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');

const files = [
  '../data/nyc-neighborhood-boundaries.geojson',
  '../data/nyc-neighborhood-boundaries-centroids.geojson'
];

function formatGeoJSON(filePath) {
  console.log(`Formatting ${path.basename(filePath)}...`);
  
  // Read the file
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Sort features by borough, then by name
  const sortedFeatures = data.features.sort((a, b) => {
    const boroughA = a.properties.borough || '';
    const boroughB = b.properties.borough || '';
    const nameA = a.properties.name || '';
    const nameB = b.properties.name || '';
    
    if (boroughA !== boroughB) {
      return boroughA.localeCompare(boroughB);
    }
    return nameA.localeCompare(nameB);
  });
  
  // Format with each feature on a new line
  const formatted = {
    type: data.type,
    ...Object.keys(data)
      .filter(key => key !== 'type' && key !== 'features')
      .reduce((acc, key) => ({ ...acc, [key]: data[key] }), {}),
    features: sortedFeatures
  };
  
  // Create custom JSON string with features on separate lines
  let output = '{\n';
  output += `  "type": "${formatted.type}",\n`;
  
  // Add any other top-level properties
  Object.keys(formatted).forEach(key => {
    if (key !== 'type' && key !== 'features') {
      output += `  "${key}": ${JSON.stringify(formatted[key])},\n`;
    }
  });
  
  output += '  "features": [\n';
  
  formatted.features.forEach((feature, index) => {
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
    const comma = index < formatted.features.length - 1 ? ',' : '';
    output += `    ${featureStr}${comma}\n`;
  });
  
  output += '  ]\n';
  output += '}\n';
  
  // Write back to file
  fs.writeFileSync(filePath, output, 'utf8');
  
  console.log(`✓ Formatted ${formatted.features.length} features`);
}

// Process each file
files.forEach(file => {
  const filePath = path.join(dataDir, file);
  
  if (fs.existsSync(filePath)) {
    formatGeoJSON(filePath);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

console.log('\nDone!');
