/**
 * Runs both checks over every block directory.
 */

'use strict';

const { checkEditorCanvasDesync } = require( './check-a-editor-canvas-desync' );
const { checkInvalidKeywordPassthrough } = require( './check-b-invalid-keyword' );
const { collectAllBlockDirs, loadKeywordTable, readDeclaredAttrs } = require( './lib-blocks' );

function runSurvey() {
	const keywordTable = loadKeywordTable();
	const dirs = collectAllBlockDirs();
	let findingsA = [];
	let findingsB = [];
	let scanned = 0;
	for ( const dir of dirs ) {
		const meta = readDeclaredAttrs( dir );
		if ( ! meta ) {
			continue;
		}
		scanned++;
		findingsA = findingsA.concat(
			checkEditorCanvasDesync( meta.name, dir, meta.attrs, meta.providesContextAttrs )
		);
		findingsB = findingsB.concat( checkInvalidKeywordPassthrough( meta.name, dir, keywordTable ) );
	}
	return { findingsA, findingsB, blockCount: scanned };
}

module.exports = {
	runSurvey,
};
