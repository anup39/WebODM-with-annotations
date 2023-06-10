import React, { Component } from 'react'
import { Checkbox } from './Toggle'
import { _ } from "../classes/gettext";

export default class LayersControlLayerMeasuringCategory extends Component {

    constructor(props) {
        super(props)
        this.state = {
            visible: false
        }

    }

    render() {
        return (
            <div className="layers-control-layer category">
                    <div >
                    <Checkbox bind={[this, 'visible']} />
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
                        step="1"
                        // value={this.state.opacity}
                        // onChange={this.updateOpacity}
                    />
                    
                    </div>

            </div>
        )
    }
}