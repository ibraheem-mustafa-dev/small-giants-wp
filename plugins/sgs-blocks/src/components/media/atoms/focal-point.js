/**
 * `focal-point` atom — LOGIC half (L2b value-setter + validator + disclosure).
 *
 * Split from the JSX control per the purity contract
 * (scripts/check-media-atom-purity.js): this module must be importable by
 * plain Node. `@wordpress/i18n` IS installed (measured, not assumed) and is
 * used here for `hiddenReason` — a client-facing string — which is correct
 * in a logic module; only `@wordpress/components` (a webpack EXTERNAL) and
 * JSX move to `focal-point.control.js`.
 *
 * Element scope: `object-position` (the `ObjectPosition` base) — a crop focus
 * for a replaced element (`<img>`/`<video>`). Backdrop scope: `background-
 * position` / `background-repeat` / `background-attachment` (the `Position` /
 * `Repeat` / `Attachment` bases) for a painted background box.
 *
 * TWO STORED SHAPES for the element-scope value, both real (registry.js
 * `reads`):
 *   - a CSS string, e.g. "center 20%" (`sgs/hero`'s `splitMediaObjectPosition`,
 *     and the atom's own canonical shape)
 *   - `{x,y}` floats 0-1 — the native `FocalPointPicker` shape, stored
 *     verbatim as `sgsObjectPosition` by the universal `image-controls`
 *     extension
 * `resolvePosition()` below accepts either, and produces the SAME "X% Y%"
 * string `sgs_media_position_focal_to_css()` (helpers-media-position.php)
 * already produces for the `{x,y}` shape — same clamp, same rounding, same
 * "centre is the default, so emit nothing" rule — so a value set through this
 * atom and one inherited from the universal extension never disagree.
 * `resolvePosition()` stays here (not in the control half) because the
 * parity test imports it directly.
 *
 * `requires`: a focal point only means anything once the ELEMENT is actually
 * being cropped (registry.js: `ObjectPosition: ['ObjectFit:cover|contain|
 * none|scale-down']`). Backdrop position/repeat/attachment are NOT gated the
 * same way — a background image's position/repeat/tiling is meaningful even
 * at `background-size:auto`, unlike a replaced element's crop focus, which
 * does nothing once nothing is being cropped.
 *
 * `css()` mirrors `includes/media/atoms/focal-point.php`'s
 * `sgs_media_atom_focal_point_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { MEDIA_ATOMS } from './registry.js';

const ATOM_ID = 'focal-point';

/** Repeat/attachment are small closed enums, unlike free-form position. */
const REPEAT_VALUES = [ 'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round' ];
const ATTACHMENT_VALUES = [ 'scroll', 'fixed', 'local' ];

/** Same charset `sgs_css_object_position` (hero/render.php) already sanitises with. */
const POSITION_CHARSET = /[^A-Za-z0-9%.\-\s]/g;

/**
 * Sanitise an already-CSS-shaped position string — strip anything that could
 * break out of a declaration, matching the grammar `object-position`/
 * `background-position` allow (keywords, percentages, lengths).
 *
 * @param {*} value Raw candidate.
 * @return {string} Sanitised string, or '' when not a string.
 */
function sanitisePositionString( value ) {
	if ( 'string' !== typeof value ) {
		return '';
	}
	return value.replace( POSITION_CHARSET, '' ).trim();
}

/**
 * Resolve a position value in EITHER stored shape to a CSS `object-position`/
 * `background-position` string. `{x,y}` floats convert with the identical
 * clamp/round/centre-default-is-empty contract as
 * `sgs_media_position_focal_to_css()`; a string is sanitised and passed
 * through unchanged.
 *
 * @param {*} raw Raw attribute value.
 * @return {string} "X% Y%" (or a keyword string), or '' when unset/default.
 */
export function resolvePosition( raw ) {
	if (
		raw &&
		'object' === typeof raw &&
		'number' === typeof raw.x &&
		'number' === typeof raw.y
	) {
		const x = Math.max( 0, Math.min( 1, raw.x ) );
		const y = Math.max( 0, Math.min( 1, raw.y ) );
		if ( 0.5 === x && 0.5 === y ) {
			return '';
		}
		return `${ Math.round( x * 100 * 100 ) / 100 }% ${ Math.round( y * 100 * 100 ) / 100 }%`;
	}
	return sanitisePositionString( raw );
}

/**
 * Reject an out-of-vocabulary value to `''` (inherit).
 *
 * @param {*}      value Raw candidate.
 * @param {string} base  'ObjectPosition' | 'Position' | 'Repeat' | 'Attachment'.
 * @return {string} A validated value, or ''.
 */
export function validate( value, base = 'ObjectPosition' ) {
	if ( 'Repeat' === base ) {
		return 'string' === typeof value && REPEAT_VALUES.includes( value ) ? value : '';
	}
	if ( 'Attachment' === base ) {
		return 'string' === typeof value && ATTACHMENT_VALUES.includes( value ) ? value : '';
	}
	// ObjectPosition + Position share the same free-form position grammar.
	return resolvePosition( value );
}

/**
 * A focal point only means anything once the media is actually being
 * cropped. Reads the ELEMENT scope's `ObjectFit` value against the exact
 * condition declared in registry.js's `requires.ObjectPosition`.
 *
 * @param {Object} props
 * @param {Object} props.attributes  Block attributes.
 * @param {string} [props.prefix]    Surface prefix.
 * @param {string} [props.blockSlug] Block slug, for `STORED_AS` resolution.
 * @param {string} [props.scope]     'element' | 'backdrop'. Only 'element' is
 *                                   gated — see the module docblock.
 * @return {{state: string, hiddenReason: (string|null)}}
 */
export function disclosure( { attributes = {}, prefix = '', blockSlug = '', scope = 'element' } = {} ) {
	if ( 'element' !== scope ) {
		return { state: 'shown', hiddenReason: null };
	}

	const condition = MEDIA_ATOMS[ ATOM_ID ].requires.ObjectPosition[ 0 ]; // 'ObjectFit:cover|contain|none|scale-down'
	const [ , allowedList ] = condition.split( ':' );
	const allowed = allowedList.split( '|' );

	const fitKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectFit' );
	const fitValue = attributes[ fitKey ];

	if ( allowed.includes( fitValue ) ) {
		return { state: 'shown', hiddenReason: null };
	}

	return {
		state: 'disabled',
		hiddenReason: __(
			'A focal point only matters when Object fit crops the media (Cover, Contain, None or Scale down).',
			'sgs-blocks'
		),
	};
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/focal-point.php`'s `sgs_media_atom_focal_point_css()`
 * exactly.
 *
 * @param {Object} props
 * @param {Object} props.attributes  Block attributes.
 * @param {string} [props.prefix]    Surface prefix.
 * @param {string} [props.blockSlug] Block slug, for `STORED_AS` resolution.
 * @return {string[]} `--custom-property:value;` declarations, never bare rules.
 */
export function css( { attributes, prefix = '', blockSlug = '' } ) {
	const decls = [];

	// Element scope, tiered (MEDIA_TIERED_BASES carries `ObjectPosition`).
	const posKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectPosition' );
	const pos = validate( attributes[ posKey ], 'ObjectPosition' );
	if ( pos ) {
		decls.push( `--sgs-media-object-position:${ pos }` );
	}
	const posTabletKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectPositionTablet' );
	const posTablet = validate( attributes[ posTabletKey ], 'ObjectPosition' );
	if ( posTablet ) {
		decls.push( `--sgs-media-object-position-tablet:${ posTablet }` );
	}
	const posMobileKey = mediaStoredAttrName( blockSlug, prefix, 'ObjectPositionMobile' );
	const posMobile = validate( attributes[ posMobileKey ], 'ObjectPosition' );
	if ( posMobile ) {
		decls.push( `--sgs-media-object-position-mobile:${ posMobile }` );
	}

	// Backdrop scope. None of these three bases are in MEDIA_TIERED_BASES.
	const bgPosKey = mediaStoredAttrName( blockSlug, prefix, 'Position' );
	const bgPos = validate( attributes[ bgPosKey ], 'Position' );
	if ( bgPos ) {
		decls.push( `--sgs-media-background-position:${ bgPos }` );
	}
	const bgRepeatKey = mediaStoredAttrName( blockSlug, prefix, 'Repeat' );
	const bgRepeat = validate( attributes[ bgRepeatKey ], 'Repeat' );
	if ( bgRepeat ) {
		decls.push( `--sgs-media-background-repeat:${ bgRepeat }` );
	}
	const bgAttachmentKey = mediaStoredAttrName( blockSlug, prefix, 'Attachment' );
	const bgAttachment = validate( attributes[ bgAttachmentKey ], 'Attachment' );
	if ( bgAttachment ) {
		decls.push( `--sgs-media-background-attachment:${ bgAttachment }` );
	}

	return decls;
}
