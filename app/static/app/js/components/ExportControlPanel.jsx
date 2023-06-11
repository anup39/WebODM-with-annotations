import React from "react";
import PropTypes from "prop-types";
import "../css/LayersControlPanel.scss";
import LayersControlLayer from "./LayersControlLayer";
import { _ } from "../classes/gettext";

export default class ExportControlPanel extends React.Component {
  static defaultProps = {
    layers: [],
    overlays: [],
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    layers: PropTypes.array.isRequired,
    overlays: PropTypes.array,
    map: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="layers-control-panel">
        <span className="close-button" onClick={this.props.onClose} />
        <div className="title">{_("Export")}</div>
        <hr />
        <button>Export </button>
        <button>Draw Extent</button>
        <h3>Extent:{`[12, 23, 45, 67]`}</h3>
      </div>
    );
  }
}
