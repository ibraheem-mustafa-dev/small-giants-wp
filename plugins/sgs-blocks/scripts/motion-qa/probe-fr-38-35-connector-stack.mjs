/**
 * Verify the shipped glow + fill + head stack against the REAL compiled
 * stylesheet and the REAL markup render.php now emits.
 *
 * Asserts PAINTED PIXELS, not computed style — the whole lesson of this build.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import { PNG } from 'pngjs';

const css = fs.readFileSync( 'build/blocks/timeline/style-index.css', 'utf8' );

const markup = ( orientation, align ) => `
<ol class="sgs-timeline sgs-tl-local sgs-timeline--${ orientation } ${
	orientation === 'vertical' ? `sgs-timeline--align-${ align }` : ''
} sgs-timeline--connector-line sgs-timeline--connector-progress wp-block-sgs-timeline">
<li class="sgs-timeline__entry">one</li><li class="sgs-timeline__entry">two</li>
<li class="sgs-timeline__entry">three</li><li class="sgs-timeline__entry">four</li>
<li class="sgs-timeline__progress" aria-hidden="true">
<span class="sgs-timeline__progress-glow"></span>
<span class="sgs-timeline__progress-fill"></span>
</li></ol>`;

const page = ( orientation, align ) => `<!doctype html><meta charset=utf-8><style>
body{margin:0;background:#fff}
.sgs-timeline{position:relative;--wp--preset--color--border-subtle:#0d5557;--wp--preset--color--accent:#f5d050;
 --sgs-connector-colour:#0d5557;--sgs-timeline-fill-colour:#f5d050;--sgs-connector-width:2px;--sgs-node-size:16px;
 width:${ orientation === 'vertical' ? '400px' : '600px' };height:${
	orientation === 'vertical' ? '520px' : '160px'
};margin:0;padding:0;list-style:none}
.sgs-timeline__entry{list-style:none;${
	orientation === 'vertical' ? 'height:130px' : 'width:150px;display:inline-block'
}}
</style><style>${ css }</style>${ markup( orientation, align ) }`;

const b = await chromium.launch();

async function measure( orientation, align, v ) {
	const p = await b.newPage( { viewport: { width: 1100, height: 640 } } );
	await p.setContent( page( orientation, align ), { waitUntil: 'load' } );
	await p.addStyleTag( {
		content: `.sgs-timeline--connector-progress{animation:none !important}
		.sgs-tl-local{--sgs-timeline-fill-progress:${ v } !important}`,
	} );
	await p.waitForTimeout( 130 );
	const geo = await p.evaluate( () => {
		const el = document.querySelector( '.sgs-timeline__progress' );
		const r = el.getBoundingClientRect();
		const head = getComputedStyle( el, '::after' );
		return {
			l: Math.round( r.left ), t: Math.round( r.top ),
			w: Math.round( r.width ), h: Math.round( r.height ),
			headW: head.width, headH: head.height,
		};
	} );
	const buf = await p.screenshot();
	await p.close();
	const img = PNG.sync.read( buf );

	const horiz = orientation === 'horizontal';
	const len = horiz ? geo.w : geo.h;
	const cross = horiz
		? geo.t + Math.round( geo.h / 2 )
		: geo.l + Math.round( geo.w / 2 );

	// accent-coloured pixels only, so the dark base track is not counted
	let painted = 0, last = -1;
	for ( let i = 0; i < len; i++ ) {
		const x = horiz ? geo.l + i : cross;
		const y = horiz ? cross : geo.t + i;
		const o = ( img.width * y + x ) << 2;
		const [ r, g, bl ] = [ img.data[ o ], img.data[ o + 1 ], img.data[ o + 2 ] ];
		if ( r > 190 && g > 140 && bl < 190 ) { painted++; last = i; }
	}
	return {
		pct: Math.round( ( painted / len ) * 100 ),
		expected: Math.round( parseFloat( v ) * 100 ),
		lastLit: last,
		len,
		headSize: `${ geo.headW }x${ geo.headH }`,
		box: `${ geo.w }x${ geo.h }`,
	};
}

let fails = 0;
for ( const [ o, a ] of [
	[ 'vertical', 'alternating' ],
	[ 'vertical', 'left' ],
	[ 'horizontal', '' ],
] ) {
	console.log( `--- ${ o }${ a ? ' / ' + a : '' } ---` );
	for ( const v of [ '0', '0.25', '0.5', '0.75', '1' ] ) {
		const r = await measure( o, a, v );
		const drift = Math.abs( r.pct - r.expected );
		const ok = drift <= 8;
		if ( ! ok ) fails++;
		console.log(
			`  p=${ v.padEnd( 4 ) } filled ${ String( r.pct ).padStart( 3 ) }% (want ~${ String(
				r.expected
			).padStart( 3 ) }%)  box=${ r.box }  head=${ r.headSize }  ${ ok ? 'ok' : 'DRIFT' }`
		);
	}
}
await b.close();
console.log( fails === 0 ? '\nRESULT: PASS' : `\nRESULT: FAIL (${ fails } drifting)` );
process.exit( fails ? 1 : 0 );
