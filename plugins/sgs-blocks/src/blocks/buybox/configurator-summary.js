/**
 * sgs/buybox "Pick a set" — the pure summary, split and per-unit rules (no DOM). Output is plain text for `textContent`.
 *
 * Tokens in the summary template: {pack}, {pack_label}, {variation}, {split}, {picks}, {count}. Unknown tokens are removed.
 *
 * @package SGS\Blocks
 */

/**
 * Split a pack equally: floor(N/k) each, the first N mod k picks get one extra (20 over 3 is 7, 7, 6).
 *
 * @param {number} pack  Pack size.
 * @param {number} picks Number of picks.
 * @return {number[]} One count per pick, in pick order.
 */
export function distribute( pack, picks ) {
	if ( ! ( pack > 0 ) || ! ( picks > 0 ) ) {
		return [];
	}
	const base = Math.floor( pack / picks );
	const extra = pack % picks;
	return Array.from( { length: picks }, ( _, i ) => base + ( i < extra ? 1 : 0 ) );
}

/**
 * Per-unit price in pence: integer pence over a positive integer pack, rounded half up.
 *
 * @param {number} pence Line price in pence.
 * @param {number} pack  Pack size.
 * @return {number|null} Null when the pack is missing or not positive.
 */
export function perUnitPence( pence, pack ) {
	if ( ! Number.isInteger( pack ) || pack <= 0 || ! Number.isInteger( pence ) || pence < 0 ) {
		return null;
	}
	return Math.floor( ( 2 * pence + pack ) / ( 2 * pack ) );
}

/**
 * "£1.19 each", or '' when the pack is missing.
 *
 * @param {number} pence  Line price in pence.
 * @param {number} pack   Pack size.
 * @param {string} symbol Currency symbol.
 * @return {string}
 */
export function perUnitText( pence, pack, symbol ) {
	const each = perUnitPence( pence, pack );
	return null === each ? '' : `${ symbol }${ ( each / 100 ).toFixed( 2 ) } each`;
}

/**
 * The split sentence part: "7 Strawberry · 7 Mango · 6 Vanilla", or "All 20 Strawberry" for one pick.
 *
 * @param {string[]} labels Picked labels, in pick order.
 * @param {number[]} counts Their counts (same length).
 * @param {number}   pack   Pack size.
 * @return {string}
 */
export function splitText( labels, counts, pack ) {
	if ( 0 === labels.length || counts.length !== labels.length ) {
		return '';
	}
	if ( 1 === labels.length ) {
		return `All ${ pack } ${ labels[ 0 ] }`;
	}
	return labels.map( ( label, i ) => `${ counts[ i ] } ${ label }` ).join( ' · ' );
}

/**
 * Fill the summary template.
 *
 * @param {string} template Template, for example "Your {pack}: {split}".
 * @param {Object} values   Token values: pack, pack_label, variation, split, picks, count.
 * @return {string} The sentence; unknown tokens removed, spaces tidied.
 */
export function buildSummary( template, values ) {
	return String( template )
		.replace( /\{([a-z_]+)\}/g, ( _, token ) => ( Object.prototype.hasOwnProperty.call( values, token ) ? String( values[ token ] ) : '' ) )
		.replace( /\s+/g, ' ' )
		.replace( /\s+([:,.])/g, '$1' )
		.trim();
}

/**
 * The live caption for the preview and the sticky bar.
 *
 * @param {Object}   input
 * @param {string}   input.template   Summary template.
 * @param {number}   input.pack       Pack size (0 when the product has none).
 * @param {string}   input.packLabel  Pack option label.
 * @param {string}   input.variation  The other chosen options, lower-case, joined (for example "oat base, milk chips").
 * @param {string[]} input.labels     Picked labels, in order.
 * @param {number[]} input.counts     Counts per pick, or [] for a plain list.
 * @param {boolean}  input.sharing    True when the group shares the pack.
 * @return {string}
 */
export function summaryFor( { template, pack, packLabel, variation, labels, counts, sharing } ) {
	if ( 0 === labels.length ) {
		return '';
	}
	const split = sharing && pack > 0 ? splitText( labels, counts, pack ) : labels.join( ', ' );
	return buildSummary( template, {
		pack: pack > 0 ? pack : '',
		pack_label: packLabel,
		variation,
		split,
		picks: labels.join( ', ' ),
		count: labels.length,
	} );
}
