'use strict';

/**
 * adopt.js — rewrites an eligible inline colour-row object literal (inside
 * `<SgsColourPanel rows={[...]}>`) into a call to the shared row helper it is
 * semantically identical to: fillRow / textRow
 * (`src/components/colour-variants/*.js`, exported from the barrel
 * `src/components/index.js`).
 *
 * WHY THIS EXISTS. Measured 2026-08-22: 64 SGS blocks hand-assemble the same
 * colour-row object literal. The three helpers already exist and are proven —
 * this codemod is the ADOPTION half, replacing the inline shape with a call
 * to the helper it already matches, never inventing new behaviour.
 *
 * REFUSE RATHER THAN GUESS (same discipline as the sibling `fix.js` and
 * `migrate-tier-object.py`). Every refusal carries one of a small set of
 * named reasons — never a bare "couldn't do it" — and every named reason is
 * asserted by a self-test fixture that reproduces it for real.
 *
 * ⛔ D738 GUARD, INHERITED FROM `core/golden.js`'s `describeRow()`. Rule 31
 * resolves a row's state COUNT and gradient presence STATICALLY. Adopting a
 * helper changes the SOURCE SHAPE (a literal `states` array becomes a helper
 * call with no literal array at all) — `describeRow()` already special-cases
 * a helper call so the census does not go blind on adoption (see its own
 * header comment: adopting fillRow in sgs/process-steps once made a row
 * VANISH from the census purely because an EARLIER version of that function
 * didn't). This codemod's own round-trip self-test control re-proves that
 * invariant on THIS codemod's actual output, rather than trusting the prior
 * proof by inspection alone.
 *
 * Scope: this file rewrites `edit.js` ONLY. It never touches `render.php` or
 * `block.json` — the attribute names, wiring and rendered behaviour are
 * IDENTICAL before and after adoption (the helper is a façade over the exact
 * same literal shape), so there is nothing on those two files' side of the
 * boundary to change.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const babelParser = require( '@babel/parser' );

const {
	collectIndirectRowSources,
	jsxName,
	jsxAttrExpr,
	unwrapRowObject,
	rowHelperCall,
	describeRow,
	objProp,
	stringLiteralValue,
	resolveAttrName,
	resolveMechanismFromCssProperty,
	getColourCssPropertyMap,
} = require( '../inspector-scan/core/golden' );
const { SourceCache } = require( '../inspector-scan/core/sources' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
const EXPORTER = path.join( PLUGIN_ROOT, 'scripts', 'inspector-scan', 'export-colour-css-property.py' );
const COMPONENTS_IMPORT_SOURCE = '../../components';

const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
	errorRecovery: false,
};

const ROW_HELPERS = [ 'fillRow', 'textRow' ];
const ALLOWED_ROW_PROPS = [ 'key', 'label', 'states', 'gradientCapable', 'borderStyle', 'onBorderStyleChange' ];
const ALLOWED_STATE_PROPS = [ 'key', 'label', 'value', 'onChange', 'linked', 'gradientValue', 'onGradientChange' ];

// ---------------------------------------------------------------------------
// DB read — the plain (non --rich) shape: { slug: { attr: css_property|null } }
// ---------------------------------------------------------------------------
function loadDbRows() {
	const out = execFileSync( 'python', [ EXPORTER ], { encoding: 'utf8' } );
	if ( ! out || ! out.trim() ) {
		throw new Error( 'adopt: exporter returned nothing — refusing to treat every row as unresolved.' );
	}
	return JSON.parse( out );
}

function blockDirs() {
	if ( ! fs.existsSync( BLOCKS_DIR ) ) return [];
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( n ) => fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) )
		.sort();
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

function parse( src ) {
	return babelParser.parse( src, BABEL_PARSE_OPTS );
}

/**
 * Resolve a `rows`/pushed-array-like expression down to its raw ELEMENT nodes
 * — copied from fix.js's own `resolveArrayLike` (same three live shapes:
 * bare literal, `.push()`-assembled, declared-array + spread/conditional).
 * Deliberately returns RAW elements (not unwrapped) — adopt.js needs to tell
 * a bare `{...}` apart from a `cond && {...}` so it can replace only the
 * object PORTION and keep the conditional prefix intact.
 */
function resolveArrayLike( node, pushedRows, declaredArrays, depth ) {
	if ( ! node || depth > 6 ) return [];
	if ( node.type === 'ArrayExpression' ) {
		return node.elements.flatMap( ( el ) =>
			el && el.type === 'SpreadElement'
				? resolveArrayLike( el.argument, pushedRows, declaredArrays, depth + 1 )
				: [ el ]
		);
	}
	if ( node.type === 'Identifier' ) {
		if ( pushedRows[ node.name ] ) return pushedRows[ node.name ];
		if ( declaredArrays[ node.name ] ) return resolveArrayLike( declaredArrays[ node.name ], pushedRows, declaredArrays, depth + 1 );
		return [];
	}
	if ( node.type === 'ConditionalExpression' ) {
		return resolveArrayLike( node.consequent, pushedRows, declaredArrays, depth + 1 ).concat(
			resolveArrayLike( node.alternate, pushedRows, declaredArrays, depth + 1 )
		);
	}
	return [];
}

/**
 * Every `<SgsColourPanel rows={...}>` element in a file, as RAW nodes
 * (pre-unwrap — see resolveArrayLike's docblock for why).
 */
function rowElementsInFile( cache, file ) {
	if ( ! fs.existsSync( file ) ) return [];
	const elements = [];
	const { pushedRows, declaredArrays } = collectIndirectRowSources(
		( visitors ) => cache.traverse( file, visitors ),
		unwrapRowObject
	);
	cache.traverse( file, {
		JSXOpeningElement( p ) {
			const node = p.node;
			if ( jsxName( node ) !== 'SgsColourPanel' ) return;
			const rowsExpr = jsxAttrExpr( node, 'rows' );
			if ( ! rowsExpr ) return;
			elements.push( ...resolveArrayLike( rowsExpr, pushedRows, declaredArrays, 0 ) );
		},
	} );
	return elements;
}

function propsMap( objExpr ) {
	// Returns { ok, map, extraNames } — refuses (ok:false) on any spread /
	// computed key, since those are exactly the "computed row shape" this
	// tool must never guess through.
	const map = Object.create( null );
	for ( const p of objExpr.properties ) {
		if ( p.type !== 'ObjectProperty' || p.computed ) return { ok: false };
		const name = p.key.type === 'Identifier' ? p.key.name : p.key.type === 'StringLiteral' ? p.key.value : null;
		if ( ! name ) return { ok: false };
		map[ name ] = p;
	}
	return { ok: true, map };
}

/**
 * `( val ) => setAttributes( { attrName: val ?? '' } )` — exactly this shape,
 * nothing else. Returns { ok, reason }.
 */
function checkWriterShape( node, attrName ) {
	if ( ! node || node.type !== 'ArrowFunctionExpression' ) return { ok: false, reason: 'non-plain-attribute-write' };
	if ( node.params.length !== 1 || node.params[ 0 ].type !== 'Identifier' ) {
		return { ok: false, reason: 'non-plain-attribute-write' };
	}
	const paramName = node.params[ 0 ].name;
	if ( node.body.type !== 'CallExpression' ) return { ok: false, reason: 'non-plain-attribute-write' };
	const call = node.body;
	if ( ! call.callee || call.callee.type !== 'Identifier' || call.callee.name !== 'setAttributes' ) {
		return { ok: false, reason: 'non-plain-attribute-write' };
	}
	if ( call.arguments.length !== 1 || call.arguments[ 0 ].type !== 'ObjectExpression' ) {
		return { ok: false, reason: 'non-plain-attribute-write' };
	}
	const objArg = call.arguments[ 0 ];
	if ( objArg.properties.length !== 1 ) return { ok: false, reason: 'nested-style-writer' };
	const prop = objArg.properties[ 0 ];
	if ( prop.type !== 'ObjectProperty' || prop.computed ) return { ok: false, reason: 'nested-style-writer' };
	const propName = prop.key.type === 'Identifier' ? prop.key.name : prop.key.type === 'StringLiteral' ? prop.key.value : null;
	if ( ! propName || propName !== attrName ) return { ok: false, reason: 'non-plain-attribute-write' };
	const val = prop.value;
	if ( val.type === 'MemberExpression' || val.type === 'ObjectExpression' ) {
		return { ok: false, reason: 'nested-style-writer' };
	}
	if ( val.type !== 'LogicalExpression' || val.operator !== '??' ) return { ok: false, reason: 'non-plain-attribute-write' };
	if ( val.left.type !== 'Identifier' || val.left.name !== paramName ) return { ok: false, reason: 'non-plain-attribute-write' };
	if ( val.right.type !== 'StringLiteral' || val.right.value !== '' ) return { ok: false, reason: 'non-plain-attribute-write' };
	return { ok: true };
}

/**
 * Full eligibility gate for ONE row object (already unwrapped from any
 * `cond && {...}` conditional membership wrapper). Returns either
 * `{ ok:true, ... }` describing everything the writer needs, or
 * `{ ok:false, reason }` with one of the fixed named reasons.
 */
function evaluateRow( rowNode ) {
	if ( ! rowNode || rowNode.type !== 'ObjectExpression' ) {
		return { ok: false, reason: 'non-object-row-element' };
	}
	const rowProps = propsMap( rowNode );
	if ( ! rowProps.ok ) return { ok: false, reason: 'computed-row-shape' };
	const extraRow = Object.keys( rowProps.map ).filter( ( k ) => ! ALLOWED_ROW_PROPS.includes( k ) );
	if ( extraRow.length ) return { ok: false, reason: 'extra-row-props:' + extraRow.join( '+' ) };

	const keyProp = rowProps.map.key;
	if ( ! keyProp || keyProp.value.type !== 'StringLiteral' ) return { ok: false, reason: 'non-literal-key' };
	const labelProp = rowProps.map.label;
	if ( ! labelProp ) return { ok: false, reason: 'missing-label' };
	const statesProp = rowProps.map.states;
	if ( ! statesProp || statesProp.value.type !== 'ArrayExpression' ) {
		return { ok: false, reason: 'computed-states-array' };
	}
	const statesArray = statesProp.value;

	const stateByKey = Object.create( null );
	for ( const el of statesArray.elements ) {
		if ( ! el || el.type !== 'ObjectExpression' ) return { ok: false, reason: 'computed-states-array' };
		const stProps = propsMap( el );
		if ( ! stProps.ok ) return { ok: false, reason: 'computed-states-array' };
		const extraState = Object.keys( stProps.map ).filter( ( k ) => ! ALLOWED_STATE_PROPS.includes( k ) );
		if ( extraState.length ) return { ok: false, reason: 'extra-state-props:' + extraState.join( '+' ) };
		const stateKeyProp = stProps.map.key;
		const stateKey = stateKeyProp ? stringLiteralValue( stateKeyProp.value ) : null;
		if ( stateKey !== 'normal' && stateKey !== 'hover' ) {
			return { ok: false, reason: 'invalid-state-key:' + ( stateKey || '?' ) };
		}
		if ( stateByKey[ stateKey ] ) return { ok: false, reason: 'duplicate-state-key:' + stateKey };
		stateByKey[ stateKey ] = stProps.map;
	}
	if ( ! stateByKey.normal ) return { ok: false, reason: 'missing-normal-state' };

	function checkState( stMap ) {
		const valueProp = stMap.value;
		const onChangeProp = stMap.onChange;
		const linkedProp = stMap.linked;
		if ( ! valueProp || ! onChangeProp || ! linkedProp ) {
			return { ok: false, reason: 'missing-state-field' };
		}
		if ( linkedProp.value.type !== 'BooleanLiteral' || linkedProp.value.value !== true ) {
			return { ok: false, reason: 'non-plain-attribute-write' };
		}
		const attrName = resolveAttrName( valueProp.value );
		if ( ! attrName ) return { ok: false, reason: 'non-plain-attribute-write' };
		const writer = checkWriterShape( onChangeProp.value, attrName );
		if ( ! writer.ok ) return writer;

		let gradientAttrName = null;
		const gradValProp = stMap.gradientValue;
		const onGradProp = stMap.onGradientChange;
		if ( gradValProp || onGradProp ) {
			if ( ! gradValProp || ! onGradProp ) return { ok: false, reason: 'incomplete-gradient-pair' };
			gradientAttrName = resolveAttrName( gradValProp.value );
			if ( ! gradientAttrName ) return { ok: false, reason: 'non-plain-attribute-write' };
			const gw = checkWriterShape( onGradProp.value, gradientAttrName );
			if ( ! gw.ok ) return gw;
		}
		return { ok: true, attrName, gradientAttrName };
	}

	const normalCheck = checkState( stateByKey.normal );
	if ( ! normalCheck.ok ) return normalCheck;
	let hoverCheck = null;
	if ( stateByKey.hover ) {
		hoverCheck = checkState( stateByKey.hover );
		if ( ! hoverCheck.ok ) return hoverCheck;
	}

	const borderStyleProp = rowProps.map.borderStyle;
	const onBorderStyleChangeProp = rowProps.map.onBorderStyleChange;
	if ( !! borderStyleProp !== !! onBorderStyleChangeProp ) {
		return { ok: false, reason: 'incomplete-border-style-pair' };
	}
	const gradientCapableProp = rowProps.map.gradientCapable;
	let gradientCapableLiteralTrue = false;
	if ( gradientCapableProp ) {
		if ( gradientCapableProp.value.type !== 'BooleanLiteral' ) {
			return { ok: false, reason: 'non-literal-gradientCapable' };
		}
		gradientCapableLiteralTrue = gradientCapableProp.value.value === true;
	}

	return {
		ok: true,
		rowNode,
		keyProp,
		labelProp,
		base: normalCheck.attrName,
		hover: hoverCheck ? hoverCheck.attrName : null,
		gradient: normalCheck.gradientAttrName,
		hoverGradient: hoverCheck ? hoverCheck.gradientAttrName : null,
		borderStyleProp,
		onBorderStyleChangeProp,
		gradientCapableLiteralTrue,
	};
}

/**
 * Which helper a row adopts. Mirrors rule 31's own mechanism resolution
 * (`recordRowMechanism` in `31-golden-colour-control.js`) rather than
 * inventing a second property->mechanism dictionary (R-31-1 bans hardcoded
 * lookups) — reads `resolveMechanismFromCssProperty` off the SAME
 * `block_attributes.css_property` DB column, preferring the gradient
 * sibling's mechanism when it resolves (more specific evidence) and falling
 * back to the base attribute's.
 */
function decideHelper( map, slug, evalResult ) {
	if ( evalResult.borderStyleProp ) return { ok: false, reason: 'border-helper-missing' };
	if ( evalResult.gradientCapableLiteralTrue ) return { ok: true, helper: 'textRow' };

	const slugMap = map[ slug ] || {};
	const baseCss = evalResult.base ? slugMap[ evalResult.base ] ?? null : null;
	const gradCss = evalResult.gradient ? slugMap[ evalResult.gradient ] ?? null : null;
	const baseMech = resolveMechanismFromCssProperty( baseCss );
	const gradMech = resolveMechanismFromCssProperty( gradCss );
	const effective = gradMech.mechanisms.length ? gradMech.mechanisms : baseMech.mechanisms;

	if ( effective.length === 0 ) return { ok: false, reason: 'mechanism-unresolved' };
	if ( effective.length > 1 ) return { ok: false, reason: 'multiple-mechanisms-ambiguous:' + effective.join( '|' ) };
	const m = effective[ 0 ];
	if ( m === 'text' ) return { ok: true, helper: 'textRow' };
	if ( m === 'border' ) return { ok: false, reason: 'border-helper-missing' };
	if ( m === 'fill' || m === 'stroke' ) return { ok: true, helper: 'fillRow' };
	return { ok: false, reason: 'shadow-mechanism-not-adoptable' };
}

// ---------------------------------------------------------------------------
// Writer — text splicing, never a structural re-print of the whole file
// ---------------------------------------------------------------------------

function indentOfLine( src, pos ) {
	const lineStart = src.lastIndexOf( '\n', pos - 1 ) + 1;
	const m = src.slice( lineStart, pos ).match( /^[ \t]*/ );
	return m ? m[ 0 ] : '';
}

function detectIndentUnit( src ) {
	return /\n\t/.test( src ) ? '\t' : '  ';
}

function detectQuote( stringLiteralNode, src ) {
	const raw = src.slice( stringLiteralNode.start, stringLiteralNode.end );
	return raw[ 0 ] === "'" ? "'" : '"';
}

function buildHelperCallSource( { helper, keyProp, labelProp, attrs, borderStyleProp, onBorderStyleChangeProp, src, baseIndent, indentUnit } ) {
	const q = detectQuote( keyProp.value, src );
	const inner = baseIndent + indentUnit;
	const attrsIndent = inner + indentUnit;
	const keySrc = src.slice( keyProp.value.start, keyProp.value.end );
	const labelSrc = src.slice( labelProp.value.start, labelProp.value.end );

	const attrLines = [ `${ attrsIndent }base: ${ q }${ attrs.base }${ q },` ];
	if ( attrs.hover ) attrLines.push( `${ attrsIndent }hover: ${ q }${ attrs.hover }${ q },` );
	if ( attrs.gradient ) attrLines.push( `${ attrsIndent }gradient: ${ q }${ attrs.gradient }${ q },` );
	if ( attrs.hoverGradient ) attrLines.push( `${ attrsIndent }hoverGradient: ${ q }${ attrs.hoverGradient }${ q },` );

	const lines = [ `${ helper }( {` ];
	lines.push( `${ inner }key: ${ keySrc },` );
	lines.push( `${ inner }label: ${ labelSrc },` );
	lines.push( `${ inner }attrs: {` );
	lines.push( ...attrLines );
	lines.push( `${ inner }},` );
	if ( borderStyleProp ) {
		const bsSrc = src.slice( borderStyleProp.start, borderStyleProp.end );
		lines.push( `${ inner }${ bsSrc },` );
	}
	if ( onBorderStyleChangeProp ) {
		const obsSrc = src.slice( onBorderStyleChangeProp.start, onBorderStyleChangeProp.end );
		lines.push( `${ inner }${ obsSrc },` );
	}
	lines.push( `${ inner }attributes,` );
	lines.push( `${ inner }setAttributes,` );
	lines.push( `${ baseIndent }} )` );
	return lines.join( '\n' );
}

/**
 * Add named specifiers to the file's `from '../../components'` import,
 * skipping any already present. Handles both the single-line
 * (`import { A, B } from '...'`) and one-specifier-per-line multiline shapes
 * actually present in this tree (nav-drawer vs counter — see brief). Returns
 * `{ start, end, replacement }` or null if nothing needs to change.
 */
function planImportEdit( importNode, src, namesToAdd ) {
	const text = src.slice( importNode.start, importNode.end );
	const openIdx = text.indexOf( '{' );
	const closeIdx = text.lastIndexOf( '}' );
	if ( openIdx === -1 || closeIdx === -1 ) return null; // no named-import list — caller refuses the file
	const inner = text.slice( openIdx + 1, closeIdx );
	const existingNames = inner
		.split( ',' )
		.map( ( s ) => s.trim() )
		.filter( Boolean )
		.map( ( s ) => s.split( /\s+as\s+/ )[ 0 ].trim() );
	const toAdd = namesToAdd.filter( ( n ) => ! existingNames.includes( n ) );
	if ( ! toAdd.length ) return null;

	const isMultiline = /\n/.test( inner );
	let newInner;
	if ( isMultiline ) {
		const indentMatch = inner.match( /\n([ \t]*)\S/ );
		const indent = indentMatch ? indentMatch[ 1 ] : '\t';
		let body = inner;
		if ( ! /,\s*$/.test( body ) ) body = body.replace( /\s*$/, '' ) + ',\n';
		body += toAdd.map( ( n ) => `${ indent }${ n },\n` ).join( '' );
		newInner = body;
	} else {
		let body = inner.replace( /\s*$/, '' );
		if ( ! /,\s*$/.test( body ) ) body += ',';
		newInner = body + ' ' + toAdd.join( ', ' ) + ' ';
	}
	const newText = text.slice( 0, openIdx + 1 ) + newInner + text.slice( closeIdx );
	return { start: importNode.start, end: importNode.end, replacement: newText };
}

function findComponentsImport( ast ) {
	for ( const node of ast.program.body ) {
		if ( node.type === 'ImportDeclaration' && node.source.value === COMPONENTS_IMPORT_SOURCE ) {
			return node;
		}
	}
	return null;
}

/**
 * Plan every edit for ONE file (edits are computed against a SINGLE parse —
 * applied by descending start offset, so earlier offsets stay valid while
 * later ones are spliced in first).
 *
 * Returns `{ edits, adopted, refusals, alreadyAdopted }`.
 */
function planFile( db, file ) {
	const src = fs.readFileSync( file, 'utf8' );
	const ast = parse( src );
	const cache = new SourceCache();
	const elements = rowElementsInFile( cache, file );

	const adopted = [];
	const refusals = [];
	const alreadyAdopted = [];
	const helpersNeeded = new Set();

	for ( const rawEl of elements ) {
		if ( rowHelperCall( rawEl ) ) {
			alreadyAdopted.push( { rowKey: null } );
			continue;
		}
		const objNode = unwrapRowObject( rawEl );
		if ( ! objNode ) {
			refusals.push( { reason: 'REFUSED:non-object-row-element', line: rawEl.loc ? rawEl.loc.start.line : 0 } );
			continue;
		}
		const evalResult = evaluateRow( objNode );
		if ( ! evalResult.ok ) {
			refusals.push( { reason: 'REFUSED:' + evalResult.reason, line: objNode.loc ? objNode.loc.start.line : 0 } );
			continue;
		}
		const helperChoice = decideHelper( db, 'sgs/' + path.basename( path.dirname( file ) ), evalResult );
		if ( ! helperChoice.ok ) {
			refusals.push( { reason: 'REFUSED:' + helperChoice.reason, line: objNode.loc ? objNode.loc.start.line : 0 } );
			continue;
		}
		helpersNeeded.add( helperChoice.helper );
		adopted.push( { objNode, evalResult, helper: helperChoice.helper } );
	}

	if ( ! adopted.length ) {
		return { edits: [], adopted, refusals, alreadyAdopted, helpersNeeded: new Set() };
	}

	const importNode = findComponentsImport( ast );
	if ( ! importNode ) {
		// The whole FILE is refused — nothing in it is written, per the brief.
		return {
			edits: [],
			adopted: [],
			refusals: adopted
				.map( ( a ) => ( { reason: 'REFUSED:no-components-import', line: a.objNode.loc ? a.objNode.loc.start.line : 0 } ) )
				.concat( refusals ),
			alreadyAdopted,
			helpersNeeded: new Set(),
		};
	}

	const indentUnit = detectIndentUnit( src );
	const edits = [];
	for ( const a of adopted ) {
		const baseIndent = indentOfLine( src, a.objNode.start );
		const replacement = buildHelperCallSource( {
			helper: a.helper,
			keyProp: a.evalResult.keyProp,
			labelProp: a.evalResult.labelProp,
			attrs: { base: a.evalResult.base, hover: a.evalResult.hover, gradient: a.evalResult.gradient, hoverGradient: a.evalResult.hoverGradient },
			borderStyleProp: a.evalResult.borderStyleProp,
			onBorderStyleChangeProp: a.evalResult.onBorderStyleChangeProp,
			src,
			baseIndent,
			indentUnit,
		} );
		edits.push( { start: a.objNode.start, end: a.objNode.end, replacement } );
	}
	const importEdit = planImportEdit( importNode, src, Array.from( helpersNeeded ) );
	if ( importEdit ) edits.push( importEdit );

	return { edits, adopted, refusals, alreadyAdopted, helpersNeeded };
}

function applyEdits( src, edits ) {
	const sorted = edits.slice().sort( ( a, b ) => b.start - a.start );
	let out = src;
	for ( const e of sorted ) {
		out = out.slice( 0, e.start ) + e.replacement + out.slice( e.end );
	}
	return out;
}

// ---------------------------------------------------------------------------
// Survey / fix / check
// ---------------------------------------------------------------------------

function collectAll( db ) {
	const perFile = [];
	for ( const dir of blockDirs() ) {
		const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
		if ( ! fs.existsSync( editFile ) ) continue;
		const plan = planFile( db, editFile );
		if ( plan.adopted.length || plan.refusals.length || plan.alreadyAdopted.length ) {
			perFile.push( Object.assign( { dir, editFile }, plan ) );
		}
	}
	return perFile;
}

function runSurvey( { json } ) {
	const db = loadDbRows();
	const perFile = collectAll( db );
	let adoptable = 0;
	let refused = 0;
	let already = 0;
	const byReason = Object.create( null );
	for ( const f of perFile ) {
		adoptable += f.adopted.length;
		already += f.alreadyAdopted.length;
		for ( const r of f.refusals ) {
			refused++;
			const key = r.reason.split( ':' )[ 0 ] === 'REFUSED' ? r.reason.split( ':' ).slice( 0, 2 ).join( ':' ) : r.reason;
			byReason[ key ] = ( byReason[ key ] || 0 ) + 1;
		}
	}

	if ( json ) {
		console.log( JSON.stringify( { adoptable, refused, alreadyAdopted: already, byReason, files: perFile.length }, null, '\t' ) );
		return;
	}

	console.log( `\ncolour-codemod ADOPT survey — ${ adoptable } adoptable, ${ refused } refused, ${ already } already-adopted, across ${ perFile.length } file(s)\n` );
	console.log( 'Refusals by reason:' );
	for ( const [ reason, count ] of Object.entries( byReason ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ) ) {
		console.log( `  ${ count }  ${ reason }` );
	}
	console.log();
	for ( const f of perFile ) {
		if ( f.adopted.length ) console.log( `${ f.dir }: ${ f.adopted.length } adoptable (${ Array.from( f.helpersNeeded ).join( ', ' ) })` );
	}
	console.log();
}

function runFix( { apply } ) {
	const db = loadDbRows();
	const perFile = collectAll( db );
	let fixedFiles = 0;
	let fixedRows = 0;

	for ( const f of perFile ) {
		if ( ! f.edits.length ) {
			for ( const r of f.refusals ) console.log( `REFUSED ${ f.dir }: ${ r.reason } (line ${ r.line })` );
			continue;
		}
		const src = fs.readFileSync( f.editFile, 'utf8' );
		const newSrc = applyEdits( src, f.edits );
		fixedFiles++;
		fixedRows += f.adopted.length;
		console.log( `\n${ apply ? 'APPLIED' : 'WOULD FIX' } ${ f.dir }: ${ f.adopted.length } row(s) -> ${ Array.from( f.helpersNeeded ).join( ', ' ) }` );
		if ( ! apply ) {
			console.log( '--- ' + f.editFile );
			printLineDiff( src, newSrc );
		} else {
			fs.writeFileSync( f.editFile, newSrc, 'utf8' );
		}
		for ( const r of f.refusals ) console.log( `  REFUSED (same file): ${ r.reason } (line ${ r.line })` );
	}

	console.log( `\n${ apply ? 'Applied' : 'Would apply' } ${ fixedRows } row adoption(s) across ${ fixedFiles } file(s).\n` );
	return { fixedFiles, fixedRows };
}

/**
 * Multi-hunk line diff via a real LCS (dynamic programming) — a single
 * prefix/suffix-trim diff (the sibling fix.js's approach, fine for its
 * single-row edits) prints the ENTIRE file as changed once a row is followed
 * by a second, unrelated edit further down (this codemod routinely rewrites
 * 2-8 rows in the same file plus the import line), because nothing after
 * the FIRST unmatched line is ever considered a re-sync point. Verified live
 * against sgs/heading (3 rows + 1 import edit): the trim approach reported
 * every one of its ~700 lines as changed; this one reports the true ~40.
 */
function lineDiff( before, after ) {
	const a = before.split( '\n' );
	const b = after.split( '\n' );
	const n = a.length;
	const m = b.length;
	// dp[i][j] = length of the LCS of a[i..] and b[j..]
	const dp = Array.from( { length: n + 1 }, () => new Uint32Array( m + 1 ) );
	for ( let i = n - 1; i >= 0; i-- ) {
		for ( let j = m - 1; j >= 0; j-- ) {
			dp[ i ][ j ] = a[ i ] === b[ j ] ? dp[ i + 1 ][ j + 1 ] + 1 : Math.max( dp[ i + 1 ][ j ], dp[ i ][ j + 1 ] );
		}
	}
	const ops = [];
	let i = 0;
	let j = 0;
	while ( i < n && j < m ) {
		if ( a[ i ] === b[ j ] ) {
			ops.push( { type: 'same', line: a[ i ] } );
			i++;
			j++;
		} else if ( dp[ i + 1 ][ j ] >= dp[ i ][ j + 1 ] ) {
			ops.push( { type: 'del', line: a[ i ] } );
			i++;
		} else {
			ops.push( { type: 'add', line: b[ j ] } );
			j++;
		}
	}
	while ( i < n ) ops.push( { type: 'del', line: a[ i++ ] } );
	while ( j < m ) ops.push( { type: 'add', line: b[ j++ ] } );
	return ops;
}

function printLineDiff( before, after ) {
	if ( before === after ) {
		console.log( '  (no change)' );
		return;
	}
	for ( const op of lineDiff( before, after ) ) {
		if ( op.type === 'del' ) console.log( '  - ' + op.line );
		else if ( op.type === 'add' ) console.log( '  + ' + op.line );
	}
}

function runCheck() {
	const db = loadDbRows();
	const perFile = collectAll( db );
	const total = perFile.reduce( ( n, f ) => n + f.adopted.length, 0 );
	if ( total > 0 ) {
		console.log( `[adopt --check] ${ total } adoptable row(s) remain unadopted:` );
		for ( const f of perFile ) {
			if ( f.adopted.length ) console.log( `  ${ f.dir }: ${ f.adopted.length }` );
		}
		process.exitCode = 1;
		return;
	}
	console.log( '[adopt --check] OK — no outstanding adoptable rows.' );
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------

function assert( cond, msg ) {
	if ( ! cond ) throw new Error( 'SELF-TEST FAILED: ' + msg );
}

function makeFixture( tmpDir, name, editJs ) {
	const dir = path.join( tmpDir, name );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'edit.js' ), editJs, 'utf8' );
	fs.writeFileSync(
		path.join( dir, 'block.json' ),
		JSON.stringify( { apiVersion: 3, name: 'sgs/' + name, attributes: {} }, null, '\t' ) + '\n',
		'utf8'
	);
	return dir;
}

const FIXTURE_HEADER = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { titleColour, titleColourGradient, titleColourHover, titleColourHoverGradient, borderColour, borderStyle } = attributes;
	return (
`;
const FIXTURE_FOOTER = `
	);
}
`;

// A textRow-eligible row: gradientCapable literal true, 2 states, each with a gradient.
const FIXTURE_TEXT_ROW = `		<SgsColourPanel
			rows={ [
				{
					key: 'title',
					label: __( 'Title colour', 'sgs-blocks' ),
					gradientCapable: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: titleColour,
							onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
							linked: true,
							gradientValue: titleColourGradient,
							onGradientChange: ( val ) => setAttributes( { titleColourGradient: val ?? '' } ),
						},
						{
							key: 'hover',
							label: __( 'Hover', 'sgs-blocks' ),
							value: titleColourHover,
							onChange: ( val ) => setAttributes( { titleColourHover: val ?? '' } ),
							linked: true,
							gradientValue: titleColourHoverGradient,
							onGradientChange: ( val ) => setAttributes( { titleColourHoverGradient: val ?? '' } ),
						},
					],
				},
			] }
		/>`;

// A borderRow-eligible row (heading's real "Border colour" shape): single state,
// borderStyle/onBorderStyleChange passthrough.
const FIXTURE_BORDER_ROW = `		<SgsColourPanel
			rows={ [
				{
					key: 'border',
					label: __( 'Border colour', 'sgs-blocks' ),
					borderStyle,
					onBorderStyleChange: ( val ) => setAttributes( { borderStyle: val } ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: borderColour,
							onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							linked: true,
						},
					],
				},
			] }
		/>`;

// Refusal fixture: computed states array.
const FIXTURE_COMPUTED_STATES = `		<SgsColourPanel
			rows={ [
				{
					key: 'title',
					label: __( 'Title colour', 'sgs-blocks' ),
					states: [ 'normal', 'hover' ].map( ( k ) => ( {
						key: k,
						label: k,
						value: titleColour,
						onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
						linked: true,
					} ) ),
				},
			] }
		/>`;

function runSelfTest() {
	const os = require( 'os' );
	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-colour-adopt-selftest-' ) );
	let failures = 0;

	function check( label, fn ) {
		try {
			fn();
			console.log( '  PASS  ' + label );
		} catch ( e ) {
			failures++;
			console.log( '  FAIL  ' + label + '\n        ' + e.message );
		}
	}

	// decideHelper reads db[slug][attr] as a plain scalar css_property — the
	// exact shape the real (non --rich) exporter returns (loadDbRows above).
	const dbPlain = {
		'sgs/fixture-text': { titleColour: 'color' },
		'sgs/fixture-border': { borderColour: 'border-color' },
		'sgs/fixture-fill': { fillColour: 'background-color' },
		'sgs/fixture-computed': { titleColour: 'color' },
		'sgs/fixture-no-import': { titleColour: 'color' },
	};

	// --- textRow adoption: plan + apply + round-trip + idempotence ---
	const fxText = makeFixture( tmpRoot, 'fixture-text', FIXTURE_HEADER + FIXTURE_TEXT_ROW + FIXTURE_FOOTER );
	const editFileText = path.join( fxText, 'edit.js' );

	let planText;
	check( 'textRow row plans as adoptable (gradientCapable:true -> textRow)', () => {
		planText = planFile( dbPlain, editFileText );
		assert( planText.adopted.length === 1, 'expected 1 adoptable row, got ' + planText.adopted.length + ' (refusals: ' + JSON.stringify( planText.refusals ) + ')' );
		assert( planText.adopted[ 0 ].helper === 'textRow', 'expected textRow, got ' + planText.adopted[ 0 ].helper );
	} );

	let beforeDescribeText;
	check( 'round-trip control (BEFORE): describeRow() on the literal object', () => {
		const src = fs.readFileSync( editFileText, 'utf8' );
		const cache = new SourceCache();
		const elements = rowElementsInFile( cache, editFileText );
		assert( elements.length === 1, 'expected 1 row element' );
		beforeDescribeText = describeRow( unwrapRowObject( elements[ 0 ] ) );
		assert( beforeDescribeText, 'describeRow returned null on the literal row' );
		assert( beforeDescribeText.statesCount === 2, 'expected statesCount 2, got ' + beforeDescribeText.statesCount );
		assert( beforeDescribeText.hasGradient === true, 'expected hasGradient true' );
	} );

	let newSrcText;
	check( 'DRY RUN writes nothing', () => {
		const before = fs.readFileSync( editFileText, 'utf8' );
		newSrcText = applyEdits( before, planText.edits );
		assert( fs.readFileSync( editFileText, 'utf8' ) === before, 'dry-run construction mutated the file on disk' );
		assert( newSrcText !== before, 'expected the constructed output to differ from the input' );
		assert( /import \{ __, textRow \} from '..\/..\/components';|textRow\s*,?\s*\}\s*from '\.\.\/\.\.\/components'/.test( newSrcText ) || newSrcText.includes( 'textRow' ), 'expected textRow to appear in the import' );
	} );

	check( 'APPLY writes the helper call', () => {
		fs.writeFileSync( editFileText, newSrcText, 'utf8' );
		const src = fs.readFileSync( editFileText, 'utf8' );
		assert( /textRow\(\s*\{/.test( src ), 'expected a textRow( { ... } ) call in the output' );
		assert( ! /gradientCapable:\s*true/.test( src ), 'expected the inline gradientCapable literal to be gone — it is now implied by textRow' );
	} );

	check( 'round-trip control (AFTER): describeRow() on the rewritten helper call matches BEFORE', () => {
		const src = fs.readFileSync( editFileText, 'utf8' );
		const cache = new SourceCache();
		const elements = rowElementsInFile( cache, editFileText );
		assert( elements.length === 1, 'expected 1 row element after rewrite' );
		assert( rowHelperCall( elements[ 0 ] ), 'expected the rewritten element to be a recognised helper call' );
		const afterDescribe = describeRow( elements[ 0 ] );
		assert( afterDescribe, 'describeRow returned null on the rewritten helper call' );
		assert(
			afterDescribe.statesCount === beforeDescribeText.statesCount,
			`statesCount drifted: before ${ beforeDescribeText.statesCount }, after ${ afterDescribe.statesCount } — adoption BLINDED the census (D738 class)`
		);
		assert(
			afterDescribe.hasGradient === beforeDescribeText.hasGradient,
			`hasGradient drifted: before ${ beforeDescribeText.hasGradient }, after ${ afterDescribe.hasGradient }`
		);
		assert( afterDescribe.attrName === beforeDescribeText.attrName, 'attrName drifted' );
		assert( afterDescribe.gradientAttrName === beforeDescribeText.gradientAttrName, 'gradientAttrName drifted' );
	} );

	check( 'detection control: --check-equivalent goes from non-zero to zero', () => {
		// Re-plan straight off disk (post-adoption) — must find nothing left.
		const rePlan = planFile( dbPlain, editFileText );
		assert( rePlan.adopted.length === 0, 'expected 0 remaining adoptable rows after adoption, got ' + rePlan.adopted.length );
	} );

	check( 'idempotence control: re-planning an already-adopted file makes zero further edits', () => {
		const before = fs.readFileSync( editFileText, 'utf8' );
		const rePlan = planFile( dbPlain, editFileText );
		assert( rePlan.edits.length === 0, 'expected zero edits on the second pass, got ' + rePlan.edits.length );
		const after = applyEdits( before, rePlan.edits );
		assert( after === before, 'applying an empty edit set must be a byte-identical no-op' );
	} );

	// --- Border rows are REFUSED: the helper they used to adopt no longer exists ---
	// `src/components/colour-variants/borderRow.js` was DELETED at dd2989ec2 and is
	// not exported from the barrel. Until this codemod emitted a refusal, it wrote
	// `import { borderRow } from '../../components'` into real block edit.js files —
	// a webpack export-not-found that kills that block's editor. The previous version
	// of THIS test asserted the broken emit as correct, so the suite stayed green
	// while producing it. If a border row helper is ever restored, re-point the
	// branches in decideHelper() and this fixture in the SAME commit.
	const fxBorder = makeFixture( tmpRoot, 'fixture-border', FIXTURE_HEADER + FIXTURE_BORDER_ROW + FIXTURE_FOOTER );
	const editFileBorder = path.join( fxBorder, 'edit.js' );

	check( 'border row is refused by name, file byte-identical, no borderRow emitted', () => {
		const before = fs.readFileSync( editFileBorder, 'utf8' );
		const plan = planFile( dbPlain, editFileBorder );
		assert( plan.adopted.length === 0, 'expected 0 adoptable rows, got ' + plan.adopted.length );
		assert( plan.refusals.length === 1, 'expected exactly 1 refusal, got ' + plan.refusals.length );
		assert( plan.refusals[ 0 ].reason === 'REFUSED:border-helper-missing', 'wrong reason: ' + plan.refusals[ 0 ].reason );
		const after = applyEdits( before, plan.edits );
		assert( after === before, 'a refused row must leave the file byte-identical' );
		assert( ! /borderRow/.test( after ), 'no borderRow reference may survive into emitted output' );
	} );

	check( 'emit vocabulary is a subset of the components barrel exports', () => {
		// The check that would have caught dd2989ec2 on the day it landed: every
		// helper this codemod can WRITE must be exported from src/components/index.js,
		// because that is the import it writes alongside the call.
		const barrel = fs.readFileSync(
			path.join( __dirname, '..', '..', 'src', 'components', 'index.js' ),
			'utf8'
		);
		const missing = ROW_HELPERS.filter(
			( name ) => ! barrel.includes( 'as ' + name + ' }' )
		);
		assert(
			missing.length === 0,
			'ROW_HELPERS names not exported from src/components/index.js: ' + missing.join( ', ' ) +
				' — a codemod that emits an unresolvable import breaks the block it edits'
		);
	} );

	// --- Refusal control: computed states array ---
	const fxComputed = makeFixture( tmpRoot, 'fixture-computed', FIXTURE_HEADER + FIXTURE_COMPUTED_STATES + FIXTURE_FOOTER );
	const editFileComputed = path.join( fxComputed, 'edit.js' );

	check( 'refusal control: computed states array is refused by name, file byte-identical', () => {
		const before = fs.readFileSync( editFileComputed, 'utf8' );
		const plan = planFile( dbPlain, editFileComputed );
		assert( plan.adopted.length === 0, 'expected 0 adoptable rows, got ' + plan.adopted.length );
		assert( plan.refusals.length === 1, 'expected exactly 1 refusal, got ' + plan.refusals.length );
		assert( plan.refusals[ 0 ].reason === 'REFUSED:computed-states-array', 'wrong reason: ' + plan.refusals[ 0 ].reason );
		const after = applyEdits( before, plan.edits );
		assert( after === before, 'a refused row must leave the file byte-identical' );
	} );

	// --- Refusal control: extra row prop ---
	const FIXTURE_EXTRA_PROP = `		<SgsColourPanel
			rows={ [
				{
					key: 'title',
					label: __( 'Title colour', 'sgs-blocks' ),
					disabled: true,
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: titleColour,
							onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
							linked: true,
						},
					],
				},
			] }
		/>`;
	const fxExtra = makeFixture( tmpRoot, 'fixture-extra-prop', FIXTURE_HEADER + FIXTURE_EXTRA_PROP + FIXTURE_FOOTER );
	check( 'refusal control: an extra row property is refused by name', () => {
		const plan = planFile( dbPlain, path.join( fxExtra, 'edit.js' ) );
		assert( plan.adopted.length === 0, 'expected 0 adoptable rows' );
		assert( plan.refusals[ 0 ].reason === 'REFUSED:extra-row-props:disabled', 'wrong reason: ' + plan.refusals[ 0 ].reason );
	} );

	// --- Refusal control: no components import in the file ---
	const FIXTURE_NO_IMPORT = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from './local-colour-panel';

export default function Edit( { attributes, setAttributes } ) {
	const { titleColour } = attributes;
	return (
` + FIXTURE_TEXT_ROW + FIXTURE_FOOTER;
	const fxNoImport = makeFixture( tmpRoot, 'fixture-no-import', FIXTURE_NO_IMPORT );
	check( 'refusal control: no ../../components import refuses the whole file', () => {
		const plan = planFile( dbPlain, path.join( fxNoImport, 'edit.js' ) );
		assert( plan.adopted.length === 0, 'expected 0 adoptable rows when there is no components import' );
		assert( plan.refusals.length === 1 && plan.refusals[ 0 ].reason === 'REFUSED:no-components-import', 'wrong refusal: ' + JSON.stringify( plan.refusals ) );
	} );

	// --- Mechanism resolution (no gradientCapable, no borderStyle) ---
	const FIXTURE_FILL_ROW = `		<SgsColourPanel
			rows={ [
				{
					key: 'fill',
					label: __( 'Fill colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: fillColour,
							onChange: ( val ) => setAttributes( { fillColour: val ?? '' } ),
							linked: true,
						},
					],
				},
			] }
		/>`;
	const fillHeader = `import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { fillColour } = attributes;
	return (
`;
	const fxFill = makeFixture( tmpRoot, 'fixture-fill', fillHeader + FIXTURE_FILL_ROW + FIXTURE_FOOTER );
	check( 'mechanism resolution: css_property=background-color -> fillRow', () => {
		const plan = planFile( dbPlain, path.join( fxFill, 'edit.js' ) );
		assert( plan.adopted.length === 1, 'expected 1 adoptable row, refusals: ' + JSON.stringify( plan.refusals ) );
		assert( plan.adopted[ 0 ].helper === 'fillRow', 'expected fillRow, got ' + plan.adopted[ 0 ].helper );
	} );

	check( 'mechanism resolution: unresolved css_property is REFUSED, never guessed', () => {
		const dbUnresolved = { 'sgs/fixture-fill': { fillColour: null } };
		const plan = planFile( dbUnresolved, path.join( fxFill, 'edit.js' ) );
		assert( plan.adopted.length === 0, 'expected 0 adoptable rows when the mechanism is unresolved' );
		assert( plan.refusals[ 0 ].reason === 'REFUSED:mechanism-unresolved', 'wrong reason: ' + plan.refusals[ 0 ].reason );
	} );

	console.log( `\n${ failures === 0 ? 'ALL SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED' } (tmp dir: ${ tmpRoot })\n` );
	process.exitCode = failures === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) return runSelfTest();
	if ( argv.includes( '--check' ) ) return runCheck();
	if ( argv.includes( '--survey' ) ) return runSurvey( { json: argv.includes( '--json' ) } );
	if ( argv.includes( '--fix' ) ) return void runFix( { apply: argv.includes( '--apply' ) } );
	console.log(
		'Usage: node adopt.js --survey [--json] | node adopt.js --fix [--apply] | node adopt.js --check | node adopt.js --self-test'
	);
	process.exitCode = 1;
}

if ( require.main === module ) {
	main();
}

// Exported for ad-hoc inspection only (e.g. `node -e "require(...).planFile(...)"`)
// — the CLI above is the real interface; nothing here changes its behaviour.
module.exports = { planFile, applyEdits, collectAll };
