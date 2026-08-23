#!/usr/bin/env node
'use strict';

/**
 * intent_capture probe for the native-colour-ui class closure (2026-08-23).
 *
 * WHAT IT PROVES. Each of the six migrated blocks lost its competing WordPress
 * colour panel, and the block-private replacement genuinely PAINTS. A flag flip
 * with a control that does not paint is the exact defect this migration exists
 * to remove (D744), and it is invisible to every static gate — the attribute is
 * declared, the control is mounted, the emitter is called, and nothing appears.
 *
 * ⛔ THE ATTRIBUTE JSON IS BUILT AS AN OBJECT AND SERIALISED, NEVER SPLICED INTO
 * A STRING (D750). Splicing at the first `}` lands inside `"padding":{}`, WP then
 * drops EVERY attribute back to defaults, and the result looks exactly like a
 * render bug. One such artefact reached a commit before being retracted.
 *
 * NEGATIVE CONTROL: a seventh instance is published with NO colour attributes at
 * all. If the probe reports the sentinel colour on that one too, the probe is
 * reading the wrong element (or a cached page) and every PASS above it is void.
 *
 * Usage: node probe-native-colour-ui-close.js
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
	const env = {};
	for ( const line of fs.readFileSync( envPath, 'utf8' ).split( /\r?\n/ ) ) {
		const m = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/ );
		if ( m ) env[ m[ 1 ] ] = m[ 2 ].replace( /^["']|["']$/g, '' );
	}
	return {
		url: env.WP_URL_SANDYBROWN.replace( /\/$/, '' ),
		user: env.WP_USER_SANDYBROWN,
		appPwd: env.WP_APP_PWD_SANDYBROWN,
	};
}

// Distinctive, unambiguous sentinels — raw hex, so nothing depends on token
// resolution and a false match is vanishingly unlikely.
const BG = '#123456';
const TX = '#abcdef';
const BG_RGB = 'rgb(18, 52, 86)';
const TX_RGB = 'rgb(171, 205, 239)';

// Each block: the sentinel attrs to set, and the class its root renders with.
const CASES = [
	// `textSel` names the element the block's TEXT colour actually paints on.
	// It is NOT always the root: icon-list scopes text to its item-text element
	// (render.php `$text_sel`), which is precisely why its background can live on
	// the root un-clipped. Measuring the root for every block was the first
	// version of this probe and it reported icon-list as broken when the code was
	// correct — a probe defect, not a render defect.
	{
		block: 'sgs/icon-list',
		cls: 'wp-block-sgs-icon-list',
		attrs: { backgroundColour: BG, textColour: TX },
		textSel: ' .sgs-icon-list__text',
	},
	{ block: 'sgs/info-box', cls: 'wp-block-sgs-info-box', attrs: { backgroundColour: BG, textColour: TX } },
	{ block: 'sgs/notice-banner', cls: 'wp-block-sgs-notice-banner', attrs: { backgroundColour: BG, textColour: TX } },
	{ block: 'sgs/team-member', cls: 'wp-block-sgs-team-member', attrs: { backgroundColour: BG, textColour: TX } },
	{
		// Needs real content or it renders nothing at all.
		block: 'sgs/testimonial',
		cls: 'wp-block-sgs-testimonial',
		attrs: {
			backgroundColour: BG,
			textColour: TX,
			quote: 'Probe quote for the native-colour-ui close.',
			reviewerName: 'Probe Reviewer',
		},
	},
	// sgs/buybox is DELIBERATELY ABSENT. Its render.php returns early without a
	// WooCommerce product (wc_get_product on the queried post), so it cannot render
	// on a plain page at all — a page probe would report "NOT RENDERED" and that
	// would say nothing about the migration. It is measured separately, on a real
	// product, by probe-buybox-colour.js.
];

function serialise( block, attrs, extraClass ) {
	const a = { ...attrs, className: extraClass };
	return `<!-- wp:${ block.replace( /^sgs\//, 'sgs/' ) } ${ JSON.stringify( a ) } -->\n<!-- /wp:${ block } -->`;
}

( async () => {
	const creds = loadEnv();
	const auth = 'Basic ' + Buffer.from( `${ creds.user }:${ creds.appPwd }` ).toString( 'base64' );

	// Build the probe page: one SENTINEL instance per block, plus one CONTROL
	// instance of each carrying no colour attrs at all.
	let content = '';
	for ( const c of CASES ) {
		content += serialise( c.block, c.attrs, `probe-sentinel-${ c.cls }` ) + '\n\n';
		content += serialise( c.block, {}, `probe-control-${ c.cls }` ) + '\n\n';
	}

	const createRes = await fetch( `${ creds.url }/wp-json/wp/v2/pages`, {
		method: 'POST',
		headers: { Authorization: auth, 'Content-Type': 'application/json' },
		body: JSON.stringify( {
			title: 'GATE probe — native-colour-ui close 2026-08-23',
			slug: 'gate-native-colour-ui-close',
			status: 'publish',
			content,
		} ),
	} );
	const page = await createRes.json();
	if ( ! page.id ) {
		process.stderr.write( 'FAILED to create probe page: ' + JSON.stringify( page ).slice( 0, 400 ) + '\n' );
		process.exit( 1 );
	}
	process.stdout.write( `probe page id=${ page.id } link=${ page.link }\n\n` );

	let exitCode = 0;
	const browser = await chromium.launch();
	try {
		const p = await browser.newPage();
		// Cache-bust: a cached page is not a measurement.
		await p.goto( `${ page.link }?nocache=${ Date.now() }`, { waitUntil: 'networkidle' } );

		for ( const c of CASES ) {
			const read = async ( which ) =>
				p.evaluate(
					( { rootSel, textSel } ) => {
						const root = document.querySelector( rootSel );
						if ( ! root ) return null;
						// The text-bearing node may be a descendant; fall back to the
						// root when the block paints text on itself.
						const textEl = textSel ? root.querySelector( textSel ) : root;
						const cs = getComputedStyle( root );
						const after = getComputedStyle( root, '::after' );
						return {
							colour: textEl ? getComputedStyle( textEl ).color : null,
							textElFound: !! textEl,
							bg: cs.backgroundColor,
							afterBg: after.backgroundColor,
						};
					},
					{ rootSel: `.probe-${ which }-${ c.cls }`, textSel: c.textSel ? c.textSel.trim() : null }
				);

			const sentinel = await read( 'sentinel' );
			const control = await read( 'control' );

			if ( sentinel && ! sentinel.textElFound ) {
				process.stdout.write( `  ${ c.block.padEnd( 20 ) } PROBE BROKEN — textSel matched nothing; not a code verdict
` );
				exitCode = 1;
				continue;
			}
			if ( ! sentinel ) {
				process.stdout.write( `  ${ c.block.padEnd( 20 ) } NOT RENDERED — cannot assess\n` );
				exitCode = 1;
				continue;
			}

			// Background may paint on the root OR on the ::after layer, depending on
			// whether this block's text and background share an element. Both are
			// legitimate; accept either, and say which.
			const bgOnRoot = sentinel.bg === BG_RGB;
			const bgOnAfter = sentinel.afterBg === BG_RGB;
			const textOk = sentinel.colour === TX_RGB;
			const ctrlClean = ! control || ( control.bg !== BG_RGB && control.afterBg !== BG_RGB && control.colour !== TX_RGB );

			const verdict = ( bgOnRoot || bgOnAfter ) && textOk && ctrlClean ? 'PASS' : 'CHECK';
			if ( verdict !== 'PASS' ) exitCode = 1;
			process.stdout.write(
				`  ${ c.block.padEnd( 20 ) } ${ verdict }  bg=${ bgOnRoot ? 'root' : bgOnAfter ? '::after' : 'ABSENT(' + sentinel.bg + '/' + sentinel.afterBg + ')' }` +
					`  text=${ textOk ? 'ok' : 'ABSENT(' + sentinel.colour + ')' }` +
					`  negative-control=${ ctrlClean ? 'clean' : 'CONTAMINATED — probe is unreliable' }\n`
			);
		}
	} finally {
		await browser.close();
		// Canary content is a test rig (Bean, 2026-08-23) — the probe page is
		// deleted, not left lying around to be mistaken for real content.
		await fetch( `${ creds.url }/wp-json/wp/v2/pages/${ page.id }?force=true`, {
			method: 'DELETE',
			headers: { Authorization: auth },
		} );
		process.stdout.write( `\nprobe page ${ page.id } deleted\n` );
	}
	process.exit( exitCode );
} )();
