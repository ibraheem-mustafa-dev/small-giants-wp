'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 canonical-assignment line
// ("4-side box -> ResponsiveBoxControl (contract §5 — bare BoxControl is a banned lookalike, it
// bypasses the tier wrapper)") + §12 field 3's storage-shape pairing table + §13's "raw BoxControl
// (not the Responsive wrapper) | 5 sites | Needs a contract" row (read live 2026-08-18).
//
// WHY THIS RULE EXISTS, and why it is NOT a widening of rule 24. Rule 24 already reads every
// block's own edit.js for banned COLOUR/LINK components; it does not look at `BoxControl` at all
// (its two Sets are `RAW_COLOUR_COMPONENT_NAMES` / `RAW_LINK_COMPONENT_NAMES`, neither containing
// the string "Box"). §5's ban on raw `BoxControl` is a THIRD, separate contract this repo had no
// detector for. Rule 24 is `mode:"gate"` at 0 net backlog (rules.json _meta.note) — its own header
// (:26-33) rules that a passing gate's condition must never be widened in place, since a widened
// condition reds the build on its first finding with no chance to triage first. This rule starts
// `mode:"advisory"` instead, per the same _meta.note convention ("every GENUINELY NEW rule starts
// advisory"; promotion is a later, separate, one-line edit).
//
// ── THE TRAP a naive "flag every raw <BoxControl>" detector falls into (verified live, twice) ──
//
// TRAP 1 — the canonical wrapper's OWN internals render a raw <BoxControl> legitimately.
// `src/components/ResponsiveBoxControl.js:140,163` and `src/components/ResponsiveBoxControls.js:
// 99,115` ARE the implementation of the two canonical wrappers — that is how `ResponsiveBoxControl`
// works internally. Both files live under `src/components/`, never `src/blocks/`. This rule is
// `scope:'per-block'` and reads ONLY `<blocksDir>/<tail>/edit.js` (identical boundary to rule 24,
// documented at its :91-99) — `src/components/*` is excluded BY PATH, with no name-based exemption
// needed. Verified live: `grep -rn "<BoxControl\b" src/blocks/*/edit.js src/blocks/*/components/*.js
// | wc -l` -> 16 hits tree-wide (a plain `<BoxControl[\s/>]` pattern instead returns 1 — multi-line
// JSX puts the opening tag at end-of-line with no following `[\s/>]` on the same match window; this
// is exactly why detection here is AST-based, not text-pattern-based). Of those 16, 4 are the two
// wrapper files above (out of `blocksDir` scope by construction) and are correctly invisible here.
//
// TRAP 2 — THE BIG ONE. Of the remaining 12 in-scope sites, 8 are MANDATED, not banned. Spec 35
// §12 field 3's storage-shape table gives TWO sanctioned pairings, chosen by the attribute's
// `block.json` storage shape, never by which wrapper happens to be present:
//   | scalar base WITH Tablet/Mobile sibling attrs  | ResponsiveControl / ResponsiveBoxControl |
//   | "type":"object" base, NO siblings             | ResponsiveOverride                        |
// For the second row, `ResponsiveOverride` itself renders a PLAIN `<BoxControl>` as its child —
// every in-repo instance carries an identical comment explaining this (e.g. `container/edit.js:
// 366-380`, `cta-section/edit.js:388-397`, `hero/edit.js:1453-1462`): "ResponsiveOverride, which
// reads and writes the object, NOT a plain BoxControl writing one flat attr... core's BoxControl
// ignores the label-hiding prop, so keep BoxControl's own label; BaseControl associates it with the
// inputs." That raw `<BoxControl>`, nested inside `<ResponsiveOverride>`, IS the canonical shape for
// an object-typed attribute — flagging it would tell an agent to delete a correct, documented,
// spec-mandated pairing. Verified live for all 7 `contentBandPadding` sites (`container`,
// `cta-section`, `hero`, `physics-canvas`, `site-footer`, `site-header`, `trust-bar` — each
// `block.json` declares `contentBandPadding` as `{"type":"object","default":{"desktop":{}}}`, the
// tiered-object shape) and the 1 `gridItemPadding` site
// (`container/components/GridItemDefaultsPanel.js:128`, same object shape) — 8 sites total, matches
// the population predicted before this rule's code was written.
//
// EXPECTED POPULATION, stated BEFORE trusting a live run (rules.json _meta.zeroIsAClaim): 16 raw
// `<BoxControl` sites tree-wide, minus 4 out-of-scope (the two wrapper files), minus 8 mandated
// (ResponsiveOverride-wrapped, object-typed) = **4 genuine findings**: `nav-menu/edit.js:1244`
// (`submenuPadding` — flat object, no Tablet/Mobile siblings, NOT ResponsiveOverride-wrapped: the
// block's own comment there argues intentional non-tiering, but the storage shape matches neither
// sanctioned row of §12 field 3's table, so per §5's unconditional wording it is the banned
// lookalike, not a third sanctioned shape) and `product-card/edit.js:1568` (`cardPadding`), `:1637`
// (`tagPadding`), `:2003` (`ctaPadding`) — all three flat objects, no siblings, no
// `ResponsiveOverride` ancestor. Verified each block.json attribute independently before writing
// this rule; none declares a `Tablet`/`Mobile` sibling or a `{desktop:{...}}` tiered default.
//
// ── BLIND SPOTS (declared, not fixed here) ───────────────────────────────────────────────────
//   - `src/blocks/extensions/` is out of scope for the same structural reason as rule 24 (:68-78) —
//     `core/roster.js`'s `scanDisk` only admits directories with a `block.json`; `extensions/` has
//     none, so every roster-keyed rule is blind to it.
//   - A `<BoxControl>` reached indirectly via a block's own local `components/` subfolder, or a
//     SHARED `src/components/*.js` file OTHER than the two canonical wrappers, is invisible — same
//     per-block-edit.js-text boundary as rules 04/08/18/24. `container/components/
//     GridItemDefaultsPanel.js:128` is a live instance of exactly this: it is a mandated pairing
//     (verified above) but sits outside `src/blocks/container/edit.js`, so it is invisible to THIS
//     rule's own scan and is NOT one of the 4 counted findings — it is excluded by the same boundary
//     that also (correctly) excludes the two wrapper files, not by a special-case.
//   - This rule asks only "is a raw <BoxControl> ResponsiveOverride-wrapped", never "is the
//     ResponsiveOverride binding correct" (e.g. bound to the right attribute, or genuinely
//     object-typed vs a mislabelled flat attr smuggled through `ResponsiveOverride`). A block that
//     wraps a raw `<BoxControl>` in `<ResponsiveOverride>` bound to a FLAT (non-object) attribute
//     would pass this rule silently — that misuse is a different defect class, uncovered here.
//   - A dynamically-computed JSX tag name is invisible, same limitation as rules 04/08/24's
//     identical `jsxName()` helper (only resolves a literal `JSXIdentifier`/`JSXMemberExpression`).

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

// Resolve the attribute name a <BoxControl> binds to, from its `values` prop.
// Handles the three shapes present in this tree: `values={ x }`,
// `values={ x || {} }` and `values={ attributes.x }`.
function boundAttrName( openingElement ) {
	const attr = ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === 'values'
	);
	if ( ! attr || ! attr.value || attr.value.type !== 'JSXExpressionContainer' ) return null;
	let e = attr.value.expression;
	if ( e && e.type === 'LogicalExpression' ) e = e.left;
	if ( ! e ) return null;
	if ( e.type === 'Identifier' ) return e.name;
	if ( e.type === 'MemberExpression' && e.property && e.property.name ) return e.property.name;
	return null;
}

// THE THIRD SHAPE (added 2026-08-18 after this rule shipped flagging 4 false
// positives). Spec 35 §12 field 3 names TWO storage shapes; a third exists and
// is legitimate: a FLAT BOX OBJECT — {top,right,bottom,left} — that is
// deliberately not device-tiered and is rendered through
// sgs_box_object_shorthand( array $box ). A plain <BoxControl> is the CORRECT
// control for it; ResponsiveBoxControl would store a tier-shaped object and
// silently drop the whole value. Both shapes read `"type": "object"` in
// block.json with an empty `{}` default, so the schema type alone cannot tell
// them apart — the discriminator is whether Tablet/Mobile SIBLING attributes
// exist, which is the only positive evidence that the attribute is meant to
// vary per breakpoint at all.
// Evidence: nav-menu/edit.js carries an explicit comment saying so and
// nav-menu/render.php:1275 calls sgs_box_object_shorthand(); product-card/
// render.php:294-295 states 'cardPadding is a {top,right,bottom,left}
// box-object attr (mirrors ctaPadding/tagPadding)'.
function isTieredAttribute( attrs, name ) {
	if ( ! attrs || ! name ) return false;
	if ( attrs[ name + 'Tablet' ] || attrs[ name + 'Mobile' ] ) return true;
	const def = attrs[ name ] && attrs[ name ].default;
	if ( def && typeof def === 'object' && ! Array.isArray( def ) ) {
		if ( 'desktop' in def || 'tablet' in def || 'mobile' in def ) return true;
	}
	return false;
}

module.exports = {
	id: '30-raw-box-control',
	checklistItem: null,
	title:
		'A raw <BoxControl> not wrapped in <ResponsiveOverride> bypasses the responsive tier ' +
		'wrapper the control-type contract requires (Spec 35 §5 / §12 field 3) — either it should ' +
		'move onto the flat-attr ResponsiveBoxControl shape, or its attribute should become the ' +
		'tiered-object shape and gain a ResponsiveOverride wrapper',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		// See 04/24's identical comment: `this.id` is not usable inside a nested
		// Babel visitor callback (Babel invokes visitor methods as plain
		// functions, so `this` resolves to the Node.js global object there,
		// confirmed empirically) — captured here instead.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const blockJson = ctx.cache.json( path.join( ctx.blocksDir, block.tail, 'block.json' ) );
		// cache.json() returns a { ok, error, data } WRAPPER, never the parsed
		// object — reading .attributes straight off it yields undefined and makes
		// every attribute look non-tiered, silently disabling this rule.
		const declaredAttrs =
			blockJson && blockJson.ok && blockJson.data ? blockJson.data.attributes || null : null;
		const findings = [];
		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( name !== 'BoxControl' ) return;

				// Mandated pairing (Spec 35 §12 field 3, row 2): an object-typed
				// attribute's raw BoxControl is the CORRECT shape when it is the
				// child of <ResponsiveOverride>, which owns the tier cascade and
				// hands the current tier's plain value down to this BoxControl.
				// Start the ancestor search at the enclosing JSXElement (the
				// BoxControl's own element, via parentPath) so a ResponsiveOverride
				// higher up the tree is found without ever matching the
				// BoxControl's own opening tag against itself.
				const wrapped = nodePath.parentPath
					? nodePath.parentPath.findParent(
							( p ) => p.isJSXElement() && jsxName( p.node.openingElement ) === 'ResponsiveOverride'
					  )
					: null;
				if ( wrapped ) return;

				// Only a TIERED attribute can be bypassing a tier wrapper. A flat box
				// object is correctly controlled by a plain BoxControl — see the
				// THIRD SHAPE note above. No positive tier evidence => not a finding.
				const bound = boundAttrName( node );
				if ( ! isTieredAttribute( declaredAttrs, bound ) ) return;

				const line = node.loc ? node.loc.start.line : 0;

				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'warn',
						detail:
							`${ editFile }:${ line } — raw <BoxControl> is a BANNED lookalike under the ` +
							'4-VALUE BOX control-type contract (Spec 35 §5) when it is not the child of ' +
							'<ResponsiveOverride>. It bypasses the responsive tier wrapper entirely — this ' +
							'attribute has no Tablet/Mobile per-tier control and no tiered-object cascade.',
						fix:
							'Pick the pairing that matches this attribute\'s intended shape (Spec 35 §12 field ' +
							'3): (a) if it should vary per breakpoint, either replace this control with ' +
							'<ResponsiveBoxControl> and add the Tablet/Mobile sibling attributes to block.json, ' +
							'or change the attribute to the tiered-object shape ({desktop,tablet,mobile}) and ' +
							'wrap this <BoxControl> in <ResponsiveOverride> (mirrors container/cta-section/' +
							'hero\'s contentBandPadding pattern); (b) if it is deliberately NOT responsive, ' +
							'register it in baselines/30-raw-box-control.json with that specific reason — do ' +
							'not leave it silently matching neither sanctioned shape.',
						keyParts: [ 'raw-box-control', String( line ) ],
					} )
				);
			},
		} );
		if ( ! ok ) return []; // parse-error is its own first-class finding via core/sources.js cache
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/30-raw-box-control',
		mustFlag: [ 'boxcontrol-raw-flat-with-siblings' ],
		mustNotFlag: [
			'boxcontrol-in-responsive-override-object-attr',
			'responsivebox-control-used',
			'no-box-control', 'flat-box-object-no-tiers' ],
	},
};
