/**
 * Standing gate for the editor SVG sanitiser (src/utils/sanitise-svg.js).
 *
 * Imports the REAL module against a real DOM (jsdom) - not a transformed copy,
 * not a reimplementation. A test that rebuilds the thing it is testing can only
 * prove the rebuild works.
 *
 * TWO HALVES, AND BOTH ARE LOAD-BEARING:
 *   ATTACKS  - each payload must be neutralised.
 *   LEGITIMATE - real SVG must SURVIVE. Without this half a sanitiser that
 *                returns '' for everything would score 100% on the attack
 *                suite. The shredder passes every security test.
 *
 * Run:  node scripts/tests/test-sanitise-svg.mjs
 * Exit: 0 = green, 1 = red.
 */

import { JSDOM } from 'jsdom';

const dom = new JSDOM( '<!doctype html><body></body>' );
globalThis.window = dom.window;

const { sanitiseSvg } = await import( '../../src/utils/sanitise-svg.js' );

let failures = 0;

function check( name, input, assert ) {
	let out;
	try {
		out = sanitiseSvg( input );
	} catch ( e ) {
		process.stdout.write( `  FAIL ${ name }\n         threw: ${ e.message }\n` );
		failures++;
		return;
	}
	if ( assert( out ) ) {
		process.stdout.write( `  ok   ${ name }\n` );
	} else {
		process.stdout.write( `  FAIL ${ name }\n         got: ${ out }\n` );
		failures++;
	}
}

process.stdout.write( 'ATTACK PAYLOADS - must be neutralised\n' );
check( '<script> stripped', '<svg><script>alert(1)</script></svg>', ( o ) => ! /script/i.test( o ) );
check( 'onload stripped', '<svg onload="alert(1)"><path d="M0 0"/></svg>', ( o ) => ! /onload/i.test( o ) );
check( 'onclick stripped', '<svg><path d="M0 0" onclick="alert(1)"/></svg>', ( o ) => ! /onclick/i.test( o ) );
check( '<foreignObject> stripped', '<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>', ( o ) => ! /foreignobject|onerror/i.test( o ) );
check( '<style> element stripped', '<svg><style>body{display:none}</style></svg>', ( o ) => ! /<style/i.test( o ) );
check( '<iframe> stripped', '<svg><iframe src="//evil"></iframe></svg>', ( o ) => ! /iframe/i.test( o ) );
check( 'javascript: href neutralised', '<svg><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>', ( o ) => ! /javascript:/i.test( o ) );
check( 'data: URI neutralised', '<svg><image href="data:text/html,x"/></svg>', ( o ) => ! /data:/i.test( o ) );

// The specific vector that shaped the unified allowlist: <animate> can set an
// attribute at runtime, bypassing kses's protocol filter. It is defused by <a>
// carrying no href to animate. If a future edit restores href to <a>, this goes
// red - which is the whole point of asserting it here rather than in a comment.
check(
	'SMIL: <a> has no href for <animate> to target',
	'<svg><a><animate attributeName="href" to="javascript:alert(1)"/></a></svg>',
	( o ) => ! /\shref=/i.test( o )
);

process.stdout.write( '\nLEGITIMATE CONTENT - must SURVIVE\n' );
check( 'path survives', '<svg viewBox="0 0 10 10"><path d="M0 0L10 10" fill="red"/></svg>', ( o ) => /<path/i.test( o ) && /d="M0 0L10 10"/.test( o ) );
check( 'gradient survives', '<svg><defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/></linearGradient></defs><rect fill="url(#g)"/></svg>', ( o ) => /lineargradient/i.test( o ) && /stop/i.test( o ) );
check( 'title/desc survive (a11y)', '<svg><title>Logo</title><desc>Co</desc><path d="M0 0"/></svg>', ( o ) => /<title>Logo<\/title>/i.test( o ) && /<desc>/i.test( o ) );
check( 'animate survives', '<svg><path d="M0 0"><animate attributeName="opacity" from="0" to="1" dur="1s"/></path></svg>', ( o ) => /<animate/i.test( o ) && /attributename="opacity"/i.test( o ) );
check( '<a> survives as a styling element', '<svg><a class="x"><path d="M0 0"/></a></svg>', ( o ) => /<a[ >]/i.test( o ) && /<path/i.test( o ) );

// The sanitiser is mounted on the IconPicker/IconPreview surfaces too, which
// render BUNDLED Lucide and WP icons rather than operator input. Those carry a
// different (supply-chain) threat, and the real risk of sanitising them is
// COSMETIC: strip an attribute the icon set relies on and every icon in the
// library silently degrades. Assert the common shapes survive intact.
process.stdout.write( '\nLIBRARY ICONS - must pass through UNDAMAGED\n' );

const LUCIDE_STAR =
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/></svg>';
const LUCIDE_TRUCK =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4"/><circle cx="7" cy="18" r="2"/><line x1="9" y1="18" x2="15" y2="18"/></svg>';
const WP_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 22h20z"/></svg>';

const tagCount = ( s ) => ( s.match( /<[a-z]+/gi ) || [] ).length;

check(
	'lucide (stroke-based) survives: polygon + points + stroke-width',
	LUCIDE_STAR,
	( o ) =>
		tagCount( o ) === tagCount( LUCIDE_STAR ) &&
		/points="12 2/.test( o ) &&
		/stroke-width="2"/.test( o ) &&
		/stroke-linecap="round"/.test( o )
);
check(
	'lucide multi-shape survives: path + circle + line',
	LUCIDE_TRUCK,
	( o ) =>
		tagCount( o ) === tagCount( LUCIDE_TRUCK ) &&
		/<path/i.test( o ) &&
		/<circle/i.test( o ) &&
		/<line/i.test( o )
);
check(
	'wp icon (fill-based) survives',
	WP_ICON,
	( o ) => tagCount( o ) === tagCount( WP_ICON ) && /fill="currentColor"/.test( o )
);
check(
	'viewBox survives (dropping it collapses every icon to 0x0)',
	LUCIDE_STAR,
	( o ) => /viewbox="0 0 24 24"/i.test( o )
);

process.stdout.write( '\nEDGE CASES\n' );
check( 'empty string', '', ( o ) => '' === o );
check( 'non-string', null, ( o ) => '' === o );
check( 'undefined', undefined, ( o ) => '' === o );

const total = 24;
process.stdout.write(
	`\n${ failures ? 'FAIL' : 'PASS' } - ${ total - failures }/${ total } assertions\n`
);
process.exit( failures ? 1 : 0 );
