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
 * where `backdropBlur` is emitted un-gated by tier.
 *
 * @param {Object} attributes  Block attributes.
 * @param {string} previewTier Active device tier in the editor.
 * @return {Object} Style object for `useBlockProps`; empty when nothing applies.
 */
export function floatPreview( attributes, previewTier ) {
	const { headerFloat, headerFloatInset, headerFloatCollapse, backdropBlur } =
		attributes || {};
	const blurStyle = backdropBlur
		? {
				backdropFilter: `blur(${ backdropBlur })`,
				WebkitBackdropFilter: `blur(${ backdropBlur })`,
		  }
		: {};

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
 * The float attributes a "reset all" on the Header behaviour panel must clear.
 *
 * @return {Object} Attribute updates.
 */
export function floatResetAttributes() {
	return {
		headerFloat: {},
		headerFloatInset: {},
		headerFloatCollapse: { enabled: false, breakpoint: 768 },
		backdropBlur: '',
	};
}
