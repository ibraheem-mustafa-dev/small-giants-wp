'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §1 COLOUR /
// §2 LINK. Canonical colour control = `DesignTokenPicker` (the thin swatch row whose picker
// pops out); canonical link control = `LinkPopoverControl`. Everything underneath them is
// banned in any other file: a raw palette, picker or gradient control renders inline in the
// sidebar, which is the shape Bean ruled out for every colour control.
//
// WHAT IT READS. Every `.js`/`.jsx` file under `src/` (blocks, components at any depth,
// shared, utils, extensions), skipping `node_modules`, `build`, `__tests__`, `__mocks__`
// and test files. The roster is not consulted: a shared component reached by thirty blocks
// is as much a violation as a block's own edit.js.
//
// WHAT IT FLAGS (by import, so an alias cannot hide it, plus JSX):
//   - an import of a banned core colour component from `@wordpress/components` or
//     `@wordpress/block-editor`, under any local name (`ColorPicker as P` is flagged);
//   - an import from an SGS fork module (`components/colour-picker/**`,
//     `components/gradient-picker/**`), except a style asset (`.css`/`.scss`) or the fork's
//     own `utils` helpers, which are not controls;
//   - an import, from any module, of a name the SGS forks export through the components
//     index (`SgsGradientPicker`, `CustomColorPickerDropdown`, and every other name
//     `components/index.js` re-exports from a fork), so the index is no back door;
//   - a JSX tag whose name is a banned colour component (covers `<wp.components.ColorPicker>`
//     and a component pulled off a namespace import) when the same file did not already
//     get an import finding for it;
//   - a member read of a banned colour or link component off a namespace (`import * as C`,
//     `wp.components`, `window.wp.blockEditor`, `require( '@wordpress/components' )`), which
//     covers `const P = C.ColorPalette`, `createElement( C.ColorPalette )` and a destructure
//     `const { ColorPicker } = C`;
//   - `createElement( ColorPalette )` with a banned name that has no import;
//   - a re-export: `export { ColorPicker } from '@wordpress/components'` (any alias),
//     `export * from '@wordpress/components'`, and `export { x } from` / `export * from` an
//     SGS fork module, so a barrel cannot launder a banned control;
//   - `<input type="color">`;
//   - a `URLInput` / `LinkControl` import, member read or tag in ANY file under `src/` (the
//     link contract), except the canonical link wrapper's own internals
//     (`components/LinkPopoverControl.js`, `components/LinkPopoverContent.js`).
//
// ALLOWLIST (relative to `src/components/`): `DesignTokenPicker.js`,
// `GradientCapableColourControl.js`, `colour-picker/**`, `gradient-picker/**` and
// `index.js`. They are the helpers' own internals; `index.js` only re-exports.
//
// BLIND SPOTS, declared: a component selected at run time from a registry, a computed
// member name built from a non-literal, and a dynamic JSX tag held in a variable are not seen; an unparseable file is
// reported as a finding rather than skipped.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

const REAL_COMPONENTS_INDEX = path.resolve( __dirname, '..', '..', '..', 'src', 'components', 'index.js' );

const WP_SOURCES = new Set( [ '@wordpress/components', '@wordpress/block-editor' ] );

const RAW_COLOUR_COMPONENT_NAMES = new Set( [
	'ColorPalette',
	'ColorPicker',
	'GradientPicker',
	'ColorGradientControl',
	'__experimentalColorGradientControl',
	'PanelColorSettings',
	'PanelColorGradientSettings',
	'__experimentalPanelColorGradientSettings',
] );

const RAW_LINK_COMPONENT_NAMES = new Set( [ 'URLInput', 'LinkControl' ] );

// Exports of the SGS fork modules that are always banned outside the allowlist.
const FORK_EXPORT_NAMES = [ 'SgsGradientPicker', 'CustomColorPickerDropdown' ];

const FORK_PATH_RE = /(^|\/)(colour-picker|gradient-picker)(\/|$)/;
const STYLE_ASSET_RE = /\.s?css$/i;
const FORK_HELPER_RE = /(colour-picker|gradient-picker)\/(?:.*\/)?utils(?:\/.*|\.js)?$/;

const SKIPPED_DIRS = new Set( [ 'node_modules', 'build', '__tests__', '__mocks__' ] );
const TEST_FILE_RE = /\.(test|spec)\.[jt]sx?$/;

// The canonical link wrapper's own internals mount core LinkControl by design.
const LINK_INTERNAL_FILES = new Set( [ 'LinkPopoverControl.js', 'LinkPopoverContent.js' ] );

const WP_GLOBAL_KEYS = new Set( [ 'components', 'blockEditor' ] );

const CANONICAL_FOR = new Map( [
	[ 'URLInput', 'LinkPopoverControl' ],
	[ 'LinkControl', 'LinkPopoverControl' ],
] );

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

function importedName( specifier ) {
	if ( specifier.type !== 'ImportSpecifier' ) return null;
	const imported = specifier.imported;
	if ( ! imported ) return null;
	return imported.type === 'StringLiteral' ? imported.value : imported.name;
}

function walk( dir, out ) {
	let entries;
	try {
		entries = fs.readdirSync( dir, { withFileTypes: true } );
	} catch ( e ) {
		return;
	}
	entries.sort( ( a, b ) => ( a.name < b.name ? -1 : 1 ) );
	for ( const entry of entries ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			if ( ! SKIPPED_DIRS.has( entry.name ) ) walk( full, out );
		} else if ( /\.jsx?$/.test( entry.name ) && ! TEST_FILE_RE.test( entry.name ) ) {
			out.push( full );
		}
	}
}

// Names `components/index.js` re-exports from an SGS fork module, read from the real index
// (never a fixture) so a newly re-exported fork control is banned without editing this rule.
function forkNamesFromIndex( ctx, indexFile = REAL_COMPONENTS_INDEX ) {
	const names = new Set( FORK_EXPORT_NAMES );
	if ( ! fs.existsSync( indexFile ) ) return names;
	ctx.cache.traverse( indexFile, {
		// `export * from './colour-picker'` re-exports every named export of the fork module.
		ExportAllDeclaration( nodePath ) {
			const source = nodePath.node.source.value;
			if ( ! FORK_PATH_RE.test( source ) || FORK_HELPER_RE.test( source ) ) return;
			const base = path.resolve( path.dirname( indexFile ), source );
			const target = [ base, `${ base }.js`, path.join( base, 'index.js' ) ].find(
				( candidate ) => fs.existsSync( candidate ) && fs.statSync( candidate ).isFile()
			);
			if ( ! target ) return;
			ctx.cache.traverse( target, {
				ExportNamedDeclaration( inner ) {
					const decl = inner.node.declaration;
					if ( decl && decl.id ) names.add( decl.id.name );
					if ( decl && decl.declarations ) {
						decl.declarations.forEach( ( d ) => d.id && d.id.name && names.add( d.id.name ) );
					}
					for ( const spec of inner.node.specifiers || [] ) {
						if ( spec.exported ) names.add( spec.exported.name || spec.exported.value );
					}
				},
			} );
		},
		ExportNamedDeclaration( nodePath ) {
			const node = nodePath.node;
			if ( ! node.source || ! FORK_PATH_RE.test( node.source.value ) ) return;
			if ( FORK_HELPER_RE.test( node.source.value ) ) return;
			for ( const spec of node.specifiers || [] ) {
				if ( spec.exported ) names.add( spec.exported.name || spec.exported.value );
			}
		},
	} );
	return names;
}

function isAllowlisted( file, componentsDir ) {
	const rel = path.relative( componentsDir, file ).split( path.sep ).join( '/' );
	if ( rel.startsWith( '..' ) ) return false;
	return (
		'DesignTokenPicker.js' === rel ||
		'GradientCapableColourControl.js' === rel ||
		'index.js' === rel ||
		rel.startsWith( 'colour-picker/' ) ||
		rel.startsWith( 'gradient-picker/' )
	);
}

function blockOf( file, blocksDir ) {
	const rel = path.relative( blocksDir, file ).split( path.sep );
	if ( rel.length < 2 || rel[ 0 ] === '..' ) return null;
	return fs.existsSync( path.join( blocksDir, rel[ 0 ], 'block.json' ) ) ? `sgs/${ rel[ 0 ] }` : null;
}

function propertyName( node ) {
	if ( ! node ) return null;
	if ( node.type === 'Identifier' ) return node.name;
	if ( node.type === 'StringLiteral' ) return node.value;
	return null;
}

function memberName( node ) {
	if ( node.computed ) return node.property.type === 'StringLiteral' ? node.property.value : null;
	return propertyName( node.property );
}

// True when `node` evaluates to the `@wordpress/components` / `@wordpress/block-editor` module
// object: a namespace-import binding, `wp.components`, `window.wp.blockEditor`, or a
// `require( '@wordpress/…' )` call.
function isWpNamespace( node, nsNames ) {
	if ( ! node ) return false;
	if ( node.type === 'Identifier' ) return nsNames.has( node.name );
	if ( node.type === 'CallExpression' ) {
		return (
			node.callee.type === 'Identifier' &&
			'require' === node.callee.name &&
			node.arguments.length > 0 &&
			node.arguments[ 0 ].type === 'StringLiteral' &&
			WP_SOURCES.has( node.arguments[ 0 ].value )
		);
	}
	if ( node.type === 'MemberExpression' ) {
		const key = memberName( node );
		if ( ! WP_GLOBAL_KEYS.has( key ) ) return false;
		const obj = node.object;
		if ( obj.type === 'Identifier' ) return 'wp' === obj.name;
		return (
			obj.type === 'MemberExpression' &&
			'wp' === memberName( obj ) &&
			obj.object.type === 'Identifier' &&
			[ 'window', 'globalThis', 'self' ].includes( obj.object.name )
		);
	}
	return false;
}

module.exports = {
	id: '24-raw-canonical-component',
	checklistItem: null,
	title:
		'A raw colour / gradient / link component the control-type contract BANS (Spec 35 §1/§2) must not be ' +
		'imported or rendered outside DesignTokenPicker and the shared colour helpers — every colour control is ' +
		'the swatch row whose picker pops out',
	scope: 'global',
	forkNamesFromIndex,
	needs: [ 'ast:src/**/*.js' ],
	run( ctx ) {
		if ( ! ctx.componentsDir ) return [];
		const srcDir = path.dirname( ctx.componentsDir );
		const files = [];
		walk( srcDir, files );
		const forkNames = forkNamesFromIndex( ctx );
		return files
			.filter( ( file ) => ! isAllowlisted( file, ctx.componentsDir ) )
			.flatMap( ( file ) => this.runFile( ctx, file, forkNames ) );
	},
	runFile( ctx, file, forkNames ) {
		const ruleId = this.id;
		const findings = [];
		const block = blockOf( file, ctx.blocksDir );
		const isEditFile = 'edit.js' === path.basename( file );
		const importFlagged = new Set();

		const push = ( kind, name, line, detail, fix ) =>
			findings.push(
				makeFinding( {
					rule: ruleId,
					block,
					file,
					line,
					severity: 'warn',
					detail: `${ file }:${ line } — ${ detail }`,
					fix,
					keyParts: [ 'raw-canonical-component', kind, name, String( line ) ],
				} )
			);

		const colourFix = ( name ) =>
			`Replace ${ name } with the shared DesignTokenPicker (a thin swatch row whose palette pops out; ` +
			'pass `states` for several states) or SgsColourPanel / GradientCapableColourControl for a gradient ' +
			'(src/components/). If this really is a deliberate, reasoned exception, register it in ' +
			'baselines/24-raw-canonical-component.json with a specific reason.';

		const nsNames = new Set();
		const seen = new Set();
		const linkExempt = LINK_INTERNAL_FILES.has( path.basename( file ) ) && ! isEditFile;

		const linkFix = ( name ) => {
			const canonical = CANONICAL_FOR.get( name );
			return `Replace ${ name } with the shared ${ canonical } component (src/components/${ canonical }.js) — it already carries the required props, accessibility and internal-content search, new-tab and rel handling that a raw ${ name } lacks. If this really is a deliberate, reasoned exception, register it in baselines/24-raw-canonical-component.json with a specific reason.`;
		};

		// One finding per (kind, name, line), whichever visitor reaches it first.
		const flagBanned = ( name, kind, line, how ) => {
			const id = `${ kind }:${ name }:${ line }`;
			if ( seen.has( id ) ) return;
			seen.add( id );
			if ( RAW_COLOUR_COMPONENT_NAMES.has( name ) ) {
				push(
					kind,
					name,
					line,
					`${ name } is reached ${ how }. It is a BANNED raw colour component under the COLOUR control-type contract (Spec 35 §1.3): it renders an inline palette instead of the swatch row whose picker pops out.`,
					colourFix( name )
				);
				return;
			}
			const canonical = CANONICAL_FOR.get( name );
			push(
				kind,
				name,
				line,
				`${ name } is reached ${ how }. It is a BANNED lookalike under the LINK control-type contract (Spec 35 §2.3): it renders directly instead of going through the canonical ${ canonical } wrapper component.`,
				linkFix( name )
			);
		};

		const isBanned = ( name ) =>
			RAW_COLOUR_COMPONENT_NAMES.has( name ) || ( ! linkExempt && RAW_LINK_COMPONENT_NAMES.has( name ) );

		const ok = ctx.cache.traverse( file, {
			ImportDeclaration( nodePath ) {
				const node = nodePath.node;
				const source = node.source.value;
				const line = node.loc ? node.loc.start.line : 0;

				if ( WP_SOURCES.has( source ) ) {
					for ( const spec of node.specifiers ) {
						if ( spec.type !== 'ImportSpecifier' ) {
							nsNames.add( spec.local.name );
							continue;
						}
						const name = importedName( spec );
						if ( ! name || ! isBanned( name ) ) continue;
						importFlagged.add( name );
						flagBanned( name, 'wp-import', line, `by an import from ${ source }` );
					}
					return;
				}

				if ( FORK_PATH_RE.test( source ) ) {
					if ( STYLE_ASSET_RE.test( source ) || FORK_HELPER_RE.test( source ) ) return;
					push(
						'fork-import',
						source,
						line,
						`an import from the SGS colour/gradient fork "${ source }". The forks are the internals of DesignTokenPicker and GradientCapableColourControl; mounting them elsewhere renders an inline palette or gradient bar.`,
						colourFix( source )
					);
					return;
				}

				for ( const spec of node.specifiers ) {
					const name = importedName( spec );
					if ( ! name || ! forkNames.has( name ) ) continue;
					importFlagged.add( name );
					push(
						'fork-name-import',
						name,
						line,
						`${ name } (an SGS colour/gradient fork export) is imported from "${ source }". It renders an inline picker; only the shared colour controls may mount it.`,
						colourFix( name )
					);
				}
			},
			ExportNamedDeclaration( nodePath ) {
				const node = nodePath.node;
				if ( ! node.source ) return;
				const source = node.source.value;
				const line = node.loc ? node.loc.start.line : 0;
				if ( WP_SOURCES.has( source ) ) {
					for ( const spec of node.specifiers || [] ) {
						const name = spec.local && ( spec.local.name || spec.local.value );
						if ( name && isBanned( name ) ) {
							flagBanned( name, 'wp-reexport', line, `by a re-export from ${ source }` );
						}
					}
					return;
				}
				if ( FORK_PATH_RE.test( source ) && ! STYLE_ASSET_RE.test( source ) && ! FORK_HELPER_RE.test( source ) ) {
					push(
						'fork-reexport',
						source,
						line,
						`a re-export from the SGS colour/gradient fork "${ source }". A re-export hands the fork's inline picker to every importer of this file.`,
						colourFix( source )
					);
				}
			},
			ExportAllDeclaration( nodePath ) {
				const node = nodePath.node;
				const source = node.source.value;
				const line = node.loc ? node.loc.start.line : 0;
				if ( WP_SOURCES.has( source ) ) {
					push(
						'wp-export-all',
						source,
						line,
						`\`export * from "${ source }"\` re-exports every banned raw colour and link component that module carries.`,
						colourFix( source )
					);
					return;
				}
				if ( FORK_PATH_RE.test( source ) && ! STYLE_ASSET_RE.test( source ) && ! FORK_HELPER_RE.test( source ) ) {
					push(
						'fork-export-all',
						source,
						line,
						`\`export * from "${ source }"\` re-exports the SGS colour/gradient fork's inline pickers through a barrel.`,
						colourFix( source )
					);
				}
			},
			VariableDeclarator( nodePath ) {
				const node = nodePath.node;
				if ( ! isWpNamespace( node.init, nsNames ) ) return;
				if ( node.id.type === 'Identifier' ) {
					nsNames.add( node.id.name );
					return;
				}
				if ( node.id.type !== 'ObjectPattern' ) return;
				for ( const prop of node.id.properties ) {
					if ( prop.type !== 'ObjectProperty' || prop.computed ) continue;
					const name = propertyName( prop.key );
					if ( ! name || ! isBanned( name ) ) continue;
					flagBanned( name, 'destructure', prop.loc ? prop.loc.start.line : 0, 'by destructuring the WordPress module object' );
				}
			},
			MemberExpression( nodePath ) {
				const node = nodePath.node;
				if ( ! isWpNamespace( node.object, nsNames ) ) return;
				const name = memberName( node );
				if ( ! name || ! isBanned( name ) ) return;
				flagBanned( name, 'member', node.loc ? node.loc.start.line : 0, 'as a member of the WordPress module object' );
			},
			CallExpression( nodePath ) {
				const node = nodePath.node;
				const callee = node.callee;
				const isCreateElement =
					( callee.type === 'Identifier' && 'createElement' === callee.name ) ||
					( callee.type === 'MemberExpression' && 'createElement' === memberName( callee ) );
				if ( ! isCreateElement || ! node.arguments.length ) return;
				const first = node.arguments[ 0 ];
				if ( first.type === 'Identifier' && isBanned( first.name ) && ! importFlagged.has( first.name ) ) {
					flagBanned( first.name, 'create-element', node.loc ? node.loc.start.line : 0, 'by createElement' );
				}
			},
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( ! name ) return;
				const line = node.loc ? node.loc.start.line : 0;

				if ( 'input' === name ) {
					const isColourInput = ( node.attributes || [] ).some(
						( attr ) =>
							attr.type === 'JSXAttribute' &&
							attr.name &&
							'type' === attr.name.name &&
							attr.value &&
							'color' === attr.value.value
					);
					if ( isColourInput ) {
						push(
							'input-color',
							'input',
							line,
							'a raw <input type="color"> is a browser colour well, not the swatch row whose picker pops out.',
							colourFix( '<input type="color">' )
						);
					}
					return;
				}

				if ( RAW_COLOUR_COMPONENT_NAMES.has( name ) && ! importFlagged.has( name ) ) {
					push(
						'jsx',
						name,
						line,
						`raw <${ name }> is a BANNED lookalike under the COLOUR control-type contract (Spec 35 §1.3).`,
						colourFix( name )
					);
					return;
				}

				if ( isEditFile && RAW_LINK_COMPONENT_NAMES.has( name ) && ! importFlagged.has( name ) ) {
					const canonical = CANONICAL_FOR.get( name );
					push(
						'jsx',
						name,
						line,
						`raw <${ name }> is a BANNED lookalike under the LINK control-type contract (Spec 35 §2.3). It renders directly here instead of going through the canonical ${ canonical } wrapper component.`,
						linkFix( name )
					);
				}
			},
		} );

		if ( ! ok ) {
			const parsed = ctx.cache.parse( file );
			if ( parsed.error && 'file-not-found' !== parsed.error ) {
				findings.push(
					makeFinding( {
						rule: ruleId,
						block,
						file,
						line: 0,
						severity: 'warn',
						detail: `${ file } could not be parsed (${ parsed.error }); a banned component in it would be invisible to this rule.`,
						fix: 'Fix the syntax error so the file parses.',
						keyParts: [ 'raw-canonical-component', 'unparseable' ],
					} )
				);
			}
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/24-raw-canonical-component',
		mustFlag: [
			'colorpalette-raw',
			'colorpalette-raw-with-alpha',
			'urlinput-raw',
			'linkcontrol-raw',
			'shadow-like-palette',
			'aliased-colour-picker',
			'gradient-index-import',
			'raw-colour-input',
			'fork-module-import',
			'panel-colour-settings',
			'shared-colour-user',
			// Evasions: a banned member reached off a namespace, `wp.components`, a destructure,
			// a re-export or a barrel, and a link component imported outside edit.js.
			'ns-alias-colorpalette',
			'createelement-member',
			'wp-global-createelement',
			'destructure-wp-global',
			'createelement-bare-name',
			'reexport-wp-named',
			'reexport-wp-alias',
			'export-all-fork-barrel',
			'export-all-wp-barrel',
			'link-import-in-component',
			'link-member-in-component',
		],
		mustNotFlag: [
			'designtokenpicker-used',
			'sgslinkcontrol-used',
			'substring-name-not-banned',
			'comment-mentions-banned-names',
			'no-relevant-control',
			'DesignTokenPicker',
			'color-palette',
			'uses-token-picker-only',
			'style-asset-import',
			'fork-utils-import',
			'text-input-not-colour',
			'namespace-non-banned-member',
			// The canonical link wrapper's own internals may mount core LinkControl.
			'LinkPopoverContent',
		],
	},
};
