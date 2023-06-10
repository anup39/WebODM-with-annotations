import React from "react";
import PropTypes from "prop-types";
import "../css/LayersControlPanel.scss";
import LayersControlLayerMeasuringStandard from "./LayersControlLayerMeasuringStandard";
import { _ } from "../classes/gettext";

export default class LayersControlPanelMeasuring extends React.Component {
  static defaultProps = {
    categories_measuring: [],
    sub_categories:[],
    standard_categories:[]
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    categories_measuring: PropTypes.array,
    map: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
  }

  render() {
    let content = "";

    console.log(this.props.categories_measuring, this.props.sub_categories, this.props.standard_categories)

    if (!this.props.categories_measuring.length)
      content = (
        <span>
          <i className="loading fa fa-circle-notch fa-spin"></i>{" "}
          {_("No any Measurings yet")}
        </span>
      );
    else {
      content = (
        <div>
          {this.props.categories_measuring.length ? (
            <div className="overlays theme-border-primary">
              {this.props.categories_measuring.map((layer, i) => (
                <LayersControlLayerMeasuringStandard
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
        <div>
        <span className="close-button" onClick={this.props.onClose} />
        <div className="title">{_("Measurings")}</div>
        </div>
        <hr />
        {content}
      </div>
    );
  }
}
