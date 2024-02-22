import Overlay from 'ol/Overlay.js';

// define variables
const info_div = document.getElementById('info');

/**
 * Create an overlay to anchor the popup to the map.
 */
const overlay = new Overlay({
  element: info_div,
  className: 'ov-hover',
  autoPan: false,
  positioning: 'bottom-left',
});

// create hover
export function create_hover(map, layer) {
  map.addOverlay(overlay);
  map.on('pointermove', function (evt) {
    if (evt.dragging) {
      overlay.setPosition(undefined);
      return;
    }
    let pixel = map.getEventPixel(evt.originalEvent)

    let pix_value = layer.getData(pixel);
    if ((pix_value != null) && (pix_value[1] != 0)) {
      overlay.setPosition(evt.coordinate);
      info_div.innerText = `${pix_value[0]}`;
    } else {
      overlay.setPosition(undefined);
    }
  });
}