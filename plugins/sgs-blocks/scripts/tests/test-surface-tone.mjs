#!/usr/bin/env node
/**
 * The JS surface-tone resolver against the SAME cases as the PHP standalone
 * (tests/php/run-surface-tone-standalone.php) — case for case, so the two
 * cannot silently drift (D6, `.claude/reports/2026-09-23-shadow-tone-design.md`).
 *
 *   node scripts/tests/test-surface-tone.mjs
 */
import { surfaceTone, surfaceToneClass, gradientTone, whiteWinsForLuminance, relativeLuminance } from '../../src/utils/surface-tone.js';

// Same small palette + one preset gradient as the PHP test's stubbed
// wp_get_global_settings(), reshaped to the flat `{ slug, color }` /
// `{ slug, gradient } ` array useSettings() returns.
const palette = [ { slug: 'primary', color: '#075E80' } ];
const gradients = [ { slug: 'brand-fade', gradient: 'linear-gradient(90deg, #075E80 0%, #0F4C4C 100%)' } ];

let fail = 0;
let total = 0;

function eq( expected, actual, label ) {
	total++;
	if ( expected !== actual ) {
		fail++;
		console.error( `FAIL ${ label }\n  expected: ${ JSON.stringify( expected ) }\n  actual:   ${ JSON.stringify( actual ) }` );
	}
}

// ---------------------------------------------------------------------------
// Every P1 colour from the design note is dark; the light controls are light.
// ---------------------------------------------------------------------------
const p1DarkColours = [ '#075E80', '#2d6e5e', '#256050', '#1A5F6B', '#0F4C4C' ];
for ( const hex of p1DarkColours ) {
	eq( 'dark', surfaceTone( [ { colour: hex, opacity: 1.0 } ], palette, gradients ), `P1 colour ${ hex } is dark` );
}
for ( const hex of [ '#777777', '#FFFFFF', '#F3F0E8' ] ) {
	eq( 'light', surfaceTone( [ { colour: hex, opacity: 1.0 } ], palette, gradients ), `${ hex } is light` );
}
eq( 'dark', surfaceTone( [ { colour: '#121212', opacity: 1.0 } ], palette, gradients ), '#121212 is dark' );

// ---------------------------------------------------------------------------
// Accumulated opacity: rgba(0,0,0,.9) only decides once it reaches 0.5.
// ---------------------------------------------------------------------------
eq(
	'dark',
	surfaceTone( [ { colour: 'rgba(0,0,0,.9)', opacity: 1.0 } ], palette, gradients ),
	'rgba(0,0,0,.9) at full layer opacity (effective 0.9) reaches 0.5: dark'
);
eq(
	'',
	surfaceTone( [ { colour: 'rgba(0,0,0,.9)', opacity: 0.3 } ], palette, gradients ),
	'rgba(0,0,0,.9) at layer opacity 0.3 (effective 0.27) never reaches 0.5: unknown'
);

// ---------------------------------------------------------------------------
// Gradients.
// ---------------------------------------------------------------------------
eq(
	'light',
	surfaceTone( [ { gradient: 'linear-gradient(#000 10%, #fff 90%)', opacity: 1.0 } ], palette, gradients ),
	'linear-gradient(#000 10%, #fff 90%) is light'
);
eq(
	'dark',
	surfaceTone( [ { gradient: 'linear-gradient(#075E80, #0F4C4C)', opacity: 1.0 } ], palette, gradients ),
	'linear-gradient(#075E80, #0F4C4C) is dark'
);
eq(
	'',
	surfaceTone( [ { gradient: 'linear-gradient(#000, notacolour, #fff)', opacity: 1.0 } ], palette, gradients ),
	"an unresolvable gradient stop gives ''"
);
eq(
	'dark',
	surfaceTone( [ { gradient: 'var(--wp--preset--gradient--brand-fade)', opacity: 1.0 } ], palette, gradients ),
	'a preset gradient var() resolves and judges dark'
);
// A preset gradient with the DEFAULT (empty) gradients array yields unknown —
// stated in background-preview.js's own comment on its optional 3rd argument.
eq(
	'',
	surfaceTone( [ { gradient: 'var(--wp--preset--gradient--brand-fade)', opacity: 1.0 } ], palette ),
	'a preset gradient var() with no gradients list given resolves to unknown'
);

// ---------------------------------------------------------------------------
// Images.
// ---------------------------------------------------------------------------
eq( '', surfaceTone( [ { image: true } ], palette, gradients ), "image with no overlay gives ''" );
eq(
	'dark',
	surfaceTone( [ { colour: '#000', opacity: 0.6 }, { image: true } ], palette, gradients ),
	'image with a #000 overlay at 0.6 gives dark'
);

// ---------------------------------------------------------------------------
// Walking past an indecisive overlay to the colour underneath.
// ---------------------------------------------------------------------------
eq(
	'dark',
	surfaceTone( [ { colour: '#000', opacity: 0.3 }, { colour: '#075E80', opacity: 1.0 } ], palette, gradients ),
	'overlay at 0.3 over a dark colour, no image: walks down to the colour (dark)'
);

// ---------------------------------------------------------------------------
// transparent / empty / nothing decides.
// ---------------------------------------------------------------------------
eq( '', surfaceTone( [ { colour: 'transparent', opacity: 1.0 } ], palette, gradients ), "transparent gives ''" );
eq(
	'dark',
	surfaceTone( [ { colour: 'transparent', opacity: 1.0 }, { colour: '#075E80', opacity: 1.0 } ], palette, gradients ),
	'a transparent layer is skipped (contributes 0), the colour below still decides'
);
eq( '', surfaceTone( [ { colour: '#000', opacity: 0.2 } ], palette, gradients ), "nothing reaches 0.5: ''" );
eq( '', surfaceTone( [], palette, gradients ), "empty layers: ''" );

// ---------------------------------------------------------------------------
// Hostile strings give '' without throwing.
// ---------------------------------------------------------------------------
let threw = false;
let hostileColour;
let hostileGradient;
let hostileLong;
try {
	hostileColour = surfaceTone( [ { colour: 'red;}body{', opacity: 1.0 } ], palette, gradients );
	hostileGradient = surfaceTone( [ { gradient: 'url(x)', opacity: 1.0 } ], palette, gradients );
	hostileLong = surfaceTone( [ { colour: 'x'.repeat( 20000 ), opacity: 1.0 } ], palette, gradients );
} catch ( e ) {
	threw = true;
}
eq( '', hostileColour, "hostile string 'red;}body{' gives ''" );
eq( '', hostileGradient, "hostile string 'url(x)' gives ''" );
eq( '', hostileLong, 'a very long hostile input gives \'\'' );
eq( false, threw, 'hostile input throws nothing' );

// ---------------------------------------------------------------------------
// surfaceToneClass().
// ---------------------------------------------------------------------------
eq(
	'sgs-on-dark',
	surfaceToneClass( [ { colour: '#075E80', opacity: 1.0 } ], palette, gradients ),
	'dark surface gets sgs-on-dark'
);
eq(
	'sgs-on-light',
	surfaceToneClass( [ { colour: '#FFFFFF', opacity: 1.0 } ], palette, gradients ),
	'light surface gets sgs-on-light'
);
eq( '', surfaceToneClass( [], palette, gradients ), 'no layers gets no class' );

// ---------------------------------------------------------------------------
// Negative control 1: the gradient weighting matters — mirrors the PHP
// standalone's own negative control 1 exactly (see that file's comment for the
// full worked-out maths).
// ---------------------------------------------------------------------------
const weightingGradient = 'linear-gradient(#fff 0%, #000 3%, #000 100%)';
eq( 'dark', gradientTone( weightingGradient, palette, gradients ), 'a tiny white sliver on a mostly-black line is dark (weighted)' );

const plainMean = ( 1.0 + 0.0 + 0.0 ) / 3; // white, black, black — unweighted.
const plainMeanTone = whiteWinsForLuminance( plainMean ) ? 'dark' : 'light';
eq( 'light', plainMeanTone, 'negative control: a plain unweighted mean of the same 3 stops misjudges this gradient as light' );

// ---------------------------------------------------------------------------
// Negative control 2: the white-wins rule is live, not a stand-in for the old
// fixed luminance cut — mirrors the PHP standalone's own negative control 2.
// ---------------------------------------------------------------------------
const l075e80 = relativeLuminance( '#075E80' );
const naiveCutoffTone = l075e80 < 0.05 ? 'dark' : 'light';
eq( 'light', naiveCutoffTone, 'negative control: a copy using l < 0.05 misjudges #075E80 as light' );
eq( 'dark', surfaceTone( [ { colour: '#075E80', opacity: 1.0 } ], palette, gradients ), 'the live white-wins rule correctly judges #075E80 dark' );

console.log( fail > 0 ? `FAILED: ${ fail } of ${ total }` : `OK: ${ total } assertions passed` );
process.exit( fail > 0 ? 1 : 0 );
