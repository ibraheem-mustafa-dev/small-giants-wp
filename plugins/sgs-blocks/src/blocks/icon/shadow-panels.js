/**
 * The shadow and brand-hover controls shared by the sgs/icon inspector and the sgs/social-icons row inspector. The two
 * blocks store the same controls under different attribute names, so one component serves both; the row's values are
 * group defaults every icon follows.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import { ShadowControl, shadowAttrKeys } from '../../components';

/** The attribute that holds an icon's shadow-lift switch. */
export const ICON_SHADOW_NAMES = { lift: 'shadowLiftOnHover' };

/** The attribute that holds a social-icons row's shadow-lift switch. */
export const ROW_SHADOW_NAMES = { lift: 'childIconShadowLiftOnHover' };

/** The shadow attribute families, by literal base name. */
export const ICON_SHADOW_KEYS = shadowAttrKeys( 'boxShadow', { hover: true, hoverColour: true } );
export const ROW_SHADOW_KEYS = shadowAttrKeys( 'childIconBoxShadow', { hover: true, hoverColour: true } );

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

/**
 * The Shadow panel: one tabbed Normal / Hover mount of the shared ShadowControl.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Stored attributes.
 * @param {Function} props.setAttributes Setter.
 * @param {Object}   props.names         ICON_SHADOW_NAMES or ROW_SHADOW_NAMES.
 * @param {Object}   props.shadowKeys    ICON_SHADOW_KEYS or ROW_SHADOW_KEYS.
 * @param {string}   props.help          Optional line under the panel title.
 * @return {JSX.Element} The panel.
 */
export function IconShadowPanel( { attributes, setAttributes, names, shadowKeys, help } ) {
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
				attrNames={ shadowKeys }
			/>
		</PanelBody>
	);
}
