#!/usr/bin/env node
'use strict';

/**
 * Visual capture for the 9 native-colour-ui blocks NOT covered by
 * reports/visual-diff/native-colour-ui-2026-08-22.md.
 *
 * That report deliberately claimed only the 7 blocks it captured, and recorded
 * the rest as "same mechanism, not measured" — because a shared mechanism is an
 * argument, not a measurement. This closes that gap.
 *
 * ⛔ EVERY PROBE MUST ACTUALLY RENDER. The first pass at collapsible-text
 * supplied no inner content, the block correctly rendered nothing, and the
 * result proved NOTHING either way — it was recorded NOT VERIFIED rather than
 * passed. Composite children (form-field-tiles, form-step, product-faq-item,
 * site-*-row) are wrapped in the parent they require, and every probe carries
 * real content. A probe that renders nothing is reported as such, never as a
 * pass.
 *
 * ⛔ SGS block CSS is LIFTED to uploads/sgs-css/<hash>.css — a page-source grep
 * proves nothing. Everything here is getComputedStyle on the painted node.
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
const TXT = '<!-- wp:sgs/text {"content":"probe body copy"} /-->';

const PROBES = [
	// Renders nothing on empty content BY DESIGN — inner content is mandatory.
	{ slug: 'collapsible-text', sel: '.wp-block-sgs-collapsible-text',
	  content: `<!-- wp:sgs/collapsible-text {"content":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.","backgroundColourGradient":"${ G }"} /-->` },
	{ slug: 'physics-canvas', sel: '.wp-block-sgs-physics-canvas',
	  content: `<!-- wp:sgs/physics-canvas {"backgroundColourGradient":"${ G }"} -->${ TXT }<!-- /wp:sgs/physics-canvas -->` },
	{ slug: 'testimonial-slider', sel: '.wp-block-sgs-testimonial-slider',
	  content: `<!-- wp:sgs/testimonial-slider {"backgroundColourGradient":"${ G }"} --><!-- wp:sgs/testimonial {"quote":"probe quote","name":"A"} /--><!-- /wp:sgs/testimonial-slider -->` },
	{ slug: 'product-card', sel: '.wp-block-sgs-product-card',
	  content: `<!-- wp:sgs/product-card {"backgroundColourGradient":"${ G }","title":"Probe product"} /-->` },
	// Composite CHILDREN — each wrapped in the parent it requires.
	{ slug: 'product-faq-item', sel: '.wp-block-sgs-product-faq-item',
	  content: `<!-- wp:sgs/product-faq --><!-- wp:sgs/product-faq-item {"question":"Q?","backgroundColourGradient":"${ G }"} -->${ TXT }<!-- /wp:sgs/product-faq-item --><!-- /wp:sgs/product-faq -->` },
	{ slug: 'form-step', sel: '.wp-block-sgs-form-step',
	  content: `<!-- wp:sgs/form --><!-- wp:sgs/form-step {"backgroundColourGradient":"${ G }"} -->${ TXT }<!-- /wp:sgs/form-step --><!-- /wp:sgs/form -->` },
	{ slug: 'form-field-tiles', sel: '.wp-block-sgs-form-field-tiles',
	  content: `<!-- wp:sgs/form --><!-- wp:sgs/form-step --><!-- wp:sgs/form-field-tiles {"label":"Pick one","backgroundColourGradient":"${ G }"} /--><!-- /wp:sgs/form-step --><!-- /wp:sgs/form -->` },
	{ slug: 'site-header-row', sel: '.wp-block-sgs-site-header-row',
	  content: `<!-- wp:sgs/site-header-row {"backgroundColourGradient":"${ G }"} -->${ TXT }<!-- /wp:sgs/site-header-row -->` },
	{ slug: 'site-footer-row', sel: '.wp-block-sgs-site-footer-row',
	  content: `<!-- wp:sgs/site-footer-row {"backgroundColourGradient":"${ G }"} -->${ TXT }<!-- /wp:sgs/site-footer-row -->` },
];

// The gradient as the browser reports it once resolved.
const EXPECT = 'linear-gradient(135deg, rgb(230, 138, 149) 0%, rgb(245, 208, 80) 100%)';

async function main() {
	const creds = loadEnv();
	const auth = 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
	const browser = await chromium.launch( { headless: true } );
	const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await ctx.newPage();
	const created = [];
	const rows = [];

	for ( const probe of PROBES ) {
		let verdict = 'ERROR';
		let detail = '';
		try {
			const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages`, {
				method: 'POST',
				headers: { Authorization: auth, 'Content-Type': 'application/json' },
				body: JSON.stringify( { title: `NCUI rem ${ probe.slug }`, content: probe.content, status: 'publish' } ),
			} );
			const j = await res.json();
			created.push( j.id );
			await page.goto( j.link, { waitUntil: 'domcontentloaded', timeout: 45000 } );
			await page.waitForTimeout( 1100 );

			const m = await page.evaluate( ( sel ) => {
				const n = document.querySelector( sel );
				if ( ! n ) {
					return { present: false };
				}
				const c = getComputedStyle( n );
				const a = getComputedStyle( n, '::after' );
				const b = getComputedStyle( n, '::before' );
				return {
					present: true,
					rootImage: c.backgroundImage,
					afterImage: a.backgroundImage,
					beforeImage: b.backgroundImage,
					text: ( n.innerText || '' ).trim().length,
				};
			}, probe.sel );

			if ( ! m.present ) {
				verdict = 'NOT RENDERED';
				detail = 'selector absent — probe proves nothing either way';
			} else {
				const where =
					m.rootImage === EXPECT ? 'root'
					: m.afterImage === EXPECT ? '::after'
					: m.beforeImage === EXPECT ? '::before'
					: null;
				if ( where ) {
					verdict = 'PASS';
					detail = `gradient painted on ${ where }; innerText ${ m.text } chars`;
				} else {
					verdict = 'FAIL';
					detail = `no gradient. root=${ m.rootImage } after=${ m.afterImage } before=${ m.beforeImage }`;
				}
			}
		} catch ( e ) {
			detail = e.message;
		}
		rows.push( { slug: probe.slug, verdict, detail } );
		process.stdout.write( `  ${ verdict.padEnd( 12 ) } ${ probe.slug.padEnd( 20 ) } ${ detail }\n` );
	}

	await ctx.close();
	await browser.close();
	for ( const id of created ) {
		await fetch( `${ creds.url }/wp-json/wp/v2/pages/${ id }?force=true`, {
			method: 'DELETE', headers: { Authorization: auth },
		} ).catch( () => {} );
	}

	const n = ( v ) => rows.filter( ( r ) => r.verdict === v ).length;
	process.stdout.write(
		`\nPASS ${ n( 'PASS' ) } · FAIL ${ n( 'FAIL' ) } · NOT RENDERED ${ n( 'NOT RENDERED' ) } · ERROR ${ n( 'ERROR' ) }\n` +
		`cleaned up ${ created.length } probe pages\n`
	);
}

main();
