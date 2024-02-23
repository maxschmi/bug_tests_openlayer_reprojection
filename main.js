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
    createXYZ({ maxZoom: 5 }));

/*
 * Polyfill to make Gecko browser `CanvasRenderingContext2D.drawImage()` behavior when
 * downscaling with `imageSmoothingEnabled` set to `false` consistent with other browsers
 * (no smoothing or interpolation of pixel values) and not as updated in
 * https://github.com/mdn/content/blob/main/files/en-us/mozilla/firefox/releases/56/index.md#canvas-and-webgl
 */
(function () {

  const canvas1 = document.createElement('canvas');
  canvas1.width = 2;
  canvas1.height = 2;
  const ctx1 = canvas1.getContext('2d');
  const imageData = ctx1.createImageData(2, 2);
  imageData.data[0] = 255;
  imageData.data[3] = 255;
  imageData.data[7] = 255;
  imageData.data[11] = 255;
  imageData.data[12] = 255;
  imageData.data[15] = 255;
  ctx1.putImageData(imageData, 0, 0);
  const canvas2 = document.createElement('canvas');
  canvas2.width = 1;
  canvas2.height = 1;
  const ctx2 = canvas2.getContext('2d');
  ctx2.imageSmoothingEnabled = false;
  ctx2.drawImage(canvas1, 0, 0, 2, 2, 0, 0, 1, 1);
  const data = ctx2.getImageData(0, 0, 1, 1).data;

  if (data[0] !== 0 && data[0] !== 255) {
    // browser interpolates, polyfill is needed
    const defaultDrawImage = CanvasRenderingContext2D.prototype.drawImage;

    CanvasRenderingContext2D.prototype.drawImage = function (
      image,
      ...params
    ) {
      // Calculate scales in case workaround is needed
      let scaleX = 1;
      let scaleY = 1;

      let sx = 0;
      let sy = 0;
      let sWidth = image.width;
      let sHeight = image.height;
      let dx;
      let dy;
      let dWidth = sWidth;
      let dHeight = sHeight;

      if (!this.imageSmoothingEnabled) {
        const transform = this.getTransform();
        scaleX = Math.sqrt(
          transform.a * transform.a + transform.b * transform.b
        );
        scaleY = Math.sqrt(
          transform.c * transform.c + transform.d * transform.d
        );

        if (params.length === 2) {
          [dx, dy] = params;
        } else if (params.length === 4) {
          [dx, dy, dWidth, dHeight] = params;
        } else if (params.length === 8) {
          [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight] = params;
        }

        scaleX *= Math.abs(dWidth / sWidth);
        scaleY *= Math.abs(dHeight / sHeight);
      }

      if (dx !== undefined && dy !== undefined && scaleX < 1 && scaleY < 1) {
        // Image reduction workaround to avoid downscaling by
        // Gecko browsers when interpolation is not required
        let toKeepX = Math.abs(sWidth);
        let toKeepY = Math.abs(sHeight);
        let sWidthFinal = toKeepX;
        let sHeightFinal = toKeepY;
        // Reduce whichever dimension needs less reduction
        // keeping at least one row or column
        if (scaleX > scaleY) {
          toKeepX = Math.max(Math.floor(scaleX * toKeepX), 1);
          sWidthFinal = Math.min(toKeepX, scaleX * sWidthFinal);
        } else {
          toKeepY = Math.max(Math.floor(scaleY * toKeepY), 1);
          sHeightFinal = Math.min(toKeepY, scaleY * sHeightFinal);
        }

        const drawImage = document.createElement('canvas');
        drawImage.width = toKeepX;
        drawImage.height = toKeepY;
        const drawContext = drawImage.getContext('2d');
        drawContext.imageSmoothingEnabled = false;
        defaultDrawImage.call(
          drawContext,
          image,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          toKeepX,
          toKeepY
        );
        defaultDrawImage.call(
          this,
          drawImage,
          0,
          0,
          sWidthFinal,
          sHeightFinal,
          dx,
          dy,
          dWidth,
          dHeight
        );

        drawImage.width = 1;
        drawImage.height = 1;
      } else {
        defaultDrawImage.call(this, image, ...params);
      }
    };
  }

})();

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
