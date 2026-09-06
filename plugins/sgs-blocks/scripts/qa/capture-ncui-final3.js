#!/usr/bin/env node
'use strict';

/**
 * The last 3 native-colour-ui blocks — the ones page-content probing could not reach.
 *
 * WHY A DIFFERENT INSTRUMENT. The earlier pass reported these as failures. They
 * were not: the PROBE was wrong both times.
 *
 *   collapsible-text — the probe set `content`, an attribute this block does not
 *     declare. Its real attribute is `text`, and render.php returns early on empty
 *     text, so nothing rendered and the result proved nothing.
 *
 *   site-header-row / site-footer-row — these declare
 *     `parent: ['sgs/site-header'|'sgs/site-footer']` and are TEMPLATE-PART
 *     children. A unique marker planted in a page-content probe appeared NOWHERE
 *     in the page, while THREE elements of that class existed: the measurement was
 *     of the site's REAL header. Page content cannot inject into a template part.
 *
 * METHOD FOR THE ROW BLOCKS: render the block server-side through the REST
 * block-renderer (the same renderer WordPress itself uses), which honours the real
 * render.php and returns its scoped <style>, then inject that markup into a REAL
 * canary page so the theme stylesheet and palette custom properties are present,
 * and read getComputedStyle from the painted node.
 *
 * ⚠ THIS IS AN HONEST BUT WEAKER INSTRUMENT than authoring the block in its real
 * template, and the report must say so. It proves render.php emits correct,
 * correctly-scoped CSS that paints under the real theme. It does NOT prove the
 * block behaves correctly when composed inside its actual header/footer template,
 * where other rules could still win on specificity.
 */

const fs = require( 'fs' );
const path = require( 'path' );

let chromium;
try {
	// eslint-disable-next-line import/no-extraneous-dependencies
	( { chromium } = require( 'playwright' ) );
} catch ( e ) {
	process.stderr.write( `Playwright unavailable: ${ e.message }\n` );
	process.exit( 1 );
}

function loadEnv() {
	const envPath = path.resolve( __dirname, '../../../../.claude/secrets/sandybrown.env' );
	const txt = fs.readFileSync( envPath, 'utf8' );
	const env = {};
	for ( const line of txt.split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) {
			env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
		}
	}
	return {
		url: env.WP_URL_SANDYBROWN.replace( /\/$/, '' ),
		user: env.WP_USER_SANDYBROWN,
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

const G = 'linear-gradient(135deg,#e68a95 0%,#f5d050 100%)';
const EXPECT = 'linear-gradient(135deg, rgb(230, 138, 149) 0%, rgb(245, 208, 80) 100%)';

const results = [];
const record = ( slug, verdict, detail ) => {
	results.push( { slug, verdict } );
	process.stdout.write( `  ${ verdict.padEnd( 12 ) } ${ slug.padEnd( 20 ) } ${ detail }\n` );
};

async function main() {
	const creds = loadEnv();
	const auth = 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
	const browser = await chromium.launch( { headless: true } );
	const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await ctx.newPage();
	const created = [];

	// ── 1. collapsible-text — normal page path, with the attribute it ACTUALLY
	// declares (`text`, not `content`).
	try {
		const content =
			`<!-- wp:sgs/collapsible-text {"text":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud.","backgroundColourGradient":"${ G }"} /-->`;
		const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages`, {
			method: 'POST',
			headers: { Authorization: auth, 'Content-Type': 'application/json' },
			body: JSON.stringify( { title: 'NCUI final collapsible-text', content, status: 'publish' } ),
		} );
		const j = await res.json();
		created.push( j.id );
		await page.goto( j.link, { waitUntil: 'domcontentloaded', timeout: 45000 } );
		await page.waitForTimeout( 1000 );
		const m = await page.evaluate( () => {
			const n = document.querySelector( '.wp-block-sgs-collapsible-text' );
			if ( ! n ) {
				return { present: false };
			}
			return {
				present: true,
				root: getComputedStyle( n ).backgroundImage,
				after: getComputedStyle( n, '::after' ).backgroundImage,
				text: ( n.innerText || '' ).trim().length,
			};
		} );
		if ( ! m.present ) {
			record( 'collapsible-text', 'NOT RENDERED', 'still absent — probe proves nothing' );
		} else {
			const where = m.root === EXPECT ? 'root' : m.after === EXPECT ? '::after' : null;
			record(
				'collapsible-text',
				where ? 'PASS' : 'FAIL',
				where
					? `gradient on ${ where }; innerText ${ m.text } chars (block genuinely rendered)`
					: `no gradient. root=${ m.root } after=${ m.after }`
			);
		}
	} catch ( e ) {
		record( 'collapsible-text', 'ERROR', e.message );
	}

	// ── 2/3. The row blocks — server-rendered via REST block-renderer, then
	// injected into a real themed page so computed style is meaningful.
	const host = await fetch( `${ creds.url }/wp-json/wp/v2/pages`, {
		method: 'POST',
		headers: { Authorization: auth, 'Content-Type': 'application/json' },
		body: JSON.stringify( {
			title: 'NCUI final host',
			content: '<!-- wp:sgs/text {"content":"host page"} /-->',
			status: 'publish',
		} ),
	} ).then( ( r ) => r.json() );
	created.push( host.id );

	for ( const [ slug, cls ] of [
		[ 'site-header-row', 'sgs-site-header-row' ],
		[ 'site-footer-row', 'sgs-site-footer-row' ],
	] ) {
		try {
			const attrs = encodeURIComponent( JSON.stringify( { backgroundColourGradient: G } ) );
			const url = `${ creds.url }/wp-json/wp/v2/block-renderer/sgs/${ slug }?context=edit&attributes=${ attrs }&post_id=${ host.id }`;
			const r = await fetch( url, { headers: { Authorization: auth } } );
			if ( ! r.ok ) {
				record( slug, 'NOT RUN', `block-renderer ${ r.status }: ${ ( await r.text() ).slice( 0, 120 ) }` );
				continue;
			}
			const body = await r.json();
			const html = body.rendered || '';
			if ( ! html.trim() ) {
				record( slug, 'NOT RENDERED', 'block-renderer returned empty markup' );
				continue;
			}
			// The scoped <style> must be IN the returned markup — that alone proves
			// render.php emitted it. Then paint it in a themed page.
			const emitsStyle = /<style/i.test( html );

			await page.goto( host.link, { waitUntil: 'domcontentloaded', timeout: 45000 } );
			await page.waitForTimeout( 700 );
			const m = await page.evaluate(
				( args ) => {
					const holder = document.createElement( 'div' );
					holder.id = 'ncui-inject';
					holder.innerHTML = args.html;
					document.body.appendChild( holder );
					// Re-append <style> nodes so the browser actually applies them —
					// innerHTML-inserted <style> does apply, but be explicit.
					holder.querySelectorAll( 'style' ).forEach( ( s ) => {
						const c = document.createElement( 'style' );
						c.textContent = s.textContent;
						document.head.appendChild( c );
					} );
					const n = holder.querySelector( '.' + args.cls );
					if ( ! n ) {
						return { present: false };
					}
					return {
						present: true,
						root: getComputedStyle( n ).backgroundImage,
						after: getComputedStyle( n, '::after' ).backgroundImage,
						uid: [ ...n.classList ].find( ( c ) => /^sgs-(shr|sfr)-/.test( c ) ) || '(no uid)',
					};
				},
				{ html, cls }
			);

			if ( ! m.present ) {
				record( slug, 'NOT RENDERED', `markup returned but .${ cls } absent` );
			} else {
				const where = m.root === EXPECT ? 'root' : m.after === EXPECT ? '::after' : null;
				record(
					slug,
					where ? 'PASS' : 'FAIL',
					where
						? `gradient on ${ where }; uid=${ m.uid }; scoped <style> emitted=${ emitsStyle } (server-rendered + injected)`
						: `no gradient. uid=${ m.uid } style-emitted=${ emitsStyle } root=${ m.root }`
				);
			}
		} catch ( e ) {
			record( slug, 'ERROR', e.message );
		}
	}

	await ctx.close();
	await browser.close();
	for ( const id of created ) {
		await fetch( `${ creds.url }/wp-json/wp/v2/pages/${ id }?force=true`, {
			method: 'DELETE', headers: { Authorization: auth },
		} ).catch( () => {} );
	}
	const n = ( v ) => results.filter( ( r ) => r.verdict === v ).length;
	process.stdout.write(
		`\nPASS ${ n( 'PASS' ) } · FAIL ${ n( 'FAIL' ) } · NOT RENDERED ${ n( 'NOT RENDERED' ) } · NOT RUN ${ n( 'NOT RUN' ) } · ERROR ${ n( 'ERROR' ) }\n`
	);
}

main();
