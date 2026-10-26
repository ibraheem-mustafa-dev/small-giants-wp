/**
 * Number style and text shadow rows for TypographyControls (opt-in: `showNumberStyle`, `showTextShadow`).
 *
 * SGS-ONLY: core has no `font-variant-numeric` or `text-shadow` typography support. The block must DECLARE
 * `{prefix}FontVariantNumeric`, `{prefix}TextShadow`, `{prefix}TextShadowColour` and `{prefix}TextShadowColourHover` first, or WordPress discards what
 * these write (the silent-discard class). Server side, `sgs_typography_css_rule()` prints both; the canvas twin is
 * `typographyPreviewStyle()`.
 *
 * The shadow is stored as layers of three lengths (`X Y BLUR`, px) with its colour in the sibling attribute, the
 * same shape-plus-colour split the box shadow uses. The colour row itself sits in TypographyControls beside the outline
 * colour (Normal and Hover, no gradient: CSS `text-shadow` takes a colour only), so the shared-row scan resolves its
 * paint through the mounting block's own prefix. The row edits the FIRST layer's lengths and keeps all else a
 * value written elsewhere holds: later layers, an inline colour on the first layer. A first layer in em or rem is
 * not shown as px, so the row says so and leaves it alone.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { Flex, FlexItem, Notice, SelectControl } from '@wordpress/components';
import { NumberControl } from './primitives';

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
const ANY_LENGTH = /^-?\d*\.?\d+[a-z%]*$/i;

/**
 * Split on a separator that sits outside every bracket, so `rgba(0, 0, 0, .5)` stays one piece.
 *
 * @param {string} text      Text to split.
 * @param {RegExp} separator Single-character separator test (`,` or whitespace).
 * @return {string[]} Non-empty trimmed pieces.
 */
function splitOutsideBrackets( text, separator ) {
	const pieces = [];
	let depth = 0;
	let current = '';
	for ( const ch of text ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth = Math.max( 0, depth - 1 );
		}
		if ( 0 === depth && separator.test( ch ) ) {
			pieces.push( current );
			current = '';
		} else {
			current += ch;
		}
	}
	pieces.push( current );
	return pieces.map( ( piece ) => piece.trim() ).filter( Boolean );
}

/**
 * Whether the first layer's lengths are in px (or unitless), the only units the row can show.
 *
 * @param {string} shape Stored shape.
 * @return {boolean} False when a length carries em, rem, %, or another unit.
 */
export function textShadowIsEditable( shape ) {
	const first = 'string' === typeof shape ? splitOutsideBrackets( shape, /,/ )[ 0 ] || '' : '';
	return splitOutsideBrackets( first, /\s/ )
		.filter( ( token ) => ANY_LENGTH.test( token ) )
		.every( ( token ) => LENGTH.test( token ) );
}

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
 * Write new first-layer lengths into a stored shape, keeping every later layer and any inline colour on the first.
 *
 * Zeroing the first layer while later layers exist keeps it as `0px 0px 0px`, so each layer's colour stays aligned
 * with its layer; zeroing a lone layer clears the shadow.
 *
 * @param {string}                          shape   Stored shape (may be empty or `none`).
 * @param {{x:number,y:number,blur:number}} lengths New first-layer lengths in px.
 * @return {string} The new stored shape.
 */
export function editTextShadowShape( shape, lengths ) {
	const text = 'string' === typeof shape && 'none' !== shape.trim().toLowerCase() ? shape : '';
	const [ first = '', ...rest ] = splitOutsideBrackets( text, /,/ );
	const extras = splitOutsideBrackets( first, /\s/ ).filter( ( token ) => ! ANY_LENGTH.test( token ) );
	const lead = composeTextShadowShape( lengths );
	if ( '' === lead && 0 === rest.length && 0 === extras.length ) {
		return '';
	}
	const layer = [ lead || '0px 0px 0px', ...extras ].join( ' ' );
	return [ layer, ...rest ].join( ', ' );
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
 * Text shadow lengths: horizontal and vertical offset and blur.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {Object}   props.keys          `typographyAttrKeys( prefix )`.
 * @return {JSX.Element} The row.
 */
export function TextShadowRow( { attributes, setAttributes, keys } ) {
	if ( ! textShadowIsEditable( attributes[ keys.textShadow ] ) ) {
		return (
			<Notice status="info" isDismissible={ false }>
				{ __( 'This text shadow uses em, rem or percentage lengths, which this row cannot show. It is left as written.', 'sgs-blocks' ) }
			</Notice>
		);
	}
	const lengths = parseTextShadowShape( attributes[ keys.textShadow ] );
	const write = ( part, raw ) => {
		const parsed = parseFloat( raw );
		const next = { ...lengths, [ part ]: isNaN( parsed ) ? 0 : parsed };
		if ( 'blur' === part ) {
			next.blur = Math.max( 0, next.blur );
		}
		setAttributes( { [ keys.textShadow ]: editTextShadowShape( attributes[ keys.textShadow ], next ) } );
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
		<Flex gap={ 2 } align="flex-start">
			{ field( 'x', __( 'Shadow X (px)', 'sgs-blocks' ), -100 ) }
			{ field( 'y', __( 'Shadow Y (px)', 'sgs-blocks' ), -100 ) }
			{ field( 'blur', __( 'Blur (px)', 'sgs-blocks' ), 0 ) }
		</Flex>
	);
}
