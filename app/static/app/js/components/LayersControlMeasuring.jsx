import React from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import PropTypes from "prop-types";
import "../css/LayersControl.scss";
import LayersControlPanelMeasuring from "./LayersControlPanelMeasuring";

class LayersControlButtonMeasuring extends React.Component {
  static propTypes = {
    standard_categories: PropTypes.array,
    sub_categories: PropTypes.array,
    categories_measuring: PropTypes.array,
    map: PropTypes.object.isRequired,
    project_name: PropTypes.string,
    project_id: PropTypes.number,
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
          categories_measuring={this.props.categories_measuring}
          sub_categories={this.props.sub_categories}
          standard_categories={this.props.standard_categories}
          project_name={this.props.project_name}
          project_id={this.props.project_id}
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

  update: function (
    categories_measuring,
    sub_categories,
    standard_categories,
    project_name,
    project_id
  ) {
    ReactDOM.render(
      <LayersControlButtonMeasuring
        map={this.map}
        categories_measuring={categories_measuring}
        sub_categories={sub_categories}
        standard_categories={standard_categories}
        project_name={project_name}
        project_id={project_id}
      />,
      this.container
    );
  },
});
