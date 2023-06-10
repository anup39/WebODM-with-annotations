import React from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import PropTypes from "prop-types";
import "../css/LayersControl.scss";
import LayersControlPanelMeasuring from "./LayersControlPanelMeasuring";

class LayersControlButtonMeasuring extends React.Component {
  static propTypes = {
    standard_categories: PropTypes.array.isRequired,
    sub_categories: PropTypes.array,
    categories_measuring: PropTypes.array,
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
    console.log(this.props.standard_categories,"standard categories")
    console.log(this.props.sub_categories,"sub cateogries")
    console.log(this.props.categories_measuring,"categories")


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
          categories_measuring={this.props.categories_measuring}
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

  update: function (categories_measuring) {
    ReactDOM.render(
      <LayersControlButtonMeasuring
        map={this.map}
        categories_measuring={categories_measuring}
      />,
      this.container
    );
  },
});
