/**
 * Trust bar canvas: how many columns the grid draws at a device, and the in-badge separator and lone-last-row rules
 * that depend on it. The twin of `includes/helpers-trust-bar-grid.php` (`sgs_trust_bar_template_count`,
 * `sgs_trust_bar_tier_columns`): the front end prints per-device CSS from the count, the canvas applies the same
 * rules to the previewed device's markup.
 *
 * @package SGS\Blocks
 */

import { tierLengthPreview } from '../../utils/cssLength';

const TIERS = [ 'desktop', 'tablet', 'mobile' ];
const FALLBACK = { desktop: 2, tablet: 2, mobile: 1 };

/**
 * The column count a `grid-template-columns` value states, when it is a plain `repeat(N, ...)`.
 *
 * @param {string} template A template, e.g. "repeat(4, 1fr)".
 * @return {number|null} N; null when the value is not a plain repeat.
 */
export function templateCount( template ) {
	const match = /^\s*repeat\(\s*(\d{1,2})\s*,/i.exec(
		String( template ?? '' )
	);
	return match && Number( match[ 1 ] ) > 0 ? Number( match[ 1 ] ) : null;
}

/**
 * The column count the grid draws at one device: the device's own template, else the wider template it inherits,
 * else the Columns count (the shared wrapper's resolution). The front end also lets a stored Columns count for the
 * device override a wider template; the editor cannot tell a stored count from a default, so it follows the template.
 *
 * @param {Object} attributes The block's attributes (`gridTemplateColumns`, `columns`).
 * @param {string} tier       'desktop', 'tablet' or 'mobile'.
 * @return {number|null} The count; null when a template states none.
 */
export function tierColumns( attributes, tier ) {
	const templates = attributes?.gridTemplateColumns || {};
	const columns = attributes?.columns || {};
	let inherited = null;
	let found = false;
	for ( const t of TIERS.slice( 0, TIERS.indexOf( tier ) + 1 ) ) {
		const stored = templates[ t ];
		if ( 'string' === typeof stored && '' !== stored.trim() ) {
			inherited = templateCount( stored );
			found = true;
		}
	}
	if ( found ) {
		return inherited;
	}
	const count = Number( columns[ tier ] ?? FALLBACK[ tier ] );
	return count > 0 ? count : FALLBACK[ tier ];
}

/**
 * The canvas twin of the front end's per-device rules for a grid's badges.
 *
 * A static grid gives the title (when the bar has one) the first cell, so a badge's cell is its position plus one.
 *
 * @param {number}  index      The badge's position, from 0.
 * @param {number}  total      How many badges there are.
 * @param {?number} columns    tierColumns() for the previewed device.
 * @param {boolean} centreLast The bar's Centre a lone last row setting.
 * @param {boolean} titleCell  Whether a title takes the first cell.
 * @return {{ cell: boolean, centre: boolean }} `cell`: draw this badge's in-badge separator (not the last badge, not the
 *   end of a row); `centre`: this is a lone last badge to span the row and centre.
 */
export function gridBadgeRules(
	index,
	total,
	columns,
	centreLast,
	titleCell = false
) {
	const last = index === total - 1;
	const cell = index + 1 + ( titleCell ? 1 : 0 );
	return {
		cell: ! last && ( null === columns || cell % columns !== 0 ),
		centre:
			!! centreLast &&
			last &&
			columns > 1 &&
			cell > columns &&
			( cell - 1 ) % columns === 0,
	};
}

/**
 * The column part of the bar's gap at a device: the second length of a "row column" pair, else the value itself.
 * The in-badge separator is centred half this far beyond its badge (`--sgs-trust-bar-gap-x`).
 *
 * @param {Object} gap  The bar's `gap` tier object.
 * @param {string} tier The previewed device.
 * @return {string} A CSS length ('0px' when the gap is unset).
 */
export function columnGapPreview( gap, tier ) {
	const value = tierLengthPreview( gap, tier );
	const parts = [];
	let depth = 0;
	let current = '';
	for ( const ch of String( value ?? '' ).trim() ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( /\s/.test( ch ) && 0 === depth ) {
			if ( current ) {
				parts.push( current );
				current = '';
			}
		} else {
			current += ch;
		}
	}
	if ( current ) {
		parts.push( current );
	}
	return parts.length ? parts[ parts.length - 1 ] : '0px';
}
