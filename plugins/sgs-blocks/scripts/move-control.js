#!/usr/bin/env node
'use strict';
/*
 * move-control.js - moves one inspector control (or renames one panel) in a block's editor source, and refuses what it cannot do safely.
 *
 * Stage E3 (plan Task 13): every owner applies the register's moves ("this control goes into that panel"). The same JSX surgery, run over
 * a list of rows, is both the Pass 1 detector (`--dry-run` prints each move as a plan or a refusal, with the reason) and the Pass 2
 * codemod (`--apply` writes the moves it can do; the refusals are done by hand). It is block-agnostic: a row names a block, an
 * attribute and the title of the panel the control lands in.
 *
 * What a row does (parsed with @babel/parser through scripts/lib/jsx-scan.js; edits are text splices, so every other byte stays):
 *   1. CONTROL   the one JSX element, inside the block's own folder, whose own props write `attr` (an object key `attr` or a helper call
 *                `write( 'attr', ... )`). Zero or several such elements: refused.
 *   2. UNIT      the control plus its conditional wrapper (`{ cond && ( <Control/> ) }`, a ternary with `null`, a one-child fragment). The
 *                unit must sit directly in a `PanelBody` (a control inside a `div`, a `Flex` or a shared component is refused).
 *   3. GROUP     when other children of that panel read `attr` (the control leads a group), the row must say `whole: true`: the panel's
 *                whole content moves and the panel goes. Without it the row is refused.
 *   4. TARGET    the one other `PanelBody` titled `to` (a `title` of `__( 'X', ... )` or a plain string) in the block's files, narrowed by
 *                `tab` (settings or styles) when the panel sits in an InspectorControls with a `group`. None, several, or a dynamic title: refused.
 *   5. SCOPE     when target and source are different files, every name the unit uses must exist in the target component: attributes read from
 *                `attributes` are added to its `const { ... } = attributes` (or one is created), `attributes`/`setAttributes` must be in scope,
 *                imports the unit needs are copied across (relative paths rewritten). A name derived from other local state is refused.
 *   6. CLEAN-UP  the unit lands last in the target panel (first with `first: true`), the comment beside it travels with it; a source panel left empty is deleted, and an InspectorControls left empty with it
 *                (replaced by `null` where it is a returned value). Imports and locals the source no longer uses are left for the lint pass.
 * A row `{ block, rename: "Old", to: "New" }` renames the one panel titled Old.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/move-control.js --rows rows.json [--dry-run|--apply] [--json out.json]
 *   node scripts/move-control.js --block cart --attr displayMode --to "Trigger style" [--tab settings] [--whole] [--dry-run|--apply]
 *   node scripts/move-control.js --block buybox --rename "Buy box type" --to "Buy box" [--apply]
 *   node scripts/move-control.js --self-test
 * rows.json: [ { "block": "cart", "attr": "displayMode", "to": "Trigger style", "tab": "settings", "whole": false, "first": false }, { "block": ..., "rename": ..., "to": ... } ]
 * Dry run is the default. `--apply` writes each row as soon as it plans, so a later row sees an earlier row's result.
 */
const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const scan = require( './lib/jsx-scan.js' );

const { jsxName, walkJsx, closestJsx, astOf, parse, rel } = scan;
const WRITE_HELPERS = /^(setAttributes|write|setAttr|set[A-Z]\w*)$/;
const GLOBALS = new Set( [ '__', '_x', '_n', 'Array', 'Math', 'Number', 'String', 'Object', 'Boolean', 'JSON', 'undefined', 'window', 'document', 'parseInt', 'parseFloat', 'isNaN', 'Infinity', 'NaN', 'console', 'Date', 'RegExp', 'Set', 'Map', 'Promise', 'Symbol', 'wp', 'sgsBlocks' ] );
const SKIP = new Set( [ 'loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments', 'innerComments', 'extra' ] );

/* ───────────────────────── AST helpers ───────────────────────── */

/** Visit every node of a subtree with its ancestor chain (outermost first). */
function visit( node, fn, anc = [] ) {
	if ( ! node || 'object' !== typeof node ) {
		return;
	}
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => visit( n, fn, anc ) );
		return;
	}
	if ( node.type ) {
		if ( false === fn( node, anc ) ) {
			return;
		}
		anc = anc.concat( [ node ] );
	}
	for ( const k of Object.keys( node ) ) {
		if ( ! SKIP.has( k ) ) {
			visit( node[ k ], fn, anc );
		}
	}
}

const keyName = ( k ) => ( k && ( 'Identifier' === k.type ? k.name : 'StringLiteral' === k.type ? k.value : null ) );

/** True when one of the element's OWN props writes `attr`. */
function writesAttr( el, attr ) {
	let hit = false;
	for ( const a of el.openingElement.attributes ) {
		if ( 'JSXAttribute' !== a.type || ! a.value ) {
			continue;
		}
		visit( a.value, ( n, anc ) => {
			if ( 'ObjectProperty' === n.type && ! n.computed && keyName( n.key ) === attr && anc.some( ( x ) => 'CallExpression' === x.type && 'Identifier' === x.callee.type && WRITE_HELPERS.test( x.callee.name ) ) ) {
				hit = true;
			}
			if ( 'CallExpression' === n.type && n.callee.type === 'Identifier' && WRITE_HELPERS.test( n.callee.name ) && n.arguments[ 0 ] && 'StringLiteral' === n.arguments[ 0 ].type && n.arguments[ 0 ].value === attr ) {
				hit = true;
			}
		} );
	}
	return hit;
}

/** True when a subtree reads the attribute: the bare name or `attributes.attr`. */
function readsAttr( node, attr ) {
	let hit = false;
	visit( node, ( n, anc ) => {
		const parent = anc[ anc.length - 1 ];
		if ( 'Identifier' === n.type && n.name === attr && ! ( parent && 'ObjectProperty' === parent.type && parent.key === n && ! parent.computed && parent.value !== n ) && ! ( parent && 'MemberExpression' === parent.type && parent.property === n && ! parent.computed ) ) {
			hit = true;
		}
		if ( 'MemberExpression' === n.type && ! n.computed && n.property.name === attr && n.object.name === 'attributes' ) {
			hit = true;
		}
	} );
	return hit;
}

/** Title string of a PanelBody, or null when dynamic. */
function panelTitle( el ) {
	const p = scan.prop( el, 'title' );
	if ( 'string' === p.kind ) {
		return p.value;
	}
	const v = p.node && p.node.value && p.node.value.expression;
	if ( v && 'CallExpression' === v.type && v.arguments[ 0 ] && 'StringLiteral' === v.arguments[ 0 ].type ) {
		return v.arguments[ 0 ].value;
	}
	return null;
}

const isPanel = ( el ) => 'PanelBody' === jsxName( el );
const significant = ( c ) => ! ( 'JSXText' === c.type && '' === c.value.trim() );
const isComment = ( c ) => 'JSXExpressionContainer' === c.type && 'JSXEmptyExpression' === c.expression.type;
const substantive = ( c ) => significant( c ) && ! isComment( c );

/** 'settings' | 'styles' | null for a panel's ancestors (the nearest InspectorControls with a string `group`). */
function tabOf( anc ) {
	const ic = closestJsx( anc, ( e ) => 'InspectorControls' === jsxName( e ) );
	if ( ! ic ) {
		return null;
	}
	const g = scan.prop( ic, 'group' );
	return 'string' === g.kind ? g.value : 'settings';
}

/** Nearest enclosing function node. */
function enclosingFn( anc ) {
	for ( let i = anc.length - 1; i >= 0; i-- ) {
		if ( /^(FunctionDeclaration|ArrowFunctionExpression|FunctionExpression|ClassMethod|ObjectMethod)$/.test( anc[ i ].type ) ) {
			return anc[ i ];
		}
	}
	return null;
}

/** Names a pattern binds. */
function patternNames( p, out = new Set() ) {
	if ( ! p ) {
		return out;
	}
	if ( 'Identifier' === p.type ) {
		out.add( p.name );
	} else if ( 'ObjectPattern' === p.type ) {
		p.properties.forEach( ( q ) => patternNames( 'RestElement' === q.type ? q.argument : q.value, out ) );
	} else if ( 'ArrayPattern' === p.type ) {
		p.elements.forEach( ( q ) => patternNames( q, out ) );
	} else if ( 'AssignmentPattern' === p.type ) {
		patternNames( p.left, out );
	} else if ( 'RestElement' === p.type ) {
		patternNames( p.argument, out );
	}
	return out;
}

/** Names bound directly in a function (params, and declarators whose nearest function is it), plus the declarators that read `attributes`. */
function fnScope( fn ) {
	const names = new Set();
	const attrNames = new Set();
	const attrDeclarators = [];
	( fn.params || [] ).forEach( ( p ) => patternNames( p, names ) );
	visit( fn.body, ( n, anc ) => {
		if ( 'VariableDeclarator' === n.type ) {
			const owner = enclosingFn( anc );
			if ( owner && owner !== fn && ! ( owner.body === fn.body ) ) {
				return;
			}
			const bound = patternNames( n.id );
			bound.forEach( ( b ) => names.add( b ) );
			if ( n.init && 'Identifier' === n.init.type && 'attributes' === n.init.name && 'ObjectPattern' === n.id.type ) {
				bound.forEach( ( b ) => attrNames.add( b ) );
				attrDeclarators.push( n );
			}
		}
	} );
	// `function X( { attributes, setAttributes } )` binds both; `function X( { attributes: a } )` is not handled.
	return { names, attrNames, attrDeclarators };
}

/** Names a file binds at module level. */
function moduleScope( ast ) {
	const names = new Set();
	const imports = new Map();
	for ( const s of ast.program.body ) {
		if ( 'ImportDeclaration' === s.type ) {
			s.specifiers.forEach( ( sp ) => {
				names.add( sp.local.name );
				imports.set( sp.local.name, { decl: s, spec: sp } );
			} );
		} else if ( 'VariableDeclaration' === s.type ) {
			s.declarations.forEach( ( d ) => patternNames( d.id, names ) );
		} else if ( ( 'FunctionDeclaration' === s.type || 'ClassDeclaration' === s.type ) && s.id ) {
			names.add( s.id.name );
		} else if ( 'ExportNamedDeclaration' === s.type && s.declaration ) {
			const d = s.declaration;
			if ( 'VariableDeclaration' === d.type ) {
				d.declarations.forEach( ( x ) => patternNames( x.id, names ) );
			} else if ( d.id ) {
				names.add( d.id.name );
			}
		}
	}
	return { names, imports };
}

/** Free names a unit uses: identifier references and component tags, minus names bound inside the unit. */
function freeNames( unit ) {
	const used = new Set();
	const bound = new Set();
	visit( unit, ( n, anc ) => {
		const parent = anc[ anc.length - 1 ];
		if ( 'Identifier' === n.type ) {
			if ( parent && 'ObjectProperty' === parent.type && parent.key === n && ! parent.computed && ! parent.shorthand ) {
				return;
			}
			if ( parent && 'MemberExpression' === parent.type && parent.property === n && ! parent.computed ) {
				return;
			}
			if ( parent && 'ObjectMethod' === parent.type && parent.key === n ) {
				return;
			}
			used.add( n.name );
		}
		if ( 'JSXIdentifier' === n.type && /^[A-Z]/.test( n.name ) && parent && ( ( 'JSXOpeningElement' === parent.type || 'JSXClosingElement' === parent.type ) && parent.name === n ) ) {
			used.add( n.name );
		}
		if ( 'JSXMemberExpression' === n.type ) {
			let o = n.object;
			while ( o.object ) {
				o = o.object;
			}
			used.add( o.name );
		}
		if ( /^(ArrowFunctionExpression|FunctionExpression)$/.test( n.type ) ) {
			n.params.forEach( ( p ) => patternNames( p, bound ) );
		}
		if ( 'VariableDeclarator' === n.type ) {
			patternNames( n.id, bound );
		}
	} );
	return [ ...used ].filter( ( x ) => ! bound.has( x ) && ! GLOBALS.has( x ) );
}

/* ───────────────────────── text helpers ───────────────────────── */

const lineStart = ( text, pos ) => text.lastIndexOf( '\n', pos - 1 ) + 1;
const indentAt = ( text, pos ) => ( text.slice( lineStart( text, pos ), pos ).match( /^[\t ]*/ ) || [ '' ] )[ 0 ];

/** Range to delete for a node: its whole lines when it has them to itself. */
function deleteRange( text, node ) {
	const ls = lineStart( text, node.start );
	const before = text.slice( ls, node.start );
	const after = text.slice( node.end ).match( /^[\t ]*\r?\n/ );
	if ( '' === before.trim() && after ) {
		return [ ls, node.end + after[ 0 ].length ];
	}
	return [ node.start, node.end ];
}

/** The unit's text re-indented to `indent`. */
function reindent( text, node, indent ) {
	const orig = indentAt( text, node.start );
	const body = text.slice( node.start, node.end ).split( '\n' ).map( ( l, i ) => {
		if ( 0 === i ) {
			return l;
		}
		return l.startsWith( orig ) ? indent + l.slice( orig.length ) : l;
	} );
	return indent + body.join( '\n' );
}

/* ───────────────────────── planning ───────────────────────── */

function loadFile( file ) {
	const text = fs.readFileSync( file, 'utf8' );
	return { file, text, ast: parse( text ) };
}

/** Every PanelBody in the files: { file, el, anc, title, tab }. */
function panelsIn( files ) {
	const out = [];
	for ( const f of files ) {
		walkJsx( f.ast, ( el, anc ) => {
			if ( isPanel( el ) ) {
				out.push( { f, el, anc, title: panelTitle( el ), tab: tabOf( anc ) } );
			}
		} );
	}
	return out;
}

/** The unit (control plus conditional wrapper) and its direct parent. Returns { unit, parent } or { refuse }. */
function unitOf( el, anc ) {
	let node = el;
	let i = anc.length - 1;
	const isNull = ( n ) => n && ( 'NullLiteral' === n.type );
	for ( ; i >= 0; i-- ) {
		const p = anc[ i ];
		if ( 'LogicalExpression' === p.type && '&&' === p.operator && p.right === node ) {
			node = p;
		} else if ( 'ConditionalExpression' === p.type && ( ( p.consequent === node && isNull( p.alternate ) ) || ( p.alternate === node && isNull( p.consequent ) ) ) ) {
			node = p;
		} else if ( 'JSXExpressionContainer' === p.type && ( 'LogicalExpression' === node.type || 'ConditionalExpression' === node.type ) ) {
			node = p;
		} else if ( 'JSXFragment' === p.type ) {
			if ( p.children.filter( significant ).length !== 1 ) {
				return { refuse: 'the control shares a fragment with other controls' };
			}
			node = p;
		} else if ( 'JSXExpressionContainer' === p.type || 'JSXElement' === p.type ) {
			break;
		} else if ( 'ParenthesizedExpression' === p.type ) {
			node = p;
		} else {
			return { refuse: `the control sits inside a ${ p.type } the codemod does not unwrap` };
		}
	}
	const parent = anc[ i ];
	if ( ! parent || 'JSXElement' !== parent.type ) {
		return { refuse: 'the control is not a direct child of an element' };
	}
	if ( ! isPanel( parent ) ) {
		return { refuse: `the control sits inside <${ jsxName( parent ) }> within its panel (not a direct child of the PanelBody)` };
	}
	return { unit: node, parent };
}

/** Where the unit's free names come from, and what the target needs added. Returns { addAttrs, addImports } or { refuse }. */
function scopeCheck( unit, src, srcAnc, tgt, tgtAnc ) {
	const names = freeNames( unit );
	const srcFn = enclosingFn( srcAnc );
	const tgtFn = enclosingFn( tgtAnc );
	if ( ! srcFn || ! tgtFn ) {
		return { refuse: 'cannot find the component around the source or the target panel' };
	}
	const sS = fnScope( srcFn );
	const tS = fnScope( tgtFn );
	const sM = moduleScope( src.ast );
	const tM = moduleScope( tgt.ast );
	const addAttrs = [];
	const addImports = [];
	for ( const n of names ) {
		if ( tS.names.has( n ) || tM.names.has( n ) ) {
			continue;
		}
		if ( sS.attrNames.has( n ) ) {
			if ( ! tS.names.has( 'attributes' ) ) {
				return { refuse: `uses attribute \`${ n }\` but the target component has no \`attributes\` in scope` };
			}
			addAttrs.push( n );
		} else if ( sM.imports.has( n ) ) {
			addImports.push( n );
		} else if ( 'attributes' === n || 'setAttributes' === n ) {
			return { refuse: `the target component has no \`${ n }\` in scope` };
		} else if ( sS.names.has( n ) ) {
			return { refuse: `uses \`${ n }\`, derived from other state in the source component` };
		} else if ( sM.names.has( n ) ) {
			return { refuse: `uses \`${ n }\`, declared in the source file and not in the target's` };
		} else {
			return { refuse: `uses \`${ n }\`, which the codemod cannot place` };
		}
	}
	return { addAttrs, addImports, tgtScope: tS, tgtFn, srcModule: sM };
}

/** Text of an import line for local name `n`, as seen from the target file. */
function importLine( n, srcFile, tgtFile, srcModule ) {
	const { decl, spec } = srcModule.imports.get( n );
	let from = decl.source.value;
	if ( from.startsWith( '.' ) ) {
		const abs = path.resolve( path.dirname( srcFile ), from );
		from = path.relative( path.dirname( tgtFile ), abs ).split( path.sep ).join( '/' );
		if ( ! from.startsWith( '.' ) ) {
			from = './' + from;
		}
	}
	let what;
	if ( 'ImportDefaultSpecifier' === spec.type ) {
		what = n;
	} else if ( 'ImportNamespaceSpecifier' === spec.type ) {
		what = `* as ${ n }`;
	} else {
		what = spec.imported.name === n ? `{ ${ n } }` : `{ ${ spec.imported.name } as ${ n } }`;
	}
	return { from, what, named: 'ImportSpecifier' === spec.type, local: n, imported: spec.imported && spec.imported.name };
}

/**
 * Plan one move. Returns { ok, text: Map(file -> new text), summary } or { ok: false, reason }.
 *
 * @param {Object}   row   { block, attr, to, tab?, whole? }.
 * @param {string[]} files Absolute paths of the block's editor files.
 * @param {Object}   opts  { ownFolderOf?: slug } refuse a control that lives outside that block's folder.
 */
function planMove( row, files, opts = {} ) {
	const fs_ = files.map( loadFile );
	const refuse = ( reason ) => ( { ok: false, reason } );
	// 1. control
	const cands = [];
	for ( const f of fs_ ) {
		walkJsx( f.ast, ( el, anc ) => {
			if ( ! isPanel( el ) && 'InspectorControls' !== jsxName( el ) && writesAttr( el, row.attr ) ) {
				cands.push( { f, el, anc } );
			}
		} );
	}
	const innermost = cands.filter( ( c ) => ! cands.some( ( d ) => d !== c && d.f === c.f && d.el.start > c.el.start && d.el.end <= c.el.end ) );
	if ( 0 === innermost.length ) {
		return refuse( `no element in the block's files writes \`${ row.attr }\` (written through a helper, a spread or a shared component)` );
	}
	if ( innermost.length > 1 ) {
		return refuse( `${ innermost.length } elements write \`${ row.attr }\` (${ innermost.map( ( c ) => path.basename( c.f.file ) ).join( ', ' ) }): choose by hand` );
	}
	const c = innermost[ 0 ];
	if ( opts.ownFolderOf && scan.blockOf( c.f.file ) !== opts.ownFolderOf ) {
		return refuse( `the control lives in a shared file (${ rel( c.f.file ) }): its owner moves it` );
	}
	// 2. unit
	const u = unitOf( c.el, c.anc );
	if ( u.refuse ) {
		return refuse( u.refuse );
	}
	const srcPanelEl = u.parent;
	const srcPanel = { f: c.f, el: srcPanelEl, anc: c.anc.slice( 0, c.anc.indexOf( srcPanelEl ) ), title: panelTitle( srcPanelEl ) };
	// 3. group
	const kids = srcPanelEl.children;
	const lead = [];
	for ( let k = kids.indexOf( u.unit ) - 1; k >= 0; k-- ) {
		if ( isComment( kids[ k ] ) ) {
			lead.unshift( kids[ k ] );
		} else if ( significant( kids[ k ] ) ) {
			break;
		}
	}
	const others = kids.filter( ( ch ) => substantive( ch ) && ch !== u.unit );
	const dependants = others.filter( ( ch ) => readsAttr( ch, row.attr ) );
	let whole = false;
	if ( dependants.length ) {
		if ( ! row.whole ) {
			return refuse( `the control leads a group: ${ dependants.length } other control(s) in "${ srcPanel.title }" read \`${ row.attr }\` (use whole: true to move the whole panel)` );
		}
		whole = true;
	} else if ( row.whole ) {
		whole = true;
	}
	// 4. target
	const all = panelsIn( fs_ );
	const targets = all.filter( ( p ) => p.title === row.to && p.el !== srcPanelEl && ( ! row.tab || ! p.tab || p.tab === row.tab ) );
	if ( 0 === targets.length ) {
		const dyn = all.filter( ( p ) => null === p.title ).length;
		return refuse( `no panel titled "${ row.to }" in the block's files${ dyn ? ` (${ dyn } panel(s) have a dynamic title; a shared component may draw it)` : '' }` );
	}
	if ( targets.length > 1 ) {
		return refuse( `${ targets.length } panels are titled "${ row.to }": choose by hand` );
	}
	const tgt = targets[ 0 ];
	if ( tgt.el.openingElement.selfClosing ) {
		return refuse( `the target panel "${ row.to }" has no body` );
	}
	// 5. scope across files
	const movingNodes = whole ? srcPanelEl.children.filter( significant ) : lead.concat( [ u.unit ] );
	let sc = { addAttrs: [], addImports: [] };
	if ( tgt.f !== c.f ) {
		for ( const n of movingNodes ) {
			const r = scopeCheck( n, c.f, srcPanel.anc.concat( [ srcPanelEl ] ), tgt.f, tgt.anc.concat( [ tgt.el ] ) );
			if ( r.refuse ) {
				return refuse( r.refuse + ` (cross-file move ${ path.basename( c.f.file ) } to ${ path.basename( tgt.f.file ) })` );
			}
			sc.addAttrs.push( ...r.addAttrs );
			sc.addImports.push( ...r.addImports );
			sc.tgtScope = r.tgtScope;
			sc.tgtFn = r.tgtFn;
			sc.srcModule = r.srcModule;
		}
		sc.addAttrs = [ ...new Set( sc.addAttrs ) ];
		sc.addImports = [ ...new Set( sc.addImports ) ];
	}
	// Splices.
	const edits = new Map();
	const edit = ( f, start, end, insert ) => {
		if ( ! edits.has( f.file ) ) {
			edits.set( f.file, { f, list: [] } );
		}
		edits.get( f.file ).list.push( { start, end, insert } );
	};
	const closeTag = tgt.el.closingElement;
	const childIndent = indentAt( tgt.f.text, closeTag.start ) + '\t';
	const chunks = movingNodes.map( ( n ) => reindent( c.f.text, n, childIndent ) );
	// Insert at the line start of the closing tag when it has its own line.
	const ctLine = lineStart( tgt.f.text, closeTag.start );
	const ownLine = '' === tgt.f.text.slice( ctLine, closeTag.start ).trim();
	const insertAt = ownLine ? ctLine : closeTag.start;
	if ( row.first ) {
		const oe = tgt.el.openingElement.end;
		edit( tgt.f, oe, oe, '\n' + chunks.join( '\n' ) );
	} else {
		edit( tgt.f, insertAt, insertAt, ownLine ? chunks.join( '\n' ) + '\n' : '\n' + chunks.join( '\n' ) + '\n' + indentAt( tgt.f.text, closeTag.start ) );
	}
	// Remove from source.
	let panelDeleted = false;
	let icDeleted = false;
	const remaining = srcPanelEl.children.filter( substantive ).filter( ( ch ) => ! movingNodes.includes( ch ) );
	if ( whole || 0 === remaining.length ) {
		// The panel goes: delete it (and an InspectorControls left empty).
		panelDeleted = true;
		const ic = closestJsx( srcPanel.anc, ( e ) => 'InspectorControls' === jsxName( e ) );
		const icKids = ic ? ic.children.filter( significant ).filter( ( ch ) => ch !== srcPanelEl ) : [];
		if ( ic && 0 === icKids.length && srcPanel.anc[ srcPanel.anc.length - 1 ] === ic ) {
			icDeleted = true;
			const ia = srcPanel.anc.indexOf( ic );
			const icParent = srcPanel.anc[ ia - 1 ];
			if ( icParent && /^JSX/.test( icParent.type ) ) {
				const [ s, e ] = deleteRange( c.f.text, ic );
				edit( c.f, s, e, '' );
			} else {
				edit( c.f, ic.start, ic.end, 'null' );
			}
		} else {
			const pp = srcPanel.anc[ srcPanel.anc.length - 1 ];
			if ( pp && /^JSX/.test( pp.type ) ) {
				const [ s, e ] = deleteRange( c.f.text, srcPanelEl );
				edit( c.f, s, e, '' );
				const sib = pp.children || [];
				for ( let k = sib.indexOf( srcPanelEl ) - 1; k >= 0; k-- ) {
					if ( isComment( sib[ k ] ) ) {
						const [ cs, ce ] = deleteRange( c.f.text, sib[ k ] );
						edit( c.f, cs, ce, '' );
					} else if ( significant( sib[ k ] ) ) {
						break;
					}
				}
			} else {
				edit( c.f, srcPanelEl.start, srcPanelEl.end, 'null' );
			}
		}
	} else {
		movingNodes.forEach( ( n ) => {
			const [ s, e ] = deleteRange( c.f.text, n );
			edit( c.f, s, e, '' );
		} );
	}
	// Target file: attributes and imports.
	if ( sc.addAttrs.length ) {
		const decl = sc.tgtScope.attrDeclarators[ 0 ];
		if ( decl ) {
			const last = decl.id.properties[ decl.id.properties.length - 1 ];
			const multi = tgt.f.text.slice( decl.id.start, decl.id.end ).includes( '\n' );
			const sep = multi ? ',\n' + indentAt( tgt.f.text, last.start ) : ', ';
			edit( tgt.f, last.end, last.end, sep + sc.addAttrs.join( sep ) );
		} else if ( 'BlockStatement' === sc.tgtFn.body.type ) {
			const indent = '\t'.repeat( 1 + ( indentAt( tgt.f.text, sc.tgtFn.body.start ).replace( /[^\t]/g, '' ).length ) );
			edit( tgt.f, sc.tgtFn.body.start + 1, sc.tgtFn.body.start + 1, `\n${ indent }const { ${ sc.addAttrs.join( ', ' ) } } = attributes;` );
		} else {
			return refuse( 'the target component is an expression body: add the attributes by hand' );
		}
	}
	if ( sc.addImports.length ) {
		const lines = sc.addImports.map( ( n ) => importLine( n, c.f.file, tgt.f.file, sc.srcModule ) );
		const lastImport = tgt.f.ast.program.body.filter( ( s ) => 'ImportDeclaration' === s.type ).pop();
		const at = lastImport ? lastImport.end : 0;
		// One import per source: named specifiers from the same module share a line.
		const bySource = new Map();
		lines.forEach( ( l ) => {
			const e = bySource.get( l.from ) || { named: [], other: [] };
			( l.named ? e.named : e.other ).push( l );
			bySource.set( l.from, e );
		} );
		const text = [ ...bySource.entries() ].map( ( [ from, e ] ) => {
			const named = e.named.map( ( l ) => l.what.replace( /^\{ | \}$/g, '' ) );
			const parts = e.other.map( ( l ) => l.what ).concat( named.length ? [ `{ ${ named.join( ', ' ) } }` ] : [] );
			return `\nimport ${ parts.join( ', ' ) } from '${ from }';`;
		} ).join( '' );
		edit( tgt.f, at, at, text );
	}
	// Apply the splices (descending), per file.
	const out = new Map();
	for ( const { f, list } of edits.values() ) {
		const sorted = list.sort( ( a, b ) => b.start - a.start || b.end - a.end );
		for ( let i = 1; i < sorted.length; i++ ) {
			if ( sorted[ i ].end > sorted[ i - 1 ].start && sorted[ i ].start < sorted[ i - 1 ].end ) {
				return refuse( 'the move overlaps another edit in the same file (the target sits inside the source panel)' );
			}
		}
		let t = f.text;
		for ( const e of sorted ) {
			t = t.slice( 0, e.start ) + e.insert + t.slice( e.end );
		}
		try {
			parse( t );
		} catch ( e ) {
			return refuse( `the edit would not parse in ${ path.basename( f.file ) } (${ e.message.slice( 0, 80 ) })` );
		}
		out.set( f.file, t );
	}
	const bits = [];
	bits.push( whole ? `moves the whole panel (${ movingNodes.length } children)` : 'moves the control' );
	if ( panelDeleted ) {
		bits.push( `deletes panel "${ srcPanel.title }"${ icDeleted ? ' and its empty InspectorControls' : '' }` );
	}
	if ( tgt.f !== c.f ) {
		bits.push( `across files ${ path.basename( c.f.file ) } to ${ path.basename( tgt.f.file ) }` );
	}
	if ( sc.addAttrs.length ) {
		bits.push( `adds \`${ sc.addAttrs.join( ', ' ) }\` to the target's attributes` );
	}
	if ( sc.addImports.length ) {
		bits.push( `adds import ${ sc.addImports.join( ', ' ) }` );
	}
	return { ok: true, text: out, summary: bits.join('; '), from: srcPanel.title, file: rel( c.f.file ) };
}

/** Plan a panel rename. */
function planRename( row, files ) {
	const fs_ = files.map( loadFile );
	const hits = panelsIn( fs_ ).filter( ( p ) => p.title === row.rename && ( ! row.tab || ! p.tab || p.tab === row.tab ) );
	if ( 0 === hits.length ) {
		return { ok: false, reason: `no panel titled "${ row.rename }" in the block's files (dynamic title or a shared component)` };
	}
	if ( hits.length > 1 ) {
		return { ok: false, reason: `${ hits.length } panels are titled "${ row.rename }": choose by hand` };
	}
	const h = hits[ 0 ];
	const t = scan.prop( h.el, 'title' );
	let lit = null;
	visit( t.node.value, ( n ) => {
		if ( ! lit && 'StringLiteral' === n.type && n.value === row.rename ) {
			lit = n;
		}
	} );
	if ( ! lit ) {
		return { ok: false, reason: 'the title is not a plain string' };
	}
	const q = h.f.text[ lit.start ];
	const text = h.f.text.slice( 0, lit.start ) + q + row.to.split( q ).join( '\\' + q ) + q + h.f.text.slice( lit.end );
	return { ok: true, text: new Map( [ [ h.f.file, text ] ] ), summary: `renames panel "${ row.rename }" to "${ row.to }"`, file: rel( h.f.file ) };
}

/* ───────────────────────── driver ───────────────────────── */

function blockFiles( slug ) {
	const b = scan.blocks().find( ( x ) => x.slug === slug );
	if ( ! b ) {
		return null;
	}
	return scan.importClosure( b.edit ).filter( ( f ) => scan.blockOf( f ) === slug );
}

function runRows( rows, apply, files_for = blockFiles, opts = {} ) {
	const results = [];
	for ( const row of rows ) {
		const files = files_for( row.block );
		let r;
		if ( ! files ) {
			r = { ok: false, reason: `no block "${ row.block }" with an edit.js` };
		} else if ( row.rename ) {
			r = planRename( row, files );
		} else {
			r = planMove( row, files, 'function' === typeof files_for && files_for === blockFiles ? { ownFolderOf: row.block } : opts );
		}
		if ( r.ok && apply ) {
			for ( const [ f, t ] of r.text ) {
				fs.writeFileSync( f, t );
			}
		}
		results.push( { row, ok: r.ok, reason: r.reason, summary: r.summary, file: r.file } );
	}
	return results;
}

function describe( r ) {
	const row = r.row;
	const what = row.rename ? `RENAME sgs/${ row.block } "${ row.rename }" -> "${ row.to }"` : `MOVE   sgs/${ row.block } ${ row.attr } -> "${ row.to }"`;
	return r.ok ? `${ what }: ${ r.summary } [${ r.file }]` : `REFUSE ${ what.replace( /^\w+\s+/, '' ) }: ${ r.reason }`;
}

/* ───────────────────────── self-test ───────────────────────── */

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	const dir = fs.mkdtempSync( path.join( process.env.TEMP || os.tmpdir(), 'move-control-' ) );
	const w = ( name, text ) => {
		const p = path.join( dir, name );
		fs.writeFileSync( p, text );
		return p;
	};
	const a = w( 'edit.js', `import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';
import { InspectorControls } from '@wordpress/block-editor';
import { Extra } from './Extra';
export default function Edit( { attributes, setAttributes } ) {
	const { sticky, mode, derived } = attributes;
	const local = mode + 1;
	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Footer', 'x' ) }>
					{ mode !== 'a' && (
						<ToggleControl
							label="Sticky"
							checked={ !! sticky }
							onChange={ ( v ) => setAttributes( { sticky: v } ) }
						/>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Navigation', 'x' ) }>
					<TextControl label="Back" value={ mode } onChange={ ( v ) => setAttributes( { mode: v } ) } />
				</PanelBody>
				<PanelBody title="Lead">
					<ToggleControl label="Lead" checked={ derived } onChange={ ( v ) => setAttributes( { derived: v } ) } />
					{ derived && <TextControl label="Follower" value="" onChange={ () => {} } /> }
				</PanelBody>
				<PanelBody title="Derived">
					<TextControl label="Local" value={ local } onChange={ ( v ) => setAttributes( { mode2: v } ) } />
				</PanelBody>
				<PanelBody title="Wrapped">
					<div><TextControl label="Deep" value="" onChange={ ( v ) => setAttributes( { deep: v } ) } /></div>
				</PanelBody>
			</InspectorControls>
		</>
	);
}
` );
	const b = w( 'Other.js', `import { PanelBody } from '@wordpress/components';
export default function Other( { attributes, setAttributes } ) {
	const { x } = attributes;
	return (
		<>
			<PanelBody title="Progress">
				<p>{ x }</p>
			</PanelBody>
			<PanelBody title="Dup"><p>1</p></PanelBody>
			<PanelBody title="Dup"><p>2</p></PanelBody>
		</>
	);
}
` );
	const c = w( 'Chrome.js', `import { PanelBody, ToggleControl } from '@wordpress/components';
import { InspectorControls } from '@wordpress/block-editor';
import { Extra } from './Extra';
export default function Chrome( { attributes, setAttributes } ) {
	const { flag, local } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Header">
				<ToggleControl label="Flag" checked={ flag } onChange={ ( v ) => setAttributes( { flag: v } ) } />
				<Extra />
			</PanelBody>
		</InspectorControls>
	);
}
` );
	w( 'Extra.js', 'export const Extra = () => null;\n' );
	const d = w( 'Root.js', `import { PanelBody, SelectControl } from '@wordpress/components';
export function RootPanel( { attributes, setAttributes } ) {
	const { speed } = attributes;
	return (
		<PanelBody title="Speed">
			{ /* explains the speed control */ }
			<SelectControl
				label="Speed"
				value={ speed }
				options={ [ { value: 'a', label: 'A' } ] }
				onChange={ ( v ) => setAttributes( { speed: v } ) }
			/>
		</PanelBody>
	);
}
` );
	const files = [ a, b, c, d ];
	const txt = ( r, f ) => r.text.get( f );
	let r = planMove( { attr: 'sticky', to: 'Navigation' }, files );
	ok( 'moves a conditional control into a panel of the same file', r.ok && /Navigation[\s\S]*Sticky[\s\S]*<\/PanelBody>/.test( txt( r, a ) ) );
	ok( 'keeps the conditional wrapper with the control', r.ok && /mode !== 'a' && \(/.test( txt( r, a ).split( 'Navigation' )[ 1 ] ) );
	ok( 'deletes the panel the move leaves empty', r.ok && ! /title=\{ __\( 'Footer'/.test( txt( r, a ) ) );
	ok( 'the edited file still parses', r.ok && ( () => { try { parse( txt( r, a ) ); return true; } catch ( e ) { return false; } } )() );
	r = planMove( { attr: 'derived', to: 'Navigation' }, files );
	ok( 'REFUSES a group lead without whole: true', ! r.ok && /leads a group/.test( r.reason ) );
	r = planMove( { attr: 'derived', to: 'Navigation', whole: true }, files );
	ok( 'moves a whole panel when told to, and removes the source panel', r.ok && ! /title="Lead"/.test( txt( r, a ) ) && /Follower/.test( txt( r, a ).split( 'Navigation' )[ 1 ] ) );
	r = planMove( { attr: 'deep', to: 'Navigation' }, files );
	ok( 'REFUSES a control inside a div within its panel', ! r.ok && /inside <div>/.test( r.reason ) );
	r = planMove( { attr: 'sticky', to: 'Dup' }, files );
	ok( 'REFUSES a target title two panels share', ! r.ok && /2 panels are titled/.test( r.reason ) );
	r = planMove( { attr: 'nothere', to: 'Navigation' }, files );
	ok( 'REFUSES an attribute no element writes', ! r.ok && /no element/.test( r.reason ) );
	r = planMove( { attr: 'sticky', to: 'Nowhere' }, files );
	ok( 'REFUSES a target panel that does not exist', ! r.ok && /no panel titled/.test( r.reason ) );
	r = planMove( { attr: 'flag', to: 'Progress' }, files );
	ok( 'moves across files and adds the attribute to the target component', r.ok && /const \{ x, flag \} = attributes;/.test( txt( r, b ) ) && /Flag/.test( txt( r, b ) ) );
	ok( 'a control that does not lead a group leaves its panel and neighbour behind', r.ok && /title="Header"/.test( txt( r, c ) ) && /<Extra \/>/.test( txt( r, c ) ) );
	const r2 = planMove( { attr: 'flag', to: 'Progress', whole: true }, files );
	ok( 'a whole-panel cross-file move carries the neighbour and copies its import', r2.ok && /import \{ Extra \} from '\.\/Extra';/.test( txt( r2, b ) ) && /<Extra \/>/.test( txt( r2, b ) ) );
	ok( 'an emptied InspectorControls in a returned value becomes null', r2.ok && /return \(\s*null\s*\);/.test( txt( r2, c ) ) );
	r = planMove( { attr: 'mode2', to: 'Progress' }, files );
	ok( 'REFUSES a move that needs a local the target lacks', ! r.ok && /derived from other state/.test( r.reason ) );
	r = planMove( { attr: 'speed', to: 'Progress', first: true }, files );
	ok( 'first: true puts the control at the head of the target panel', r.ok && /title="Progress">[^]*?SelectControl[^]*?<p>/.test( txt( r, b ) ) );
	r = planMove( { attr: 'speed', to: 'Progress' }, files );
	ok( 'a panel that is the whole return of its component becomes null, and its comment travels with the control', r.ok && /return \(\s*null\s*\);/.test( txt( r, d ) ) && /explains the speed control/.test( txt( r, b ) ) && ! /explains/.test( txt( r, d ) ) );
	ok( 'an object key named like the attribute is not a write', ! planMove( { attr: 'label', to: 'Progress' }, files ).ok && /no element/.test( planMove( { attr: 'label', to: 'Progress' }, files ).reason ) );
	const rn = planRename( { rename: 'Footer', to: 'Foot' }, files );
	ok( 'renames a panel', rn.ok && /__\( 'Foot', 'x' \)/.test( txt( rn, a ) ) );
	ok( 'REFUSES renaming a panel that is not there', ! planRename( { rename: 'Nope', to: 'X' }, files ).ok );
	fs.rmSync( dir, { recursive: true, force: true } );
	process.stdout.write( 0 === failures.length ? '\n[move-control --self-test] ALL ASSERTIONS PASS.\n' : `\n[move-control --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) {
		selfTest();
		return;
	}
	const get = ( k ) => {
		const i = argv.indexOf( k );
		return i >= 0 ? argv[ i + 1 ] : undefined;
	};
	const apply = argv.includes( '--apply' );
	let rows;
	if ( get( '--rows' ) ) {
		rows = JSON.parse( fs.readFileSync( get( '--rows' ), 'utf8' ) );
	} else if ( get( '--block' ) && get( '--to' ) && ( get( '--attr' ) || get( '--rename' ) ) ) {
		rows = [ { block: get( '--block' ), attr: get( '--attr' ), rename: get( '--rename' ), to: get( '--to' ), tab: get( '--tab' ), whole: argv.includes( '--whole' ), first: argv.includes( '--first' ) } ];
	} else {
		process.stdout.write( 'usage: node scripts/move-control.js --rows rows.json [--apply] | --block B --attr A --to "Panel" | --block B --rename "Old" --to "New" | --self-test\n' );
		process.exit( 2 );
	}
	const results = runRows( rows, apply );
	results.forEach( ( r ) => process.stdout.write( describe( r ) + '\n' ) );
	const done = results.filter( ( r ) => r.ok ).length;
	process.stdout.write( `\n[move-control] ${ apply ? 'applied' : 'dry run' }: ${ done } of ${ results.length } row(s) ${ apply ? 'done' : 'can be done' }, ${ results.length - done } refused.\n` );
	if ( get( '--json' ) ) {
		fs.writeFileSync( get( '--json' ), JSON.stringify( results, null, 1 ) );
	}
}

module.exports = { planMove, planRename, runRows, blockFiles, describe };

if ( require.main === module ) {
	main();
}
