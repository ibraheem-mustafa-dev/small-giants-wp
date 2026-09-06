'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O
// §"THE PLACEMENT ORDER CONVENTION" (added alongside THE PLACEMENT RULE,
// 2026-08-27) + CO-28 ("Consistent ORDER of panels, clusters and controls").
// source=file evidence=live-read plugins/sgs-blocks/src/blocks/extensions/
// conditional-visibility.js:32-36 ("WordPress core's BlockInspector renders
// InspectorAdvancedControls ('Advanced') as a structurally separate,
// always-last slot after every InspectorControls panel... registering this
// extension LAST places 'Visibility conditions' immediately above 'Advanced'
// with no Advanced-panel hack") and src/blocks/extensions/index.js's import
// order (conditional-visibility.js registered after every other extension).
//
// WHY THIS RULE EXISTS. Bean settled the block-inspector ORDER convention
// (DOM order top-to-bottom/left-to-right; root level Styles->Colour->
// Typography; Advanced always last in Settings; Visibility conditions
// always second-from-last) on 2026-08-27. CO-28 already names this class of
// obligation and explicitly REFUSES to let anyone build a rule for the FULL
// ordering yet: "Do NOT build a rule from this entry yet... CO-28 does not
// start until Cross-cutting A's placement backlog is worked" (65/83 blocks
// have no InspectorControls group prop at all — 01-tab-group's own
// backlog). Sorting an unrouted pile into a canonical sequence is not a
// smaller version of that job, it is a different one that cannot start yet.
//
// The two PINNED positions are the one slice of the convention that does
// NOT depend on that backlog: "Advanced last" and "Visibility conditions
// second-from-last" are ALREADY true for every block, by construction, via
// one shared mechanism — src/blocks/extensions/conditional-visibility.js
// registers its "Visibility conditions" PanelBody into the default
// InspectorControls group, and it is imported LAST in extensions/index.js,
// so it lands immediately before core's own structurally-last
// InspectorAdvancedControls ("Advanced") slot on every block, regardless of
// how many other panels that block has or whether they carry a `group`
// prop. Nothing about the CO-28 backlog can move that relationship.
//
// WHAT CAN BREAK IT, and what this rule catches: a per-block edit.js that
// authors its OWN PanelBody literally titled "Advanced" or "Visibility
// conditions" inside the default (Settings) InspectorControls group. That
// panel is NOT the shared, structurally-pinned one — it is just another
// panel wherever the block's JSX happens to put it, so it silently breaks
// the "always last" / "always second-from-last" promise for that one block
// while looking, by name alone, like it keeps it. sgs/heading does exactly
// this today (edit.js:541, a bare <PanelBody title="Advanced"> holding an
// "Inherit style from parent" toggle, nowhere near InspectorAdvancedControls).
//
// WHAT THIS RULE DELIBERATELY DOES NOT ASSERT. It does not check DOM-order
// (top-to-bottom/left-to-right), the root-level Styles/Colour/Typography
// sequence, or CO-28's cluster/control-order clauses — none of those are
// statically decidable from JSX with acceptable precision (README's own
// warning: two regexes for one earlier ordering question returned 0 and
// 471 in opposite directions), and CO-28's hard dependency blocks scoping
// them anyway. This rule is narrow ON PURPOSE: it asserts only that no
// block-authored panel STEALS the two pinned NAMES away from the shared
// extension that actually owns the guarantee. A narrow rule that is always
// right beats a broad rule that is sometimes wrong.

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// Matches <PanelBody ...title="X"...> or <ToolsPanel ...title="X"...> with
// either a plain string literal or an i18n-wrapped __( 'X', 'sgs-blocks' )
// value. Deliberately does not try to resolve a computed/variable title —
// those are out of scope for a static name match and are simply not flagged
// (a false absence here is safe; the rule only ever claims what it can see).
const TITLE_RE = /<(PanelBody|ToolsPanel)\b[^>]*\btitle\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*__\(\s*['"]([^'"]*)['"])/g;

const PINNED = new Map( [
	[ 'advanced', {
		label: 'Advanced',
		why: 'Advanced is pinned LAST via the shared InspectorAdvancedControls slot (src/blocks/extensions/custom-css.js, block-defaults.js) — WordPress core renders that slot structurally after every InspectorControls panel on every block, with no group prop needed.',
		fixHow: 'move these controls into <InspectorAdvancedControls> (see src/blocks/extensions/custom-css.js for the pattern) so they land in the real, structurally-last Advanced tab',
	} ],
	[ 'visibility conditions', {
		label: 'Visibility conditions',
		why: 'Visibility conditions is pinned SECOND-FROM-LAST by the shared extension (src/blocks/extensions/conditional-visibility.js), which is registered last in extensions/index.js so it lands immediately above core\'s structurally-last Advanced slot on every block.',
		fixHow: 'delete this block-private panel and rely on the shared conditional-visibility extension, which already adds a "Visibility conditions" panel to every block',
	} ],
] );

module.exports = {
	id: '35-pinned-panel-position',
	checklistItem: null,
	title: 'A block never authors its own "Advanced" / "Visibility conditions" panel — those names are pinned to the shared extension',
	scope: 'per-block',
	needs: [ 'stripped:edit.js' ],
	run( ctx, block ) {
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const text = ctx.stripped( editFile );
		if ( text == null ) return [];

		const findings = [];
		TITLE_RE.lastIndex = 0;
		let m;
		while ( ( m = TITLE_RE.exec( text ) ) !== null ) {
			const tag = m[ 1 ];
			const title = ( m[ 2 ] ?? m[ 3 ] ?? m[ 4 ] ?? '' ).trim();
			const pinned = PINNED.get( title.toLowerCase() );
			if ( ! pinned ) continue;

			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: editFile,
					severity: 'warn',
					detail: `${ block.slug } authors its own <${ tag }> titled "${ title }" inside the default Settings group. ${ pinned.why } A block-private panel of this name is not that slot — it renders wherever this block's JSX places it, so it silently breaks the pinned-position guarantee for this one block while reading, by title alone, as if it keeps it.`,
					fix: `For "${ pinned.label }": ${ pinned.fixHow }.`,
					keyParts: [ title.toLowerCase() ],
				} )
			);
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/35-pinned-panel-position',
		mustFlag: [ 'own-advanced-panel', 'own-visibility-panel' ],
		mustNotFlag: [ 'uses-inspector-advanced-controls', 'unrelated-panel-titles' ],
	},
};
