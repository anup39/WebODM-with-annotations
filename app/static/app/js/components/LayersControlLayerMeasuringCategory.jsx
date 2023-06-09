import React, { Component } from 'react'
import { Checkbox } from './Toggle'

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
                {this.props.overlay ?
                    <>
                        <Checkbox bind={[this, 'visible']} />
                        <a
                            title={"Ground Grass 1"}
                            className="layer-label"
                            href="javascript:void(0);"
                        // onClick={this.handleLayerClick}
                        >
                            Ground Grass 1
                        </a>
                    </>
                    : null}

            </div>
        )
    }
}
