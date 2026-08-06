'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 7
// source=file evidence=PORTED VERBATIM from
// plugins/sgs-blocks/scripts/audit-inspector-conformance.js:315-321,441-449
// (the shadowSelects JSXOpeningElement check — a SelectControl whose label
// text matches /shadow/i) — read live 2026-08-05 (STOP-22). Cross-checked
// independently the same day with a standalone Babel walk over all 84
// src/blocks/**/edit.js files: exactly 1 match —
// src/blocks/post-grid/edit.js:882, label="Hover shadow" — matching the OLD
// script's own live --json output the same day (1 FLAGGED, informational
// severity, 0 EXCEPTION for this rule). EXPECTED POPULATION declared
// before running this port: 1.
//
// SEVERITY / MODE (preserved from OLD, not changed by this port): this rule
// is `informational` severity in the OLD script, which means it NEVER
// contributed to the OLD `--check` gate's exit code (audit-inspector-
// conformance.js:591-596, "INFO severity findings never gate — Part-J
// roadmap signals, not defects"). This port therefore registers as
// `mode: "advisory"` in rules.json, not `"gate"` — setting it to `gate`
// here would be a NEW gate that never existed under the OLD system (the
// opposite failure to the one this task is guarding against: instead of
// silently losing enforcement, it would silently ADD an unreviewed one).
// The architecture doc (02-scanner-architecture.md §5, item 7 row) proposes
// this stays advisory going forward too ("fuzzy today: label regex") until
// a real ShadowControl-resolution detector replaces the label-text heuristic
// — that is a later wave, not this port.
//
// BLIND SPOTS (same as OLD, preserved for equivalence):
//   - This is a LABEL-TEXT heuristic, not a structural check — it can
//     neither confirm the SelectControl's actual option set (a genuinely
//     complete builder mislabelled "Shadow style" would false-positive; a
//     None/Small/Medium preset select labelled anything other than
//     "...shadow..." — e.g. "Elevation" — would be invisible) nor confirm
//     the shared ShadowControl component is unused elsewhere in the same
//     file for the same purpose.
//   - `label` is only resolved for the same limited shapes as
//     jsxAttrStringValue elsewhere in this port (string literal / __() call
//     / template literal) — a dynamically composed label is invisible.

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

function jsxAttrStringValue( openingElement, attrName ) {
	const attr = ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === attrName
	);
	if ( ! attr || ! attr.value ) return null;

	if ( attr.value.type === 'StringLiteral' ) {
		return attr.value.value;
	}
	if ( attr.value.type === 'JSXExpressionContainer' ) {
		const expr = attr.value.expression;
		if ( expr.type === 'StringLiteral' ) return expr.value;
		if ( expr.type === 'TemplateLiteral' && expr.quasis.length ) {
			return expr.quasis.map( ( q ) => q.value.raw ).join( ' ' );
		}
		if ( expr.type === 'CallExpression' && expr.arguments.length ) {
			const firstArg = expr.arguments[ 0 ];
			if ( firstArg.type === 'StringLiteral' ) return firstArg.value;
		}
	}
	return null;
}

module.exports = {
	id: '07-preset-only-shadow',
	checklistItem: 7,
	title: 'Shadow uses a real builder (X/Y/blur/spread/colour+alpha/inset), not a None/Small/Medium preset select',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		// See 04-colour-alpha.js's identical comment — `this.id` is not usable
		// inside a nested Babel visitor callback; captured here instead.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];
		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( name !== 'SelectControl' ) return;
				const label = jsxAttrStringValue( node, 'label' );
				if ( ! label || ! /shadow/i.test( label ) ) return;

				const line = node.loc ? node.loc.start.line : 0;
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'informational',
						detail: `${ editFile }:${ line } — <SelectControl label="${ label }"> — likely a preset select; consider the shared ShadowControl real builder`,
						fix: 'If this is a None/Small/Medium-style preset select, migrate it to the shared ShadowControl component (real X/Y/blur/spread/colour+alpha/inset builder).',
						keyParts: [ 'preset-only-shadow', String( line ) ],
					} )
				);
			},
		} );
		if ( ! ok ) return [];
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/07-preset-only-shadow',
		mustFlag: [ 'shadow-preset-select' ],
		mustNotFlag: [ 'shadowcontrol-used', 'unrelated-select-control' ],
	},
};
