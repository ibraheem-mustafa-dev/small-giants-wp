'use strict';

/**
 * ANTI-VACUITY PROOF, not a shipped part of the tool. Simulates a "dead
 * detector" (one that has stopped detecting `:hover` rules at all — the
 * failure mode the brief calls out: "a checker returning 0 findings looks
 * identical whether the tree is clean or the detector is dead") by
 * monkey-patching splitSelectorList to always report zero hover members,
 * then running it against the UNTRANSFORMED (dirty) fixture directory.
 *
 * If the dead detector also reports 0 findings on the dirty tree, that
 * proves 0-findings alone is not proof of a clean tree — and the REAL
 * check.js run against the same dirty tree (104 unguarded-motion findings,
 * see the report) proves the real detector is alive, not stubbed.
 */

const path = require( 'path' );
const Module = require( 'module' );

// Monkey-patch selector-split.js's export before audit.js requires it.
const selectorSplitPath = require.resolve( '../selector-split.js' );
delete require.cache[ selectorSplitPath ];
require.cache[ selectorSplitPath ] = {
	id: selectorSplitPath,
	filename: selectorSplitPath,
	loaded: true,
	exports: {
		splitSelectorList() {
			// dead detector: never finds a hover, focus, or ambiguous member
			return { hover: [], focus: [], other: [], ambiguous: [] };
		},
		FOCUS_PSEUDOS: new Set(),
	},
};

const transformPath = require.resolve( '../transform.js' );
delete require.cache[ transformPath ];
const auditPath = require.resolve( '../audit.js' );
delete require.cache[ auditPath ];
const { auditCss } = require( auditPath );

const fs = require( 'fs' );

const dirtyDir = path.resolve( __dirname, 'pre-transform-baseline', 'blocks' );
let totalFindings = 0;
let filesScanned = 0;

for ( const slug of fs.readdirSync( dirtyDir ) ) {
	const file = path.join( dirtyDir, slug, 'style.css' );
	if ( ! fs.existsSync( file ) ) {
		continue;
	}
	filesScanned++;
	const css = fs.readFileSync( file, 'utf8' );
	const result = auditCss( css, file );
	totalFindings += result.unguardedMotion.length + result.ambiguous.length + result.unclassified.length;
}

console.log( `[anti-vacuity] DEAD detector run over ${ filesScanned } DIRTY (untransformed) files: ${ totalFindings } findings reported.` );
console.log( '[anti-vacuity] Compare to the REAL detector over the same dirty tree: 104 unguarded-motion + 1 unclassified + 0 ambiguous = 105 findings (see report — post Ruling 1/2, run check.js on this same directory to reconfirm).' );
console.log(
	0 === totalFindings
		? '[anti-vacuity] CONFIRMED: a dead detector silently passes a dirty tree — 0 findings does NOT by itself mean "clean". Only a non-zero result on this same tree proves the detector is alive.'
		: '[anti-vacuity] UNEXPECTED: the monkey-patch did not actually disable detection — re-check the patch.'
);
