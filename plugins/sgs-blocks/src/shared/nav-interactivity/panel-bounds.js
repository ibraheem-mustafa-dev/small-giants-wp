/**
 * Horizontal bounds for nav panels — pure geometry, no DOM.
 *
 * A nav panel is positioned against a BOUNDING BOX. For every header shipping
 * today that box is the viewport, because the header spans it. For a floating
 * ("pill") header it is the pill: a dropdown hanging off the pill's leftmost
 * item must stay inside the card rather than overhanging into the inset, and a
 * mega panel must be the pill's own width, flush to its bottom edge.
 *
 * The two surfaces get DIFFERENT rules, and that is measured, not assumed:
 *   - MEGA panel → MATCHES the box. The only reference with a real pill
 *     (lamalama) opens a panel at exactly the pill's left and width, ratio
 *     1.000 at both 1440 and 390, with no gap between the two.
 *   - DROPDOWN → CLAMPS inside the box, keeping its own width. ButcherBox
 *     proves the distinction on a single site: its mega panel is the bar's full
 *     width while its plain `<ul>` dropdown stays 300px, sized to its own item.
 *
 * Every function here takes numbers and returns numbers, so the non-floating
 * path can be proved byte-for-byte identical to the shipped arithmetic by a
 * node test rather than by reading. When `bounds` is the viewport
 * (`{ left: 0, right: innerWidth }`) each expression reduces algebraically to
 * exactly what `mega-disclosure.js::repositionPanel` computed before this
 * module existed — see `scripts/tests/test-panel-bounds.mjs`, which asserts
 * that on a grid of inputs and carries a negative control.
 *
 * @package SGS\Blocks
 */

/**
 * The viewport as a bounding box — the default for every non-floating header.
 *
 * `bottom` is null here: a full-width header's panel keeps the stylesheet's
 * `top: 100%` off its own trigger, which is what every non-floating header has
 * always done.
 *
 * @param {number} viewportWidth `window.innerWidth`.
 * @return {{left: number, right: number, bottom: number|null, floating: boolean}} Bounding box.
 */
export function viewportBounds( viewportWidth ) {
	return { left: 0, right: viewportWidth, bottom: null, floating: false };
}

/**
 * Derive the bounding box from a header's measured rect.
 *
 * MEASURED, never declared. `headerFloat` can be on for one device tier and off
 * for another, and a collapse breakpoint turns the pill back into a full-width
 * bar below it — so the attribute says "worth measuring" and the rect says what
 * is actually true at the visitor's width. A header that spans the viewport
 * (within a pixel of rounding) yields the viewport box, which keeps every
 * downstream expression on the shipped arithmetic.
 *
 * @param {{left: number, right: number, bottom: number}|null} headerRect    The header's rect, or null.
 * @param {number}                                             viewportWidth `window.innerWidth`.
 * @param {number}                                             [epsilon]     Rounding tolerance in px.
 * @return {{left: number, right: number, bottom: number|null, floating: boolean}} Bounding box.
 */
export function boundsFromHeaderRect( headerRect, viewportWidth, epsilon = 1 ) {
	if ( ! headerRect ) {
		return viewportBounds( viewportWidth );
	}
	const insetLeft = headerRect.left;
	const insetRight = viewportWidth - headerRect.right;
	if ( insetLeft <= epsilon && insetRight <= epsilon ) {
		return viewportBounds( viewportWidth );
	}
	return {
		left: headerRect.left,
		right: headerRect.right,
		bottom: headerRect.bottom,
		floating: true,
	};
}

/**
 * Left edge for a DROPDOWN: the operator's alignment, clamped inside the box.
 *
 * Collision handling is always on and structural, never a client toggle — the
 * operator's alignment is a preference, and the framework overrides it only
 * where the panel would actually be clipped.
 *
 * The gutter applies to the VIEWPORT box only. A pill is already inset from the
 * viewport by its own gap; adding a second gutter inside it would push every
 * dropdown 28px in from a card edge the visitor can see, which no reference
 * does.
 *
 * @param {Object} args                Arguments.
 * @param {number} args.desiredLeft    Where the alignment wants the panel.
 * @param {number} args.width          The panel's own width.
 * @param {Object} args.bounds         Bounding box from the helpers above.
 * @param {number} args.gutter         Viewport-edge gutter in px.
 * @return {number} Clamped left edge, in the same coordinate space as the input.
 */
export function clampDropdownLeft( { desiredLeft, width, bounds, gutter } ) {
	const inset = bounds.floating ? 0 : gutter;
	const maxLeft = bounds.right - inset - width;
	const minLeft = bounds.left + inset;
	// Order matters and mirrors the shipped code: pull left off the right edge
	// first, then refuse to go past the left edge. A panel wider than the box
	// therefore pins to the left edge rather than the right, which keeps its
	// first item reachable.
	return Math.max( Math.min( desiredLeft, maxLeft ), minLeft );
}

/**
 * Left edge for a MEGA panel: centred in the box, never past its left gutter.
 *
 * @param {Object} args        Arguments.
 * @param {number} args.width  The panel's own width.
 * @param {Object} args.bounds Bounding box.
 * @param {number} args.gutter Viewport-edge gutter in px.
 * @return {number} Left edge.
 */
export function centreMegaLeft( { width, bounds, gutter } ) {
	const inset = bounds.floating ? 0 : gutter;
	return Math.max(
		bounds.left + ( bounds.right - bounds.left - width ) / 2,
		bounds.left + inset
	);
}

/**
 * The width a MEGA panel should take, or null to leave the stylesheet's own
 * `min( 1120px, calc( 100vw - 56px ) )` in charge.
 *
 * Only a floating header returns a number — matching the pill is the whole
 * point of the rule, and a full-width header already resolves to the same thing
 * through the stylesheet.
 *
 * @param {Object} bounds Bounding box.
 * @return {number|null} Width in px, or null.
 */
export function megaPanelWidth( bounds ) {
	return bounds.floating ? bounds.right - bounds.left : null;
}
