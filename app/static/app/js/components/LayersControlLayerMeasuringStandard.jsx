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
    overlay: false,
  };
  static propTypes = {
    layer: PropTypes.object.isRequired,
    expanded: PropTypes.bool,
    map: PropTypes.object.isRequired,
    overlay: PropTypes.bool,
    sub_categories:PropTypes.array,
    categories_measuring:PropTypes.array,

  };

  constructor(props) {
    super(props);

    this.map = props.map;

    // this.meta = props.layer.name;

    this.state = {
      // visible: this.map.hasLayer(props.layer),
      expanded: props.expanded,
    };


  }

  componentDidUpdate(prevProps, prevState) {
    const { layer } = this.props;

    // if (prevState.visible !== this.state.visible) {
    //   if (this.state.visible) {
    //     layer.addTo(this.map);
    //   } else {
    //     this.map.removeLayer(layer);
    //   }
    // }
  }

  handleLayerClick = () => {
    const { layer } = this.props;

    // const bounds =
    //   layer.options.bounds !== undefined
    //     ? layer.options.bounds
    //     : layer.getBounds();
    // this.map.fitBounds(bounds);

    // if (layer.getPopup()) layer.openPopup();
  };

  render() {
    const { meta } = this;

    return (
      <div className="layers-control-layer ">
        {this.props.overlay ?
          <>
            {this.props.layer.name === "All" ?
              <Checkbox layer={this.props.layer} map={this.map} bind={[this, "visible"]} />
              : 
              <ExpandButton bind={[this, 'expanded']} />
            }
            <a
              title={this.props.layer.name}
              className="layer-label"
              href="javascript:void(0);"
              // onClick={this.handleLayerClick}
            >
              {this.props.layer.name}
            </a>
          </>
          : null}

        {this.state.expanded ? <LayersControlLayerMeasuringSubCategory overlay={true} sub_categories={this.props.sub_categories} categories_measuring={this.props.categories_measuring} /> : null}

      </div>
    );

  }
}