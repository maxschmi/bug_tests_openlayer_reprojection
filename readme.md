# Openlayers bug example: WGS84 to Mercator reprojection

This example is a minimal example for a bug report of openlayers.

When reprejecting from wgs84 to Mercator on the fly, the resulting grid doesn't have a regular cell size.

The test_wgs84.tif is a GeoTiff file in CRS WGS84 (EPSG:4326) with random values to visualize the grid cells.
