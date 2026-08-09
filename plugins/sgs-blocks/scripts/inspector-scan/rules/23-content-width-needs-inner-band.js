'use strict';

// GROUND-TRUTH: spec=.claude/decisions.md D540 (read verbatim 2026-08-10) +
// .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md, the bullet beginning
// "`contentWidth` is now a NAMED contract (D540)".
// ^ CITED BY HEADING TEXT, NOT LINE NUMBER (repaired 2026-08-09). It previously
// read ":503-509"; a 22-line insertion into that spec's PART H moved the bullet
// to ~:538 and left the range pointing at an unrelated paragraph — a reflow can
// sever a line-number binding with no diff to this file, which is exactly the
// failure this project records as "a gate can be blind to the file it protects".
// source=file evidence=every mechanism claim below was read out of
// includes/class-sgs-container-wrapper.php and the three overriding call sites
// (physics-canvas/render.php:97, product-card/render.php:313,
// hero/render.php:1065-1066) on 2026-08-10, not inferred from the decision text.
//
// WHY THIS RULE EXISTS. D540 ruled that `contentWidth` names the width of the
// element WRAPPING a block's content — a genuine band beneath the outer box. A
// block with one width layer uses `maxWidth`; one that wants a fixed width says
// `width`. The name had already lost that meaning on five blocks, each emitting
// `width:` from `contentWidth` onto the SAME root selector its `maxWidth`
// emitted `max-width:` to. They were deleted. Nothing then stopped a sixth.
//
// D540's own closing line records the gap: "A gate asserting the rule
// (`contentWidth` present => block renders an inner band) is NOT built. Same
// shape as rule 22, and owed: this meaning drifted silently on 5 blocks before
// anyone noticed." This is that gate.
//
// ── WHAT COUNTS AS A BAND, and why it is not "does a particular div exist" ───
// The wrapper's band is `.sgs-container__inner`, emitted when `$do_wrap` is true
// (class-sgs-container-wrapper.php:1906). `$do_wrap` defaults to
// `$has_band_props` (:515-522), and `contentWidth` is one of the five values in
// that predicate — so on a wrapper-routed block, DECLARING the attribute is what
// makes the band exist. That is why routing through the wrapper is signal 1.
//
// But routing through the wrapper is NOT SUFFICIENT, and this was proven rather
// than assumed: three call sites override the guard via `$opts['wrap_inner']`
// (:81, :112), and two of them belong to blocks that still declare the
// attribute. So the rule asks the real question — DOES A CONTENT BAND EXIST BY
// SOME MECHANISM — not "is there a div of a particular class".
//
//   sgs/hero, split variant (hero/render.php:1065-1066) suppresses `__inner`
//     deliberately: an extra element would sit between the section grid and its
//     __content/__media grid items and collapse the two columns (:1039 says so).
//     It bands the content instead with centred `padding-inline` on the grid
//     (:326-341). That is a REAL band and the correct mechanism here — a grid
//     item is sized by its track, so a `max-width` on the column would be an
//     inert lever. Hero must NOT flag. (Bean, 2026-08-10, correcting an earlier
//     draft of this rule that would have flagged it.)
//
//   sgs/product-card (product-card/render.php:313) passes `wrap_inner => false`
//     UNCONDITIONALLY, in the `$base_opts` every branch shares, and its
//     render.php reads `contentWidth` NOWHERE in code — the only occurrence is a
//     docblock line at :21. The wrapper duly writes the band CSS to a selector
//     (`.uid>.sgs-container__inner`) that is never emitted. The control appears
//     in the client's inspector and does nothing. THIS is the D540 shape, and
//     D540's own census missed it: that census grouped the 33 blocks on one
//     property ("routes through the wrapper") without reading each render path.
//
// It missed TWO MORE for a second reason, and this one is worth keeping because
// it is the same trap named just below, committed while writing the check for
// it. sgs/info-box and sgs/option-picker were both counted as wrapper-routed by
// a grep for the string `SGS_Container_Wrapper` — which MATCHED COMMENTS. Both
// blocks DROPPED the wrapper under D294 and mention it only in prose explaining
// that they dropped it. They render block-private and each emits `width:` from
// contentWidth and `max-width:` from maxWidth onto the SAME root selector
// (info-box/render.php:299-304, option-picker/render.php:347-352) — verbatim the
// shape D540 deleted from five blocks. Both were RENAMED contentWidth -> width
// on 2026-08-10 rather than deleted: D540's own text reserves `width` for a
// block that genuinely wants a fixed width, and info-box was live on two
// published canary pages at 900px and 480px, so deleting would have changed real
// pages. A grep for a class NAME answers "is this identifier present", never
// "is this mechanism used".
//
//   sgs/physics-canvas (physics-canvas/render.php:97) passes `wrap_inner => true`
//     — always banded, fine.
//
// ⛔ A COMMENT IS NOT A READ. `SourceCache.strippedText` blanks PHP `/* */` only
// (core/sources.js:151-156, a documented limitation whose false positives rule
// 21 had to baseline). Every `contentWidth` mention in hero/render.php except
// :326 is a `//` line comment, so this rule strips those too and matches the
// CODE SHAPE `$attributes['contentWidth']` rather than the bare word. Matching
// the word would credit product-card's docblock and score it clean.
//
// FAILS TOWARD A FINDING, NEVER TOWARD SILENCE (the principle rule 21 documents
// on its exportBody handling): if the detector cannot see a band it flags. A
// false positive is visible and cheap; a false negative reads green forever.

const path = require( 'path' );
const fs = require( 'fs' );
const { makeFinding } = require( '../core/finding' );

// Any attribute whose name starts `contentWidth` — the base plus its
// `Tablet`/`Mobile` tiers. Anchored: a name that merely CONTAINS the word
// (a hypothetical `innerContentWidthMode`) is a different attribute and is not
// this contract's business. Anchoring is the same word-vs-substring lesson
// D539's `columns`/`listColumns` miss taught.
const CONTENT_WIDTH_ATTR_RE = /^contentWidth([A-Z].*)?$/;

// The wrapper call, in both the static-method and helper-function spellings.
const WRAPPER_CALL_RE = /SGS_Container_Wrapper\s*::\s*render|sgs_container_wrapper\s*\(/;

// `wrap_inner` set either as an array entry (`'wrap_inner' => true`) or by
// later assignment (`$opts['wrap_inner'] = false;` — hero's split branch).
const WRAP_INNER_TRUE_RE = /['"]wrap_inner['"]\s*(?:=>|\]\s*=)\s*true/;
const WRAP_INNER_FALSE_RE = /['"]wrap_inner['"]\s*(?:=>|\]\s*=)\s*false/;

// A genuine CODE read of the attribute — not the bare word.
const CONTENT_WIDTH_READ_RE = /\$attributes\s*\[\s*['"]contentWidth[A-Za-z]*['"]\s*\]/;

// ── What counts as an emitted BAND, and why `width:` alone does not ──────────
// A band is a SECOND LAYER: the content ends up confined to a region smaller
// than the block's own box. There are exactly two ways to build one, and the
// rule accepts both:
//
//   INSET  — an inset on the block's own box, so the content sits inside it
//            while a background still paints edge to edge. This is hero-split's
//            centred `padding-inline`, and it is the correct mechanism when the
//            content is a grid item (a grid item is sized by its track, so a
//            `max-width` on the column would be an inert lever).
//   NESTED — a width cap applied to a DESCENDANT selector: `>.thing{max-width:`.
//
// ⛔ A width declaration on the block's OWN root selector is NOT a band — it is
// a second outer width wearing the name of an inner one, which is precisely
// what D540 deleted from five blocks ("maxWidth emits max-width: on the root
// selector and contentWidth emits width: on that SAME root selector"). An
// earlier draft of this rule accepted any `max-width:|padding-inline:|width:`
// anywhere in the file and therefore scored the D540 shape itself as CLEAN —
// caught by the content-width-no-band fixture, which is in the mustFlag set for
// exactly this reason. Do not loosen this back to a bare width match.
const BAND_BY_INSET_RE = /padding-inline\s*:/;
// Quantifiers are BOUNDED rather than open `*`. An unbounded `[^{}]*` before a
// literal `{` backtracks super-linearly on a long render.php that never matches,
// and this rule runs over every block on every build. The bounds are generous
// against real selector/declaration lengths and were chosen so no live emission
// site in the tree comes close to them.
const BAND_BY_NESTED_RE = /[>\s]\.[\w-]+[^{}]{0,200}\{[^}]{0,400}max-width\s*:/;

/**
 * PHP `//` line comments, which strippedText leaves behind. Blanked rather than
 * deleted so any offset math stays valid, matching how the shared stripper
 * handles JS comment ranges.
 *
 * Deliberately conservative: it skips a `//` that is preceded by `:` so a URL
 * inside a string (`https://…`) is not mistaken for a comment start. It is not
 * a PHP parser and does not claim to be — same caveat the shared stripper
 * carries.
 */
function stripLineComments( text ) {
	return text.replace( /(^|[^:])\/\/[^\n]*/g, ( m, lead ) => lead + ' '.repeat( m.length - lead.length ) );
}

/**
 * `ctx.json()` returns SourceCache's ENVELOPE — `{ ok, error, data }`
 * (core/sources.js) — not the parsed object. Reading `.attributes` straight off
 * the envelope yields undefined, which this rule then reads as "declares no
 * contentWidth" and returns clean for every block in the tree. That is exactly
 * what the first draft did, and the fixture self-test caught it: 0 findings
 * where 3 were required. Left documented because a silent, universal false
 * GREEN is the failure mode this whole scanner exists to prevent.
 */
function contentWidthAttrs( blockJsonEnvelope ) {
	if ( ! blockJsonEnvelope || ! blockJsonEnvelope.ok ) return [];
	const attrs = blockJsonEnvelope.data && blockJsonEnvelope.data.attributes;
	if ( ! attrs || typeof attrs !== 'object' ) return [];
	return Object.keys( attrs ).filter( ( name ) => CONTENT_WIDTH_ATTR_RE.test( name ) );
}

module.exports = {
	id: '23-content-width-needs-inner-band',
	checklistItem: null,
	title: '`contentWidth` exists only on a block that actually produces a content band (D540)',
	scope: 'per-block',
	needs: [ 'json:block.json', 'text:render.php' ],
	run( ctx, block ) {
		const blockDir = path.join( ctx.blocksDir, block.tail );
		const blockJsonFile = path.join( blockDir, 'block.json' );
		const renderFile = path.join( blockDir, 'render.php' );

		const blockJson = ctx.json( blockJsonFile );
		const declared = contentWidthAttrs( blockJson );
		if ( ! declared.length ) return [];

		const attrList = declared.join( ', ' );
		const fixText =
			`Either give the block a real content band, or rename the attribute to what it actually does. ` +
			`D540 (.claude/decisions.md): \`contentWidth\` names the width of the element WRAPPING the content. ` +
			`A block with ONE width layer uses \`maxWidth\`; one that genuinely wants a fixed width says \`width\`. ` +
			`If the control is inert, delete it (that is what D540 did to quote/testimonial/notice-banner/team-member/product-faq) ` +
			`and remove its inspector control in the same change.`;

		// A block declaring the attribute with no render.php cannot band
		// anything. Reported rather than skipped: "no input" must not read green.
		if ( ! fs.existsSync( renderFile ) ) {
			return [
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: blockJsonFile,
					severity: 'warn',
					detail: `Declares ${ attrList } but has no render.php, so no content band can exist — the control is inert.`,
					fix: fixText,
					keyParts: [ 'no-render-php' ],
				} ),
			];
		}

		const rawStripped = ctx.stripped( renderFile );
		if ( rawStripped == null ) return [];
		const text = stripLineComments( rawStripped );

		const callsWrapper = WRAPPER_CALL_RE.test( text );
		const forcesWrapInner = WRAP_INNER_TRUE_RE.test( text );
		const suppressesWrapInner = WRAP_INNER_FALSE_RE.test( text );
		const buildsOwnBand =
			CONTENT_WIDTH_READ_RE.test( text ) &&
			( BAND_BY_INSET_RE.test( text ) || BAND_BY_NESTED_RE.test( text ) );

		// Signal 2 first: an explicit force is unconditional evidence of a band.
		if ( forcesWrapInner ) return [];
		// Signal 3: the block builds its own band from the attribute — an inner
		// wrapping element carrying the cap, or a centred padding band on a grid.
		if ( buildsOwnBand ) return [];
		// Signal 1: routed through the wrapper and not suppressing it, so
		// declaring the attribute is itself what makes `__inner` render.
		if ( callsWrapper && ! suppressesWrapInner ) return [];

		const why = suppressesWrapInner
			? `passes \`wrap_inner => false\`, so the wrapper's \`.sgs-container__inner\` band is never emitted, and render.php reads ${ declared[ 0 ] } nowhere in code — the band CSS is written to a selector that does not exist`
			: callsWrapper
				? `routes through SGS_Container_Wrapper but suppresses its band, and builds none of its own`
				: `renders block-private with no content band at all — the same shape D540 deleted from quote/testimonial/notice-banner/team-member/product-faq`;

		return [
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: renderFile,
				severity: 'warn',
				detail: `Declares ${ attrList } but produces no content band: ${ why }. The control is reachable in the client's inspector and changes nothing.`,
				fix: fixText,
				keyParts: [ 'no-band', declared[ 0 ] ],
			} ),
		];
	},
	selfTest: {
		fixture: 'fixtures/23-content-width-needs-inner-band',
		mustFlag: [ 'content-width-no-band', 'content-width-wrap-inner-false', 'content-width-no-render' ],
		mustNotFlag: [
			'content-width-with-wrapper',
			'content-width-explicit-wrap-inner',
			'content-width-own-band-element',
			'content-width-own-band-padding',
			'no-content-width',
		],
	},
};
