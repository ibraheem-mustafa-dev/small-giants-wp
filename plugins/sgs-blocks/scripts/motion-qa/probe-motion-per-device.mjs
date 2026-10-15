/**
 * Spec 38A unit M3.9: live acceptance of per-device values, custom easing, element targeting and tilted cards, on the
 * page built from tests/fixtures/motion/pages/motion-per-device.json.
 *
 * WHAT IT MEASURES (each check has a negative control that feeds the same judge a deliberately wrong expected value or
 * the wrong element and must come out red; a control that does not is a failure):
 *   entrance-from-translate:<all|cleared>   --sgs-me-from-ty 24 / 16 / 8 px at 1440 / 768 / 375; Mobile cleared reads 16 at 375 (FR-38A-13)
 *   entrance-media-queries:<all|cleared>    the page's rules hold Tablet inside @media (max-width:1023px) and Mobile inside (max-width:767px)
 *   no-style-attribute                      no element in the fixture sections carries a style attribute (FR-38A-13)
 *   hover-easing:<bezier|linear>            a custom cubic-bezier() and linear() reach computed transition-timing-function (FR-38A-12)
 *   media-part-only                         a hover value on a block's image part (sgs/team-member photo) moves only that part (FR-38A-4)
 *   tilt-rest-and-hover:<a|b|c|polaroid>    own rest angle, then 0deg with translate (-4px, -6px) on hover and on focus, with the stored easing (FR-38A-42)
 *   tilt-hover-isolated                     hovering one card leaves the others at their own rest angles
 *   tilt-reduced-motion                     under reduced motion the rest angle stays and the hover movement does not apply
 *   editor-invalid-curve-refused            (--editor) an invalid custom curve is refused in the inspector with a message (FR-38A-12)
 *
 * Usage:
 *   node scripts/motion-qa/probe-motion-per-device.mjs --page <id> [--engine chromium|firefox|webkit ...] [--width 1440|768|375 ...] [--site sandybrown] [--editor]
 *   node scripts/motion-qa/probe-motion-per-device.mjs --self-test            (offline: judges and expectations read from the fixture)
 * Default widths: all three. Output: one JSON row per check, then a summary. Exit: 0 all pass; 1 any FAIL or control not red; 2 only UNANSWERED remain.
 *
 * @package SGS\Blocks
 */

import { chromium, firefox, webkit } from 'playwright';
import { parseArgs, siteBase, Reporter, validateFixtures, WIDTHS } from './probe-motion-model-lib.mjs';
import {
	loadExpectations,
	expectedDistance,
	judgeDistance,
	judgeEase,
	judgeRotate,
	judgeTranslate,
	judgeMediaOnly,
	judgeMediaRules,
	judgeNoStyle,
	READ_MEDIA_RULES,
	selfTest,
} from './probe-motion-per-device-lib.mjs';
import { editorCurveCheck } from './probe-motion-per-device-editor.mjs';
import { tiltChecks } from './probe-motion-per-device-tilt.mjs';
import { READ_MOTION, hoverRead } from './probe-motion-per-device-page.mjs';

const BROWSERS = { chromium, firefox, webkit };
const HEIGHT = 900;
const WRAPS = [ 'm39-dev-all-wrap', 'm39-dev-cleared-wrap', 'm39-ease-wrap', 'm39-media-wrap', 'm39-tilt-wrap', 'm39-polaroid-wrap' ];

async function entranceChecks( ctx, ex ) {
	const { rep, page, width } = ctx;
	for ( const [ key, cls ] of [ [ 'all', 'm39-dev-all' ], [ 'cleared', 'm39-dev-cleared' ] ] ) {
		const sel = `.${ cls }`;
		const want = expectedDistance( ex[ key ], width );
		const got = await page.evaluate( READ_MOTION, sel );
		if ( ! got ) {
			rep.check( `entrance-from-translate:${ key }`, { selector: sel, pass: null, why: 'selector not on the page: build the fixture and pass its id' } );
			continue;
		}
		rep.check( `entrance-from-translate:${ key }`, { selector: sel, property: '--sgs-me-from-ty', measured: got.fromTy, expected: `${ want }px at ${ width }`, pass: judgeDistance( got.fromTy, want ) } );
		rep.control( `entrance-from-translate:${ key }`, { selector: sel, property: '--sgs-me-from-ty', measured: got.fromTy, expected: 'a deliberately wrong 99px is judged red', red: ! judgeDistance( got.fromTy, 99 ) } );

		const buckets = await page.evaluate( READ_MEDIA_RULES, { classes: got.classes, property: '--sgs-me-from-ty' } );
		rep.check( `entrance-media-queries:${ key }`, { selector: got.classes.map( ( c ) => `.${ c }` ).join( ', ' ) || sel, property: '--sgs-me-from-ty inside @media', measured: buckets, expected: `base ${ ex[ key ].desktop }px; @media (max-width:1023px) ${ ex[ key ].tablet }px; @media (max-width:767px) ${ ex[ key ].mobile ?? 'no rule' }`, pass: got.classes.length > 0 && judgeMediaRules( buckets, ex[ key ] ) } );
		const swapped = { ...ex[ key ], mobile: ex[ key ].mobile === null ? 8 : null };
		rep.control( `entrance-media-queries:${ key }`, { selector: sel, property: '--sgs-me-from-ty inside @media', measured: buckets, expected: 'the Mobile expectation inverted (a rule where none exists, none where one does) is judged red', red: ! judgeMediaRules( buckets, swapped ) } );
	}
}

async function styleAttributeChecks( ctx ) {
	const { rep, page } = ctx;
	const scan = ( wraps ) => [ ...document.querySelectorAll( wraps.map( ( w ) => `.${ w }, .${ w } *` ).join( ', ' ) ) ].filter( ( n ) => n.hasAttribute( 'style' ) ).map( ( n ) => `${ n.tagName.toLowerCase() }.${ String( n.className ).trim().split( /\s+/ ).join( '.' ) }` );
	const absent = await page.evaluate( ( list ) => list.filter( ( w ) => ! document.querySelector( `.${ w }` ) ), WRAPS );
	if ( absent.length ) {
		rep.check( 'no-style-attribute', { selector: absent.map( ( w ) => `.${ w }` ).join( ', ' ), pass: null, why: 'fixture sections not on the page: build the fixture and pass its id' } );
		return;
	}
	const found = await page.evaluate( scan, WRAPS );
	rep.check( 'no-style-attribute', { selector: WRAPS.map( ( w ) => `.${ w } *` ).join( ', ' ), property: 'style attribute', measured: found, expected: [], pass: judgeNoStyle( found ) } );
	await page.evaluate( ( w ) => {
		const d = document.createElement( 'div' );
		d.setAttribute( 'style', 'color: red' );
		document.querySelector( `.${ w }` ).appendChild( d );
	}, WRAPS[ 0 ] );
	const planted = await page.evaluate( scan, WRAPS );
	await page.evaluate( () => document.querySelector( '.m39-dev-all-wrap > div[style]' )?.remove() );
	rep.control( 'no-style-attribute', { selector: `.${ WRAPS[ 0 ] } > div`, property: 'style attribute', measured: planted, expected: 'a planted style attribute is found, so an empty list above is not a blind scanner', red: ! judgeNoStyle( planted ) } );
}

async function easingChecks( ctx, ex ) {
	const { rep, page } = ctx;
	const supported = await page.evaluate( () => CSS.supports( 'transition-timing-function', 'linear(0, 0.25 40%, 1)' ) );
	for ( const [ key, cls ] of [ [ 'bezier', 'm39-ease-bezier' ], [ 'linear', 'm39-ease-linear' ] ] ) {
		const sel = `.${ cls }`;
		if ( key === 'linear' && ! supported ) {
			rep.check( 'hover-easing:linear', { selector: sel, pass: null, why: `${ ctx.engine } does not support linear() in transition-timing-function` } );
			continue;
		}
		if ( ! await page.$( sel ) ) {
			rep.check( `hover-easing:${ key }`, { selector: sel, pass: null, why: 'selector not on the page: build the fixture and pass its id' } );
			continue;
		}
		const { before, after } = await hoverRead( page, sel, [ sel ] );
		const b = before[ sel ];
		const lifted = judgeTranslate( after[ sel ].translate, 0, -6 );
		rep.check( `hover-easing:${ key }`, { selector: sel, property: 'transition-timing-function', measured: { ease: b.ease, hoverTranslate: after[ sel ].translate }, expected: `${ ex[ key ] } on every transition entry, and the hover lifts -6px`, pass: judgeEase( b.ease, ex[ key ] ) && lifted } );
		const wrong = key === 'bezier' ? ex.linear : ex.bezier;
		rep.control( `hover-easing:${ key }`, { selector: sel, property: 'transition-timing-function', measured: b.ease, expected: `the other element's curve (${ wrong }) is judged red`, red: ! judgeEase( b.ease, wrong ) } );
	}
}

async function mediaChecks( ctx, ex ) {
	const { rep, page } = ctx;
	const parts = { root: '.m39-media', media: '.m39-media .sgs-team-member__photo', other: '.m39-media .sgs-team-member__name' };
	if ( ! await page.$( parts.media ) || ! await page.$( parts.other ) ) {
		rep.check( 'media-part-only', { selector: parts.media, pass: null, why: 'the team-member photo or name is not on the page' } );
		return;
	}
	const { before, after } = await hoverRead( page, parts.root, Object.values( parts ) );
	const reading = Object.fromEntries( Object.entries( parts ).map( ( [ k, s ] ) => [ k, { before: before[ s ], after: after[ s ] } ] ) );
	const pick = ( r ) => Object.fromEntries( Object.entries( r ).map( ( [ k, v ] ) => [ k, { translate: v.after.translate, scale: v.after.scale, rotate: v.after.rotate, transform: v.after.transform, stamped: v.after.stamped } ] ) );
	rep.check( 'media-part-only', { selector: `${ parts.media } (root ${ parts.root }, other part ${ parts.other })`, property: 'translate / scale / rotate / transform', measured: pick( reading ), expected: `media translate y ${ ex.media.y }px and scale ${ ex.media.scale }; root and the name part unchanged`, pass: judgeMediaOnly( reading, ex.media ) } );
	const swapped = { media: reading.other, root: reading.root, other: reading.media };
	rep.control( 'media-part-only', { selector: parts.other, property: 'translate / scale', measured: reading.other.after.translate, expected: 'reading the name part as if it were the media part is judged red', red: ! judgeMediaOnly( swapped, ex.media ) } );
}

async function main() {
	if ( process.argv.includes( '--self-test' ) ) {
		const failures = selfTest();
		const fixtures = await validateFixtures();
		if ( ! fixtures.ok ) failures.push( 'a fixture sgsMotion value is invalid' );
		console.log( JSON.stringify( { selfTest: true, failures } ) );
		process.exit( failures.length ? 1 : 0 );
	}
	const editor = process.argv.includes( '--editor' );
	const argv = process.argv.filter( ( a ) => a !== '--editor' );
	const args = parseArgs( argv );
	if ( ! argv.includes( '--width' ) ) args.widths = WIDTHS;
	if ( args.pages.length !== 1 ) {
		console.error( 'Pass exactly one --page <id> (the page built from tests/fixtures/motion/pages/motion-per-device.json).' );
		process.exit( 1 );
	}
	const base = siteBase( args.site );
	const url = `${ base }/?p=${ args.pages[ 0 ] }&cb=m39`;
	const ex = loadExpectations();
	const all = [];
	for ( const engine of args.engines ) {
		const browser = await BROWSERS[ engine ].launch();
		for ( const width of args.widths ) {
			const rep = new Reporter( { engine, width, site: args.site } );
			const open = async ( opts = {} ) => {
				const context = await browser.newContext( { viewport: { width, height: HEIGHT }, ...opts } );
				const page = await context.newPage();
				await page.goto( url, { waitUntil: 'load' } ).catch( () => page.goto( url, { waitUntil: 'load' } ) );
				await page.waitForTimeout( 400 );
				return { page, close: () => context.close() };
			};
			const { page, close } = await open();
			const ctx = { rep, page, width, engine, ex, open };
			try {
				for ( const run of [ entranceChecks, styleAttributeChecks, easingChecks, mediaChecks, tiltChecks ] ) {
					try {
						await run( ctx, ex );
					} catch ( e ) {
						rep.check( `error:${ run.name }`, { pass: false, why: String( e && e.message ? e.message : e ) } );
					}
				}
			} finally {
				await close();
			}
			all.push( ...rep.rows );
		}
		await browser.close();
	}
	const finish = new Reporter( {} );
	finish.rows = all;
	if ( editor ) {
		try {
			await editorCurveCheck( { rep: finish, site: args.site, base, pageId: args.pages[ 0 ] } );
		} catch ( e ) {
			finish.check( 'editor-invalid-curve-refused', { pass: null, why: `editor run failed: ${ String( e && e.message ? e.message : e ) }` } );
		}
	}
	process.exit( finish.summary() );
}

main().catch( ( e ) => {
	console.error( e );
	process.exit( 1 );
} );
