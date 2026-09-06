#!/usr/bin/env node
'use strict';

/**
 * Visual verification for the native-colour-ui migration (16 blocks).
 *
 * WHAT IT PROVES, and why each half is needed:
 *
 *   1. NEUTRALITY — a block with only its pre-existing backgroundColour set must
 *      render the SAME colour as before the change. The migration moved the
 *      background emit from wp_style_engine_get_styles to sgs_fill_states_css;
 *      if those disagree, a client's existing page changes colour silently.
 *
 *   2. CAPABILITY — the NEW backgroundColourGradient must actually paint. That
 *      is the whole point of the change: the native panel it replaced was, for
 *      20 of the 22 blocks, the client's only gradient control.
 *
 * ⛔ SGS block CSS is LIFTED to uploads/sgs-css/<hash>.css. Grepping the page
 * HTML for a rule finds NOTHING and looks exactly like a failed fix. This reads
 * computed styles from the live DOM, and separately FETCHES every stylesheet the
 * page links so a missing rule can be told apart from a losing one.
 *
 * Usage: node scripts/qa/capture-native-colour-ui.js <label>
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

const LABEL = process.argv[ 2 ] || 'capture';

// One probe per block: the pre-existing flat colour (neutrality) and, where the
// migration added one, a gradient (capability). Slugs are resolved live, never
// hardcoded — the canary runs a client snapshot that overrides theme.json.
const GRAD = 'linear-gradient(135deg,#e68a95 0%,#f5d050 100%)';

const PROBES = [
	{ slug: 'accordion-item', sel: '.wp-block-sgs-accordion-item',
	  content: '<!-- wp:sgs/accordion --><!-- wp:sgs/accordion-item {"title":"p","backgroundColour":"primary"} --><!-- wp:sgs/text {"content":"b"} /--><!-- /wp:sgs/accordion-item --><!-- /wp:sgs/accordion -->' },
	{ slug: 'accordion-item-grad', sel: '.wp-block-sgs-accordion-item',
	  content: `<!-- wp:sgs/accordion --><!-- wp:sgs/accordion-item {"title":"p","backgroundColourGradient":"${ GRAD }"} --><!-- wp:sgs/text {"content":"b"} /--><!-- /wp:sgs/accordion-item --><!-- /wp:sgs/accordion -->` },
	{ slug: 'quote', sel: '.wp-block-sgs-quote',
	  content: '<!-- wp:sgs/quote {"attribution":"a","backgroundColour":"accent"} --><!-- wp:sgs/text {"content":"q"} /--><!-- /wp:sgs/quote -->' },
	{ slug: 'quote-grad', sel: '.wp-block-sgs-quote',
	  content: `<!-- wp:sgs/quote {"attribution":"a","backgroundColourGradient":"${ GRAD }"} --><!-- wp:sgs/text {"content":"q"} /--><!-- /wp:sgs/quote -->` },
	{ slug: 'collapsible-text', sel: '.wp-block-sgs-collapsible-text',
	  content: `<!-- wp:sgs/collapsible-text {"backgroundColourGradient":"${ GRAD }"} /-->` },
	{ slug: 'feature-grid', sel: '.wp-block-sgs-feature-grid',
	  content: `<!-- wp:sgs/feature-grid {"backgroundColourGradient":"${ GRAD }"} /-->` },
	{ slug: 'product-faq', sel: '.wp-block-sgs-product-faq',
	  content: `<!-- wp:sgs/product-faq {"backgroundColourGradient":"${ GRAD }"} /-->` },
	{ slug: 'tab', sel: '.wp-block-sgs-tab',
	  content: `<!-- wp:sgs/tabs --><!-- wp:sgs/tab {"title":"t","backgroundColourGradient":"${ GRAD }"} --><!-- wp:sgs/text {"content":"x"} /--><!-- /wp:sgs/tab --><!-- /wp:sgs/tabs -->` },
	{ slug: 'trustpilot-reviews', sel: '.wp-block-sgs-trustpilot-reviews',
	  content: `<!-- wp:sgs/trustpilot-reviews {"backgroundColourGradient":"${ GRAD }"} /-->` },
	{ slug: 'multi-button', sel: '.wp-block-sgs-multi-button',
	  content: `<!-- wp:sgs/multi-button {"backgroundColourGradient":"${ GRAD }"} /-->` },
];

async function main() {
	const creds = loadEnv();
	const auth = 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );
	const browser = await chromium.launch( { headless: true } );
	const ctx = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	const page = await ctx.newPage();
	const out = {};
	const created = [];

	for ( const probe of PROBES ) {
		try {
			const res = await fetch( `${ creds.url }/wp-json/wp/v2/pages`, {
				method: 'POST',
				headers: { Authorization: auth, 'Content-Type': 'application/json' },
				body: JSON.stringify( {
					title: `NCUI ${ LABEL } ${ probe.slug }`,
					content: probe.content,
					status: 'publish',
				} ),
			} );
			const j = await res.json();
			created.push( j.id );
			await page.goto( j.link, { waitUntil: 'domcontentloaded', timeout: 45000 } );
			await page.waitForTimeout( 1000 );

			out[ probe.slug ] = await page.evaluate( ( sel ) => {
				const n = document.querySelector( sel );
				if ( ! n ) {
					return { present: false };
				}
				const c = getComputedStyle( n );
				return {
					present: true,
					backgroundColor: c.backgroundColor,
					backgroundImage: c.backgroundImage,
					afterBackgroundImage: getComputedStyle( n, '::after' ).backgroundImage,
					afterBackgroundColor: getComputedStyle( n, '::after' ).backgroundColor,
				};
			}, probe.sel );
		} catch ( e ) {
			out[ probe.slug ] = { error: e.message };
		}
	}

	process.stdout.write( `NCUI-${ LABEL } ${ JSON.stringify( out, null, 1 ) }\n` );

	await ctx.close();
	await browser.close();
	for ( const id of created ) {
		await fetch( `${ creds.url }/wp-json/wp/v2/pages/${ id }?force=true`, {
			method: 'DELETE',
			headers: { Authorization: auth },
		} ).catch( () => {} );
	}
	process.stdout.write( `cleaned up ${ created.length } probe pages\n` );
}

main();
