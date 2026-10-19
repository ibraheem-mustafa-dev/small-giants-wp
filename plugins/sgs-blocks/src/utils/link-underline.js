/**
 * Editor-canvas twin of includes/helpers-link-underline.php::sgs_link_underline_css: how the links inside a block's
 * text are underlined ('' theme default, 'none', 'always', 'hover', 'sweep'), with the same rules the page prints.
 * The line is in the link's own colour unless a line colour is set (`colour` at rest, `colourHover` on hover or
 * focus). The page adds a touch guard to the hover rule; the canvas previews on hover as is.
 *
 * @package SGS\Blocks
 */

import { bareLength } from './bare-length';
import { colourVar } from './tokens';

/**
 * @param {string} selector Scoped selector of the element holding the links (not the `a`).
 * @param {Object} values
 * @param {string} [values.mode]         '', 'none', 'always', 'hover' or 'sweep'.
 * @param {string} [values.thickness]    The line's thickness (a CSS length).
 * @param {string} [values.offset]       The gap between the text and the line (a CSS length); not used by 'sweep'.
 * @param {string} [values.colour]       The line's colour at rest (a palette slug or any CSS colour).
 * @param {string} [values.colourHover]  The line's colour on hover and keyboard focus.
 * @param {string} [values.linkGradient] The link's gradient text colour, which owns its background.
 * @return {string} CSS text; '' when the setting is unset.
 */
export function linkUnderlinePreviewCss( selector, { mode = '', thickness = '', offset = '', colour = '', colourHover = '', linkGradient = '' } = {} ) {
	if ( ! [ 'none', 'always', 'hover', 'sweep' ].includes( mode ) || ! selector ) {
		return '';
	}
	const link = `${ selector } a`;
	if ( 'none' === mode ) {
		return `${ link }{text-decoration:none;}`;
	}
	const size = thickness ? bareLength( thickness ) : '';
	const gap = offset ? bareLength( offset ) : '';
	const ink = colourVar( colour ) || '';
	const inkHover = colourVar( colourHover ) || '';
	if ( 'always' === mode || 'hover' === mode ) {
		const rest =
			`${ link }{text-decoration-line:${ 'always' === mode ? 'underline' : 'none' };` +
			`${ size ? `text-decoration-thickness:${ size };` : '' }` +
			`${ ink ? `text-decoration-color:${ ink };` : '' }` +
			`${ gap ? `text-underline-offset:${ gap };` : '' }}`;
		if ( 'always' === mode ) {
			return rest + ( inkHover ? `${ link }:hover,${ link }:focus-visible{text-decoration-color:${ inkHover };}` : '' );
		}
		return rest + `${ link }:hover,${ link }:focus-visible{text-decoration-line:underline;${ inkHover ? `text-decoration-color:${ inkHover };` : '' }}`;
	}
	if ( linkGradient ) {
		return '';
	}
	const sweep = size || 'var(--wp--custom--link-sweep--thickness, 1px)';
	const line = ink || 'currentColor';
	return (
		`${ link }{text-decoration:none;background-image:linear-gradient(${ line },${ line });background-repeat:no-repeat;background-origin:content-box;` +
		`background-position:0 100%;background-size:0 ${ sweep };transition:background-size var(--wp--custom--link-sweep--duration, 0.25s) ease-out;}` +
		`${ link }:dir(rtl){background-position:100% 100%;}` +
		`${ link }:hover,${ link }:focus-visible{background-size:100% ${ sweep };${ inkHover ? `background-image:linear-gradient(${ inkHover },${ inkHover });` : '' }}` +
		`@media (prefers-reduced-motion: reduce){${ link }{transition:none;}}`
	);
}
