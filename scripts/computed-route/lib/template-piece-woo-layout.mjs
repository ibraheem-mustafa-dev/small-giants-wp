// The layout around WooCommerce's working block on the cart and checkout templates (Spec 48 FR-48-87; data/template-pieces.json
// kind `woo-layout`). The skeleton placed `core/post-content` (the page's own Cart or Checkout block) at the draft's commerce
// region (lib/skeleton-commerce-region.mjs::commerceRegion). That region is the element laying out the form beside the order
// summary; WooCommerce's block draws both columns itself, so where every part the region lays out is one WooCommerce's block
// draws, the block stands in for the whole layout element:
//   - every node the skeleton built from an element inside the region is dropped (a static imitation of a part the block
//     draws: the phone's "show order summary" toggle and its total), and the block's width variants that name such an element;
//   - the block is marked `draftStandsFor: { tpl: <region> }`, so Fill counts the region's element as the block's own and no
//     wrapper reads the region's column template as its layout (lib/region-stand-in.mjs);
//   - the head of the form column that is the draft's own content (an eyebrow and the page's heading: plain text and headings
//     with words of their own, before anything else) is kept as the draft's own blocks directly above the block, in the
//     draft's order.
// Each part is told by what it is, from the fact record and the draft's logic, never by its words:
//   - form              holds a checkout entry field: a field the visitor types into (no tick, choice or button) that is an
//                       email or phone field or carries a name, address or card autocomplete token (rules.commerceRegion.
//                       checkoutEntry, the tokens the region itself is found by);
//   - order summary     holds no entry field and shows a currency amount (rules.commerceRegion.money); a discount code box
//                       in it is no entry field;
//   - duplicate summary holds no entry field and loops over a list an order summary loops over (the phone's second copy);
//   - summary toggle    holds no entry field and holds a control whose handler opens a state key that a summary's condition
//                       reads (lib/skeleton-handler-opens.mjs::handlerOpens, the condition's `logic.via`);
//   - in the form column's head: an express-payment group (two or more buttons that neither submit the form nor run a
//     handler: a wallet button's work is its payment provider's) and a divider (an element whose own words sit between two
//     or more empty boxes) are WooCommerce's block's own; a heading and plain text before it are the draft's.
// A region holding any other part is left as it is, with a note naming the part.
// Outside the region, a heading or text holding a piece whose words are a count of the list the region's lines loop over (the
// basket's `{{ count }}`, `items.reduce( ( a, x ) => a + x.qty, 0 )` over the `items` the lines loop) is the live basket count
// (basketCounts): the node becomes a row holding its own words and an `sgs/text` drawing the "Basket count" format
// (`<span class="sgs-basket-count">`, filled by src/shared/cart-live/basket-count.js), which reads the piece's look. The row
// has no draft element, so its gap and alignment are a handover row (a skeleton carries no style value).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventoryModel } from './skeleton-model.mjs';
import { commerceRegion } from './skeleton-commerce-region.mjs';
import { fingerprintOf } from './identity.mjs';
import { handlerOpens } from './skeleton-handler-opens.mjs';
import { templateKeyOf } from './fact-key.mjs';
import { countedDecls, listDecls, logicOf } from './shop-parts-logic.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const DECISIONS = path.resolve( HERE, '..', 'data', 'skeleton-decisions.json' );
export const regionRule = () => JSON.parse( fs.readFileSync( DECISIONS, 'utf8' ) ).rules.commerceRegion;

const NOT_TYPED = [ 'checkbox', 'radio', 'hidden', 'submit', 'button', 'reset', 'image', 'file', 'range', 'color' ];
const CONDITIONS = [ 'sc-if', 'sc-else' ];
const CONSTRUCTS = [ ...CONDITIONS, 'sc-for', 'dc-import', 'template' ];
const CONTROLS = [ 'a', 'button', 'input', 'select', 'textarea', 'label', 'details', 'summary' ];
const ws = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const nOf = ( key ) => Number( String( key ).split( '/' ).pop().replace( /#.*$/, '' ) );

// The fact record's template tree of one component, with the reads this builder makes on it.
export function templateView( facts, component, rule = regionRule() ) {
	const all = Object.values( facts?.elements || {} ).map( ( e ) => e.template ).filter( ( t ) => t?.component === component );
	const byKey = Object.fromEntries( all.map( ( t ) => [ t.key, t ] ) );
	const children = ( key ) => all.filter( ( t ) => t.parent === key ).sort( ( a, b ) => nOf( a.key ) - nOf( b.key ) );
	const below = ( key ) => all.filter( ( t ) => ( t.parentChain || [] ).includes( key ) );
	const typeOf = ( t ) => String( t.attrs?.type ?? '' ).toLowerCase();
	const isField = ( t ) => [ 'input', 'select', 'textarea' ].includes( t.tag ) && ! NOT_TYPED.includes( typeOf( t ) );
	const tokens = new RegExp( rule.checkoutEntry?.autocomplete || '^$', 'i' );
	const isEntry = ( t ) => isField( t ) && ( ( rule.checkoutEntry?.types || [] ).includes( typeOf( t ) ) || tokens.test( String( t.attrs?.autocomplete ?? t.attrs?.autoComplete ?? '' ) ) );
	const via = ( key ) => facts.elements[ key ]?.logic?.via ?? '';
	// Words the template writes as a live value (a text hole), so a copy of them would be a static imitation.
	const liveWords = ( t ) => ( t.holes || [] ).some( ( h ) => ! /^(attr|style):/.test( h.where || '' ) );
	// A button submits when the draft says so, or when it sits in a form and says no other type.
	const submits = ( t ) => 'submit' === typeOf( t ) || ( ! typeOf( t ) && ( t.parentChain || [] ).some( ( k ) => 'form' === byKey[ k ]?.tag ) );
	return { byKey, children, below, isField, isEntry, via, liveWords, submits };
}

// The state keys of a component that an expression reads (`m && S.sumOpen` reads sumOpen).
const keysRead = ( expr, keys ) => keys.filter( ( k ) => new RegExp( `\\.${ k }\\b` ).test( expr ) );

// The region's parts as what they are: [{ kind, key, why }] in the draft's order (kind null: none of the block's parts).
// `parts`: the region's child template elements (a condition or an element each).
export function classifyParts( v, parts, env ) {
	const money = new RegExp( env.rule.money );
	const read = parts.map( ( t ) => {
		const inside = [ t, ...v.below( t.key ) ];
		const shown = inside.map( ( x ) => env.served( x.key ) ).filter( Boolean );
		const top = shown.find( ( e ) => ! shown.includes( env.m.byKey[ e.parentKey ] ) );
		// The conditions the part shows under: the part itself and each one condition wrapping the next.
		const gates = [];
		for ( let c = t; c && CONDITIONS.includes( c.tag ); c = 1 === v.children( c.key ).length ? v.children( c.key )[ 0 ] : null ) {
			gates.push( c );
		}
		return { t, inside, fields: inside.filter( v.isEntry ).length, money: !! top && money.test( String( top.allText ?? env.m.words( top ) ) ), lists: inside.filter( ( x ) => 'sc-for' === x.tag && x.own?.list ).map( ( x ) => x.own.list ), gates: gates.flatMap( ( g ) => keysRead( v.via( g.key ), env.keys ) ) };
	} );
	const summaryLists = new Set( read.filter( ( r ) => ! r.fields && r.money ).flatMap( ( r ) => r.lists ) );
	const twin = ( r ) => ! r.fields && ! r.money && r.lists.find( ( l ) => summaryLists.has( l ) );
	// A control's handler opening a state key another money-showing or twin part shows under.
	const toggles = ( r ) => {
		const shownBy = new Set( read.filter( ( o ) => o !== r && ! o.fields && ( o.money || twin( o ) ) ).flatMap( ( o ) => o.gates ) );
		for ( const ev of r.inside.flatMap( ( x ) => x.events || [] ) ) {
			const opened = /^[A-Za-z_$][\w$]*$/.test( ev.expr || '' ) ? [ ...env.opens( ev.expr ) ].filter( ( k ) => shownBy.has( k ) ) : [];
			if ( opened.length ) {
				return `its control's ${ ev.name } handler ${ ev.expr } opens ${ opened.join( ', ' ) }, which a summary's condition reads`;
			}
		}
		return null;
	};
	return read.map( ( r ) => {
		const key = r.t.key;
		if ( r.fields ) {
			return { kind: 'form', key, why: `holds ${ r.fields } checkout entry field(s)` };
		}
		const toggle = toggles( r );
		if ( toggle ) {
			return { kind: 'summary toggle', key, why: toggle };
		}
		if ( r.money ) {
			return { kind: 'order summary', key, why: 'shows a currency amount and holds no checkout entry field' };
		}
		return twin( r ) ? { kind: 'duplicate summary', key, why: `loops over ${ twin( r ) }, the list an order summary loops over` } : { kind: null, key, why: `<${ r.t.tag }> is no part WooCommerce's block draws` };
	} );
}

// The lists a condition's test counts (`items.length > 0` counts items).
const countedLists = ( expr ) => new Set( [ ...String( expr ?? '' ).matchAll( /([A-Za-z_$][\w$.]*)\.length\b/g ) ].map( ( m ) => m[ 1 ] ) );

// The region's other data branches: the conditions beside the one the region shows under that the block draws in its place.
// The region's nearest condition (`sc-if` on its parent chain) is its data branch when its test counts a list; a sibling
// condition is the other branch when it is the `sc-else` of that branch or its test counts one of the same lists (the
// basket's `empty`, `items.length === 0`, beside `hasItems`, `items.length > 0`): WooCommerce's block draws that state
// too (the Cart block's empty basket). Returns the template keys of the other branches' child elements.
export function otherBranches( v, regionKey ) {
	let gate = null;
	for ( let k = v.byKey[ regionKey ]?.parent; k && ! gate; k = v.byKey[ k ]?.parent ) {
		'sc-if' === v.byKey[ k ]?.tag && ( gate = v.byKey[ k ] );
	}
	const lists = gate ? countedLists( v.via( gate.key ) ) : new Set();
	if ( ! lists.size ) {
		return [];
	}
	const siblings = v.children( gate.parent );
	const at = siblings.indexOf( gate );
	return siblings.filter( ( t, i ) => t !== gate && ( ( 'sc-else' === t.tag && i === at + 1 ) || ( 'sc-if' === t.tag && [ ...countedLists( v.via( t.key ) ) ].some( ( l ) => lists.has( l ) ) ) ) ).flatMap( ( t ) => v.children( t.key ).map( ( c ) => c.key ) );
}

// The head of the form column: [{ t, kind }] in the draft's order, up to the first part holding a field.
function headOf( v, form ) {
	const run = [];
	let stop = false;
	const visit = ( key ) => {
		for ( const t of v.children( key ) ) {
			if ( stop ) {
				return;
			}
			const inside = [ t, ...v.below( t.key ) ];
			const kids = v.children( t.key );
			if ( inside.some( v.isField ) || CONSTRUCTS.includes( t.tag ) ) {
				stop = true;
			} else if ( /^h[1-6]$/.test( t.tag ) ) {
				run.push( { t, kind: 'heading' } );
			} else if ( kids.length >= 2 && kids.every( ( k ) => 'button' === k.tag && ! ( k.events || [] ).length && ! v.submits( k ) ) ) {
				run.push( { t, kind: 'express payment' } );
			} else if ( ws( t.words ) && kids.length >= 2 && kids.every( ( k ) => ! ws( k.words ) && ! v.children( k.key ).length ) ) {
				run.push( { t, kind: 'divider' } );
			} else if ( ws( t.words ) && ! inside.some( ( x ) => CONTROLS.includes( x.tag ) ) ) {
				run.push( { t, kind: 'text' } );
			} else if ( kids.length && ! ws( t.words ) && ! CONTROLS.includes( t.tag ) ) {
				visit( t.key );
			} else {
				run.push( { t, kind: 'other' } );
				stop = true;
			}
		}
	};
	visit( form.key );
	return run;
}

const keyOf = ( node ) => node?.draftRef?.tpl ?? null;

// The pieces outside the region whose words are the count of the region's lines: [{ host, chip, expr }] (template keys), where
// `chip` holds a text hole whose binding counts a variable a list the region loops over is drawn from, and `host` is its parent,
// which has words of its own. `L`: the draft's parsed logic (lib/shop-parts-logic.mjs::logicOf).
export function basketCounts( v, regionKey, L ) {
	const inRegion = ( t ) => t.key === regionKey || ( t.parentChain || [] ).includes( regionKey );
	const lines = new Set( v.below( regionKey ).filter( ( t ) => 'sc-for' === t.tag && t.own?.list ).flatMap( ( t ) => listDecls( L, t.own.list ) ) );
	if ( ! lines.size ) {
		return [];
	}
	return Object.values( v.byKey ).flatMap( ( t ) => {
		const host = v.byKey[ t.parent ];
		if ( inRegion( t ) || ! host || ! ws( String( host.words ?? '' ).replace( /\{\{[^}]*\}\}/g, '' ) ) ) {
			return [];
		}
		const hole = ( t.holes || [] ).find( ( h ) => 'text' === h.where && countedDecls( L, h.expr ).some( ( d ) => lines.has( d ) ) );
		return hole ? [ { host: host.key, chip: t.key, expr: hole.expr } ] : [];
	} );
}

// The row standing for a node whose element holds a basket count: its own words, then the count (or the count first when the
// draft draws it before the words).
function countRow( n, { hostEl, chipEl, expr, m } ) {
	const words = ws( hostEl.words );
	const text = 'sgs/heading' === n.name ? 'content' : 'text';
	const handover = ( n.handover || [] ).filter( ( h ) => ! String( h.detail || '' ).includes( `{{ ${ expr } }}` ) && ! String( h.detail || '' ).includes( `"${ ws( chipEl.words ) }" as a piece of its own` ) );
	const { handover: _drop, ...rest } = n;
	const own = { ...rest, attributes: { ...n.attributes, [ text ]: words }, ...( handover.length ? { handover } : {} ) };
	const chip = { name: 'sgs/text', attributes: { text: '<span class="sgs-basket-count">0</span>' }, draftRef: { tpl: chipEl.key }, draftFingerprint: fingerprintOf( chipEl, m.byKey ), innerBlocks: [] };
	const snippet = String( hostEl.snippet || '' ).replace( /^<[^>]*>/, '' );
	const first = ! ws( snippet.slice( 0, Math.max( 0, snippet.indexOf( '<' ) ) ) );
	// The row has no draft element of its own (the draft sets the count in the heading's line), so no reader writes its gap or
	// cross alignment and a skeleton may carry no style value: they are handed over.
	const line = { owner: 'content-page', kind: 'layout', detail: `the basket count ${ chipEl.key } sits in the line of ${ hostEl.key }'s words (a word space ${ first ? 'after' : 'before' } it, centred on the line by vertical-align): set this row's gap and its items' alignment to match` };
	return { name: 'sgs/container', attributes: { tagName: 'div', layout: 'flex' }, handover: [ line ], innerBlocks: first ? [ chip, own ] : [ own, chip ] };
}

export function place( ctx, piece ) {
	const tree = ctx.tree || [];
	const facts = ctx.factRecord;
	const component = ctx.rootComponent;
	const rule = ctx.rule || regionRule();
	const m = inventoryModel( ctx.inventory || { elements: [] } );
	const region = ctx.region ?? commerceRegion( { m, commerce: ctx.commerce, rule } )?.key ?? null;
	const leave = ( why ) => ( { tree, notes: [ `${ ctx.key }: piece "${ piece.id }" leaves the tree as it is: ${ why }` ] } );
	if ( ! region || ! m.byKey[ region ] ) {
		return leave( 'no commerce region was found on the inventory' );
	}
	if ( ! facts || ! component ) {
		return leave( 'no fact record was read' );
	}
	const v = templateView( facts, component, rule );
	const regionKey = templateKeyOf( region, component );
	if ( ! v.byKey[ regionKey ] ) {
		return leave( `the fact record holds no element ${ regionKey }` );
	}
	const served = ( key ) => m.byKey[ `Root/${ nOf( key ) }#0` ] || null;
	const opens = ( handler ) => ( ctx.opens ? ctx.opens( handler ) : handlerOpens( { folder: ctx.handoffDir, record: facts, component, handler } ) );
	const final = classifyParts( v, v.children( regionKey ), { m, rule, served, opens, keys: facts.state?.[ component ]?.keys || [] } );
	const unknown = final.filter( ( c ) => ! c.kind );
	if ( unknown.length || ! final.some( ( c ) => 'form' === c.kind || 'order summary' === c.kind ) ) {
		return leave( unknown.length ? `the region ${ region } also lays out ${ unknown.map( ( c ) => `${ c.key } (${ c.why })` ).join( ', ' ) }` : `the region ${ region } lays out no form and no order summary` );
	}
	// The block and the nodes built inside the region.
	const inRegion = ( key ) => {
		const t = key ? v.byKey[ templateKeyOf( key, component ) ] : null;
		return !! t && ( t.key === regionKey || ( t.parentChain || [] ).includes( regionKey ) );
	};
	let block = null;
	const dropped = [];
	const prune = ( list ) => ( list || [] ).flatMap( ( n ) => {
		if ( 'core/post-content' === n.name && ! keyOf( n ) && ! block ) {
			const variants = ( n.widthVariants || [] ).filter( ( w ) => ! inRegion( w.key ) );
			const { widthVariants, ...rest } = n;
			block = { ...rest, ...( variants.length ? { widthVariants: variants } : {} ), draftStandsFor: { tpl: region } };
			return [ block ];
		}
		if ( inRegion( keyOf( n ) ) ) {
			dropped.push( `${ n.name } ${ keyOf( n ) }` );
			return [];
		}
		return [ n.innerBlocks?.length ? { ...n, innerBlocks: prune( n.innerBlocks ) } : n ];
	} );
	const counts = basketCounts( v, regionKey, ctx.draftSource ? logicOf( ctx.draftSource ) : null );
	const counted = [];
	const split = ( list ) => ( list || [] ).map( ( n ) => {
		const c = counts.find( ( x ) => keyOf( n ) === `Root/${ nOf( x.host ) }#0` );
		const hostEl = c && m.byKey[ keyOf( n ) ];
		const chipEl = c && m.byKey[ `Root/${ nOf( c.chip ) }#0` ];
		if ( hostEl && chipEl && [ 'sgs/heading', 'sgs/text' ].includes( n.name ) ) {
			counted.push( `${ ctx.key }: ${ chipEl.key } in ${ keyOf( n ) } counts the region's lines ({{ ${ c.expr } }}): built as the live basket count beside the ${ n.name }'s words` );
			return countRow( n, { hostEl, chipEl, expr: c.expr, m } );
		}
		return n.innerBlocks?.length ? { ...n, innerBlocks: split( n.innerBlocks ) } : n;
	} );
	const pruned = split( prune( tree ) );
	if ( ! block ) {
		return leave( 'the tree holds no core/post-content placed at the region' );
	}
	// The head of the form column the draft keeps as its own: the plain text and headings before anything else, while their
	// words are the draft's own (a live value would be a static imitation once copied).
	const form = final.find( ( c ) => 'form' === c.kind );
	const formEl = form ? ( ( t ) => {
		while ( CONDITIONS.includes( t.tag ) && 1 === v.children( t.key ).length ) {
			t = v.children( t.key )[ 0 ];
		}
		return t;
	} )( v.byKey[ form.key ] ) : null;
	const head = formEl ? headOf( v, formEl ) : [];
	const kept = [];
	for ( const h of head ) {
		if ( ! [ 'text', 'heading' ].includes( h.kind ) || v.liveWords( h.t ) ) {
			break;
		}
		kept.push( h );
	}
	const notes = [];
	const others = otherBranches( v, regionKey );
	others.length && notes.push( `${ ctx.key }: ${ others.map( ( k ) => `Root/${ nOf( k ) }#0` ).join( ', ' ) } ${ 1 === others.length ? 'is' : 'are' } the region's other data branch, which WooCommerce's block draws in its place` );
	const nodes = kept.map( ( h ) => {
		const e = served( h.t.key );
		if ( ! e ) {
			notes.push( `${ ctx.key }: the form column's ${ h.kind } ${ h.t.key } is not shown at rest, so it is not kept` );
			return null;
		}
		const words = ws( e.allText ?? m.words( e ) );
		const base = { draftRef: { tpl: e.key }, draftFingerprint: fingerprintOf( e, m.byKey ) };
		return 'heading' === h.kind ? { name: 'sgs/heading', attributes: { content: words, level: h.t.tag }, ...base } : { name: 'sgs/text', attributes: { text: words }, ...base };
	} ).filter( Boolean );
	const insert = ( list ) => ( list || [] ).flatMap( ( n ) => ( n === block ? [ ...nodes, n ] : [ n.innerBlocks?.length ? { ...n, innerBlocks: insert( n.innerBlocks ) } : n ] ) );
	return {
		tree: nodes.length ? insert( pruned ) : pruned,
		// `run`: the region's element, which the block stands for (its form and order summary are the block's own drawing), whose paint no
		// node reads any more (lib/template-pieces-context.mjs::piecesPaint); the head kept above the block is read at its own nodes.
		// The region's other data branches (otherBranches: the empty basket) are the block's drawing too.
		placed: [ { id: piece.id, block: 'core/post-content', at: region, run: [ region, ...others.map( ( k ) => `Root/${ nOf( k ) }#0` ) ] } ],
		notes: [
			...final.map( ( c ) => `${ ctx.key }: ${ c.key } is the ${ c.kind } WooCommerce's block draws (${ c.why })` ),
			...head.filter( ( h ) => ! kept.includes( h ) ).map( ( h ) => `${ ctx.key }: ${ h.t.key } at the head of the form column is ${ 'express payment' === h.kind ? 'an express-payment group, drawn by the block\'s express payment' : 'divider' === h.kind ? 'the divider between express payment and the fields, drawn by the block' : `${ h.kind }, drawn by the block (it follows the column's own head)` }` ),
			...kept.map( ( h ) => `${ ctx.key }: ${ h.t.key } (${ h.kind }) at the head of the form column stays the draft's own, above the block` ),
			...dropped.map( ( d ) => `${ ctx.key }: ${ d } is dropped: an element inside the region the block stands in for` ),
			...counted,
			...notes,
		],
	};
}
