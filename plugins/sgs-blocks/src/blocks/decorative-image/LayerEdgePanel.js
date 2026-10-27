/**
 * Position from the edges: the Floating layer's top, right, bottom and left offsets per device, through the shared
 * length control. An axis with an edge set is placed by that edge at every device instead of by its centre
 * percentage (includes/helpers-layer-edges.php::sgs_layer_edges; canvas twin `layer-preview.js::layerEdges`).
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { SgsLengthControl, ResponsiveOverride } from '../../components';

const EDGE_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
];

const EDGES = [
	[ 'positionTop', __( 'Top', 'sgs-blocks' ) ],
	[ 'positionRight', __( 'Right', 'sgs-blocks' ) ],
	[ 'positionBottom', __( 'Bottom', 'sgs-blocks' ) ],
	[ 'positionLeft', __( 'Left', 'sgs-blocks' ) ],
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @return {JSX.Element} The Position from the edges panel.
 */
export default function LayerEdgePanel( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Position from the edges', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<p className="components-base-control__help">
					{ __(
						'Set an edge to place the layer that far from the side of its section; a negative value pushes it past the side. Setting Left or Right replaces Position X, and Top or Bottom replaces Position Y, on every device.',
						'sgs-blocks'
					) }
				</p>
				{ EDGES.map( ( [ attr, label ] ) => (
					<ResponsiveOverride
						key={ attr }
						label={ label }
						value={ attributes[ attr ] }
						onChange={ ( obj ) =>
							setAttributes( { [ attr ]: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								presets={ false }
								negative
								label={ label }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue || '' : ''
								}
								onChange={ ( v ) => setOwnValue( v || '' ) }
								units={ EDGE_UNITS }
							/>
						) }
					</ResponsiveOverride>
				) ) }
			</PanelBody>
		</InspectorControls>
	);
}
