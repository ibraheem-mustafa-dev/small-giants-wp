/**
 * sgs/site-header — floating ("pill") mode: pure helpers and the editor-canvas
 * preview. No JSX, no components — split out of FloatControls.js to keep both
 * files inside the project's 250-line ceiling, and so the preview arithmetic can
 * be read (and tested) without a React tree around it.
 *
 * ⛔ Keep `resolveFloatInset` in step with
 * `includes/sgs-header-float-css.php::sgs_header_float_inset_for_tier`, and
 * `floatPreview`'s width expression in step with `sgs_header_float_css`. If they
 * disagree the canvas lies about what the published page will look like, which
 * is the exact failure a canvas preview exists to prevent.
 *
 * @package SGS\Blocks
 */

import { resolveTier } from '../../utils/responsive';
import { surfaceBackdropPreview } from '../../utils/surface-preview';

/**
 * The sides a pill inset actually uses. `bottom` is deliberately absent: a gap
 * below a pinned bar means nothing, the renderer never reads it, and offering a
 * control that does nothing is the defect the dead-control gate exists to catch.
 *
 * @type {string[]}
 */
export const INSET_SIDES = [ 'top', 'right', 'left' ];

/**
 * The measured reference inset, in a relative unit (WCAG 1.4.4 at 200% zoom).
 *
 * @type {string}
 */
export const DEFAULT_INSET = '1rem';

/**
 * The width the collapse opt-out drops the pill at, when one is not chosen.
 * Matches the renderer's own fallback (SGS_Breakpoints::MOBILE_MAX + 1).
 *
 * @type {number}
 */
export const DEFAULT_COLLAPSE_BREAKPOINT = 768;

/**
 * The four float attributes' DECLARED defaults, as block.json declares them.
 *
 * Every reset path reads from here rather than writing its own literal, so a
 * "reset" leaves the attribute holding exactly the value the block would have
 * had untouched. Writing something else — `{}` for an inset block.json declares
 * as a populated object, or a breakpoint carried over from the value being
 * reset — leaves the block dirty in the editor and serialises an attribute that
 * matches no default, which is the difference between a reset and a change.
 *
 * `scripts/tests/test-float-defaults.mjs` reads block.json and fails the build
 * if these drift apart, so the two cannot disagree silently.
 *
 * @type {Object}
 */
export const FLOAT_DEFAULTS = {
	headerFloat: {},
	headerFloatInset: {
		desktop: {
			top: DEFAULT_INSET,
			right: DEFAULT_INSET,
			left: DEFAULT_INSET,
		},
	},
	headerFloatCollapse: {
		enabled: false,
		breakpoint: DEFAULT_COLLAPSE_BREAKPOINT,
	},
};

/**
 * A FRESH copy of one declared default, safe to hand to `setAttributes`.
 *
 * A copy, not the shared object: an attribute value that is the same reference
 * as the module-level default would let any later mutation of the stored
 * attribute rewrite the default itself.
 *
 * @param {string} name Attribute name.
 * @return {*} The declared default.
 */
export function floatDefault( name ) {
	const value = FLOAT_DEFAULTS[ name ];
	return null !== value && typeof value === 'object'
		? JSON.parse( JSON.stringify( value ) )
		: value;
}

/**
 * Is an attribute value still its declared default?
 *
 * Used by the ToolsPanel `hasValue` callbacks, which ask "has the operator
 * changed this?" — a question a truthiness test cannot answer for an attribute
 * whose default is itself a populated object.
 *
 * @param {string} name  Attribute name.
 * @param {*}      value Current attribute value.
 * @return {boolean} True when the value matches the declared default.
 */
export function isFloatDefault( name, value ) {
	const isPlainObject = ( candidate ) =>
		null !== candidate &&
		typeof candidate === 'object' &&
		! Array.isArray( candidate );
	const deepEqual = ( a, b ) => {
		if ( isPlainObject( a ) && isPlainObject( b ) ) {
			const keys = new Set( [
				...Object.keys( a ),
				...Object.keys( b ),
			] );
			return [ ...keys ].every( ( key ) =>
				deepEqual( a[ key ], b[ key ] )
			);
		}
		return a === b;
	};
	return deepEqual(
		value === undefined ? FLOAT_DEFAULTS[ name ] : value,
		FLOAT_DEFAULTS[ name ]
	);
}

/**
 * Representative viewport width per device tier, used ONLY to decide whether the
 * canvas preview shows the collapsed (full-width) state. Mirrors the widths the
 * editor's own device previews render at.
 *
 * @type {Object}
 */
export const TIER_WIDTH = { desktop: 1440, tablet: 768, mobile: 390 };

/**
 * Does a tri-state {desktop,tablet,mobile} object resolve 'on' at any tier?
 *
 * @param {Object} raw Tri-state value.
 * @return {boolean} True when the behaviour is on somewhere.
 */
export function isFloatOnAtAnyTier( raw ) {
	return [ 'desktop', 'tablet', 'mobile' ].some(
		( tier ) => resolveTier( raw, tier, 'off' ).value === 'on'
	);
}

/**
 * Resolve the tier-of-box inset for one tier, side by side.
 *
 * Sides cascade individually — a tablet box declaring only `top` keeps
 * desktop's `right`/`left` — because that is what the emitted CSS does.
 *
 * @param {Object} inset `{ desktop, tablet, mobile }` boxes.
 * @param {string} tier  Active preview tier.
 * @return {{top: string, right: string, left: string}} Resolved lengths.
 */
export function resolveFloatInset( inset, tier ) {
	const order = [ 'desktop' ];
	if ( tier === 'tablet' || tier === 'mobile' ) {
		order.push( 'tablet' );
	}
	if ( tier === 'mobile' ) {
		order.push( 'mobile' );
	}
	const out = { top: DEFAULT_INSET, right: DEFAULT_INSET, left: DEFAULT_INSET };
	order.forEach( ( key ) => {
		const box = inset?.[ key ];
		if ( ! box || typeof box !== 'object' ) {
			return;
		}
		INSET_SIDES.forEach( ( side ) => {
			if ( box[ side ] ) {
				out[ side ] = box[ side ];
			}
		} );
	} );
	return out;
}

/**
 * Editor-canvas mirror of the floating geometry.
 *
 * The canvas header is not pinned, so the top inset previews as a MARGIN rather
 * than a `top` offset — the visitor sees a gap above the bar either way, and a
 * `top` on an unpositioned element would preview nothing at all. Width and
 * centring are the frontend expressions verbatim; `env( safe-area-inset-* )`
 * resolves to 0 in the editor iframe, which is correct (there is no notch there).
 *
 * The blur previews whether or not the header floats, matching the frontend,
 * where `surfaceBlur` is emitted un-gated by tier.
 *
 * @param {Object} attributes  Block attributes.
 * @param {string} previewTier Active device tier in the editor.
 * @return {Object} Style object for `useBlockProps`; empty when nothing applies.
 */
export function floatPreview( attributes, previewTier ) {
	const {
		headerFloat,
		headerFloatInset,
		headerFloatCollapse,
	} = attributes || {};
	// Shared with every other `<BackgroundPanel>` block via
	// `src/utils/surface-preview.js` (U-1 commit 4e) — this was the ONLY
	// block with this mirror before the fan-out; the helper now carries it.
	const blurStyle = surfaceBackdropPreview( attributes );

	if ( resolveTier( headerFloat, previewTier, 'off' ).value !== 'on' ) {
		return blurStyle;
	}
	if (
		headerFloatCollapse?.enabled &&
		TIER_WIDTH[ previewTier ] < ( headerFloatCollapse.breakpoint || 768 )
	) {
		return { ...blurStyle, width: '100%', borderRadius: 0 };
	}

	const inset = resolveFloatInset( headerFloatInset, previewTier );
	return {
		...blurStyle,
		marginTop: inset.top,
		width: `calc(100% - ${ inset.left } - ${ inset.right })`,
		marginInline: 'auto',
	};
}

/**
 * Canvas preview of `surfaceFadeEdge`: the same full-height mask render.php writes.
 *
 * @param {string} edge 'none', 'top' or 'bottom'.
 * @return {Object} Style object; empty for 'none' or an unknown value.
 */
export function fadeEdgePreview( edge ) {
	const masks = {
		top: 'linear-gradient(to bottom, transparent, #000)',
		bottom: 'linear-gradient(to top, transparent, #000)',
	};
	return masks[ edge ]
		? { maskImage: masks[ edge ], WebkitMaskImage: masks[ edge ] }
		: {};
}

/**
 * The float attributes a "reset all" on the Header behaviour panel must clear,
 * each restored to the value block.json declares as its default.
 *
 * @return {Object} Attribute updates.
 */
export function floatResetAttributes() {
	return Object.keys( FLOAT_DEFAULTS ).reduce( ( out, name ) => {
		out[ name ] = floatDefault( name );
		return out;
	}, {} );
}
