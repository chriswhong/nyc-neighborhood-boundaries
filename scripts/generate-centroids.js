// /Users/chriswhong/Sites/nyc-neighborhood-boundaries/generate-centroids.js
import fs from 'fs';
import turfCentroid from '@turf/centroid';

// Read the input GeoJSON file
const inputFile = './nyc-neighborhood-boundaries.geojson';
const outputFile = './nyc-neighborhood-boundaries-centroids.geojson';

try {
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  // Generate centroids for each feature
  const centroids = {
    type: 'FeatureCollection',
    features: data.features.map(feature => {
      const centroid = turfCentroid(feature);
      // Inherit all properties from the original feature
      centroid.properties = { ...feature.properties };
      return centroid;
    })
  };
  
  // Write the output file
  fs.writeFileSync(outputFile, JSON.stringify(centroids, null, 2));
  console.log(`Centroids generated successfully: ${outputFile}`);
  console.log(`Generated ${centroids.features.length} centroid points`);
  
} catch (error) {
  console.error('Error generating centroids:', error.message);
  process.exit(1);
}