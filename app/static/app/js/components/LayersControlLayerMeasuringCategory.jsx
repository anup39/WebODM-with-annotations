import React, { Component } from "react";
import { Checkbox } from "./Toggle";
import { _ } from "../classes/gettext";

export default class LayersControlLayerMeasuringCategory extends Component {
  constructor(props) {
    super(props);
    this.map = props.map;
    this.state = {
      visible: false,
      opacity: 0.5,
    };
  }

  updateOpacity = (evt) => {
    console.log(evt.target.value);
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

  render() {
    return (
      <div className="layers-control-layer category">
        <div>
          <Checkbox
            bind={[this, "visible"]}
            map={this.map}
            layer={this.props.layer}
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
