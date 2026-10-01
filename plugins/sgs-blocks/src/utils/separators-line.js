/**
 * Separators — the editor twin of the item-drawn path
 * (`includes/helpers-separators-line-css.php`).
 *
 * For a single row or column of items the block owns, returns the CSS the frontend
 * emits (a pseudo-element on every item except the first, centred in the gap), but
 * resolved for ONE device tier and without the hover rules, so the canvas shows the
 * same lines the page does. Render it in a `<style>` element beside the list.
 *
 * @package SGS\Blocks
 */

import { colourVar } from './tokens';
import { separatorAxis, separatorWidthAt } from './separators';

/**
 * The CSS for one list's item-drawn separators in the canvas.
 *
 * @param {Object} value      The stored separators object.
 * @param {Object} list       The list descriptor.
 * @param {string} list.item      Selector of the items.
 * @param {string} list.direction 'row' (side by side) or 'column' (stacked).
 * @param {string} list.gap       The gap as a CSS length or expression.
 * @param {string} [list.pseudo]  The pseudo-element the line is drawn on. Default '::before'.
 * @param {string} [list.pseudoEnd] The pseudo-element for the trailing edge. Default '::after'.
 * @param {string} [device]   'desktop' | 'tablet' | 'mobile'. Default 'desktop'.
 * @param {string} [edges]    'between' | 'all' | 'end' (only when the block offers edges). Default 'between'.
 * @return {string} CSS, or '' when the setting draws nothing.
 */
export function separatorsLineCss( value, list, device = 'desktop', edges = 'between' ) {
	const axis = 'column' === list.direction ? 'row' : 'column';
	const data = separatorAxis( value, axis );
	const width = separatorWidthAt( data, device );
	if ( ! width || ! list.item ) {
		return '';
	}
	const vertical = 'column' === axis;
	const colour = colourVar( data.colour ) || 'currentColor';
	const style = data.style && 'none' !== data.style ? data.style : 'solid';
	const before = list.pseudo || '::before';
	const after = list.pseudoEnd || '::after';
	const span = vertical ? 'top:0;bottom:0;' : 'inset-inline:0;';
	const start = vertical ? 'inset-inline-start' : 'inset-block-start';
	const end = vertical ? 'inset-inline-end' : 'inset-block-end';
	const side = vertical ? 'inline' : 'block';
	const base = `content:"";position:absolute;pointer-events:none;${ span }`;
	const border = `border-${ side }-start:${ width } ${ style } ${ colour };`;

	let css = `${ list.item }{position:relative;}`;
	css += `${ list.item }:not(:first-child)${ before }{${ base }${ start }:calc((${ list.gap || '0px' } + ${ width }) / -2);${ border }}`;
	if ( 'all' === edges ) {
		css += `${ list.item }:first-child${ before }{${ base }${ start }:0;${ border }}`;
	}
	if ( 'all' === edges || 'end' === edges ) {
		css += `${ list.item }:last-child${ after }{${ base }${ end }:0;border-${ side }-end:${ width } ${ style } ${ colour };}`;
	}
	return css;
}
