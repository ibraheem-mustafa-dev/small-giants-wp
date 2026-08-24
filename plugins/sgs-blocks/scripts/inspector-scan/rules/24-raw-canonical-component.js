'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §1 COLOUR /
// §2 LINK (read live 2026-08-10). §1.1/§1.3: canonical = `DesignTokenPicker`,
// banned lookalikes = `ColorPalette`/`ColorGradientControl`/`GradientPicker`/
// `PanelColorGradientSettings`. §2.1/§2.3: canonical = `SgsLinkControl`,
// banned lookalikes include `<TextControl type="url">` and `<URLInput>`
// (`button/edit.js:311`, cited by the contract itself as a MISSED violator —
// §2.6 "Conformance — 10 conform. Violators: sgs/button, 67 via the
// extension, 2 baselined").
//
// WHY THIS RULE EXISTS, and why it is not a duplicate of 04/08. Both existing
// rules were read in full before writing this one (04-colour-alpha.js,
// 08-raw-url-link.js). Neither enforces the contract's COMPONENT ban:
//   - 04-colour-alpha.js:92 — `if ( hasJsxAttr( node, 'enableAlpha' ) ) return;`
//     flags a raw colour picker ONLY when `enableAlpha` is missing. A raw
//     `<ColorPalette enableAlpha>` in a block's edit.js passes it clean, even
//     though the contract bans the COMPONENT outright, not just an
//     under-configured one.
//   - 08-raw-url-link.js:99-101 — matches `TextControl` with
//     `type="url"` ONLY. `<URLInput>` and bare core `<LinkControl>` are
//     invisible to it by construction (it never looks at the JSX tag name for
//     anything but `TextControl`).
// This rule asks a DIFFERENT question of the SAME two contracts: not "does
// this raw picker have alpha" / "is this TextControl typed url", but "why is
// a component the contract explicitly bans here at all". It deliberately
// OVERLAPS 04 and 08 rather than widening them in place — both are live
// `gate`s at 0 net backlog (rules.json _meta.note), and widening a passing
// gate's condition in place would fail the build on its first finding. This
// rule starts `mode:"advisory"` per rules.json _meta.note ("every GENUINELY
// NEW rule starts advisory"); promotion is a later, separate, one-line edit.
// 04 and 08 are NOT touched by this change.
//
// ── EXPECTED POPULATION, stated BEFORE trusting a live run (rules.json
// _meta.zeroIsAClaim) ──────────────────────────────────────────────────────
// Method: independent of this rule's own AST-walking code — a plain-text
// `grep` over `src/blocks/*/edit.js` (not this file, not Babel, not the
// scanner's cache), run live 2026-08-10:
//   grep -rn "<ColorPalette"              src/blocks/*/edit.js  -> 0 hits
//   grep -rln "<ColorGradientControl"     src/blocks/*/edit.js  -> 0 hits
//   grep -rln "<GradientPicker"           src/blocks/*/edit.js  -> 0 hits
//   grep -rln "<PanelColorGradientSettings" src/blocks/*/edit.js -> 0 hits
//   grep -rln "<URLInput"                 src/blocks/*/edit.js  -> 1 hit:
//       src/blocks/button/edit.js (line 312)
//   grep -rn  "<LinkControl" src/blocks/*/edit.js | grep -v SgsLinkControl
//                                                              -> 0 hits
// EXPECTED POPULATION: 1 raw finding tree-wide (sgs/button's `<URLInput>`).
// This is a SMALL number and is treated as a red flag rather than a free
// pass, per zeroIsAClaim point (2): it is not trusted on its own smallness.
// It is corroborated by a SECOND, independent source that was never derived
// from this rule or its grep — the contract document itself, written before
// this rule existed, names the identical single violator at the identical
// file: "§2.6 Conformance — 10 conform. Violators: sgs/button, 67 via the
// extension, 2 baselined." The "67 via the extension" is
// `extensions/hover-effects.js:388`'s raw URL field, injected into every
// non-opted-out block at runtime — explicitly OUT OF SCOPE here (see BLIND
// SPOTS). The "2 baselined" are rule 08's own two `TextControl type="url"`
// entries (google-reviews/trustpilot-reviews), which this rule does not
// duplicate — it matches JSX COMPONENT NAMES only, never a `type="url"`
// attribute value, so it cannot re-flag what rule 08 already owns.
// Zero colour hits corroborates rule 04's own independently-stated
// population for the same four names ("0 raw <ColorPalette|...> tags found
// anywhere", 04-colour-alpha.js header) — this rule's colour-name matching is
// therefore expected to find nothing live, and DOES: a genuinely small number
// with two independent sources agreeing, not an unverified assumption.
//
// ── BLIND SPOTS (declared, not fixed here) ───────────────────────────────
//   - `src/blocks/extensions/` is OUT OF SCOPE, by design, for THIS rule.
//     `core/roster.js:69-82` (`scanDisk`) only admits a directory containing
//     a `block.json` into the roster, and `extensions/` holds none — so
//     every roster-keyed rule (this one included, `scope:'per-block'`) is
//     structurally blind to it, the same way rule 04/08/21 already are
//     (run.js:32-42 documents this as a NAMED separate surface, reachable
//     only via `ctx.extensionsDir`, which this rule does not read). The
//     contract's own §2.3/§2.6 names the cost precisely: 67 blocks receive a
//     raw URL field from `extensions/hover-effects.js:388` at runtime, and
//     none of them show up here. Scanning `extensionsDir` is unbuilt
//     plumbing and a separate job — not attempted in this rule.
//   - A colour/link control wrapping one of the banned components INDIRECTLY
//     (via a block's own local `components/` subfolder, or a SHARED
//     `src/components/*.js` file other than the two canonical wrappers
//     themselves) is invisible — this rule only reads each block's own
//     `edit.js` text, exactly like rules 04/08/18 (18's header documents the
//     identical class of gap for `<img>`/MediaPicker.js). The contract names
//     a live instance of exactly this: `GradientOverlayControl.js:191`
//     renders a raw `GradientPicker` reaching `container`/`hero`/
//     `trust-bar`/`cta-section` indirectly (§1.3/§1.7) — that file lives in
//     `src/components/`, not `src/blocks/*/edit.js`, so it is out of this
//     rule's scope by the same per-block-edit.js boundary rules 04/08 use,
//     not by an oversight.
//   - `src/components/DesignTokenPicker.js` and `src/components/
//     SgsLinkControl.js` are the two canonical wrappers and legitimately
//     render the raw components internally (DesignTokenPicker.js:87 renders
//     `<ColorPalette>`; SgsLinkControl.js:29 imports core `LinkControl`).
//     Neither lives under `src/blocks/`, so per-block scoping already
//     excludes both WITHOUT a name-based exemption — verified live
//     2026-08-10 (`ls src/components/ | grep -iE
//     'designtoken|linkcontrol'` -> both files listed under
//     `src/components/`, confirming they sit outside `ctx.blocksDir`).
//   - A dynamically-computed JSX tag name (`<Comp />` where `Comp` is a
//     variable, not a literal tag) is invisible — `jsxName()` below only
//     resolves a literal `JSXIdentifier`/`JSXMemberExpression`, same
//     limitation as rules 04/08's identical helper.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// Exact JSX tag names only — a Babel `JSXIdentifier.name` is the WHOLE
// identifier token (JS identifiers cannot contain a literal `<` or space), so
// matching it against a `Set` is an EXACT match, never a substring match. A
// component named e.g. `MyColorPaletteButton` or `CustomLinkControlBox`
// tokenises to that single, different, identifier and will never be a member
// of either Set below — proven by the `substring-name-not-banned` fixture
// (mustNotFlag). Anchoring on the exact tag name, not a text/`includes()`
// scan, is deliberate: a `.includes('ColorPalette')` style check would false-
// positive on exactly that fixture, and a substring match is a real recorded
// failure mode in this codebase (see rule 23's header, D539's
// `columns`/`listColumns` miss).
const RAW_COLOUR_COMPONENT_NAMES = new Set( [
	'ColorPalette',
	'ColorGradientControl',
	'GradientPicker',
	'PanelColorGradientSettings',
] );

const RAW_LINK_COMPONENT_NAMES = new Set( [ 'URLInput', 'LinkControl' ] );

// Which canonical wrapper each banned name should have been instead —
// COLOUR names all route to DesignTokenPicker; LINK names all route to
// SgsLinkControl (spec-35-control-type-contract.md §1.1 / §2.1).
const CANONICAL_FOR = new Map( [
	[ 'ColorPalette', 'DesignTokenPicker' ],
	[ 'ColorGradientControl', 'DesignTokenPicker' ],
	[ 'GradientPicker', 'DesignTokenPicker' ],
	[ 'PanelColorGradientSettings', 'DesignTokenPicker' ],
	// Repointed 2026-08-24: SgsLinkControl.js was DELETED as vestigial (0 mounts;
	// LinkPopoverControl supersedes it and its own docblock says so). A canonical
	// mapping must name a component that EXISTS, or this rule tells a developer
	// to adopt a deleted file.
	[ 'URLInput', 'LinkPopoverControl' ],
	[ 'LinkControl', 'LinkPopoverControl' ],
] );

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

module.exports = {
	id: '24-raw-canonical-component',
	checklistItem: null,
	title:
		'A raw component the control-type contract BANS (Spec 35 §1/§2) must not appear in a ' +
		'block\'s own edit.js — the canonical wrapper (DesignTokenPicker / LinkPopoverControl) exists ' +
		'precisely so callers never reach for the lookalike underneath it',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		// See 04-colour-alpha.js's identical comment: `this.id` is not usable
		// inside a nested Babel visitor callback (Babel invokes visitor methods
		// as plain functions, so `this` there resolves to the Node.js global
		// object, confirmed empirically) — captured here instead.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];
		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( ! name ) return;

				const isColour = RAW_COLOUR_COMPONENT_NAMES.has( name );
				const isLink = RAW_LINK_COMPONENT_NAMES.has( name );
				if ( ! isColour && ! isLink ) return;

				const canonical = CANONICAL_FOR.get( name );
				const contract = isColour ? 'COLOUR' : 'LINK';
				const line = node.loc ? node.loc.start.line : 0;

				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'warn',
						detail:
							`${ editFile }:${ line } — raw <${ name }> is a BANNED lookalike under the ` +
							`${ contract } control-type contract (Spec 35 §${ isColour ? '1' : '2' }.3). ` +
							`It renders directly here instead of going through the canonical ` +
							`${ canonical } wrapper component.`,
						fix:
							`Replace <${ name }> with the shared ${ canonical } component ` +
							`(src/components/${ canonical }.js) — it already carries the required props, ` +
							`accessibility (an \`id\` bound to its label) and the ${ contract === 'COLOUR' ? 'enableAlpha/clearable defaults' : 'internal-content search + new-tab + rel nofollow/sponsored handling' } ` +
							`that a raw <${ name }> lacks. If this really is a deliberate, reasoned exception, ` +
							`register it in baselines/24-raw-canonical-component.json with a specific reason.`,
						keyParts: [ 'raw-canonical-component', name, String( line ) ],
					} )
				);
			},
		} );
		if ( ! ok ) return []; // parse-error is its own first-class finding via core/sources.js cache
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/24-raw-canonical-component',
		mustFlag: [
			'colorpalette-raw',
			'colorpalette-raw-with-alpha',
			'urlinput-raw',
			'linkcontrol-raw',
		],
		mustNotFlag: [
			'designtokenpicker-used',
			'sgslinkcontrol-used',
			'substring-name-not-banned',
			'comment-mentions-banned-names',
			'no-relevant-control',
		],
	},
};
