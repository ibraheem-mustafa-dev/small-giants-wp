// The site build's writer (Spec 48 FR-48-55): runs one phase of a plan (lib/site-build-plan.mjs) against a site.
// Every post is built through scripts/wp-build-page.js (the editor serialises each block); every other write is a
// WP-CLI call: `wp option update` (the hash each template copy was built from, beside part 4's options), `wp post update` and `wp post meta update` (the row key and tree hash the next run compares, and a mega
// panel's section page), `wp menu`
// and `wp menu item` (part 3; a new menu is marked with its page-map name, and no item is ever deleted), `wp option update` (part 4), `wp rewrite` (part 5) and `wp sgs <area> set-active`
// (part 7, through Sgs_Active_Layout::set_active, never a raw option write); a site option the draft sets (the route
// fade, lib/site-build-options.mjs) is one `wp option update <name> <json> --format=json` of the stored array with the draft's keys over it.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CONTENT_META, MENU_META, ROW_META, SECTION_META, TEMPLATE_CONTENT_OPTION, TEMPLATE_OPTION, TREE_META } from './site-build-state.mjs';

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
			...( target.template ? [ '--template', target.template ] : target.postId ? [ '--post-id', String( target.postId ) ] : [ '--create', target.create, '--title', target.title, '--slug', target.slug ] ), '--status', 'publish', '--editor-timeout', String( EDITOR_TIMEOUT ) ];
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
		// A template save answers with its `<theme>//<slug>` id, not a post id.
		if ( target.template && result?.ok ) {
			return result.id;
		}
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
	// A bookkeeping write after a save is tried three times: a dropped connection must not leave a saved post unrecorded.
	const again = ( fn ) => {
		let last;
		for ( let i = 0; i < 3; i++ ) {
			try {
				return fn();
			} catch ( e ) {
				last = e;
			}
		}
		throw last;
	};
	const mark = ( id, key ) => again( () => wp( [ 'post', 'meta', 'update', String( id ), ROW_META, key ] ) );
	// The hash of what a save produced, read and written on the site so the two sides hash the same text (a later difference is a person's edit).
	const markContent = ( id ) => again( () => wp( [ 'eval-file', '-' ], `<?php
update_post_meta( ${ Number( id ) }, '${ CONTENT_META }', hash( 'sha256', get_post_field( 'post_content', ${ Number( id ) }, 'raw' ) ) );
` ) );
	const markTemplateContent = ( slug ) => {
		if ( ! /^[a-z0-9-]+$/.test( slug ) ) {
			throw new Error( `template slug "${ slug }" is not a plain slug` );
		}
		again( () => wp( [ 'eval-file', '-' ], `<?php
$t = get_block_template( get_stylesheet() . '//${ slug }', 'wp_template' );
$o = (array) get_option( '${ TEMPLATE_CONTENT_OPTION }', array() );
if ( $t ) {
	$o['${ slug }'] = hash( 'sha256', (string) $t->content );
	update_option( '${ TEMPLATE_CONTENT_OPTION }', $o );
}
` ) );
	};
	let done = 0;
	for ( const a of actions.filter( ( x ) => x.phase === phase ) ) {
		log( `  ${ a.say }` );
		if ( 'adopt' === a.type ) {
			refs[ `post:${ a.key }` ] = a.id;
			// The mark first: a failed mark leaves the page map empty and the next run plans the adoption again.
			if ( a.mark ) {
				mark( a.id, a.key );
			}
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
			try {
				mark( id, a.key );
			} catch ( e ) {
				throw new Error( `post ${ id } was saved but not marked (${ e.message }); its id is in the page map, and the next run marks it, or mark it with "wp post meta update ${ id } ${ ROW_META } ${ a.key }"` );
			}
			again( () => wp( [ 'post', 'meta', 'update', String( id ), TREE_META, a.hash ] ) );
			markContent( id );
			if ( Object.keys( a.fields ).length ) {
				wp( [ 'post', 'update', String( id ), ...fieldArgs( a.fields ) ] );
			}
		} else if ( 'build' === a.type ) {
			try {
				build( { postId: a.id }, a.tree );
			} catch ( e ) {
				// A save may have landed before the failure: the stored content hash no longer describes it, so it is cleared.
				try {
					wp( [ 'post', 'meta', 'delete', String( a.id ), CONTENT_META ] );
				} catch {
					// The original failure is the one to report.
				}
				throw e;
			}
			again( () => wp( [ 'post', 'meta', 'update', String( a.id ), TREE_META, a.hash ] ) );
			markContent( a.id );
		} else if ( 'template' === a.type ) {
			// The hash is recorded before the build and put back when the build fails, so a build that stops after its save is never "unrecorded".
			const record = ( hashes ) => again( () => wp( [ 'option', 'update', TEMPLATE_OPTION, JSON.stringify( hashes ), '--format=json' ] ) );
			record( a.hashes );
			try {
				build( { template: a.template }, a.tree );
			} catch ( e ) {
				try {
					record( a.previous || {} );
				} catch {
					// The original failure is the one to report.
				}
				throw e;
			}
			markTemplateContent( a.template );
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
		} else if ( 'site-option' === a.type ) {
			wp( [ 'option', 'update', a.name, JSON.stringify( a.value ), '--format=json' ] );
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
