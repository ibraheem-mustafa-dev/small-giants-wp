'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 1
// source=file evidence=live-read plugins/sgs-blocks/scripts/audit-inspector-conformance.js
// on 2026-08-03 — the string `group` does not appear in that file at all (0
// hits), confirming the checklist's item-1 UNENFORCED tag and the
// enforcer-truth-matrix row 1 ("claim CORRECT"). This is a genuinely NEW
// detector, not a port of anything.
//
// REVISED 2026-08-03 after coordinator review caught a false green: the
// first version counted `<InspectorControls>` ELEMENTS as a proxy for
// "panels", but almost every SGS block wraps ALL its panels in a single
// InspectorControls — so `opens` was 1 and the rule silently passed blocks
// with a dozen unrouted panels (measured live: hero 1 InspectorControls / 15
// panels, product-card 1/15, trust-bar 1/13, button 1/12). The rule now
// counts PANELS (PanelBody, ToolsPanel, and any shared component from
// core/components.js that itself renders one of those — resolved from the
// component's own source, not a hardcoded name list) rather than
// InspectorControls wrapper elements.
//
// THRESHOLD, restated on the correct unit: 1 panel is a single settings
// surface — there is no Settings-vs-Styles choice to make, so it is not
// flagged. 2+ panels is a genuine routing decision: without an explicit
// `group` prop, WordPress puts everything in the default (Settings) tab,
// which is exactly Bean's "hero is unusable" complaint (15 panels, 1 tab).
//
// `InspectorAdvancedControls` is a DISTINCT WordPress component that routes
// to the Advanced tab WITHOUT a `group` prop at all — confirmed live
// (2026-08-03): 0 blocks use it directly in their own edit.js today, but it
// IS used by the universal extensions (src/blocks/extensions/block-defaults.js,
// custom-css.js — applied to every block via `editor.BlockEdit` filters),
// which is WHY every SGS block already gets an Advanced panel by default
// without any block-level work. Content inside InspectorAdvancedControls is
// excluded from the panel count below (it is already routed) and its
// presence does not require a `group` prop.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );
const { getStructuralAttrMap, isStructuralNoCssAttr } = require( '../core/components' );

const GROUP_PROP_RE = /<InspectorControls\b[^>]*\bgroup\s*=\s*\{?["']([a-zA-Z-]+)["']/g;
const ADVANCED_SPAN_RE = /<InspectorAdvancedControls\b[^]*?<\/InspectorAdvancedControls>/g;

// GROUND-TRUTH (2026-09-03, fixing a false positive on sgs/mega-aside, then
// corrected same-day after a live re-scan proved the first shape wrong): a
// shared component can itself render `<InspectorControls group="...">`
// internally (e.g. SgsColourPanel renders group="styles"). Such a component
// counts as ROUTED, not as a panel needing a routing decision — so it is
// EXCLUDED from panelTagNames entirely (mirrors how InspectorAdvancedControls
// content is already excluded below, same reasoning: something that is
// already known-routed shouldn't count toward "panels lacking routing").
//
// The first version of this fix instead short-circuited the WHOLE block to
// "routed" the moment ANY self-routing component was used anywhere in its
// file. That was wrong: 65/83 blocks mount SgsColourPanel, and most of them
// ALSO have several genuinely unrouted styling panels alongside it (e.g.
// sgs/counter's Text Styling/Decoration/Spacing/Border-radius/Border panels
// have nothing to do with SgsColourPanel's colour row). The short-circuit
// collapsed the rule's findings from 56 to 2 in one live re-scan — it wasn't
// closing mega-aside's blind spot, it was gutting the whole backlog. This
// exclusion-from-count shape instead lets mega-aside clear (its ONLY other
// panel, "Aside", drops the total below the 2-panel threshold) while
// sgs/counter and friends still correctly flag on their remaining unrouted
// panels.
function panelTagNames( ctx, { excludeSelfRouting } = {} ) {
	const names = [ 'PanelBody', 'ToolsPanel' ];
	if ( ctx.components && ctx.components.ok ) {
		for ( const [ name, info ] of Object.entries( ctx.components.exportsMap ) ) {
			if ( ! info.wrapsPanel ) continue;
			if ( excludeSelfRouting && info.selfRoutesGroup ) continue;
			names.push( name );
		}
	}
	return names;
}

function countPanels( text, tagNames ) {
	let total = 0;
	for ( const name of tagNames ) {
		const re = new RegExp( `<${ name }\\b`, 'g' );
		total += ( text.match( re ) || [] ).length;
	}
	return total;
}

// GROUND-TRUTH (2026-09-03, Bean-approved mixed-panel exemption): a panel
// containing AT LEAST ONE control with no CSS property behind it at all (a
// true structural/behavioural control — variant picker, tagName selector,
// layout-mode radio, autoplay/showDots/required toggle, preset-style picker)
// is exempt from needing `group="styles"` even when the SAME panel also
// carries real CSS-styling controls — those stay grouped with the anchor
// control in Settings, they are not meant to be split out to Styles.
// Verified live against 5 named blocks: sgs/audio "Player style" (playerStyle
// only, no CSS), sgs/post-grid "Layout" (layout=structural + columns/
// aspectRatio=real CSS -> whole panel exempt), sgs/multi-button "Layout"
// (flexDirection/gap/flexWrap, ALL real CSS, no anchor -> stays flagged),
// sgs/text "Typography" (all real CSS, no anchor -> stays flagged),
// sgs/image-sequence "Scroll effect" (fxPin/fxStart/fxEnd/fxScrub, all
// `fx:`-pseudo-property JS config, zero real CSS -> whole panel exempt).
//
// Finds each PANEL JSXElement via the AST (Babel already resolves correct
// nesting, so no manual tag-balancing regex is needed) rather than the
// simpler text-count `countPanels()` above — that regex-based count is left
// UNCHANGED (still the `panelCount` threshold gate) so this exemption axis
// can only SUBTRACT exempt panels from an already-proven count, never change
// how the base count itself is computed. If the AST can't be walked (parse
// failure), this returns zero exemptions — the pre-existing, safe behaviour.
//
// `InspectorAdvancedControls` interaction, verified explicitly (2026-09-03
// review): a panel INSIDE `InspectorAdvancedControls` is excluded here via
// `advancedAncestor()` BEFORE it is ever added to `panels` — so it can never
// become an exempt-panel CANDIDATE in the first place, regardless of whether
// its own controls would resolve as structural. This mirrors the EXISTING
// `ADVANCED_SPAN_RE`/`textOutsideAdvanced` exclusion that already fed
// `panelCount` above — two independent mechanisms (a regex span-strip and an
// AST ancestor walk) answering the SAME "is this panel already routed to
// Advanced" question, bounded by `Math.min(exemptCount, panelCount)` in
// run() so neither can push the required count below what the regex-derived
// `panelCount` actually supports. Covered by the
// 'advanced-panel-with-structural-anchor' self-test fixture below.
function findPanelElements( ctx, editFile, tagNameSet ) {
	const panels = [];
	const advancedAncestor = ( nodePath ) =>
		!! nodePath.findParent(
			( p ) =>
				p.isJSXElement() &&
				p.node.openingElement &&
				p.node.openingElement.name &&
				p.node.openingElement.name.type === 'JSXIdentifier' &&
				p.node.openingElement.name.name === 'InspectorAdvancedControls'
		);
	const ok = ctx.cache.traverse( editFile, {
		JSXElement( nodePath ) {
			const opening = nodePath.node.openingElement;
			const name = opening && opening.name && opening.name.type === 'JSXIdentifier' ? opening.name.name : null;
			if ( ! name || ! tagNameSet.has( name ) ) return;
			if ( advancedAncestor( nodePath ) ) return; // already routed, mirrors textOutsideAdvanced above
			panels.push( nodePath.node );
		},
	} );
	return { ok, panels };
}

// Best-effort human title for a panel node — `title={ __( 'X', 'sgs-blocks' ) }`
// or `title="X"`. Falls back to null (caller uses the tag name + line instead).
function panelTitle( node ) {
	const opening = node.openingElement;
	if ( ! opening || ! opening.attributes ) return null;
	for ( const attr of opening.attributes ) {
		if ( attr.type !== 'JSXAttribute' || ! attr.name || attr.name.name !== 'title' ) continue;
		const v = attr.value;
		if ( ! v ) return null;
		if ( v.type === 'StringLiteral' ) return v.value;
		if ( v.type === 'JSXExpressionContainer' ) {
			const expr = v.expression;
			if ( expr.type === 'StringLiteral' ) return expr.value;
			if (
				expr.type === 'CallExpression' &&
				expr.arguments[ 0 ] &&
				expr.arguments[ 0 ].type === 'StringLiteral'
			) {
				return expr.arguments[ 0 ].value; // __( 'Title', 'sgs-blocks' )
			}
		}
		return null;
	}
	return null;
}

// Defensive only (attribute names are valid JS identifiers, so no real
// exploit exists here) — mirrors the more careful regex-building convention
// used elsewhere in this file/directory rather than trusting an attr name is
// always identifier-shaped.
function escapeRegExp( s ) {
	return s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
}

/**
 * Of the AST-found panels, which are exempt (contain >=1 attribute whose DB
 * row resolves to "no CSS property behind it")? Cross-references the block's
 * OWN declared attribute names (block.json) against each panel's raw source
 * slice — an attribute name appearing as a whole-word token inside a panel's
 * JSX (`value={ layout }`, `onChange={ set('layout') }`, a self-closing
 * shared component's prop expression, ...) is treated as "this panel writes
 * that attribute", matching the file's existing text-based-detection level
 * rather than resolving every prop binding via full JSX prop analysis.
 *
 * @return {{ exemptCount: number, exemptTitles: string[] }}
 */
function findExemptPanels( ctx, block, editFile, rawText, panels, declaredAttrs ) {
	if ( ! panels.length || ! declaredAttrs.length ) return { exemptCount: 0, exemptTitles: [] };
	let structuralMap;
	try {
		structuralMap = getStructuralAttrMap( ctx );
	} catch ( e ) {
		return { exemptCount: 0, exemptTitles: [] }; // DB unreachable -> safe default, never over-exempt
	}
	const slugMap = structuralMap[ block.slug ] || {};
	let exemptCount = 0;
	const exemptTitles = [];
	for ( const node of panels ) {
		const slice = rawText.slice( node.start, node.end );
		const anchorAttr = declaredAttrs.find( ( attrName ) => {
			if ( ! new RegExp( `\\b${ escapeRegExp( attrName ) }\\b` ).test( slice ) ) return false;
			return isStructuralNoCssAttr( attrName, slugMap[ attrName ] );
		} );
		if ( anchorAttr ) {
			exemptCount++;
			exemptTitles.push( panelTitle( node ) || `${ node.openingElement.name.name } (attr: ${ anchorAttr })` );
		}
	}
	return { exemptCount, exemptTitles };
}

module.exports = {
	id: '01-tab-group',
	checklistItem: 1,
	title: 'Settings/Styles/Advanced routed via the native InspectorControls group prop',
	scope: 'per-block',
	needs: [ 'stripped:edit.js', 'ast:edit.js', 'components' ],
	run( ctx, block ) {
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const rawStripped = ctx.stripped( editFile );
		if ( rawStripped == null ) return [];

		const hasAdvancedRouting = /<InspectorAdvancedControls\b/.test( rawStripped );
		// Content already routed to Advanced does not count toward "unrouted
		// panels", and does not need a group prop of its own.
		const textOutsideAdvanced = rawStripped.replace( ADVANCED_SPAN_RE, '' );

		const tagNames = panelTagNames( ctx, { excludeSelfRouting: true } );
		const panelCount = countPanels( textOutsideAdvanced, tagNames );
		if ( panelCount < 2 ) return []; // single settings surface (or fully covered by self-routing components) -- nothing left to route between

		const blockJsonWrapper = ctx.json
			? ctx.json( path.join( ctx.blocksDir, block.tail, 'block.json' ) )
			: null;
		const declaredAttrs =
			blockJsonWrapper && blockJsonWrapper.ok && blockJsonWrapper.data && blockJsonWrapper.data.attributes
				? Object.keys( blockJsonWrapper.data.attributes )
				: [];
		const { ok: astOk, panels } = findPanelElements( ctx, editFile, new Set( tagNames ) );
		const { exemptCount, exemptTitles } =
			astOk && panels.length
				? findExemptPanels( ctx, block, editFile, rawStripped, panels, declaredAttrs )
				: { exemptCount: 0, exemptTitles: [] };
		const requiredPanelCount = Math.max( 0, panelCount - Math.min( exemptCount, panelCount ) );
		if ( requiredPanelCount < 2 ) return []; // exemption removed the genuine routing decision

		GROUP_PROP_RE.lastIndex = 0;
		const groupMatches = [ ...rawStripped.matchAll( GROUP_PROP_RE ) ];
		if ( groupMatches.length > 0 ) return []; // at least one panel is explicitly routed

		return [
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: editFile,
				severity: 'warn',
				detail:
					`${ panelCount } inspector panel(s) found (PanelBody/ToolsPanel/panel-wrapping shared components), ` +
					"none carrying a 'group' prop — Settings/Styles are not routed, everything defaults to one tab." +
					( hasAdvancedRouting
						? ' (Advanced is already routed via InspectorAdvancedControls, not counted above.)'
						: '' ) +
					( exemptCount
						? ` ${ exemptCount } of those panel(s) carry a structural/behavioural control with no CSS ` +
						  `property (exempt from routing, still counted above for context): ${ exemptTitles.join( ', ' ) }. ` +
						  `${ requiredPanelCount } panel(s) genuinely need a routing decision.`
						: '' ),
				fix: 'TWO TIERS (THE PLACEMENT RULE, .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O, D537 2026-08-09). TIER 1: give each declared element in supports.sgs.elements ONE panel holding its content, its styling and its hover together. TIER 2: within a panel, and for every control belonging to no element, group by property-family (text/fill/layout/position/motion/animation, per scripts/consistency/cluster-member-sets.json) — NOT a single catch-all block-level panel. A control that styles nothing (variant, tagName, layout, autoplay, showDots, required) takes one Settings panel, pinned first — and a panel already anchored by such a control is exempt from group routing even when it also holds real CSS controls (2026-09-03). Do NOT sort by behaviour-vs-appearance — that rule was retired 2026-08-08.',
				keyParts: [ 'no-group-routing' ],
			} ),
		];
	},
	// ── Why 'multi-button'/'post-grid' are named after REAL blocks (2026-09-03
	// review finding) ────────────────────────────────────────────────────────
	// core/selftest.js (out of scope for this task) only offers ONE fixture-
	// mockable DB map — a `_css-property-map.json` file at a rule's fixture
	// root, wired to `ctx.__colourCssPropertyMap` — and that field's shape
	// belongs to rule 31 (golden.js `getColourCssPropertyMap`). Writing my own
	// richer `{attr_type, css_property, box_family}` shape into it would
	// silently corrupt rule 31's mechanism resolution in a real run (`ctx` is
	// ONE shared object across every rule — confirmed live in run.js
	// `runAllRules`), so `getStructuralAttrMap()` deliberately has NO
	// fixture-injection hook of its own.
	//
	// Consequence: `findExemptPanels()` always hits the REAL `sgs-framework.db`
	// when self-testing, even inside the isolated fixture sandbox. The
	// 'multi-button' and 'post-grid' fixture folders are named after REAL
	// block slugs specifically so their DB lookups resolve against real,
	// already-verified rows (see the header GROUND-TRUTH note above for the
	// exact values) rather than resolving as "no DB row -> not exempt" for
	// every attribute, which would make the mustFlag/mustNotFlag assertions
	// below trivially true regardless of whether the exemption LOGIC works.
	//
	// ⛔ COST OF THIS CHOICE — READ BEFORE TOUCHING EITHER BLOCK'S
	// block_attributes ROWS: these two self-test fixtures are coupled to
	// PRODUCTION DB DATA for `sgs/multi-button` (flexDirection/gap/flexWrap)
	// and `sgs/post-grid` (layout/columns/aspectRatio/cardStyle) that lives
	// OUTSIDE this rule file and outside the fixture directory entirely. A
	// future DB reseed, a new `css:*`/`box_family` mapping, or an `attr_type`
	// change on any of those SEVEN attributes can flip this self-test's
	// pass/fail for a reason that has NOTHING to do with this rule's own
	// logic — it will read as "rule 01 regressed" when the real cause is
	// upstream schema drift. If this self-test starts failing on
	// 'multi-button' or 'post-grid' with no code change in this file,
	// re-run the DB queries in this header's GROUND-TRUTH note first before
	// assuming the exemption logic broke.
	selfTest: {
		fixture: 'fixtures/01-tab-group',
		mustFlag: [
			'multi-panel-no-group',
			'single-inspector-many-panels',
			// Negative control for the mixed-panel exemption (folder name is the
			// REAL slug 'sgs/multi-button' so the DB lookup resolves against real
			// data): flexDirection/gap/flexWrap are all real CSS (flex-direction/
			// gap/flex-wrap per block_attributes.css_property, verified live
			// 2026-09-03), no structural anchor in either panel, so the exemption
			// must NOT fire and this must stay flagged.
			'multi-button',
			// Covers the InspectorAdvancedControls x structural-anchor interaction
			// (2026-09-03 review finding): a panel INSIDE InspectorAdvancedControls
			// carries an attribute shaped like a structural anchor, but must never
			// be counted as a panel OR an exempt-panel candidate -- it is excluded
			// by advancedAncestor()/ADVANCED_SPAN_RE before either count runs. The
			// fixture's two OUTSIDE panels alone (no structural anchor -- synthetic
			// slug, no DB row, safe default) must still hit panelCount=2 and stay
			// flagged; if the Advanced panel were wrongly counted, panelCount would
			// read 3 instead of 2 (still flagged either way here, but the finding
			// TEXT is asserted separately -- see run() manually if this ever needs
			// re-proving beyond mustFlag/mustNotFlag membership).
			'advanced-panel-with-structural-anchor',
		],
		mustNotFlag: [
			'multi-panel-with-group',
			'single-panel',
			'single-settings-plus-advanced',
			'panel-plus-self-routing-component',
			// Positive exemption case (real slug 'sgs/post-grid'): 'layout' has no
			// css_property/box_family and is string-typed (structural), sharing a
			// panel with 'columns'/'aspectRatio' (real CSS) -- proves a mixed panel
			// is exempt. A second panel is anchored by 'cardStyle' (also
			// structural) -- after exemption 0 panels need routing.
			'post-grid',
		],
	},
};
