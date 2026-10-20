// Scratch proof: the draft's WAAPI sparkle twinkle (Home.dc.html motion(), record A-02) against the Additional CSS box
// content the computed route writes (scripts/computed-route/lib/motion-loop-css.mjs) and against the OLD hand-written
// CSS. Both animations are paused at the same frames and their computed transform matrices compared.
// Run: node .claude/qa/control-gaps/sparkle/compare-twinkle.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname( fileURLToPath( import.meta.url ) );
const repo = path.resolve( here, '..', '..', '..', '..' );
const route = path.join( repo, 'scripts', 'computed-route' );
const { chromium } = await import( pathToFileURL( path.join( route, 'node_modules', 'playwright', 'index.mjs' ) ).href );
const { loopKeyframesCss, loopName } = await import( pathToFileURL( path.join( route, 'lib', 'motion-loop-css.mjs' ) ).href );

const record = JSON.parse( fs.readFileSync( path.join( repo, 'sites', 'mamas-munches-redesign', 'handoff', 'animations.json' ), 'utf8' ) ).records.find( ( r ) => 'A-02' === r.id );
const NEW = loopKeyframesCss( record, loopName( record ) );
const OLD = '@media (prefers-reduced-motion: no-preference){ & { animation: sgs-twinkle 2.4s ease-in-out infinite; } } @keyframes sgs-twinkle { 0%{transform:scale(1) rotate(0)} 50%{transform:scale(1.35) rotate(90deg)} 100%{transform:scale(1) rotate(180deg)} }';
// The box's `&` is the element itself; the media gate is kept.
const asPage = ( css, sel ) => css.replace( '& {', `${ sel } {` );

const page_html = `<!doctype html><meta charset="utf-8"><style>
.box{width:40px;height:40px;margin:30px;display:inline-block;background:#F9CF6E}
${ asPage( NEW.css, '#css' ) }
${ asPage( OLD, '#old' ) }
</style><div class="box" id="waapi"></div><div class="box" id="css"></div><div class="box" id="old"></div>`;

const frames = [ 0, 300, 600, 900, 1200, 1500, 1800, 2100 ];
let browser;
try {
	browser = await chromium.launch( { channel: 'chrome' } );
} catch {
	browser = await chromium.launch();
}
const page = await browser.newPage( { reducedMotion: 'no-preference' } );
await page.setContent( page_html );
const rows = await page.evaluate( ( { frames, rec } ) => {
	document.getElementById( 'waapi' ).animate( rec.properties[ 0 ].keyframes, { duration: rec.duration_ms, easing: rec.easing, iterations: Infinity } );
	const matrix = ( id ) => { const m = new DOMMatrix( getComputedStyle( document.getElementById( id ) ).transform ); return { scale: Math.hypot( m.a, m.b ), deg: Math.atan2( m.b, m.a ) * 180 / Math.PI }; };
	const anims = document.getAnimations();
	const out = [];
	for ( const t of frames ) {
		anims.forEach( ( a ) => { a.pause(); a.currentTime = t; } );
		out.push( { t, waapi: matrix( 'waapi' ), css: matrix( 'css' ), old: matrix( 'old' ), count: anims.length } );
	}
	return out;
}, { frames, rec: record } );
await browser.close();

// Angles compared modulo 360.
const dAng = ( a, b ) => Math.abs( ( ( ( a - b ) % 360 ) + 540 ) % 360 - 180 );
let worst = { cssDeg: 0, cssScale: 0, oldDeg: 0, oldScale: 0 };
console.log( 'animations on page:', rows[ 0 ].count, '| new stops:', NEW.stops, '| generator error:', JSON.stringify( NEW.error ) );
console.log( 't(ms) | WAAPI scale/deg | NEW css scale/deg (err) | OLD css scale/deg (err)' );
for ( const r of rows ) {
	const e = { cd: dAng( r.css.deg, r.waapi.deg ), cs: Math.abs( r.css.scale - r.waapi.scale ), od: dAng( r.old.deg, r.waapi.deg ), os: Math.abs( r.old.scale - r.waapi.scale ) };
	worst = { cssDeg: Math.max( worst.cssDeg, e.cd ), cssScale: Math.max( worst.cssScale, e.cs ), oldDeg: Math.max( worst.oldDeg, e.od ), oldScale: Math.max( worst.oldScale, e.os ) };
	const f = ( m ) => `${ m.scale.toFixed( 4 ) } / ${ m.deg.toFixed( 2 ) }`;
	console.log( `${ String( r.t ).padStart( 5 ) } | ${ f( r.waapi ) } | ${ f( r.css ) } (${ e.cd.toFixed( 2 ) }deg, ${ e.cs.toFixed( 4 ) }) | ${ f( r.old ) } (${ e.od.toFixed( 2 ) }deg, ${ e.os.toFixed( 4 ) })` );
}
console.log( 'worst:', JSON.stringify( worst ) );
const ok = worst.cssDeg < 1 && worst.cssScale < 0.005;
console.log( ok ? 'PASS: new CSS within 1 degree and 0.005 scale at every frame' : 'FAIL' );
process.exit( ok ? 0 : 1 );
