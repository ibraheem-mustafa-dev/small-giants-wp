#!/usr/bin/env node
/**
 * sgs/responsive-logo — "the logo responds to its ground" (U-13 §4.5).
 *
 * Covers the style.scss side only (the render.php side — the two marker
 * classes and the colourTreatment allow-list — is covered separately by
 * tests/php/ResponsiveLogoGroundResponseTest.php). Compiles the real
 * style.scss with the `sass` package (already a project devDependency; no
 * build step is run) and asserts, for each precedence case named in
 * `.claude/reports/2026-09-26-u13-header-ink-design.md` §4.5, that the
 * expected selector actually exists in the compiled CSS:
 *
 *   1. dark ground (nearest static section tone `.sgs-on-dark`)
 *   2. light ground inside site dark mode (`.sgs-on-light` resets it)
 *   3. live header state (`.sgs-site-header.is-header-on-dark`/`-on-light`)
 *   4. a nearer `.sgs-on-light` inside a `.sgs-on-dark` (one level of
 *      nesting, explicit)
 *   5. the 'auto' colour treatment's white filter, gated the same way and
 *      excluding the dedicated dark-logo image
 *
 * It also proves, structurally, that live header state outranks a static
 * ground signal at a genuine specificity tie: the header selector for a
 * case must appear AFTER the nested-ground selector for the same tone in
 * the compiled source, which is how the cascade's tie-break resolves in
 * the header's favour (see style.scss's own comment on this).
 *
 * NEGATIVE CONTROL (⛔ must go red on old code): the real style.scss is
 * compiled once with the whole "Ground response" + "Automatic colour
 * treatment" section string-removed (a `.sgs-responsive-logo` rule with an
 * empty inside is still valid SCSS, so this compiles cleanly) to stand in
 * for the file BEFORE this feature existed. Every positive assertion above
 * is re-run against that stripped output and must find NOTHING — proving
 * the checks actually discriminate the new code from its absence, not just
 * pattern-match something already in the file for an unrelated reason.
 *
 * Run:  node scripts/tests/test-responsive-logo-ground-response.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as sass from 'sass';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PLUGIN_DIR = path.resolve( HERE, '..', '..' );
const SCSS_PATH = path.join( PLUGIN_DIR, 'src', 'blocks', 'responsive-logo', 'style.scss' );

let fail = 0;
let total = 0;

/**
 * Assert `pattern` (a RegExp) matches (or, when `expectMatch` is false, does
 * NOT match) somewhere in `css`.
 *
 * @param {string}  label       Human-readable assertion name.
 * @param {string}  css         Compiled CSS to search.
 * @param {RegExp}  pattern     Pattern to test for.
 * @param {boolean} expectMatch Whether the pattern is expected to be present.
 */
function assertMatch( label, css, pattern, expectMatch = true ) {
	total++;
	const found = pattern.test( css );
	const ok = found === expectMatch;
	if ( ! ok ) {
		fail++;
		console.error(
			`FAIL ${ label }\n  expected pattern ${ expectMatch ? 'to match' : 'NOT to match' }: ${ pattern }`
		);
	} else {
		console.log( `  ok   ${ label }` );
	}
}

/**
 * Assert `beforePattern`'s LAST match occurs earlier in `css` than
 * `afterPattern`'s LAST match — i.e. `afterPattern` is declared later in
 * the source, which is how a specificity TIE between the two resolves
 * (later wins).
 *
 * @param {string} label         Human-readable assertion name.
 * @param {string} css           Compiled CSS to search.
 * @param {RegExp} beforePattern Pattern expected to appear first.
 * @param {RegExp} afterPattern  Pattern expected to appear after it.
 */
function assertDeclaredAfter( label, css, beforePattern, afterPattern ) {
	total++;
	const beforeMatches = [ ...css.matchAll( new RegExp( beforePattern, 'g' ) ) ];
	const afterMatches = [ ...css.matchAll( new RegExp( afterPattern, 'g' ) ) ];
	const beforeIndex = beforeMatches.length ? beforeMatches[ beforeMatches.length - 1 ].index : -1;
	const afterIndex = afterMatches.length ? afterMatches[ afterMatches.length - 1 ].index : -1;
	const ok = beforeIndex !== -1 && afterIndex !== -1 && beforeIndex < afterIndex;
	if ( ! ok ) {
		fail++;
		console.error(
			`FAIL ${ label }\n  before-pattern index: ${ beforeIndex }, after-pattern index: ${ afterIndex } (expected before < after)`
		);
	} else {
		console.log( `  ok   ${ label }` );
	}
}

// ── Compile the real file ────────────────────────────────────────────────────

const realSource = fs.readFileSync( SCSS_PATH, 'utf8' );
const realCss = sass.compileString( realSource ).css;

console.log( 'Ground response cases against the REAL style.scss:' );

// 1. Dark ground (nearest static section tone) swaps to the dark logo.
assertMatch(
	'static dark ground shows the dark-logo variant',
	realCss,
	/\.sgs-on-dark\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo\s+\.sgs-responsive-logo__dark\s*\{\s*display:\s*block/
);

// 2. Light ground resets to the normal logo, even under site dark mode
//    (the design's own explicit case: ".sgs-on-light ... the normal logo
//    shows, even in dark mode" — proved by the selector existing at all,
//    since site dark mode's own selector carries LOWER specificity via
//    :where(), so a plain `.sgs-on-light` rule already outranks it).
assertMatch(
	'static light ground resets to the normal logo',
	realCss,
	/\.sgs-on-light\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo\s+\.sgs-responsive-logo__dark\s*\{\s*display:\s*none/
);
assertMatch(
	'site dark mode\'s own selector specificity is neutralised by :where()',
	realCss,
	/:where\(:root\[data-theme=dark\]\)\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo/
);

// 3. Live header state — both directions.
assertMatch(
	'live header on-dark state shows the dark-logo variant',
	realCss,
	/\.sgs-site-header\.is-header-on-dark\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo\s+\.sgs-responsive-logo__dark\s*\{\s*display:\s*block/
);
assertMatch(
	'live header on-light state resets to the normal logo',
	realCss,
	/\.sgs-site-header\.is-header-on-light\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo\s+\.sgs-responsive-logo__dark\s*\{\s*display:\s*none/
);

// 4. One level of nesting, explicit: a nearer .sgs-on-light inside a
//    .sgs-on-dark resets to the normal logo.
assertMatch(
	'a nearer light ground inside a dark one resets to the normal logo',
	realCss,
	/\.sgs-on-dark\s+\.sgs-on-light\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo\s+\.sgs-responsive-logo__dark\s*\{\s*display:\s*none/
);

// 5. Live header state is declared AFTER the nested-ground case, which is
//    how their specificity TIE resolves in the header's favour (cascade:
//    later wins) — the structural proof of "live header state outranks a
//    static section class".
assertDeclaredAfter(
	'live header on-dark state is declared after the nested-ground tie so it wins',
	realCss,
	/\.sgs-on-light\s+\.sgs-on-dark\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo/,
	/\.sgs-site-header\.is-header-on-dark\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo/
);

// 6. Automatic colour treatment — same signals, filter instead of a swap,
//    and never on the dedicated dark-logo image.
assertMatch(
	'auto treatment whitens on a dark ground, excluding the dark-logo image',
	realCss,
	/\.sgs-on-dark\s+\.sgs-responsive-logo\.sgs-responsive-logo--colour-auto\s+img:not\(\.sgs-responsive-logo__dark\)\s*\{\s*filter:\s*brightness\(0\)\s*invert\(1\)/
);
assertMatch(
	'auto treatment clears the filter on a light ground',
	realCss,
	/\.sgs-on-light\s+\.sgs-responsive-logo\.sgs-responsive-logo--colour-auto\s+img:not\(\.sgs-responsive-logo__dark\)\s*\{\s*filter:\s*none/
);
assertMatch(
	'auto treatment never targets the dedicated dark-logo image',
	realCss,
	/img:not\(\.sgs-responsive-logo__dark\)/
);
assertMatch(
	'auto treatment does not emit a bare "img" filter selector (would also hit the dark-logo image)',
	realCss,
	/\.sgs-responsive-logo--colour-auto[^}]*\bimg\s*\{\s*filter/,
	false
);

// ── Negative control: strip the feature, re-run the SAME assertions ─────────
// A `.sgs-responsive-logo { ... }` rule with the two feature sections cut out
// is still syntactically valid SCSS (the surrounding braces are untouched),
// so this compiles cleanly and stands in for the file before U-13 §4.5
// existed.

const startMarker = '// ── Ground response (U-13 §4.5';
const endMarker = '// ── Lottie substrate (U-17';
const startIdx = realSource.indexOf( startMarker );
const endIdx = realSource.indexOf( endMarker );

if ( -1 === startIdx || -1 === endIdx || endIdx <= startIdx ) {
	console.error( 'FAIL negative control: could not locate the ground-response section markers in style.scss — the file shape changed under this test.' );
	fail++;
} else {
	const strippedSource = realSource.slice( 0, startIdx ) + realSource.slice( endIdx );
	const strippedCss = sass.compileString( strippedSource ).css;

	console.log( '\nSame cases against style.scss with the feature stripped out (must all be ABSENT):' );

	assertMatch(
		'[negative control] static dark ground rule is absent once stripped',
		strippedCss,
		/\.sgs-on-dark\s+\.sgs-responsive-logo\.sgs-responsive-logo--has-dark-logo/,
		false
	);
	assertMatch(
		'[negative control] live header on-dark rule is absent once stripped',
		strippedCss,
		/\.sgs-site-header\.is-header-on-dark/,
		false
	);
	assertMatch(
		'[negative control] nested light-in-dark rule is absent once stripped',
		strippedCss,
		/\.sgs-on-dark\s+\.sgs-on-light\s+\.sgs-responsive-logo/,
		false
	);
	assertMatch(
		'[negative control] auto colour-treatment filter is absent once stripped',
		strippedCss,
		/sgs-responsive-logo--colour-auto/,
		false
	);
	assertMatch(
		'[negative control] the pre-existing dark-logo box CSS (__dark positioning) survives the strip',
		strippedCss,
		/\.sgs-responsive-logo__dark\s*\{[^}]*position:\s*absolute/
	);
}

console.log( '' );
console.log( fail > 0 ? `FAILED: ${ fail } of ${ total }` : `OK: ${ total } assertions passed` );
process.exit( fail > 0 ? 1 : 0 );
