/**
 * Editor-canvas twin of includes/helpers-link-underline.php::sgs_link_underline_css: how the links inside a block's
 * text are underlined ('' theme default, 'none', 'always', 'sweep'), with the same rules the page prints. The line is
 * in the link's own colour. The page adds a touch guard to the hover rule; the canvas previews on hover as is.
 *
 * @package SGS\Blocks
 */

import { bareLength } from './bare-length';

/**
 * @param {string} selector Scoped selector of the element holding the links (not the `a`).
 * @param {Object} values
 * @param {string} [values.mode]         '', 'none', 'always' or 'sweep'.
 * @param {string} [values.thickness]    The line's thickness (a CSS length).
 * @param {string} [values.linkGradient] The link's gradient text colour, which owns its background.
 * @return {string} CSS text; '' when the setting is unset.
 */
export function linkUnderlinePreviewCss( selector, { mode = '', thickness = '', linkGradient = '' } = {} ) {
	if ( ! [ 'none', 'always', 'sweep' ].includes( mode ) || ! selector ) {
		return '';
	}
	const link = `${ selector } a`;
	if ( 'none' === mode ) {
		return `${ link }{text-decoration:none;}`;
	}
	const size = thickness ? bareLength( thickness ) : '';
	if ( 'always' === mode ) {
		return `${ link }{text-decoration-line:underline;${ size ? `text-decoration-thickness:${ size };` : '' }}`;
	}
	if ( linkGradient ) {
		return '';
	}
	const sweep = size || 'var(--wp--custom--link-sweep--thickness, 1px)';
	return (
		`${ link }{text-decoration:none;background-image:linear-gradient(currentColor,currentColor);background-repeat:no-repeat;background-origin:content-box;` +
		`background-position:0 100%;background-size:0 ${ sweep };transition:background-size var(--wp--custom--link-sweep--duration, 0.25s) ease-out;}` +
		`${ link }:dir(rtl){background-position:100% 100%;}` +
		`${ link }:hover,${ link }:focus-visible{background-size:100% ${ sweep };}` +
		`@media (prefers-reduced-motion: reduce){${ link }{transition:none;}}`
	);
}
