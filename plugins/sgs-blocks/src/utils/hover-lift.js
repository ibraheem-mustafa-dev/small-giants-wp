/**
 * The hover lift: raise an element by N px on hover. The JS twin of
 * `includes/helpers-hover-lift.php`, used by the editor previews of sgs/button and the sgs/form
 * submit button.
 *
 * Logic only, no React and no WordPress imports, so plain Node can load it.
 *
 * @package SGS\Blocks
 */

export const HOVER_LIFT_MAX_PX = 24;

/**
 * The lift distance as a whole number of pixels, clamped to 0..HOVER_LIFT_MAX_PX.
 *
 * @param {*} raw Stored attribute value.
 * @return {number} Pixels; 0 means no lift.
 */
export function hoverLiftPx( raw ) {
	const px = Math.trunc( Number( raw ) );
	return Number.isFinite( px ) ? Math.min( HOVER_LIFT_MAX_PX, Math.max( 0, px ) ) : 0;
}

/**
 * The declaration a lift paints on hover.
 *
 * @param {*}       raw            Stored attribute value.
 * @param {boolean} resetTransform Also print `transform:none` (PHP twin: the same flag).
 * @return {string} Semicolon-joined declarations, or '' when there is no lift.
 */
export function hoverLiftDecls( raw, resetTransform = false ) {
	const px = hoverLiftPx( raw );
	if ( px <= 0 ) {
		return '';
	}
	const decls = `translate:0 -${ px }px`;
	return resetTransform ? `${ decls };transform:none` : decls;
}

/**
 * The editor-canvas hover rule for a lift, for a scoped `<style>`. Like the PHP twin it sits
 * inside `@media (prefers-reduced-motion:no-preference)`, so reduced motion shows no lift.
 *
 * @param {string} selector Selector for the element (no `:hover` suffix).
 * @param {*}      raw      Stored attribute value.
 * @return {string} The rule, or '' when there is no lift.
 */
export function hoverLiftPreviewRule( selector, raw ) {
	const decls = hoverLiftDecls( raw );
	return decls
		? `@media (prefers-reduced-motion:no-preference){${ selector }:hover{${ decls }}}`
		: '';
}
