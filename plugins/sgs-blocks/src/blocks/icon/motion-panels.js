/**
 * The hover-move, motion and shadow controls shared by the sgs/icon inspector and the sgs/social-icons row inspector.
 * The two blocks store the same controls under different attribute names (icon-motion.js::ICON_MOTION_NAMES and
 * ROW_MOTION_NAMES), so one component serves both; the row's values are group defaults every icon follows.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { ShadowControl, shadowAttrKeys } from '../../components';
import MotionEasingControl from '../../components/MotionEasingControl';

const BRAND_HOVER_OPTIONS = [
	{ label: __( 'Swap: the ground and the logo trade colours', 'sgs-blocks' ), value: 'swap' },
	{ label: __( 'Hold: keep the brand ground and logo colour', 'sgs-blocks' ), value: 'hold' },
];

/**
 * Brand colours on hover. An icon adds an Inherit choice that follows its row.
 *
 * @param {Object}   props
 * @param {string}   props.value    Stored value.
 * @param {Function} props.onChange Receives the next value.
 * @param {boolean}  props.inherit  Offer "Same as the row" (an icon).
 * @return {JSX.Element} The select.
 */
export function BrandHoverControl( { value, onChange, inherit = false } ) {
	const options = inherit
		? [ { label: __( 'Same as the row (swap outside a row)', 'sgs-blocks' ), value: 'inherit' }, ...BRAND_HOVER_OPTIONS ]
		: BRAND_HOVER_OPTIONS;
	return (
		<SelectControl
			label={ __( 'Brand colours on hover', 'sgs-blocks' ) }
			help={ __( 'Only for Brand colours. Hold keeps the brand ground and the logo colour as they are when the pointer arrives.', 'sgs-blocks' ) }
			value={ value || ( inherit ? 'inherit' : 'swap' ) }
			options={ options }
			onChange={ onChange }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}

const field = ( { label, help, value, onChange, min, max, step = 1 } ) => (
	<RangeControl
		label={ label }
		help={ help }
		value={ value ?? 0 }
		onChange={ ( next ) => onChange( next ?? 0 ) }
		min={ min }
		max={ max }
		step={ step }
		allowReset
		resetFallbackValue={ 0 }
		__nextHasNoMarginBottom
		__next40pxDefaultSize
	/>
);

/**
 * The hover move, turn and motion fields. The growth field stays where each block already has it.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Stored attributes.
 * @param {Function} props.setAttributes Setter.
 * @param {Object}   props.names         ICON_MOTION_NAMES or ROW_MOTION_NAMES.
 * @return {JSX.Element} The fields.
 */
export function HoverMotionFields( { attributes, setAttributes, names } ) {
	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	return (
		<>
			{ field( {
				label: __( 'Move sideways on hover (px)', 'sgs-blocks' ),
				help: __( 'Negative moves left. Moves with the growth and the turn, in one movement.', 'sgs-blocks' ),
				value: attributes[ names.x ],
				onChange: set( names.x ),
				min: -40,
				max: 40,
			} ) }
			{ field( {
				label: __( 'Move up or down on hover (px)', 'sgs-blocks' ),
				help: __( 'Negative moves up.', 'sgs-blocks' ),
				value: attributes[ names.y ],
				onChange: set( names.y ),
				min: -40,
				max: 40,
			} ) }
			{ field( {
				label: __( 'Turn on hover (degrees)', 'sgs-blocks' ),
				help: __( 'Negative turns anticlockwise. Added to the icon rotation.', 'sgs-blocks' ),
				value: attributes[ names.rotate ],
				onChange: set( names.rotate ),
				min: -180,
				max: 180,
			} ) }
			{ field( {
				label: __( 'Move and growth duration (ms)', 'sgs-blocks' ),
				help: __( '0 uses the theme fast transition.', 'sgs-blocks' ),
				value: attributes[ names.moveMs ],
				onChange: set( names.moveMs ),
				min: 0,
				max: 1500,
				step: 10,
			} ) }
			<MotionEasingControl
				label={ __( 'Move and growth easing', 'sgs-blocks' ) }
				value={ attributes[ names.easing ] || 'ease' }
				custom={ attributes[ names.easingCustom ] }
				onChange={ ( value ) => setAttributes( { [ names.easing ]: 'ease' === value ? '' : value } ) }
				onCustomChange={ set( names.easingCustom ) }
			/>
			{ field( {
				label: __( 'Shadow and colour duration (ms)', 'sgs-blocks' ),
				help: __( '0 uses the theme fast transition.', 'sgs-blocks' ),
				value: attributes[ names.paintMs ],
				onChange: set( names.paintMs ),
				min: 0,
				max: 1500,
				step: 10,
			} ) }
		</>
	);
}

/**
 * The Shadow panel: one tabbed Normal / Hover mount of the shared ShadowControl.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Stored attributes.
 * @param {Function} props.setAttributes Setter.
 * @param {Object}   props.names         ICON_MOTION_NAMES or ROW_MOTION_NAMES.
 * @param {string}   props.help          Optional line under the panel title.
 * @return {JSX.Element} The panel.
 */
export function IconShadowPanel( { attributes, setAttributes, names, help } ) {
	// The shared control reads and writes the lift switch as `shadowLiftOnHover`; a row stores it under its own name.
	const view = { ...attributes, shadowLiftOnHover: attributes[ names.lift ] };
	const write = ( next ) => {
		const { shadowLiftOnHover, ...rest } = next;
		setAttributes( 'shadowLiftOnHover' in next ? { ...rest, [ names.lift ]: shadowLiftOnHover } : rest );
	};
	return (
		<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
			{ help && <p className="components-base-control__help">{ help }</p> }
			<ShadowControl
				label={ __( 'Shadow', 'sgs-blocks' ) }
				attributes={ view }
				setAttributes={ write }
				attrNames={ shadowAttrKeys( names.shadow, { hover: true, hoverColour: true } ) }
			/>
		</PanelBody>
	);
}
