import React, { Component } from 'react'
import { ExpandButton } from './Toggle'
import LayersControlLayerMeasuringCategory from './LayersControlLayerMeasuringCategory'

export default class LayersControlLayerMeasuringSubCategory extends Component {

    constructor(props) {
        super(props)
        this.state = {
            expanded: false
        }

    }


    render() {
        return (
            <div className="layers-control-layer sub-category">
                {this.props.overlay ?
                    <>
                        <ExpandButton bind={[this, 'expanded']} />
                        <a
                            title={"Ground Grass"}
                            className="layer-label"
                            href="javascript:void(0);"
                        // onClick={this.handleLayerClick}
                        >
                            Ground Grass
                        </a>
                    </>
                    : null}

                {this.state.expanded ? <LayersControlLayerMeasuringCategory overlay={true} /> : null}

            </div>
        )
    }
}
