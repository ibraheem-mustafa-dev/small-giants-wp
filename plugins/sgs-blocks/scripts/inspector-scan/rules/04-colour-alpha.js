'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 4
// source=file evidence=PORTED VERBATIM from
// plugins/sgs-blocks/scripts/audit-inspector-conformance.js:83-88,296-301,
// RAW_COLOUR_PICKER_NAMES + the colourNoAlpha JSXOpeningElement check — read
// live 2026-08-05 as the migration source-of-truth (STOP-22, "port working
// logic, do not recreate it"). Cross-checked independently 2026-08-05 with a
// standalone Babel walk (not reusing this tool's cache/ctx) over all 84
// src/blocks/**/edit.js files: 0 raw <ColorPalette|ColorGradientControl|
// GradientPicker|PanelColorGradientSettings> tags found anywhere — every
// colour control in the tree already routes through the shared
// DesignTokenPicker component. EXPECTED POPULATION declared before running
// this port: 0 (matches the OLD script's live --json output the same day:
// 0 FLAGGED, 0 EXCEPTION for this rule). A 0 here is the old script's own
// measured reality, not an unverified assumption — see the equivalence-diff
// note in the migration report for the cross-check method.
//
// DesignTokenPicker is EXEMPT by not being listed in RAW_COLOUR_PICKER_NAMES
// — it defaults `enableAlpha` to `true` (src/components/DesignTokenPicker.js,
// confirmed live by the OLD script's own comment at :15-16). The
// architecture doc (02-scanner-architecture.md §4.5) proposes resolving this
// exemption from the component's own source (`defaultProps`) instead of a
// hardcoded exclusion list, so a future default change can't silently
// re-open the gap — that is a genuine enhancement, deliberately NOT made in
// this port (step 2 is a verbatim port with a proven equivalence gate, not
// an upgrade; the enhancement is left for a later wave per the architecture
// doc's migration order).
//
// BLIND SPOTS (declared, not fixed here — same blind spots the OLD script
// had, preserved for equivalence):
//   - A colour control wrapping one of the 4 raw components INDIRECTLY
//     (via a block's own local components/ subfolder, or a shared
//     src/components/*.js file that itself renders <ColorPalette> etc.)
//     is invisible — this rule only looks at each block's own edit.js text,
//     exactly like the OLD script. The same class of gap rule 18 found for
//     <img> (MediaPicker.js) could exist here and has not been checked.
//   - `enableAlpha={false}` explicitly set still counts as "has the
//     attribute" and is NOT flagged (same as OLD — presence, not value, is
//     checked). A control that explicitly disables alpha is indistinguishable
//     from one that enables it, by this rule.
//   - Native `supports.color` (theme.json) is out of scope by design — this
//     targets COMPONENT pickers, not the native colour support panel.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

const RAW_COLOUR_PICKER_NAMES = new Set( [
	'ColorPalette',
	'ColorGradientControl',
	'GradientPicker',
	'PanelColorGradientSettings',
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

function hasJsxAttr( openingElement, attrName ) {
	return ( openingElement.attributes || [] ).some(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === attrName
	);
}

module.exports = {
	id: '04-colour-alpha',
	checklistItem: 4,
	title: 'Colour COMPONENT pickers (not native supports.color) carry enableAlpha',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		// Captured here, NOT read as `this.id` inside the nested visitor below —
		// Babel invokes visitor methods as plain functions, so `this` inside
		// `JSXOpeningElement(nodePath){...}` is NOT bound to this rule module
		// (confirmed empirically 2026-08-05: it resolves to the Node.js global
		// object). Every other rule in this port makes the same closure-capture
		// choice for the same reason.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];
		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( ! name || ! RAW_COLOUR_PICKER_NAMES.has( name ) ) return;
				if ( hasJsxAttr( node, 'enableAlpha' ) ) return;

				const line = node.loc ? node.loc.start.line : 0;
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'warn',
						detail: `${ editFile }:${ line } — <${ name }> with no \`enableAlpha\` attribute`,
						fix: `Add enableAlpha (and clearable, so alpha-0 is distinguishable from unset) to the <${ name }> element, or migrate it to the shared DesignTokenPicker component (which defaults enableAlpha to true).`,
						keyParts: [ 'no-enable-alpha', name, String( line ) ],
					} )
				);
			},
		} );
		if ( ! ok ) return []; // parse-error is its own first-class finding via core/sources.js cache
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/04-colour-alpha',
		mustFlag: [ 'colorpalette-no-alpha', 'gradientpicker-no-alpha' ],
		mustNotFlag: [ 'colorpalette-with-alpha', 'designtokenpicker-only', 'no-colour-control' ],
	},
};
