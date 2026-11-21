// The clone difference ledger's stage judge (tools/clone-ledger.mjs): each difference between a cloned element and its draft
// element is put down to exactly one pipeline stage, with the record row that shows it. Only saved records and the two page
// reads are consulted: the draft inventory, the proposal, the skeleton, the Fill report, the built tree, the apply plan.
// Pure functions: no browser, no site, no file reads.
import { sameValue } from '../../parity/lib/compare.mjs';

// The closed set of stages, in the order they are tried for a paired element's difference (no-node, other-block and
// live-only are decided for unpaired elements and the surface's own root, lib/ledger-pairs.mjs).
export const STAGES = [ 'draft-read', 'no-node', 'other-block', 'not-read-by-fill', 'judged-equal', 'unmapped', 'custom-css', 'written-not-built', 'apply-failed', 'block-render', 'content', 'live-only' ];

// The Fill properties that can answer a difference key. A box key (x, y relative to the enclosing pair, w, h) is answered
// by any setting that moves or sizes the box; a presence key by display; a motion key by the animation properties.
const BOX_PROPS = {
	w: [ 'width', 'max-width', 'min-width', 'flex-basis', 'flex-grow', 'flex-shrink', 'grid-template-columns', 'padding-left', 'padding-right' ],
	h: [ 'height', 'min-height', 'max-height', 'aspect-ratio', 'padding-top', 'padding-bottom' ],
	x: [ 'left', 'right', 'margin-left', 'margin-right', 'justify-content', 'column-gap', 'text-align' ],
	y: [ 'top', 'bottom', 'margin-top', 'margin-bottom', 'row-gap', 'align-items' ],
};
BOX_PROPS[ 'paint-w' ] = BOX_PROPS.w;
BOX_PROPS[ 'paint-h' ] = BOX_PROPS.h;
const MOTION_PROPS = [ 'motion', 'animation-name', 'animation-duration', 'animation-delay', 'animation-timing-function', 'animation-iteration-count', 'animation', 'motion root', 'transform' ];

// Difference keys that are the element's words, picture or link.
export const CONTENT_KEYS = new Set( [ 'text', 'text presence', 'img', 'href' ] );

// The Fill properties a difference key asks about.
export function propsFor( key ) {
	if ( BOX_PROPS[ key ] ) {
		return BOX_PROPS[ key ];
	}
	if ( [ 'shown', 'element' ].includes( key ) ) {
		return [ 'display', 'visibility' ];
	}
	if ( [ 'keyframes', 'animation', 'running-after-action' ].includes( key ) ) {
		return MOTION_PROPS;
	}
	if ( 'border-radius' === key ) {
		return [ 'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];
	}
	return [ key ];
}

// The CSS properties one Fill write row covers: its `prop` (a comma list for a combined write) and its `covers`.
const writeProps = ( w ) => [ ...String( w.prop || '' ).split( /,\s*/ ), ...( Array.isArray( w.covers ) ? w.covers : String( w.covers || '' ).split( /,\s*/ ) ) ].filter( Boolean );
// The settings Fill writes as custom CSS: a width ladder, a step ladder or a residual rule (a ladder written into a setting
// that holds a box per device is that setting, not custom CSS).
export const CUSTOM_CSS_ATTRS = new Set( [ 'sgsCustomCss', 'sgsCustomCssId', 'sgsCustomCssNote' ] );
// Settled reasons that hand the value to custom CSS.
const CUSTOM_CSS_SETTLED = new Set( [ 'residual-css', 'width-ladder' ] );

// The Fill report's rows indexed by node ref: { writes, unmapped, settled, alreadyHeld, customCssGaps, residual, unread }.
export function fillIndex( report ) {
	const by = new Map();
	const add = ( sec, row ) => {
		const ref = row.node;
		if ( ! by.has( ref ) ) {
			by.set( ref, { writes: [], unmapped: [], settled: [], alreadyHeld: [], customCssGaps: [], residual: [], unread: [] } );
		}
		by.get( ref )[ sec ].push( row );
	};
	for ( const sec of [ 'writes', 'unmapped', 'settled', 'alreadyHeld', 'customCssGaps', 'unread' ] ) {
		( report?.[ sec ] || [] ).forEach( ( r ) => add( sec, r ) );
	}
	( report?.residualCss?.rules || [] ).forEach( ( r ) => add( 'residual', r ) );
	return by;
}

const EMPTY = { writes: [], unmapped: [], settled: [], alreadyHeld: [], customCssGaps: [], residual: [], unread: [] };

// Rows of one section for the node that name one of `props`, the target's own slot first: [ rows at the slot ] when any,
// else the node's rows at any slot (a property read on the root and written on an inner element, `readSlot`). Rows come in
// the order of `props` (the property the difference is most directly about first), then report order.
function rowsFor( list, props, slot, nameOf ) {
	const rank = ( r ) => Math.min( ...nameOf( r ).map( ( p ) => props.indexOf( p ) ).filter( ( i ) => i >= 0 ) );
	const hit = list.filter( ( r ) => nameOf( r ).some( ( p ) => props.includes( p ) ) );
	const own = hit.filter( ( r ) => ( r.slot ?? r.part ?? '' ) === slot || ( r.readSlot ?? null ) === slot );
	return ( own.length ? own : hit ).map( ( r, i ) => [ rank( r ), i, r ] ).sort( ( a, b ) => a[ 0 ] - b[ 0 ] || a[ 1 ] - b[ 1 ] ).map( ( x ) => x[ 2 ] );
}

// Whether a row with `widths` (or `answers`) speaks for width w: an empty list speaks for every width.
const atWidth = ( r, w ) => {
	const lists = [ r.widths, r.answers ].filter( ( l ) => Array.isArray( l ) && l.length );
	return ! lists.length || lists.some( ( l ) => l.includes( w ) );
};

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );
const trim = ( row ) => JSON.parse( JSON.stringify( row, ( k, v ) => ( 'string' === typeof v && v.length > 400 ? `${ v.slice( 0, 400 ) }…` : v ) ) );

// The stage of one difference of a paired element. diff: { key, width, draft, live, pseudo? }; target: { ref, slot, block,
// draftKey, top }; ctx: { fill: fillIndex(), built: Map ref -> attributes, apply: Map ref -> plan rows, inventory: Map key ->
// element, fillProps: Set of the properties Fill reads, live: { selector, box, parent? } }. Returns { stage, proof }.
export function stageOf( diff, target, ctx ) {
	const { key, width } = diff;
	const rows = ctx.fill.get( target.ref ) || EMPTY;
	const liveAt = ctx.live || null;
	if ( CONTENT_KEYS.has( key ) ) {
		const un = rows.unmapped.filter( ( r ) => [ 'text', 'src', 'href', 'link' ].includes( r.property ) );
		const attrs = ctx.built.get( target.ref ) || null;
		return { stage: 'content', proof: { record: un.length ? 'fill-report.unmapped' : 'built tree', rows: un.slice( 0, 2 ).map( trim ), attributes: attrs ? Object.fromEntries( Object.entries( attrs ).filter( ( [ k, v ] ) => 'string' === typeof v && /text|content|label|title|url|href|src|alt|heading/i.test( k ) ).map( ( [ k, v ] ) => [ k, v.slice( 0, 160 ) ] ) ) : null } };
	}
	// The element kind is the block's markup: a block that prints another kind with no setting naming one is its render.
	if ( 'tag' === key ) {
		const attrs = ctx.built.get( target.ref ) || {};
		const named = Object.keys( attrs ).filter( ( k ) => /^(tagName|level|tag|htmlTag)$/.test( k ) );
		return { stage: 'block-render', proof: { record: 'built tree', why: named.length ? `the built node names its element kind (${ named.map( ( k ) => `${ k }: ${ JSON.stringify( attrs[ k ] ) }` ).join( ', ' ) }) and the live element is another` : 'no setting of the built node names an element kind: the block\'s markup prints this one', live: liveAt } };
	}
	// The surface's own root sits where the site puts it: its offset is the theme's or the template's.
	if ( target.top && [ 'x', 'y' ].includes( key ) ) {
		return { stage: 'live-only', proof: { record: 'live page', why: 'the surface root is placed by the site (template or theme) around it, not by a setting of this surface', live: liveAt } };
	}
	// The inventory's own reading of the same element, where it holds the property.
	const inv = target.draftKey ? ctx.inventory.get( target.draftKey ) : null;
	const invVal = ! diff.pseudo ? inv?.resolved?.[ width ]?.[ key ] : undefined;
	if ( undefined !== invVal && undefined !== diff.draft && ! sameValue( key, String( invVal ), String( diff.draft ), 0.5 ) ) {
		return { stage: 'draft-read', proof: { record: 'inventory.resolved', key: target.draftKey, width, inventory: invVal, draftLive: diff.draft } };
	}
	const props = propsFor( key );
	const failed = ( ctx.apply.get( target.ref ) || [] ).filter( ( r ) => [ 'no-effect', 'failed' ].includes( r.status ) && ( props.includes( r.prop ) || ( r.writes || [] ).length ) );
	if ( failed.length ) {
		return { stage: 'apply-failed', proof: { record: 'apply plan', rows: failed.slice( 0, 2 ).map( trim ) } };
	}
	const writes = rowsFor( rows.writes, props, target.slot, writeProps );
	if ( writes.length ) {
		const atW = writes.filter( ( w ) => atWidth( w, width ) );
		const use = atW.length ? atW : writes;
		const attrs = ctx.built.get( target.ref );
		// A setting written in several steps (padding side by side) ends at its last write: that value is what the build
		// must hold.
		const last = ( attr ) => rows.writes.filter( ( w ) => w.attr === attr ).at( -1 );
		const lost = use.map( ( w ) => last( w.attr ) || w ).find( ( w ) => ! attrs || ! same( attrs[ w.attr ], w.after ) );
		if ( lost ) {
			return { stage: 'written-not-built', proof: { record: 'fill-report.writes', row: trim( lost ), built: attrs ? attrs[ lost.attr ] ?? null : 'the built tree holds no such node' } };
		}
		const css = use.find( ( w ) => CUSTOM_CSS_ATTRS.has( w.attr ) );
		if ( css ) {
			return { stage: 'custom-css', proof: { record: 'fill-report.writes', row: trim( css ), shown: false, live: liveAt } };
		}
		return { stage: 'block-render', proof: { record: 'fill-report.writes + built tree', rows: use.slice( 0, 3 ).map( trim ), built: Object.fromEntries( use.slice( 0, 3 ).map( ( w ) => [ w.attr, attrs[ w.attr ] ] ) ), live: liveAt } };
	}
	const gaps = [ ...rows.customCssGaps.filter( ( r ) => ( r.properties || [] ).some( ( p ) => props.includes( p ) ) ), ...rows.residual.filter( ( r ) => ( r.declarations || [] ).some( ( d ) => props.includes( d.split( ':' )[ 0 ].trim() ) ) ) ];
	if ( gaps.length ) {
		return { stage: 'custom-css', proof: { record: rows.customCssGaps.includes( gaps[ 0 ] ) ? 'fill-report.customCssGaps' : 'fill-report.residualCss.rules', row: trim( gaps[ 0 ] ), shown: false, live: liveAt } };
	}
	const un = rowsFor( rows.unmapped, props, target.slot, ( r ) => [ r.property ] );
	if ( un.length ) {
		const top = un.filter( ( r ) => r.property === un[ 0 ].property );
		return { stage: 'unmapped', proof: { record: 'fill-report.unmapped', reason: un[ 0 ].reason, ...( top.length > 1 ? { reasons: top.slice( 0, 4 ).map( ( r ) => r.reason ) } : {} ), row: trim( un[ 0 ] ) } };
	}
	const st = rowsFor( rows.settled, props, target.slot, ( r ) => [ r.property ] ).filter( ( r ) => atWidth( r, width ) );
	if ( st.length ) {
		const css = st.find( ( r ) => CUSTOM_CSS_SETTLED.has( r.reason ) );
		if ( css ) {
			return { stage: 'custom-css', proof: { record: 'fill-report.settled', row: trim( css ), shown: false, live: liveAt } };
		}
		return { stage: 'judged-equal', proof: { record: 'fill-report.settled', reason: st[ 0 ].reason, baseline: st[ 0 ].detail ?? null, value: st[ 0 ].value, draftLive: diff.draft, live: diff.live, row: trim( st[ 0 ] ) } };
	}
	const held = rowsFor( rows.alreadyHeld, props, target.slot, ( r ) => [ r.property ] );
	if ( held.length ) {
		return { stage: 'judged-equal', proof: { record: 'fill-report.alreadyHeld', reason: held[ 0 ].reason, baseline: held[ 0 ].detail ?? null, value: held[ 0 ].value, draftLive: diff.draft, live: diff.live, row: trim( held[ 0 ] ) } };
	}
	const unread = rows.unread.filter( ( r ) => ( r.slot ?? '' ) === target.slot && 'element' === r.kind );
	if ( unread.length ) {
		return { stage: 'not-read-by-fill', proof: { record: 'fill-report.unread', list: 'the node\'s draftSlots', reason: unread[ 0 ].reason } };
	}
	const readable = props.some( ( p ) => ctx.fillProps.has( p ) );
	return { stage: 'not-read-by-fill', proof: readable
		? { record: 'fill-report', list: 'the Fill report of this node (writes, settled, unmapped, alreadyHeld, customCssGaps, residualCss)', reason: `no row names ${ props.join( ', ' ) } on ${ target.ref }${ target.slot ? ` ${ target.slot }` : '' }` }
		: { record: 'lib/fill-read.mjs::PROPS', list: 'lib/fill-read.mjs::PROPS', reason: `${ key } is not among the properties Fill reads` } };
}

// The stage of a draft element no skeleton node or slot reads, from its proposal row: `other-block` when the row puts it
// into a node's block (absorbed) and that block has no part for it, `no-node` otherwise (a removed wrapper, a row that names a
// block no node holds, or no row). row: the proposal row or null; owner: the absorbing node's { ref, block } or null.
export function unpairedStage( row, owner, problems = [] ) {
	const out = unpairedVerdict( row, owner );
	if ( problems.length ) {
		out.proof.problems = problems.slice( 0, 3 ).map( ( p ) => p.slice( 0, 400 ) );
	}
	return out;
}

function unpairedVerdict( row, owner ) {
	if ( ! row ) {
		return { stage: 'no-node', proof: { record: 'proposal', why: 'the proposal holds no row for this element' } };
	}
	const keep = { rule: row.rule ?? null, action: row.action ?? null, block: row.block ?? null, reason: row.reason ?? null };
	if ( 'absorbed' === row.action && row.into ) {
		return { stage: 'other-block', proof: { record: 'proposal', ...keep, into: row.into, drawnBy: owner || null } };
	}
	return { stage: 'no-node', proof: { record: 'proposal', ...keep, why: row.block && 'None' !== String( row.block ) ? `the row names ${ row.block }, and no skeleton node or slot holds this element` : 'the row draws no block' } };
}
