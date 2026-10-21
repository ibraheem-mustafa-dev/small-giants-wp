// Carried IDs (Spec 48 FR-48-58): an attachment or menu id the skeleton takes from what was built, never from a
// hand-set decision. A logo block's `logoId` is the media-map attachment of the file the draft element draws: an <img>'s
// `src`, or, for a custom element that loads its image by an attribute value (`<x-logo variant="square">` with
// `{ square: './assets/logo-square.svg' }` in its script), the file that script's source map names for that value.
// The entry is chosen by the local sha256 of the draft's own file against the media map's source `sha256` (not
// `storedSha256`, the bytes WordPress kept). A navigation block's `ref` is the id of the menu site-build made for the
// surface, recorded by name in `sites/<client>/build/menu-map.json` ({ sites: { <site>: { menus: { <name>: <id> } } } }).
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { parseLogic, keyName } from './intake-ast.mjs';
import { boundMenu } from './site-build-map.mjs';

const IMAGE = /\.(svg|png|jpe?g|gif|webp|avif)$/i;
const sha = ( file ) => crypto.createHash( 'sha256' ).update( fs.readFileSync( file ) ).digest( 'hex' );
const readJson = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );
const walk = ( dir ) => ( fs.existsSync( dir ) ? fs.readdirSync( dir, { withFileTypes: true } ).flatMap( ( d ) => ( d.isDirectory() ? ( 'node_modules' === d.name ? [] : walk( path.join( dir, d.name ) ) ) : [ path.join( dir, d.name ) ] ) ) : [] );

// { value -> [ image path relative to the handoff folder ] } from every script's `{ <value>: '<image path>' }` property.
export function sourceMaps( folder ) {
	const out = new Map();
	for ( const file of walk( folder ).filter( ( f ) => f.endsWith( '.js' ) ) ) {
		let idx;
		try {
			idx = parseLogic( fs.readFileSync( file, 'utf8' ) );
		} catch {
			continue;
		}
		for ( const p of idx.all.filter( ( n ) => 'ObjectProperty' === n.type && 'StringLiteral' === n.value?.type && IMAGE.test( n.value.value ) ) ) {
			const key = keyName( p );
			const rel = path.relative( folder, path.resolve( path.dirname( file ), p.value.value ) ).split( path.sep ).join( '/' );
			key && ! rel.startsWith( '..' ) && out.set( key, [ ...new Set( [ ...( out.get( key ) || [] ), rel ] ) ] );
		}
	}
	return out;
}

// The draft image an element draws, as a path inside the handoff folder: its <img> src, else the one file a script's
// source map names for a static attribute value of the element's own tag. null when there is none or it is ambiguous.
export function logoFile( { e, maps } ) {
	if ( 'img' === e.tag ) {
		const src = String( e.attrs?.src ?? '' ).split( /[?#]/ )[ 0 ].replace( /^(?:\.{0,2}\/)+/, '' );
		return src && ! /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test( src ) ? src : null;
	}
	const open = /^<[^>]+>/.exec( String( e.snippet || '' ).trim() )?.[ 0 ] || '';
	const values = [ ...open.matchAll( /\s([a-z][\w-]*)="([^"{}]+)"/gi ) ].filter( ( m ) => ! /^(style|class|aria-label|data-|id$)/i.test( m[ 1 ] ) ).map( ( m ) => m[ 2 ] );
	const files = [ ...new Set( values.flatMap( ( v ) => maps.get( v ) || [] ) ) ];
	return 1 === files.length ? files[ 0 ] : null;
}

// The media-map entry for a draft file: among the site's entries naming that path, the one whose source sha256 is the
// local file's. Returns { id, asset } or { reason }.
export function mediaEntry( { map, site, repo, folder, file } ) {
	const local = path.join( folder, file );
	if ( ! fs.existsSync( local ) ) {
		return { reason: `${ file } is not a file of the draft` };
	}
	const want = sha( local );
	const named = ( map?.sites?.[ site ]?.files || [] ).filter( ( f ) => f.asset === file || String( f.asset ).endsWith( `/${ file }` ) );
	const hits = named.filter( ( f ) => f.sha256 === want && Number.isInteger( f.id ) );
	const ids = new Set( hits.map( ( h ) => h.id ) );
	if ( 1 === ids.size ) {
		return { id: hits[ 0 ].id, asset: hits[ 0 ].asset };
	}
	return { reason: ids.size ? `${ file } matches different attachments (${ [ ...ids ].join( ', ' ) })` : `${ file } (sha256 ${ want.slice( 0, 8 ) }) is not in the media map for ${ site }` };
}

// What the skeleton carries for one client and site: { logo( e ) -> { id, asset } | { reason } | null, menu( kind ) -> id | null }.
export function carriedIds( { repo, client, site } ) {
	const build = path.join( repo, 'sites', client, 'build' );
	const folder = path.join( repo, 'sites', client, 'handoff' );
	const map = readJson( path.join( build, 'media-map.json' ) );
	const menus = readJson( path.join( build, 'menu-map.json' ) )?.sites?.[ site ]?.menus || {};
	let maps = null;
	return {
		logo: ( e ) => {
			if ( ! site || ! map || ! fs.existsSync( folder ) ) {
				return null;
			}
			maps ||= sourceMaps( folder );
			const file = logoFile( { e, maps } );
			return file ? mediaEntry( { map, site, repo, folder, file } ) : null;
		},
		menu: ( kind ) => {
			const id = menus[ boundMenu( kind, Object.keys( menus ) ) ];
			return Number.isInteger( id ) && id > 0 ? id : null;
		},
	};
}
