// The order confirmation's working pieces (Spec 48 FR-48-96; data/template-pieces.json `order-confirmation`): the draft's
// layout stays its own SGS blocks, and the parts that show the order become the order's own:
//   - `find: "order-lines"`: the loop of order lines (lib/template-piece-order-read.mjs) and the totals rows after it become
//     one sgs/order-items where the first of them stood, with the settings the draft's rows answer (a thumbnail, an options
//     line, which totals rows show and the total's label), each written only where the framework database says the block
//     holds it;
//   - `find: "order-values"`: each order value the reader classified becomes a binding on the block holding it
//     (`metadata.bindings.<attribute>` to the `sgs/order` source with the key, and the words around the value as `format`);
//     each branch that tests the order takes its Show-to rule on the blocks it holds; a bound block outside every order
//     branch takes the `viewable` rule, so the draft's sample order never shows to a visitor who may not view the order.
// What cannot be done right is a problem row naming the draft element (a value no key fits, a block with no attribute a
// binding can write, a branch the skeleton does not hold); what is lost on the way is a note (inline formatting a bound
// plain value cannot keep). The tree comes in as a copy (lib/template-pieces.mjs::placePieces) and its nodes name
// their draft element in `draftRef.tpl`.
import { templateKeyOf } from './fact-key.mjs';
import { openDb } from './db.mjs';
import { draftOf, readOrder, sourceText } from './template-piece-order-read.mjs';
import { boundAttr, loadOrderFacts, orderFactsProblems, pluginFacts, ruleAttr, settingType } from './template-piece-order-plugin.mjs';

// Every node of a tree with the list holding it and its ancestors: [ { node, list, up: [ node ] } ] in document order.
function walk( tree, up = [] ) {
	return ( tree || [] ).flatMap( ( node, i, list ) => [ { node, list, up }, ...walk( node.innerBlocks, [ ...up, node ] ) ] );
}

const factKeyOf = ( node, rootComponent ) => ( node?.draftRef?.tpl ? templateKeyOf( node.draftRef.tpl, rootComponent ) : null );

// The template keys of the tree's top drafted nodes (the first node with a draft element down each branch).
function topKeys( tree, rootComponent ) {
	const out = [];
	const visit = ( list ) => ( list || [] ).forEach( ( n ) => {
		const k = factKeyOf( n, rootComponent );
		k ? out.push( k ) : visit( n.innerBlocks );
	} );
	visit( tree );
	return out;
}

// Everything the builder reads for a surface: the reader's result over the tree's draft elements and the plugin facts.
function readsFor( ctx ) {
	const facts = ctx.orderFacts || loadOrderFacts();
	const plugin = ctx.plugin || pluginFacts();
	const db = ctx.db || openDb();
	const draft = ctx.draft || draftOf( ctx.handoffDir, ctx.rootComponent );
	const order = readOrder( { record: ctx.factRecord, tops: topKeys( ctx.tree, ctx.rootComponent ), draft, facts } );
	return { facts, plugin, db, draft, order, factProblems: orderFactsProblems( { facts, plugin, db } ) };
}

// The tree with every node `drop` names removed and `put` inserted where the first of them stood.
function replaceNodes( tree, drop, put ) {
	let placed = false;
	const rebuild = ( list ) => ( list || [] ).flatMap( ( n ) => {
		if ( drop.has( n ) ) {
			if ( placed ) {
				return [];
			}
			placed = true;
			return [ put ];
		}
		return [ n.innerBlocks?.length ? { ...n, innerBlocks: rebuild( n.innerBlocks ) } : n ];
	} );
	return rebuild( tree );
}

// The order lines piece: one sgs/order-items in place of the loop's items and its totals rows.
function placeLines( ctx, piece, r ) {
	const { order, facts, db } = r;
	const at = ( k ) => `${ ctx.key }: ${ k }`;
	if ( ! order.lines ) {
		return { tree: ctx.tree, notes: [ at( `the draft shows no order lines (no loop whose items show a quantity and a currency amount), so no ${ piece.block } is placed` ) ] };
	}
	const items = facts.items;
	const attributes = {};
	const set = ( attr, type, value ) => {
		attr && type === settingType( db, piece.block, attr ) && ( attributes[ attr ] = value );
	};
	set( items.thumbnail, 'boolean', order.lines.thumbnail );
	set( items.options, 'boolean', order.lines.options );
	for ( const [ kind, row ] of Object.entries( items.rows || {} ) ) {
		set( row.setting, 'boolean', order.rows.some( ( x ) => x.kind === kind ) );
	}
	const total = order.rows.find( ( x ) => 'total' === x.kind );
	total?.label && set( items.totalLabel, 'string', total.label );
	const put = { name: piece.block, attributes, innerBlocks: [] };
	const gone = new Set( [ order.lines.key, ...order.lines.items, ...order.rows.map( ( x ) => x.el ) ] );
	const nodes = walk( ctx.tree ).filter( ( w ) => gone.has( factKeyOf( w.node, ctx.rootComponent ) ) );
	const drop = new Set( nodes.filter( ( w ) => ! w.up.some( ( u ) => nodes.some( ( x ) => x.node === u ) ) ).map( ( w ) => w.node ) );
	let tree;
	if ( drop.size ) {
		tree = replaceNodes( ctx.tree, drop, put );
	} else {
		// No item was shown when the draft was read (an empty list): the block goes into the loop's container, after the
		// elements the draft places before the loop.
		tree = structuredClone( ctx.tree );
		const holder = walk( tree ).find( ( w ) => factKeyOf( w.node, ctx.rootComponent ) === order.lines.parent )?.node;
		if ( ! holder ) {
			return { tree: ctx.tree, problems: [ at( `the order lines loop ${ order.lines.key } and its container ${ order.lines.parent } are not in the skeleton, so ${ piece.block } has no place` ) ] };
		}
		const n = ( k ) => Number( String( k ).split( '/' ).pop() );
		const before = ( holder.innerBlocks || [] ).filter( ( c ) => n( factKeyOf( c, ctx.rootComponent ) ) < n( order.lines.key ) ).length;
		holder.innerBlocks = [ ...( holder.innerBlocks || [] ).slice( 0, before ), put, ...( holder.innerBlocks || [] ).slice( before ) ];
	}
	const notes = [ at( `${ piece.block } stands for the order lines ${ order.lines.key }${ order.rows.length ? ` and the totals row${ order.rows.length > 1 ? 's' : '' } ${ order.rows.map( ( x ) => x.el ).join( ', ' ) }` : '' }; the look of its rows (thumbnail size and shape, item name and price type, row spacing) is not read from the draft, so the block shows its own until a look is set` ) ];
	return { tree, placed: [ { id: piece.id, block: piece.block, at: order.lines.key, attributes } ], notes };
}

// The order values piece: bindings on the blocks holding the order's values, Show-to rules on its branches.
function placeValues( ctx, piece, r ) {
	const { order, facts, plugin, db, draft, factProblems } = r;
	const at = ( k ) => `${ ctx.key }: ${ k }`;
	const tree = structuredClone( ctx.tree );
	const nodes = walk( tree );
	const keyOf = ( n ) => factKeyOf( n, ctx.rootComponent );
	const byKey = new Map();
	nodes.forEach( ( w ) => {
		const k = keyOf( w.node );
		k && byKey.set( k, [ ...( byKey.get( k ) || [] ), w ] );
	} );
	const record = ctx.factRecord.elements;
	const problems = [ ...factProblems, ...order.problems ];
	const notes = [ ...order.notes ];
	const placed = [];
	const ruleOn = ( node ) => {
		const attr = Object.keys( node.attributes || {} ).find( ( a ) => ruleAttr( db, node.name, node.attributes[ a ] ) && 'none' !== node.attributes[ a ] && 'string' === typeof node.attributes[ a ] && /^order-/.test( node.attributes[ a ] ) );
		return attr ? node.attributes[ attr ] : null;
	};

	// Branch rules, on the top nodes of each branch's content.
	for ( const b of order.branches ) {
		if ( b.problem ) {
			problems.push( b.problem );
			continue;
		}
		if ( b.guard ) {
			continue;
		}
		const mine = nodes.filter( ( w ) => ( record[ keyOf( w.node ) ]?.template?.membership?.scIf || [] ).some( ( s ) => s.key === b.el ) );
		const tops = mine.filter( ( w ) => ! w.up.some( ( u ) => mine.some( ( x ) => x.node === u ) ) );
		if ( ! tops.length ) {
			problems.push( `the branch ${ b.el } ({{ ${ b.test } }}, ${ b.rule }) is not in the skeleton: the draft did not show it when it was read, so its blocks and their rule are missing` );
			continue;
		}
		for ( const { node } of tops ) {
			const attr = ruleAttr( db, node.name, b.rule );
			const had = ruleOn( node );
			if ( ! attr ) {
				problems.push( `${ node.name } (${ keyOf( node ) }) holds no setting with the Show-to rule ${ b.rule } for the branch ${ b.el }` );
			} else if ( had && had !== b.rule ) {
				problems.push( `${ node.name } (${ keyOf( node ) }) already shows only for ${ had }, and the branch ${ b.el } asks for ${ b.rule }` );
			} else {
				node.attributes = { ...( node.attributes || {} ), [ attr ]: b.rule };
				placed.push( { id: piece.id, block: node.name, at: keyOf( node ), rule: b.rule, branch: b.el } );
			}
		}
	}

	// Bindings, on the block holding each classified value.
	const ancestorsOf = ( k ) => [ k, ...( record[ k ]?.template?.parentChain || [] ) ];
	const boundNodes = [];
	for ( const h of order.holes ) {
		if ( h.absorbed ) {
			continue;
		}
		if ( h.problem ) {
			problems.push( h.problem );
			continue;
		}
		// The value's own element or the nearest element around it in the skeleton, inside every branch the value sits in (a
		// block outside the value's branch shows whether or not the order has it, so it never holds the value).
		const branches = ( k ) => ( record[ k ]?.template?.membership?.scIf || [] ).map( ( s ) => s.key );
		const holder = ancestorsOf( h.el ).find( ( k ) => byKey.has( k ) && branches( h.el ).every( ( b ) => branches( k ).includes( b ) ) );
		if ( ! holder ) {
			problems.push( `the value {{ ${ h.expr } }} (${ h.el }, ${ h.key }) is not in the skeleton: the draft did not show it when it was read` );
			continue;
		}
		const role = 'attr:href' === h.where ? 'link-href' : 'text-content';
		for ( const { node: held } of byKey.get( holder ) ) {
			// A link drawn as a card whose block takes no bound address is followed by the one block inside it that does (the
			// card's action button): that block carries the link.
			const inner = 'link-href' === role && ! boundAttr( db, plugin.supported, held.name, role ) ? walk( held.innerBlocks ).filter( ( w ) => boundAttr( db, plugin.supported, w.node.name, role ) ) : [];
			const node = 1 === inner.length ? inner[ 0 ].node : held;
			const attr = boundAttr( db, plugin.supported, node.name, role );
			if ( ! attr ) {
				problems.push( `${ held.name } (${ holder }) has no ${ 'link-href' === role ? `address setting a binding can write${ inner.length > 1 ? `, and ${ inner.length } blocks inside it have one` : '' }` : 'words setting a binding can write' }, so the order's ${ h.key } ({{ ${ h.expr } }}) cannot show there` );
				continue;
			}
			node !== held && notes.push( `the link to the order (${ holder }, {{ ${ h.expr } }}) is a ${ held.name } with no address a binding can write; its address is bound on the ${ node.name } inside it (${ keyOf( node ) }), so only that block links to the order` );
			const existing = node.attributes?.metadata?.bindings?.[ attr ];
			let format = null;
			if ( 'text-content' === role ) {
				const text = sourceText( draft, record[ holder ] );
				const hole = new RegExp( `\\{\\{\\s*${ h.expr.replace( /[.$]/g, '\\$&' ) }\\s*\\}\\}` );
				if ( null === text || ! hole.test( text ) ) {
					problems.push( `the words around {{ ${ h.expr } }} in ${ holder } cannot be read from the draft source, so the order's ${ h.key } is not bound` );
					continue;
				}
				const sentence = text.replace( hole, '%s' );
				if ( /\{\{/.test( sentence ) ) {
					problems.push( `${ holder } holds another value beside {{ ${ h.expr } }} ("${ text }"): one binding shows one order fact, so the order's ${ h.key } is not bound there` );
					continue;
				}
				format = '%s' === sentence ? null : sentence;
			}
			if ( existing ) {
				problems.push( `${ node.name } (${ holder }) already binds ${ attr } to ${ existing.source } ${ existing.args?.key }, so the order's ${ h.key } ({{ ${ h.expr } }}) is not bound` );
				continue;
			}
			node.attributes = { ...( node.attributes || {} ), metadata: { ...( node.attributes?.metadata || {} ), bindings: { ...( node.attributes?.metadata?.bindings || {} ), [ attr ]: { source: plugin.source, args: { key: h.key, ...( format ? { format } : {} ) } } } } };
			placed.push( { id: piece.id, block: node.name, at: holder, attribute: attr, key: h.key, ...( format ? { format } : {} ) } );
			boundNodes.push( { node, holder } );
			if ( holder !== h.el ) {
				const tags = ancestorsOf( h.el ).slice( 0, ancestorsOf( h.el ).indexOf( holder ) ).map( ( k ) => `<${ record[ k ]?.template?.tag }>` );
				notes.push( `the order's ${ h.key } in ${ holder } sat inside ${ tags.join( ' inside ' ) } (${ h.el }); a bound value is plain text, so that formatting is lost` );
			}
		}
	}

	// A bound block outside every order branch shows only while the visitor may view the order.
	const viewable = facts.viewable;
	for ( const { node, holder } of boundNodes ) {
		const w = nodes.find( ( x ) => x.node === node );
		if ( ! viewable || [ node, ...w.up ].some( ruleOn ) ) {
			continue;
		}
		const attr = ruleAttr( db, node.name, viewable );
		if ( attr ) {
			node.attributes = { ...node.attributes, [ attr ]: viewable };
			placed.push( { id: piece.id, block: node.name, at: holder, rule: viewable } );
		} else {
			problems.push( `${ node.name } (${ holder }) holds no setting with the Show-to rule ${ viewable }, so its sample order words show to a visitor who may not view the order` );
		}
	}
	return { tree, placed, problems: [ ...new Set( problems ) ].map( at ), notes: [ ...new Set( notes ) ].map( at ) };
}

// Places one order piece (see the header). `ctx`: { key, tree, factRecord, rootComponent, handoffDir, db?, draft?,
// orderFacts?, plugin? }.
export function place( ctx, piece ) {
	if ( ! ctx.factRecord ) {
		return { problems: [ `${ ctx.key }: piece "${ piece.id }" needs the surface's fact record, and none was read` ] };
	}
	const r = readsFor( ctx );
	if ( 'order-lines' === piece.find ) {
		return placeLines( ctx, piece, r );
	}
	if ( 'order-values' === piece.find ) {
		return placeValues( ctx, piece, r );
	}
	return { problems: [ `${ ctx.key }: piece "${ piece.id }" names find "${ piece.find ?? '' }", which the order builder does not know (order-lines, order-values)` ] };
}
