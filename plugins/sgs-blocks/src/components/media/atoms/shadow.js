/**
 * `shadow` atom — L2b control + disclosure + validator + value-setter.
 *
 * Was hand-rolled directly in `sgs/media`'s `edit.js` (a `ShadowControl`
 * mount inside that block's own "Media Styling" `ToolsPanel`, wired to
 * `boxShadow`/`boxShadowColour`/`boxShadowColourHover`) and `render.php`
 * (its own `sgs_shadow_value_composed()` calls building `box-shadow` +
 * `:hover,:focus-within` rules directly on `$id_sel`). This atom is that
 * control promoted to the shared layer, mounting the SAME `ShadowControl`
 * component `box-shape`'s own border-colour rows already share the
 * codebase's colour-architecture with (D621/D622) — two custom properties,
 * `--sgs-media-box-shadow` (resting) and `--sgs-media-box-shadow-hover`,
 * applied on `.sgs-media-el` (Wave 5c, 2026-09-01).
 *
 * `resolveShadow()`/`isRawShape()` are this atom's OWN mirrored copy of the
 * shape-resolution rule `sgs_shadow_value_composed()` (helpers-tokens.php)
 * already implements — mirrored rather than imported/shared, matching
 * `box-shape.js`'s own documented reasoning ("every atom mirrors its own
 * copy rather than sharing"), and NOT the same as `utils/tokens.js`'s
 * `resolveShadowPreviewComposed()` (a general editor-preview helper with a
 * slightly looser raw-shape test) — this atom needs its OWN twin to hold
 * byte-parity with its OWN PHP half, not with a third function neither half
 * calls.
 *
 * `css()` mirrors `includes/media/atoms/shadow.php`'s
 * `sgs_media_atom_shadow_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components`. The JSX control lives in
 * `shadow.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import { colourVar } from '../../../utils/tokens.js';

/** A raw shape starts with an (optional) "inset" and a length. */
const RAW_SHAPE_PATTERN = /^(inset\s+)?-?[\d.]+px/i;

/**
 * @param {string} prefix    Surface prefix.
 * @param {string} blockSlug Block slug, for STORED_AS resolution.
 * @return {{base: string, colour: string, hoverColour: string}} Stored attribute names.
 */
export function attrKeys( prefix, blockSlug ) {
	return {
		base: mediaStoredAttrName( blockSlug, prefix, 'BoxShadow' ),
		colour: mediaStoredAttrName( blockSlug, prefix, 'BoxShadowColour' ),
		hoverColour: mediaStoredAttrName( blockSlug, prefix, 'BoxShadowColourHover' ),
	};
}

/**
 * Is this shape string a raw CSS shadow (built by `ShadowControl`), rather
 * than a bare theme preset slug that is self-contained (colour already baked
 * in by `theme.json`)? Mirrors `sgs_media_atom_shadow_is_raw_shape()`
 * exactly.
 *
 * @param {*} shape Raw candidate.
 * @return {boolean} True when `shape` is a raw CSS shadow shape.
 */
export function isRawShape( shape ) {
	if ( 'string' !== typeof shape ) {
		return false;
	}
	return RAW_SHAPE_PATTERN.test( shape ) || 0 === shape.indexOf( 'inset' );
}

/**
 * Compose a shadow SHAPE with a separate colour attribute into the final CSS
 * `box-shadow` value. Mirrors `sgs_media_atom_shadow_resolve()` exactly.
 *
 * @param {*} shape  Raw shape string, or a bare preset slug.
 * @param {*} colour Colour value — ignored when `shape` resolves to a preset slug.
 * @return {string} CSS `box-shadow` value, or '' when `shape` is empty.
 */
export function resolveShadow( shape, colour ) {
	if ( 'string' !== typeof shape || ! shape ) {
		return '';
	}
	const trimmed = shape.trim();
	if ( ! isRawShape( trimmed ) ) {
		return `var(--wp--preset--shadow--${ trimmed })`;
	}
	const resolvedColour = colourVar( 'string' === typeof colour ? colour : '' ) || 'rgba(0,0,0,0.1)';
	return `${ trimmed } ${ resolvedColour }`;
}

/**
 * The hover colour row only means anything once a shape is set.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {{state: string, hiddenReason: (string|null)}}
 */
export function disclosure( { attributes = {}, prefix = '', blockSlug = '' } = {} ) {
	const keys = attrKeys( prefix, blockSlug );
	if ( ! attributes[ keys.base ] ) {
		return {
			state: 'disabled',
			hiddenReason: __( 'The hover colour only applies once a shadow is set.', 'sgs-blocks' ),
		};
	}
	return { state: 'shown', hiddenReason: null };
}

/**
 * Reject-to-default for a shape string — `ShadowControl` owns the actual
 * builder UI, so this is a defensive pass-through, mirroring the same
 * contract shape every other atom's `validate()` carries.
 *
 * @param {*} value Raw candidate.
 * @return {string} `value` if it is a string, otherwise `''`.
 */
export function validate( value ) {
	return 'string' === typeof value ? value : '';
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/shadow.php`'s `sgs_media_atom_shadow_css()` exactly.
 *
 * @param {Object} props
 * @param {Object} props.attributes
 * @param {string} [props.prefix]
 * @param {string} [props.blockSlug]
 * @return {string[]} `--custom-property:value;` declarations, never bare rules.
 */
export function css( { attributes, prefix = '', blockSlug = '' } ) {
	const decls = [];
	const keys = attrKeys( prefix, blockSlug );
	const shape = attributes[ keys.base ];
	if ( ! shape ) {
		return decls;
	}

	const resting = resolveShadow( shape, attributes[ keys.colour ] );
	if ( resting ) {
		decls.push( `--sgs-media-box-shadow:${ resting }` );
	}

	const hoverColour = attributes[ keys.hoverColour ];
	if ( hoverColour ) {
		const hover = resolveShadow( shape, hoverColour );
		if ( hover ) {
			decls.push( `--sgs-media-box-shadow-hover:${ hover }` );
		}
	}

	return decls;
}
