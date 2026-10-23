// A per-width difference no single setting holds (Spec 48 FR-48-50, FR-48-8) for Fill. The generic resolver refuses a
// one-value setting whose draft value differs by width (lib/resolve.mjs::ONE_VALUE_EVERY_WIDTH) and a value the setting's
// enum lacks (`normal` for justify-content: "is not one of"). This pass takes those gap rows, whatever the block, property or
// state, and tries four rungs in order; a value is refused only when no rung holds it:
//   1. Equal in effect. The draft's values at every width are compared by what they do (a `normal` justify-content in a flex or
//      grid container is the start value; `space-between` with at most one visible in-flow child is the start value, and
//      `space-around` / `space-evenly` with one child centre it). When one value does at every width what the draft does,
//      it is written through the generic resolver, which formats it and checks it against the setting.
//   2. A tier-shaped sibling: another setting of the block for the same property that paints the same element and holds a
//      value per device (a tier object, or Tablet / Mobile siblings): the value of each device, written where it changes.
//   3. The block's own breakpoint setting: a block that draws its own narrow alternative under a width (the navigation's
//      collapse point) takes the wide value; the narrow one is that alternative.
//   4. A scoped `sgsCustomCss` @media rule on the instance (lib/fill-width-gate.mjs::scopedCssPuts), one rule per width
//      range, labelled in `sgsCustomCssNote`. Where the draft's width threshold (read by the sweep) lies within 5% of a tier
//      (768, 1024) it snaps to the tier, with a `breakpoint-snap` divergence-ledger entry.
// Which blocks and settings take part comes from the framework DB and the block's calibration, never from a list.
// Returns { writes, unmapped (the rows left), notes, ledger }.
import { ONE_VALUE_EVERY_WIDTH, LOOSE } from './resolve.mjs';
import { siblings } from './db.mjs';
import { setAttr } from './tree.mjs';
import { mediaRule, scopedCssPuts, snapThreshold, snapEntry, ownBreakpoint, collapseAttributes } from './fill-width-gate.mjs';
import { WIDTHS, TIER_OF, rowTarget, rowValues, reresolve, commit } from './fill-regap.mjs';

// The gap rows this pass reads: the one-value-every-width shape gap, and a value the setting's enum does not hold.
export const isLadderRow = ( row ) => ONE_VALUE_EVERY_WIDTH === row.code || / is not one of /.test( row.reason ?? '' );

const STATE_PSEUDO = { hover: ':hover', focus: ':focus-visible', 'focus-visible': ':focus-visible', active: ':active', 'focus-within': ':focus-within' };
const BOX = /(flex|grid)$/;
const norm = ( v ) => String( v ).trim().toLowerCase().replace( /\s+/g, ' ' );

// What a value does, as one canonical word, in the element's context { display, children } (children: the visible in-flow
// children, or null when unknown). Two values with the same effect are one value.
export function effectOf( prop, value, { display = '', children = null } = {} ) {
	const v = norm( value );
	const laid = BOX.test( display );
	if ( 'justify-content' === prop ) {
		if ( laid && [ 'normal', 'start', 'flex-start' ].includes( v ) ) {
			return 'start';
		}
		if ( laid && [ 'end', 'flex-end' ].includes( v ) ) {
			return 'end';
		}
		if ( 'space-between' === v && null !== children && children <= 1 ) {
			return 'start';
		}
		if ( [ 'space-around', 'space-evenly' ].includes( v ) && null !== children && children <= 1 ) {
			return 0 === children ? 'start' : 'center';
		}
		return v;
	}
	if ( [ 'align-items', 'align-self', 'align-content', 'justify-items', 'justify-self' ].includes( prop ) && laid ) {
		return { normal: 'stretch', 'flex-start': 'start', 'flex-end': 'end' }[ v ] ?? v;
	}
	return v;
}

// The CSS keyword an effect is written as.
const KEYWORD = { start: 'flex-start', end: 'flex-end' };
const keywordOf = ( effect ) => KEYWORD[ effect ] ?? effect;
// Values that can stand for an effect, tried in this order.
const STANDS_FOR = { start: [ 'flex-start', 'start', '' ], end: [ 'flex-end', 'end' ], stretch: [ 'stretch', '' ] };

// The visible in-flow children of a skeleton node at a width, from the children's own reads; null when it has none.
function visibleChildren( { nodes, reads }, rec, w ) {
	if ( ! rec.children.length ) {
		return null;
	}
	return rec.children.filter( ( i ) => {
		const t = nodes[ i ].targets.find( ( x ) => '' === x.slot );
		const r = t ? reads.widths?.[ w ]?.[ t.id ] : null;
		return r && ! r.missing && r.rect && r.rect.w > 0 && r.rect.h > 0 && false !== r.inFlow;
	} ).length;
}

// Whether a calibrated setting paints (or is reached at) an element path.
const paints = ( cal, attr, slot ) => {
	const c = cal?.settings?.[ attr ];
	return !! c && [ ...( c.slots || ( undefined !== c.slot ? [ c.slot ] : [] ) ), ...( c.reaches || [] ) ].some( ( p ) => LOOSE( p ) === LOOSE( slot ) );
};

// The width a change between two read widths happens at: the first sweep step (every 16px) after the lower width that
// differs from the value there, else the tier boundary the pair sits across.
function thresholdBetween( series, a, b ) {
	if ( series?.length ) {
		const base = [ ...series ].reverse().find( ( s ) => s.width <= a )?.value;
		const step = series.find( ( s ) => s.width > a && s.width <= b && norm( s.value ) !== norm( base ) );
		if ( step ) {
			return step.width;
		}
	}
	return a < 768 ? 768 : 1024;
}

const SAFE_VALUE = /^[\w\s#%.,()+/"'-]*$/;
const SAFE_SLOT = /^[\w\s.#>:()+~[\]="'*-]*$/;

// Rung 4: the scoped @media rules. Returns { ranges, css, snaps } or null when the value cannot be written as safe CSS.
function cssRules( { prop, slot, state, widths, values, series } ) {
	const pseudo = state ? STATE_PSEUDO[ state ] : '';
	if ( undefined === pseudo || ! /^[a-z-]+$/.test( prop ) || ! SAFE_SLOT.test( slot ) || widths.some( ( w ) => /url\(|expression|javascript|@import/i.test( values[ w ] ) || ! SAFE_VALUE.test( values[ w ] ) ) ) {
		return null;
	}
	const snaps = [];
	const cuts = widths.slice( 1 ).map( ( w, i ) => {
		const raw = thresholdBetween( series, widths[ i ], w );
		const s = snapThreshold( raw );
		s && snaps.push( { draft: raw, tier: s.tier, distance: s.distance } );
		return s ? s.tier : raw;
	} );
	const edges = [ 0, ...cuts, Infinity ];
	const spans = widths.map( ( w, i ) => ( { range: [ edges[ i ], edges[ i + 1 ] ], value: values[ w ] } ) ).filter( ( s ) => s.range[ 0 ] < s.range[ 1 ] );
	const merged = spans.reduce( ( out, s ) => ( out.length && out.at( -1 ).value === s.value && out.at( -1 ).range[ 1 ] === s.range[ 0 ] ? ( out.at( -1 ).range[ 1 ] = s.range[ 1 ], out ) : [ ...out, { range: [ ...s.range ], value: s.value } ] ), [] );
	const sel = `&${ slot ? ` ${ slot }` : '' }${ pseudo || '' }`;
	return { ranges: merged, css: merged.map( ( s ) => mediaRule( s.range, `${ sel } { ${ prop }: ${ s.value }; }` ) ).join( ' ' ), snaps };
}

const rangeText = ( [ lo, hi ] ) => ( Infinity === hi ? `${ lo }px and up` : `${ lo }-${ hi - 1 }px` );

export function widthLadderWrites( { nodes, flat, refOf, reads, db, unmapped, calFor = () => null, snapshot = null, scope = '', entries = [], date = new Date().toISOString().slice( 0, 10 ), collapse = collapseAttributes(), resolver } ) {
	const out = { writes: [], unmapped: [], notes: [], ledger: [] };
	const ctx = { reads, db, calFor, snapshot };
	for ( const row of unmapped ) {
		const hit = isLadderRow( row ) ? rowTarget( { nodes, flat, refOf }, row ) : null;
		const done = hit ? ladder( { row, hit, nodes, flat, ctx, out, scope, entries, date, collapse, resolver } ) : false;
		done || out.unmapped.push( row );
	}
	return out;
}

function ladder( { row, hit, nodes, flat, ctx, out, scope, entries, date, collapse, resolver } ) {
	const { rec, target } = hit;
	const { reads, db } = ctx;
	const node = flat[ rec.index ];
	const prop = row.property;
	const state = row.state ?? null;
	const slot = row.slot ?? '';
	const raw = rowValues( row, reads, target );
	const widths = WIDTHS.filter( ( w ) => undefined !== raw[ w ] );
	if ( ! widths.length ) {
		return false;
	}
	const env = ( w ) => ( { display: reads.widths?.[ w ]?.[ target.id ]?.layoutDisplay || reads.widths?.[ w ]?.[ target.id ]?.styles?.display || '', children: visibleChildren( { nodes, reads }, rec, w ) } );
	const effs = Object.fromEntries( widths.map( ( w ) => [ w, effectOf( prop, raw[ w ], env( w ) ) ] ) );
	const varies = new Set( Object.values( effs ) ).size > 1;
	const ask = ( draft, p = prop ) => reresolve( { rec, node, target, slot, prop: p, draft, ctx, state, resolver } );
	const took = ( res, how, note ) => {
		commit( out, { rec, node, row, prop, res, how, note } );
		out.notes.push( `${ row.node } ${ rec.name }${ slot ? ` (${ slot })` : '' } ${ prop }${ state ? ` ${ state }` : '' }: ${ note }` );
		return true;
	};
	// Rung 1: one value that does at every width what the draft does.
	const pool = [ ...new Set( [ ...[ ...widths ].reverse().map( ( w ) => raw[ w ] ), ...widths.flatMap( ( w ) => STANDS_FOR[ effs[ w ] ] ?? [] ), ...Object.values( effs ) ] ) ];
	for ( const cand of pool ) {
		if ( ! widths.every( ( w ) => effectOf( prop, cand, env( w ) ) === effs[ w ] ) ) {
			continue;
		}
		const res = ask( Object.fromEntries( widths.map( ( w ) => [ w, cand ] ) ) );
		if ( 'written' === res.status ) {
			return took( res, 'width-ladder', `the draft's ${ [ ...new Set( widths.map( ( w ) => raw[ w ] ) ) ].join( ' / ' ) } does the same as "${ cand }" at every width; written as that one value` );
		}
	}
	if ( ! varies ) {
		return false;
	}
	const values = Object.fromEntries( widths.map( ( w ) => [ w, keywordOf( effs[ w ] ) ] ) );
	// Rung 2: a tier-shaped setting painting the same element.
	const cal = ctx.calFor( rec.name );
	const tiered = db.prepare( "SELECT attr_name, css_property, tier_shape FROM block_attributes WHERE block_slug = ? AND tier_shape IN ('tier_object', 'flat_sibling') AND css_state IS ?" ).all( rec.name, state )
		.filter( ( r ) => r.css_property.split( ',' ).map( ( x ) => x.trim() ).includes( prop ) && paints( cal, r.attr_name.replace( /(Tablet|Mobile)$/, '' ), slot ) );
	if ( tiered.length ) {
		const r = tiered[ 0 ];
		const tiers = {};
		let carried = null;
		for ( const w of [ ...widths ].reverse() ) {
			if ( values[ w ] !== carried ) {
				tiers[ TIER_OF[ w ] ] = values[ w ];
				carried = values[ w ];
			}
		}
		const writes = 'flat_sibling' === r.tier_shape
			? Object.entries( tiers ).map( ( [ t, value ] ) => ( { attr: siblings( db, rec.name, r.attr_name ).find( ( s ) => s.css_tier === t )?.attr_name, value, merge: 'replace' } ) )
			: [ { attr: r.attr_name, value: tiers, merge: 'deep' } ];
		if ( writes.every( ( w ) => w.attr ) ) {
			return took( { writes, included: Object.fromEntries( widths.map( ( w ) => [ w, true ] ) ) }, 'width-ladder', `${ r.attr_name } holds a value per device, so the draft's ${ widths.map( ( w ) => `${ values[ w ] } at ${ w }` ).join( ', ' ) } is written there` );
		}
	}
	// Rung 3: the block's own breakpoint draws the narrow alternative.
	const own = ownBreakpoint( db, rec.name, collapse );
	const point = own ? node.attributes?.[ own ] : null;
	const distinct = [ ...new Set( widths.map( ( w ) => values[ w ] ) ) ];
	if ( own && Number.isFinite( point ) && 2 === distinct.length ) {
		const wide = values[ widths.at( -1 ) ];
		const split = widths.findIndex( ( w ) => values[ w ] === wide && widths.slice( widths.indexOf( w ) ).every( ( x ) => values[ x ] === wide ) );
		if ( split > 0 && widths[ split - 1 ] < point && point <= widths[ split ] ) {
			const res = ask( Object.fromEntries( widths.map( ( w ) => [ w, wide ] ) ) );
			if ( 'written' === res.status ) {
				return took( res, 'width-ladder', `the block draws its own narrow alternative under ${ own } = ${ point }px, so the setting holds the wide value ${ wide }` );
			}
		}
	}
	// Rung 4: a scoped @media rule.
	const series = reads.sweep?.[ target.id ]?.[ prop ];
	const css = cssRules( { prop, slot, state, widths, values, series } );
	if ( ! css ) {
		return false;
	}
	for ( const s of css.snaps ) {
		const e = snapEntry( { scope, ref: row.node, snap: s, entries: [ ...entries, ...out.ledger ], date } );
		e && out.ledger.push( e );
	}
	const label = `Width ladder ${ prop }${ state ? ` (${ state })` : '' }: ${ css.ranges.map( ( s ) => `${ rangeText( s.range ) } ${ s.value }` ).join( ', ' ) }`;
	const puts = scopedCssPuts( node, { css: css.css, index: rec.index, why: `width ladder (${ prop })`, label } );
	for ( const x of puts ) {
		const { before, after } = setAttr( node, { attr: x.attr, value: x.value } );
		out.writes.push( { node: row.node, index: rec.index, block: rec.name, slot: '', prop: x.prop, attr: x.attr, before, after, widths: [], how: 'width-gate' } );
	}
	out.notes.push( `${ row.node } ${ rec.name }${ slot ? ` (${ slot })` : '' } ${ prop }: no setting holds ${ widths.map( ( w ) => `${ raw[ w ] } at ${ w }` ).join( ', ' ) }; written as a scoped @media rule in Additional CSS (${ css.ranges.map( ( s ) => `${ rangeText( s.range ) } ${ s.value }` ).join( ', ' ) })` );
	return true;
}
