'use strict';

/**
 * survey.js — the CENSUS half of the colour-conformance triad (D542).
 *
 * WHY THIS EXISTS. rule 31 already answers "which rows are wrong?" (388
 * findings across 61 blocks). It does NOT answer "which of those can a codemod
 * fix without guessing?", and that is the only question deciding whether this
 * is one script or fifteen agent dispatches. D542 is explicit: if an item
 * touches more than ~3 blocks the first deliverable is the detector, not the
 * edit — and the survey runs BEFORE the design, not after it.
 *
 * IT WRITES NOTHING. Census only. The --fix half is deliberately not in this
 * file yet: a fixer written before its own census has no way to know what it
 * should be refusing.
 *
 * AUTOFIXABILITY IS GATED ON DATA, NOT ON AMBITION. Adding a hover state or a
 * gradient path is two mechanical edits (edit.js + block.json). The THIRD edit
 * — emitting the actual CSS rule — needs a SELECTOR, and a selector cannot be
 * guessed from an attribute name. Measured: derived_selector is populated for
 * only ~35% of colour attrs. A row whose selector is unknown is reported as
 * NEEDS-DATA and never auto-fixed — the same refuse-rather-than-guess rule
 * migrate-tier-object.py applies to its own UNCLEAR class.
 *
 * Reuses core/golden.js + core/sources.js wholesale. collectIndirectRowSources
 * in particular cost a 33-row undercount to get right (product-card, nav-menu
 * and social-icons build their rows prop indirectly and scored ZERO before it
 * existed). It must never be reimplemented alongside the original.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const { SourceCache } = require( '../inspector-scan/core/sources' );
const {
	collectIndirectRowSources,
	jsxName,
	findJsxAttr,
	jsxAttrExpr,
	unwrapRowObject,
	objProp,
	stringLiteralValue,
	booleanLiteralValue,
	normalStateAttrName,
	statesArrayHasGradient,
	slugify,
	resolveMechanismFromCssProperty,
} = require( '../inspector-scan/core/golden' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
const EXPORTER = path.join(
	PLUGIN_ROOT,
	'scripts',
	'inspector-scan',
	'export-colour-css-property.py'
);

/**
 * Rich DB rows. Fails CLOSED — a silent empty map here would classify every
 * row as NEEDS-DATA and read as "nothing is auto-fixable", which is
 * indistinguishable from a correct answer. Same guard rule 31 already carries.
 */
function loadDbRows() {
	const out = execFileSync( 'python', [ EXPORTER, '--rich' ], { encoding: 'utf8' } );
	if ( ! out || ! out.trim() ) {
		throw new Error(
			'survey: exporter returned nothing — refusing to treat every row as unresolved.'
		);
	}
	return JSON.parse( out );
}

function blockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( n ) => fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) )
		.sort();
}

/** Every colour ROW in one edit.js, mirroring rule 31's own walk exactly. */
function rowsInFile( cache, file ) {
	const rows = [];
	if ( ! fs.existsSync( file ) ) return rows;

	const { pushedRows, declaredArrays } = collectIndirectRowSources(
		( visitors ) => cache.traverse( file, visitors ),
		unwrapRowObject
	);

	function resolveArrayLike( node, depth ) {
		if ( ! node || depth > 6 ) return [];
		if ( node.type === 'ArrayExpression' ) {
			return node.elements.flatMap( ( el ) =>
				el && el.type === 'SpreadElement'
					? resolveArrayLike( el.argument, depth + 1 )
					: [ el ]
			);
		}
		if ( node.type === 'Identifier' ) {
			if ( pushedRows[ node.name ] ) return pushedRows[ node.name ];
			if ( declaredArrays[ node.name ] ) {
				return resolveArrayLike( declaredArrays[ node.name ], depth + 1 );
			}
			return [];
		}
		if ( node.type === 'ConditionalExpression' ) {
			return resolveArrayLike( node.consequent, depth + 1 ).concat(
				resolveArrayLike( node.alternate, depth + 1 )
			);
		}
		if (
			node.type === 'CallExpression' &&
			node.callee &&
			node.callee.type === 'MemberExpression' &&
			node.callee.property &&
			node.callee.property.name === 'filter'
		) {
			return resolveArrayLike( node.callee.object, depth + 1 );
		}
		return [];
	}

	cache.traverse( file, {
		JSXOpeningElement( p ) {
			const node = p.node;
			const name = jsxName( node );
			if ( ! name ) return;
			const line = node.loc ? node.loc.start.line : 0;

			if ( name === 'SgsColourPanel' ) {
				const rowsExpr = jsxAttrExpr( node, 'rows' );
				if ( ! rowsExpr ) return;
				const objs = resolveArrayLike( rowsExpr, 0 ).map( unwrapRowObject ).filter( Boolean );
				for ( const rowObj of objs ) {
					const statesArray = objProp( rowObj, 'states' );
					const isArr = statesArray && statesArray.type === 'ArrayExpression';
					rows.push( {
						rowKey: stringLiteralValue( objProp( rowObj, 'key' ) ) || 'row-line-' + line,
						line: rowObj.loc ? rowObj.loc.start.line : line,
						statesCount: isArr ? statesArray.elements.length : 1,
						attr: normalStateAttrName( statesArray ),
						hasGradient:
							booleanLiteralValue( objProp( rowObj, 'gradientCapable' ) ) === true ||
							statesArrayHasGradient( statesArray ),
						via: 'SgsColourPanel',
					} );
				}
				return;
			}

			if ( name === 'DesignTokenPicker' ) {
				const statesExpr = jsxAttrExpr( node, 'states' );
				const labelExpr = jsxAttrExpr( node, 'label' );
				let labelText = null;
				if (
					labelExpr &&
					labelExpr.type === 'CallExpression' &&
					labelExpr.arguments[ 0 ] &&
					labelExpr.arguments[ 0 ].type === 'StringLiteral'
				) {
					labelText = labelExpr.arguments[ 0 ].value;
				}
				const isArr = statesExpr && statesExpr.type === 'ArrayExpression';
				rows.push( {
					rowKey: labelText ? slugify( labelText ) : 'standalone-line-' + line,
					line,
					statesCount: isArr ? statesExpr.elements.length : 1,
					attr: isArr ? normalStateAttrName( statesExpr ) : null,
					hasGradient: isArr
						? statesArrayHasGradient( statesExpr )
						: !! findJsxAttr( node, 'gradientValue' ) ||
						  !! findJsxAttr( node, 'onGradientChange' ),
					via: 'DesignTokenPicker',
				} );
			}
		},
	} );

	return rows;
}

function main() {
	const db = loadDbRows();
	const cache = new SourceCache();
	const results = [];

	for ( const dir of blockDirs() ) {
		const slug = 'sgs/' + dir;
		const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
		const renderFile = path.join( BLOCKS_DIR, dir, 'render.php' );
		const wrapperRouted =
			fs.existsSync( renderFile ) &&
			/SGS_Container_Wrapper::render/.test( fs.readFileSync( renderFile, 'utf8' ) );

		for ( const row of rowsInFile( cache, editFile ) ) {
			const dbRow = row.attr && db[ slug ] ? db[ slug ][ row.attr ] : null;
			const cssProperty = dbRow ? dbRow.css_property : null;
			const selector = dbRow ? dbRow.derived_selector : null;
			// resolveMechanismFromCssProperty returns { mechanisms: [...], unresolved }
			// — an ARRAY, plural. Reading a singular `.mechanism` off it yields
			// undefined, which is falsy, which silently classified EVERY row as
			// NEEDS-DATA:no-css_property and reported 0% autofixable. Verified the
			// real shape by calling the function, not by assuming it.
			// It is plural on purpose: one css_property can legitimately map to more
			// than one mechanism (css_property 'color' is shared by genuine text and
			// by SVG-icon fill-via-currentColor).
			const mech = resolveMechanismFromCssProperty( cssProperty );
			const mechanisms = mech.unresolved ? [] : mech.mechanisms || [];
			const mechanism = mechanisms.length ? mechanisms.join( '|' ) : null;

			const needsHover = row.statesCount < 2;
			// Shadow has no gradient form — exempt BY MECHANISM, never per block.
			const needsGradient = ! row.hasGradient && ! mechanisms.includes( 'shadow' );

			let verdict;
			if ( ! needsHover && ! needsGradient ) {
				verdict = 'CONFORMANT';
			} else if ( ! row.attr ) {
				verdict = 'NEEDS-DATA:unresolvable-attr';
			} else if ( ! mechanism ) {
				verdict = 'NEEDS-DATA:no-css_property';
			} else if ( ! selector && ! wrapperRouted ) {
				verdict = 'NEEDS-DATA:no-selector';
			} else {
				verdict = 'AUTOFIXABLE';
			}

			results.push( {
				block: slug,
				...row,
				cssProperty,
				mechanism,
				selector,
				wrapperRouted,
				needsHover,
				needsGradient,
				verdict,
			} );
		}
	}

	if ( process.argv.includes( '--json' ) ) {
		process.stdout.write( JSON.stringify( { rows: results }, null, 1 ) );
		return;
	}

	const counts = {};
	for ( const r of results ) counts[ r.verdict ] = ( counts[ r.verdict ] || 0 ) + 1;
	const nonConf = results.filter( ( r ) => r.verdict !== 'CONFORMANT' );
	const blocks = new Set( results.map( ( r ) => r.block ) ).size;

	console.log(
		'\ncolour-conformance SURVEY — ' + results.length + ' colour rows across ' + blocks + ' blocks\n'
	);
	Object.entries( counts )
		.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
		.forEach( ( [ k, v ] ) => console.log( '  ' + String( v ).padStart( 4 ) + '  ' + k ) );

	const fixable = counts.AUTOFIXABLE || 0;
	const pct = nonConf.length ? Math.round( ( fixable / nonConf.length ) * 100 ) : 0;
	console.log(
		'\n  of ' + nonConf.length + ' non-conformant rows, ' + fixable +
		' are AUTOFIXABLE (' + pct + '%)'
	);
	console.log( '  the rest are REFUSED with a named reason — never guessed.\n' );

	const byBlock = {};
	for ( const r of nonConf ) {
		byBlock[ r.block ] = byBlock[ r.block ] || { fix: 0, data: 0 };
		if ( r.verdict === 'AUTOFIXABLE' ) byBlock[ r.block ].fix++;
		else byBlock[ r.block ].data++;
	}
	console.log( '  top blocks (autofixable / needs-data):' );
	Object.entries( byBlock )
		.sort( ( a, b ) => b[ 1 ].fix + b[ 1 ].data - ( a[ 1 ].fix + a[ 1 ].data ) )
		.slice( 0, 12 )
		.forEach( ( [ b, c ] ) =>
			console.log(
				'    ' + b.padEnd( 26 ) + String( c.fix ).padStart( 3 ) + ' / ' + c.data
			)
		);
	console.log();
}

main();
