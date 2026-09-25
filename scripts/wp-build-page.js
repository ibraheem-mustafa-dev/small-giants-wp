#!/usr/bin/env node
/**
 * wp-build-page.js
 *
 * Builds a whole page (or header, footer, drawer, modal, mega menu) through the
 * real block editor from a JSON block tree, so every block is serialised by its
 * own save() and never hand-written.
 *
 * ============================================================================
 * WHEN TO USE (plain English)
 * ----------------------------------------------------------------------------
 * Use it to lay out a page on a live site. You describe the blocks and their
 * settings in a JSON file; the script opens the WordPress editor, refuses any
 * block that is not registered and any setting name the block does not have,
 * builds the blocks, saves, reloads the editor and checks every block comes
 * back valid and unchanged. It prints the post ID and link.
 * ============================================================================
 *
 * Tree file: an array of blocks, each
 *   { "name": "sgs/container", "attributes": { ... }, "innerBlocks": [ ... ] }
 *
 * Usage:
 *   node scripts/wp-build-page.js --env-file .claude/secrets/eye-care-test.env --env-key EYECARETEST \
 *     --tree tree.json (--post-id 123 | --create page --title "About" --slug about) [--status publish] [--dry-run]
 *
 *   --create takes a post type: page, sgs_header, sgs_footer, sgs_drawer, sgs_modal, sgs_mega_menu, sgs_form, wp_block.
 *   --post-id replaces the whole content of an existing post.
 *   --dry-run validates the tree in the editor and saves nothing.
 *
 * Credentials: WP_URL_<KEY>, WP_USER_<KEY>, WP_PWD_<KEY> from --env-file (never printed).
 *
 * Exit codes: 0 ok · 1 argument/tree error · 2 login failed · 3 editor did not load ·
 *             4 unknown block, setting, wrong value type or off-list value · 5 save failed ·
 *             6 blocks invalid, or content still changing after one settling save
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { createRequire } = require( 'module' );
const os = require( 'os' );
const { execFileSync } = require( 'child_process' );

const pluginRequire = createRequire( path.join( __dirname, '..', 'plugins', 'sgs-blocks', 'package.json' ) );
const { chromium } = pluginRequire( 'playwright' );

function parseArgs( argv ) {
	const args = { status: 'publish', dryRun: false };
	for ( let i = 2; i < argv.length; i++ ) {
		const a = argv[ i ];
		if ( a === '--env-file' ) args.envFile = argv[ ++i ];
		else if ( a === '--env-key' ) args.envKey = argv[ ++i ];
		else if ( a === '--tree' ) args.tree = argv[ ++i ];
		else if ( a === '--post-id' ) args.postId = argv[ ++i ];
		else if ( a === '--create' ) args.create = argv[ ++i ];
		else if ( a === '--title' ) args.title = argv[ ++i ];
		else if ( a === '--slug' ) args.slug = argv[ ++i ];
		else if ( a === '--status' ) args.status = argv[ ++i ];
		else if ( a === '--dry-run' ) args.dryRun = true;
	}
	return args;
}

function fail( code, msg ) {
	console.error( `[FAIL] ${ msg }` );
	process.exit( code );
}

function readEnv( file, key ) {
	const out = {};
	for ( const line of fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^([A-Z0-9_]+)=(.*)$/ );
		if ( m ) out[ m[ 1 ] ] = m[ 2 ].trim().replace( /^["']|["']$/g, '' );
	}
	const url = out[ `WP_URL_${ key }` ];
	const user = out[ `WP_USER_${ key }` ];
	const pwd = out[ `WP_PWD_${ key }` ];
	if ( ! url || ! user || ! pwd ) fail( 1, `WP_URL_/WP_USER_/WP_PWD_${ key } missing from ${ file }` );
	return { url: url.replace( /\/+$/, '' ), user, pwd };
}

async function waitForEditor( page ) {
	await page.waitForFunction(
		() => window.wp && window.wp.data && window.wp.blocks &&
			window.wp.data.select( 'core/editor' ) &&
			window.wp.data.select( 'core/editor' ).getCurrentPostId() &&
			window.wp.blocks.getBlockTypes().length > 0,
		{ timeout: 60000 }
	);
}

async function main() {
	const args = parseArgs( process.argv );
	if ( ! args.envFile || ! args.envKey || ! args.tree ) fail( 1, '--env-file, --env-key and --tree are required' );
	if ( ! args.postId === ! args.create ) fail( 1, 'give exactly one of --post-id or --create <post type>' );
	let tree;
	try {
		tree = JSON.parse( fs.readFileSync( path.resolve( args.tree ), 'utf8' ) );
	} catch ( e ) {
		fail( 1, `cannot read tree: ${ e.message }` );
	}
	if ( ! Array.isArray( tree ) ) fail( 1, 'tree must be an array of blocks' );
	const { url, user, pwd } = readEnv( path.resolve( args.envFile ), args.envKey );

	// Core blocks that have an SGS replacement are banned on pages (block-replacements.json is the one list).
	const replacements = JSON.parse( fs.readFileSync(
		path.join( __dirname, '..', 'plugins', 'sgs-blocks', 'scripts', 'data', 'block-replacements.json' ), 'utf8' ) );
	const banned = {};
	Object.entries( replacements ).forEach( ( [ sgs, cores ] ) => {
		if ( Array.isArray( cores ) ) cores.forEach( ( c ) => { banned[ c ] = sgs; } );
	} );

	// Settings the framework DB marks as NOT per-device (is_responsive = 0). A
	// {desktop:...} value on one of these is read as a flat value by render.php,
	// finds nothing and silently draws nothing (e.g. borderWidth on sgs/container).
	let flatAttrs = {};
	try {
		const db = path.join( os.homedir(), '.agents', 'skills', 'sgs-wp-engine', 'sgs-framework.db' ).split( path.sep ).join( '/' );
		const query = "SELECT block_slug, attr_name FROM block_attributes WHERE is_responsive = 0 AND block_slug LIKE 'sgs/%'";
		const out = execFileSync( 'python', [ '-c',
			'import sqlite3,json,sys;c=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True);' +
			'print(json.dumps([r[0]+"|"+r[1] for r in c.execute(sys.argv[2])]))',
			db, query ], { encoding: 'utf8', timeout: 30000 } );
		JSON.parse( out ).forEach( ( k ) => { flatAttrs[ k ] = true; } );
	} catch ( e ) {
		console.error( `[warn] per-device shape check skipped (framework DB not readable: ${ String( e.message ).split( /\r?\n/ )[ 0 ] })` );
	}

	const browser = await chromium.launch( { headless: true } );
	const page = await ( await browser.newContext( { ignoreHTTPSErrors: true } ) ).newPage();
	try {
		try {
			await page.goto( `${ url }/wp-login.php`, { waitUntil: 'domcontentloaded', timeout: 45000 } );
			await page.fill( '#user_login', user );
			await page.fill( '#user_pass', pwd );
			await Promise.all( [ page.waitForURL( /wp-admin/, { timeout: 45000 } ), page.click( '#wp-submit' ) ] );
		} catch ( e ) {
			fail( 2, `login failed: ${ e.message }` );
		}

		const editorUrl = args.create
			? `${ url }/wp-admin/post-new.php?post_type=${ encodeURIComponent( args.create ) }`
			: `${ url }/wp-admin/post.php?post=${ encodeURIComponent( args.postId ) }&action=edit`;
		await page.goto( editorUrl, { waitUntil: 'domcontentloaded', timeout: 60000 } );
		try {
			await waitForEditor( page );
		} catch ( e ) {
			fail( 3, `editor did not load at ${ editorUrl }` );
		}

		// Validate the whole tree before touching the post.
		const problems = await page.evaluate( ( { t, bannedMap, flat } ) => {
			const out = [];
			const walk = ( blocks, trail ) => blocks.forEach( ( b, i ) => {
				const where = `${ trail }[${ i }] ${ b && b.name }`;
				if ( ! b || typeof b.name !== 'string' ) { out.push( `${ where }: no block name` ); return; }
				if ( bannedMap[ b.name ] ) out.push( `${ where }: banned core block, use ${ bannedMap[ b.name ] }` );
				const type = window.wp.blocks.getBlockType( b.name );
				if ( ! type ) { out.push( `${ where }: block not registered` ); return; }
				Object.entries( b.attributes || {} ).forEach( ( [ k, v ] ) => {
					// The block's own default wins over the DB flag: a default shaped
					// {desktop:...} means the setting IS per-device.
					const def = ( type.attributes[ k ] || {} ).default;
					const defIsTiered = def && typeof def === 'object' && ! Array.isArray( def ) && 'desktop' in def;
					if ( flat[ `${ b.name }|${ k }` ] && ! defIsTiered && v && typeof v === 'object' && ! Array.isArray( v ) ) {
						const keys = Object.keys( v );
						if ( keys.length && keys.every( ( x ) => [ 'desktop', 'tablet', 'mobile' ].includes( x ) ) ) {
							out.push( `${ where }: setting "${ k }" is not per-device; give it the flat value, not {${ keys.join( ',' ) }:...}` );
						}
					}
				} );
				// WordPress silently swaps a wrong-typed or off-enum value for the default.
				const typeOk = ( v, t ) => {
					if ( t === 'null' ) return v === null;
					if ( t === 'rich-text' ) return typeof v === 'string';
					if ( t === 'integer' ) return Number.isInteger( v );
					if ( t === 'number' ) return typeof v === 'number';
					if ( t === 'array' ) return Array.isArray( v );
					if ( t === 'object' ) return v !== null && typeof v === 'object' && ! Array.isArray( v );
					return typeof v === t;
				};
				Object.entries( b.attributes || {} ).forEach( ( [ k, v ] ) => {
					const def = type.attributes[ k ];
					if ( ! def ) { out.push( `${ where }: unknown setting "${ k }"` ); return; }
					const types = [].concat( def.type || [] );
					if ( types.length && ! types.some( ( t ) => typeOk( v, t ) ) ) {
						out.push( `${ where }: setting "${ k }" must be ${ types.join( ' or ' ) }, got ${ JSON.stringify( v ).slice( 0, 60 ) }` );
					}
					if ( Array.isArray( def.enum ) && ! def.enum.includes( v ) ) {
						out.push( `${ where }: setting "${ k }" must be one of ${ JSON.stringify( def.enum ) }, got ${ JSON.stringify( v ) }` );
					}
				} );
				walk( b.innerBlocks || [], `${ where } >` );
			} );
			walk( t, '' );
			return out;
		}, { t: tree, bannedMap: banned, flat: flatAttrs } );
		if ( problems.length ) fail( 4, `tree rejected:\n  ${ problems.join( '\n  ' ) }` );

		const built = await page.evaluate( ( { t, title, slug, status, dryRun } ) => {
			const make = ( b ) => window.wp.blocks.createBlock( b.name, b.attributes || {}, ( b.innerBlocks || [] ).map( make ) );
			const blocks = t.map( make );
			const serialised = window.wp.blocks.serialize( blocks );
			if ( dryRun ) return { serialised };
			window.wp.data.dispatch( 'core/block-editor' ).resetBlocks( blocks );
			const edits = { status };
			if ( title ) edits.title = title;
			if ( slug ) edits.slug = slug;
			window.wp.data.dispatch( 'core/editor' ).editPost( edits );
			return { serialised };
		}, { t: tree, title: args.title, slug: args.slug, status: args.status, dryRun: args.dryRun } );
		if ( args.dryRun ) {
			console.log( JSON.stringify( { ok: true, dryRun: true, bytes: built.serialised.length } ) );
			return;
		}

		const save = async () => {
			await page.evaluate( () => window.wp.data.dispatch( 'core/editor' ).savePost() );
			await page.waitForFunction(
				() => ! window.wp.data.select( 'core/editor' ).isSavingPost() && ! window.wp.data.select( 'core/editor' ).isAutosavingPost(),
				{ timeout: 60000 }
			);
			return page.evaluate( () => {
				const errs = ( window.wp.data.select( 'core/notices' ).getNotices() || [] ).filter( ( n ) => n.status === 'error' );
				const ed = window.wp.data.select( 'core/editor' );
				return { error: errs.map( ( n ) => n.content ).join( ' | ' ), id: ed.getCurrentPostId(), link: ed.getPermalink() };
			} );
		};
		// Reload: every block must parse valid and serialise to what was saved.
		const reload = async ( id ) => {
			await page.goto( `${ url }/wp-admin/post.php?post=${ id }&action=edit`, { waitUntil: 'domcontentloaded', timeout: 60000 } );
			await waitForEditor( page );
			await page.waitForTimeout( 1500 );
			return page.evaluate( () => {
				const invalid = [];
				const walk = ( bs ) => bs.forEach( ( b ) => {
					if ( b.isValid === false ) invalid.push( b.name );
					walk( b.innerBlocks || [] );
				} );
				const blocks = window.wp.data.select( 'core/block-editor' ).getBlocks();
				walk( blocks );
				return { invalid, serialised: window.wp.blocks.serialize( blocks ) };
			} );
		};

		const saved = await save();
		if ( saved.error ) fail( 5, `save error: ${ saved.error }` );
		let expected = built.serialised;
		let check = await reload( saved.id );
		// A block's editor may tidy its own attributes when it first mounts (drop an
		// empty object, add an item key). Save that once and reload again: content
		// that settles is fine; content that keeps changing is a real fault.
		let normalised = false;
		if ( ! check.invalid.length && check.serialised.trim() !== expected.trim() ) {
			const first = check.serialised;
			const resaved = await save();
			if ( resaved.error ) fail( 5, `save error on the settling save: ${ resaved.error }` );
			normalised = true;
			expected = first;
			check = await reload( saved.id );
		}
		const changed = check.serialised.trim() !== expected.trim();
		const result = { ok: ! check.invalid.length && ! changed, id: saved.id, link: saved.link, invalid: check.invalid, normalisedOnFirstLoad: normalised, changedOnReload: changed };
		if ( changed || normalised ) {
			const out = path.join( require( 'os' ).tmpdir(), `wp-build-page-${ saved.id }-diff.json` );
			fs.writeFileSync( out, JSON.stringify( { built: built.serialised, firstLoad: expected, lastLoad: check.serialised } ) );
			result.diffFile = out;
		}
		console.log( JSON.stringify( result ) );
		if ( ! result.ok ) process.exitCode = 6;
	} finally {
		await browser.close();
	}
}

main().catch( ( e ) => fail( 1, e.stack || e.message ) );
