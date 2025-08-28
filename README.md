# NYC Neighborhood Boundaries

A geoJSON file containing contiguous polygons representing neighborhoods in New York City.

## About

This dataset was created to support a side project that required a contiguous set of neighborhood boundaries. While many printed maps showing NYC neighborhoods exist, I found it difficult to source spatial data with an open license allowing re-use.

The Zillow neighborhood data last published in 2017 is the best starting point for an open dataset of neighborhood polygons for use in GIS and web/mobile mapping projects.

Publishing the data on github means changes can be tracked over time, and anyone can recommend changes via a Pull Request.


## NYC neighborhood boundaries are a matter of opinion

Neighborhood boundaries in New York City are not official. The city does not publish an authoritative set of neighborhood lines, and different sources often draw them differently. Boundaries can be disputed, overlapping, or controversial, and residents may identify with neighborhoods in ways that don’t align with drawn borders.

This dataset is provided as a general reference only and should not be treated as definitive. Boundaries are approximate and may reflect one interpretation among many.

The New York Times' 2023 piece [An Extremely Detailed Map of New York City Neighborhoods](https://www.nytimes.com/interactive/2023/upshot/extremely-detailed-nyc-neighborhood-map.html) includes a more accurate depiction of NYC neighborhoods with block-level details based on data collected from residents. 

You may also encounter [Neighborhood Tabulation Areas](https://www.nyc.gov/content/planning/pages/resources/datasets/neighborhood-tabulation) when searching for spatial data for NYC neighborhoods. These are defined by the NYC Department of City Planning and are intended for aggregation of census data. They do not generally align with what residents would consider boundaries of a single neighborhood.

## License

This dataset is licensed under [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/). This license is compatible with the terms of the CC BY-SA 3.0 license the parent dataset was published under.

You are free to:

* **Share** — copy and redistribute the material in any medium or format for any purpose, even commercially.

* **Adapt** — remix, transform, and build upon the material for any purpose, even commercially.


## Data Provenance

This dataset is derived from the **Zillow Neighborhood Boundary Shapefile for New York State**, originally published under the [Creative Commons BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) license.

The data were originally published at `https://www.zillow.com/howto/api/neighborhood-boundaries.htm` but this page now redirects. It was last available in August 2017 and can be viewed and downloaded via the Internet Archive's [Wayback Machine](https://web.archive.org/web/20170818052012/https://www.zillow.com/howto/api/neighborhood-boundaries.htm)

The first commit of this repo includes a geoJSON file derived from the original NY State Boundaries shapefile:
- the data was filtered to include only New York City neighborhoods
- the coordinate reference system was converted to EPSG 4326 (WGS84)

