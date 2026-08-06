'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 3
// source=file evidence=PORTED VERBATIM from
// plugins/sgs-blocks/scripts/audit-inspector-conformance.js:91,325-352,
// 451-461 (CONTROL_NAME_RE + the PanelBody JSXElement descendant-count walk)
// — read live 2026-08-05 (STOP-22). Cross-checked independently the same
// day with a standalone Babel walk over all 84 src/blocks/**/edit.js files:
// exactly 15 PanelBody elements have >6 descendant control-like tags and no
// ToolsPanel anywhere inside — matching the OLD script's own live --json
// output the same day (15 FLAGGED, informational severity, 0 EXCEPTION for
// this rule). EXPECTED POPULATION declared before running this port: 15.
//
// SEVERITY / MODE (preserved from OLD, not changed by this port): this rule
// is `informational` severity in the OLD script (audit-inspector-
// conformance.js:591-596, "INFO severity findings never gate"), so it never
// contributed to the OLD `--check` exit code. This port registers as
// `mode: "advisory"` in rules.json, not `"gate"` — matching current
// enforcement exactly, and NOT newly gating 15 blocks that were never gated
// before. The architecture doc (02-scanner-architecture.md §5, item 3 row)
// names `check-simple-surface-cap.js`'s ToolsPanel row-counter as a
// STRICTLY BETTER implementation of this same checklist item ("advisory
// until re-baselined on the better counter, then gate") — that detector is
// never wired anywhere today and absorbing it is a later wave, deliberately
// out of scope for this verbatim port.
//
// BLIND SPOTS (same as OLD, preserved for equivalence):
//   - `>6 descendant control-like elements` is a coarse heuristic on tag
//     NAME shape (CONTROL_NAME_RE), not a true "one labelled inspector row"
//     count — a single ToggleGroupControl with 5 options counts as 1 tag
//     here even though it renders 5 rows; conversely a wrapper component
//     that itself renders 3 controls counts as 1 tag, undercounting. This
//     is exactly the gap `check-simple-surface-cap.js` closes (not absorbed
//     in this port).
//   - Nested PanelBody-inside-PanelBody is walked independently for each
//     PanelBody (Babel's nodePath.traverse re-walks descendants per call),
//     so an outer PanelBody's count INCLUDES an inner PanelBody's own
//     control tags — same double-counting behaviour as the OLD script,
//     which used the identical unscoped nodePath.traverse pattern.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// \b would not exclude a name ending differently, so this stays a $-anchored
// suffix test exactly as in the OLD script — "ToolsPanelItem" does NOT match
// this (ends in "Item", not one of the listed suffixes), and is not counted
// as a control-like tag, same as before.
const CONTROL_NAME_RE = /(Control|Picker|Palette|Toggle|Checkbox|Radio|Combobox)$/;

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
	id: '03-dense-panel-candidate',
	checklistItem: 3,
	title: 'Inspector panels with ~6+ controls use ToolsPanel/ToolsPanelItem progressive disclosure',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		// See 04-colour-alpha.js's identical comment — `this.id` is not usable
		// inside a nested Babel visitor callback (doubly so here, two levels
		// deep); captured here instead.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];
		const parsed = ctx.ast( editFile );
		if ( ! parsed.ok ) return [];

		// Requires an actual JSXElement walk (not just JSXOpeningElement) so a
		// PanelBody node's subtree can be re-traversed for its own descendant
		// count — ctx.cache.traverse() only exposes a single top-level visitor
		// pass, so this rule (like the OLD script) drives babel-traverse
		// directly via the cached AST.
		const traverseModule = require( '@babel/traverse' );
		const traverse = traverseModule.default || traverseModule;

		traverse( parsed.ast, {
			JSXElement( nodePath ) {
				const opening = nodePath.node.openingElement;
				const name = jsxName( opening );
				if ( name !== 'PanelBody' ) return;

				let controlCount = 0;
				let hasToolsPanel = false;
				nodePath.traverse( {
					JSXOpeningElement( inner ) {
						const innerName = jsxName( inner.node );
						if ( ! innerName ) return;
						if ( innerName === 'ToolsPanel' ) hasToolsPanel = true;
						if ( CONTROL_NAME_RE.test( innerName ) ) controlCount++;
					},
				} );

				if ( controlCount <= 6 || hasToolsPanel ) return;

				const line = opening.loc ? opening.loc.start.line : 0;
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'informational',
						detail: `${ editFile }:${ line } — PanelBody with ~${ controlCount } control-like elements and no ToolsPanel progressive disclosure`,
						fix: 'Convert this PanelBody to ToolsPanel/ToolsPanelItem (1-3 isShownByDefault, resetAll) so the panel is not a wall of always-visible controls.',
						keyParts: [ 'dense-panel-candidate', String( line ) ],
					} )
				);
			},
		} );

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/03-dense-panel-candidate',
		mustFlag: [ 'dense-panel-no-toolspanel' ],
		mustNotFlag: [ 'dense-panel-with-toolspanel', 'sparse-panel' ],
	},
};
