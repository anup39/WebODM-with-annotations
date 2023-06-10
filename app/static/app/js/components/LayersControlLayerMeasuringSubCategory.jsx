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
            <>
                {
                    this.props.sub_categories.map((item) =>
                        <div key={item.id} className="layers-control-layer sub-category">
                            {this.props.overlay ?
                                <>
                                    <ExpandButton bind={[this, 'expanded']} />
                                    <a
                                        title= {item.name}
                                        className="layer-label"
                                        href="javascript:void(0);"
                                    // onClick={this.handleLayerClick}
                                    >
                                        {item.name}
                                    </a>
                                </>
                                : null}

                            {/* {this.state.expanded ? <LayersControlLayerMeasuringCategory overlay={true} categories_measuring={this.props.categories_measuring} /> : null} */}

                        </div>

                    )
                }</>
        )
    }
}
