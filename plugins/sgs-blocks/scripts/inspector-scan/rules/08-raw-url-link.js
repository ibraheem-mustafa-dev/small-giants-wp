'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-inspector-DONE-checklist.md item 8
// source=file evidence=PORTED VERBATIM from
// plugins/sgs-blocks/scripts/audit-inspector-conformance.js:243-264,304-309,
// jsxAttrStringValue + the rawUrlLinks JSXOpeningElement check — read live
// 2026-08-05 (STOP-22). Cross-checked independently the same day with a
// standalone Babel walk over all 84 src/blocks/**/edit.js files (different
// script, no shared code with this rule or with the OLD script): exactly 2
// `<TextControl type="url">` elements exist in the whole tree —
// src/blocks/google-reviews/edit.js:193 and
// src/blocks/trustpilot-reviews/edit.js:193 — matching the OLD script's own
// live --json output the same day (2 findings, both status EXCEPTION via
// scripts/inspector-conformance-baseline.json, 0 net FLAGGED). EXPECTED
// POPULATION declared before running this port: 2 raw findings, both
// pre-baselined, 0 net FLAGGED.
//
// A THIRD historical baseline entry exists for sgs/media in the OLD
// inspector-conformance-baseline.json ("videoUrl is a media SOURCE ... not
// an anchor href") but produces NO live finding today — an independent
// grep + the standalone Babel walk both confirm src/blocks/media/edit.js has
// no `TextControl type="url"` any more (migrated to SgsLinkControl per Spec
// 35 Part I). That baseline entry is DORMANT under the OLD system too (it
// never matched a live finding on this run); see the migration report for
// why it is not carried into baselines/08-raw-url-link.json (its OLD key
// shape — block+rule only, no locus — cannot be translated into this
// rule's full-tuple key without inventing a locus that was never observed).
//
// BLIND SPOTS (same as OLD, preserved for equivalence):
//   - Only catches `type="url"` as a literal string attribute value — a
//     dynamically-computed type (`type={isUrl ? 'url' : 'text'}`) is
//     invisible, exactly like the OLD script (jsxAttrStringValue only
//     resolves StringLiteral / JSXExpressionContainer wrapping a
//     StringLiteral, TemplateLiteral (all-static-parts) or a CallExpression's
//     first StringLiteral arg — nothing else).
//   - Does not check the CONTENT of the URL field's `help`/`label` text for
//     "link" semantics — a `type="url"` TextControl used for a genuinely
//     non-navigational purpose (e.g. a webhook config URL) still flags, and
//     is the reason the baseline/exception path exists at all.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// S10 fix (2026-09-02): these two blocks' <TextControl type="url"> fields are
// genuine non-navigational config URLs (external-service target/rel is
// hardcoded server-side; page-internal search is inapplicable) — the same two
// exceptions that lived in baselines/08-raw-url-link.json for a year, keyed on
// a LINE NUMBER that any unrelated edit above the control invalidated. That
// baseline entry needed re-anchoring 7 times (google-reviews) / 7 times
// (trustpilot-reviews) for code that never changed. Moved here as a block-slug
// exemption instead: the exception is "this block's url field", not "this
// line", so it can never drift. If either block grows a SECOND
// TextControl type="url" for a genuinely different (navigational) purpose,
// this exemption would wrongly suppress it — re-scope to a per-control check
// (e.g. matching on the field's `label`) if that ever happens.
const EXEMPT_BLOCKS = new Set( [ 'sgs/google-reviews', 'sgs/trustpilot-reviews' ] );

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

/**
 * Ported verbatim from audit-inspector-conformance.js:237-264 — best-effort
 * extraction of a JSXAttribute's string value across the shapes this
 * codebase actually uses (plain string literal, __() call, template
 * literal).
 */
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
	id: '08-raw-url-link',
	checklistItem: 8,
	title: 'Links/CTAs use LinkControl (SgsLinkControl), never a raw TextControl type="url"',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		if ( EXEMPT_BLOCKS.has( block.slug ) ) return [];
		// See 04-colour-alpha.js's identical comment — `this.id` is not usable
		// inside a nested Babel visitor callback; captured here instead.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];
		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( name !== 'TextControl' ) return;
				const typeVal = jsxAttrStringValue( node, 'type' );
				if ( typeVal !== 'url' ) return;

				const line = node.loc ? node.loc.start.line : 0;
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'warn',
						detail: `${ editFile }:${ line } — <TextControl type="url"> should be SgsLinkControl`,
						fix: 'Replace this TextControl with the shared SgsLinkControl component (internal-content search + new-tab + rel nofollow/sponsored), or register a reasoned exemption in baselines/08-raw-url-link.json if this is a non-navigational config URL (e.g. an external-service webhook/API endpoint, not an anchor href).',
						keyParts: [ 'raw-url-textcontrol', String( line ) ],
					} )
				);
			},
		} );
		if ( ! ok ) return [];
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/08-raw-url-link',
		mustFlag: [ 'textcontrol-type-url' ],
		mustNotFlag: [ 'sgslinkcontrol-used', 'textcontrol-type-text', 'no-url-field-at-all' ],
	},
};
