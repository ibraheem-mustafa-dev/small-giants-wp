// The second draft source of a block drawn in two surfaces' renders (Spec 48 §3.4 Fill, RC5). The settings calibration
// measured only under another surface kind's render (lib/fill-render.mjs: the mega panel's drawer look) are read from the
// draft element the same content occupies in that surface's own instance: the render part intake read with its state open
// (lib/intake-skeletons.mjs renderParts, a drawer's section showing the panel's links). Paired by draft identity (FR-48-10),
// never by class or words:
//   identity a draft element's identity is the data its bindings show, read from the logic's syntax tree with each surface's
//            own open state (lib/render-identity.mjs::identityKeys: `this._menus[1].links[0].label`, the first link's label
//            of the menu the state opens), so the panel's `{{ link.label }}` over `activePanel.links` and the drawer section's
//            `{{ link.label }}` over `item.mobileLinks` are one element of data drawn by two templates;
//   part     the render part of that kind sharing the most identity keys with the node's own draft subtree;
//   slot     a calibrated slot path names a node of the node's own subtree: a block class step (`.sgs-mega-group`) is the
//            next descendant node of that block (its `:nth-of-type(k)`), a tag step (`h3`, `p`) the next descendant node of the
//            block the framework DB files that tag under (`html_tag_to_core_block`), and a step naming a block's own part
//            (`__inner`, `__content`) stays where it is; the empty slot is the node itself;
//   element  that node's draft element pairs with the part element holding its identity keys; an element with no identity of
//            its own (a link row's inner box, a card, the panel) stands for the lowest part element holding the copies of its
//            descendants' identities. Words only cross-check a pair: a pair whose own words differ is a disagreement row.
// A slot no node or no identity answers is listed with its reason, never guessed.
import fs from 'fs';
import path from 'path';
import { inventoryModel } from './skeleton-model.mjs';
import { fold } from './skeleton-part-content.mjs';
import { skeletonNodes } from './fill-skeleton.mjs';
import { identityKeys } from './render-identity.mjs';
import { otherRenderRows } from './fill-render.mjs';
import { stateOpener, readUrlOf, describeWays } from './fill-open.mjs';
import { readDraft } from './fill-read.mjs';
import { draftLogicOf } from './skeleton-narrowing.mjs';
import { refOf } from './tree.mjs';
import { servedKey, translateElement } from './key-space.mjs';

const SEGMENT = /^(?:\.sgs-([a-z0-9-]+)(__[a-z0-9-]+)?|([a-z][a-z0-9-]*))(?::nth-of-type\((\d+)\))?$/;

// The node of `node`'s subtree a calibrated slot path names, or { reason }. tagBlocks: { tag: Set of blocks the DB files it under }.
export function slotNode( node, slot, tagBlocks ) {
	let at = node;
	const steps = String( slot ?? '' ).replace( /::[a-z-]+$/, '' ).split( ' > ' ).filter( Boolean );
	for ( const step of steps ) {
		const s = SEGMENT.exec( step.trim() );
		if ( ! s ) {
			return { reason: `the slot step "${ step }" names no block or tag` };
		}
		const [ , name, part, tag, nth ] = s;
		if ( part ) {
			continue;
		}
		const fits = name ? ( n ) => n.name === `sgs/${ name }` : ( n ) => !! tagBlocks[ tag ]?.has( n.name );
		const found = [];
		const queue = [ ...( at.innerBlocks || [] ) ];
		while ( queue.length ) {
			const n = queue.shift();
			fits( n ) ? found.push( n ) : queue.push( ...( n.innerBlocks || [] ) );
		}
		const next = found[ ( Number( nth ) || 1 ) - 1 ];
		if ( ! next ) {
			return { reason: `no node of ${ at.name }'s subtree answers the slot step "${ step }"` };
		}
		at = next;
	}
	return { node: at };
}

// The lowest element of the part holding every element of `els`.
function lowestHolder( m, els ) {
	const chain = ( e ) => {
		const out = [];
		for ( let p = e; p; p = m.byKey[ p.parentKey ] ) {
			out.push( p );
		}
		return out;
	};
	const first = chain( els[ 0 ] );
	return first.find( ( a ) => els.every( ( e ) => chain( e ).includes( a ) ) ) ?? null;
}

// The part element standing for one bar element: { el, check? } or { reason }. bar: the node's draft element on the surface;
// barIds, partIds: identityKeys of the node's draft subtree and of the part. `check` is the words cross-check's disagreement.
export function partElement( { bar, barM, partM, barIds, partIds } ) {
	if ( ! bar ) {
		return { reason: 'the node has no draft element on this surface' };
	}
	const copies = ( e ) => [ ...new Set( ( barIds.keys.get( e ) || [] ).map( ( k ) => partIds.byKey.get( k ) ).filter( Boolean ) ) ];
	const own = copies( bar );
	if ( own.length > 1 ) {
		return { reason: `its identity keys name ${ own.length } different elements of the part` };
	}
	if ( own.length ) {
		const [ a, b ] = [ fold( barM.words( bar ) ), fold( partM.words( own[ 0 ] ) ) ];
		return { el: own[ 0 ], ...( a && b && a !== b ? { check: `the identity pair shows "${ a }" on this surface and "${ b }" in the part` } : {} ) };
	}
	const under = [];
	const walk = ( e ) => barM.kids( e ).forEach( ( k ) => {
		under.push( ...copies( k ) );
		walk( k );
	} );
	walk( bar );
	const el = under.length ? lowestHolder( partM, under ) : null;
	return el ? { el } : { reason: 'neither it nor any element inside it carries an identity the part shows' };
}

// The render part of `kind` sharing the most identity keys with the node's draft subtree: { part, partIds, shared } or
// { reason }. parts: [ { slug, context, model, state } ]; idsOf( model, root, state ): identityKeys for a subtree.
export function choosePart( { bar, barIds, parts, kind, idsOf } ) {
	const scored = parts.filter( ( p ) => p.context === kind ).map( ( p ) => {
		const partIds = idsOf( p.model, p.model.root, p.state );
		return { part: p, partIds, shared: [ ...barIds.byKey.keys() ].filter( ( k ) => partIds.byKey.has( k ) ).length };
	} ).sort( ( a, b ) => b.shared - a.shared );
	const best = scored[ 0 ];
	if ( ! bar || ! best || ! best.shared ) {
		return { reason: `no ${ kind } part shows the data this node's draft elements show (${ scored.length } ${ kind } parts read)` };
	}
	return best;
}

// The second source of one node for the settings it draws only in a `kind` render: { part (slug), shared, draftRef,
// draftSlots, unpaired: [ { slot, reason } ], checks: [ { slot, reason } ] } or { reason }. settings: the node's slot-map
// settings of that render ({ attr: setting }); finderOf( partElement ): the finder Fill resolves in the served draft;
// identity: { d (the component's logic), records (the fact record's elements), keyOf, state (this surface's open state) }.
export function renderSource( { node, settings, kind, parts, barM, tagBlocks, finderOf, identity } ) {
	const barOf = ( n ) => ( n.draftRef?.tpl ? barM.byKey[ n.draftRef.tpl ] ?? null : null );
	const idsOf = ( m, root, state ) => identityKeys( { d: identity.d, records: identity.records, m, root, keyOf: identity.keyOf, state } );
	const bar = barOf( node );
	const barIds = bar ? idsOf( barM, bar, identity.state ) : null;
	const chosen = barIds ? choosePart( { bar, barIds, parts, kind, idsOf } ) : { reason: `${ node.name } has no draft element on this surface` };
	if ( ! chosen.part ) {
		return { reason: chosen.reason };
	}
	const partM = chosen.part.model;
	const pair = ( n ) => partElement( { bar: barOf( n ), barM, partM, barIds, partIds: chosen.partIds } );
	const slots = [ ...new Set( Object.values( settings ).flatMap( ( s ) => s.slots || [ s.slot ] ).map( ( p ) => String( p ?? '' ) ) ) ];
	const draftSlots = {};
	const unpaired = [];
	const checks = [];
	for ( const slot of slots.filter( Boolean ) ) {
		const at = slotNode( node, slot, tagBlocks );
		const found = at.node ? pair( at.node ) : at;
		found.el ? ( draftSlots[ slot ] = finderOf( found.el ) ) : unpaired.push( { slot, reason: found.reason } );
		found.check && checks.push( { slot, reason: found.check } );
	}
	const self = pair( node );
	if ( ! self.el ) {
		return { reason: `${ chosen.part.slug }: the node itself: ${ self.reason }` };
	}
	return { part: chosen.part.slug, shared: chosen.shared, draftRef: finderOf( self.el ), draftSlots, unpaired, checks };
}

// The writes of every node's settings drawn only in another surface's render, read from that render's part (renderSource).
// o: { tree (the filled tree), nodes (lib/fill-skeleton.mjs::skeletonNodes), refOf, calFor (the render-scoped loader:
// lib/fill-render.mjs::renderScoped), fullCalFor (the unscoped loader), identity (renderSource's), parts ([ { slug, context, model (its inventory
// model), entry (intake.json renderParts[slug]), record (its surfaces.json record) } ]), barM (the surface's inventory
// model), tagBlocks, finderOf, read( { nodes, part } ) (the draft read of those nodes with that part open: Fill's readDraft),
// fill( { tree, nodes, reads, calFor } ) (Fill's resolve pass on them) }. Each node is read through a copy of it (its own
// subtree's blocks, no other draft element) whose draftRef and draftSlots name the part's elements, resolved against the
// block's slot map of that render only; what the copy writes is set on the node. Returns { writes, unmapped, unread (the
// slots and settings left unread, with their reasons), sources ([ { node, part, shared, slots } ]) }.
export async function renderSourceWrites( { tree, nodes, refOf, calFor, fullCalFor, parts, barM, tagBlocks, finderOf, identity, read, fill } ) {
	const out = { writes: [], unmapped: [], unread: [], sources: [] };
	const flat = [];
	const walkTree = ( list ) => list.forEach( ( n ) => {
		flat.push( n );
		walkTree( n.innerBlocks || [] );
	} );
	walkTree( tree );
	for ( const rec of nodes.filter( ( n ) => n.targets.length ) ) {
		const other = calFor( rec.name )?.otherRender || {};
		// The skeleton node (its draftRef and its children's) pairs; the filled tree's node takes the writes.
		const node = flat[ rec.index ];
		const draft = rec.node ?? node;
		for ( const kind of [ ...new Set( Object.values( other ) ) ] ) {
			const attrs = Object.keys( other ).filter( ( a ) => other[ a ] === kind );
			const full = fullCalFor( rec.name );
			const settings = Object.fromEntries( attrs.filter( ( a ) => full?.settings?.[ a ] ).map( ( a ) => [ a, full.settings[ a ] ] ) );
			const src = renderSource( { node: draft, settings, kind, parts, barM, tagBlocks, finderOf, identity } );
			if ( ! src.part ) {
				out.unread.push( { node: refOf( node ), block: rec.name, kind: 'render', slot: '', settings: attrs, reason: src.reason } );
				continue;
			}
			const strip = ( n ) => ( { name: n.name, attributes: { ...( n.attributes || {} ) }, innerBlocks: ( n.innerBlocks || [] ).map( strip ) } );
			const copy = { ...strip( node ), draftRef: src.draftRef, draftSlots: src.draftSlots };
			const copyNodes = skeletonNodes( [ copy ] );
			const part = parts.find( ( p ) => p.slug === src.part );
			const reads = await read( { nodes: copyNodes, part } );
			const scoped = { ...full, settings };
			const res = fill( { tree: [ copy ], nodes: copyNodes, reads, calFor: ( b ) => ( b === rec.name ? scoped : null ) } );
			for ( const w of res.writes.filter( ( x ) => attrs.includes( x.attr ) ) ) {
				node.attributes = { ...( node.attributes || {} ), [ w.attr ]: copy.attributes[ w.attr ] };
				out.writes.push( { ...w, node: refOf( node ), index: rec.index, renderSource: src.part } );
			}
			out.unmapped.push( ...res.unmapped.map( ( u ) => ( { ...u, renderSource: src.part } ) ) );
			const written = new Set( out.writes.filter( ( w ) => w.index === rec.index ).map( ( w ) => w.attr ) );
			src.unpaired.length && out.unread.push( ...src.unpaired.map( ( u ) => ( { node: refOf( node ), block: rec.name, kind: 'render', slot: u.slot, settings: attrs.filter( ( a ) => ! written.has( a ) && ( settings[ a ].slots || [ settings[ a ].slot ] ).includes( u.slot ) ), reason: `${ src.part }: ${ u.reason }` } ) ).filter( ( u ) => u.settings.length ) );
			out.unmapped.push( ...src.checks.map( ( c ) => ( { node: refOf( node ), block: rec.name, slot: c.slot, property: 'identity', value: src.part, reason: `render-identity: ${ c.reason }`, renderSource: src.part } ) ) );
			out.sources.push( { node: refOf( node ), part: src.part, shared: src.shared, slots: Object.keys( src.draftSlots ).length } );
		}
	}
	return out;
}

// The render parts intake read (intake.json `renderParts`), each with its saved inventory's model and its surfaces.json
// record and the state it was read in: [ { slug, context, model, entry, record, state } ]. A part whose inventory is not
// saved is left out.
export function loadRenderParts( { intake, inventoriesDir, records = [] } ) {
	return Object.entries( intake?.renderParts || {} ).flatMap( ( [ slug, entry ] ) => {
		const file = path.join( inventoriesDir, `${ slug }.json` );
		const record = withParentKeys( records.find( ( r ) => r.id === entry.id ) ?? null, records );
		// The state the part was read in, its parent surfaces' open keys joined: the state its identities are pinned with.
		const state = ( record?.states || [] ).find( ( st ) => st.name === entry.opened?.state )?.state_keys ?? entry.opened?.keys ?? {};
		return fs.existsSync( file ) ? [ { slug, context: entry.context, entry, record, state, model: inventoryModel( JSON.parse( fs.readFileSync( file, 'utf8' ) ) ) } ] : [];
	} );
}

// A part's surfaces.json record with each of its states also holding the keys that open the surfaces it shows inside (its
// `parent` chain, root-most first; a part's own key wins): a drawer section opens only inside the open drawer, so its
// state `{ acc: 1 }` is set as `{ mobileOpen: true, acc: 1 }`. A parent's opening state is its state named open, else its
// first state setting a key to a value other than null or false. records: every surfaces.json record.
export function withParentKeys( record, records ) {
	if ( ! record ) {
		return null;
	}
	const byId = new Map( records.map( ( r ) => [ r.id, r ] ) );
	const opening = ( r ) => ( r.states || [] ).filter( ( st ) => Object.values( st.state_keys || {} ).some( ( v ) => null != v && false !== v ) );
	const chain = [];
	for ( let p = byId.get( record.parent ), seen = new Set(); p && ! seen.has( p.id ); seen.add( p.id ), p = byId.get( p.parent ) ) {
		chain.unshift( p );
	}
	const keys = Object.assign( {}, ...chain.map( ( p ) => ( opening( p ).find( ( st ) => /^open$/i.test( st.name || '' ) ) ?? opening( p )[ 0 ] )?.state_keys || {} ) );
	return { ...record, states: ( record.states || [] ).map( ( st ) => ( { ...st, state_keys: { ...keys, ...( st.state_keys || {} ) } } ) ) };
}

// The blocks the framework DB files each HTML tag under (`html_tag_to_core_block`): { tag: Set of block names }.
export function tagBlocksOf( db ) {
	const out = {};
	for ( const r of db.prepare( 'SELECT html_tag, core_block_slug FROM html_tag_to_core_block' ).all() ) {
		( out[ r.html_tag ] ??= new Set() ).add( r.core_block_slug );
	}
	return out;
}

// Fill's render-source pass over one surface (fill.mjs): every node's settings drawn only in another surface's render are read
// from that render's part and merged into `result` (its writes, unmapped rows, notes and not-read rows); the settings no part
// answers stay listed with their reason. o: { result, tree, nodes, flat, calFor (render-scoped), fullCalFor, inventory (the
// surface's skeleton inventory), db, intake, handoffFile, facts, rootComponent, widthKeys, url (the served draft), state (this
// surface's open state keys), draftFolder, read ({ headless, external, mirror, states }: readDraft's options), inventoriesDir,
// fill( opts ) (Fill's resolve pass), log }.
export async function renderSourcePass( o ) {
	const { result, tree, nodes, flat, calFor, facts, rootComponent } = o;
	const records = fs.existsSync( o.handoffFile ) ? JSON.parse( fs.readFileSync( o.handoffFile, 'utf8' ) ).records || [] : [];
	const component = rootComponent ?? null;
	const d = facts && component ? draftLogicOf( { folder: o.draftFolder, record: { sources: facts.sources }, component } ) : null;
	const second = await renderSourceWrites( {
		tree, nodes, refOf, calFor, fullCalFor: o.fullCalFor, barM: o.inventory ? inventoryModel( o.inventory ) : null, tagBlocks: tagBlocksOf( o.db ),
		parts: loadRenderParts( { intake: o.intake, inventoriesDir: o.inventoriesDir, records } ),
		finderOf: ( e ) => ( { tpl: servedKey( e.key, rootComponent ) } ),
		identity: { d, records: facts?.elements ?? {}, keyOf: ( e ) => translateElement( e, rootComponent ).templateKey ?? null, state: o.state },
		read: async ( { nodes: list, part } ) => {
			const opener = stateOpener( { entry: { states: {} }, skeleton: part.entry, record: part.record, facts, rootComponent, widthKeys: o.widthKeys } );
			o.log( `render part ${ part.slug }: ${ opener?.state ? describeWays( opener ) : 'no opener' }` );
			return readDraft( { url: readUrlOf( { url: o.url, opener, record: part.entry, routing: o.intake?.routing } ), nodes: list, opener, sweep: false, logicRows: [], log: o.log, ...o.read } );
		},
		fill: o.fill,
	} );
	result.writes.push( ...second.writes );
	result.unmapped.push( ...second.unmapped );
	result.notes.push( ...second.sources.map( ( x ) => `${ x.node }: settings drawn only in another render read from ${ x.part } (${ x.shared } identity keys shared, ${ x.slots } slots paired)` ) );
	const answered = new Set( second.writes.map( ( w ) => `${ w.node }|${ w.attr }` ) );
	const listed = nodes.filter( ( n ) => n.targets.length ).map( ( n ) => ( { name: n.name, ref: refOf( flat[ n.index ] ) } ) );
	result.unread.push(
		...otherRenderRows( listed, calFor ).filter( ( r ) => ! [ ...second.sources, ...second.unread ].some( ( x ) => x.node === r.node ) ).map( ( r ) => ( { node: r.node, block: r.block, kind: 'render', slot: '', settings: r.settings, reason: r.reason } ) ),
		...second.unread.map( ( u ) => ( { ...u, settings: u.settings.filter( ( a ) => ! answered.has( `${ u.node }|${ a }` ) ) } ) ).filter( ( u ) => u.settings.length ),
	);
	return second;
}
