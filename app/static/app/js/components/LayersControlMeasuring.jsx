import React from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import PropTypes from "prop-types";
import "../css/LayersControl.scss";
import LayersControlPanelMeasuring from "./LayersControlPanelMeasuring";

class LayersControlButtonMeasuring extends React.Component {
  static propTypes = {
    overlays_measuring: PropTypes.array.isRequired,
    map: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      showPanel: false,
    };
  }

  handleOpen = () => {
    this.setState({ showPanel: true });
  };

  handleClose = () => {
    this.setState({ showPanel: false });
  };

  render() {
    const { showPanel } = this.state;

    return (
      <div className={showPanel ? "open" : ""}>
        <a
          href="javascript:void(0);"
          title="Layers"
          onClick={this.handleOpen}
          className="leaflet-control-layers-control-button leaflet-bar-part theme-secondary"
        ></a>
        <LayersControlPanelMeasuring
          map={this.props.map}
          overlays_measuring={this.props.overlays_measuring}
          onClose={this.handleClose}
        />
      </div>
    );
  }
}

export default L.Control.extend({
  options: {
    position: "topright",
  },

  onAdd: function (map) {
    this.container = L.DomUtil.create(
      "div",
      "leaflet-control-layers-control leaflet-bar leaflet-control"
    );
    this.map = map;

    L.DomEvent.disableClickPropagation(this.container);
    L.DomEvent.disableScrollPropagation(this.container);


    this.update([]);

    return this.container;
  },

  update: function (overlays_measuring) {
    ReactDOM.render(
      <LayersControlButtonMeasuring
        map={this.map}
        overlays_measuring={overlays_measuring}
      />,
      this.container
    );
  },
});
