import React, { Component } from 'react'
import { ExpandButton } from './Toggle'
import LayersControlLayerMeasuringCategory from './LayersControlLayerMeasuringCategory'

export default class LayersControlLayerMeasuringSubCategory extends Component {

    constructor(props) {
        super(props)
        this.state = {
            expanded: props.expanded,
            visible:false
        }

    }

    render() {

        const filtered = this.props.categories_measuring.filter(obj => obj.sub_category === this.props.layer.id);
        console.log(filtered,"filtered Categories")
    
        return (
            <>
                <div   className="layers-control-layer sub-category">              
                    <>
                                    <ExpandButton bind={[this, 'expanded']} />
                                    <a
                                        title= {this.props.layer.name}
                                        className="layer-label"
                                        href="javascript:void(0);"
                                    // onClick={this.handleLayerClick}
                                    >
                                        {this.props.layer.name}
                                    </a>
                                </>
                              
                        </div>

                    
                        {this.state.expanded ? 
          filtered.map((layer,i)=>
            <LayersControlLayerMeasuringCategory  map={this.props.map} expanded={false}  layer={layer}  key={i}  />          

          )
        : null}
                
                </>
        )
    }
}
