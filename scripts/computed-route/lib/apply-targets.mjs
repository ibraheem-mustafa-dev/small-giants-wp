// The applier's targets (scripts/computed-route/apply.mjs): every surface with a post behind it, its walker config, and one
// target per paired block. Pairing comes from the surface's `<surface>.fill.mjs`, then its `<surface>.origin.json`. A surface
// without a post or a config is reported, never skipped silently.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadSkeleton, skeletonTargets, surfaceFor } from './apply-skeleton.mjs';

const readJson = ( f, fallback = null ) => ( fs.existsSync( f ) ? JSON.parse( fs.readFileSync( f, 'utf8' ) ) : fallback );

// One { ref, tpl, via } per block a surface pairs: `cr-ref-about-3`, `Root/333#0`. Order: pair, origin; the skeleton adds the rest
// once the post's blocks are known (withSkeleton).
export function pairsOf( cfg, origin = {} ) {
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
	return [ ...out.values() ];
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
		out.push( { name, postId: Number( postId ), shell: s.shell ?? null, site: s.site, cfg: { ...cfg, draft: { ...cfg.draft, url: draftUrl( cfg.draft.url, draftOrigin ) } }, pairs: pairsOf( cfg, origin ) } );
	}
	return { surfaces: out, skipped };
}
