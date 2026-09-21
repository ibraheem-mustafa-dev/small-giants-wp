/**
 * The expanded fields of one shadow layer: X, Y, blur, spread, inner shadow, colour and
 * opacity. A layer the model cannot split into fields (`raw`) is shown as written, never reset;
 * it is edited in the Raw CSS tab.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';
import { UnitControl } from '../primitives';
import ColourOpacity from './ColourOpacity';

const PX = [ { value: 'px', label: 'px' } ];

/**
 * @param {Object}   props
 * @param {Object}   props.layer    Model layer.
 * @param {Function} props.onChange Receives a patch of layer fields.
 */
export default function LayerEditor( { layer, onChange } ) {
	if ( layer.raw ) {
		return (
			<div className="sgs-shadow-control__layer-fields">
				<code>{ layer.raw }</code>
				<p className="sgs-shadow-control__note">
					{ layer.valid
						? __( 'This layer uses a colour the fields cannot show. It is kept exactly as written. Edit it in the Raw CSS tab.', 'sgs-blocks' )
						: __( 'This layer will not display because it is not a valid shadow. Fix it in the Raw CSS tab, or delete it.', 'sgs-blocks' ) }
				</p>
			</div>
		);
	}
	const length = ( key, label, min ) => (
		<UnitControl
			label={ label }
			value={ `${ layer[ key ] }px` }
			onChange={ ( v ) => {
				const n = parseFloat( v );
				onChange( { [ key ]: Number.isFinite( n ) ? Math.max( min, Math.min( key === 'blur' ? 100 : 200, n ) ) : 0 } );
			} }
			units={ PX }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
	return (
		<div className="sgs-shadow-control__layer-fields">
			<div className="sgs-shadow-control__pair">
				{ length( 'x', __( 'Across (X)', 'sgs-blocks' ), -200 ) }
				{ length( 'y', __( 'Down (Y)', 'sgs-blocks' ), -200 ) }
			</div>
			<div className="sgs-shadow-control__pair">
				{ length( 'blur', __( 'Blur', 'sgs-blocks' ), 0 ) }
				{ length( 'spread', __( 'Spread', 'sgs-blocks' ), -200 ) }
			</div>
			<ColourOpacity colour={ layer.colour } alpha={ layer.alpha } onChange={ onChange } />
			<ToggleControl
				label={ __( 'Inner shadow', 'sgs-blocks' ) }
				checked={ layer.inset }
				onChange={ ( v ) => onChange( { inset: v } ) }
				__nextHasNoMarginBottom
			/>
		</div>
	);
}
