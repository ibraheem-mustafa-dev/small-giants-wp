#!/usr/bin/env node
// The functional check of one client's clone (Spec 48 §3.7): does it WORK, where the walker only compares styles.
//   node scripts/computed-route/site-check.mjs <client> --site <site> [--only pages,menu,...] [--out <dir>] [--with-cart] [--repo <root>]
// One headless Chromium for the whole run (SGS_HEADED=1 shows it), page views only, never the editor. The eight checks
// (lib/site-check-report.mjs::CHECKS): every page-map page loads 200 with its main content; the header menu's links
// reach page-map pages; each mega menu opens and closes; the drawer opens and closes at 375 and 768; every modal and
// choice flow the pages render opens from its trigger and closes (a page-map flow or form no page renders fails); every
// form submits once to its success state with a test entry marked "SGS site-check test"; the client's scripted flows in
// scripts/parity/flows pass (n-a for a client that has none); and cart, checkout and my-account show WooCommerce's
// working forms. Before them the home page is loaded as a visitor: when WooCommerce's coming-soon holding page stands in
// place of the site (lib/site-check-coming-soon.mjs), the run reports that one failure with the fix command and marks
// every other check n-a with the reason. A failed check never stops the run. The only write to the site is one submission per form (and, with
// --with-cart, one basket line in this run's own WooCommerce session).
// `--site` is a calibration-targets.json key (a local-* mirror shares its test site's page-map ids through `mirrorOf`)
// or any `.claude/secrets/<site>.env`; only its WP_URL_* is read.
// Output: sites/<client>/build/qa/site-check/<stamp>/ (or --out): result.json, result.md and the screenshots.
// Exit 0 every check passed or n-a, 1 a check failed, 2 usage or the site unreachable.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHECKS, parseOnly, checkRecord, skippedRecord, exitCodeOf, renderMarkdown } from './lib/site-check-report.mjs';
import { targetOf, siteBase, candidateRoots, pageTargets, readRows, flowsClient } from './lib/site-check-site.mjs';
import { MARK, readHeaderLinksInPage, readDraftLinksInPage, menuItems, megaItems, markMegaInPage, drawerItem, pathKey } from './lib/site-check-nav.mjs';
import { readPartsInPage, modalItem, flowItem, formItem, wooItem, addOneLine, missingFlowRows } from './lib/site-check-parts.mjs';
import { COMING_SOON_ROOT, comingSoonChecks, comingSoonInPage } from './lib/site-check-coming-soon.mjs';
import { isAccountRow } from './lib/site-build-map.mjs';
import { wpCommand } from './lib/calibration-refs.mjs';
import { formSlug } from './lib/form-submit-run.mjs';
import { loadChromium } from './lib/fill-read.mjs';
import { browserPidOf, closeBrowser } from './lib/browser-close.mjs';
import { FLOWS, MIN_GAP_MS } from '../parity/flows/run-all.mjs';
import { execute, writeFlowResult } from '../parity/flows/lib/flow.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const MARKER = 'SGS site-check test';
const LOAD = { waitUntil: 'load', timeout: 45000 };
const USAGE = 'usage: node site-check.mjs <client> --site <site> [--only <check,...>] [--out <dir>] [--with-cart] [--repo <root>]';

function parseArgs( argv ) {
	const a = { client: null, site: null, only: null, out: null, repo: path.resolve( HERE, '..', '..' ), withCart: false };
	const value = { '--site': 'site', '--only': 'only', '--out': 'out', '--repo': 'repo' };
	for ( let i = 0; i < argv.length; i++ ) {
		const x = argv[ i ];
		if ( value[ x ] ) {
			const v = argv[ ++i ];
			if ( undefined === v || v.startsWith( '--' ) ) {
				return { error: `${ x } needs a value` };
			}
			a[ value[ x ] ] = v;
		} else if ( '--with-cart' === x ) {
			a.withCart = true;
		} else if ( x.startsWith( '--' ) || a.client ) {
			return { error: `unexpected argument ${ x }` };
		} else {
			a.client = x;
		}
	}
	return a.client && a.site ? a : { error: 'the client and --site are required' };
}

const stampNow = ( d = new Date() ) => d.toISOString().replace( /\.\d+Z$/, '' ).replace( /:/g, '-' );

// In-page: whether the page rendered its main content: a non-empty <main> (else the theme's content wrapper), and no
// WordPress critical-error screen.
function contentInPage() {
	const main = document.querySelector( 'main' ) || document.querySelector( '.wp-site-blocks' ) || document.querySelector( '.entry-content' );
	const text = ( main?.innerText || '' ).trim();
	return { wrapper: main ? ( main.tagName.toLowerCase() + ( main.className ? `.${ main.classList[ 0 ] }` : '' ) ) : null, chars: text.length, media: !! main?.querySelector( 'img,video,canvas,svg,picture' ), critical: /There has been a critical error/i.test( document.body?.innerText || '' ) };
}

async function main() {
	const args = parseArgs( process.argv.slice( 2 ) );
	const only = args.error ? null : parseOnly( args.only );
	if ( args.error || only.error ) {
		console.error( `${ args.error || only.error }\n${ USAGE }` );
		return 2;
	}
	const roots = candidateRoots( args.repo );
	const targets = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );
	const target = targetOf( args.site, targets, roots );
	if ( ! target ) {
		console.error( `${ args.site } is neither a calibration-targets.json key nor a .claude/secrets/${ args.site }.env\n${ USAGE }` );
		return 2;
	}
	const base = siteBase( target, roots );
	const { rows, idsSite } = readRows( args.repo, args.client, target );
	const startedAt = new Date().toISOString();
	const dir = path.resolve( args.out || path.join( args.repo, 'sites', args.client, 'build', 'qa', 'site-check', stampNow() ) );
	fs.mkdirSync( dir, { recursive: true } );
	// A written file as the result names it: repo-relative inside the repo, else absolute (an --out elsewhere).
	const rel = ( f ) => {
		const r = path.relative( args.repo, f );
		return ( r.startsWith( '..' ) || path.isAbsolute( r ) ? f : r ).split( path.sep ).join( '/' );
	};
	const want = ( id ) => only.ids.includes( id );
	const notes = [];
	const targetsOf = pageTargets( rows, base );
	targetsOf.skipped.forEach( ( s ) => notes.push( `page map ${ s.key } not loaded: ${ s.reason }` ) );
	! idsSite && notes.push( 'the page map names no site for its ids (page-map.site); its ids were used as they are' );

	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: ! process.env.SGS_HEADED } );
	const pid = await browserPidOf( browser );
	const checks = {};
	const guard = async ( id, fn ) => {
		if ( ! want( id ) ) {
			checks[ id ] = skippedRecord( id );
			return;
		}
		try {
			checks[ id ] = await fn();
		} catch ( e ) {
			checks[ id ] = checkRecord( id, [ { status: 'fail', subject: 'checker', error: `the check stopped: ${ e.message }` } ] );
		}
		console.log( `${ String( checks[ id ].status ).toUpperCase().padEnd( 5 ) } ${ id }: ${ checks[ id ].summary }` );
	};
	const newPage = async ( width = 1440 ) => {
		const context = await browser.newContext( { viewport: { width, height: 900 } } );
		const page = await context.newPage();
		const shoot = async ( name ) => {
			const file = path.join( dir, `${ name.replace( /[^\w.-]+/g, '-' ) }.png` );
			await page.screenshot( { path: file } ).catch( () => {} );
			return fs.existsSync( file ) ? rel( file ) : null;
		};
		return { context, page, shoot };
	};

	const finish = () => {
		const ordered = CHECKS.map( ( c ) => checks[ c.id ] || skippedRecord( c.id ) );
		const result = { client: args.client, site: args.site, base, startedAt, finishedAt: new Date().toISOString(), only: only.ids, marker: MARKER, checks: ordered, notes, exitCode: exitCodeOf( ordered ) };
		fs.writeFileSync( path.join( dir, 'result.json' ), `${ JSON.stringify( result, null, '\t' ) }\n` );
		fs.writeFileSync( path.join( dir, 'result.md' ), renderMarkdown( result ) );
		console.log( `site check ${ args.client } on ${ args.site }: ${ ordered.filter( ( c ) => 'fail' === c.status ).length } failed. ${ rel( path.join( dir, 'result.md' ) ) }` );
		return result.exitCode;
	};

	try {
		// The sweep: every page-map page at 1440, read once; the page check is judged from it and the later checks use
		// its final addresses and the parts each page renders.
		const sweep = await newPage();
		const reach = await sweep.page.goto( base, LOAD ).catch( ( e ) => e );
		if ( reach instanceof Error ) {
			console.error( `STOP ${ base } is unreachable: ${ reach.message.split( '\n' )[ 0 ] }` );
			return 2;
		}
		// WooCommerce's coming-soon mode: the holding page in place of the site would make every other check's verdict false.
		if ( await sweep.page.evaluate( comingSoonInPage, COMING_SOON_ROOT ).catch( () => false ) ) {
			Object.assign( checks, comingSoonChecks( { ids: only.ids, url: sweep.page.url(), client: args.client, site: args.site, screenshot: await sweep.shoot( 'coming-soon' ) } ) );
			CHECKS.forEach( ( c ) => console.log( `${ String( checks[ c.id ].status ).toUpperCase().padEnd( 5 ) } ${ c.id }: ${ checks[ c.id ].summary }` ) );
			await sweep.context.close();
			return finish();
		}
		for ( const ex of targetsOf.examples ) {
			const res = await sweep.page.request.get( ex.url ).catch( () => null );
			const first = res?.ok() ? ( await res.json() )[ 0 ] : null;
			first?.permalink ? targetsOf.pages.push( { ...ex, url: first.permalink, permalink: first.permalink, example: first.name } ) : notes.push( `page map ${ ex.key }: the Store API lists no ${ ex.kind } to open (${ res ? res.status() : 'no answer' })` );
		}
		// A page row's permalink from the public REST API (wp/v2), so the page loads at the address a visitor uses (a
		// `?page_id=` address of WooCommerce's shop page is redirected elsewhere); the `?page_id=` address stands when
		// the API does not answer. The permalink is also the address the menu check matches a link against, whatever the
		// page then redirects to (an empty basket's checkout loads the cart).
		for ( const p of targetsOf.pages.filter( ( x ) => x.row && ! x.example && null != x.row.id ) ) {
			const res = await sweep.page.request.get( `${ base }/wp-json/wp/v2/${ 'post' === p.row.postType ? 'posts' : 'pages' }/${ p.row.id }?_fields=link` ).catch( () => null );
			const link = res?.ok() ? ( await res.json() ).link : null;
			link && Object.assign( p, { url: link, permalink: link } );
		}
		const loaded = [];
		for ( const p of targetsOf.pages ) {
			const errors = [];
			const onError = ( e ) => errors.push( e.message.split( '\n' )[ 0 ] );
			sweep.page.on( 'pageerror', onError );
			const res = await sweep.page.goto( p.url, LOAD ).catch( ( e ) => e );
			const failed = res instanceof Error;
			const content = failed ? null : await sweep.page.evaluate( contentInPage ).catch( () => null );
			const parts = failed ? { modals: [], flows: [], forms: [] } : await sweep.page.evaluate( readPartsInPage, MARK ).catch( () => ( { modals: [], flows: [], forms: [] } ) );
			const draftLinks = failed ? [] : await sweep.page.evaluate( readDraftLinksInPage ).catch( () => [] );
			loaded.push( { ...p, finalUrl: failed ? null : sweep.page.url(), status: failed ? null : res?.status() ?? null, error: failed ? res.message.split( '\n' )[ 0 ] : null, content, parts, draftLinks, errors: [ ...errors ], screenshot: failed ? null : await sweep.shoot( `page-${ p.slug }` ) } );
			sweep.page.off( 'pageerror', onError );
		}
		await sweep.context.close();
		const home = loaded.find( ( p ) => 'front-page' === p.template ) || loaded.find( ( p ) => p.finalUrl && pathKey( p.finalUrl, base ) === pathKey( base, base ) ) || loaded.find( ( p ) => p.finalUrl );
		const homeUrl = home?.finalUrl || base;

		await guard( 'pages', async () => checkRecord( 'pages', loaded.map( ( p ) => {
			const subject = `${ p.key }${ p.example ? ` (example: ${ p.example })` : '' }`;
			const ev = { subject, url: p.finalUrl || p.url, screenshot: p.screenshot };
			const consoleNote = p.errors.length ? `; script errors: ${ p.errors.slice( 0, 3 ).join( ' | ' ) }` : '';
			if ( p.error || 200 !== p.status ) {
				return { status: 'fail', ...ev, error: p.error || `HTTP ${ p.status }` };
			}
			if ( ! p.content || p.content.critical ) {
				return { status: 'fail', ...ev, error: p.content?.critical ? 'WordPress shows its critical-error screen' : 'the page could not be read' };
			}
			if ( ! p.content.chars && ! p.content.media ) {
				return { status: 'fail', ...ev, selector: p.content.wrapper || 'main', error: `the content wrapper (${ p.content.wrapper || 'none' }) is empty` };
			}
			const redirected = pathKey( p.finalUrl, base ) !== pathKey( p.url, base ) && ! /[?&](page_id|p)=/.test( p.url ) ? `; redirected from ${ p.url }` : '';
			return { status: 'pass', ...ev, selector: p.content.wrapper, detail: `200, ${ p.content.chars } characters in ${ p.content.wrapper }${ redirected }${ consoleNote }` };
		} ), 'the page map has no page with an id' ) );

		await guard( 'menu', async () => {
			const { page, context } = await newPage();
			await page.goto( homeUrl, LOAD );
			const read = await page.evaluate( readHeaderLinksInPage );
			const megaTriggers = await page.evaluate( markMegaInPage, MARK );
			await context.close();
			const headerRows = rows.filter( ( r ) => ( r.menus || [] ).some( ( m ) => 'header' === m.menu ) ).map( ( r ) => {
				const hit = loaded.find( ( p ) => p.row === r );
				const at = hit?.permalink || hit?.finalUrl;
				return { key: `${ r.postType }:${ r.slug }`, title: r.title, postType: r.postType, id: r.id ?? null, url: at && ! hit.example ? at : null };
			} );
			const draftLinks = new Map();
			for ( const p of loaded ) {
				for ( const d of p.draftLinks ) {
					const entry = draftLinks.get( d.href ) || { ...d, pages: [] };
					! entry.pages.includes( p.key ) && entry.pages.push( p.key );
					draftLinks.set( d.href, entry );
				}
			}
			return checkRecord( 'menu', menuItems( { ...read, pages: loaded.filter( ( p ) => ! p.example ), examples: loaded.filter( ( p ) => p.example ), headerRows, draftLinks: [ ...draftLinks.values() ], megaTriggers, base, url: homeUrl } ) );
		} );

		await guard( 'mega', async () => {
			const { page, context, shoot } = await newPage();
			await page.goto( homeUrl, LOAD );
			const items = await megaItems( page, { url: homeUrl, shoot } );
			await context.close();
			return checkRecord( 'mega', items, 'the header has no mega menu trigger ([data-sgs-mega-trigger]) at 1440' );
		} );

		await guard( 'drawer', async () => {
			const items = [];
			for ( const width of [ 375, 768 ] ) {
				const { page, context, shoot } = await newPage( width );
				await page.goto( homeUrl, LOAD );
				items.push( await drawerItem( page, { width, url: homeUrl, shoot } ) );
				await context.close();
			}
			return checkRecord( 'drawer', items );
		} );

		await guard( 'modals', async () => {
			const items = [];
			const seenFlows = [];
			for ( const p of loaded.filter( ( x ) => x.parts.modals.length || x.parts.flows.length ) ) {
				const { page, context, shoot } = await newPage();
				await page.goto( p.finalUrl, LOAD );
				const parts = await page.evaluate( readPartsInPage, MARK );
				for ( const m of parts.modals ) {
					items.push( { ...await modalItem( page, m, { url: p.finalUrl, shoot } ), subject: `modal "${ m.label || m.id }" on ${ p.key }` } );
				}
				for ( const f of parts.flows ) {
					seenFlows.push( f );
					items.push( { ...await flowItem( page, f, { url: p.finalUrl, shoot } ), subject: `choice flow "${ f.label || f.flowId }" on ${ p.key }` } );
				}
				await context.close();
			}
			for ( const r of missingFlowRows( rows, seenFlows ) ) {
				items.push( { status: 'fail', subject: `page-map choice flow ${ r.slug } ("${ r.title }")`, error: `no checked page renders the choice flow ${ r.slug } (data-flow-slug) or one labelled "${ r.title }" (${ loaded.length } pages checked)` } );
			}
			return checkRecord( 'modals', items, 'no checked page renders a modal or a choice flow, and the page map names no choice flow' );
		} );

		await guard( 'forms', async () => {
			// The site's wp-cli (a WSL mirror's or over SSH, lib/calibration-refs.mjs::wpCommand), read-only: the stored
			// submissions since the run began. Unreachable leaves the stored row unread, never failed.
			const wp = wpCommand( target, args.site, args.repo );
			const sql = ( q ) => wp( [ 'db', 'query', q, '--skip-column-names' ] ).trim();
			let prefix = null;
			let since = null;
			let wpError = null;
			try {
				prefix = wp( [ 'db', 'prefix' ] ).trim();
				since = prefix ? Number( sql( `SELECT COALESCE(MAX(id),0) FROM ${ prefix }sgs_form_submissions` ) || 0 ) : null;
			} catch ( e ) {
				wpError = String( e.message ).split( '\n' )[ 0 ];
			}
			const rowsSince = async ( formId ) => {
				const slug = formSlug( formId );
				if ( wpError || slug.error ) {
					return { error: wpError || slug.error };
				}
				try {
					return { count: Number( sql( `SELECT COUNT(*) FROM ${ prefix }sgs_form_submissions WHERE id > ${ since } AND form_id='${ slug.formId }'` ) || 0 ) };
				} catch ( e ) {
					return { error: String( e.message ).split( '\n' )[ 0 ] };
				}
			};
			const items = [];
			const done = new Set();
			for ( const p of loaded ) {
				for ( const f of p.parts.forms.filter( ( x ) => ! done.has( x.formId || `${ p.key }#${ x.i }` ) ) ) {
					done.add( f.formId || `${ p.key }#${ f.i }` );
					const { page, context, shoot } = await newPage();
					await page.goto( p.finalUrl, LOAD );
					const fresh = ( await page.evaluate( readPartsInPage, MARK ) ).forms.find( ( x ) => x.i === f.i ) || f;
					items.push( { ...await formItem( page, fresh, { url: p.finalUrl, shoot, marker: MARKER, rowsSince } ), subject: `form "${ f.formId || `#${ f.i }` }" on ${ p.key }` } );
					await context.close();
				}
			}
			for ( const r of rows.filter( ( x ) => 'sgs_form' === x.postType ) ) {
				! done.has( r.slug ) && items.push( { status: 'fail', subject: `page-map form ${ r.slug }`, error: `no checked page renders the form ${ r.slug } (${ loaded.length } pages checked)` } );
			}
			return checkRecord( 'forms', items, 'no checked page renders a form and the page map names none' );
		} );

		await guard( 'flows', async () => {
			const owner = flowsClient();
			if ( owner !== args.client ) {
				return checkRecord( 'flows', [], `scripts/parity/flows holds no flows for ${ args.client } (its flows are ${ owner || 'nobody' }'s)` );
			}
			const items = [];
			for ( let i = 0; i < FLOWS.length; i++ ) {
				if ( i > 0 ) {
					await new Promise( ( r ) => setTimeout( r, MIN_GAP_MS ) );
				}
				const { page, context } = await newPage();
				const r = await execute( FLOWS[ i ], { page, base } );
				await context.close();
				const file = writeFlowResult( r, path.join( dir, 'flows' ) );
				items.push( { status: 'pass' === r.status ? 'pass' : 'fail', subject: `flow ${ r.flow }`, url: base, error: 'pass' === r.status ? null : `${ r.status }: ${ r.signal ?? '' } ${ r.detail ?? '' }`.trim(), detail: `${ rel( file ) }${ r.knownFailure ? `; known failure: ${ r.knownFailure }` : '' }` } );
			}
			return checkRecord( 'flows', items );
		} );

		await guard( 'woocommerce', async () => {
			const { page, context } = await newPage();
			const index = await page.request.get( `${ base }/wp-json/` ).catch( () => null );
			const namespaces = index?.ok() ? ( await index.json() ).namespaces || [] : [];
			await context.close();
			if ( ! namespaces.includes( 'wc/store/v1' ) ) {
				return checkRecord( 'woocommerce', [], `WooCommerce is not active on ${ args.site } (the REST index lists no wc/store/v1)` );
			}
			const roles = { cart: loaded.find( ( p ) => 'cart' === p.template ), checkout: loaded.find( ( p ) => 'checkout' === p.template ), account: loaded.find( ( p ) => isAccountRow( p.row ) ) };
			const items = [];
			for ( const [ role, p ] of Object.entries( roles ) ) {
				if ( ! p ) {
					items.push( { status: 'fail', subject: `${ role } page`, error: `WooCommerce is active but the page map has no ${ role } page with an id` } );
					continue;
				}
				const s = await newPage();
				let added = null;
				if ( 'checkout' === role && args.withCart ) {
					await s.page.goto( base, LOAD );
					added = await addOneLine( s.page, base );
				}
				await s.page.goto( p.url, LOAD );
				const item = await wooItem( s.page, role, { url: p.url, cartUrl: roles.cart?.finalUrl, withCart: !! added?.ok, shoot: s.shoot } );
				items.push( { ...item, detail: [ item.detail, added?.detail ].filter( Boolean ).join( '; ' ) || undefined } );
				await s.context.close();
			}
			return checkRecord( 'woocommerce', items );
		} );
	} finally {
		await closeBrowser( browser, pid );
	}
	return finish();
}

main().then( ( code ) => {
	process.exitCode = code;
}, ( e ) => {
	console.error( `STOP ${ e.message }` );
	process.exitCode = 2;
} );
