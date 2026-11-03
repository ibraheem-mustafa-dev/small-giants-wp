/**
 * Editor-canvas mirrors for the post grid's wrapper and card paint.
 *
 * render.php hands the block's width, border and radius to the shared container
 * wrapper (which caps the content band) and writes the card gradient as a
 * custom property; the canvas has no server render, so these build the same
 * values for the previewed device tier. Editor-only: the front end carries no
 * inline style.
 *
 * @package SGS\Blocks
 */
import {
	resolveResponsiveTier,
	resolveContentWidthPreview,
	contentBandPreview,
	wrapperBorderPreview,
	isCssGradient,
} from '../../utils';
import { resolveColourToken } from '../../components';

/**
 * Root style and content band for the post grid canvas.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {{rootStyle: Object, bandStyle: Object, hasBandProps: boolean}} Styles.
 */
export function postGridWrapperPreview( attributes, tier, palette ) {
	const rootStyle = wrapperBorderPreview( attributes, tier, palette );
	const maxWidth = resolveResponsiveTier( attributes.maxWidth, tier )?.value;
	if ( maxWidth ) {
		rootStyle.maxWidth = maxWidth;
	}
	const { hasBandProps, bandStyle } = contentBandPreview( {
		contentWidth: resolveContentWidthPreview( resolveResponsiveTier( attributes.contentWidth, tier )?.value ),
		bandPadding: {},
		style: rootStyle,
		layout: 'stack',
	} );
	return { rootStyle, bandStyle, hasBandProps };
}

/**
 * The card gradient custom property style.css reads (`--sgs-card-bg-gradient`).
 *
 * @param {string} gradient `cardBgColourGradient` value.
 * @return {Object} Style fragment; empty unless the value is a real gradient.
 */
export function cardGradientPreview( gradient ) {
	return isCssGradient( gradient )
		? { '--sgs-card-bg-gradient': gradient }
		: {};
}

/**
 * The filter chip custom properties render-scoped-css.php prints on the block root.
 *
 * @param {Object} attributes Block attributes.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style fragment; unset attributes add nothing so style.css keeps its defaults.
 */
export function filterChipVarsPreview( attributes, palette ) {
	const vars = {};
	const colour = ( prop, value ) => {
		if ( value ) {
			vars[ prop ] = resolveColourToken( value, palette );
		}
	};
	const length = ( prop, value ) => {
		if ( value ) {
			vars[ prop ] = value;
		}
	};
	colour( '--sgs-pg-filter-border', attributes.filterBorderColour );
	colour( '--sgs-pg-filter-bg', attributes.filterBackground );
	colour( '--sgs-pg-filter-text', attributes.filterTextColour );
	colour( '--sgs-pg-filter-active-bg', attributes.filterActiveBackground );
	colour( '--sgs-pg-filter-active-text', attributes.filterActiveTextColour );
	colour( '--sgs-pg-filter-active-border', attributes.filterActiveBorderColour );
	length( '--sgs-pg-filter-bw', attributes.filterBorderWidth );
	length( '--sgs-pg-filter-active-bw', attributes.filterActiveBorderWidth );
	length( '--sgs-pg-filter-min-h', attributes.filterMinHeight );
	const weight = parseInt( attributes.filterFontWeight, 10 );
	if ( weight >= 100 && weight <= 900 ) {
		vars[ '--sgs-pg-filter-weight' ] = weight;
	}
	return vars;
}

/**
 * Filter terms in the order filterOrder asks for (name, count, or the custom id list).
 *
 * @param {Array}  terms     Taxonomy term records.
 * @param {string} order     filterOrder value.
 * @param {Array}  termOrder filterTermIds ids.
 * @return {Array} Sorted copy.
 */
export function orderFilterTerms( terms, order, termOrder ) {
	const list = [ ...( terms || [] ) ];
	const byName = ( a, b ) => a.name.localeCompare( b.name );
	if ( 'count' === order ) {
		return list.sort( ( a, b ) => ( b.count - a.count ) || byName( a, b ) );
	}
	if ( 'term_order' === order ) {
		const rank = new Map( ( termOrder || [] ).map( ( id, i ) => [ id, i ] ) );
		return list.sort( ( a, b ) => ( ( rank.get( a.id ) ?? 1e9 ) - ( rank.get( b.id ) ?? 1e9 ) ) || byName( a, b ) );
	}
	return list.sort( byName );
}
