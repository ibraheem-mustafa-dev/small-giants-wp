'use strict';

// An inspector fill nested inside a fill that belongs to a DIFFERENT inspector tab never renders.
//
// MECHANISM (Gutenberg source, read 2026-10-13):
//   - `packages/components/src/tabs/tabpanel.tsx` renders `{ selectedId === instancedTabId && children }`,
//     so only the active tab's panel, and the `<InspectorControls.Slot>` elements inside it, is mounted.
//   - `packages/block-editor/src/components/inspector-controls-tabs/settings-tab.jsx` mounts the default
//     (alias `settings`) and `bindings` slots, with the Advanced panel (`advanced`, `position`) below them;
//     `styles-tab.jsx` mounts `typography`, `color`, `background`, `filter`, `layout`, `dimensions`,
//     `border`, `elements` and `styles`.
//   - `inspector-controls/fill.jsx` renders its children through the group's `<Fill>`, which paints only
//     while its slot is mounted.
//   So `<InspectorControls>` (Settings) wrapping, at any depth and through any number of components,
//   an `<InspectorControls group="styles">` (for example the one `SgsColourPanel` renders) can never
//   show the inner controls: on the Settings tab the inner fill has no slot, and on the Styles tab the
//   outer fill is not rendered, so the inner fill is never mounted. A nav-drawer editor showed exactly
//   this: "Close button background", "Logo box background" and the other top-row colour rows appeared
//   on neither tab.
//
// WHAT THIS RULE CHECKS. Per block, across edit.js and every in-block file it imports (ctx.editFiles):
//   1. Sinks: every `<InspectorControls group=…>` / `<InspectorAdvancedControls>` JSX element, and every
//      mount of a shared `src/components/` component whose own source routes to a group
//      (`core/components.js` `selfRoutesGroup`, e.g. SgsColourPanel -> styles).
//   2. Ancestors: the inspector fills that enclose the sink inside its own top-level function, then,
//      for that function, every place it is mounted (JSX `<Name>` or a call `name(…)`) in the block's
//      files, recursively, collecting the enclosing fills at each mount.
//   3. A finding when any ancestor fill's TAB differs from the sink's tab. Fills on the same tab
//      (`styles` inside `color`, `default` inside `default`) render and are not flagged.
//
// BLIND SPOTS (declared): a component handed over as a value (a prop, an array of components) rather
// than mounted by name is not followed, so its mounts count as top level; a dynamic `group={ x }` is
// recorded as tab "unknown" and flagged against any other tab; components outside the block folder
// other than the self-routing shared ones in src/components/ are not followed.

const path = require( 'path' );
const fs = require( 'fs' );
const { makeFinding } = require( '../core/finding' );

// Inspector group -> the tab whose panel mounts its slot (see MECHANISM above).
const GROUP_TAB = {
	default: 'settings',
	settings: 'settings',
	bindings: 'settings',
	advanced: 'settings',
	position: 'settings',
	styles: 'styles',
	color: 'styles',
	background: 'styles',
	filter: 'styles',
	layout: 'styles',
	dimensions: 'styles',
	border: 'styles',
	elements: 'styles',
	typography: 'styles',
	effects: 'styles',
	content: 'content',
	list: 'list',
};

function tabOf( group ) {
	return GROUP_TAB[ group ] || 'unknown';
}

function jsxName( openingElement ) {
	const n = openingElement && openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' && n.property ) return n.property.name;
	return null;
}

// The group an inspector fill element routes to, or null when the element is not one.
function fillGroup( openingElement ) {
	const name = jsxName( openingElement );
	if ( name === 'InspectorAdvancedControls' ) return 'advanced';
	if ( name !== 'InspectorControls' ) return null;
	const attr = ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === 'group'
	);
	if ( ! attr ) return 'default';
	const v = attr.value;
	if ( v && v.type === 'StringLiteral' ) return v.value;
	if ( v && v.type === 'JSXExpressionContainer' && v.expression.type === 'StringLiteral' ) {
		return v.expression.value;
	}
	return 'dynamic';
}

// The groups of every inspector fill enclosing nodePath, innermost first, excluding nodePath itself.
function enclosingGroups( nodePath ) {
	const groups = [];
	let p = nodePath.parentPath;
	while ( p ) {
		if ( p.isJSXElement() ) {
			const g = fillGroup( p.node.openingElement );
			if ( g ) groups.push( g );
		}
		p = p.parentPath;
	}
	return groups;
}

// The name of the top-level function (component or helper) enclosing nodePath, or null at module level.
function topLevelFunctionName( nodePath ) {
	let fn = null;
	let p = nodePath.parentPath;
	while ( p ) {
		if ( p.isFunction() ) fn = p;
		p = p.parentPath;
	}
	if ( ! fn ) return null;
	if ( fn.isFunctionDeclaration() ) {
		if ( fn.node.id ) return fn.node.id.name;
		return fn.parentPath && fn.parentPath.isExportDefaultDeclaration() ? 'default' : null;
	}
	const parent = fn.parentPath;
	if ( parent && parent.isVariableDeclarator() && parent.node.id.type === 'Identifier' ) {
		return parent.node.id.name;
	}
	if ( parent && parent.isExportDefaultDeclaration() ) return 'default';
	// A wrapped definition such as `const X = memo( () => … )`.
	const decl = fn.findParent( ( q ) => q.isVariableDeclarator() );
	if ( decl && decl.node.id.type === 'Identifier' ) return decl.node.id.name;
	return null;
}

function resolveImport( fromFile, spec, fileSet ) {
	if ( ! spec.startsWith( '.' ) ) return null;
	const base = path.resolve( path.dirname( fromFile ), spec );
	for ( const cand of [ base, `${ base }.js`, path.join( base, 'index.js' ) ] ) {
		if ( fileSet.has( cand ) ) return cand;
	}
	return null;
}

// Per-file symbol table: local name -> function key, and export name -> local name.
function fileSymbols( ast ) {
	const locals = new Set();
	const exportsByName = {};
	for ( const stmt of ast.program.body ) {
		let decl = stmt;
		if ( stmt.type === 'ExportNamedDeclaration' && stmt.declaration ) decl = stmt.declaration;
		if ( stmt.type === 'ExportDefaultDeclaration' ) {
			const d = stmt.declaration;
			if ( d.type === 'Identifier' ) exportsByName.default = d.name;
			else if ( ( d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration' ) && d.id ) {
				locals.add( d.id.name );
				exportsByName.default = d.id.name;
			} else {
				locals.add( 'default' );
				exportsByName.default = 'default';
			}
			continue;
		}
		if ( decl.type === 'FunctionDeclaration' && decl.id ) {
			locals.add( decl.id.name );
			if ( decl !== stmt ) exportsByName[ decl.id.name ] = decl.id.name;
		}
		if ( decl.type === 'VariableDeclaration' ) {
			for ( const d of decl.declarations ) {
				if ( d.id.type !== 'Identifier' ) continue;
				locals.add( d.id.name );
				if ( decl !== stmt ) exportsByName[ d.id.name ] = d.id.name;
			}
		}
		if ( stmt.type === 'ExportNamedDeclaration' && ! stmt.source ) {
			for ( const s of stmt.specifiers || [] ) {
				if ( s.exported && s.local ) exportsByName[ s.exported.name || s.exported.value ] = s.local.name;
			}
		}
	}
	return { locals, exportsByName };
}

/**
 * Builds the block's mount graph and returns every sink whose enclosing fills sit on another tab.
 *
 * @param {Object}   ctx   Scan context.
 * @param {string[]} files The block's edit files.
 * @return {Array<{file:string,line:number,sink:string,group:string,ancestors:string[],via:string[]}>} Crossings.
 */
function findCrossings( ctx, files ) {
	const fileSet = new Set( files.map( ( f ) => path.resolve( f ) ) );
	const shared = ctx.components && ctx.components.ok ? ctx.components.exportsMap : {};
	const tables = new Map();
	for ( const f of files ) {
		const parsed = ctx.cache.parse( f );
		if ( ! parsed.ok ) continue;
		const { locals, exportsByName } = fileSymbols( parsed.ast );
		const imports = {};
		for ( const stmt of parsed.ast.program.body ) {
			if ( stmt.type !== 'ImportDeclaration' ) continue;
			const target = resolveImport( f, stmt.source.value, fileSet );
			if ( ! target ) continue;
			for ( const s of stmt.specifiers ) {
				const imported = s.type === 'ImportDefaultSpecifier' ? 'default' : s.imported && ( s.imported.name || s.imported.value );
				if ( imported ) imports[ s.local.name ] = { file: target, imported };
			}
		}
		tables.set( path.resolve( f ), { locals, exportsByName, imports } );
	}

	const keyOf = ( file, local ) => `${ file }#${ local }`;
	const resolveName = ( file, name ) => {
		const t = tables.get( file );
		if ( ! t ) return null;
		if ( t.locals.has( name ) ) return keyOf( file, name );
		const imp = t.imports[ name ];
		if ( imp ) {
			const target = tables.get( imp.file );
			const local = target && target.exportsByName[ imp.imported ];
			return local ? keyOf( imp.file, local ) : null;
		}
		return null;
	};

	const edges = new Map(); // target key -> [{ from, groups }]
	const sinks = [];
	for ( const f of files ) {
		const file = path.resolve( f );
		if ( ! tables.has( file ) ) continue;
		ctx.cache.traverse( f, {
			JSXOpeningElement( nodePath ) {
				const el = nodePath.parentPath;
				const name = jsxName( nodePath.node );
				const fnName = topLevelFunctionName( el );
				const from = fnName ? keyOf( file, fnName ) : null;
				const groups = enclosingGroups( el );
				const line = nodePath.node.loc ? nodePath.node.loc.start.line : 0;
				const own = fillGroup( nodePath.node );
				if ( own ) {
					sinks.push( { file, line, sink: name, group: own, from, groups } );
					return;
				}
				const target = name ? resolveName( file, name ) : null;
				if ( target ) {
					if ( ! edges.has( target ) ) edges.set( target, [] );
					edges.get( target ).push( { from, groups, file, line } );
					return;
				}
				const info = name && shared[ name ];
				if ( info && info.selfRoutesGroup ) {
					sinks.push( { file, line, sink: name, group: info.selfRoutesGroup, from, groups } );
				}
			},
			CallExpression( nodePath ) {
				const callee = nodePath.node.callee;
				if ( callee.type !== 'Identifier' ) return;
				const target = resolveName( file, callee.name );
				if ( ! target ) return;
				const fnName = topLevelFunctionName( nodePath );
				const from = fnName ? keyOf( file, fnName ) : null;
				if ( from === target ) return;
				if ( ! edges.has( target ) ) edges.set( target, [] );
				edges.get( target ).push( {
					from,
					groups: enclosingGroups( nodePath ),
					file,
					line: nodePath.node.loc ? nodePath.node.loc.start.line : 0,
				} );
			},
		} );
	}

	// Every chain of fills above a function's mounts: [{ groups, via }].
	const memo = new Map();
	const chainsAbove = ( key, seen ) => {
		if ( ! key ) return [ { groups: [], via: [] } ];
		if ( memo.has( key ) ) return memo.get( key );
		if ( seen.has( key ) ) return [];
		seen.add( key );
		const incoming = edges.get( key ) || [];
		const out = [];
		if ( ! incoming.length ) out.push( { groups: [], via: [] } );
		for ( const e of incoming ) {
			for ( const up of chainsAbove( e.from, seen ) ) {
				out.push( {
					groups: [ ...e.groups, ...up.groups ],
					via: [ `${ path.basename( e.file ) }:${ e.line }`, ...up.via ],
				} );
			}
		}
		seen.delete( key );
		memo.set( key, out );
		return out;
	};

	const crossings = [];
	for ( const s of sinks ) {
		const tab = tabOf( s.group );
		for ( const chain of chainsAbove( s.from, new Set() ) ) {
			const ancestors = [ ...s.groups, ...chain.groups ];
			if ( ancestors.some( ( g ) => tabOf( g ) !== tab ) ) {
				crossings.push( { file: s.file, line: s.line, sink: s.sink, group: s.group, ancestors, via: chain.via } );
				break;
			}
		}
	}
	return crossings;
}

module.exports = {
	id: '46-inspector-fill-crosses-tab',
	checklistItem: null,
	title:
		'An inspector fill (an <InspectorControls group> or a component that renders one, such as ' +
		'SgsColourPanel) is mounted inside a fill on a different inspector tab, so its controls never render',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	findCrossings,
	run( ctx, block ) {
		const files = ctx.editFiles( block.tail ).filter( ( f ) => fs.existsSync( f ) );
		return findCrossings( ctx, files ).map( ( c ) =>
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: c.file,
				line: c.line,
				severity: 'error',
				detail:
					`${ path.basename( c.file ) }:${ c.line } — <${ c.sink }> routes to the "${ c.group }" group ` +
					`(${ tabOf( c.group ) } tab) but is mounted inside fill group(s) [${ c.ancestors.join( ', ' ) }]` +
					`${ c.via.length ? ` via ${ c.via.join( ' <- ' ) }` : '' }. Only one tab's slots are mounted at a ` +
					'time, so these controls show on neither tab.',
				fix:
					'Mount it outside the other-tab fill. For a colour row: export the rows from the component ' +
					'(a `…ColourRows()` builder) and add them to the block\'s one top-level <SgsColourPanel> ' +
					'(Spec 35 PART O §1 field 4(a) Styles tab, field 9e one panel per block).',
				keyParts: [ 'fill-crosses-tab', c.sink, String( c.line ) ],
			} )
		);
	},
	selfTest: {
		fixture: 'fixtures/46-inspector-fill-crosses-tab',
		mustFlag: [ 'colour-panel-in-settings-component', 'styles-fill-in-settings-direct', 'colour-panel-via-helper-call' ],
		mustNotFlag: [ 'colour-panel-top-level', 'colour-panel-in-styles-component', 'same-tab-nesting' ],
	},
};
