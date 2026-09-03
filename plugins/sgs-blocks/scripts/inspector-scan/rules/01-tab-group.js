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

module.exports = {
	id: '01-tab-group',
	checklistItem: 1,
	title: 'Settings/Styles/Advanced routed via the native InspectorControls group prop',
	scope: 'per-block',
	needs: [ 'stripped:edit.js', 'components' ],
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
		if ( panelCount < 2 ) return []; // single settings surface (or fully covered by self-routing components) — nothing left to route between

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
						: '' ),
				fix: 'TWO TIERS (THE PLACEMENT RULE, .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O, D537 2026-08-09). TIER 1: give each declared element in supports.sgs.elements ONE panel holding its content, its styling and its hover together. TIER 2: within a panel, and for every control belonging to no element, group by property-family (text/fill/layout/position/motion/animation, per scripts/consistency/cluster-member-sets.json) — NOT a single catch-all block-level panel. A control that styles nothing (variant, tagName, layout, autoplay, showDots, required) takes one Settings panel, pinned first. Do NOT sort by behaviour-vs-appearance — that rule was retired 2026-08-08.',
				keyParts: [ 'no-group-routing' ],
			} ),
		];
	},
	selfTest: {
		fixture: 'fixtures/01-tab-group',
		mustFlag: [ 'multi-panel-no-group', 'single-inspector-many-panels' ],
		mustNotFlag: [
			'multi-panel-with-group',
			'single-panel',
			'single-settings-plus-advanced',
			'panel-plus-self-routing-component',
		],
	},
};
