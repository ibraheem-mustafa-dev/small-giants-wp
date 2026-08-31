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
				for ( const prop of MEDIA_CSS_PROPERTIES ) {
					if ( ! propertyPresenceRegex( prop ).test( source.text ) ) continue;
					// Every match of this property on an atom-backed var(--sgs-media-…)
					// value is adopted; only flag if at least one match is NOT.
					const allMatchesAtomBacked = source.text
						.split( '\n' )
						.filter( ( line ) => propertyPresenceRegex( prop ).test( line ) )
						.every( ( line ) => propertyAtomBackedRegex( prop ).test( line ) );
					if ( allMatchesAtomBacked ) continue;

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
		],
		mustNotFlag: [
			'adopted-mediaelements-silent',
			'render-calls-shared-helper-silent',
			'style-uses-media-custom-property',
			'ordinary-block-no-media',
		],
	},
};
