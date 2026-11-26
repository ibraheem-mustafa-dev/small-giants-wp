'use strict';
/*
 * Reads the rows each block hands its main `SgsColourPanel`, and where the two kits mount, for check-colour-count.py.
 *
 * Output (JSON on stdout): { blocks: { <slug>: { panels: [ { file, line, rowsFrom, rows: [ { key, label, base, via } ] } ],
 * kitMounts: [ { kit, file, line, prefix } ] } }, kitBodies: { <file>: { colourPanelMounts: n } } }.
 *
 * A row is read from an object literal (`{ key, label, states }`) or from a `fillRow(` / `textRow(` call; `base` is the
 * literal `attrs.base`, or the first `value: attributes.x` of a literal row, else null. `rows={ name }` is resolved to
 * the `const name = [ ... ]` (or an arrow function returning an array) in the same file.
 *
 * Self-test: node scripts/lib/colour-panel-rows.js --self-test
 */
const fs = require( 'fs' );
const path = require( 'path' );
const scan = require( './jsx-scan' );

const ROW_CALLS = new Set( [ 'fillRow', 'textRow' ] );

const strOf = ( n ) => {
	if ( ! n ) {
		return null;
	}
	if ( 'StringLiteral' === n.type ) {
		return n.value;
	}
	if ( 'TemplateLiteral' === n.type && 0 === n.expressions.length ) {
		return n.quasis[ 0 ].value.cooked;
	}
	if ( 'CallExpression' === n.type && n.arguments[ 0 ] && 'StringLiteral' === n.arguments[ 0 ].type ) {
		return n.arguments[ 0 ].value; // __( 'Label', 'domain' )
	}
	return null;
};
const keyName = ( p ) => ( p.key && ( p.key.name || p.key.value ) ) || '';
const objProp = ( o, name ) => o.properties.find( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === name );

/** The first `value:` in a literal row (its first state), as the attribute it reads: `attributes.x` or a destructured `x`. */
function firstValueName( node ) {
	let name = null;
	const seen = new Set();
	const walk = ( n ) => {
		if ( name || ! n || 'object' !== typeof n || seen.has( n ) ) {
			return;
		}
		seen.add( n );
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( 'ObjectProperty' === n.type && 'value' === keyName( n ) ) {
			const v = n.value;
			if ( 'Identifier' === v.type ) {
				name = v.name;
			} else if ( 'MemberExpression' === v.type && v.object.name === 'attributes' && v.property.name ) {
				name = v.property.name;
			} else if ( 'LogicalExpression' === v.type && 'MemberExpression' === v.left.type && v.left.property.name ) {
				name = v.left.property.name;
			}
			if ( name ) {
				return;
			}
		}
		for ( const k of Object.keys( n ) ) {
			if ( ! [ 'loc', 'start', 'end', 'extra' ].includes( k ) ) {
				walk( n[ k ] );
			}
		}
	};
	walk( node );
	return name;
}

/** Row descriptors from one expression found in a rows array. */
function rowOf( e ) {
	if ( ! e ) {
		return null;
	}
	if ( 'LogicalExpression' === e.type ) {
		return rowOf( e.right );
	}
	if ( 'ConditionalExpression' === e.type ) {
		return rowOf( e.consequent );
	}
	if ( 'CallExpression' === e.type && 'Identifier' === e.callee.type && ROW_CALLS.has( e.callee.name ) && e.arguments[ 0 ] && 'ObjectExpression' === e.arguments[ 0 ].type ) {
		const o = e.arguments[ 0 ];
		const attrs = objProp( o, 'attrs' );
		const base = attrs && 'ObjectExpression' === attrs.value.type ? objProp( attrs.value, 'base' ) : null;
		const key = objProp( o, 'key' );
		const label = objProp( o, 'label' );
		return { key: strOf( key && key.value ), label: strOf( label && label.value ), base: strOf( base && base.value ), via: e.callee.name };
	}
	if ( 'ObjectExpression' === e.type ) {
		const key = objProp( e, 'key' );
		const label = objProp( e, 'label' );
		const base = firstValueName( e );
		return { key: strOf( key && key.value ), label: strOf( label && label.value ), base, via: 'literal' };
	}
	return { key: null, label: null, base: null, via: 'unreadable' };
}

function rowsOfArray( arr ) {
	return arr.elements.map( rowOf ).filter( Boolean );
}

/** Resolve an identifier to an array literal in the file (const x = [..] / const x = () => [..] / function body return). */
function resolveRows( ast, name ) {
	let found = null;
	const seen = new Set();
	const walk = ( n ) => {
		if ( found || ! n || 'object' !== typeof n || seen.has( n ) ) {
			return;
		}
		seen.add( n );
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( 'VariableDeclarator' === n.type && n.id && n.id.name === name && n.init ) {
			const i = n.init;
			if ( 'ArrayExpression' === i.type ) {
				found = i;
				return;
			}
			if ( 'ArrowFunctionExpression' === i.type || 'FunctionExpression' === i.type ) {
				if ( 'ArrayExpression' === i.body.type ) {
					found = i.body;
					return;
				}
				const ret = JSON.stringify( i.body ).includes( '"ArrayExpression"' ) ? i.body : null;
				if ( ret && ret.body ) {
					for ( const st of ret.body ) {
						if ( 'ReturnStatement' === st.type && st.argument && 'ArrayExpression' === st.argument.type ) {
							found = st.argument;
							return;
						}
					}
				}
			}
		}
		for ( const k of Object.keys( n ) ) {
			if ( ! [ 'loc', 'start', 'end', 'extra' ].includes( k ) ) {
				walk( n[ k ] );
			}
		}
	};
	walk( ast.program.body );
	return found;
}

/** SgsColourPanel mounts and kit mounts in one file's text. */
function readFile( text ) {
	const ast = scan.parse( text );
	const panels = [];
	const kitMounts = [];
	scan.walkJsx( ast, ( el ) => {
		const name = scan.jsxName( el );
		if ( 'SgsColourPanel' === name ) {
			const rowsAttr = el.openingElement.attributes.find( ( a ) => 'JSXAttribute' === a.type && 'rows' === a.name.name );
			let rows = [];
			let from = 'none';
			const v = rowsAttr && rowsAttr.value && rowsAttr.value.expression;
			if ( v && 'ArrayExpression' === v.type ) {
				rows = rowsOfArray( v );
				from = 'inline array';
			} else if ( v && 'Identifier' === v.type ) {
				const arr = resolveRows( ast, v.name );
				rows = arr ? rowsOfArray( arr ) : [];
				from = arr ? `const ${ v.name }` : `${ v.name } (not resolved)`;
			} else if ( v ) {
				from = 'expression';
			}
			panels.push( { line: el.loc.start.line, rowsFrom: from, rows } );
		} else if ( 'CarouselControls' === name ) {
			kitMounts.push(
				{ kit: 'builtinButtons', line: el.loc.start.line, prefix: 'arrow', via: 'CarouselControls' },
				{ kit: 'carouselDots', line: el.loc.start.line, prefix: 'dot', via: 'CarouselControls' }
			);
		} else if ( 'BuiltinButtonPanel' === name || 'CarouselDotsPanel' === name ) {
			kitMounts.push( { kit: 'BuiltinButtonPanel' === name ? 'builtinButtons' : 'carouselDots', line: el.loc.start.line, prefix: scan.prop( el, 'prefix' ).value || '(expr)' } );
		}
	} );
	return { panels, kitMounts };
}

function readTree() {
	const out = { blocks: {}, kitBodies: {} };
	for ( const b of scan.blocks() ) {
		const rec = { panels: [], kitMounts: [] };
		const walk = ( d ) => {
			for ( const entry of fs.readdirSync( d, { withFileTypes: true } ) ) {
				const full = path.join( d, entry.name );
				if ( entry.isDirectory() ) {
					walk( full );
				} else if ( entry.name.endsWith( '.js' ) ) {
					const text = fs.readFileSync( full, 'utf8' );
					if ( ! /SgsColourPanel|BuiltinButtonPanel|CarouselDotsPanel|CarouselControls/.test( text ) ) {
						continue;
					}
					try {
						const r = readFile( text );
						r.panels.forEach( ( p ) => rec.panels.push( { file: scan.rel( full ), ...p } ) );
						r.kitMounts.forEach( ( k ) => rec.kitMounts.push( { file: scan.rel( full ), ...k } ) );
					} catch ( e ) {
						rec.panels.push( { file: scan.rel( full ), error: e.message, rows: [] } );
					}
				}
			}
		};
		walk( b.dir );
		out.blocks[ b.slug ] = rec;
	}
	for ( const f of [ 'components/button-kit/BuiltinButtonPanelBody.js', 'components/carousel-dots/CarouselDotsPanelBody.js' ] ) {
		const full = path.join( scan.SRC, f );
		const r = readFile( fs.readFileSync( full, 'utf8' ) );
		out.kitBodies[ `src/${ f }` ] = { colourPanelMounts: r.panels.length };
	}
	return out;
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	const t1 = readFile( `const rows = [ fillRow( { key: 'bg', label: __( 'Background', 'd' ), attrs: { base: 'backgroundColour' } } ), cond && textRow( { key: 'tx', label: 'Text', attrs: { base: 'textColour' } } ), { key: 'x', label: 'X', states: [ { value: attributes.cardColour } ] } ];
export const E = () => (<><SgsColourPanel rows={ rows } /><BuiltinButtonPanel prefix="arrow" /></>);` );
	ok( 'resolves rows={ name } to the array and reads fillRow bases', 1 === t1.panels.length && 3 === t1.panels[ 0 ].rows.length && 'backgroundColour' === t1.panels[ 0 ].rows[ 0 ].base );
	ok( 'reads a conditional textRow', 'textColour' === t1.panels[ 0 ].rows[ 1 ].base );
	ok( 'reads a literal row base from attributes.x', 'cardColour' === t1.panels[ 0 ].rows[ 2 ].base );
	ok( 'finds a kit mount with its prefix', 1 === t1.kitMounts.length && 'arrow' === t1.kitMounts[ 0 ].prefix );
	const t2 = readFile( 'export const E = () => (<SgsColourPanel rows={ [ fillRow( { key: "a", label: "A", attrs: { base: "aColour" } } ) ] } />);' );
	ok( 'reads an inline array', 'inline array' === t2.panels[ 0 ].rowsFrom && 'aColour' === t2.panels[ 0 ].rows[ 0 ].base );
	process.stdout.write( 0 === failures.length ? '\n[colour-panel-rows --self-test] ALL ASSERTIONS PASS.\n' : `\n[colour-panel-rows --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		selfTest();
	} else {
		process.stdout.write( JSON.stringify( readTree() ) );
	}
}
module.exports = { readFile, readTree };
