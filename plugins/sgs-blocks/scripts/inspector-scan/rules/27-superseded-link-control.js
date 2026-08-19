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
const { resolveComponentFiles } = require( '../core/components' );
const fsx = require( 'fs' );

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

		// ── SHARED-COMPONENT REACH (2026-08-19, C0) ────────────────────────────
		// Until today this rule read ONLY the block's own edit.js and said so in
		// its header: "A component reached indirectly via a block's own local
		// `components/` subfolder is invisible." That is a DECLARED BLIND SPOT on
		// a rule running as a GATE at openBacklog 0 — the most dangerous shape a
		// detector can have, because zero findings reads as "finished" rather than
		// "never looked". A block whose LINK field lives in a shared panel passed
		// clean by construction.
		//
		// EXPECTED POPULATION, declared before the first run by a method
		// independent of this code: `git grep -ln "<SgsLinkControl" -- src/`
		// returns ZERO files tree-wide, shared components included. So this
		// widening is predicted to add 0 findings and cannot red the gate. Its
		// value is forward: the next LINK field added to a shared panel is caught
		// instead of passing invisibly.
		//
		// Membership is "detect by what it does": a block is credited with a
		// component because its OWN JSX renders `<ComponentName`, cross-referenced
		// against that component's source — never against an import-path string.
		const mounted = new Set();
		ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const n = jsxName( nodePath.node );
				if ( n && /^[A-Z]/.test( n ) ) mounted.add( n );
			},
		} );

		// Resolve against the REAL src tree PLUS ctx-derived dirs, so the
		// self-test's fixture-local components are reachable too (blocksDir is a
		// temp dir under --self-test; without the extras the fixture resolves to an
		// empty map and its mustFlag control passes for the WRONG reason — the
		// false-green core/selftest.js:44-46 warns about).
		const extraDirs = [];
		if ( ctx.componentsDir ) extraDirs.push( ctx.componentsDir );
		if ( ctx.extensionsDir ) extraDirs.push( ctx.extensionsDir );
		if ( ctx.blocksDir && fsx.existsSync( ctx.blocksDir ) ) {
			for ( const e of fsx.readdirSync( ctx.blocksDir, { withFileTypes: true } ) ) {
				if ( e.isDirectory() ) {
					extraDirs.push( path.join( ctx.blocksDir, e.name, 'components' ) );
				}
			}
		}
		const compFiles = resolveComponentFiles( extraDirs );

		for ( const name of mounted ) {
			const file = compFiles.get( name );
			if ( ! file ) continue;
			// strippedText, never raw text: a component whose docblock merely
			// MENTIONS SgsLinkControl must not flag — the same comment trap this
			// rule already pins for edit.js via comment-mentions-sgslinkcontrol.
			const csrc = ctx.cache.strippedText( file );
			if ( ! csrc || ! /<SgsLinkControl\b/.test( csrc ) ) continue;
			findings.push(
				makeFinding( {
					rule: ruleId,
					block: block.slug,
					file,
					line: 0,
					severity: 'warn',
					detail:
						`${ block.slug } renders <${ name }>, and that component mounts the ` +
						`SUPERSEDED <SgsLinkControl> (${ file }). The control is invisible in ` +
						"this block's own edit.js, so it passed clean before 2026-08-19.",
					fix:
						`Fix it ONCE in ${ file }, replacing <SgsLinkControl> with ` +
						'<LinkPopoverField> — every block rendering that component is repaired by ' +
						'the single edit. Do NOT edit each block. If the shared mount is a reasoned ' +
						'exception, baseline it once against the component, not once per block.',
					keyParts: [ 'superseded-sgslinkcontrol-shared', name ],
				} )
			);
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/27-superseded-link-control',
		mustFlag: [ 'sgslinkcontrol-raw', 'shared-mount-flags' ],
		mustNotFlag: [
			'linkpopoverfield-used',
			'linkpopovercontent-used',
			'comment-mentions-sgslinkcontrol',
			'no-relevant-control',
			'shared-mount-comment-only',
		],
	},
};
