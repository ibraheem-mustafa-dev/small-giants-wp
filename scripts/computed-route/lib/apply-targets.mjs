// The applier's targets (scripts/computed-route/apply.mjs): every surface with a post behind it, its walker config, and one
// target per paired block. Pairing comes from the surface's `<surface>.fill.mjs`, then its `<surface>.origin.json`. A surface
// without a post or a config is reported, never skipped silently.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSkeleton, skeletonTargets, surfaceFor } from './apply-skeleton.mjs';
import { pairId } from './reveal-merge.mjs';

const readJson = ( f, fallback = null ) => ( fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : fallback );

// One { ref, tpl, via } per block a surface pairs: `cr-ref-about-3`, `Root/333#0`. Order: pair, origin; the skeleton adds the rest
// once the post's blocks are known (withSkeleton).
export const pairsOf = ( cfg, origin = {}, refreshed = null ) => pairsReport( cfg, origin, refreshed ).pairs;

// { pairs, refused, stale }. `refreshed` is `<surface>.pairs.json` (lib/refresh-pairs.mjs): its pairs replace the config's and origin's for
// the same ref, and a ref it names unpaired is dropped with its reason. A pair with `reveal` is an element the draft shows only
// in that state, read with the draft put in it (lib/apply-reveal-read.mjs). A draft element that several refs claim with different
// content (their origin fingerprints' text differs) is refused for all of them: a write for one block would land on the others.
export function pairsReport( cfg, origin = {}, refreshed = null ) {
	const out = new Map();
	for ( const p of cfg?.pairs || [] ) {
		const ref = /^\.(cr-ref-[\w-]+)$/.exec( String( p.live ?? '' ) )?.[ 1 ];
		if ( ref && p.draft?.tpl ) {
			out.set( ref, { key: ref, ref, tpl: p.draft.tpl, via: 'pair' } );
		}
	}
	for ( const [ ref, row ] of Object.entries( origin ) ) {
		if ( ! out.has( ref ) && row?.tpl ) {
			out.set( ref, { key: ref, ref, tpl: row.tpl, via: 'origin' } );
		}
	}
	const refused = [];
	// The refreshed file names every saved block, paired or with a reason: an old pair whose ref it does not name is on no block of
	// the post any more, so it is dropped (reported in `stale`), not left to show as a pair without a block.
	const stale = refreshed ? [ ...out.keys() ].filter( ( ref ) => ! ( ref in ( refreshed.pairs || {} ) ) && ! ( ref in ( refreshed.unpaired || {} ) ) && ! ( ref in ( refreshed.structural || {} ) ) ) : [];
	stale.forEach( ( ref ) => out.delete( ref ) );
	for ( const [ ref, tpl ] of Object.entries( refreshed?.pairs || {} ) ) {
		out.set( ref, { key: ref, ref, tpl: tpl.tpl, via: 'refresh', ...( tpl.reveal ? { reveal: tpl.reveal } : {} ), ...( tpl.part ? { part: tpl.part } : {} ) } );
	}
	// A structural block is one the draft draws no element for (lib/pair-wrappers.mjs): reported, never paired.
	for ( const [ ref, why ] of Object.entries( refreshed?.structural || {} ) ) {
		out.delete( ref );
		refused.push( { ref, why, structural: true } );
	}
	for ( const [ ref, why ] of Object.entries( refreshed?.unpaired || {} ) ) {
		out.delete( ref );
		refused.push( { ref, why } );
	}
	const byTpl = new Map();
	for ( const p of [ ...out.values() ].filter( ( x ) => ! x.part ) ) {
		byTpl.set( pairId( p ), [ ...( byTpl.get( pairId( p ) ) || [] ), p.ref ] );
	}
	for ( const [ tpl, refs ] of byTpl ) {
		const content = new Set( refs.map( ( r ) => origin[ r ]?.fingerprint?.textHash ?? '' ).filter( Boolean ) );
		if ( refs.length > 1 && content.size > 1 ) {
			refs.forEach( ( ref ) => {
				out.delete( ref );
				refused.push( { ref, why: `draft element ${ tpl } is claimed by ${ refs.length } blocks with different content; refresh the pairs (refresh-pairs.mjs)` } );
			} );
		}
	}
	return { pairs: [ ...out.values() ], refused, stale };
}

// The draft's address for a surface, on the origin the draft is served from now: a config records the port of its own run.
export function draftUrl( url, origin ) {
	return String( url ).replace( /^https?:\/\/[^/]+/, origin.replace( /\/$/, '' ) );
}

// The surface's pairs plus the skeleton's targets (lib/apply-skeleton.mjs), each with `nearest_tpl`. Every pair also carries `owns`,
// the draft ids its skeleton node owns, so a record that names a wrapper reaches the paired block. `saved`: { ref: { block } }.
// Returns { pairs, notes, aliases }; a client with no skeleton gets its pairs back unchanged.
export function withSkeleton( surface, saved, skeleton ) {
	const sk = surfaceFor( skeleton || [], surface.name );
	if ( ! sk ) {
		return { pairs: surface.pairs, notes: [], aliases: {} };
	}
	const { targets, owners, notes, aliases } = skeletonTargets( { nodes: sk.nodes, pairs: surface.pairs, saved } );
	const pairs = surface.pairs.map( ( p ) => ( owners.has( p.ref ) ? { ...p, owns: [ ...new Set( owners.get( p.ref ).owns ) ], reach: [ ...new Set( owners.get( p.ref ).reach ) ] } : p ) );
	return { pairs: [ ...pairs, ...targets ], notes, aliases };
}

export async function loadSurfaces( { repo, client, only = null, draftOrigin } ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const surfaces = readJson( path.join( build, 'surfaces.json' ), {} );
	const out = [];
	const skipped = [];
	for ( const [ name, s ] of Object.entries( surfaces ) ) {
		if ( only && ! only.includes( name ) ) {
			continue;
		}
		const postId = s.target?.postId;
		const config = path.join( build, 'qa', 'parity', `${ name }.fill.mjs` );
		if ( ! postId || ! fs.existsSync( config ) ) {
			skipped.push( { surface: name, why: postId ? 'no walker config' : 'no post behind this surface' } );
			continue;
		}
		const cfg = ( await import( pathToFileURL( config ).href ) ).default;
		const origin = readJson( path.join( build, `${ name }.origin.json` ), {} );
		const { pairs, refused } = pairsReport( cfg, origin, readJson( path.join( build, `${ name }.pairs.json` ) ) );
		out.push( { name, postId: Number( postId ), shell: s.shell ?? null, site: s.site, cfg: { ...cfg, draft: { ...cfg.draft, url: draftUrl( cfg.draft.url, draftOrigin ) } }, pairs, refused } );
	}
	return { surfaces: out, skipped };
}
