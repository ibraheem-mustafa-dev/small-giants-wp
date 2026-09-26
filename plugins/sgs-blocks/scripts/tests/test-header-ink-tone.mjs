#!/usr/bin/env node
/**
 * Section-adaptive header ink — the tone-decision logic (Wave 3C U-13, §4.2).
 * Every case pairs a positive assertion with a negative control, following
 * the house convention (test-surface-tone.mjs).
 *
 *   node scripts/tests/test-header-ink-tone.mjs
 */
import {
	relativeLuminance,
	whiteWinsForLuminance,
	parseComputedColour,
	classifyComputedColour,
	classifyStackElement,
	decideSectionTone,
} from '../../src/header-behaviours/header-ink-tone.js';

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
// Luminance / white-wins — must agree with the PHP twin
// (sgs_wcag_relative_luminance()/sgs_wcag_white_wins_for_luminance()) on the
// same reference colours.
// ---------------------------------------------------------------------------
eq( true, whiteWinsForLuminance( relativeLuminance( 0, 0, 0 ) ), 'black background: white ink wins' );
eq( false, whiteWinsForLuminance( relativeLuminance( 255, 255, 255 ) ), 'white background: black ink wins' );
// NEGATIVE CONTROL: swapping the channels the other way round must flip the
// decision — proves the function reads the actual channels, not a constant.
eq( true, whiteWinsForLuminance( relativeLuminance( 20, 20, 20 ) ), 'near-black background: white ink wins' );
eq( false, whiteWinsForLuminance( relativeLuminance( 240, 240, 240 ) ), 'NEGATIVE CONTROL: near-white background: black ink wins (not white)' );

// ---------------------------------------------------------------------------
// parseComputedColour / classifyComputedColour.
// ---------------------------------------------------------------------------
eq( null, parseComputedColour( 'transparent' ), '"transparent" does not parse as a colour' );
eq( null, parseComputedColour( '' ), 'empty string does not parse' );
const parsedBlack = parseComputedColour( 'rgb(0, 0, 0)' );
eq( 0, parsedBlack.r, 'rgb(0,0,0) parses r=0' );
eq( 1, parsedBlack.a, 'rgb() with no alpha defaults to fully opaque' );
const parsedTranslucent = parseComputedColour( 'rgba(0, 0, 0, 0.3)' );
eq( 0.3, parsedTranslucent.a, 'rgba() alpha is read correctly' );

eq( 'dark', classifyComputedColour( 'rgb(10, 10, 10)' ), 'a near-black opaque colour classifies dark' );
eq( 'light', classifyComputedColour( 'rgb(245, 245, 245)' ), 'a near-white opaque colour classifies light' );
eq( null, classifyComputedColour( 'rgba(10, 10, 10, 0.3)' ), 'a colour under the alpha threshold is inconclusive (null), not dark' );
// NEGATIVE CONTROL: the SAME colour at full alpha DOES classify — proves the
// null above is caused by the alpha check, not by some unrelated failure.
eq( 'dark', classifyComputedColour( 'rgba(10, 10, 10, 1)' ), 'NEGATIVE CONTROL: the same colour at alpha 1 does classify dark' );

// ---------------------------------------------------------------------------
// classifyStackElement — the three-step decision (tone class -> media stop ->
// opaque background-colour).
// ---------------------------------------------------------------------------
eq(
	'dark',
	classifyStackElement( { tagName: 'DIV', hasToneClassDark: true, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: '' } ),
	'sgs-on-dark class wins regardless of anything else'
);
eq(
	'unknown',
	classifyStackElement( { tagName: 'IMG', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: '' } ),
	'an <img> with no tone class is unknown (never look through a picture)'
);
eq(
	'unknown',
	classifyStackElement( { tagName: 'DIV', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: true, backgroundColor: '' } ),
	'a computed background-image with no tone class is unknown'
);
eq(
	'dark',
	classifyStackElement( { tagName: 'DIV', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: 'rgb(10,10,10)' } ),
	'an opaque dark background-colour with no tone class classifies dark'
);
eq(
	null,
	classifyStackElement( { tagName: 'DIV', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: 'transparent' } ),
	'a fully transparent element is inconclusive — keep looking'
);
// NEGATIVE CONTROL: an <img> that DOES carry a tone class (an operator-set
// override) is NOT forced to 'unknown' — the tone class must win BEFORE the
// media check, proving step order is tone-class-first, not media-first.
eq(
	'light',
	classifyStackElement( { tagName: 'IMG', hasToneClassDark: false, hasToneClassLight: true, hasBackgroundImage: false, backgroundColor: '' } ),
	'NEGATIVE CONTROL: a tone class on an <img> still wins over the media stop'
);

// ---------------------------------------------------------------------------
// decideSectionTone — walks the stack top-down, first decision wins.
// ---------------------------------------------------------------------------
const stackDarkUnderTransparent = [
	{ tagName: 'DIV', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: 'transparent' },
	{ tagName: 'DIV', hasToneClassDark: true, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: '' },
];
eq( 'dark', decideSectionTone( stackDarkUnderTransparent ), 'an inconclusive top element is skipped in favour of the decisive one beneath it' );

const stackStopsAtImage = [
	{ tagName: 'DIV', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: 'transparent' },
	{ tagName: 'IMG', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: '' },
	// This element would decide 'dark', but the walk must STOP at the <img>
	// above it and never reach here.
	{ tagName: 'DIV', hasToneClassDark: true, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: '' },
];
eq( 'unknown', decideSectionTone( stackStopsAtImage ), 'the walk stops at the first media element — never looks through a picture' );

eq( null, decideSectionTone( [] ), 'an empty stack (everything excluded) decides nothing' );
eq(
	null,
	decideSectionTone( [ { tagName: 'DIV', hasToneClassDark: false, hasToneClassLight: false, hasBackgroundImage: false, backgroundColor: 'transparent' } ] ),
	'a stack where nothing decides returns null (the header keeps its own ink)'
);
// NEGATIVE CONTROL: the SAME stack with the transparent element swapped for a
// decisive one DOES return a decision — proves the null above is genuinely
// caused by "nothing decides", not a bug that always returns null.
eq(
	'light',
	decideSectionTone( [ { tagName: 'DIV', hasToneClassDark: false, hasToneClassLight: true, hasBackgroundImage: false, backgroundColor: '' } ] ),
	'NEGATIVE CONTROL: a decisive single-element stack does return a decision'
);

console.log( `${ total - fail }/${ total } passed` );
if ( fail ) {
	console.error( `${ fail } FAILED` );
	process.exit( 1 );
}
