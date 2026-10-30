// The second draft source of a block drawn in two surfaces' renders (Spec 48 §3.4 Fill, RC5). The settings calibration
// measured only under another surface kind's render (lib/fill-render.mjs: the mega panel's drawer look) are read from the
// draft element the same content occupies in that surface's own instance: the render part intake read with its state open
// (lib/intake-skeletons.mjs renderParts, a drawer's section showing the panel's links). Paired by identity, never by class:
//   part     the render part of that kind whose words hold most of the node's own words (at least half of them);
//   slot     a calibrated slot path names a node of the node's own subtree: a block class step (`.sgs-mega-group`) is the
//            next descendant node of that block (its `:nth-of-type(k)`), a tag step (`h3`, `p`) the next descendant node of the
//            block the framework DB files that tag under (`html_tag_to_core_block`), and a step naming a block's own part
//            (`__inner`, `__content`) stays where it is; the empty slot is the node itself;
//   element  that node's own draft element on the surface (its draftRef) holds words: its copy in the part is the one element
//            there with the same words; a node whose element holds no words of its own (a link row, a card, the panel) is the
//            lowest element of the part holding the copies of all its words (the node itself included: the panel is the
//            element holding the section's links and card, not the section's outer frame).
// A slot no node or no copy answers is listed with its reason, never guessed.
import fs from 'fs';
import path from 'path';
import { inventoryModel } from './skeleton-model.mjs';
import { fold } from './skeleton-part-content.mjs';
import { skeletonNodes } from './fill-skeleton.mjs';

const SEGMENT = /^(?:\.sgs-([a-z0-9-]+)(__[a-z0-9-]+)?|([a-z][a-z0-9-]*))(?::nth-of-type\((\d+)\))?$/;
const words = ( m, e ) => fold( m.words( e ) );

// The words the elements of a subtree hold, each with its element: [ { e, w } ].
function wordsUnder( m, root ) {
	const out = [];
	const walk = ( e ) => {
		words( m, e ) && out.push( { e, w: words( m, e ) } );
		m.kids( e ).forEach( walk );
	};
	walk( root );
	return out;
}

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

// The part element standing for one node: { el } or { reason }. barM: the surface's inventory model; partM: the part's.
export function partElement( { node, barM, partM } ) {
	const bar = node.draftRef?.tpl ? barM.byKey[ node.draftRef.tpl ] : null;
	if ( ! bar ) {
		return { reason: `${ node.name } has no draft element on this surface` };
	}
	const partWords = wordsUnder( partM, partM.root );
	const copyOf = ( w ) => {
		const hits = partWords.filter( ( x ) => x.w === w );
		return 1 === hits.length ? hits[ 0 ].e : null;
	};
	const own = words( barM, bar );
	if ( own ) {
		const el = copyOf( own );
		return el ? { el } : { reason: `"${ own }" is not shown once in the part` };
	}
	const copies = wordsUnder( barM, bar ).map( ( x ) => copyOf( x.w ) ).filter( Boolean );
	const el = copies.length ? lowestHolder( partM, copies ) : null;
	return el ? { el } : { reason: `none of the words of ${ node.name }'s draft element is shown once in the part` };
}

// The render part of `kind` whose words hold most of the node's own words, at least half: { part, share } or { reason }.
// parts: [ { slug, context, model } ].
export function choosePart( { node, barM, parts, kind } ) {
	const bar = node.draftRef?.tpl ? barM.byKey[ node.draftRef.tpl ] : null;
	const own = bar ? [ ...new Set( wordsUnder( barM, bar ).map( ( x ) => x.w ) ) ] : [];
	if ( ! own.length ) {
		return { reason: `${ node.name } shows no words on this surface, so no ${ kind } part can be told to be its copy` };
	}
	const scored = parts.filter( ( p ) => p.context === kind ).map( ( p ) => {
		const there = new Set( wordsUnder( p.model, p.model.root ).map( ( x ) => x.w ) );
		return { part: p, share: own.filter( ( w ) => there.has( w ) ).length / own.length };
	} ).sort( ( a, b ) => b.share - a.share );
	const best = scored[ 0 ];
	if ( ! best || best.share < 0.5 ) {
		return { reason: `no ${ kind } part shows half of ${ node.name }'s words (best ${ best ? `${ best.part.slug } at ${ Math.round( best.share * 100 ) }%` : 'none read' })` };
	}
	return best;
}

// The second source of one node for the settings it draws only in a `kind` render: { part (slug), draftRef, draftSlots,
// unpaired: [ { slot, reason } ] } or { reason }. settings: the node's slot-map settings of that render ({ attr: setting });
// finderOf( partElement ): the finder Fill resolves in the served draft.
export function renderSource( { node, settings, kind, parts, barM, tagBlocks, finderOf } ) {
	const chosen = choosePart( { node, barM, parts, kind } );
	if ( ! chosen.part ) {
		return { reason: chosen.reason };
	}
	const partM = chosen.part.model;
	const slots = [ ...new Set( Object.values( settings ).flatMap( ( s ) => s.slots || [ s.slot ] ).map( ( p ) => String( p ?? '' ) ) ) ];
	const draftSlots = {};
	const unpaired = [];
	for ( const slot of slots.filter( Boolean ) ) {
		const at = slotNode( node, slot, tagBlocks );
		const found = at.node ? partElement( { node: at.node, barM, partM } ) : at;
		found.el ? ( draftSlots[ slot ] = finderOf( found.el ) ) : unpaired.push( { slot, reason: found.reason } );
	}
	const self = partElement( { node, barM, partM } );
	return { part: chosen.part.slug, share: chosen.share, draftRef: finderOf( self.el ?? partM.root ), draftSlots, unpaired };
}

// The writes of every node's settings drawn only in another surface's render, read from that render's part (renderSource).
// o: { tree (the filled tree), nodes (lib/fill-skeleton.mjs::skeletonNodes), refOf, calFor (the render-scoped loader:
// lib/fill-render.mjs::renderScoped), fullCalFor (the unscoped loader), parts ([ { slug, context, model (its inventory
// model), entry (intake.json renderParts[slug]), record (its surfaces.json record) } ]), barM (the surface's inventory
// model), tagBlocks, finderOf, read( { nodes, part } ) (the draft read of those nodes with that part open: Fill's readDraft),
// fill( { tree, nodes, reads, calFor } ) (Fill's resolve pass on them) }. Each node is read through a copy of it (its own
// subtree's blocks, no other draft element) whose draftRef and draftSlots name the part's elements, resolved against the
// block's slot map of that render only; what the copy writes is set on the node. Returns { writes, unmapped, unread (the
// slots and settings left unread, with their reasons), sources ([ { node, part, share, slots } ]) }.
export async function renderSourceWrites( { tree, nodes, refOf, calFor, fullCalFor, parts, barM, tagBlocks, finderOf, read, fill } ) {
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
			const src = renderSource( { node: draft, settings, kind, parts, barM, tagBlocks, finderOf } );
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
			out.sources.push( { node: refOf( node ), part: src.part, share: src.share, slots: Object.keys( src.draftSlots ).length } );
		}
	}
	return out;
}

// The render parts intake read (intake.json `renderParts`), each with its saved inventory's model and its surfaces.json
// record: [ { slug, context, model, entry, record } ]. A part whose inventory is not saved is left out.
export function loadRenderParts( { intake, inventoriesDir, records = [] } ) {
	return Object.entries( intake?.renderParts || {} ).flatMap( ( [ slug, entry ] ) => {
		const file = path.join( inventoriesDir, `${ slug }.json` );
		const own = records.find( ( r ) => r.id === entry.id ) ?? null;
		return fs.existsSync( file ) ? [ { slug, context: entry.context, entry, record: withParentKeys( own, records ), model: inventoryModel( JSON.parse( fs.readFileSync( file, 'utf8' ) ) ) } ] : [];
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
