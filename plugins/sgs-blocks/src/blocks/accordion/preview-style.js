/**
 * Editor-canvas preview for sgs/accordion's own wrapper, mirroring what
 * render.php paints at the previewed device tier: the SGS_Container_Wrapper
 * layer (layout, gap, grid rows, max width, content band, border and corner
 * radius, through the shared containerWrapperPreview()), the base spacing, and
 * the root typography sgs_typography_css_rule() emits with its text-indent
 * sibling rule.
 *
 * @package SGS\Blocks
 */

import {
	containerWrapperPreview,
	spacingPreview,
	typographyPreviewStyle,
	textIndentPreviewCss,
} from '../../utils';

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile' (usePreviewTier()).
 * @param {Array}  palette    Theme colour palette.
 * @param {string} scope      Selector of this instance's root in the canvas.
 * @return {{ style: Object, className: string, bandStyle: Object, hasBandProps: boolean, css: string }}
 *   `style` for the root, `bandStyle` for the `.sgs-container__inner` band
 *   (rendered only when `hasBandProps`), `css` for an editor <style>.
 */
export function accordionWrapperPreview( attributes, tier, palette, scope ) {
	const wrapper = containerWrapperPreview( attributes, tier, palette );
	Object.assign(
		wrapper.style,
		spacingPreview( { padding: attributes.padding, margin: attributes.margin }, tier ),
		typographyPreviewStyle( attributes, '', tier )
	);
	return {
		...wrapper,
		css: textIndentPreviewCss( attributes, '', scope, tier ),
	};
}
