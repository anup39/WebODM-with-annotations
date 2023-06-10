import React from "react";
import PropTypes from "prop-types";
import "../css/Toggle.scss";
import Leaflet from "leaflet";

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
    // Create a WFS source
    const wfsSource = new L.WFS.source({
      url: `${geoserver_url}/wfs`,
      typeName: this.props.layer.view_name,
      // namespaceUri: "http://example.com/namespace",
    });

    // Create a WFS layer
    const wfsLayer = new L.WFS({
      source: wfsSource,
      style: {
        color: "blue",
        weight: 2,
      },
      onEachFeature: function (feature, layer) {
        // Add any desired feature interaction or popup functionality here
        layer.bindPopup("Feature ID: " + "Test");
      },
    });

    // Add the WFS layer to the map
    wfsLayer.addTo(this.props.map);
    // this.props.map.fitBounds(bounds);

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
