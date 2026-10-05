/**
 * Paths, the shared component-file map and the Babel options every check reads.
 */

'use strict';

const path = require( 'path' );
const { resolveComponentFiles } = require( '../inspector-scan/core/components' );

// R3-a (2026-08-20): the shared name -> file resolver, used to widen CHECK
// A's corpus past `edit.js` alone to also cover any shared component file it
// mounts via JSX (e.g. `<WidthPanel .../>`) — see the R-3 register
// (`.claude/plans/phase-shop-container-remediation.md` R3-a). Computed once;
// resolveComponentFiles() walks the filesystem.
const COMPONENT_FILE_MAP = resolveComponentFiles();
const JSX_TAG_RE = /<([A-Z]\w*)\b/g;


const ROOT = path.join( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const SCRIPTS_DIR = path.join( ROOT, 'scripts' );
const KEYWORD_TABLE_PATH = path.join( SCRIPTS_DIR, 'css-keyword-enums.json' );
const BASELINE_FILE = path.join( SCRIPTS_DIR, 'editor-render-parity-baseline.json' );


// Same parser + plugin set as check-duplicate-controls.js (this project's own
// AST-tooling precedent) — reused rather than introducing a new dependency.
const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [
		'jsx',
		'classProperties',
		'objectRestSpread',
		'optionalChaining',
		'nullishCoalescingOperator',
		'dynamicImport',
	],
	errorRecovery: true,
};

module.exports = {
	BABEL_PARSE_OPTS,
	BASELINE_FILE,
	BLOCKS_DIR,
	COMPONENT_FILE_MAP,
	JSX_TAG_RE,
	KEYWORD_TABLE_PATH,
	ROOT,
};
