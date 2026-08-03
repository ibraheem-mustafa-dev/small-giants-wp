'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 20
// source=file evidence=row 20 verdict "ABSENT (claim FALSE)" — a repo-wide
// grep for `templateLock` across scripts/ + theme/ hit exactly one unrelated
// file (scripts/migrate-core-blocks/pairings/cover_pairing.py); confirmed
// independently by re-reading theme/sgs-theme/patterns/*.php live on
// 2026-08-03 (about-image-left.php etc. — none carry templateLock). Genuinely
// NEW detector; scope is theme pattern files, not blocks, so it is 'global'.
//
// REVISED 2026-08-03 after coordinator review demanded independent population
// measurement for every rule (per the rule-01 false green). Cross-checking
// this rule's first version (filename-prefix exclusion, `^framework-`)
// against an independent script found a REAL over-count: 43 reported vs a
// true population of 23. The prefix excluded only 3 files
// (framework-header-default.php etc.) while wrongly INCLUDING 20 chrome /
// component-builder patterns — header-*.php ×6, footer-*.php ×6,
// mega-*.php ×5, drawer-scratch.php — that are not "client page content" in
// the sense this checklist item means:
//   - header-*.php / footer-*.php wrap `sgs/site-header` / `sgs/site-footer`,
//     which hard-code `templateLock: 'all'` on their own InnerBlocks
//     directly in edit.js (confirmed live: src/blocks/site-header/edit.js:383,
//     src/blocks/site-footer/edit.js:232) — a pattern-level templateLock
//     would be redundant, the structural lock the checklist item cares about
//     already exists at the block.
//   - mega-*.php / drawer-scratch.php are single-purpose CPT builder-screen
//     patterns (sgs_mega_menu / sgs_drawer), not freely-inserted page
//     content.
//
// The grounded signal for "this is a chrome/component-builder pattern, not
// general page content" is the pattern's OWN declared `Post Types:` header
// field (confirmed live: every header/footer/mega/drawer pattern declares
// one — `sgs_header`/`sgs_footer`/`sgs_mega_menu`/`sgs_drawer`; every general
// content pattern, about-*.php through testimonials-*.php, leaves it blank).
// This replaces the filename-prefix guess entirely — it is not a heuristic
// on top of a heuristic, it is what the pattern file itself declares.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

const TEMPLATE_LOCK_RE = /"templateLock"\s*:\s*"[^"]+"/;
const POST_TYPES_HEADER_RE = /Post Types:\s*([^\r\n]*)/;

module.exports = {
	id: '20-pattern-template-lock',
	checklistItem: 20,
	title: 'Client-facing patterns set templateLock:"contentOnly"',
	scope: 'global',
	needs: [ 'text:patterns/*.php' ],
	run( ctx ) {
		const dir = ctx.patternsDir;
		if ( ! fs.existsSync( dir ) ) return [];

		const findings = [];
		for ( const name of fs.readdirSync( dir ) ) {
			if ( ! name.endsWith( '.php' ) ) continue;

			const full = path.join( dir, name );
			const text = ctx.text( full );
			if ( text == null ) continue;

			// A non-empty "Post Types:" header means this pattern is scoped to a
			// specific CPT builder screen (sgs_header/sgs_footer/sgs_mega_menu/
			// sgs_drawer) — site chrome or a single-purpose component builder, not
			// general client page content. Excluded by the pattern's OWN
			// declaration, not a filename guess.
			const ptMatch = text.match( POST_TYPES_HEADER_RE );
			const postTypes = ptMatch ? ptMatch[ 1 ].trim() : '';
			if ( postTypes ) continue;

			if ( TEMPLATE_LOCK_RE.test( text ) ) continue;

			findings.push(
				makeFinding( {
					rule: this.id,
					block: null,
					file: full,
					severity: 'warn',
					detail: `Client-facing pattern "${ name }" (no "Post Types:" header — general page content) declares no "templateLock" attribute on any block — a client can restructure or delete this pattern's content instead of only editing it.`,
					fix: 'Add "templateLock":"contentOnly" to the pattern\'s outermost wrapping block (e.g. the top-level sgs/container) so clients can edit content but not structure.',
					keyParts: [ name ],
				} )
			);
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/20-pattern-template-lock',
		mustFlag: [ 'client-pattern-unlocked' ],
		mustNotFlag: [ 'client-pattern-locked', 'chrome-builder-pattern' ],
	},
};
