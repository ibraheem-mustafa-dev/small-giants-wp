// Live proof of the per-property button easing (Spec 32 FR-32-19): a real pointer hovers each sgs/button and
// product-card CTA, then the running CSS transitions are read, each with its property, duration and easing.
// Run: node .claude/qa/control-gaps/easing/easing-probe.mjs <url>
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const repo = path.resolve( here, '..', '..', '..', '..' );
const { chromium } = await import( pathToFileURL( path.join( repo, 'scripts', 'computed-route', 'node_modules', 'playwright', 'index.mjs' ) ).href );
const SPRING = 'cubic-bezier(0.3, 1.6, 0.5, 1)';
const WANT = { transform: SPRING, 'box-shadow': 'ease', 'background-color': 'ease' };

let browser;
try {
	browser = await chromium.launch( { channel: 'chrome' } );
} catch {
	browser = await chromium.launch();
}
let ok = true;
for ( const width of [ 375, 768, 1440 ] ) {
	const page = await browser.newPage( { viewport: { width, height: 900 }, reducedMotion: 'no-preference' } );
	await page.goto( process.argv[ 2 ], { waitUntil: 'networkidle' } );
	const sel = 'main a.sgs-button, main .sgs-button a, .entry-content a.sgs-button';
	const count = await page.locator( sel ).count();
	for ( let i = 0; i < count; i++ ) {
		const el = page.locator( sel ).nth( i );
		await el.scrollIntoViewIfNeeded();
		await page.mouse.move( 1, 1 );
		await page.waitForTimeout( 400 );
		const box = await el.boundingBox();
		await page.mouse.move( box.x + box.width / 2, box.y + box.height / 2, { steps: 4 } );
		await page.waitForTimeout( 40 );
		const r = await el.evaluate( ( node ) => ( {
			cls: node.className,
			running: node.getAnimations().filter( ( a ) => a.transitionProperty ).map( ( a ) => ( { prop: a.transitionProperty, easing: a.effect.getTiming().easing, ms: a.effect.getTiming().duration } ) ),
		} ) );
		const by = Object.fromEntries( r.running.map( ( a ) => [ a.prop, a ] ) );
		const faults = Object.entries( WANT ).filter( ( [ p, e ] ) => by[ p ] && by[ p ].easing !== e ).map( ( [ p ] ) => `${ p }=${ by[ p ].easing }` );
		const seen = Object.keys( WANT ).filter( ( p ) => by[ p ] );
		if ( faults.length || ! seen.includes( 'transform' ) ) {
			ok = false;
		}
		console.log( `${ width }px ${ r.cls.split( ' ' ).filter( ( c ) => /sgs-button--|cta--|__view|__cta/.test( c ) ).join( ' ' ) }: ${ r.running.map( ( a ) => `${ a.prop} ${ a.ms }ms ${ a.easing }` ).join( ' | ' ) }${ faults.length ? '  FAULT ' + faults.join( ', ' ) : '' }` );
	}
	await page.close();
}
await browser.close();
console.log( ok ? 'PASS: the move eases on the spring and the shadow and background on ease, under a real pointer' : 'FAIL' );
process.exit( ok ? 0 : 1 );
