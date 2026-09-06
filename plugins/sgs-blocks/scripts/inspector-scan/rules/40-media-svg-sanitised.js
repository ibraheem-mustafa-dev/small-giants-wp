'use strict';

// GROUND-TRUTH: spec=coordinator brief 2026-09-01 ("Write ONE new inspector-scan
// rule module: media-svg-sanitised") source=file evidence=live-read
// src/utils/sanitise-svg.js (`sanitiseSvg()`, the editor-side allowlist
// sanitiser applied wherever raw SVG is mounted) + includes/helpers-tier-
// media.php:78-80 (`sgs_allowed_svg_tags()`, a thin delegate to
// `sgs_svg_kses_allowed_tags()` — "There is ONE list", per that function's own
// docblock) + src/blocks/media/render.php:1017-1113 (the confirmed-correct PHP
// pattern: `wp_kses( $svg_content_raw, sgs_allowed_svg_tags() )`) +
// src/blocks/before-after/media-render.php:278-317
// (`sgs_before_after_resolve_svg()`, which calls `wp_kses( $svg_content,
// sgs_svg_kses_allowed_tags() )` directly — the SAME underlying allowlist
// function `sgs_allowed_svg_tags()` merely wraps) +
// includes/helpers-tier-media.php:169-173 (`sgs_tier_media_render()`, the
// shared multi-tier renderer, which ALSO calls `wp_kses( …,
// sgs_allowed_svg_tags() )` internally for any 'svg'-typed tier it renders) +
// src/blocks/media/edit.js:24,491 (`import { sanitiseSvg } from '../../utils'`
// + `dangerouslySetInnerHTML={ { __html: sanitiseSvg( svgContent ) } }`).
//
// ── WHAT THIS RULE IS FOR ────────────────────────────────────────────────
// SVG markup is user-suppliable content that can carry <script>/event-handler
// XSS payloads. Two sanitisers exist for it and MUST be used everywhere SVG
// is mounted or echoed:
//   JS side  — sanitiseSvg() (src/utils/sanitise-svg.js), wrapping any editor
//              dangerouslySetInnerHTML that mounts SVG-shaped content.
//   PHP side — wp_kses( $markup, sgs_allowed_svg_tags() ) — or the identical
//              underlying sgs_svg_kses_allowed_tags(), which
//              sgs_allowed_svg_tags() merely delegates to (helpers-tier-
//              media.php:78-80) — wrapping any render.php echo of
//              SVG-shaped content. sgs_tier_media_render() (the shared
//              multi-tier media renderer) also counts as sanitised: it calls
//              this SAME wp_kses()/sgs_allowed_svg_tags() pair INTERNALLY for
//              any 'svg'-typed tier it is handed, so a block that routes its
//              SVG tier through it is already safe without touching
//              wp_kses() itself.
//
// This rule flags a block that mounts/echoes SVG-shaped content WITHOUT
// routing it through the correct sanitiser, in two independent ways:
//
//   1. JS  — edit.js calls `dangerouslySetInnerHTML` on an SVG-shaped value
//      (see the attribute-name heuristic below) without `sanitiseSvg(`
//      appearing in the same locus.
//   2. PHP — render.php directly reads an SVG-content-shaped attribute
//      (`$attributes['xSvgContent']` et al.) without the file showing
//      evidence of `wp_kses(...)` + `sgs_allowed_svg_tags(`/
//      `sgs_svg_kses_allowed_tags(`, or of `sgs_tier_media_render(`
//      (which sanitises internally).
//
// ── THE ATTRIBUTE-NAME HEURISTIC (investigated empirically, not assumed) ──
// The obvious "contains Svg AND Content" heuristic was checked against every
// SVG-carrying attribute name in the tree (`python` census over every
// block.json's `attributes` keys for a case-insensitive "svg" substring,
// 2026-09-01) and found to UNDER-MATCH: `sgs/hero`'s `splitSvg`/
// `splitSvgTablet`/`splitSvgMobile` (raw inline-SVG markup, exactly like
// `svgContent`) carry NO "Content" substring at all — a pure "Svg"+"Content"
// matcher would miss them entirely. The census of every "Svg"-named
// attribute tree-wide (58 rows across 9 blocks) split cleanly into two
// groups with ZERO ambiguous cases:
//   MARKUP-CARRYING (13 attrs, matched by this rule): svgContent /
//     svgContentTablet / svgContentMobile (sgs/media); beforeSvgContent /
//     afterSvgContent (sgs/before-after); bgSvgContent (one each on
//     sgs/container, sgs/cta-section, sgs/hero, sgs/multi-button,
//     sgs/physics-canvas, sgs/site-footer, sgs/site-header, sgs/trust-bar);
//     splitSvg / splitSvgTablet / splitSvgMobile (sgs/hero).
//   STYLING/BEHAVIOUR, never markup (excluded): bgSvgPosition /
//     bgSvgAnimation / bgSvgAnimationSpeed / bgSvgOpacity / bgSvgMinHeight /
//     bgSvgTextShadow (each of the 8 bgSvgContent-declaring blocks carries
//     this same sextet).
// The two groups are distinguished purely by name SHAPE: every
// markup-carrying name either contains "Content" (optionally with a further
// tier suffix), or is the bare "Svg" base name optionally suffixed exactly
// "Tablet"/"Mobile" and NOTHING else after it. Every styling name has a
// suffix after "Svg" that is neither "Content*" nor a bare tier name.
// Implemented below as `/Svg(Content[A-Za-z0-9]*|Tablet|Mobile)?$/` tested
// against a name already known to contain "Svg".
//
// ── EXPECTED POPULATION (stated BEFORE trusting a live run, per
//    rules.json._meta.zeroIsAClaim) ────────────────────────────────────
// Traced BY HAND, independent of this rule's own code, every real place SVG
// markup is mounted or echoed tree-wide, 2026-09-01:
//   JS  — `grep -rln dangerouslySetInnerHTML src/blocks/*/edit.js` returns
//     exactly THREE files (hero, media, timeline). All three already wrap
//     their `__html` value in `sanitiseSvg(...)`: hero:1708
//     `sanitiseSvg( splitSvg )`; media:491 `sanitiseSvg( svgContent )`;
//     timeline:1192 `sanitiseSvg( entry.svg )` (a per-repeater-item field
//     with no matching top-level block.json attribute at all — see the
//     KNOWN BLIND SPOTS note below). All three clean.
//   PHP — every render.php that could echo a markup-carrying SVG attribute
//     was read directly: sgs/media echoes via `wp_kses( $svg_content_raw,
//     sgs_allowed_svg_tags() )` (render.php:1048-1050) — clean.
//     sgs/before-after's render.php NEVER touches `beforeSvgContent`/
//     `afterSvgContent` directly (confirmed: zero matches for either name in
//     that file) — the read is delegated entirely to the block's own
//     `media-render.php`, whose `sgs_before_after_resolve_svg()` calls
//     `wp_kses( $svg_content, sgs_svg_kses_allowed_tags() )`
//     (media-render.php:302-304) — clean, and also outside this rule's scope
//     by construction (per-block scope reads only render.php, mirroring
//     rule 37/38's own scope; before-after is silent both because it is
//     genuinely safe AND because the delegated read is invisible to a
//     render.php-only scan). The 8 `bgSvgContent`-declaring blocks never
//     touch `bgSvgContent` directly in their OWN render.php either — each
//     nulls it out of the attrs copy handed to
//     `SGS_Container_Wrapper::render()` (e.g. hero/render.php:1354) and it
//     is sanitised entirely inside that shared class, again outside this
//     rule's per-block render.php scope. `splitSvg` IS read directly by
//     hero/render.php (`$split_svg = (string)( $attributes['splitSvg'] ??
//     '' )`, line 135) but is then routed through `sgs_tier_media_render()`
//     (line 1265), which sanitises internally — recognised via the
//     `sgs_tier_media_render(` file-level exemption.
// **Expected live population: 0.** A non-zero result is a bug in this rule,
// not the framework, unless a NEW SVG-mounting surface has landed since
// 2026-09-01 without adopting either sanitiser — re-derive by hand before
// trusting either outcome (this is a guard against future regressions, the
// same shape as rule 38's own 0-population claim).
//
// ── KNOWN BLIND SPOTS (declared, not fixed here) ─────────────────────────
//   - Condition 1 does NOT cross-reference block.json attribute names at
//     all — it classifies each `dangerouslySetInnerHTML` locus as
//     "SVG-shaped" by a plain `/svg/i` text match on the mounted expression
//     itself. This is DELIBERATE: the block.json-driven attribute-name
//     heuristic built for condition 2 would have MISSED sgs/timeline's
//     `entry.svg` entirely — it exists only inside a repeater-item field
//     shape, never as a top-level block.json attribute. The tradeoff: a
//     field mounted via `dangerouslySetInnerHTML` whose NAME does not
//     contain "svg" anywhere (e.g. a hypothetical `entry.art`) would be
//     invisible to this rule.
//   - Condition 2's "does this file show sanitiser evidence" check is
//     FILE-LEVEL, not locus-level: once a render.php calls `wp_kses(` +
//     `sgs_allowed_svg_tags(`/`sgs_svg_kses_allowed_tags(` (or
//     `sgs_tier_media_render(`) ANYWHERE, every direct SVG-attribute read in
//     that file goes silent — mirroring rule 37/38's own file-level
//     "adopted-by-call" exemption precedent in this directory. A block with
//     TWO SVG-content attrs, one genuinely wrapped and one not, would be
//     under-flagged. No such case exists in the live tree today (verified
//     by hand above).
//   - `ctx.stripped()` only strips `/* */` block comments for PHP, via a
//     single documented-limited regex (STOP-GATE-COMMENT-STRIPPER, D339d —
//     a `/*` inside a PHP string literal swallows the rest of the file); it
//     does NOT strip `//` line comments at all. PROVEN live during this
//     rule's own build: an early draft of the unsanitised-echo-mustflag
//     fixture had a `//` comment merely NAMING `wp_kses()` and
//     `sgs_allowed_svg_tags()` while describing the bug ("no wp_kses()...
//     evidence anywhere in this file") — `phpFileShowsSanitiserEvidence()`
//     read that comment text as real sanitiser evidence and the fixture
//     went silent when it should have flagged. Fixed by rewording the
//     comment; the underlying blind spot (a `//` comment merely mentioning
//     either function name, without a wp_kses() call actually reaching a
//     touched SVG attribute, would falsely exempt a genuinely unsanitised
//     echo) remains, inherited from the same regex every PHP-scanning rule
//     in this directory already carries.
//   - Condition 2 only checks whether the attribute is READ
//     (`$attributes['x']` textual presence), not whether the read value is
//     actually echoed to output — a block that reads the attribute purely
//     for e.g. an early-return emptiness check, without ever echoing it,
//     would still need file-level sanitiser evidence to stay silent. No
//     such case exists in the live tree today.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// Matches the MARKUP-CARRYING shape only (see header above): the name ENDS
// with "svg", then either "content" plus any further tier suffix, or a bare
// "svg" base optionally followed by exactly "tablet"/"mobile" and nothing
// else. Case-INSENSITIVE deliberately — the unprefixed base attribute is
// spelled with a lower-case leading "svgContent" (sgs/media), while every
// prefixed sibling capitalises it as camelCase ("bgSvgContent",
// "beforeSvgContent", "splitSvg"). A case-sensitive match on "Svg" alone
// would silently miss the unprefixed shape entirely — caught by this rule's
// own self-test (unsanitised-echo-mustflag's `svgContent` attribute, the
// exact unprefixed shape, failed to flag under the first case-sensitive cut
// of this regex before the fix landed).
const SVG_MARKUP_ATTR_SUFFIX = /svg(content[a-z0-9]*|tablet|mobile)?$/i;

function isSvgMarkupAttrName( name ) {
	return typeof name === 'string' && SVG_MARKUP_ATTR_SUFFIX.test( name );
}

/**
 * A PHP file "shows sanitiser evidence" for SVG output when it either calls
 * the shared multi-tier renderer (which sanitises SVG tiers internally —
 * helpers-tier-media.php:169-173), or calls wp_kses() together with either
 * name of the shared allowlist function — sgs_allowed_svg_tags() is a thin
 * delegate to sgs_svg_kses_allowed_tags() (helpers-tier-media.php:78-80),
 * so either counts as "the correct sanitiser" for this rule's purposes.
 */
function phpFileShowsSanitiserEvidence( text ) {
	if ( typeof text !== 'string' ) return false;
	if ( text.indexOf( 'sgs_tier_media_render(' ) !== -1 ) return true;
	const callsWpKses = text.indexOf( 'wp_kses(' ) !== -1;
	const callsAllowlist =
		text.indexOf( 'sgs_allowed_svg_tags(' ) !== -1 ||
		text.indexOf( 'sgs_svg_kses_allowed_tags(' ) !== -1;
	return callsWpKses && callsAllowlist;
}

/**
 * Every literal `$attributes['name']` / `$attributes["name"]` access in PHP
 * text, deduplicated. Presence-only (mirrors rule 37's own
 * propertyPresenceRegex convention in this directory) — not a claim the
 * value is definitely echoed; see the KNOWN BLIND SPOTS note above.
 */
function findAttributeReads( text ) {
	const found = new Set();
	const re = /\$attributes\s*\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g;
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		found.add( m[ 1 ] );
	}
	return found;
}

/**
 * Detects variables assigned from calls to svgBackgroundPreview(). Returns
 * a Set of variable names whose .markup property is safe for
 * dangerouslySetInnerHTML because they come from a delegate that sanitises
 * internally (like sgs_tier_media_render() on the PHP side).
 *
 * Pattern: `const varName = svgBackgroundPreview(...)` or
 * `let varName = svgBackgroundPreview(...)` or
 * `var varName = svgBackgroundPreview(...)`.
 *
 * @param {string} text JS file text
 * @return {Set<string>} Variable names (e.g., 'svgPreview')
 */
function findSvgBackgroundPreviewVars( text ) {
	const found = new Set();
	// Capture: const/let/var VARNAME = svgBackgroundPreview(...)
	// The opening paren is required to distinguish the call from a bare mention
	const re = /(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*svgBackgroundPreview\s*\(/g;
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		found.add( m[ 1 ] );
	}
	return found;
}

// Bounded window of source starting at each REAL `dangerouslySetInnerHTML`
// JSX-attribute match — long enough to cover the whole `{ { __html: EXPR }
// }` object literal for every real shape in this tree (the longest,
// media's, is well under 200 chars) without needing a full JS/JSX parser
// for a single-purpose static check, matching this directory's existing
// regex-on-stripped-text convention for rules that scan .js source.
const DANGEROUS_HTML_WINDOW = 400;

// Requires an `=` after the identifier (optionally whitespace-separated),
// i.e. the actual JSX prop assignment — NOT a bare `/dangerouslySetInnerHTML/`
// substring match. This matters because ctx.stripped()'s comment-blanking
// for .js files depends on @babel/parser being resolvable at all (it is a
// transitive, undeclared dependency — see core/sources.js's own header); if
// parsing is unavailable, strippedText() falls back to the RAW,
// comment-INCLUDING text. PROVEN live during this rule's own build: without
// the `=` requirement, sgs/media/edit.js itself false-flagged, because its
// own `//` comment ("Editor preview: render SVG inline via
// dangerouslySetInnerHTML.") was read as a real usage in an environment
// where @babel/parser was not installed. Requiring the assignment `=`
// excludes prose mentions regardless of whether comment-stripping ran.
function findDangerousHtmlLoci( text ) {
	const loci = [];
	const re = /dangerouslySetInnerHTML\s*=/g;
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		loci.push( text.slice( m.index, m.index + DANGEROUS_HTML_WINDOW ) );
	}
	return loci;
}

module.exports = {
	id: '40-media-svg-sanitised',
	checklistItem: null,
	title:
		'A block mounts (edit.js dangerouslySetInnerHTML) or echoes (render.php) SVG-shaped ' +
		'content without routing it through the shared sanitiser (sanitiseSvg() on the JS side, ' +
		'wp_kses( …, sgs_allowed_svg_tags() ) or sgs_tier_media_render() on the PHP side)',
	scope: 'per-block',
	needs: [ 'json:block.json', 'text:edit.js', 'text:render.php' ],
	run( ctx, block ) {
		const ruleId = this.id;
		const blockDir = path.join( ctx.blocksDir, block.tail );
		const editFile = path.join( blockDir, 'edit.js' );
		const renderFile = path.join( blockDir, 'render.php' );
		const findings = [];

		// ── Condition 1: JS-side dangerouslySetInnerHTML ──────────────────
		const editText = ctx.stripped( editFile );
		if ( editText ) {
			const loci = findDangerousHtmlLoci( editText );
			// Detect variables assigned from svgBackgroundPreview() — these
			// delegate sanitisation internally, so their .markup property is safe
			const svgPreviewVars = findSvgBackgroundPreviewVars( editText );
			loci.forEach( ( locus, i ) => {
				if ( ! /svg/i.test( locus ) ) return; // not SVG-shaped, out of scope
				if ( locus.indexOf( 'sanitiseSvg(' ) !== -1 ) return; // already wrapped

				// Check for delegate pattern: { __html: varName.markup } where
				// varName is assigned from svgBackgroundPreview(...)
				// Regex: capture varName from pattern like "{ __html: varName.markup }"
				// or variants with whitespace. The .markup suffix is the key
				// indicator of the svgBackgroundPreview delegate return shape.
				const delegateMatch = locus.match( /\{\s*__html\s*:\s*([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*markup\s*\}/ );
				if ( delegateMatch && svgPreviewVars.has( delegateMatch[ 1 ] ) ) {
					// This is { __html: varName.markup } where varName is from
					// svgBackgroundPreview() — the markup is already sanitised
					return;
				}

				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						severity: 'error',
						kind: 'unsanitised-dangerously-set-inner-html',
						detail:
							'`dangerouslySetInnerHTML` mounts SVG-shaped content in the editor without ' +
							'wrapping the value in `sanitiseSvg(...)` — a Contributor-supplied SVG payload ' +
							"(<script>, an on* event handler) can execute in an admin's browser the moment " +
							'they open this block in the editor.',
						fix:
							"Import `sanitiseSvg` from '../../utils' and wrap the mounted value: " +
							'`dangerouslySetInnerHTML={ { __html: sanitiseSvg( yourSvgValue ) } }` — the same ' +
							'pattern sgs/media, sgs/hero and sgs/timeline already use.',
						keyParts: [ 'unsanitised-dangerously-set-inner-html', String( i ) ],
					} )
				);
			} );
		}

		// ── Condition 2: PHP-side render.php echo ─────────────────────────
		const renderText = ctx.stripped( renderFile );
		if ( renderText ) {
			const svgAttrsInBlockJson = new Set();
			const blockJsonFile = path.join( blockDir, 'block.json' );
			const blockJson = ctx.json( blockJsonFile );
			if ( blockJson.ok && blockJson.data ) {
				Object.keys( blockJson.data.attributes || {} ).forEach( ( name ) => {
					if ( isSvgMarkupAttrName( name ) ) svgAttrsInBlockJson.add( name );
				} );
			}

			if ( svgAttrsInBlockJson.size ) {
				const readAttrs = findAttributeReads( renderText );
				const touchedSvgAttrs = [ ...svgAttrsInBlockJson ].filter( ( name ) =>
					readAttrs.has( name )
				);

				if ( touchedSvgAttrs.length && ! phpFileShowsSanitiserEvidence( renderText ) ) {
					touchedSvgAttrs.forEach( ( attrName ) => {
						findings.push(
							makeFinding( {
								rule: ruleId,
								block: block.slug,
								file: renderFile,
								severity: 'error',
								kind: 'unsanitised-svg-echo-render',
								detail:
									`render.php reads the SVG-markup attribute "${ attrName }" directly ` +
									'(`$attributes[...]`), but this file shows no evidence of routing it ' +
									'through `wp_kses( …, sgs_allowed_svg_tags() )` (or the identical ' +
									'`sgs_svg_kses_allowed_tags()`) or the shared `sgs_tier_media_render()` — ' +
									'unsanitised SVG markup echoed to the frontend can carry a <script> or ' +
									'event-handler XSS payload.',
								fix:
									"Sanitise before echoing: `wp_kses( $attributes['" +
									attrName +
									"'], sgs_allowed_svg_tags() )` — see sgs/media/render.php's SVG render " +
									'path for the reference pattern — or route the value through ' +
									'`sgs_tier_media_render()` (helpers-tier-media.php), which sanitises SVG ' +
									'tiers internally.',
								keyParts: [ 'unsanitised-svg-echo-render', attrName ],
							} )
						);
					} );
				}
			}
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/40-media-svg-sanitised',
		mustFlag: [ 'unsanitised-dangerously-set-mustflag', 'unsanitised-echo-mustflag' ],
		mustNotFlag: [
			'sgs-media-silent',
			'before-after-silent',
			'sanitised-both-silent',
			'no-svg-block-silent',
			'svg-background-preview-silent',
		],
	},
};
