/**
 * `media-padding` atom — L2b control + disclosure + validator + value-setter.
 *
 * BRAND NEW capability — `sgs/media` never had a padding control at all
 * (measured live 2026-09-01: no `padding`/`paddingTablet`/`paddingMobile`
 * attribute existed anywhere in `block.json`, `edit.js` or `render.php`).
 * The design doc's provisional Layer 1 list names `media-padding` alongside
 * `media-border`/`media-radius` as siblings of `box-shape` — but
 * `box-shape` already owns the media element's border+radius outright
 * (BorderWidth/BorderStyle/BorderColour/BorderRadius, Wave 5a/5b). Padding
 * is the one BOX-family property `box-shape` never covered, so this atom is
 * scoped to padding alone rather than reintroducing border/radius as a
 * second writer on the same node — see `box-shape.js`'s own collision-risk
 * note.
 *
 * FOUR SIDES, TIERED — the same shape `ResponsiveBoxControl`
 * (`src/components/ResponsiveBoxControl.js`) already gives padding/margin/
 * border-width on `accordion`/`audio`/`brand-strip`/`breadcrumbs`. Each
 * side's value is a CSS length STRING with the unit embedded inline (that
 * component's own contract, "no separate `{attr}Unit` companion attribute
 * is needed") — this atom reads/writes exactly that shape, never a
 * unit-less number needing a sibling unit attr.
 *
 * `css()` mirrors `includes/media/atoms/media-padding.php`'s
 * `sgs_media_atom_media_padding_css()` byte-for-byte — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * LOGIC HALF ONLY. Split from the JSX control per the purity contract
 * (`scripts/check-media-atom-purity.js`): this module must be importable by
 * plain Node — no JSX, no `@wordpress/components`. The JSX control lives in
 * `media-padding.control.js` and imports from here.
 *
 * @package SGS\Blocks
 */
import { mediaStoredAttrName } from '../../MediaElementControls.js';

/**
 * @param {string} prefix    Surface prefix.
 * @param {string} blockSlug Block slug, for STORED_AS resolution.
 * @return {{base: string, tablet: string, mobile: string}} Stored attribute names.
 */
export function attrKeys( prefix, blockSlug ) {
	return {
		base: mediaStoredAttrName( blockSlug, prefix, 'Padding' ),
		tablet: mediaStoredAttrName( blockSlug, prefix, 'PaddingTablet' ),
		mobile: mediaStoredAttrName( blockSlug, prefix, 'PaddingMobile' ),
	};
}

/**
 * Convert a 4-SIDE box object into the CSS `padding` shorthand VALUE string
 * ("top right bottom left"). Each side already carries its own unit
 * (`ResponsiveBoxControl`'s own shape — see module docblock), so — unlike
 * `box-shape.js`'s `sidesToWidthShorthand()` — this never appends a `px`
 * fallback to a bare number. An unset side defaults to `0`; an
 * entirely-empty object returns '' so the caller skips the declaration
 * outright, matching "nothing for an empty attribute set".
 *
 * @param {*} sides Raw `Padding`-shaped value.
 * @return {string} `"T R B L"`, or '' when nothing is set.
 */
export function sidesToShorthand( sides ) {
	if ( ! sides || 'object' !== typeof sides ) {
		return '';
	}
	const order = [ 'top', 'right', 'bottom', 'left' ];
	const hasAny = order.some(
		( k ) => undefined !== sides[ k ] && null !== sides[ k ] && '' !== sides[ k ]
	);
	if ( ! hasAny ) {
		return '';
	}
	return order
		.map( ( k ) =>
			undefined !== sides[ k ] && null !== sides[ k ] && '' !== sides[ k ] ? sides[ k ] : '0'
		)
		.join( ' ' );
}

/** Unconditional — nothing gates padding off. */
export function disclosure() {
	return { state: 'shown', hiddenReason: null };
}

/**
 * Reject-to-default for a box value — required by the atom contract
 * (`scripts/check-media-atom-purity.js`).
 *
 * @param {*} value Raw candidate.
 * @return {Object} `value` when it resolves to a real shorthand, otherwise `{}`.
 */
export function validate( value ) {
	return sidesToShorthand( value ) ? value : {};
}

/**
 * Custom-property declarations for this atom. Mirrors
 * `includes/media/atoms/media-padding.php`'s
 * `sgs_media_atom_media_padding_css()` exactly.
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

	[
		[ keys.base, '' ],
		[ keys.tablet, '-tablet' ],
		[ keys.mobile, '-mobile' ],
	].forEach( ( pair ) => {
		const key = pair[ 0 ];
		const suffix = pair[ 1 ];
		const shorthand = sidesToShorthand( attributes[ key ] );
		if ( shorthand ) {
			decls.push( `--sgs-media-padding${ suffix }:${ shorthand }` );
		}
	} );

	return decls;
}
