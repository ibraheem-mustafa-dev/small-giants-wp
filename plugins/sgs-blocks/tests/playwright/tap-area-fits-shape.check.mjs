// Computed-size check for ruling 11 (Bean, 2026-10-23): a block's own size setting overrules the 44px house tap floor,
// so the tap area fits the shape; with no size set the 44px floor stays. Detector: scripts/check-tap-floors.py.
//
// Real Chromium at 375 / 768 / 1440 against static fixtures that load each block's real style.css (no WordPress site,
// no credentials). Each case file in tests/playwright/tap-area-cases/ exports `CASES`: { name, styles: [block folder],
// html, sel, expect: { w, h }, sized }. The html carries the custom properties render.php prints for those settings
// (the PHP tests prove render.php prints them); `sized` marks a case whose size comes from a setting.
//
// Run:            node tests/playwright/tap-area-fits-shape.check.mjs
// Prove it fails: SGS_TAP_BASELINE=<commit before the fix> node tests/playwright/tap-area-fits-shape.check.mjs
//                 (loads each stylesheet as it was at that commit: every `sized` case must go red, and every
//                 unsized case must still read 44px, so the check is neither vacuous nor over-broad).
// Another tree:   SGS_TAP_ROOT=<worktree>/plugins/sgs-blocks reads that tree's stylesheets and cases, with Playwright
//                 loaded from this checkout (a worktree without node_modules).
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const pluginRoot = path.resolve( here, '..', '..' );
const require = createRequire( path.join( pluginRoot, 'package.json' ) );
const subjectRoot = process.env.SGS_TAP_ROOT ? path.resolve( process.env.SGS_TAP_ROOT ) : pluginRoot;
const { chromium } = require( 'playwright' );
const BASELINE = process.env.SGS_TAP_BASELINE || '';
const WIDTHS = [ 375, 768, 1440 ];
const TOLERANCE = 0.5;

function readCss( block ) {
	const rel = `src/blocks/${ block }/style.css`;
	if ( BASELINE ) {
		return execFileSync( 'git', [ 'show', `${ BASELINE }:plugins/sgs-blocks/${ rel }` ], { cwd: subjectRoot, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 } );
	}
	return readFileSync( path.join( subjectRoot, rel ), 'utf8' );
}

async function loadCases() {
	const dir = path.join( subjectRoot, 'tests', 'playwright', 'tap-area-cases' );
	const cases = [];
	for ( const file of readdirSync( dir ).filter( ( f ) => f.endsWith( '.mjs' ) ).sort() ) {
		const mod = await import( pathToFileURL( path.join( dir, file ) ).href );
		for ( const c of mod.CASES ) {
			cases.push( { ...c, file } );
		}
	}
	return cases;
}

const cases = await loadCases();
const browser = await chromium.launch();
let failures = 0;
let sizedRed = 0;
let sizedTotal = 0;
try {
	for ( const width of WIDTHS ) {
		const page = await browser.newPage( { viewport: { width, height: 900 } } );
		for ( const c of cases ) {
			await page.setContent( `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;font-size:16px">${ c.html }</body></html>` );
			for ( const block of c.styles ) {
				await page.addStyleTag( { content: readCss( block ) } );
			}
			const box = await page.evaluate( ( sel ) => {
				const el = document.querySelector( sel );
				if ( ! el ) {
					return null;
				}
				const r = el.getBoundingClientRect();
				return { w: r.width, h: r.height };
			}, c.sel );
			const ok = box && Math.abs( box.w - c.expect.w ) <= TOLERANCE && Math.abs( box.h - c.expect.h ) <= TOLERANCE;
			const read = box ? `${ box.w.toFixed( 1 ) } x ${ box.h.toFixed( 1 ) }` : 'not found';
			if ( c.sized ) {
				sizedTotal++;
			}
			if ( BASELINE && c.sized ) {
				// At the pre-fix commit a sized case must fail: the floor beat the setting there.
				sizedRed += ok ? 0 : 1;
				console.log( `${ ok ? 'NOT RED' : 'red ok ' } ${ width } ${ c.file } ${ c.name }: ${ read } (fixed: ${ c.expect.w } x ${ c.expect.h })` );
				failures += ok ? 1 : 0;
				continue;
			}
			console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ width } ${ c.file } ${ c.name }: ${ read } (want ${ c.expect.w } x ${ c.expect.h })` );
			failures += ok ? 0 : 1;
		}
		await page.close();
	}
} finally {
	await browser.close();
}
if ( BASELINE ) {
	console.log( `\nbaseline ${ BASELINE }: ${ sizedRed } of ${ sizedTotal } sized readings red; ${ failures } problem(s).` );
} else {
	console.log( `\ntap-area-fits-shape: ${ failures ? `FAIL (${ failures })` : 'OK' } over ${ cases.length } cases at ${ WIDTHS.join( ', ' ) }.` );
}
process.exit( failures ? 1 : 0 );
