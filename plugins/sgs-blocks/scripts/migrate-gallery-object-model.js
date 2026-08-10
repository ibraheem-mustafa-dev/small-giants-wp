#!/usr/bin/env node
/**
 * migrate-gallery-object-model.js — carry sgs/gallery's stored box/width values
 * onto the Spec 37 FR-37-16 {desktop,tablet,mobile} object model.
 *
 * WHY THIS EXISTS
 * ---------------
 * Spec 35 Phase 1.4 moved sgs/gallery from two defective panels
 * (ResponsiveSpacingPanel, which wrote attributes NO block.json declared and
 * WordPress therefore discarded; and WidthPanel, on the flat string model) onto
 * ResponsiveBoxControls, which owns padding / margin / max-width / content-width
 * as objects.
 *
 * That is a STORAGE-SHAPE change on two attributes that already hold live
 * values. WordPress silently coerces a type-mismatched value back to the
 * attribute's default — so a stored `contentWidth: "1200px"` read against an
 * object-typed attribute becomes `{}` and the cap VANISHES, with no error and
 * no failing gate. `audit-post-content-blocks.py` does not catch this class: it
 * checks attribute NAMES and stranded content, not value TYPES.
 *
 * MEASURED BEFORE WRITING THIS (2026-08-10, canary — the only live site):
 *   5 sgs/gallery instances across 194 pages+posts
 *   0 with maxWidth
 *   1 with contentWidth  → post 1591, "1200px"
 *   1 with style.spacing → post 1591, padding 48/24/24/48
 *   POSITIVE CONTROL: 1706 wp:sgs/* block openings parsed, so the zeros above
 *   are real measurements and not a broken query returning nothing.
 *
 * WHAT IT DOES, per sgs/gallery block instance:
 *   contentWidth: "1200px"                    -> contentWidth: { desktop: "1200px" }
 *   maxWidth:     "800px"                     -> maxWidth:     { desktop: "800px" }
 *   style.spacing.padding: {top,right,...}    -> padding:      { desktop: {...} }
 *   style.spacing.margin:  {top,right,...}    -> margin:       { desktop: {...} }
 * and removes the now-unsupported style.spacing (gallery no longer declares
 * supports.spacing, so WP would discard it on the next save anyway).
 *
 * An already-object value is left untouched, so the script is IDEMPOTENT and
 * safe to re-run.
 *
 * SAFETY
 *   - DRY RUN BY DEFAULT. `--live` is required to write anything.
 *   - Prints a per-instance before/after diff so a human signs off on the real
 *     values, not on a promise.
 *   - Writes via the REST API with app-password auth. Permitted for sgs/* blocks
 *     (Bean 2026-08-08): every SGS block is dynamic, so post_content stores only
 *     a comment + attrs JSON with no saved HTML to invalidate.
 *   - Touches ONLY sgs/gallery block comments. Every other byte of post_content
 *     is passed through untouched, and the script asserts that the non-gallery
 *     content is byte-identical before it will write.
 *
 * USAGE
 *   node scripts/migrate-gallery-object-model.js            # dry run
 *   node scripts/migrate-gallery-object-model.js --live     # apply
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const LIVE = process.argv.includes( '--live' );

function loadEnv() {
	const envPath = path.resolve( __dirname, '..', '..', '..', '.claude', 'secrets', 'sandybrown.env' );
	if ( ! fs.existsSync( envPath ) ) {
		console.error( `[migrate-gallery] credentials not found at ${ envPath }` );
		process.exit( 2 );
	}
	const out = {};
	for ( const line of fs.readFileSync( envPath, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^([A-Z_]+)=(.*)$/ );
		if ( m ) out[ m[ 1 ] ] = m[ 2 ].replace( /^['"]|['"]$/g, '' );
	}
	return out;
}

/** Brace-balanced extraction of a block comment's attrs JSON. A non-greedy
 *  regex truncates on the first `}` and silently mangles nested objects like
 *  style.spacing.padding — the exact undercount this migration cannot afford. */
function findGalleryBlocks( content ) {
	const out = [];
	const OPEN = '<!-- wp:sgs/gallery';
	let idx = 0;
	while ( ( idx = content.indexOf( OPEN, idx ) ) !== -1 ) {
		let i = idx + OPEN.length;
		while ( i < content.length && /\s/.test( content[ i ] ) ) i++;
		let attrs = null;
		let attrsStart = -1;
		let attrsEnd = -1;
		if ( content[ i ] === '{' ) {
			attrsStart = i;
			let depth = 0;
			let inStr = false;
			let esc = false;
			for ( ; i < content.length; i++ ) {
				const c = content[ i ];
				if ( inStr ) {
					if ( esc ) esc = false;
					else if ( c === '\\' ) esc = true;
					else if ( c === '"' ) inStr = false;
					continue;
				}
				if ( c === '"' ) inStr = true;
				else if ( c === '{' ) depth++;
				else if ( c === '}' ) {
					depth--;
					if ( depth === 0 ) { attrsEnd = i + 1; break; }
				}
			}
			if ( attrsEnd === -1 ) {
				console.error( '[migrate-gallery] UNBALANCED attrs JSON — refusing to guess. Aborting.' );
				process.exit( 1 );
			}
			try {
				attrs = JSON.parse( content.slice( attrsStart, attrsEnd ) );
			} catch ( e ) {
				console.error( `[migrate-gallery] attrs JSON did not parse: ${ e.message }. Aborting.` );
				process.exit( 1 );
			}
		}
		out.push( { openIdx: idx, attrsStart, attrsEnd, attrs } );
		idx = idx + OPEN.length;
	}
	return out;
}

const isPlainObject = ( v ) => v !== null && typeof v === 'object' && ! Array.isArray( v );

/** Returns a NEW attrs object, or null when nothing needs migrating. */
function migrateAttrs( attrs ) {
	if ( ! attrs ) return null;
	const next = JSON.parse( JSON.stringify( attrs ) );
	let changed = false;

	for ( const key of [ 'contentWidth', 'maxWidth' ] ) {
		const v = next[ key ];
		if ( typeof v === 'string' && v !== '' ) {
			next[ key ] = { desktop: v };
			changed = true;
		}
	}

	const spacing = next.style && next.style.spacing;
	if ( isPlainObject( spacing ) ) {
		for ( const key of [ 'padding', 'margin' ] ) {
			if ( isPlainObject( spacing[ key ] ) && ! isPlainObject( next[ key ] ) ) {
				next[ key ] = { desktop: spacing[ key ] };
				changed = true;
			}
		}
		delete next.style.spacing;
		if ( Object.keys( next.style ).length === 0 ) delete next.style;
		changed = true;
	}

	return changed ? next : null;
}

function rewriteContent( content ) {
	const blocks = findGalleryBlocks( content );
	if ( ! blocks.length ) return { content, changes: [] };

	const changes = [];
	let out = content;
	// Right-to-left so earlier offsets stay valid.
	for ( let b = blocks.length - 1; b >= 0; b-- ) {
		const blk = blocks[ b ];
		const migrated = migrateAttrs( blk.attrs );
		if ( ! migrated ) continue;
		const json = JSON.stringify( migrated );
		if ( blk.attrsStart !== -1 ) {
			out = out.slice( 0, blk.attrsStart ) + json + out.slice( blk.attrsEnd );
		} else {
			const insertAt = blk.openIdx + '<!-- wp:sgs/gallery'.length;
			out = out.slice( 0, insertAt ) + ' ' + json + out.slice( insertAt );
		}
		changes.push( { before: blk.attrs, after: migrated } );
	}
	return { content: out, changes: changes.reverse() };
}

async function main() {
	const env = loadEnv();
	const url = env.WP_URL_SANDYBROWN;
	const auth =
		'Basic ' +
		Buffer.from(
			env.WP_USER_SANDYBROWN + ':' + ( env.WP_APP_PWD_SANDYBROWN || '' ).replace( / /g, '' )
		).toString( 'base64' );

	console.log( `[migrate-gallery] mode: ${ LIVE ? 'LIVE (will write)' : 'DRY RUN (writes nothing)' }` );

	const items = [];
	for ( const type of [ 'pages', 'posts' ] ) {
		for ( let page = 1; page <= 5; page++ ) {
			const r = await fetch(
				`${ url }/wp-json/wp/v2/${ type }?per_page=100&page=${ page }&status=any&context=edit&_fields=id,content,type`,
				{ headers: { Authorization: auth } }
			);
			if ( ! r.ok ) break;
			const j = await r.json();
			if ( ! Array.isArray( j ) || ! j.length ) break;
			items.push( ...j );
		}
	}

	// POSITIVE CONTROL — a zero from a broken query is indistinguishable from a
	// genuinely clean tree, so prove the fetch+parse path is live before
	// trusting any count it produces.
	const totalSgs = items.reduce(
		( n, p ) => n + ( ( p.content?.raw || '' ).split( 'wp:sgs/' ).length - 1 ),
		0
	);
	console.log( `[migrate-gallery] scanned ${ items.length } item(s); POSITIVE CONTROL: ${ totalSgs } wp:sgs/* openings seen` );
	if ( items.length === 0 || totalSgs === 0 ) {
		console.error( '[migrate-gallery] positive control FAILED — the query found no SGS blocks at all. Refusing to report a clean result from a query that cannot see anything.' );
		process.exit( 1 );
	}

	let touched = 0;
	for ( const post of items ) {
		const raw = post.content?.raw || '';
		if ( ! raw.includes( 'wp:sgs/gallery' ) ) continue;
		const { content: nextContent, changes } = rewriteContent( raw );
		if ( ! changes.length ) continue;

		touched++;
		console.log( `\n--- ${ post.type } ${ post.id } — ${ changes.length } gallery instance(s) to migrate` );
		for ( const c of changes ) {
			for ( const k of [ 'contentWidth', 'maxWidth', 'padding', 'margin' ] ) {
				const before = c.before?.[ k ];
				const after = c.after?.[ k ];
				if ( JSON.stringify( before ) !== JSON.stringify( after ) ) {
					console.log( `      ${ k }: ${ JSON.stringify( before ) } -> ${ JSON.stringify( after ) }` );
				}
			}
			if ( c.before?.style?.spacing && ! c.after?.style?.spacing ) {
				console.log( '      style.spacing: removed (gallery no longer declares supports.spacing)' );
			}
		}

		// Assert nothing outside the gallery attrs blobs moved.
		const strip = ( s ) => s.replace( /<!-- wp:sgs\/gallery[\s\S]*?-->/g, '<<GALLERY>>' );
		if ( strip( raw ) !== strip( nextContent ) ) {
			console.error( `[migrate-gallery] ABORT: non-gallery content differs on ${ post.type } ${ post.id }. Refusing to write.` );
			process.exit( 1 );
		}

		if ( LIVE ) {
			const put = await fetch( `${ url }/wp-json/wp/v2/${ post.type }/${ post.id }`, {
				method: 'POST',
				headers: { Authorization: auth, 'Content-Type': 'application/json' },
				body: JSON.stringify( { content: nextContent } ),
			} );
			console.log( `      WRITE -> HTTP ${ put.status }` );
			if ( ! put.ok ) {
				console.error( `[migrate-gallery] write FAILED on ${ post.id }; stopping so the failure is not buried.` );
				process.exit( 1 );
			}
		}
	}

	console.log( `\n[migrate-gallery] ${ touched } post(s) ${ LIVE ? 'migrated' : 'would be migrated' }.` );
	if ( ! LIVE && touched ) console.log( '[migrate-gallery] re-run with --live to apply.' );
}

main().catch( ( e ) => {
	console.error( '[migrate-gallery] FAILED:', e.message );
	process.exit( 1 );
} );
