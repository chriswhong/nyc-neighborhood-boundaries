# Scripts

Utility scripts for managing NYC neighborhood boundaries data.

## build.js

Builds the distribution files for publishing.

**Usage:**
```bash
npm run build
```

This script:
- Clears the `dist/` directory
- Validates that every main neighborhood has a corresponding markdown summary in `src/summaries/`
- Merges main neighborhoods and sub-neighborhoods into a single boundaries file
- Merges main centroids and sub-centroids into a single centroids file
- Adds `kind: "neighborhood"` or `kind: "sub-neighborhood"` to every feature
- Populates `child_neighborhoods` (with slug and name) on parent neighborhood features
- Populates `parent_neighborhoods` (with slug and name) on sub-neighborhood features
- Attaches summary text to main neighborhood features
- Writes two output files to `dist/`:
  - `nyc-neighborhood-boundaries.geojson` — 308 boundary polygons
  - `nyc-neighborhood-boundaries-centroids.geojson` — 308 centroid points

---

## add-centroid.js

Adds a centroid point for a neighborhood when a new boundary is added.

**Usage:**
```bash
node scripts/add-centroid.js <neighborhood-slug> [--sub]
```

**Examples:**
```bash
# Add centroid for a main neighborhood
node scripts/add-centroid.js astoria-queens

# Add centroid for a sub-neighborhood
node scripts/add-centroid.js meatpacking-district-manhattan --sub
```

This script:
- Finds the boundary feature with the given slug
- Calculates its centroid using Turf.js
- Adds the centroid (with slug only) to the appropriate centroids file
- Updates the feature count in metadata

Run `npm test` after adding a centroid to confirm everything is consistent.

---

## format-geojson.js

Reformats GeoJSON source files so each feature is on a single line.

**Usage:**
```bash
node scripts/format-geojson.js
```

This script:
- Sorts features by borough, then by name
- Writes each feature on a single line for cleaner git diffs
- Applies to the main boundaries and centroids source files

Run this after manual edits that break the single-line formatting (enforced by `npm test`).
