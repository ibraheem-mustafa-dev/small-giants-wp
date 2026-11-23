/**
 * Shared scrollbar choice for a block's scrolling area: the editor twin of includes/helpers-scrollbar.php.
 *
 * Same three choices and the same CSS, so a block whose canvas is drawn in JavaScript (not a server render)
 * previews exactly what the live page prints. `default` prints nothing (the site's bar); `thin` sizes the WebKit
 * parts at `settings.custom.scrollbar.thinWidth` (with `scrollbar-color: auto` so they apply) and gives an engine
 * without them `scrollbar-width: thin` at no specificity; `hidden` prints `scrollbar-width: none`, hides the WebKit
 * bar and the shared overlay thumb.
 */

export const SCROLLBAR_CHOICES = [ 'default', 'thin', 'hidden' ];

/**
 * The area's choice: the stored value when it is one of the three, otherwise the area's starting value.
 *
 * @param {*}      value The stored attribute value (undefined when unset).
 * @param {string} start The area's starting value (what an unset setting renders).
 * @return {string} One of SCROLLBAR_CHOICES.
 */
export function scrollbarStyle( value, start = 'default' ) {
	if ( SCROLLBAR_CHOICES.includes( value ) ) {
		return value;
	}
	return SCROLLBAR_CHOICES.includes( start ) ? start : 'default';
}

/**
 * Appends a suffix to every selector of a comma list; commas inside parentheses do not split.
 *
 * @param {string} selector The selector list.
 * @param {string} suffix   What to append to each selector.
 * @return {string} The selector list with the suffix on each selector.
 */
export function selectorWith( selector, suffix ) {
	const parts = [];
	let depth = 0;
	let start = 0;
	for ( let i = 0; i < selector.length; i++ ) {
		const c = selector[ i ];
		if ( c === '(' ) {
			depth++;
		} else if ( c === ')' ) {
			depth--;
		} else if ( c === ',' && depth === 0 ) {
			parts.push( selector.slice( start, i ).trim() );
			start = i + 1;
		}
	}
	parts.push( selector.slice( start ).trim() );
	return parts
		.filter( Boolean )
		.map( ( part ) => part + suffix )
		.join( ',' );
}

/**
 * The CSS a scrollbar choice prints for the scrolling area matched by `selector`.
 *
 * @param {string} selector The scrolling area's selector, scoped to the instance.
 * @param {string} choice   One of SCROLLBAR_CHOICES; anything else prints nothing.
 * @param {string} media    Optional condition: a media query condition (printed as `@media <condition>`) or a whole
 *                          at-rule prelude starting with `@` (printed as given).
 * @return {string} The rules ('' for default).
 */
export function scrollbarCss( selector, choice, media = '' ) {
	const sel = ( selector || '' ).trim();
	if ( ! sel ) {
		return '';
	}
	const parts = selectorWith( sel, '::-webkit-scrollbar' );
	let css;
	if ( choice === 'hidden' ) {
		css =
			`${ sel }{scrollbar-width:none;}` +
			`${ parts }{display:none;}` +
			`${ selectorWith(
				sel,
				'>.sgs-overlay-scroll__thumb'
			) }{display:none;}`;
	} else if ( choice === 'thin' ) {
		const width = 'var(--wp--custom--scrollbar--thin-width,10px)';
		css =
			`${ parts }{width:${ width };height:${ width };}` +
			`@supports selector(::-webkit-scrollbar){${ sel }{scrollbar-color:auto;}}` +
			`@supports not selector(::-webkit-scrollbar){:where(${ sel }){scrollbar-width:thin;}}`;
	} else {
		return '';
	}
	const m = ( media || '' ).trim();
	if ( ! m ) {
		return css;
	}
	return `${ m.startsWith( '@' ) ? m : `@media ${ m }` }{${ css }}`;
}
