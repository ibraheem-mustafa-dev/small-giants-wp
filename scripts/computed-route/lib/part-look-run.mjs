// The effects of the part-look command (part-look.mjs): the framework database rows, the browser read of a served draft, the
// read of a site's saved block settings and the write of settings to a scratch copy. Each effect is a small function so the
// pure pairing (lib/fill-part-look.mjs) and the comparison (lib/part-look-compare.mjs) stay testable on planted inputs.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.mjs';
import { serveDraft } from './draft.mjs';
import { loadChromium } from './fill-read.mjs';
import { READ_PROPS, WIDTHS, findPartsInPage } from './fill-part-look.mjs';
import { SCRATCH_NAME, assertUnprotected, readTargets, targetOf } from './site-targets.mjs';
import { wpEvalRunner } from './calibration-refs.mjs';
import { productAddressPhp, readLiveFacts } from './template-live-address.mjs';
import { assertSiteContact } from './site-contact.mjs';
import { readHover } from './part-look-hover.mjs';
import { readPress } from './part-look-press.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REPO = path.resolve( HERE, '..', '..', '..' );

// The block's settings from the framework database: every row (for companion names and the part rows). Read-only.
export function blockRows( block, db = openDb() ) {
	const rows = db.prepare( "SELECT attr_name, attr_type, role, css_property, css_element, css_state, css_tier, is_responsive, tier_shape, enum_values, default_value FROM block_attributes WHERE block_slug = ? AND source IN ( 'sgs', 'sgs-ext' )" ).all( block ).map( ( r ) => ( { ...r } ) );
	return { rows, names: new Set( rows.map( ( r ) => r.attr_name ) ) };
}

// The helper a draft's own logic is reached through (the runtime keeps the live instance on the React component).
const DC_LOGIC = ( name ) => {
	const host = document.querySelector( name ? `[data-sc-name="${ CSS.escape( name ) }"]` : '[data-sc-name]' );
	const k = host && Object.keys( host ).find( ( key ) => key.startsWith( '__reactFiber$' ) );
	let f = k ? host[ k ] : null;
	while ( f && ! ( f.stateNode && f.stateNode.logic ) ) {
		f = f.return;
	}
	return f && f.stateNode.logic;
};

// Runs a surface's opening steps on an open draft page (the client's part-look.json): `route` is the draft's own page change, `init` a
// script run with the live logic `L` and `dcLogic`, for a draft whose basket or drawer is filled by its own logic. Returns null, or why
// the steps could not run.
export async function runOpeningSteps( page, { route = null, init = null } ) {
	return page.evaluate( ( { route: to, init: script, helper } ) => {
		const dcLogic = new Function( `return (${ helper })` )();
		const L = dcLogic();
		if ( ! L ) {
			return 'the draft runtime holds no logic instance to open the surface through';
		}
		if ( to ) {
			'function' === typeof L.go ? L.go( to ) : L.setState( { page: to } );
		}
		if ( script ) {
			new Function( 'L', 'dcLogic', script )( L, dcLogic );
		}
		return null;
	}, { route, init, helper: DC_LOGIC.toString() } );
}

export async function openPage( browser, { url, width, config } ) {
	const ctx = await browser.newContext( { viewport: { width, height: 900 } } );
	const page = await ctx.newPage();
	await page.goto( url, { waitUntil: 'load', timeout: 60000 } );
	await page.waitForFunction( () => document.querySelector( '#dc-root' )?.children.length > 0, null, { timeout: 45000 } ).catch( () => {} );
	await page.evaluate( () => document.fonts?.ready );
	await page.waitForTimeout( 900 );
	if ( config?.route || config?.init ) {
		const failure = await runOpeningSteps( page, { route: config.route || null, init: config.init || null } );
		if ( failure ) {
			await ctx.close();
			throw new Error( failure );
		}
		await page.waitForTimeout( 900 );
	}
	// A visitor's clicks after the opening steps (lib/part-look-opening.mjs: add to the basket, then the basket button), each on the
	// shown element the draft stamps with that template number in one of the components named (`hosts`: the served page's own markup
	// is stamped `Root` or its component's name; `host` names one); one that finds none fails the open.
	for ( const click of config?.clicks || [] ) {
		const hosts = click.hosts ?? [ click.host ?? null ];
		const done = await page.evaluate( ( { tpl, names } ) => {
			const el = [ ...document.querySelectorAll( `[data-dc-tpl="${ CSS.escape( String( tpl ) ) }"]` ) ].find( ( e ) => names.includes( e.closest( '[data-sc-name]' )?.getAttribute( 'data-sc-name' ) ?? null ) && e.getClientRects().length > 0 );
			el?.click();
			return !! el;
		}, { tpl: click.tpl, names: hosts } );
		if ( ! done ) {
			await ctx.close();
			throw new Error( `no shown element stamped ${ hosts.join( ' or ' ) }/${ click.tpl } to click` );
		}
		await page.waitForTimeout( 700 );
	}
	return { ctx, page };
}

// The pins of the emptied read at one width: each anchor `spec.emptyPins` names, pinned to the template stamp of the element the first read
// located for its part ({ anchor: { tpl, host } }); an anchor whose part the first read did not locate, or located unstamped, is not pinned.
export function emptyPins( spec, reads, width ) {
	return Object.fromEntries( Object.entries( spec?.emptyPins || {} ).flatMap( ( [ anchor, part ] ) => {
		const el = reads[ part ]?.[ width ]?.[ 0 ];
		return el?.tpl ? [ [ anchor, { tpl: el.tpl, host: el.host ?? null } ] ] : [];
	} ) );
}

// The parts a locator group must locate (`mustLocate`: the basket drawer's panel, which every drawer part is read from) that the read
// located at no width.
export const unlocatedParts = ( group, reads ) => ( group?.mustLocate || [] ).filter( ( part ) => ! Object.values( reads?.[ part ] || {} ).some( ( l ) => l?.length ) );

// Reads every part of a locator group from a served draft at each width: { part: { width: [ { key, tag, text, box, styles } ] } }.
// `files` are tried in order; a part no earlier file located is taken from a later one (the sign-in page's fields for the account).
// `hover` names the parts whose instances are also hovered (lib/part-look-hover.mjs: each gains `hover`).
// A spec with `probe: press` also presses a chip that is not pressed (lib/part-look-press.mjs): the read gains `chip-single` or `chip-multiple`.
// A surface whose config names an `empty` script (the client's part-look.json: the script that empties the basket, run like `init`) is
// read a second time at each width with that script in place of `init`, taking only the parts the first read did not locate (the
// basket drawer's empty state). Each anchor the group's `emptyPins` names ({ anchor: part }) is pinned in that read to the element the
// first read located for that part at the same width (its template stamp), so the second read takes the same drawer.
export async function readParts( { draftDir, files, spec, names, pages, config = null, hover = [], headed = false, log = () => {} } ) {
	const { chromium } = await loadChromium();
	const served = await serveDraft( draftDir, { index: files[ 0 ] } );
	const browser = await chromium.launch( { headless: ! headed, args: [ '--hide-scrollbars' ] } );
	const reads = {};
	const filled = {};
	try {
		for ( const file of files ) {
			const url = `${ served.url }${ encodeURIComponent( file ) }`;
			for ( const width of WIDTHS ) {
				const { ctx, page } = await openPage( browser, { url, width, config: file === files[ 0 ] ? config : null } );
				try {
					const found = await page.evaluate( findPartsInPage, { spec, names, props: READ_PROPS, pages } );
					hover.length && await readHover( { page, found, parts: hover, log } );
					spec.probe && 'press' === spec.probe && await readPress( { page, found, log } );
					for ( const [ part, list ] of Object.entries( found ) ) {
						if ( ! list.length || ( filled[ part ] && filled[ part ] !== file ) ) {
							continue;
						}
						filled[ part ] = file;
						( reads[ part ] ??= {} )[ width ] = list;
					}
					log( `read ${ file } at ${ width }px: ${ Object.values( found ).filter( ( l ) => l.length ).length } parts located` );
				} finally {
					await ctx.close();
				}
			}
		}
		if ( config?.empty ) {
			const url = `${ served.url }${ encodeURIComponent( files[ 0 ] ) }`;
			for ( const width of WIDTHS ) {
				const { ctx, page } = await openPage( browser, { url, width, config: { route: config.route || null, init: config.empty } } );
				try {
					const pins = emptyPins( spec, reads, width );
					const found = await page.evaluate( findPartsInPage, { spec: { ...spec, pins }, names: names.filter( ( n ) => ! filled[ n ] ), props: READ_PROPS, pages } );
					for ( const [ part, list ] of Object.entries( found ) ) {
						if ( list.length ) {
							( reads[ part ] ??= {} )[ width ] = list;
						}
					}
					log( `read ${ files[ 0 ] } emptied at ${ width }px: ${ Object.values( found ).filter( ( l ) => l.length ).length } more parts located` );
				} finally {
					await ctx.close();
				}
			}
			Object.keys( reads ).forEach( ( part ) => ( filled[ part ] ??= `${ files[ 0 ] } (emptied)` ) );
		}
	} finally {
		await browser.close();
		await served.close();
	}
	return { reads, filled };
}

const WSL_SITE = /^local-[a-z0-9-]+$/;
const wsl = ( command ) => spawnSync( 'wsl', [ '-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-lc', command ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 } );

// The saved attributes of one block of a post on a local mirror or scratch copy: { attrs, count } (read-only: `wp post get`).
export function readSavedBlock( { site, postId, block } ) {
	if ( ! WSL_SITE.test( site ) ) {
		throw new Error( `--site must be a local mirror or scratch copy (local-<name>), not ${ site }` );
	}
	assertSiteContact( { site, readOnly: true } );
	const r = wsl( `cd /var/www/${ site } && wp --allow-root post get ${ Number( postId ) } --field=post_content` );
	if ( 0 !== r.status || ! r.stdout ) {
		throw new Error( `could not read post ${ postId } on ${ site }: ${ ( r.stderr || '' ).split( '\n' ).filter( ( l ) => l.trim() && ! /Deprecated/.test( l ) ).slice( 0, 3 ).join( ' ' ) || 'empty content' }` );
	}
	return blockAttrsIn( r.stdout, block );
}

// The first `<!-- wp:<block> {json} -->` of a post's content: { attrs, count } (count: how many of the block the post holds).
export function blockAttrsIn( content, block ) {
	const re = new RegExp( `<!-- wp:${ block.replace( '/', '\\/' ) } (\\{.*?\\}) ?\\/?-->`, 'gs' );
	const all = [ ...content.matchAll( re ) ];
	return { attrs: all.length ? JSON.parse( all[ 0 ][ 1 ] ) : {}, count: all.length };
}

// The hand-written Custom CSS a block's saved settings hold: attribute count, rule count (one per `{`) and bytes.
export function customCssOf( attrs ) {
	const css = 'string' === typeof attrs.sgsCustomCss ? attrs.sgsCustomCss : '';
	return { attributes: css ? 1 : 0, rules: ( css.match( /\{/g ) || [] ).length, bytes: Buffer.byteLength( css, 'utf8' ) };
}

// Whether the route may write `site`: only a scratch copy (local-mediatest*) that is not protected, with the kill switch off.
export function assertMayWrite( site, targets = readTargets() ) {
	if ( ! SCRATCH_NAME.test( String( site ) ) ) {
		throw new Error( `--write is refused: ${ site } is not a scratch copy (local-mediatest-<name>); the route never writes a mirror or a hosted site` );
	}
	assertUnprotected( site, targets );
	assertSiteContact( { site, targets } );
}

// Writes settings to one block of a post on a scratch copy through scripts/local-wp/patch-block-attrs.py (it backs the post up
// first). `set` is { attr: value }; `unset` a list of attribute names.
export function patchBlock( { site, postId, block, set = {}, unset = [], file, dryRun = false } ) {
	assertMayWrite( site );
	const ops = [ { match: '*', block, ...( Object.keys( set ).length ? { set } : {} ), ...( unset.length ? { unset } : {} ) } ];
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( ops, null, '\t' ) );
	const args = [ path.join( REPO, 'scripts', 'local-wp', 'patch-block-attrs.py' ), '--site', site, '--post', String( postId ), '--patch', file, ...( dryRun ? [ '--dry-run' ] : [] ) ];
	const r = spawnSync( 'python', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 } );
	if ( 0 !== r.status ) {
		throw new Error( `patch-block-attrs.py failed for post ${ postId }: ${ ( r.stderr || r.stdout || '' ).trim().split( '\n' ).slice( -4 ).join( ' ' ) }` );
	}
	return ( r.stdout || '' ).trim();
}

// The id of a site's saved block template (wp_template) of a slug: the post the route's own copy of the template lives in.
export function templateIdOf( site, slug ) {
	if ( ! WSL_SITE.test( site ) || ! /^[a-z0-9-]+$/.test( slug ) ) {
		throw new Error( `a template is read from a local mirror or scratch copy (local-<name>) by its slug, not ${ site } ${ slug }` );
	}
	assertSiteContact( { site, readOnly: true } );
	const r = wsl( `cd /var/www/${ site } && wp --allow-root post list --post_type=wp_template --post_status=any --name=${ slug } --field=ID` );
	const id = Number( String( r.stdout || '' ).trim().split( /\s+/ ).pop() );
	if ( ! id ) {
		throw new Error( `${ site } holds no saved template ${ slug }: the route has not built it there` );
	}
	return id;
}

// The path of the product page a product surface is read on (read-only): the product the draft's route names, else, when the
// draft draws the flow's opener (`flowLinked`), the first real product linked to a choice flow, else the first real product; never
// a calibration fixture or a gift card (lib/template-live-address.mjs::productAddressPhp). `runPhp` runs a PHP body on the site.
export function liveProductPath( { site, productSlugs = [], flowLinked = false, runPhp = null } ) {
	const run = runPhp || wpEvalRunner( targetOf( site, readTargets() ), site, REPO, { readOnly: true } );
	const found = readLiveFacts( run( productAddressPhp( { productSlugs, flowLinked } ) ) ).product;
	if ( ! found ) {
		throw new Error( `${ site } has no real product to read the single-product template on (calibration fixtures and gift cards are not read)` );
	}
	return found;
}
