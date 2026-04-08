# Neighborhood Fill Colors

Each neighborhood feature has a `color` property (integer 0–4) that maps to one of five fill colors. Sub-neighborhoods inherit the color of their parent neighborhood.

| Value | Hex       | Preview |
|-------|-----------|---------|
| 0     | `#e5c494` | Tan     |
| 1     | `#fc8d62` | Orange  |
| 2     | `#8da0cb` | Blue    |
| 3     | `#e78ac3` | Pink    |
| 4     | `#66c2a5` | Teal    |

The color index is applied in `map/style.json` across the following layers:

- `neighborhoods-fill` — polygon fill color
- `neighborhoods-border-labels` — text halo color
- `neighborhoods-sub-border-labels` — text halo color for sub-neighborhood borders
- `neighborhoods-labels` — text halo color for centroid labels
- `neighborhoods-sub-labels` — text halo color for sub-neighborhood centroid labels
