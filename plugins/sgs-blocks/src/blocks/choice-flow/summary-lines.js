/**
 * SGS Choice Flow — what the stage lists (Spec 43 FR-43-19, FR-43-24).
 *
 * Pure data: turns the pricing snapshot and the recorded answers into the
 * stage's content, which `summary.js` paints.
 *   - meta: the chosen product options beside the product's name, from the
 *     page buybox's variation (named through the stage's `data-axes`) and
 *     the flow's own product-option answers ("Ivory · Frame size 56").
 *   - lines: the base price, each priced answer ("included" at no cost),
 *     each other unpriced answer in the stage's muted style
 *     ("Prescription · Sending it later"), or the placeholder
 *     ("Lenses · not chosen yet") before any priced choice.
 *   - effect: the photo treatment of the latest reached answer carrying one.
 * Only answers whose step the shopper has reached are listed
 * (`flow-reached.js`), so a pre-selected default stays off the stage until
 * its question is shown.
 *
 * @package SGS\Blocks
 */

import { getPlainAnswers } from './flow-fields.js';
import { isStepReached } from './flow-reached.js';

/**
 * @param {number}  minor     Amount in minor currency units.
 * @param {number}  decimals  Currency decimal places.
 * @param {boolean} trimZeros Drop the decimals on a whole amount (WooCommerce's
 *                            `woocommerce_price_trim_zeros`, seeded by render.php).
 * @return {string} A plain formatted amount, e.g. "£9.99". Display only — the
 *                   cart/order totals a shopper actually pays are always
 *                   WooCommerce's own, server-formatted output.
 */
export function formatMinor( minor, decimals, trimZeros = false ) {
	const amount = minor / 10 ** decimals;
	const places = trimZeros && minor % 10 ** decimals === 0 ? 0 : decimals;
	return (
		'£' +
		amount.toLocaleString( undefined, {
			minimumFractionDigits: places,
			maximumFractionDigits: places,
		} )
	);
}

/**
 * Name the chosen variation's options: "Ivory · Frame size 56". A value that
 * starts with a digit carries its attribute's label, since a bare number
 * says nothing on its own.
 *
 * @param {Object} axes       The stage's `data-axes`: taxonomy => {label, terms}.
 * @param {Object} attributes The live base's chosen slugs, taxonomy => slug.
 * @return {string[]} One display value per chosen attribute.
 */
function variationNames( axes, attributes ) {
	return Object.keys( axes ).reduce( ( names, taxonomy ) => {
		const slug = attributes[ taxonomy ] || attributes[ `attribute_${ taxonomy }` ] || '';
		const name = slug ? axes[ taxonomy ].terms?.[ slug ] || '' : '';
		if ( name ) {
			names.push( /^\d/.test( name ) ? `${ axes[ taxonomy ].label } ${ name }` : name );
		}
		return names;
	}, [] );
}

/**
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {HTMLElement} panelEl  The stage `<aside>`.
 * @param {Object}      pricing  Pricing snapshot from `pricing.js`.
 * @return {{meta: string, lines: Array<{label: string, value: string, muted: boolean}>, totalMinor: number|null, effect: string, effectLabel: string}}
 */
export function buildSummary( flowRoot, panelEl, pricing ) {
	const { base, trimZeros, addonRows } = pricing;
	const reached = ( entry ) => isStepReached( flowRoot, entry.stepIndex );
	const plain = getPlainAnswers( flowRoot ).filter( reached );
	let axes = {};
	try {
		axes = JSON.parse( panelEl.getAttribute( 'data-axes' ) || '{}' ) || {};
	} catch {
		axes = {};
	}

	const meta = [
		...variationNames( axes, base.attributes || {} ),
		...plain.filter( ( answer ) => answer.product ).map( ( answer ) => answer.value ),
	].join( ' · ' );

	const format = ( minor ) => formatMinor( minor, base.decimals, trimZeros );
	const lines = [
		{
			label: panelEl.getAttribute( 'data-base-label' ) || 'Base price',
			value: base.priceMinor !== null ? format( base.priceMinor ) : '—',
			muted: false,
		},
	];
	let addonMinor = 0;
	// In question order, whatever order the answers were recorded in (a
	// default is recorded at load, before the questions ahead of it).
	const priced = addonRows.filter( reached ).sort( ( a, b ) => a.stepIndex - b.stepIndex );
	priced.forEach( ( answer ) => {
		const priceValue = parseFloat( answer.price );
		const minor = Number.isFinite( priceValue ) ? Math.round( priceValue * 10 ** base.decimals ) : 0;
		addonMinor += minor;
		let value = 'included';
		if ( minor > 0 ) {
			value = answer.startingPrice ? format( minor ) : `+${ format( minor ) }`;
		}
		lines.push( { label: answer.summaryText || answer.label, value, muted: false } );
	} );
	plain
		.filter( ( answer ) => ! answer.product )
		.forEach( ( answer ) => lines.push( { label: answer.stageLabel, value: answer.stageValue, muted: true } ) );
	const pendingLabel = panelEl.getAttribute( 'data-pending-label' ) || '';
	if ( ! priced.length && pendingLabel ) {
		lines.push( { label: pendingLabel, value: panelEl.getAttribute( 'data-pending-text' ) || '', muted: true } );
	}

	const withEffect = [ ...priced, ...plain ]
		.filter( ( answer ) => answer.effect )
		.sort( ( a, b ) => a.stepIndex - b.stepIndex )
		.pop();

	return {
		meta,
		lines,
		totalMinor: base.priceMinor !== null ? base.priceMinor + addonMinor : null,
		effect: withEffect ? withEffect.effect : '',
		effectLabel: withEffect ? withEffect.label : '',
	};
}
