import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/WebGLTile.js';
import OSM from 'ol/source/OSM';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import { get as getProjection, transform, Projection } from 'ol/proj.js';
import { createXYZ } from "ol/tilegrid";
import { create_hover } from './hover';

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
        url: "test_wgs84.tif"
      }
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
      ["!=", ['band', 2], 0],
      [ 'interpolate',
        ['linear'],
        ["band", 1],
        1, [255, 255, 255],
        18125, [0, 0, 0]],
      ["color", 0,0,0,0]
    ]
  }
});
let tif_view = await tif_layer.getSource().getView();

// "mike-00"s sugestion to fix
tif_layer
  .getSource()
  .setTileGridForProjection(
    "EPSG:3857",
    createXYZ({ maxZoom: 4 }));

// create the map
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    tif_layer
  ],
  view: new View({
    center: transform(tif_view.center, tif_proj, map_proj),
    zoom: 9,
    projection: map_proj
  })
});

create_hover(map, tif_layer);
