import React from "react";
import PropTypes from "prop-types";
import "../css/LayersControlPanel.scss";
import LayersControlLayerMeasuring from "./LayersControlLayerMeasuring";
import { _ } from "../classes/gettext";

export default class LayersControlPanelMeasuring extends React.Component {
  static defaultProps = {
    overlays_measuring: [],
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    overlays_measuring: PropTypes.array,
    map: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
  }

  render() {
    let content = "";

    if (!this.props.overlays_measuring.length)
      content = (
        <span>
          <i className="loading fa fa-circle-notch fa-spin"></i>{" "}
          {_("No any Measurings yet")}
        </span>
      );
    else {
      content = (
        <div>
          {this.props.overlays_measuring.length ? (
            <div className="overlays theme-border-primary">
              {this.props.overlays_measuring.map((layer, i) => (
                <LayersControlLayerMeasuring
                  map={this.props.map}
                  expanded={false}
                  overlay={true}
                  layer={layer}
                  key={i}
                />
              ))}
            </div>
          ) : (
            ""
          )}
        </div>
      );
    }

    return (
      <div className="layers-control-panel">
        <span className="close-button" onClick={this.props.onClose} />
        <div className="title">{_("Measurings")}</div>
        <hr />
        {content}
      </div>
    );
  }
}
