import React, { Component } from "react";
import { Checkbox } from "./Toggle";
import { _ } from "../classes/gettext";
import axios from "axios";

export default class LayersControlLayerMeasuringCategory extends Component {
  constructor(props) {
    super(props);
    this.map = props.map;
    this.state = {
      visible: false,
      opacity: 0.5,
      style: {},
    };
  }

  updateOpacity = (evt) => {
    this.setState({
      opacity: parseFloat(evt.target.value),
    });
    const layer_name = this.props.layer.view_name;
    this.map.eachLayer(function (layer) {
      if (layer?.layer_name === layer_name) {
        const currentLayer = layer;
        currentLayer.eachLayer((mainlayer) => {
          const currentStyle = mainlayer.options;

          // Modify the fill color
          currentStyle.fillOpacity = evt.target.value;

          // Update the style of the layer on the map
          mainlayer.setStyle(currentStyle);
        });
      }
    });
  };

  componentDidMount() {
    axios
      .get(`/api/category-style/?measuring_category=${this.props.layer.id}`)
      .then((response) => {
        this.setState({
          style: response.data.results[0],
          opacity: response.data.results[0].fill_opacity,
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  render() {
    return (
      <div className="layers-control-layer category">
        <div>
          <Checkbox
            bind={[this, "visible"]}
            map={this.map}
            layer={this.props.layer}
            style={this.state.style}
          />
          <a
            title={this.props.layer.name}
            className="layer-label"
            href="javascript:void(0);"
            // onClick={this.handleLayerClick}
          >
            {this.props.layer.name}
          </a>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={this.state.opacity}
            onChange={this.updateOpacity}
          />
        </div>
      </div>
    );
  }
}
