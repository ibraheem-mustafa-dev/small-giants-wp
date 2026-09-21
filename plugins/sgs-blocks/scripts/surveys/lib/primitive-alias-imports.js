/**
 * primitive-alias-imports.js — the "unprefixed alias" half of the primitives-boundary gate.
 *
 * PROBLEM THIS EXISTS FOR
 * -----------------------
 * `src/components/primitives/index.js` re-exports every unstable WordPress primitive under a
 * clean, UNPREFIXED alias (`__experimentalToolsPanel as ToolsPanel`). On WordPress 7.1 the
 * unprefixed name does NOT exist on `wp.components` (measured live in the real block editor:
 * `typeof wp.components.ToolsPanel === 'undefined'`, while `__experimentalToolsPanel` is an
 * object). A file that imports `ToolsPanel` straight from `@wordpress/components` therefore
 * builds fine, then mounts `undefined` and crashes the editor with React error #130 the moment
 * the block is selected. `survey-experimental-imports.js --check` could not see it, because it
 * only matched the `__experimental*` spelling.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 *  - `loadAliases( barrelText )` derives the alias -> { package, experimental } table FROM the
 *    barrel itself (never hand-copied), so a new barrel export is policed the moment it lands.
 *    Only aliases of an `__experimental*` export are policed: the barrel's stable, unprefixed
 *    re-exports (`LineHeightControl`, `FontSizePicker`) have no experimental spelling to hide.
 *  - `findUnprefixedAliasImports( text, aliases )` returns every named import of a policed alias
 *    from the package the barrel takes it from (the package matters: `Text` is not a
 *    block-editor export, so `import { Text } from '@wordpress/block-editor'` is not a hit).
 *
 * EXEMPTIONS ARE DATA, EACH WITH A REASON, AND CHECKED FOR STALENESS (see UNPREFIXED_EXEMPT).
 *
 * Pure functions, no filesystem: the self-test and the jest test drive them directly.
 */

'use strict';

const parser = require( '@babel/parser' );

/**
 * Parse the barrel and return Map< alias, { pkg, experimental } > for every
 * `__experimental* as Alias` re-export.
 *
 * @param {string} barrelText Source of src/components/primitives/index.js.
 * @return {Map<string,{pkg:string,experimental:string}>} Policed aliases.
 */
function loadAliases( barrelText ) {
	const ast = parser.parse( barrelText, { sourceType: 'module', plugins: [ 'jsx' ] } );
	const aliases = new Map();
	for ( const node of ast.program.body ) {
		if ( node.type !== 'ExportNamedDeclaration' || ! node.source ) continue;
		for ( const spec of node.specifiers ) {
			const experimental = spec.local.name;
			if ( ! experimental.startsWith( '__experimental' ) ) continue;
			aliases.set( spec.exported.name, { pkg: node.source.value, experimental } );
		}
	}
	return aliases;
}

/**
 * Every named import of a policed alias from its own WordPress package.
 *
 * Uses a real parse (not a regex) so multi-line import lists, aliased locals, comments inside
 * the import block and either quote style are all handled without a per-shape regex. A file
 * that cannot be parsed at all yields no findings here (the build's own parse would fail loudly); a
 * recoverable error such as a duplicate binding still yields them.
 *
 * @param {string}                                         text    File source.
 * @param {Map<string,{pkg:string,experimental:string}>} aliases From loadAliases().
 * @return {Array<{name:string,local:string,pkg:string,experimental:string}>} Findings.
 */
function findUnprefixedAliasImports( text, aliases ) {
	let ast;
	try {
		// errorRecovery: a recoverable error (a duplicate binding, which is exactly what a half-done
		// migration produces) must not blank the result. Without it a file importing the name from BOTH
		// the barrel and WordPress parsed as an error and silently passed the gate.
		ast = parser.parse( text, { sourceType: 'module', plugins: [ 'jsx', 'typescript' ], errorRecovery: true } );
	} catch ( err ) {
		// An unrecoverable syntax error: the build's own parse fails loudly, so nothing to add here.
		return [];
	}
	const found = [];
	for ( const node of ast.program.body ) {
		if ( node.type !== 'ImportDeclaration' ) continue;
		for ( const spec of node.specifiers ) {
			if ( spec.type !== 'ImportSpecifier' ) continue;
			const name = spec.imported.name || spec.imported.value;
			const alias = aliases.get( name );
			if ( ! alias || alias.pkg !== node.source.value ) continue;
			found.push( { name, local: spec.local.name, pkg: node.source.value, experimental: alias.experimental } );
		}
	}
	return found;
}

/**
 * Accepted debt: a direct unprefixed import that is KNOWN to resolve today.
 *
 * Key = alias name; value = { reason, files: [ path relative to src/ ] }. Every entry is
 * visible in `--survey`, and `--check` fails if an entry no longer matches a real import (a stale
 * exemption reads as "handled" while pointing at nothing).
 *
 * BoxControl: verified live 2026-09-21 on the WP 7.1 editor that `wp.components.BoxControl` is a
 * defined function (core stabilised it), so these imports work today. They still bypass the
 * boundary, so they are listed here until each file's import is moved to
 * `components/primitives` (a one-line change per file, no behaviour change).
 */
const UNPREFIXED_EXEMPT = {
	BoxControl: {
		reason:
			'unprefixed BoxControl is a defined function on WP 7.1 (measured live in the block editor 2026-09-21), so it does not crash; migrate each file to components/primitives',
		files: [
			'blocks/container/components/GridItemDefaultsPanel.js',
			'blocks/cta-section/edit.js',
			'blocks/hero/edit.js',
			'blocks/physics-canvas/edit.js',
			'blocks/site-footer/edit.js',
			'blocks/site-header/edit.js',
			'blocks/trust-bar/edit.js',
			'components/ResponsiveBoxControls.js',
		],
	},
};

/**
 * @param {string} name Alias name.
 * @param {string} rel  File path relative to src/, POSIX separators.
 * @return {boolean} True when this exact import is a recorded, reasoned exemption.
 */
function isExempt( name, rel ) {
	const entry = UNPREFIXED_EXEMPT[ name ];
	return Boolean( entry && entry.files.includes( rel ) );
}

module.exports = { loadAliases, findUnprefixedAliasImports, UNPREFIXED_EXEMPT, isExempt };
