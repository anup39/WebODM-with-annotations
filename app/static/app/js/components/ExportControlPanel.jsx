import React from "react";
import PropTypes from "prop-types";
import "../css/LayersControlPanel.scss";
import { _ } from "../classes/gettext";

export default class ExportControlPanel extends React.Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    map: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
  }

  handleExport = () => {
    const bounds = this.props.map.getBounds();
    const bbox = [
      bounds.getSouthWest().lng,
      bounds.getSouthWest().lat,
      bounds.getNorthEast().lng,
      bounds.getNorthEast().lat,
    ];

    var formattedBbox = '"bbox": [' + bbox.join(",") + "]";
    console.log(formattedBbox);
  };

  render() {
    return (
      <div className="layers-control-panel">
        <span className="close-button" onClick={this.props.onClose} />
        <div className="title">{_("Export")}</div>
        <hr />
        <button onClick={this.handleExport}>Export </button>
        <button>Draw Extent</button>
        <h3>Extent:{`[12, 23, 45, 67]`}</h3>
      </div>
    );
  }
}
