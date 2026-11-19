// The draft's own tokens as a lookup for the shared var() reader (scripts/parity/lib/css-vars.mjs::resolveVars): every
// custom property declared in the export's token files (tokens/*.css) and in the `<style>` blocks of its drafts. A name
// takes its last declaration on :root, html or :host outside any at-rule, else its first declaration (the rule
// lib/tokens.mjs::resolveTokens follows). Read once per folder.
import fs from 'fs';
import path from 'path';
import { parseTokenCss } from './tokens.mjs';
import { resolveVars, resolvedOrRaw } from '../../parity/lib/css-vars.mjs';

const ROOTISH = /^(:root|html|:host)$/i;
const cache = new Map();

// { name: value as written } for a handoff folder (an empty object when it has no tokens and no drafts).
export function draftTokens( folder ) {
	if ( ! folder || ! fs.existsSync( folder ) ) {
		return {};
	}
	if ( cache.has( folder ) ) {
		return cache.get( folder );
	}
	const found = [];
	const dir = path.join( folder, 'tokens' );
	for ( const f of fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( n ) => n.toLowerCase().endsWith( '.css' ) ).sort() : [] ) {
		found.push( ...parseTokenCss( fs.readFileSync( path.join( dir, f ), 'utf8' ), `tokens/${ f }` ) );
	}
	for ( const f of fs.readdirSync( folder ).filter( ( n ) => n.endsWith( '.dc.html' ) ).sort() ) {
		for ( const m of fs.readFileSync( path.join( folder, f ), 'utf8' ).matchAll( /<style[^>]*>([\s\S]*?)<\/style>/gi ) ) {
			found.push( ...parseTokenCss( m[ 1 ], f ) );
		}
	}
	const out = {};
	const rooted = new Set();
	for ( const t of found ) {
		const root = ROOTISH.test( String( t.selector ).trim() ) && ! t.media;
		if ( root || ! ( t.name in out ) ) {
			if ( root || ! rooted.has( t.name ) ) {
				out[ t.name ] = String( t.value ).trim();
			}
			root && rooted.add( t.name );
		}
	}
	cache.set( folder, out );
	return out;
}

// The lookup resolveVars takes, for a handoff folder.
export function draftTokenLookup( folder ) {
	const map = draftTokens( folder );
	return ( name ) => map[ name ];
}

// The handoff folder of a skeleton facts object ({ repo, client }), or null.
export const handoffOf = ( facts ) => ( facts?.repo && facts?.client ? path.join( facts.repo, 'sites', facts.client, 'handoff' ) : null );

export { resolveVars, resolvedOrRaw };
