import React from "react";
import PropTypes from "prop-types";
import "../css/LayersControlPanel.scss";
import { _ } from "../classes/gettext";
import L from "leaflet";
import "leaflet-draw";

export default class ExportControlPanel extends React.Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    map: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.rectangleDrawer = null;
    this.drawnRectangle = null;
  }

  handleExport = () => {
    const bounds = this.props.map.getBounds();
    const bbox = [
      bounds.getSouthWest().lng,
      bounds.getSouthWest().lat,
      bounds.getNorthEast().lng,
      bounds.getNorthEast().lat,
    ];

    const formattedBbox = '"bbox": [' + bbox.join(",") + "]";
    console.log(formattedBbox, "bounds bounds ");

    if (this.drawnRectangle) {
      this.props.map.removeLayer(this.rec);
      this.drawnRectangle = null;
      test.drawnRectangle.clearLayers();
    }
  };

  handleDrawExtent = () => {
    const map = this.props.map;
    map.on("click", this.handleMapClick);
  };

  handleMapClick = (event) => {
    const map = this.props.map;
    const clickPoint = event.latlng;

    if (!this.rectangleDrawer) {
      this.rectangleDrawer = new L.Draw.Rectangle(map);
      this.rectangleDrawer.enable();
      map.dragging.disable(); // Disable map dragging
      map.doubleClickZoom.disable(); // Disable double-click zoom
    } else {
      const bounds = new L.LatLngBounds(
        clickPoint,
        this.rectangleDrawer._startLatLng
      );
      const isRectangle =
        bounds.isValid() && bounds.getCenter().equals(clickPoint);

      if (isRectangle) {
        if (this.drawnRectangle) {
          this.drawnRectangle.unbindPopup();
          this.drawnRectangle.closePopup();
        }

        this.drawnRectangle = new L.Rectangle(bounds, {
          weight: 2,
          color: "#ff0000",
          fillOpacity: 0.2,
        }).addTo(map);
      }

      var layerUrls = [];

      function getLayerUrls(layer) {
        if (layer._url) {
          layerUrls.push(layer._url);
        } else if (layer instanceof L.GeoJSON) {
          var geojsonURL = layer.options.url;
          if (geojsonURL) {
            layerUrls.push(geojsonURL);
          }
        } else if (layer instanceof L.LayerGroup) {
          layer.eachLayer(getLayerUrls);
        }
      }

      map.eachLayer(getLayerUrls);

      this.rectangleDrawer.disable();
      this.rectangleDrawer = null;
      map.dragging.enable(); // Enable map dragging
      map.doubleClickZoom.enable(); // Enable double-click zoom
      map.off("click", this.handleMapClick);
      map.closePopup();
    }
  };

  render() {
    return (
      <div className="layers-control-panel">
        <span className="close-button" onClick={this.props.onClose} />
        <div className="title">{_("Export")}</div>
        <hr />
        {/* <button onClick={this.handleExport}>Export</button> */}
        <button onClick={this.handleDrawExtent}>Draw Extent</button>
      </div>
    );
  }
}
