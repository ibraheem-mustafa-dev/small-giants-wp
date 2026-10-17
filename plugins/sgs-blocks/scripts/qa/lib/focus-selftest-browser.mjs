/**
 * The browser half of probe-focus-system.mjs --self-test: a small fixture that exercises the probe's own measuring rules
 * (the proxy a focus source is measured on, a source with no proxy, the skip-link radius exemption, neighbour sampling and
 * the usable-point count) against the real focus stylesheet. Each case states what the probe must report; a probe that
 * cannot tell the cases apart fails here.
 *
 * @package SGS\Blocks
 */

import { tabThrough } from './focus-measure.mjs';
import { judgeStop, summarise } from './focus-probe-lib.mjs';

const FIXTURE_CSS = `
:root{--wp--preset--color--surface:#ffffff;--wp--preset--color--text:#0b1020;--wp--preset--color--accent:#0e7c86;--wp--preset--color--primary:#1f3a5f;--wp--preset--color--accent-light:#7ad0d8}
body{margin:0;font:16px/1.4 system-ui,sans-serif;background:#ffffff;color:#0b1020}
.row{padding:28px 24px;display:flex;flex-wrap:wrap;gap:28px;align-items:center}
.sgs-focus-source{position:absolute;opacity:0;width:1px;height:1px;margin:0;clip-path:inset(50%)}
.wrap{position:relative;display:inline-block}
.pill{display:inline-block;padding:6px 16px;border:2px solid currentColor;border-radius:999px}
.card{position:relative;box-sizing:border-box;width:240px;padding:20px 16px;border-radius:12px;background:#eef1f5}
.cardlink{color:inherit;text-decoration:none}
.cardlink::after{content:"";position:absolute;inset:0;z-index:1}
.b{font:inherit;padding:10px 18px;border:0;border-radius:6px;background:#0e7c86;color:#ffffff;text-decoration:none;display:inline-block}
.circle{display:inline-block;width:32px;height:32px;border-radius:50%;background:#0e7c86}
.skip-link.screen-reader-text{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;border-radius:0}
.skip-link.screen-reader-text:focus{left:6px;top:6px;width:auto;height:auto;padding:10px 16px;background:#eef1f5;border-radius:3px;z-index:100000}
.abut{display:flex;gap:0;padding:28px 24px}
.abut .b{border-radius:0}
.grow{display:block;width:44px;height:44px;background:#0e7c86;transition:width .7s}
.grow:focus{width:129px}
.tight{display:inline-block;width:40px;height:40px;background:#c9ced6;border-radius:50%;margin-left:4px}
#crowd{gap:0}
`;

const FIXTURE_BODY = `
<a class="skip-link screen-reader-text" href="#main" id="skip">Skip to content</a>
<div class="row" id="adjacent"><label class="wrap"><input type="radio" class="sgs-focus-source" name="a" aria-label="Adjacent source"><span class="sgs-focus-proxy pill">Adjacent proxy</span></label></div>
<div class="row sgs-focus-scope" id="scoped"><label class="wrap"><input type="radio" class="sgs-focus-source" name="b" aria-label="Scoped source"><span class="note">label text between</span></label><span class="sgs-focus-proxy pill">Scoped proxy</span></div>
<div class="row"><article class="card sgs-focus-card" id="card"><p>Card</p><a class="sgs-focus-source cardlink" href="#card">Card link</a></article></div>
<div class="row" id="orphan"><input type="checkbox" class="sgs-focus-source" aria-label="Orphan source"><span class="pill">Nothing paints for this</span></div>
<div class="row" id="circle"><a class="circle" href="#circle" aria-label="Lone circle"></a></div>
<div class="abut" id="abut"><a class="b" href="#abut-one">Stacked one</a><a class="b" href="#abut-two">Stacked two</a></div>
<div class="row" id="crowd"><a class="b" href="#crowd-link">Crowded link</a><a class="tight" href="#crowd-circle" aria-label="Beside it"></a></div>
<div class="row" id="growrow"><a class="grow" href="#grow" aria-label="Growing link"></a></div>
<main id="main"></main>
`;

/** Tab the fixture and index the stops by the id of the section (or the skip link) they sit in. */
async function measureFixture( browser, focusCss, scratch, settle ) {
	const context = await browser.newContext( { viewport: { width: 900, height: 900 } } );
	const page = await context.newPage();
	await page.setContent( `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><style>${ FIXTURE_CSS }</style><style>${ focusCss }</style></head><body>${ FIXTURE_BODY }</body></html>` );
	const run = await tabThrough( page, { maxStops: 40, tabKey: 'Tab', settle, forcedColors: false, shotsDir: null, shotPrefix: 'selftest', scratch } );
	await context.close();
	return run.stops;
}

const byLabel = ( stops, text ) => stops.find( ( s ) => s.label.includes( text ) );

/** Runs the fixture cases. Returns the number of failures; prints one line per case. */
export async function browserSelfTest( browser, focusCss ) {
	let failed = 0;
	const check = ( name, ok ) => {
		if ( ! ok ) failed++;
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ name }` );
	};
	const scratchContext = await browser.newContext();
	const scratch = await scratchContext.newPage();
	await scratch.goto( 'about:blank' );
	const stops = await measureFixture( browser, focusCss, scratch, 60 );
	const again = await measureFixture( browser, focusCss, scratch, 60 );
	await scratchContext.close();
	const mode = {};

	const adjacent = byLabel( stops, 'Adjacent source' );
	check( 'proxy: an adjacent proxy is the measured element', Boolean( adjacent ) && adjacent.measuredOn === 'proxy' && adjacent.proxyKind === 'adjacent' && adjacent.rect.width > 40 );
	const scoped = byLabel( stops, 'Scoped source' );
	check( 'proxy: a scoped proxy is found through the nearest scope', Boolean( scoped ) && scoped.measuredOn === 'proxy' && scoped.proxyKind === 'scoped' && scoped.rect.width > 40 );
	const card = byLabel( stops, 'Card link' );
	check( 'proxy: a card source is measured on the card', Boolean( card ) && card.measuredOn === 'proxy' && card.proxyKind === 'card' && card.rect.width === 240 );
	check( 'proxy: a source with its proxy is not a no-proxy failure', [ adjacent, scoped, card ].every( ( s ) => s && ! s.noProxy && ! judgeStop( s, mode ).some( ( f ) => f.startsWith( 'no-proxy' ) ) ) );
	const orphan = byLabel( stops, 'Orphan source' );
	check( 'no-proxy: a source with no proxy is measured on itself and fails as no-proxy',
		Boolean( orphan ) && orphan.measuredOn === 'element' && orphan.noProxy && judgeStop( orphan, mode ).some( ( f ) => f.startsWith( 'no-proxy' ) ) );
	check( 'proxy: the summary counts proxy-measured stops and no-proxy stops', ( () => {
		const s = summarise( stops, mode );
		return s.measuredOnProxy === 3 && s.noProxy === 1;
	} )() );

	const skip = byLabel( stops, 'Skip to content' );
	check( 'skip link: its radius changes on focus but the stop is exempt, not failed',
		Boolean( skip ) && skip.radiusRest !== skip.radius && Boolean( skip.radiusExempt ) && ! judgeStop( skip, mode ).some( ( f ) => f.startsWith( 'radius' ) ) );
	const sk = summarise( [ skip ], mode );
	check( 'skip link: the summary counts the exemption and not a radius change', sk.radiusExempt === 1 && sk.radiusChanged === 0 && sk.radiusExemptReasons.length === 1 );
	check( 'skip link: a changing radius on an ordinary element still fails', judgeStop( { ...skip, radiusExempt: null }, mode ).some( ( f ) => f.startsWith( 'radius' ) ) );

	const circle = byLabel( stops, 'Lone circle' );
	check( 'sampling: a lone 32px circle has at least 6 usable points and is measured', Boolean( circle ) && circle.contrast.usable >= 6 && circle.contrast.min !== null && ! circle.contrast.unmeasurable );
	const crowd = byLabel( stops, 'Crowded link' );
	const beside = byLabel( stops, 'Beside it' );
	check( 'sampling: a neighbour 4px away is not read as the ground, it is reported as an overlap',
		Boolean( crowd ) && crowd.contrast.planned > crowd.contrast.usable && crowd.contrast.neighbours.length > 0 && Boolean( beside ) );
	const stacked = byLabel( stops, 'Stacked one' );
	check( 'sampling: abutting buttons lose the sample points between them and report the neighbour',
		Boolean( stacked ) && stacked.contrast.neighbours.length > 0 && stacked.contrast.usable < stacked.contrast.planned );
	const sparse = { ...circle, contrast: { min: null, points: 0, planned: 8, usable: 3, neighbours: [], unmeasurable: '3 of 8 sample points usable (under 6)' } };
	check( 'sampling: an unmeasurable stop is neither a pass nor a fail, and is counted on its own',
		judgeStop( sparse, mode ).length === 0 && summarise( [ sparse ], mode ).unmeasurable === 1 && summarise( [ sparse ], mode ).minContrast === null );

	const grow = byLabel( stops, 'Growing link' );
	check( 'settle: a link that grows from 44px to 129px over 0.7s is measured at its final width', Boolean( grow ) && Math.abs( grow.rect.width - 129 ) < 1 );

	const pixels = ( list ) => list.map( ( s ) => [ s.label, s.contrast.min, s.contrast.points, s.contrast.planned, s.contrast.usable ] );
	check( 'determinism: the same fixture measured twice gives identical contrast readings', JSON.stringify( pixels( stops ) ) === JSON.stringify( pixels( again ) ) && stops.length === again.length && stops.length >= 9 );
	return failed;
}
