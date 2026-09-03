'use strict';

// GROUND-TRUTH: spec=coordinator brief 2026-08-31 ("Write ONE new inspector-scan
// rule module: media-no-handroll") source=file evidence=live-read
// includes/media-element-attrs-register.php:73-74 (the `supports.sgs.mediaElements`
// declaration gate WordPress's own registration filter reads) +
// includes/helpers-media-element.php:216 (`sgs_media_element_style()`, the ONE
// shared render-side emitter) + assets/css/media-element.css's own docblock
// ("this file: every rule, once" — the shared stylesheet, generated from
// assets/css/media-atoms/*.css by scripts/generate-media-stylesheet.mjs).
//
// ── WHAT THIS RULE IS FOR ────────────────────────────────────────────────
// A shared "media element" layer exists (src/components/media/atoms/ — ten
// atoms — with PHP twins at includes/media/atoms/ and a generated stylesheet
// at assets/css/media-element.css). A block opts in by declaring
// `supports.sgs.mediaElements` in its own block.json — that is the ONE
// on/off switch WordPress's own registration filter reads
// (media-element-attrs-register.php:73: `isset( $args['supports']['sgs']
// ['mediaElements'] )`). At the time this rule was written, ZERO blocks
// declared it; `sgs/media` and `sgs/before-after` were being wired onto it
// concurrently by another track in this same session.
//
// This rule catches a block hand-rolling media handling instead of using
// that shared layer, in TWO independent ways:
//
//   1. DECLARED-WITHOUT-ADOPTION — block.json declares a media-family
//      attribute (object-fit / object-position / overlay colour, gradient,
//      opacity, blend-mode / background-size, position, repeat, attachment)
//      but does NOT declare `supports.sgs.mediaElements` at all.
//   2. DIRECT-CSS-WRITE — render.php or style.css writes one of the five
//      media CSS properties (object-fit, object-position, background-size,
//      background-position, mix-blend-mode) as a literal declaration,
//      rather than via `sgs_media_element_style()` / the atom-driven
//      `var(--sgs-media-*)` custom properties the shared stylesheet reads.
//
// ── THE CRITICAL ACCEPTANCE CRITERION (Bean-locked) ─────────────────────
// A block that HAS adopted the shared layer — i.e. its block.json declares
// a non-empty `supports.sgs.mediaElements` array — MUST return ZERO
// findings from THIS rule, even if its render.php/style.css still contain
// literal media-property text (e.g. mid-migration, or a per-element
// override selector that legitimately still names the property). Adoption
// is judged SOLELY by the `supports.sgs.mediaElements` declaration, per the
// brief's own framing ("Blocks opt in by declaring …"). This is a
// deliberate, coarse gate — not a claim that every line of an adopted
// block's CSS is provably atom-driven — because a finer-grained per-line
// judgement (is THIS specific declaration a legitimate override or a
// leftover hand-roll?) is exactly the kind of judgement call this repo's
// convention (see rule 30's "THIRD SHAPE" note, rule 34's S1/S2/S3 split)
// treats as out of scope for a static advisory rule. Once `sgs/media` and
// `sgs/before-after` finish being wired onto `supports.sgs.mediaElements`,
// both go silent under this rule by construction — that transition is the
// rule's whole reason to exist, and is the free positive/negative control
// named in the brief.
//
// Independently, condition 2 ALSO goes silent per-file when the file itself
// calls `sgs_media_element_style(` anywhere — this is a narrower, file-level
// exemption that lets a block using the shared PHP emitter go quiet on
// condition 2 even before/without formally declaring `mediaElements` (e.g.
// a block that has ALWAYS rendered exactly one media element and finds the
// full opt-in registration unnecessary, but still calls the shared emitter
// for its CSS). It does NOT silence condition 1 — a block declaring a
// media-family attribute still needs `mediaElements` (or its own control
// wiring) to be reachable by the client; calling the render-side helper
// alone says nothing about that.
//
// ── EXPECTED POPULATION (stated BEFORE trusting a live run, per
//    rules.json _meta.zeroIsAClaim) ────────────────────────────────────
// Derived two ways, INDEPENDENTLY of this rule's own code:
//
// (a) DB query (`sgs-framework.db`, seeded by `/sgs-update` from block.json
//     via the `property_suffixes` table, itself DB-first per R-31-1):
//         SELECT block_slug, attr_name, css_property FROM block_attributes
//         WHERE css_property IN ('object-fit','object-position',
//         'background-size','background-position','background-repeat',
//         'background-attachment')
//     returned 23 rows across sgs/brand-strip, sgs/hero (x4), sgs/media
//     (x2), sgs/nav-drawer (x3), sgs/site-footer (x4), sgs/site-header
//     (x4), sgs/trust-bar (x5) — plus a handful of `core/*` rows excluded
//     here (out of blocksDir scope). None of the seven sgs/* blocks in that
//     list declares `supports.sgs.mediaElements` (verified live: none of
//     their block.json files contains the string "mediaElements"). This
//     rule's suffix-based condition-1 matcher is a DIFFERENT method
//     (attribute-name `.includes()`, not the DB's seeded css_property
//     column) and is expected to reproduce most, not all, of that DB list —
//     `sgs/brand-strip`'s `logoFit` is a NAMED, DOCUMENTED miss (its name
//     carries no "ObjectFit"/"Fit" suffix this rule matches), consistent
//     with plugins/sgs-blocks/CLAUDE.md's own note that a hand-written
//     survey of "media blocks" missed exactly this attribute too.
//
// (b) A plain-text census over every block's render.php/style.css (Python,
//     independent of this file, run 2026-08-31): comment-stripped text
//     scanned for `object-fit|object-position|background-size|
//     background-position|mix-blend-mode\s*:`, excluding a file that calls
//     `sgs_media_element_style(` (render.php) or whose matched value starts
//     `var(--sgs-media` (style.css). Measured: **46 direct-write findings
//     across 25 unique blocks** (before-after, brand-strip, business-info,
//     buybox, card-grid, cart, container, cta-section, form, gallery,
//     google-reviews, hero, image-sequence, info-box, media, mega-aside,
//     mega-panel, nav-drawer, option-picker, post-grid, product-card,
//     product-search, team-member, testimonial, trust-bar).
//
// LIVE RUN RESULT kept out of this header so it cannot silently drift —
// re-derive via `node run.js --json` for the current number; see the
// rules.json entry for the measured openBacklog at the time this rule
// shipped (105 FLAGGED at introduction — 55 condition-1 + 50 condition-2,
// wider than both hand-derived estimates above for reasons recorded there;
// every finding was hand-reviewed and none was a gross overmatch).
//
// ── KNOWN BLIND SPOTS (declared, not fixed here) ─────────────────────────
//   - Condition 1's attribute matcher is a NAME-SUFFIX heuristic
//     (`.includes()` against a fixed list), not the DB's seeded
//     `css_property` column — `logoFit`-shaped names are invisible to it
//     (see (a) above). A DB-driven matcher would close this, at the cost of
//     a live DB dependency this rule deliberately avoids (every sibling
//     static-AST rule in this directory is DB-free; see rule 34's own
//     header on why it shells out to a SCRIPT rather than a live DB read).
//   - Condition 2 uses `ctx.stripped()`, which only strips `/* */` block
//     comments for non-.js files (core/sources.js's own documented
//     limitation — STOP-GATE-COMMENT-STRIPPER, D339d: "a `/*` inside a
//     string literal swallows the rest of the file"). A PHP `//` line
//     comment mentioning a property name with an immediate colon (rare —
//     none found live) could false-positive; this rule inherits the same
//     known limitation every PHP/CSS-scanning rule in this directory
//     already carries, rather than building a second, private comment
//     stripper that could disagree with the shared one.
//   - Overlay-family attribute names are matched by `.includes()` against
//     the four literal substrings ('OverlayColour','OverlayGradient',
//     'OverlayOpacity','OverlayBlendMode') rather than resolved through the
//     DB's own overlay -> {background-color|background-image|opacity}
//     css_property mapping (verified live: `sgs/hero`'s
//     `backgroundOverlayColour` resolves to `background-color`, not a
//     literal "overlay" CSS property) — the DB mapping is per-attribute and
//     not reproducible from a static suffix list without a live DB read;
//     matching on the OVERLAY name itself (not the resolved property) is
//     the achievable static proxy and is documented as such.
//   - `src/blocks/extensions/` has no block.json and is structurally
//     outside the roster (`core/roster.js`), same boundary every per-block
//     rule in this directory already accepts.
//
// ── CONDITION 2's MEDIA-CONTEXT GATE (added 2026-09-02, session ID
//    f4e697c7) ───────────────────────────────────────────────────────────
// Condition 2 originally matched a media CSS property (object-fit,
// object-position, background-size, background-position, mix-blend-mode)
// ANYWHERE in a file, with no check that the declaration was actually
// styling a media element — background-size/background-position fire on
// ANY background, media or not. Two confirmed false positives proved this:
// `sgs/form` (`background-position: right 0.75rem center` is a
// validation-icon offset on a text `<input>`) and `sgs/business-info`
// (`background-size`/`background-position` drive a `background-clip:text`
// colour-sweep hover effect on a link — the block's own documented
// `#e7d768` "credit-sweep" constant, not a media asset).
//
// The fix: a matched line only counts if it is in MEDIA CONTEXT, judged by
// `isMediaContextMatch()` below —
//   (a) for a .css file: the line's ENCLOSING CSS RULE is located via
//       brace-depth backward/forward scanning (`findEnclosingCssRule()` —
//       PHP files are NOT scanned this way; a PHP file's `{`/`}` are
//       control-flow braces, not CSS rule braces, so brace-matching them
//       would misattribute selectors). The rule's SELECTOR text is tested
//       against `MEDIA_CONTEXT_KEYWORDS` (media/image/img/photo/avatar/
//       logo/thumb/video/svg/banner/poster) — the block's own media BEM
//       element classes, a media tag selector, or an atom-ish keyword.
//       Independently, the rule's DECLARATION BODY is tested for a REAL
//       `background-image:url(...)` (not a `data:` URI, not a gradient) —
//       a real uploaded asset is itself strong evidence the accompanying
//       size/position/repeat/attachment governs that image.
//   (b) for a .php file (selectors are built dynamically via string
//       concatenation, so there is no static "selector" to parse): a
//       window of source around the match (~400 chars before, ~200 after)
//       is tested the same way — keyword OR a real background-image url().
//
// `data:` URIs are stripped from the selector/window text used by the
// KEYWORD test BEFORE it runs — an inline SVG icon's own MIME string
// ("image/svg+xml") otherwise reads as a false "svg"/"image" keyword hit.
// The URL-is-real-asset test is deliberately NOT a strip-then-lookahead
// regex — a first attempt was, and it broke on exactly this data URI: the
// SVG markup inside `sgs/form`'s validation icon contains its own single
// quotes (`stroke='%23dc2626'`), so a `data:[^'")]*` strip halted at that
// FIRST embedded quote and left enough un-stripped residue that the
// lookahead read as "not data:" — the false positive came straight back.
// `backgroundImageIsRealAsset()` instead bounds the URL value by its own
// OPENING quote via `indexOf()`, which finds the true closing quote
// regardless of what the URI's own content contains.
//
// Keyword matching uses a letter-boundary `(?<![a-z])…(?![a-z])` rather
// than `\b`, deliberately — `\b` treats `_` as a word character, so it
// would MISS "media" inside a PHP snake_case variable like
// `$sgs_nd_media_decls` (a real case: `sgs/nav-drawer`'s render.php names
// its background-declaration array exactly this way). The letter-boundary
// form matches "media" there because both neighbouring characters (`_`)
// are non-letters.
//
// `findEnclosingCssRule()`'s selector-boundary scan stops at the nearest
// `}` OR `{` before the rule's own opening brace, NOT `}` alone — a rule
// that is the FIRST rule inside an `@media`/`@supports` block has no `}`
// between the at-rule's own `{` and this rule's `{`, so a `}`-only scan
// walks straight past the at-rule line and folds it into "the selector".
// Caught live during this fix's own verification: `@media
// (prefers-reduced-motion: reduce) { .sgs-container--ken-burns {…} }`
// produced a false "media" keyword hit — coincidental (the CSS at-rule
// keyword "@media"), not a real media-element signal.
//
// A property that is used in the file but NEVER in a media context (both
// confirmed false positives) produces no finding at all for that property —
// this is a stronger statement than "adopted", it means condition 2 never
// considered the property applicable in the first place. A property used
// in BOTH a media and a non-media context is judged only on the media-
// context line(s) — the non-media line is simply irrelevant to this rule.
//
// Verified BEFORE/AFTER against the live tree (not just the fixtures), with
// two live bugs caught and fixed mid-verification (both documented above —
// the data-URI strip-then-lookahead break, and the `@media` boundary leak):
// baseline 77 findings (34 direct-css-write / 43 declared-without-
// mediaelements); after this gate, 70 findings (27 direct-css-write / 43
// declared-without-mediaelements, unchanged). The 3 explicitly-confirmed
// false positives (sgs/form background-position; sgs/business-info
// background-size AND background-position) are gone, confirmed by direct
// diff of the before/after JSON. FOUR further findings also cleared that
// were NOT named in the brief, all judged to fit the identical pattern on
// direct reading of the CSS (no live-DOM check was done on these four —
// flagged as a residual verification gap in the dispatch report):
//   - `sgs/post-grid`'s `.sgs-post-grid__card--skeleton` loading-shimmer:
//     a `linear-gradient` background-image (no `url()`, no media keyword
//     in its selector) animates background-size/-position for a loading
//     placeholder — not a media element, structurally identical to
//     `sgs/business-info`'s gradient sweep.
//   - `sgs/container`'s Ken-Burns zoom (`.sgs-container--ken-burns` +
//     its `@keyframes`/reduced-motion sibling rules): background-size/
//     -position animate a `background-image` that is set INLINE by
//     render.php (not present in this stylesheet at all), so neither a
//     selector keyword nor a same-rule `url()` is available as static
//     evidence here — this one is a genuine judgement call, not as
//     clear-cut as the other three, and is called out in the dispatch
//     report for Bean/the next session to reconsider if wanted.
// `sgs/container`'s own `object-fit` finding (`.sgs-container__video-bg` /
// `.sgs-container__image-bg`) is untouched by this and still fires, so the
// block itself is not silenced. All 5 of the brief's named real findings
// (sgs/cta-section, sgs/container, sgs/team-member, sgs/testimonial,
// sgs/gallery) were re-verified live after the change and still fire. No
// other rule's finding count changed (verified via full before/after
// `--json` diff — only rule 37's own array differs).

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// Condition 1 — attribute-name suffixes indicating a media-family control.
// `.includes()`, not `.endsWith()`, so a Tablet/Mobile tier sibling
// (`splitMediaObjectPositionMobile`) still matches its base suffix.
const MEDIA_ATTR_SUFFIXES = [
	'ObjectFit',
	'ObjectPosition',
	'OverlayColour',
	'OverlayGradient',
	'OverlayOpacity',
	'OverlayBlendMode',
	'BackgroundSize',
	'BackgroundPosition',
	'BackgroundRepeat',
	'BackgroundAttachment',
];

// Condition 2 — the five media CSS properties named in the brief, matched
// as `property\s*:` (presence only, no captured value — a PHP file often
// builds the declaration via string concatenation, e.g.
// `'{object-fit:' . $safe_fit . '}'`, so requiring a literal value after
// the colon on the SAME regex match misses real hand-rolled code).
const MEDIA_CSS_PROPERTIES = [
	'object-fit',
	'object-position',
	'background-size',
	'background-position',
	'mix-blend-mode',
];

// ── Background-panel exclusion (added 2026-09-03, Bean-directed) ─────────
// A whole-block background (size/position/repeat/attachment/overlay/video/
// SVG backdrop, including Ken-Burns/parallax motion on it) is a SEPARATE,
// already-standardised, non-element-based system — owned by
// `SGS_Container_Wrapper` for every block that mirrors `sgs/container`, or
// block-private for a block like `sgs/nav-drawer` that renders its backdrop
// outside the wrapper. It is not a media element (an `<img>`/`<video>` a
// client points at their own file and picks an object-fit for), and was
// never supposed to be compared against `supports.sgs.mediaElements`.
//
// This SUPERSEDES the 2026-09-02 "ken-burns"/"parallax" keyword addition to
// MEDIA_CONTEXT_KEYWORDS below, which deliberately kept container's
// Ken-Burns zoom firing as a "media" finding on the reasoning that
// background-image motion IS media-element behaviour. Investigated
// 2026-09-03 and reversed: the background panel is its own system, motion
// on it included.
//
// The discriminator that makes this a universal exclusion rather than a
// per-block carve-out (rule 3, no carve-outs): every genuine media-element
// attribute in this codebase carries an ELEMENT-NAME PREFIX before the
// property suffix (`splitMediaObjectPosition`, `mediaOverlayColour`,
// `logoFit`, `badgeImageObjectFit`). The background-panel family is always
// BARE-PREFIXED — the attribute name itself starts with `background`/`bg`
// (`backgroundOverlayColour`, `backgroundSize`, `bgParallax`, `bgKenBurns`)
// with no element name in front of it. Verified live across all 7 blocks
// this rule flagged for the bare-`backgroundOverlay*` shape (sgs/container,
// sgs/cta-section, sgs/multi-button, sgs/physics-canvas, sgs/site-footer,
// sgs/site-header) plus sgs/nav-drawer's direct-css-write shape — every one
// is bare-prefixed; no element-prefixed occurrence of this attribute family
// exists anywhere in the tree.
const BG_PANEL_ATTR_REGEX = /^(background|bg)[A-Z]/;

// Condition-2 exclusion: literal PHP variable/class markers of the shared
// background-panel implementation, read directly off the three affected
// blocks' render.php/style.css (not guessed) — `sgs/container`
// (`bg_video`/`bg_svg`/`--ken-burns`/`--parallax`/`sgs_overlay_decls`),
// `sgs/cta-section` (`has_image_bg`/`has_video_bg`/`has_bg_image`/
// `resolved_media`/`background_image`/`--has-bg-image`), `sgs/nav-drawer`
// (`has_bg_image`/`bg_image`/`bg_size`/`bg_position`/`sgs_nd_media_decls`).
// A match inside a window/selector carrying one of these markers is the
// shared background panel, not a media element — even when a generic
// keyword like "video"/"image"/"svg"/"media" would otherwise also match.
// `video-bg`/`image-bg` are container's own LCP-fast-path selector classes
// (`.sgs-container__video-bg`/`__image-bg`) — a real `<video>`/`<img>` tag,
// but a fixed `object-fit:cover` with no client-facing control at all
// (there is no `objectFit` attribute behind it), i.e. an implementation
// detail of the backdrop panel, not a media element a client configures.
const BG_PANEL_CONTEXT_REGEX =
	/has_bg_image|has_image_bg|has_video_bg|bg_image|bg_video|bg_svg|bg_size|bg_position|resolved_media|background_image|sgs_overlay_decls|sgs_nd_media_decls|--has-bg-image|video-bg|image-bg|ken-burns|parallax/i;

function propertyPresenceRegex( prop ) {
	return new RegExp( '\\b' + prop.replace( /-/g, '\\-' ) + '\\s*:', 'i' );
}

function propertyAtomBackedRegex( prop ) {
	// A declaration whose value is the atom-driven custom property (or falls
	// back to one) is adopted, even without a formal supports.sgs.mediaElements
	// declaration or a sgs_media_element_style() call in THIS file — e.g. a
	// per-element override selector reading `var(--sgs-media-object-fit, …)`.
	return new RegExp(
		'\\b' + prop.replace( /-/g, '\\-' ) + '\\s*:\\s*var\\(\\s*--sgs-media',
		'i'
	);
}

// ── Media-context gate for condition 2 (see the file header for the full
//    rationale + the two confirmed false positives this closes). ──────────

// `media`/`image`/`img`/etc. as the block's own BEM element classes, a
// media tag selector, or an atom-ish keyword. A letter-boundary
// `(?<![a-z])…(?![a-z])`, NOT `\b` — `\b` treats `_` as a word character
// and would miss "media" inside a PHP snake_case name like
// `$sgs_nd_media_decls`.
// `ken-burns` and `parallax` added 2026-09-02 (coordinator review of this
// rule's own flagged judgement call). Both name a BACKGROUND-IMAGE treatment
// by definition — a Ken Burns pan-zoom and a parallax scroll only ever apply
// to a background image — so a rule animating `background-size`/
// `background-position` under `.sgs-container--ken-burns` IS hand-rolled
// media-property handling and must keep firing. Without these two words the
// keyword gate suppressed it as a false negative, because the matching
// `background-image` is set inline by render.php and never appears in the
// stylesheet for `backgroundImageIsRealAsset()` to find.
const MEDIA_CONTEXT_KEYWORDS = new RegExp(
	'(?<![a-z])(?:media|image|img|photo|avatar|logo|thumb|video|svg|banner|poster|ken-burns|parallax)(?![a-z])',
	'i'
);

const BG_IMAGE_URL_START_REGEX = /background-image\s*:\s*url\(\s*(["']?)/i;

// A background-image pointing at a REAL asset — not a decorative `data:`
// URI icon and not a synthetic gradient — is itself strong evidence the
// accompanying size/position/repeat/attachment governs that image.
//
// Deliberately NOT a strip-then-lookahead regex. A first attempt stripped
// `data:[^'")]*` from the text and then tested a negative lookahead for
// `data:` right after `url(` — that broke on `sgs/form`'s own validation
// icon: the data URI is an inline SVG whose OWN markup contains single
// quotes (`stroke='%23dc2626'`), so the strip regex halted at the FIRST
// embedded quote, leaving enough un-stripped residue (`"'http://www.w3.org/
// 2000/svg' …`) that the lookahead read as "not data:" and the false
// positive came straight back. Bounding the URL value by its OWN opening
// quote via `indexOf` (ignoring any quote type embedded inside the value)
// finds the true end regardless of what the URI's own content contains.
function backgroundImageIsRealAsset( body ) {
	const m = BG_IMAGE_URL_START_REGEX.exec( body );
	if ( ! m ) return false;
	const valueStart = m.index + m[ 0 ].length;
	const quote = m[ 1 ];
	let valueEnd;
	if ( quote ) {
		valueEnd = body.indexOf( quote, valueStart );
	} else {
		valueEnd = body.indexOf( ')', valueStart );
	}
	const value = valueEnd === -1 ? body.slice( valueStart ) : body.slice( valueStart, valueEnd );
	return ! /^\s*data:/i.test( value );
}

function stripDataUris( text ) {
	// A data: URI's own MIME string ("image/svg+xml") reads as a false
	// "svg"/"image" keyword hit if left in — used only for the SELECTOR/
	// window keyword test (backgroundImageIsRealAsset() above bounds the
	// URL value directly and does not depend on this).
	return typeof text === 'string' ? text.replace( /data:[^'")]*/gi, '' ) : text;
}

// Locate the CSS rule enclosing `matchIndex` via brace-depth scanning.
// CSS-file-only — a PHP file's `{`/`}` are control-flow braces, not CSS
// rule braces, so brace-matching them would misattribute selectors (see
// phpWindowAround for the PHP-file equivalent).
function findEnclosingCssRule( text, matchIndex ) {
	let depth = 0;
	let i = matchIndex;
	let openBrace = -1;
	while ( i >= 0 ) {
		const ch = text[ i ];
		if ( ch === '}' ) {
			depth++;
		} else if ( ch === '{' ) {
			if ( depth === 0 ) {
				openBrace = i;
				break;
			}
			depth--;
		}
		i--;
	}
	if ( openBrace === -1 ) return { selector: '', body: '' };

	// Bound the selector text by the nearest `}` OR `{` before openBrace —
	// NOT `}` alone. A rule that is the FIRST rule inside an @media/
	// @supports block has no `}` between the at-rule's own opening `{` and
	// this rule's `{`, so a `}`-only scan walks straight past the at-rule
	// line and includes it in "the selector". That is how `@media
	// (prefers-reduced-motion: reduce) { .sgs-container--ken-burns {…} }`
	// produced a false "media" keyword hit on `.sgs-container--ken-burns`
	// — coincidental (the CSS at-rule keyword "@media", not a media
	// element) — caught live during this fix's own verification pass.
	let selStart = 0;
	for ( let k = openBrace - 1; k >= 0; k-- ) {
		if ( text[ k ] === '}' || text[ k ] === '{' ) {
			selStart = k + 1;
			break;
		}
	}
	const selector = text.slice( selStart, openBrace );

	let bodyDepth = 0;
	let closeBrace = text.length;
	for ( let j = openBrace; j < text.length; j++ ) {
		if ( text[ j ] === '{' ) {
			bodyDepth++;
		} else if ( text[ j ] === '}' ) {
			bodyDepth--;
			if ( bodyDepth === 0 ) {
				closeBrace = j;
				break;
			}
		}
	}
	const body = text.slice( openBrace + 1, closeBrace );

	return { selector, body };
}

// PHP-file equivalent of findEnclosingCssRule — there is no static
// "selector" to parse (render.php builds one dynamically via string
// concatenation), so this takes a text window around the match instead.
// A window of ~400 chars back / ~200 chars forward comfortably covers
// every real render.php case measured live (the media signal sits on the
// same line, or within a handful of lines, of the property write).
function phpWindowAround( text, matchIndex ) {
	const back = Math.max( 0, matchIndex - 400 );
	const lineStart = text.lastIndexOf( '\n', back );
	const start = lineStart === -1 ? back : lineStart;
	const end = Math.min( text.length, matchIndex + 200 );
	return text.slice( start, end );
}

// Is the property match at `matchIndexInLine` (within `line`, which begins
// at `lineStartOffset` in `fullText`) plausibly styling a media element?
function isMediaContextMatch( fullText, lineStartOffset, matchIndexInLine, isCss ) {
	const absoluteIndex = lineStartOffset + matchIndexInLine;
	if ( isCss ) {
		const { selector, body } = findEnclosingCssRule( fullText, absoluteIndex );
		// Background-panel exclusion runs FIRST and short-circuits to "not
		// media context" even when a generic keyword below would otherwise
		// match — see the BG_PANEL_CONTEXT_REGEX docblock above.
		if ( BG_PANEL_CONTEXT_REGEX.test( selector ) || BG_PANEL_CONTEXT_REGEX.test( body ) ) {
			return false;
		}
		if ( MEDIA_CONTEXT_KEYWORDS.test( stripDataUris( selector ) ) ) return true;
		return backgroundImageIsRealAsset( body );
	}
	const windowText = phpWindowAround( fullText, absoluteIndex );
	if ( BG_PANEL_CONTEXT_REGEX.test( windowText ) ) return false;
	if ( MEDIA_CONTEXT_KEYWORDS.test( stripDataUris( windowText ) ) ) return true;
	return backgroundImageIsRealAsset( windowText );
}

function hasMediaElementsSupport( blockJsonData ) {
	const declared =
		blockJsonData &&
		blockJsonData.supports &&
		blockJsonData.supports.sgs &&
		blockJsonData.supports.sgs.mediaElements;
	return Array.isArray( declared ) && declared.length > 0;
}

function callsSharedEmitter( text ) {
	return typeof text === 'string' && text.indexOf( 'sgs_media_element_style(' ) !== -1;
}

module.exports = {
	id: '37-media-no-handroll',
	checklistItem: null,
	title:
		'A block hand-rolls media (object-fit/object-position/overlay/background-size/position/' +
		'repeat/attachment) instead of adopting the shared media-element layer ' +
		'(supports.sgs.mediaElements + sgs_media_element_style())',
	scope: 'per-block',
	needs: [ 'json:block.json', 'text:render.php', 'text:style.css' ],
	run( ctx, block ) {
		const ruleId = this.id;
		const blockDir = path.join( ctx.blocksDir, block.tail );
		const blockJsonFile = path.join( blockDir, 'block.json' );
		const renderFile = path.join( blockDir, 'render.php' );
		const styleFile = path.join( blockDir, 'style.css' );

		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is roster-drift/parse-error territory

		const data = blockJson.data || {};
		const adopted = hasMediaElementsSupport( data );
		const findings = [];

		// ── Condition 1: declared media-family attribute, no mediaElements ──
		if ( ! adopted ) {
			const attrNames = Object.keys( data.attributes || {} );
			for ( const attrName of attrNames ) {
				if ( BG_PANEL_ATTR_REGEX.test( attrName ) ) continue; // background panel, not a media element
				const matchedSuffix = MEDIA_ATTR_SUFFIXES.find( ( s ) => attrName.includes( s ) );
				if ( ! matchedSuffix ) continue;
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: blockJsonFile,
						severity: 'warn',
						kind: 'declared-without-mediaelements',
						detail:
							`"${ attrName }" (matches the media-family suffix "${ matchedSuffix }") is declared ` +
							"in block.json, but this block does not declare `supports.sgs.mediaElements` — it " +
							"has not opted into the shared media-element layer (src/components/media/atoms/ + " +
							'includes/media/atoms/), so this attribute is a hand-rolled duplicate of a capability ' +
							'the shared layer already provides.',
						fix:
							'Declare `supports.sgs.mediaElements` in block.json (naming the surfaces this block ' +
							"renders) and let the shared atom layer own this attribute's control + CSS, OR — if " +
							'this block deliberately stays outside the shared layer — document that decision in ' +
							"the block's own header comment rather than leaving the gap silent.",
						keyParts: [ 'declared-without-mediaelements', attrName ],
					} )
				);
			}
		}

		// ── Condition 2: direct CSS-property write, not via the shared emitter ──
		if ( ! adopted ) {
			const renderText = ctx.stripped( renderFile );
			const styleText = ctx.stripped( styleFile );
			const renderAdoptedByCall = callsSharedEmitter( renderText );
			const styleAdoptedByCall = callsSharedEmitter( styleText );

			const sources = [
				{ file: renderFile, text: renderText, fileAdopted: renderAdoptedByCall },
				{ file: styleFile, text: styleText, fileAdopted: styleAdoptedByCall },
			];

			for ( const source of sources ) {
				if ( ! source.text || source.fileAdopted ) continue;
				const isCss = /\.css$/i.test( source.file );

				// Precompute each line's starting offset once per source, so
				// isMediaContextMatch() can locate the match's absolute position
				// in the full text without re-scanning.
				const lines = source.text.split( '\n' );
				const lineOffsets = [];
				let cursor = 0;
				for ( const line of lines ) {
					lineOffsets.push( cursor );
					cursor += line.length + 1; // +1 for the '\n' split() consumed.
				}

				for ( const prop of MEDIA_CSS_PROPERTIES ) {
					const propRegex = propertyPresenceRegex( prop );
					if ( ! propRegex.test( source.text ) ) continue; // property not used at all

					// Only a line matching the property AND in plausible media
					// context counts — this is the fix for the two confirmed false
					// positives (see the file header): background-size/position
					// fire on ANY background, so the property match alone is not
					// enough evidence a media element is involved.
					const mediaContextLines = [];
					for ( let li = 0; li < lines.length; li++ ) {
						const line = lines[ li ];
						const m = propRegex.exec( line );
						if ( ! m ) continue;
						if ( isMediaContextMatch( source.text, lineOffsets[ li ], m.index, isCss ) ) {
							mediaContextLines.push( line );
						}
					}
					if ( mediaContextLines.length === 0 ) continue; // used, but never in media context

					// Every media-context match on an atom-backed var(--sgs-media-…)
					// value is adopted; only flag if at least one is NOT.
					const allMediaMatchesAtomBacked = mediaContextLines.every( ( line ) =>
						propertyAtomBackedRegex( prop ).test( line )
					);
					if ( allMediaMatchesAtomBacked ) continue;

					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: source.file,
							severity: 'warn',
							kind: 'direct-css-write',
							detail:
								`${ path.basename( source.file ) } writes "${ prop }" directly, as a literal ` +
								'declaration — not via `sgs_media_element_style()` and not reading an ' +
								'atom-driven `var(--sgs-media-*)` custom property. This duplicates a capability ' +
								'the shared media-element layer already provides.',
							fix:
								'Route this property through the shared layer: emit it via ' +
								'`sgs_media_element_style( $attributes, $prefix, $block_slug, $scope_class, ' +
								'$atoms )` (includes/helpers-media-element.php) in render.php, and let the ' +
								'generated assets/css/media-element.css own the base rule rather than declaring ' +
								'it again in this block\'s own style.css.',
							keyParts: [ 'direct-css-write', path.basename( source.file ), prop ],
						} )
					);
				}
			}
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/37-media-no-handroll',
		mustFlag: [
			'declared-attr-no-mediaelements',
			'direct-object-fit-in-style',
			'direct-write-in-render',
			'element-prefixed-overlay-still-flagged',
		],
		mustNotFlag: [
			'adopted-mediaelements-silent',
			'render-calls-shared-helper-silent',
			'style-uses-media-custom-property',
			'ordinary-block-no-media',
			'bg-panel-attr-not-flagged',
			'bg-panel-css-not-flagged',
		],
	},
};
