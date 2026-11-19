// The gift choice beside the product template's buy box (Spec 48 FR-48-96; the plugin's sgs/gift-order, Spec 27 FR-30-21):
// where the draft's buy box holds a tick box that sends the shopper's gift note with the item being added, one working
// `sgs/gift-order` stands directly after the `sgs/buybox`, as the hand-built product page has it, instead of the static
// tick the buy box run left as a note.
//
// Found from the logic, never from the tick's words. The buy box run is the one lib/template-piece-buybox.mjs::locateRun
// finds (the record's surface `find.surface`, parts homed on `find.after`). A tick box in it (an input of type checkbox)
// is the gift choice when:
//   - its change handler sets a state key K (lib/shop-parts-logic.mjs::effectOf);
//   - the add control of the run (a button whose handler appends a record, effectOf `appends`) guards, by a test reading
//     K, a call carrying an object one of whose values reads a key M;
//   - and a textarea the draft shows only while K holds (inside `<sc-if value="{{ K }}">` in the run) takes its value from M.
// That is a switch that sends a note with the order: the block's basket switch and note. Its settings come from the draft
// where the block holds them, each named in `find.settings`: `label` the first words of the tick's label, `help` the rest,
// `placeholder` the textarea's placeholder, `limit` the length its change handler cuts the note to (`.slice( 0, N )`).
// None of them paints a CSS property; the block's look is Fill's, read at the draft element holding the tick (its
// draftRef). A tick box that is not such a switch, two that are, or none leaves the gift as the buy box's note.
import { countBlocks } from './template-pieces.mjs';
import { locateRun } from './template-piece-buybox.mjs';
import { draftLogic, treeNodes } from './template-piece-draft.mjs';
import { parseTemplate } from './shop-parts-read.mjs';
import { effectOf, valuesOf } from './shop-parts-logic.mjs';

const bare = ( v ) => String( v ?? '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();
const last = ( v ) => bare( v ).split( '.' ).pop();
const handler = ( el ) => bare( el?.attrs?.onChange ?? el?.attrs?.onchange ?? el?.attrs?.onClick ?? el?.attrs?.onclick ?? '' );
const squash = ( t ) => String( t ).replace( /\s+/g, ' ' ).trim();

// Every element of a parsed template below `node`, depth-first.
function* below( node ) {
	for ( const c of node.children || [] ) {
		if ( c.tag ) {
			yield c;
			yield* below( c );
		}
	}
}
const ancestors = ( el ) => {
	const out = [];
	for ( let n = el.parent; n; n = n.parent ) {
		out.push( n );
	}
	return out;
};
// The name a node reads: an identifier's, or a member's last name.
const nameOf = ( n ) => ( 'Identifier' === n?.type ? n.name : 'MemberExpression' === n?.type && ! n.computed ? n.property.name : null );
const reads = ( L, top, key ) => L.all.some( ( n ) => n.start >= top.start && n.end <= top.end && nameOf( n ) === key && ( 'Identifier' !== n.type || 'MemberExpression' !== L.parent.get( n )?.type || L.parent.get( n ).object === n ) );

// The note keys an add handler sends when `key` holds: the keys read by the values of an object handed to a call the
// test of `key` guards.
function sentWhen( L, addExpr, key ) {
	const out = new Set();
	for ( const fn of valuesOf( L, addExpr ) ) {
		const inside = L.all.filter( ( n ) => n.start >= fn.start && n.end <= fn.end );
		for ( const t of inside.filter( ( n ) => ( 'IfStatement' === n.type || 'ConditionalExpression' === n.type ) && reads( L, n.test, key ) ) ) {
			for ( const call of L.all.filter( ( n ) => 'CallExpression' === n.type && n.start >= t.consequent.start && n.end <= t.consequent.end ) ) {
				for ( const obj of call.arguments.filter( ( a ) => 'ObjectExpression' === a.type ) ) {
					for ( const p of obj.properties.filter( ( x ) => 'ObjectProperty' === x.type ) ) {
						L.all.filter( ( n ) => n.start >= p.value.start && n.end <= p.value.end ).map( nameOf ).filter( Boolean ).forEach( ( k ) => out.add( k ) );
					}
				}
			}
		}
	}
	return out;
}

// The length a change handler cuts its value to (`.slice( 0, N )`), or null.
function cutTo( L, expr ) {
	for ( const fn of valuesOf( L, expr ) ) {
		const cut = L.all.find( ( n ) => n.start >= fn.start && n.end <= fn.end && 'CallExpression' === n.type && 'slice' === n.callee?.property?.name && 0 === n.arguments[ 0 ]?.value && 'NumericLiteral' === n.arguments[ 1 ]?.type );
		if ( cut ) {
			return cut.arguments[ 1 ].value;
		}
	}
	return null;
}

export function place( ctx, piece ) {
	const { key, tree } = ctx;
	const note = ( why ) => ( { notes: [ `${ key }: piece "${ piece.id }" (${ piece.block }) is not placed: ${ why }` ] } );
	if ( countBlocks( tree, piece.block ) ) {
		return { notes: [ `${ key }: piece "${ piece.id }": the tree already holds ${ piece.block }` ] };
	}
	const boxes = treeNodes( tree ).filter( ( r ) => r.node.name === piece.find.after );
	if ( 1 !== boxes.length ) {
		return note( `the tree holds ${ boxes.length } ${ piece.find.after } to stand beside` );
	}
	const found = locateRun( ctx, piece.find.surface, piece.find.after );
	const L = draftLogic( ctx.draftSource );
	if ( found.why || ! L ) {
		return note( found.why || 'the surface\'s draft has no logic to read the tick box\'s effect' );
	}
	const { index, run, inRun } = found;
	const template = parseTemplate( ctx.draftSource );
	const byTpl = new Map( [ ...below( template ) ].filter( ( el ) => null !== el.tpl ).map( ( el ) => [ el.tpl, el ] ) );
	const elOf = ( e ) => ( 'Root' === e.template ? byTpl.get( Number( e.tpl ) ) : null );
	const runEls = run.map( ( k ) => elOf( index.byKey.get( k ) ) ).filter( Boolean );
	const inRunEl = ( el ) => runEls.some( ( r ) => r === el || ancestors( el ).includes( r ) );
	const ticks = index.elements.filter( ( e ) => 'input' === e.tag && inRun( e.key ) && 'checkbox' === String( elOf( e )?.attrs?.type || '' ).toLowerCase() );
	if ( ! ticks.length ) {
		return note( 'the buy box holds no tick box' );
	}
	const addEls = index.elements.filter( ( e ) => inRun( e.key ) && [ 'button', 'a' ].includes( e.tag ) && handler( elOf( e ) ) && effectOf( L, handler( elOf( e ) ) ).appends );
	const adds = addEls.map( ( e ) => handler( elOf( e ) ) );
	const gifts = [];
	for ( const tick of ticks ) {
		for ( const k of effectOf( L, handler( elOf( tick ) ) ).sets ) {
			const sent = new Set( adds.flatMap( ( a ) => [ ...sentWhen( L, a, k ) ] ) );
			const areas = [ ...below( template ) ].filter( ( el ) => 'textarea' === el.tag && inRunEl( el ) && sent.has( last( el.attrs.value ) ) && ancestors( el ).some( ( a ) => 'sc-if' === a.tag && k === bare( a.attrs.value ) ) );
			if ( 1 === areas.length ) {
				gifts.push( { tick, key: k, area: areas[ 0 ] } );
			}
		}
	}
	if ( 1 !== gifts.length ) {
		return note( gifts.length ? `${ gifts.length } tick boxes each send a note with the item (${ gifts.map( ( g ) => g.tick.key ).join( ', ' ) })` : `no tick box in the buy box (${ ticks.map( ( t ) => t.key ).join( ', ' ) }) sends a note with the item being added, so none is a gift choice` );
	}
	const { tick, area } = gifts[ 0 ];
	const s = piece.find.settings || {};
	const attributes = {};
	const label = ancestors( elOf( tick ) ).find( ( a ) => 'label' === a.tag );
	const texts = label ? [ ...below( label ) ].flatMap( ( el ) => ( el.children || [] ).filter( ( c ) => ! c.tag && squash( c.text ) ).map( ( c ) => squash( c.text ) ) ) : [];
	const notes = [];
	if ( texts.some( ( t ) => /\{\{/.test( t ) ) ) {
		notes.push( `${ key }: piece "${ piece.id }": the tick's label shows a value, so its words are left to the block's own` );
	} else if ( texts.length ) {
		s.label && ( attributes[ s.label ] = texts[ 0 ] );
		s.help && texts.length > 1 && ( attributes[ s.help ] = texts.slice( 1 ).join( ' ' ) );
	}
	s.placeholder && area.attrs.placeholder && ( attributes[ s.placeholder ] = area.attrs.placeholder );
	const limit = s.limit ? cutTo( L, handler( area ) ) : null;
	null !== limit && ( attributes[ s.limit ] = limit );
	// The gift's own element: the tick's widest ancestor in the buy box that holds no add control.
	let holder = tick.key;
	for ( let up = index.byKey.get( holder )?.parentKey; index.byKey.has( up ) && inRun( up ) && ! addEls.some( ( a ) => index.within( a.key, up ) ); up = index.byKey.get( up ).parentKey ) {
		holder = up;
	}
	const node = { name: piece.block, attributes, innerBlocks: [], draftRef: { tpl: holder } };
	const box = boxes[ 0 ];
	box.list.splice( box.list.indexOf( box.node ) + 1, 0, node );
	return { tree, placed: [ { id: piece.id, block: piece.block, at: `after ${ piece.find.after }, read at ${ holder } (the tick ${ tick.key })`, settings: Object.keys( attributes ) } ], notes };
}
