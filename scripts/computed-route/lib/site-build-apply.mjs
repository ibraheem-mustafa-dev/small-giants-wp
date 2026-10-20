// The site build's writer (Spec 48 FR-48-55): runs one phase of a plan (lib/site-build-plan.mjs) against a site.
// Every post is built through scripts/wp-build-page.js (the editor serialises each block); every other write is a
// WP-CLI call: `wp post update` and `wp post meta update` (the row key and tree hash the next run compares, and a mega
// panel's section page), `wp menu`
// and `wp menu item` (part 3; a new menu is marked with its page-map name, and no item is ever deleted), `wp option update` (part 4), `wp rewrite` (part 5) and `wp sgs <area> set-active`
// (part 7, through Sgs_Active_Layout::set_active, never a raw option write).
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MENU_META, ROW_META, SECTION_META, TREE_META } from './site-build-state.mjs';

// How long each editor load and save may take: twice wp-build-page.js's 60 s default, since a shared host can stall an
// admin page past it; a run stopped by a stall resumes from the posts already made.
const EDITOR_TIMEOUT = 120000;

// A build runner over wp-build-page.js for one site's secrets file: ({ create, title, slug } | { postId }, tree) -> id.
export function wpBuildPage( repo, site ) {
	const envKey = site.toUpperCase().replace( /[^A-Z0-9]/g, '' );
	return ( target, tree ) => {
		const file = path.join( os.tmpdir(), `site-build-${ process.pid }-${ Date.now() }.tree.json` );
		fs.writeFileSync( file, JSON.stringify( tree ) );
		const args = [ path.join( repo, 'scripts', 'wp-build-page.js' ), '--env-file', path.join( repo, '.claude', 'secrets', `${ site }.env` ), '--env-key', envKey, '--tree', file,
			...( target.postId ? [ '--post-id', String( target.postId ) ] : [ '--create', target.create, '--title', target.title, '--slug', target.slug ] ), '--status', 'publish', '--editor-timeout', String( EDITOR_TIMEOUT ) ];
		let out = '';
		try {
			out = execFileSync( process.execPath, args, { encoding: 'utf8', timeout: 600000, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
		} catch ( e ) {
			const err = new Error( `wp-build-page.js failed (exit ${ e.status }): ${ String( e.stderr || '' ).trim().slice( -600 ) || String( e.stdout || '' ).trim().slice( -600 ) }` );
			err.id = lastJson( e.stdout )?.id || null;
			throw err;
		} finally {
			fs.rmSync( file, { force: true } );
		}
		const result = lastJson( out );
		if ( ! result?.ok || ! Number.isInteger( result.id ) ) {
			const err = new Error( `wp-build-page.js printed no saved post: ${ out.trim().slice( -400 ) }` );
			err.id = result?.id || null;
			throw err;
		}
		return result.id;
	};
}

function lastJson( text ) {
	const line = String( text || '' ).trim().split( /\r?\n/ ).reverse().find( ( l ) => l.startsWith( '{' ) );
	try {
		return line ? JSON.parse( line ) : null;
	} catch {
		return null;
	}
}

// Runs the plan's actions of one phase in order. `wp(args)` runs WP-CLI and returns its stdout; `build(target, tree)`
// returns the saved post id; `onId(key, id)` records a row's new id (the caller writes the page map at once, so a
// failure later keeps every post made before it). `refs` maps the refs of posts, menus and items made so far.
export function applyPhase( actions, phase, { wp, build, onId, log = () => {}, refs = {} } ) {
	const val = ( v ) => {
		if ( v && 'object' === typeof v && v.ref ) {
			if ( ! refs[ v.ref ] ) {
				throw new Error( `${ v.ref } was not made before the step that needs it` );
			}
			return refs[ v.ref ];
		}
		return v;
	};
	const porcelain = ( out ) => {
		const id = parseInt( String( out ).trim().split( /\s+/ ).pop(), 10 );
		if ( ! Number.isInteger( id ) || id <= 0 ) {
			throw new Error( `expected an id, WP-CLI printed: ${ String( out ).trim().slice( 0, 200 ) }` );
		}
		return id;
	};
	// WordPress ignores an empty page_template, so clearing one sends `default` (get_page_template_slug reads it as '').
	const fieldArgs = ( fields ) => Object.entries( fields ).map( ( [ k, v ] ) => `--${ k }=${ 'page_template' === k && '' === v ? 'default' : val( v ) }` );
	let done = 0;
	for ( const a of actions.filter( ( x ) => x.phase === phase ) ) {
		log( `  ${ a.say }` );
		if ( 'adopt' === a.type ) {
			refs[ `post:${ a.key }` ] = a.id;
			onId( a.key, a.id );
		} else if ( 'create' === a.type ) {
			let id;
			try {
				id = build( { create: a.postType, title: a.title, slug: a.slug }, a.tree );
			} catch ( e ) {
				if ( e.id ) {
					onId( a.key, e.id );
				}
				throw e;
			}
			refs[ `post:${ a.key }` ] = id;
			onId( a.key, id );
			wp( [ 'post', 'meta', 'update', String( id ), ROW_META, a.key ] );
			wp( [ 'post', 'meta', 'update', String( id ), TREE_META, a.hash ] );
			if ( Object.keys( a.fields ).length ) {
				wp( [ 'post', 'update', String( id ), ...fieldArgs( a.fields ) ] );
			}
		} else if ( 'build' === a.type ) {
			build( { postId: a.id }, a.tree );
			wp( [ 'post', 'meta', 'update', String( a.id ), TREE_META, a.hash ] );
		} else if ( 'section' === a.type ) {
			wp( [ 'post', 'meta', 'update', String( val( a.id ) ), SECTION_META, String( val( a.page ) ) ] );
		} else if ( 'update' === a.type ) {
			wp( [ 'post', 'update', String( a.id ), ...fieldArgs( a.fields ) ] );
		} else if ( 'menu' === a.type ) {
			refs[ `menu:${ a.name }` ] = porcelain( wp( [ 'menu', 'create', a.name, '--porcelain' ] ) );
			wp( [ 'term', 'meta', 'update', String( refs[ `menu:${ a.name }` ] ), MENU_META, a.name ] );
		} else if ( 'item-add' === a.type ) {
			const parent = val( a.parent );
			const tail = [ `--position=${ a.position }`, ...( parent ? [ `--parent-id=${ parent }` ] : [] ), '--porcelain' ];
			refs[ a.key ] = porcelain( 'post' === a.kind
				? wp( [ 'menu', 'item', 'add-post', String( val( a.menu ) ), String( val( a.object ) ), ...( a.title ? [ `--title=${ a.title }` ] : [] ), ...tail ] )
				: wp( [ 'menu', 'item', 'add-custom', String( val( a.menu ) ), a.title, '#', ...tail ] ) );
		} else if ( 'item-update' === a.type ) {
			wp( [ 'menu', 'item', 'update', String( a.id ), `--position=${ a.position }`, `--parent-id=${ val( a.parent ) || 0 }`, ...( a.title ? [ `--title=${ a.title }` ] : [] ) ] );
		} else if ( 'location' === a.type ) {
			wp( [ 'menu', 'location', 'assign', String( val( a.menu ) ), a.location ] );
		} else if ( 'option' === a.type ) {
			wp( [ 'option', 'update', a.name, String( val( a.value ) ) ] );
		} else if ( 'permalinks' === a.type ) {
			wp( [ 'rewrite', 'structure', a.value, '--hard' ] );
			wp( [ 'rewrite', 'flush', '--hard' ] );
		} else if ( 'pointer' === a.type ) {
			wp( [ 'sgs', a.area, 'set-active', String( val( a.id ) ) ] );
		} else {
			throw new Error( `unknown action ${ a.type }` );
		}
		done++;
	}
	return done;
}
