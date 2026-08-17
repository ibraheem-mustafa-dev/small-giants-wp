'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §2 LINK
// (amended 2026-08-13 — the "SUPERSEDED" clause at the top of §2, read live
// before writing this rule). Bean reviewed `sgs/button`'s popover-based LINK
// control live and ruled it the standard, to be rolled out everywhere a raw
// link input exists, including replacing `SgsLinkControl`'s inline mount.
// `src/components/LinkPopoverControl.js` (`LinkPopoverField` /
// `LinkPopoverContent`) is now canonical; `SgsLinkControl`'s inline mount is
// a LOOKALIKE for any NEW consumer.
//
// WHY THIS IS A NEW RULE, NOT AN EDIT TO RULE 24. Rule 24
// (24-raw-canonical-component.js) hardcodes `SgsLinkControl` as the LINK
// contract's canonical target (`CANONICAL_FOR` maps `URLInput`/`LinkControl`
// -> `'SgsLinkControl'`) and its own self-test fixture
// `sgslinkcontrol-used` asserts `mustNotFlag`. Editing rule 24 in place would
// invert a live, passing, gate-adjacent rule's meaning under an unrelated
// commit and risk exactly the kind of "widening a passing gate's condition
// in place" rule 24's own header warns against (line 27-29). A new rule
// asking the NEW, narrower question — "is the SUPERSEDED component here,
// specifically" — is the same pattern rule 24 itself used against rules
// 04/08. Rule 24 is NOT touched by this change; its `SgsLinkControl` mapping
// stays correct for the 7 blocks that have not migrated yet.
//
// SHIP MODE: advisory (rules.json), per the project's own "every genuinely
// new rule starts advisory" convention (rules.json _meta.note) — the 7
// known remaining consumers (`brand-strip`, `card-grid`, `form`,
// `pricing-table`, `social-icons`, `team-member`, `trust-bar`) are a real,
// PRIORITISED-not-yet-cleared migration backlog (contract §2.6), not a
// build-breaking regression. Promotion trigger: flip `rules.json`'s mode to
// `"gate"` once that backlog clears to 0 live findings (verify via
// `node run.js --json` before flipping — do not trust a stale count).
//
// EXPECTED POPULATION at introduction (2026-08-13), independent grep over
// src/blocks/*/edit.js:
//   grep -rl "<SgsLinkControl" src/blocks/*/edit.js
//     -> 7 hits: brand-strip, card-grid, form, pricing-table, social-icons,
//        team-member, trust-bar (icon/media/product-card/button already
//        migrated off it this same session — see git history).
//
// BLIND SPOTS (declared, not fixed here — same boundary rules 04/08/24 use):
//   - `src/blocks/extensions/*.js` is out of scope (no `block.json`, so
//     outside the per-block roster this rule walks).
//   - A component reached indirectly via a block's own local `components/`
//     subfolder is invisible — this rule reads each block's own `edit.js`
//     text only.
//   - A dynamically-computed JSX tag name is invisible (same as 04/08/24's
//     `jsxName()` helper, reused verbatim here).

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

module.exports = {
	id: '27-superseded-link-control',
	checklistItem: null,
	title:
		'`SgsLinkControl`’s inline mount is SUPERSEDED (Spec 35 §2 LINK, 2026-08-13) — new ' +
		'LINK fields must use `LinkPopoverField`/`LinkPopoverContent` (src/components/LinkPopoverControl.js)',
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
				if ( 'SgsLinkControl' !== name ) return;

				const line = node.loc ? node.loc.start.line : 0;
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'warn',
						detail:
							`${ editFile }:${ line } — <SgsLinkControl> is the SUPERSEDED LINK control ` +
							'(Spec 35 §2, amended 2026-08-13). Its inline mount overflows core LinkControl’s ' +
							'350px floor in a narrow inspector panel and cannot commit a staged settings ' +
							'toggle without an explicit Submit.',
						fix:
							'Replace <SgsLinkControl> with <LinkPopoverField> ' +
							'(src/components/LinkPopoverControl.js) — same value/onChange contract for the ' +
							'searchOnly bare-string mode, object mode adds linkTarget/rel/download fields ' +
							'via targetMode. See sgs/icon or sgs/media edit.js for a migrated example. If this ' +
							'is a deliberate, reasoned exception (e.g. a repeater-item link where a popover-' +
							'per-row is the wrong shape), register it in ' +
							'baselines/27-superseded-link-control.json with a specific reason.',
						keyParts: [ 'superseded-sgslinkcontrol', String( line ) ],
					} )
				);
			},
		} );
		if ( ! ok ) return [];
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/27-superseded-link-control',
		mustFlag: [ 'sgslinkcontrol-raw' ],
		mustNotFlag: [
			'linkpopoverfield-used',
			'linkpopovercontent-used',
			'comment-mentions-sgslinkcontrol',
			'no-relevant-control',
		],
	},
};
