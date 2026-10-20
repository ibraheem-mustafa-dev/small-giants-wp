// Live proof: the sparkle icon's Additional CSS animation on a built page against the draft's own WAAPI call (record
// A-02), both paused at the same frames in the same page. Run: node .claude/qa/control-gaps/sparkle/live-twinkle.mjs <url>
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const repo = path.resolve( here, '..', '..', '..', '..' );
const { chromium } = await import( pathToFileURL( path.join( repo, 'scripts', 'computed-route', 'node_modules', 'playwright', 'index.mjs' ) ).href );
const record = JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'mamas-munches-redesign', 'handoff', 'animations.json' ), 'utf8' ) ).records.find( ( r ) => 'A-02' === r.id );
const url = process.argv[ 2 ];
const frames = [ 0, 300, 600, 900, 1200, 1500, 1800, 2100 ];

let browser;
try {
	browser = await chromium.launch( { channel: 'chrome' } );
} catch {
	browser = await chromium.launch();
}
const out = {};
for ( const width of [ 375, 768, 1440 ] ) {
	const page = await browser.newPage( { viewport: { width, height: 900 }, reducedMotion: 'no-preference' } );
	await page.goto( url, { waitUntil: 'networkidle' } );
	out[ width ] = await page.evaluate( ( { frames, rec } ) => {
		const live = document.getAnimations().find( ( a ) => a.animationName && a.effect?.target?.closest?.( '.wp-block-sgs-icon, .sgs-icon' ) );
		if ( ! live ) {
			return { error: 'no CSS animation on an sgs/icon', names: document.getAnimations().map( ( a ) => a.animationName || 'waapi' ) };
		}
		const ref = document.createElement( 'div' );
		ref.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:20px';
		document.body.append( ref );
		ref.animate( rec.properties[ 0 ].keyframes, { duration: rec.duration_ms, easing: rec.easing, iterations: Infinity } );
		const read = ( el ) => {
			const m = new DOMMatrix( getComputedStyle( el ).transform );
			return { scale: Math.hypot( m.a, m.b ), deg: Math.atan2( m.b, m.a ) * 180 / Math.PI };
		};
		const anims = document.getAnimations().filter( ( a ) => a === live || a.effect?.target === ref );
		const rows = frames.map( ( t ) => {
			anims.forEach( ( a ) => {
				a.pause();
				a.currentTime = t;
			} );
			return { t, live: read( live.effect.target ), draft: read( ref ) };
		} );
		return { name: live.animationName, timing: getComputedStyle( live.effect.target ).animationTimingFunction, rows };
	}, { frames, rec: record } );
	await page.close();
}
await browser.close();

const dAng = ( a, b ) => Math.abs( ( ( ( a - b ) % 360 ) + 540 ) % 360 - 180 );
let ok = true;
for ( const [ width, r ] of Object.entries( out ) ) {
	if ( r.error ) {
		console.log( width, r.error, r.names );
		ok = false;
		continue;
	}
	let worst = { deg: 0, scale: 0 };
	r.rows.forEach( ( row ) => {
		worst = { deg: Math.max( worst.deg, dAng( row.live.deg, row.draft.deg ) ), scale: Math.max( worst.scale, Math.abs( row.live.scale - row.draft.scale ) ) };
	} );
	console.log( `${ width }px ${ r.name } (${ r.timing }): worst ${ worst.deg.toFixed( 2 ) }deg, ${ worst.scale.toFixed( 4 ) } scale | ` + r.rows.map( ( row ) => `${ row.t }:${ row.live.deg.toFixed( 1 ) }/${ row.draft.deg.toFixed( 1 ) }` ).join( ' ' ) );
	ok = ok && worst.deg < 1 && worst.scale < 0.005;
}
console.log( ok ? 'PASS: the live sparkle is within 1 degree and 0.005 scale of the draft at every frame and width' : 'FAIL' );
process.exit( ok ? 0 : 1 );
