/**
 * The defaults a block declares for its untouched padding and margin sides.
 *
 * `block.json::supports.sgs.spacingDefaults` names, per attribute and side, what the block's stylesheet paints when
 * the side is unset: `var(--wp--preset--spacing--<slug>)` when that value equals a theme spacing preset's size
 * exactly, otherwise the literal length (`20px`, `0`). The default is declared, never stored: the attribute default
 * stays empty, the stylesheet paints the same value, and `SgsBoxControl` shows it through its `defaults` prop the way
 * it shows a value inherited from a wider tier ("Default (M)", "Default (20px)").
 *
 * One attribute's declaration is a base plus optional repaints the stylesheet makes on the same element:
 *
 *   "padding": {
 *     "top": "…", "right": "…", "bottom": "…", "left": "…",          base: every tier, every setting
 *     "tablet": { "top": "…" },                                      per-tier override, partial
 *     "mobile": { "top": "…" },
 *     "when": [ {                                                    optional, the first entry whose attrs all match
 *       "attrs": { "cardStyle": "boxed" },                           wins; attribute name -> value (all must match)
 *       "classes": [ "sgs-x--card-boxed" ],                          the variant class(es) the stylesheet keys on;
 *       "top": "…",                                                  `!class` for a :not(); the census reads these
 *       "tablet": { … }, "mobile": { … }                             sides, plus the same tier overrides
 *     } ]
 *   }
 *
 * A tier is the editor's previewed device (`utils/usePreviewTier.js`, or the tier a `ResponsiveOverride` hands its
 * child): desktop, tablet or mobile. Tablet inherits desktop and mobile inherits tablet, side by side, exactly as a
 * stored wider-tier value does. Layers are applied in this order, a later layer replacing an earlier one per side:
 * base, the matching `when` entry's sides, then (tablet and mobile) the declaration's tier override and the matching
 * `when` entry's tier override.
 */
import { getBlockType } from '@wordpress/blocks';

const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const TIER_CASCADE = { desktop: [], base: [], tablet: [ 'tablet' ], mobile: [ 'tablet', 'mobile' ] };

const isObject = ( value ) => !! value && 'object' === typeof value && ! Array.isArray( value );

/** The `{ side: value }` entries of an object whose value is a non-empty string; tier and when keys never qualify. */
const sideValues = ( source ) =>
	isObject( source )
		? Object.fromEntries(
				Object.entries( source ).filter(
					( [ key, value ] ) => SIDES.includes( key ) && 'string' === typeof value && '' !== value
				)
		  )
		: {};

/** The first `when` entry whose every `attrs` pair equals the block's attribute; none without attributes. */
const matchingWhen = ( when, attributes ) =>
	Array.isArray( when ) && isObject( attributes )
		? when.find(
				( entry ) =>
					isObject( entry ) &&
					isObject( entry.attrs ) &&
					Object.keys( entry.attrs ).length > 0 &&
					Object.entries( entry.attrs ).every( ( [ attr, value ] ) => attributes[ attr ] === value )
		  )
		: undefined;

/**
 * @param {string} blockName         The registered block name (`sgs/cart`).
 * @param {string} attr              The box attribute (`panelFooterPadding`).
 * @param {Object} [context]         What the control is showing.
 * @param {Object} [context.attributes] The block's attributes, matched against the declaration's `when` entries.
 * @param {string} [context.tier]    'desktop' (or 'base'), 'tablet' or 'mobile'; anything else reads as desktop.
 * @return {Object} `{ side: value }` (a preset var() or a length) the sides paint at that tier and setting; `{}` when
 *                  none. Without a context it is the base.
 */
export function spacingDefaultsFor( blockName, attr, context = {} ) {
	const declared = getBlockType( blockName )?.supports?.sgs?.spacingDefaults?.[ attr ];
	if ( ! isObject( declared ) ) {
		return {};
	}
	const matched = matchingWhen( declared.when, context?.attributes );
	const cascade = TIER_CASCADE[ context?.tier ] ?? [];
	const layers = [ declared, matched ];
	cascade.forEach( ( tier ) => layers.push( declared[ tier ], matched?.[ tier ] ) );
	// The layers interleave plain and `when` entries, so the order above is base, when sides, tablet, when tablet, …
	return Object.assign( {}, ...layers.map( sideValues ) );
}
