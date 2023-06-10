import React from "react";
import PropTypes from "prop-types";
import "../css/LayersControlLayer.scss";
import { Checkbox } from "./Toggle";
import { _ } from "../classes/gettext";
import { ExpandButton } from "./Toggle";
import LayersControlLayerMeasuringSubCategory from "./LayersControlLayerMeasuringSubCategory";

export default class LayersControlLayerMeasuringStandard extends React.Component {
  static defaultProps = {
    layer: null,
    expanded: false,
    map: null,
  };
  static propTypes = {
    layer: PropTypes.object.isRequired,
    expanded: PropTypes.bool,
    map: PropTypes.object.isRequired,
    sub_categories: PropTypes.array,
    categories_measuring: PropTypes.array,
  };

  constructor(props) {
    super(props);
    this.map = props.map;
    this.state = {
      // Check if the wms is there for visible
      visible: false,
      expanded: props.expanded,
    };
  }
  render() {
    const filtered = this.props.sub_categories.filter(
      (obj) => obj.standard_category === this.props.layer.id
    );

    return (
      <div className="layers-control-layer ">
        <>
          {this.props.layer.name === "All" ? (
            <Checkbox
              layer={this.props.layer}
              map={this.map}
              bind={[this, "visible"]}
              style={this.props.style}
            />
          ) : (
            <ExpandButton bind={[this, "expanded"]} />
          )}
          <a
            title={this.props.layer.name}
            className="layer-label"
            href="javascript:void(0);"
          >
            {this.props.layer.name}
          </a>
        </>

        {this.state.expanded
          ? filtered.map((layer, i) => (
              <LayersControlLayerMeasuringSubCategory
                map={this.props.map}
                expanded={false}
                layer={layer}
                key={i}
                categories_measuring={this.props.categories_measuring}
              />
            ))
          : null}
      </div>
    );
  }
}
