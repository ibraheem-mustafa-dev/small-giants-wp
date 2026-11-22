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
//     A value no key holds that reads the order is bound to `fact:<name>` for the site to supply (the plugin's
//     `sgs_order_fact` filter) and noted as a "site-supplied fact"; the words around it, the draft's and the ones its logic
//     joins to it, are the binding's `format`, and a second fact in the same words is a `{fact:<name>}` token in it, so the
//     whole line is one binding that renders nothing until every fact is supplied (an sgs/text with no words renders nothing).
//   - `find: "order-access"`: WooCommerce's order status block in a card for a visitor who may not view the order, and the
//     viewable rule on the draft's top-level blocks (placeAccess).
// What cannot be done right is a problem row naming the draft element (a value no key fits, a block with no attribute a
// binding can write, a branch the skeleton does not hold); what is lost on the way is a note (inline formatting a bound
// plain value cannot keep). The tree comes in as a copy (lib/template-pieces.mjs::placePieces) and its nodes name
// their draft element in `draftRef.tpl`.
import { templateKeyOf } from './fact-key.mjs';
import { openDb } from './db.mjs';
import { draftOf, readOrder, sourceText } from './template-piece-order-read.mjs';
import { decodeEntities } from './intake-ast.mjs';
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
	const order = readOrder( { record: ctx.factRecord, tops: topKeys( ctx.tree, ctx.rootComponent ), draft, facts, plugin } );
	return { facts, plugin, db, draft, order, factProblems: orderFactsProblems( { facts, plugin, db } ) };
}

// The order Show-to rule a node already holds (`order-*` in the block's own Show-to setting), or null. The cheap checks come first;
// the database is asked only for a string that starts `order-`, and the attribute must be the very setting the database names for
// that value, so a class name or anchor that happens to read `order-owner` is no rule.
function orderRuleOn( db, node ) {
	const attrs = node.attributes || {};
	const attr = Object.keys( attrs ).find( ( a ) => 'string' === typeof attrs[ a ] && /^order-/.test( attrs[ a ] ) && ruleAttr( db, node.name, attrs[ a ] ) === a );
	return attr ? attrs[ attr ] : null;
}

// Containers that would stand as empty boxes while the visitor may not view the order, each taking the `viewable` rule (the
// plugin's Show-to setting holds one rule per block, so a container already ruled, or under a ruled block, is left to that rule):
//   - a container whose every child is an order-bound block, an sgs/order-items or such a container (nothing static of its own);
//   - the card directly holding an sgs/order-items, when its other content is only titles (sgs/heading or sgs/text with no
//     binding and no blocks inside): the title names the lines and means nothing without them. A card with any other block of
//     its own (a button, a picture, a container) keeps showing, and a note says so.
// The tree is changed in place; returns { placed, notes }.
function ruleOrderCards( { tree, r, rootComponent, piece } ) {
	const { facts, plugin, db } = r;
	const placed = [];
	const notes = [];
	const viewable = facts.viewable;
	if ( ! viewable ) {
		return { placed, notes };
	}
	const bound = ( n ) => Object.values( n.attributes?.metadata?.bindings || {} ).some( ( b ) => b?.source === plugin.source );
	const lines = ( n ) => n.name === facts.items.block;
	const onlyOrder = ( n ) => bound( n ) || lines( n ) || ( ( n.innerBlocks || [] ).length > 0 && n.innerBlocks.every( onlyOrder ) );
	const title = ( n ) => [ 'sgs/heading', 'sgs/text' ].includes( n.name ) && ! bound( n ) && ! ( n.innerBlocks || [] ).length;
	const visit = ( list ) => ( list || [] ).forEach( ( node ) => {
		if ( orderRuleOn( db, node ) ) {
			return;
		}
		const kids = node.innerBlocks || [];
		const holdsLines = kids.some( lines );
		const attr = ruleAttr( db, node.name, viewable );
		const free = attr && ( ! node.attributes?.[ attr ] || 'none' === node.attributes[ attr ] );
		const card = holdsLines && kids.every( ( c ) => lines( c ) || onlyOrder( c ) || title( c ) );
		if ( ! bound( node ) && kids.length && ( onlyOrder( node ) || card ) ) {
			if ( free ) {
				node.attributes = { ...( node.attributes || {} ), [ attr ]: viewable };
				placed.push( { id: piece.id, block: node.name, at: node.draftRef?.tpl ? templateKeyOf( node.draftRef.tpl, rootComponent ) : null, rule: viewable } );
			}
			return;
		}
		const other = holdsLines && free ? kids.find( ( c ) => ! lines( c ) && ! onlyOrder( c ) && ! title( c ) ) : null;
		if ( other ) {
			notes.push( `the card around ${ facts.items.block } (${ node.draftRef?.tpl ? templateKeyOf( node.draftRef.tpl, rootComponent ) : node.name }) also holds ${ other.name }, so it stays visible when the order cannot be viewed` );
		}
		visit( kids );
	} );
	visit( tree );
	return { placed, notes };
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
	// Every block with blocks inside is a rebuilt copy (replaceNodes, or the clone above), so the cards' rule never reaches the caller's tree.
	const cards = ruleOrderCards( { tree, r, rootComponent: ctx.rootComponent, piece } );
	// `run`: the draft elements of the nodes the block replaced (none when the block went into an empty loop's container and no node was
	// dropped), whose paint no node reads any more (lib/template-pieces-context.mjs::piecesPaint).
	const run = [ ...drop ].map( ( n ) => n.draftRef.tpl );
	return { tree, placed: [ { id: piece.id, block: piece.block, at: order.lines.key, attributes, ...( run.length ? { run } : {} ) }, ...cards.placed ], notes: [ ...notes, ...cards.notes.map( at ) ] };
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
	// Whether the surface's inventory holds an element of a branch (the data branch reader marks them `branch`).
	const readBranch = ( el ) => ( ctx.inventory?.elements || [] ).some( ( e ) => ( record[ templateKeyOf( e.key, ctx.rootComponent ) ]?.template?.membership?.scIf || [] ).some( ( s ) => s.key === el ) );
	const problems = [ ...factProblems, ...order.problems ];
	const notes = [ ...order.notes ];
	const placed = [];
	const ruleOn = ( node ) => orderRuleOn( db, node );

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
			problems.push( `the branch ${ b.el } ({{ ${ b.test } }}, ${ b.rule }) is not in the skeleton: ${ readBranch( b.el ) ? 'the inventory read its elements and the proposal kept none of them' : 'the inventory holds none of its elements (no data branch read for it, lib/skeleton-data-branches.mjs)' }, so its blocks and their rule are missing` );
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
	// The value's own element or the nearest element around it in the skeleton, inside every branch the value sits in (a block
	// outside the value's branch shows whether or not the order has it, so it never holds the value).
	const branches = ( k ) => ( record[ k ]?.template?.membership?.scIf || [] ).map( ( s ) => s.key );
	const holderOf = ( h ) => ancestorsOf( h.el ).find( ( k ) => byKey.has( k ) && branches( h.el ).every( ( b ) => branches( k ).includes( b ) ) );
	const boundNodes = [];
	// A value no key holds is a fact the site supplies; one block binds one key, so a block with several of them takes the first
	// as its key and the others as `{fact:<name>}` tokens in its words. Built-in keys go first, so a key is never the token.
	const taken = new Set();
	const sameStep = ( a, b ) => a.instance === b.instance;
	// What the owner must supply for a fact: shown in the run report beside the other notes.
	const factNote = ( x, holder ) => `site-supplied fact ${ x.key }: {{ ${ x.expr } }} in ${ holder } reads the order's ${ x.paths.map( ( p ) => p.join( '.' ) ).join( ', ' ) }, which no key of ${ plugin.source } holds, so the site supplies it through the ${ plugin.factFilter } filter (name ${ x.key.slice( plugin.factPrefix.length ) }); the value is empty, and the block shows nothing, until it does`;
	for ( const h of [ ...order.holes ].sort( ( a, b ) => Number( !! a.fact ) - Number( !! b.fact ) ) ) {
		if ( h.absorbed || h.choice || taken.has( h ) ) {
			continue;
		}
		if ( h.problem ) {
			problems.push( h.problem );
			continue;
		}
		const holder = holderOf( h );
		if ( ! holder ) {
			problems.push( `the value {{ ${ h.expr } }} (${ h.el }, ${ h.key }) is not in the skeleton: the draft did not show it when it was read` );
			continue;
		}
		const role = 'attr:href' === h.where ? 'link-href' : 'text-content';
		// A value of one step of a loop binds on that step's block only (the skeleton keeps each step as `<key>#<step>`).
		const stepOf = ( n ) => Number( /#(\d+)$/.exec( n.draftRef?.tpl || '' )?.[ 1 ] );
		const targets = byKey.get( holder ).filter( ( w ) => undefined === h.instance || stepOf( w.node ) === h.instance );
		if ( ! targets.length ) {
			problems.push( `the value {{ ${ h.expr } }} (${ h.el }, ${ h.key }) is not in the skeleton: it is the step ${ h.instance } of its loop, and the proposal holds no such step` );
			continue;
		}
		// The facts folded into a block's words are marked taken once every target is done, so each block that holds the element
		// takes them as tokens, not only the first.
		const used = new Set();
		for ( const { node: held } of targets ) {
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
			const others = [];
			if ( 'text-content' === role ) {
				const text = sourceText( draft, record[ holder ] );
				// A reference the draft writes as fixed words (`literal`, lib/template-piece-order-read.mjs::createdReference) is found as those words.
				const escaped = h.expr.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
				const hole = new RegExp( h.literal ? `(?<![\\w-])${ escaped }(?![\\w-])` : `\\{\\{\\s*${ escaped }\\s*\\}\\}` );
				if ( null === text || ! hole.test( text ) ) {
					problems.push( `the words around {{ ${ h.expr } }} in ${ holder } cannot be read from the draft source, so the order's ${ h.key } is not bound` );
					continue;
				}
				// The words the logic joins to a fact (`'Baked on ' + bake.date`) are the value's own words, and a fact has no other
				// place to keep them.
				let sentence = text.replace( hole, () => ( h.fact && h.logicFormat ? h.logicFormat : '%s' ) );
				// Another site-supplied fact in the same words is a token of the format, naming the fact the plugin reads there.
				for ( const m of [ ...sentence.matchAll( /\{\{\s*([^}]+?)\s*\}\}/g ) ] ) {
					const o = order.holes.find( ( x ) => x !== h && x.fact && ! x.problem && ! taken.has( x ) && x.expr === m[ 1 ] && sameStep( x, h ) && ancestorsOf( x.el ).includes( holder ) );
					if ( o ) {
						sentence = sentence.replace( m[ 0 ], () => `{${ o.key }}` );
						others.push( o );
					}
				}
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
			others.forEach( ( o ) => used.add( o ) );
			[ h, ...others ].filter( ( x ) => x.fact ).forEach( ( x ) => notes.push( factNote( x, holder ) ) );
			if ( holder !== h.el ) {
				const tags = ancestorsOf( h.el ).slice( 0, ancestorsOf( h.el ).indexOf( holder ) ).map( ( k ) => `<${ record[ k ]?.template?.tag }>` );
				notes.push( `the order's ${ h.key } in ${ holder } sat inside ${ tags.join( ' inside ' ) } (${ h.el }); a bound value is plain text, so that formatting is lost` );
			}
		}
		used.forEach( ( o ) => taken.add( o ) );
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
	splitChoices( { order, facts, plugin, db, byKey, keyOf, holderOf, ruleOn, piece, placed, problems, notes } );
	const cards = ruleOrderCards( { tree, r, rootComponent: ctx.rootComponent, piece } );
	return { tree, placed: [ ...placed, ...cards.placed ], problems: [ ...new Set( problems ) ].map( at ), notes: [ ...new Set( [ ...notes, ...cards.notes ] ) ].map( at ) };
}

// A value choosing one of two fixed phrases by one order fact (lib/template-piece-order-read.mjs::choiceOf, F-12): the block
// holding it stands once per phrase, in its place, each copy with its phrase in the block's words setting (the attribute a
// binding of words would write) and the phrase's Show-to rule. A block the branch around it already rules keeps standing under
// the choice's rule only when the choice lists that rule as one its own rules imply (`within`: an account made with the order is
// on an account, so `order-owner` gives way to `order-account-created`); any other rule already there, a block with no words
// setting, or words holding neither phrase is a problem row and the block is left as the draft's resting phrase. Changes the
// tree in place and pushes to `placed`, `problems` and `notes`.
function splitChoices( { order, facts, plugin, db, byKey, keyOf, holderOf, ruleOn, piece, placed, problems, notes } ) {
	const norm = ( t ) => decodeEntities( String( t ?? '' ) ).replace( /\s+/g, ' ' ).trim();
	for ( const h of order.holes.filter( ( x ) => x.choice ) ) {
		const c = facts.choices?.[ h.choice.choice ] || {};
		const holder = holderOf( h );
		if ( ! holder ) {
			problems.push( `the value {{ ${ h.expr } }} (${ h.el }) chooses its words by the order's ${ h.choice.test } and is not in the skeleton: the draft did not show it when it was read` );
			continue;
		}
		for ( const { node, list } of byKey.get( holder ) ) {
			const attr = boundAttr( db, plugin.supported, node.name, 'text-content' );
			const words = attr ? norm( node.attributes?.[ attr ] ) : '';
			const resting = h.choice.phrases.filter( ( p ) => words.includes( norm( p.text ) ) );
			const had = ruleOn( node );
			const attrs = h.choice.phrases.map( ( p ) => ruleAttr( db, node.name, p.rule ) );
			const why = ! attr ? 'holds no words setting' : 1 !== resting.length ? `holds ${ resting.length ? 'both phrases' : 'neither phrase' } in its words` : attrs.some( ( a ) => ! a ) ? `holds no Show-to setting with ${ h.choice.phrases.map( ( p ) => p.rule ).join( ' and ' ) }` : had && had !== facts.viewable && ! ( c.within || [] ).includes( had ) ? `already shows only for ${ had }` : null;
			if ( why ) {
				problems.push( `${ node.name } (${ holder }) shows {{ ${ h.expr } }}, which chooses its words by the order's ${ h.choice.test }, and ${ why }: it is not split into one block per phrase` );
				continue;
			}
			const copies = h.choice.phrases.map( ( p, i ) => ( { ...structuredClone( node ), attributes: { ...structuredClone( node.attributes || {} ), [ attr ]: words.replace( norm( resting[ 0 ].text ), () => p.text ), [ attrs[ i ] ]: p.rule } } ) );
			list.splice( list.indexOf( node ), 1, ...copies );
			had && notes.push( `${ node.name } (${ holder }) sat in a branch shown for ${ had }; each of its phrases shows for its own rule (${ h.choice.phrases.map( ( p ) => p.rule ).join( ', ' ) }), which holds only where ${ had } does` );
			h.choice.phrases.forEach( ( p ) => placed.push( { id: piece.id, block: node.name, at: keyOf( node ), rule: p.rule, words: p.text } ) );
		}
	}
}

// The order access piece (F-43): what a visitor who may not view the order sees (a guest after WooCommerce's grace time, a wrong
// order key, a member's order while signed out). WooCommerce's order-confirmation-status block, which holds its own email check
// form and sign-in link, stands in a container shown only for `order-not-viewable` at the top of the draft's confirmation, under
// a level-one heading in the framework's own words (`piece.heading`: no draft draws this state, so the visitor's page needs a
// heading of its own); every top-level block of the draft's confirmation that no order rule holds yet takes the viewable rule,
// so the thank-you page reads as one only to a visitor who may view the order. Runs after the order values piece, whose branch
// rules a viewable rule would otherwise block. The root is the tree's top drafted node; a tree with none is a problem row.
function placeAccess( ctx, piece, r ) {
	const { facts, db } = r;
	const at = ( k ) => `${ ctx.key }: ${ k }`;
	const tree = structuredClone( ctx.tree );
	const roots = walk( tree ).filter( ( w ) => factKeyOf( w.node, ctx.rootComponent ) && ! w.up.some( ( u ) => factKeyOf( u, ctx.rootComponent ) ) ).map( ( w ) => w.node );
	if ( 1 !== roots.length ) {
		return { tree: ctx.tree, problems: [ at( `${ roots.length ? `${ roots.length } top drafted blocks` : 'no drafted block' } in the tree, so ${ piece.block } has no one place at the top of the confirmation` ) ] };
	}
	const root = roots[ 0 ];
	const hidden = 'order-not-viewable';
	const wrapAttr = ruleAttr( db, 'sgs/container', hidden );
	const level = settingType( db, 'sgs/heading', 'level' );
	const words = boundAttr( db, r.plugin.supported, 'sgs/heading', 'text-content' );
	if ( ! wrapAttr || ! words ) {
		return { tree: ctx.tree, problems: [ at( `${ wrapAttr ? 'sgs/heading holds no words setting' : `sgs/container holds no Show-to setting with ${ hidden }` }, so the order access card is not placed` ) ] };
	}
	const heading = { name: 'sgs/heading', attributes: { [ words ]: piece.heading || '', ...( level ? { level: 1 } : {} ) }, innerBlocks: [] };
	const card = { name: 'sgs/container', attributes: { [ wrapAttr ]: hidden }, innerBlocks: [ ...( piece.heading ? [ heading ] : [] ), { name: piece.block, attributes: {}, innerBlocks: [] } ] };
	const placed = [ { id: piece.id, block: piece.block, at: factKeyOf( root, ctx.rootComponent ), rule: hidden } ];
	for ( const node of root.innerBlocks || [] ) {
		const attr = facts.viewable ? ruleAttr( db, node.name, facts.viewable ) : null;
		if ( attr && ! orderRuleOn( db, node ) && ( ! node.attributes?.[ attr ] || 'none' === node.attributes[ attr ] ) ) {
			node.attributes = { ...( node.attributes || {} ), [ attr ]: facts.viewable };
			placed.push( { id: piece.id, block: node.name, at: factKeyOf( node, ctx.rootComponent ), rule: facts.viewable } );
		}
	}
	root.innerBlocks = [ card, ...( root.innerBlocks || [] ) ];
	return { tree, placed, notes: [ at( `${ piece.block } stands at the top of the confirmation for a visitor who may not view the order${ piece.heading ? `, under the heading "${ piece.heading }" (no draft draws this state)` : '' }` ) ] };
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
	if ( 'order-access' === piece.find ) {
		return placeAccess( ctx, piece, r );
	}
	return { problems: [ `${ ctx.key }: piece "${ piece.id }" names find "${ piece.find ?? '' }", which the order builder does not know (order-lines, order-values, order-access)` ] };
}
