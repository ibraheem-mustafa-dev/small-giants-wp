/**
 * Number style and text shadow rows for TypographyControls (opt-in: `showNumberStyle`, `showTextShadow`).
 *
 * SGS-ONLY: core has no `font-variant-numeric` or `text-shadow` typography support. The block must DECLARE
 * `{prefix}FontVariantNumeric`, `{prefix}TextShadow` and `{prefix}TextShadowColour` first, or WordPress discards what
 * these write (the silent-discard class). Server side, `sgs_typography_css_rule()` prints both; the canvas twin is
 * `typographyPreviewStyle()`.
 *
 * The shadow is stored as ONE layer of three lengths (`X Y BLUR`, px) with its colour in the sibling attribute, the
 * same shape-plus-colour split the box shadow uses. A longer value written elsewhere (several layers, an inline
 * colour) prints as written; the row edits the first layer.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { Flex, FlexItem, SelectControl } from '@wordpress/components';
import { VStack, NumberControl } from './primitives';
import DesignTokenPicker from './DesignTokenPicker';

const DEFAULT_LABEL = __( 'Default', 'sgs-blocks' );

/** Mirrors `sgs_font_variant_numeric_value()`'s allowlist. */
export const NUMBER_STYLE_OPTIONS = [
	{ label: DEFAULT_LABEL, value: '' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Tabular (equal-width digits)', 'sgs-blocks' ), value: 'tabular-nums' },
	{ label: __( 'Proportional', 'sgs-blocks' ), value: 'proportional-nums' },
	{ label: __( 'Lining (capital-height digits)', 'sgs-blocks' ), value: 'lining-nums' },
	{ label: __( 'Old-style (varying-height digits)', 'sgs-blocks' ), value: 'oldstyle-nums' },
];

const LENGTH = /^(-?\d*\.?\d+)(?:px)?$/i;

/**
 * Read the first layer of a stored shadow shape as X, Y and blur.
 *
 * @param {string} shape Stored shape, e.g. `0px 4px 12px`.
 * @return {{x:number,y:number,blur:number}} Lengths in px; all zero when unset or unparseable.
 */
export function parseTextShadowShape( shape ) {
	const first = 'string' === typeof shape ? shape.split( ',' )[ 0 ].trim().split( /\s+/ ) : [];
	const nums = first.filter( ( t ) => LENGTH.test( t ) ).map( ( t ) => parseFloat( t ) );
	if ( nums.length < 2 ) {
		return { x: 0, y: 0, blur: 0 };
	}
	return { x: nums[ 0 ], y: nums[ 1 ], blur: nums[ 2 ] ?? 0 };
}

/**
 * Write X, Y and blur as one stored layer.
 *
 * @param {{x:number,y:number,blur:number}} lengths Lengths in px.
 * @return {string} `Xpx Ypx Bpx`, or an empty string when every length is zero (no shadow).
 */
export function composeTextShadowShape( { x, y, blur } ) {
	if ( ! x && ! y && ! blur ) {
		return '';
	}
	return `${ x }px ${ y }px ${ blur }px`;
}

/**
 * Number style dropdown.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {Object}   props.keys          `typographyAttrKeys( prefix )`.
 * @return {JSX.Element} The row.
 */
export function NumberStyleRow( { attributes, setAttributes, keys } ) {
	return (
		<SelectControl
			label={ __( 'Number style', 'sgs-blocks' ) }
			help={ __( 'Tabular digits keep a changing or numbered label the same width.', 'sgs-blocks' ) }
			value={ attributes[ keys.fontVariantNumeric ] || '' }
			options={ NUMBER_STYLE_OPTIONS }
			onChange={ ( val ) => setAttributes( { [ keys.fontVariantNumeric ]: val } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}

/**
 * Text shadow: horizontal and vertical offset, blur and colour.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {Object}   props.keys          `typographyAttrKeys( prefix )`.
 * @return {JSX.Element} The row.
 */
export function TextShadowRow( { attributes, setAttributes, keys } ) {
	const lengths = parseTextShadowShape( attributes[ keys.textShadow ] );
	const write = ( part, raw ) => {
		const parsed = parseFloat( raw );
		const next = { ...lengths, [ part ]: isNaN( parsed ) ? 0 : parsed };
		if ( 'blur' === part ) {
			next.blur = Math.max( 0, next.blur );
		}
		setAttributes( { [ keys.textShadow ]: composeTextShadowShape( next ) } );
	};
	const field = ( part, label, min ) => (
		<FlexItem isBlock>
			<NumberControl
				label={ label }
				min={ min }
				max={ 100 }
				step={ 1 }
				spinControls="custom"
				value={ lengths[ part ] }
				onChange={ ( val ) => write( part, val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</FlexItem>
	);
	return (
		<VStack spacing={ 3 }>
			<Flex gap={ 2 } align="flex-start">
				{ field( 'x', __( 'Shadow X (px)', 'sgs-blocks' ), -100 ) }
				{ field( 'y', __( 'Shadow Y (px)', 'sgs-blocks' ), -100 ) }
				{ field( 'blur', __( 'Blur (px)', 'sgs-blocks' ), 0 ) }
			</Flex>
			<DesignTokenPicker
				label={ __( 'Text shadow colour', 'sgs-blocks' ) }
				help={ __( 'Leave empty to draw the shadow in the text colour. Set all three lengths to 0 for no shadow.', 'sgs-blocks' ) }
				states={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: attributes[ keys.textShadowColour ] || '',
						onChange: ( next ) => setAttributes( { [ keys.textShadowColour ]: next ?? '' } ),
						linked: true,
					},
				] }
			/>
		</VStack>
	);
}
