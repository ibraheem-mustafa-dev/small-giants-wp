'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (Part F,
// anti-patterns) source=file evidence=live-read 2026-08-18.
//
// WHY THIS RULE EXISTS — the defect class no other gate can see.
//
// The ~52-segment prebuild chain, every inspector-scan rule before this one,
// and the deploy verify all answer "is what this block has CORRECT?". None
// answers "is the fix somebody already applied STILL THERE?". Proven live:
//
//   Commit 4a859e42 (2026-08-14) fixed the nested-panel double-title defect
//   (Spec 35 A5: 22 panels tree-wide nest a ToolsPanel inside a PanelBody and
//   17 print the same title twice) by adding className="sgs-nested-tools-panel"
//   in edit.js, paired with a rule in that block's editor.css that hides the
//   inner <h2>. Two UNRELATED commits then deleted the className again:
//     - c5acba10 (2026-08-16, a shadow migration)  -> button/edit.js
//     - f6f3c033 (2026-08-15, the colour rollout)  -> tabs/edit.js
//   Both landed through a green build. 25% of the fix was gone in 4 days and
//   nothing noticed, because the CSS half survived: an orphaned rule matching
//   nothing is not a syntax error, not a dead control, and not a style
//   violation. It is invisible to every correctness check by construction.
//
// THE ASSERTION. For each durability marker below, a block must reference it
// on BOTH sides or NEITHER. One side alone means half a fix:
//   CSS but no JS  -> the marker was deleted; the defect is BACK, silently.
//   JS but no CSS  -> the rule was deleted; the marker is inert.
//
// This generalises: any hand-applied fix that plants a greppable token in two
// places gets a free regression test by adding one row to DURABILITY_MARKERS.
// That is the point — the twelve fixes this repo lost all planted evidence in
// a commit body, which nothing executes.
//
// COMMENTS DO NOT COUNT, and that is load-bearing. The JS side reads
// ctx.cache.strippedText() (comment-blanked), never raw text: a marker inside
// a commented-out JSX attribute is a DELETED fix that a naive text search
// would score as present. The CSS side strips /* */ here for the same reason.
// Sibling precedent: core/sources.js's own STOP-GATE-COMMENT-STRIPPER, and
// the 2026-08-18 check-dead-controls incident (D661) where a comment-stripper
// bug swallowed 715 lines of hero/render.php and produced 24 false advisories.
//
// EXPECTED POPULATION, declared before the first live run per
// rules.json _meta.zeroIsAClaim: 7 blocks reference the marker; 2 FAIL
// (button, tabs — both CSS-without-JS) and 5 pass (decorative-image, label,
// option-picker, quote, testimonial). A zero from this rule on the live tree
// is a CLAIM requiring investigation, not a pass — the two known-failing
// sites exist in the tree right now and need no fixture mutation to prove the
// rule can fail (D659: never mutate a repo file as a test fixture).

const path = require( 'path' );
const fs = require( 'fs' );
const { makeFinding } = require( '../core/finding' );

// One row per hand-applied fix that plants a paired token. `js` and `css` are
// the files each half is expected to live in; `token` must appear in both or
// neither.
const DURABILITY_MARKERS = [
	{
		token: 'sgs-nested-tools-panel',
		js: [ 'edit.js' ],
		css: [ 'editor.css', 'style.css' ],
		plantedBy: '4a859e42',
		what: 'hides the duplicate inner ToolsPanel title when nested in a PanelBody (Spec 35 A5)',
	},
];

// CSS has no `//` line comments in the dialect this project writes, so a
// /* */ strip is sufficient and — unlike a shared JS stripper — cannot
// mis-handle a `//` inside a url() or a data URI.
function stripCssComments( src ) {
	return src.replace( /\/\*[\s\S]*?\*\//g, ' ' );
}

function countIn( text, token ) {
	if ( ! text ) return 0;
	return text.split( token ).length - 1;
}

module.exports = {
	id: '28-fix-durability',
	checklistItem: null,
	title: 'A previously-applied fix still has both halves (marker <-> stylesheet pairing)',
	scope: 'per-block',
	needs: [ 'text:edit.js' ],
	run( ctx, block ) {
		const blockDir = path.join( ctx.blocksDir, block.tail );
		const findings = [];

		for ( const marker of DURABILITY_MARKERS ) {
			let jsCount = 0;
			const jsFiles = [];
			for ( const name of marker.js ) {
				const file = path.join( blockDir, name );
				if ( ! fs.existsSync( file ) ) continue;
				// strippedText: a marker inside a comment is a DELETED fix.
				const stripped = ctx.cache.strippedText( file );
				const n = countIn(
					stripped === null || stripped === undefined
						? ''
						: stripped,
					marker.token
				);
				if ( n > 0 ) jsFiles.push( name );
				jsCount += n;
			}

			let cssCount = 0;
			const cssFiles = [];
			for ( const name of marker.css ) {
				const file = path.join( blockDir, name );
				if ( ! fs.existsSync( file ) ) continue;
				const n = countIn(
					stripCssComments(
						fs.readFileSync( file, 'utf8' )
					),
					marker.token
				);
				if ( n > 0 ) cssFiles.push( name );
				cssCount += n;
			}

			// Neither side references it: this block never had the fix. Not a
			// finding — the rule asserts PAIRING, never adoption. "Should this
			// block have the fix at all?" is D2's completeness question.
			if ( cssCount === 0 && jsCount === 0 ) continue;
			if ( cssCount > 0 && jsCount > 0 ) continue;

			if ( cssCount > 0 && jsCount === 0 ) {
				findings.push(
					makeFinding( {
						rule: this.id,
						block: block.slug,
						file: path.join( blockDir, cssFiles[ 0 ] ),
						severity: 'warn',
						detail: `${ block.slug } — "${ marker.token }" is styled in ${ cssFiles.join( ', ' ) } but emitted NOWHERE in ${ marker.js.join( '/' ) }. The fix planted by ${ marker.plantedBy } (${ marker.what }) has been deleted from the markup; the orphaned rule now matches nothing and the original defect is back, silently.`,
						fix: `Restore the marker in ${ marker.js[ 0 ] } (re-add className="${ marker.token }" to the element the rule targets), OR — if the fix is genuinely no longer wanted — delete the now-dead rule from ${ cssFiles.join( ', ' ) } in the same commit so the two halves stay in step.`,
						keyParts: [ 'stranded-css', marker.token ],
					} )
				);
				continue;
			}

			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: path.join( blockDir, jsFiles[ 0 ] ),
					severity: 'warn',
					detail: `${ block.slug } — "${ marker.token }" is emitted in ${ jsFiles.join( ', ' ) } but styled NOWHERE in ${ marker.css.join( '/' ) }. The marker is inert: it lands on the element and nothing acts on it, so ${ marker.what } is not happening.`,
					fix: `Add the paired rule to ${ marker.css[ 0 ] }, OR remove the inert className from ${ jsFiles[ 0 ] } in the same commit.`,
					keyParts: [ 'inert-marker', marker.token ],
				} )
			);
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/28-fix-durability',
		mustFlag: [ 'css-without-marker', 'marker-without-css', 'comment-only-marker-with-css' ],
		mustNotFlag: [ 'both-halves-present', 'neither-half-present' ],
	},
};
