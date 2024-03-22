import "./style.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/WebGLTile.js";
import OSM from "ol/source/OSM";
import GeoTIFF from "ol/source/GeoTIFF.js";
import { get as getProjection, transform, transformExtent } from "ol/proj.js";
import { createXYZ } from "ol/tilegrid";
import { create_hover } from "./hover";
import "./polyfill.js";
import { calculateSourceResolution } from "ol/reproj.js";
import { getWidth } from "ol/extent";
import { toSize } from "ol/size";
import GeoJSON from "ol/format/GeoJSON.js";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style, Stroke } from "ol/style";

// create the map projection
// /////////////////////////
// with proj4
let map_proj = getProjection("EPSG:3857");
let tif_proj = getProjection("EPSG:4326");

// create the tif layer
let tif_layer = new TileLayer({
  source: new GeoTIFF({
    sources: [
      {
        bands: [1],
        url: "test_wgs84.tif",
      },
    ],
    sourceOptions: {
      allowFullFile: true,
    },
    interpolate: false,
    normalize: false,
    projection: tif_proj,
  }),
  style: {
    color: [
      "case",
      ["!=", ["band", 2], 0],
      [
        "interpolate",
        ["linear"],
        ["band", 1],
        1,
        [255, 255, 255],
        18125,
        [0, 0, 0],
      ],
      ["color", 0, 0, 0, 0],
    ],
  },
});
let tif_view = await tif_layer.getSource().getView();
let tile_extent = transformExtent(tif_view.extent, tif_proj, map_proj);

// "mike-00"s sugestion to fix
const source = tif_layer.getSource();
const tileGrid = source.getTileGrid();
const resolutions = tileGrid.getResolutions();
const maxZoom = resolutions.length - 1;
const resolution =
  (resolutions[maxZoom] * getWidth(map_proj.getExtent())) /
  getWidth(tif_view.projection.getExtent());

const reprojTilePixelRatio = Math.max.apply(
  null,
  tileGrid.getResolutions().map((r, z) => {
    const tileSize = toSize(tileGrid.getTileSize(z));
    const textureSize = source.getTileSize(z);
    return Math.max(textureSize[0] / tileSize[0], textureSize[1] / tileSize[1]);
  }),
);

tif_layer.getSource().setTileGridForProjection(
  "EPSG:3857",
  createXYZ({
    extent: transformExtent(tif_view.extent, tif_view.projection, map_proj),
    maxResolution: resolution * reprojTilePixelRatio,
    maxZoom: maxZoom,
  }),
);

// create the map
const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    tif_layer,
    new VectorLayer({
      source: new VectorSource({
        format: new GeoJSON(),
        url: "./Grid-selection.geojson",
      }),
      style: new Style({
        stroke: new Stroke({
          color: "#ff33f9",
          width: 2,
        }),
      }),
    }),
  ],
  view: new View({
    center: transform(tif_view.center, tif_proj, map_proj),
    zoom: 9,
    projection: map_proj,
  }),
});

create_hover(map, tif_layer);
