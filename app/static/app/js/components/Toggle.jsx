import React from "react";
import PropTypes from "prop-types";
import "../css/Toggle.scss";
import Leaflet from "leaflet";
import axios from "axios";

const geoserver_url = "http://137.135.165.161:8600/geoserver";
class Toggle extends React.Component {
  static defaultProps = {};
  static propTypes = {
    bind: PropTypes.array.isRequired, // two element array,
    // with first element being the parent element
    // and the second the boolean property to determine visibility
    // ex. [this, 'visible']
    trueIcon: PropTypes.string,
    falseIcon: PropTypes.string,
  };

  constructor(props) {
    super(props);
  }

  handleClick = () => {
    console.log(this.props.layer, "layer");
    console.log(this.props.map, "map");

    if (this.props.layer && this.props.map) {
      //Geojson style file
      const myStyle = {
        color: "red",
      };
      axios
        .get(`${geoserver_url}/wfs`, {
          params: {
            service: "WFS",
            version: "1.1.0",
            request: "GetFeature",
            typename: `super_admin:${this.props.layer.view_name}`,
            srsname: "EPSG:4326",
            outputFormat: "application/json",
          },
        })
        .then((response) => {
          const data = response.data;
          console.log(data, "data");
          const selectedArea = Leaflet.geoJson(data, {
            style: myStyle,
            onEachFeature: function (feature, layer) {
              layer.bindPopup(`Name: ${feature.properties.name}`);
            },
          }).addTo(this.props.map);
          this.props.map.fitBounds(selectedArea.getBounds());
        })
        .catch((error) => {
          // Handle the error here
          console.log(error);
        });
    }

    const [parent, prop] = this.props.bind;
    parent.setState({ [prop]: !parent.state[prop] });
  };

  render() {
    const [parent, prop] = this.props.bind;
    const icon = parent.state[prop]
      ? this.props.trueIcon
      : this.props.falseIcon;
    return (
      <a
        className="toggle"
        href="javascript:void(0);"
        onClick={this.handleClick}
      >
        <i className={icon}></i>
      </a>
    );
  }
}

class Checkbox extends Toggle {
  static defaultProps = {
    trueIcon: "far fa-check-square",
    falseIcon: "far fa-square",
  };
}

class ExpandButton extends Toggle {
  static defaultProps = {
    trueIcon: "fa fa-caret-down",
    falseIcon: "fa fa-caret-right",
  };
}

export { Toggle, Checkbox, ExpandButton };
