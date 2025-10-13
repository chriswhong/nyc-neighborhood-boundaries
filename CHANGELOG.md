# CHANGELOG

## v3
- add an optional `wikipedia_url` property

## v2
- add a `color` property for use in mapping
- reduce coordinate precision to 6 places to reduce file size

## v1
- use lowercase property names.
- convert `county` property to `borough` property, with mapping from county name to kebab-case borough name.
- remove all Feature properties except `name` and `borough`
- added top-level `id` property to each Feature (kebab-case of name-borough).
- remove duplicate neighborhoods
