# Scripts

Utility scripts for managing NYC neighborhood boundaries data.

## add-centroid.js

Adds a centroid point for a specific neighborhood by slug identifier.

**Usage:**
```bash
node scripts/add-centroid.js <neighborhood-slug> [--sub]
```

**Examples:**
```bash
# Add centroid for main neighborhood
node scripts/add-centroid.js fort-george-manhattan

# Add centroid for sub-neighborhood
node scripts/add-centroid.js meatpacking-district-manhattan --sub
```

This script:
- Finds the boundary feature with the given slug
- Calculates its centroid using Turf.js
- Adds the centroid to the appropriate centroids GeoJSON file (main or sub)
- Updates the feature count metadata

**Options:**
- `--sub` - Add centroid to sub-neighborhoods file instead of main neighborhoods file

**Note:** If you need to update properties after adding, run `apply-properties.js`.

---

## apply-properties.js

Synchronizes properties from boundary features to their corresponding centroids.

**Usage:**
```bash
node scripts/apply-properties.js
```

This script:
- Reads both boundaries and centroids files
- Matches features by slug
- Copies name and color properties from boundaries to centroids
- Preserves only slug, name, and color in centroid properties
- Reports matched and unmatched features

Use this after updating boundary properties or adding new centroids.

---

## build.js

Builds the final distribution files with summaries attached.

**Usage:**
```bash
node scripts/build.js
```

This script:
- Validates that every boundary has a corresponding markdown summary file
- Loads summary text from `src/summaries/*.md`
- Attaches summaries to both boundary and centroid features
- Writes formatted output to `dist/` directory
- Fails with error if any summaries are missing

Run this as the final step before publishing.

---

## export-names.js

Exports a list of all neighborhood slugs for reference.

**Usage:**
```bash
node scripts/export-names.js
```

**Example output:**
```
Total neighborhoods: 287

⚠️  Found 7 features without slug:
  [1] Fort George (manhattan)
  ...

fort-george-manhattan
hudson-heights-manhattan
...
```

This script:
- Lists the total feature count
- Warns about features missing slug properties
- Outputs all slugs (one per line)

Useful for finding slugs to use with `add-centroid.js`.

---

## format-geojson.js

Formats GeoJSON files with consistent structure and sorting.

**Usage:**
```bash
node scripts/format-geojson.js
```

This script:
- Formats both boundaries and centroids files
- Sorts features by borough, then by name
- Writes each feature on a single line for better git diffs
- Maintains consistent JSON structure

Run this to standardize formatting after manual edits.
