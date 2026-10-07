/**
 * sgs/tabs — editor-canvas rules render.php paints through its scoped
 * stylesheet rather than a custom property: the tab indicator gradients.
 *
 * @package SGS\Blocks
 */

import { typographyPreviewStyle, isCssGradient, tierBoxLonghands } from '../../utils';


/**
 * The twin of `sgs_border_gradient_css()` for one selector: a masked ::before
 * ring painted with the gradient, the element's own border made transparent.
 *
 * @param {string} selector Selector the ring paints on.
 * @param {string} paint    CSS gradient.
 * @param {string} width    Ring width.
 * @return {string} CSS text.
 */
function gradientRingCss( selector, paint, width ) {
	return `${ selector }{border-color:transparent;position:relative;background-clip:padding-box;}` +
		`${ selector }::before{content:"";position:absolute;inset:0;margin:-${ width };border-radius:inherit;padding:${ width };background:${ paint };-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}`;
}

/**
 * The resting and selected tab indicator gradients, scoped to this instance,
 * as render.php emits them (ring width = the indicator thickness, else 2px).
 *
 * @param {Object} attributes Block attributes.
 * @param {string} scope      The instance's editor scope class.
 * @return {string} CSS text ('' when no gradient is set).
 */
export function tabsIndicatorGradientCss( attributes, scope ) {
	const thickness = String( attributes.tabIndicatorThickness || '' ).trim();
	const width = thickness && ! /[;{}<>]/.test( thickness ) ? thickness : '2px';
	let css = '';
	if ( isCssGradient( attributes.tabIndicatorColourGradient, { whole: true } ) ) {
		css += gradientRingCss( `.${ scope } .sgs-tabs__tab:not([aria-selected='true'])`, attributes.tabIndicatorColourGradient, width );
	}
	if ( isCssGradient( attributes.tabActiveIndicatorColourGradient, { whole: true } ) ) {
		css += gradientRingCss( `.${ scope } .sgs-tabs__tab[aria-selected='true']`, attributes.tabActiveIndicatorColourGradient, width );
	}
	return css;
}

/**
 * The tab buttons' style: render.php's `sgs_typography_css_rule( $attributes, 'tab' )`
 * at the previewed tier, plus the flat `tabPadding` box (unset sides 0).
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @return {Object} Inline style for each tab button.
 */
export function tabButtonStyle( attributes, tier ) {
	const style = typographyPreviewStyle( attributes, 'tab', tier );
	// tabPadding is a flat box (one value for every device): previewed as the desktop tier, set sides only.
	Object.assign( style, tierBoxLonghands( { desktop: attributes.tabPadding }, 'desktop', 'padding' ) );
	return style;
}
