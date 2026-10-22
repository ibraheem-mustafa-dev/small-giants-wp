'use strict';
/**
 * surface-tree-shape.js
 *
 * Pure, browser-free check that a header or footer block tree has the shape SGS's template-locked posts demand:
 * exactly one root block (`sgs/site-header` / `sgs/site-footer`) that holds its template's row blocks, each with its
 * `rowSlot`, in the template's order (Spec 37 FR-37-46).
 *
 * The rows come from each container's own `src/blocks/<block>/edit.js::TEMPLATE`, read by parsing (FP-1: no hand-written
 * slot list). A container counts as slotted when its TEMPLATE is one row block type repeated, every entry carrying a
 * string `rowSlot`; a future container of that shape is covered with no edit here.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { createRequire } = require( 'module' );

const DEFAULT_BLOCKS_DIR = path.join( __dirname, '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' );
const routeRequire = createRequire( path.join( __dirname, '..', 'computed-route', 'package.json' ) );

let parser = null;
const cache = new Map();

const strOf = ( n ) => ( n && 'StringLiteral' === n.type ? n.value : null );

// The `{ name, rowSlot }` rows of a parsed `const TEMPLATE = [ [ 'name', { rowSlot: '…' }, … ], … ]`, or null when the
// TEMPLATE is a literal array none of whose entries has a rowSlot (not a slotted container) or the file has no TEMPLATE.
// A source that mentions rowSlot and holds a TEMPLATE the guard cannot read (a spread, a variable, a call, a computed
// rowSlot, an entry without one among entries with one, mixed row types, a parse error) throws a plain error naming
// `file`: a container the guard cannot read must not pass as "not slotted".
function rowsOfSource( source, file = 'edit.js' ) {
	const fail = ( why ) => {
		throw new Error( `${ file }: its TEMPLATE mentions rowSlot but the guard cannot read it (${ why }); write the TEMPLATE as a literal array of [ 'block/name', { rowSlot: 'slot' } ] entries, all of one row block` );
	};
	parser = parser || routeRequire( '@babel/parser' );
	let ast;
	try {
		ast = parser.parse( source, { sourceType: 'module', plugins: [ 'jsx' ], errorRecovery: true } );
	} catch ( e ) {
		return fail( `parse error: ${ e.message }` );
	}
	if ( ast.errors && ast.errors.length ) {
		fail( `parse error: ${ ast.errors[ 0 ].message }` );
	}
	for ( const top of ast.program.body ) {
		const stmt = 'ExportNamedDeclaration' === top.type && top.declaration ? top.declaration : top;
		const d = 'VariableDeclaration' === stmt.type ? stmt.declarations.find( ( x ) => x.id && 'TEMPLATE' === x.id.name ) : null;
		if ( ! d ) {
			continue;
		}
		if ( ! d.init || 'ArrayExpression' !== d.init.type ) {
			fail( 'it is not a literal array' );
		}
		const rows = [];
		let plain = 0;
		for ( const entry of d.init.elements ) {
			if ( ! entry || 'ArrayExpression' !== entry.type ) {
				fail( 'an entry is not a literal [ name, attributes ] array' );
			}
			const name = strOf( entry.elements[ 0 ] );
			const attrs = entry.elements[ 1 ];
			if ( ! name ) {
				fail( 'an entry\'s block name is not a string' );
			}
			if ( attrs && 'ObjectExpression' !== attrs.type ) {
				fail( `the attributes of ${ name } are not a literal object` );
			}
			const props = attrs ? attrs.properties : [];
			if ( props.some( ( p ) => 'ObjectProperty' !== p.type || p.computed ) ) {
				fail( `the attributes of ${ name } hold a spread, a method or a computed key` );
			}
			const slotProp = props.find( ( p ) => p.key && ( p.key.name === 'rowSlot' || p.key.value === 'rowSlot' ) );
			if ( ! slotProp ) {
				plain += 1;
				continue;
			}
			const rowSlot = strOf( slotProp.value );
			if ( ! rowSlot ) {
				fail( `the rowSlot of ${ name } is not a string literal` );
			}
			rows.push( { name, rowSlot } );
		}
		if ( ! rows.length ) {
			return null;
		}
		if ( plain ) {
			fail( 'some entries have a rowSlot and some do not' );
		}
		if ( ! rows.every( ( r ) => r.name === rows[ 0 ].name ) ) {
			fail( 'its rows are of more than one block type' );
		}
		return rows;
	}
	return null;
}

/**
 * Every slotted container under a blocks directory: Map<root block name, [ { name, rowSlot } ]>.
 * @param {string} blocksDir `plugins/sgs-blocks/src/blocks` (or a fixture of the same shape).
 */
function slottedContainers( blocksDir = DEFAULT_BLOCKS_DIR ) {
	if ( cache.has( blocksDir ) ) {
		return cache.get( blocksDir );
	}
	const out = new Map();
	for ( const dir of fs.readdirSync( blocksDir ) ) {
		const edit = path.join( blocksDir, dir, 'edit.js' );
		const meta = path.join( blocksDir, dir, 'block.json' );
		if ( ! fs.existsSync( edit ) || ! fs.existsSync( meta ) ) {
			continue;
		}
		const source = fs.readFileSync( edit, 'utf8' );
		if ( ! source.includes( 'rowSlot' ) || ! source.includes( 'TEMPLATE' ) ) {
			continue;
		}
		const rows = rowsOfSource( source, edit );
		const name = JSON.parse( fs.readFileSync( meta, 'utf8' ) ).name;
		rows && name && out.set( name, rows );
	}
	cache.set( blocksDir, out );
	return out;
}

const label = ( b, i ) => `row ${ i + 1 } (${ b && b.name })`;

// The problems of one root block against its template rows.
function rowProblems( root, rows ) {
	const out = [];
	const got = Array.isArray( root.innerBlocks ) ? root.innerBlocks : [];
	const rowName = rows[ 0 ].name;
	const want = rows.map( ( r ) => r.rowSlot );
	const slotOf = ( b ) => ( b && b.attributes && 'string' === typeof b.attributes.rowSlot && b.attributes.rowSlot ? b.attributes.rowSlot : null );
	got.forEach( ( b, i ) => {
		if ( ! b || b.name !== rowName ) {
			out.push( `${ root.name } holds ${ label( b, i ) }, but its only rows are ${ rowName }` );
		} else if ( ! slotOf( b ) ) {
			out.push( `${ label( b, i ) } has no rowSlot (it must be one of ${ want.join( ', ' ) })` );
		}
	} );
	const slots = got.map( slotOf ).filter( Boolean );
	want.filter( ( s ) => ! slots.includes( s ) ).forEach( ( s ) => out.push( `${ root.name } is missing its "${ s }" row (${ rowName } with rowSlot "${ s }")` ) );
	const seen = new Set();
	slots.forEach( ( s ) => {
		if ( ! want.includes( s ) ) {
			out.push( `${ root.name } has an extra row with rowSlot "${ s }" (its rows are ${ want.join( ', ' ) })` );
		} else if ( seen.has( s ) ) {
			out.push( `${ root.name } has the "${ s }" row more than once` );
		}
		seen.add( s );
	} );
	if ( ! out.length && slots.join( '|' ) !== want.join( '|' ) ) {
		out.push( `${ root.name } rows are out of order: ${ slots.join( ', ' ) }; they must be ${ want.join( ', ' ) }` );
	}
	return out;
}

/**
 * The problems of a tree that must be exactly one `expected` root block holding its template's slotted rows.
 * @param {Array} tree Blocks `{ name, attributes, innerBlocks }`.
 * @param {string} expected The root block name (`sgs/site-header`).
 * @param {{blocksDir?: string}} [opts]
 * @returns {string[]} Plain-words problems; empty when the tree is right.
 */
function surfaceTreeProblems( tree, expected, opts = {} ) {
	const out = [];
	const list = Array.isArray( tree ) ? tree : [];
	if ( 1 !== list.length ) {
		out.push( `the tree must be exactly one ${ expected } block, but it has ${ list.length } top-level blocks${ list.length ? ` (${ list.map( ( b ) => b && b.name ).join( ', ' ) })` : '' }` );
	}
	const root = list.find( ( b ) => b && b.name === expected );
	if ( list.length && ! root ) {
		out.push( `the top-level block is ${ list.map( ( b ) => b && b.name ).join( ', ' ) }, not ${ expected }` );
	}
	const rows = slottedContainers( opts.blocksDir ).get( expected );
	if ( root && rows ) {
		out.push( ...rowProblems( root, rows ) );
	}
	return out;
}

/**
 * Before the browser opens: when the top level holds a slotted container (any, per its edit.js), the tree must be that
 * one root with its rows; a slotted container nested anywhere below the top level is a problem. A tree with no slotted
 * container anywhere is not this check's business.
 * @returns {string[]}
 */
function slottedRootProblems( tree, opts = {} ) {
	const containers = slottedContainers( opts.blocksDir );
	const list = Array.isArray( tree ) ? tree : [];
	const roots = list.filter( ( b ) => b && containers.has( b.name ) );
	const out = roots.length ? surfaceTreeProblems( tree, roots[ 0 ].name, opts ) : [];
	// A slotted container anywhere below the top level is not the sole root: a header or footer nested in another block.
	const walk = ( blocks, trail ) => ( Array.isArray( blocks ) ? blocks : [] ).forEach( ( b ) => {
		if ( ! b ) {
			return;
		}
		trail.length && containers.has( b.name ) && out.push( `${ b.name } is nested inside ${ trail.join( ' > ' ) }, but it must be the only top-level block of its post` );
		walk( b.innerBlocks, [ ...trail, b.name ] );
	} );
	walk( list, [] );
	return out;
}

/**
 * Once the editor is open: the post's own template. When it is one block under lock "all", the tree must be exactly that
 * root block, with its rows when that block is a slotted container.
 * @param {Array} tree
 * @param {{template?: Array, templateLock?: string|false}|null} settings `wp.data.select('core/editor').getEditorSettings()` template and lock.
 * @returns {string[]}
 */
function lockedTemplateProblems( tree, settings, opts = {} ) {
	const template = settings && Array.isArray( settings.template ) ? settings.template : [];
	if ( 1 !== template.length || 'all' !== ( settings && settings.templateLock ) || ! Array.isArray( template[ 0 ] ) || 'string' !== typeof template[ 0 ][ 0 ] ) {
		return [];
	}
	return surfaceTreeProblems( tree, template[ 0 ][ 0 ], opts );
}

module.exports = { slottedContainers, surfaceTreeProblems, slottedRootProblems, lockedTemplateProblems, rowsOfSource };
