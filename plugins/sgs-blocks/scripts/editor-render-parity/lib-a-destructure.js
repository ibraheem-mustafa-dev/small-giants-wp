/**
 * CHECK A: destructured, aliased and written attribute collection outside excluded ranges.
 */

'use strict';

const traverse = require( '@babel/traverse' ).default;
const { EXCLUDED_JSX_CONTAINERS, isControlSurfaceComponent } = require( './lib-a-control-surface' );
const { jsxOpeningName } = require( './lib-ast' );

/**
 * Collect every attribute name destructured FROM `attributes`, in either of
 * the two shapes used across this block library.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {Set<string>} Destructured attribute names.
 */
function collectDestructuredFromAttributes( ast ) {
	const names = new Set();
	traverse( ast, {
		// const { a, b } = attributes;  /  const { a, b } = props.attributes;
		VariableDeclarator( nodePath ) {
			const node = nodePath.node;
			if ( node.id.type !== 'ObjectPattern' ) {
				return;
			}
			const init = node.init;
			const isAttributesInit =
				( init && init.type === 'Identifier' && init.name === 'attributes' ) ||
				( init && init.type === 'MemberExpression' && init.property && init.property.name === 'attributes' );
			if ( ! isAttributesInit ) {
				return;
			}
			for ( const prop of node.id.properties ) {
				if ( prop.type === 'ObjectProperty' && prop.key && prop.key.type === 'Identifier' ) {
					names.add( prop.key.name );
				}
			}
		},
		// function Edit( { attributes: { a, b }, setAttributes } ) { ... }
		ObjectPattern( nodePath ) {
			for ( const prop of nodePath.node.properties ) {
				if (
					prop.type === 'ObjectProperty' &&
					prop.key &&
					prop.key.name === 'attributes' &&
					prop.value &&
					prop.value.type === 'ObjectPattern'
				) {
					for ( const inner of prop.value.properties ) {
						if ( inner.type === 'ObjectProperty' && inner.key && inner.key.type === 'Identifier' ) {
							names.add( inner.key.name );
						}
					}
				}
			}
		},
	} );
	return names;
}

/**
 * Collect renamed destructuring bindings for attributes pulled FROM
 * `attributes` (`const { foo: renamed } = attributes`), in either of the two
 * shapes `collectDestructuredFromAttributes()` recognises. Only renamed
 * cases are recorded — `{ foo }` (key === value) is not an alias.
 *
 * Built 2026-08-30 after `sgs/pricing-table` proved the blind spot documented
 * in this file's own header (CHECK A BLIND SPOTS, item 2) is real: `const {
 * pricingTableStyle: style } = attributes` is genuinely read back via `style`
 * outside any control, but `usedOutsideControls` only ever contains the LOCAL
 * name (`style`), never the schema key (`pricingTableStyle`) — so the Check A
 * finding loop, which tests `usedOutsideControls.has( attr )` against the
 * schema key, reported a false positive. This map lets that loop also try
 * the alias.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {Map<string,string>} attribute name (schema key) -> local alias name.
 */
function collectDestructuredAliases( ast ) {
	const aliases = new Map();
	const record = ( keyNode, valueNode ) => {
		if (
			valueNode &&
			valueNode.type === 'Identifier' &&
			valueNode.name !== keyNode.name
		) {
			aliases.set( keyNode.name, valueNode.name );
		}
	};
	traverse( ast, {
		// const { a: renamedA } = attributes;  /  const { a: renamedA } = props.attributes;
		VariableDeclarator( nodePath ) {
			const node = nodePath.node;
			if ( node.id.type !== 'ObjectPattern' ) {
				return;
			}
			const init = node.init;
			const isAttributesInit =
				( init && init.type === 'Identifier' && init.name === 'attributes' ) ||
				( init && init.type === 'MemberExpression' && init.property && init.property.name === 'attributes' );
			if ( ! isAttributesInit ) {
				return;
			}
			for ( const prop of node.id.properties ) {
				if ( prop.type === 'ObjectProperty' && prop.key && prop.key.type === 'Identifier' ) {
					record( prop.key, prop.value );
				}
			}
		},
		// function Edit( { attributes: { a: renamedA }, setAttributes } ) { ... }
		ObjectPattern( nodePath ) {
			for ( const prop of nodePath.node.properties ) {
				if (
					prop.type === 'ObjectProperty' &&
					prop.key &&
					prop.key.name === 'attributes' &&
					prop.value &&
					prop.value.type === 'ObjectPattern'
				) {
					for ( const inner of prop.value.properties ) {
						if ( inner.type === 'ObjectProperty' && inner.key && inner.key.type === 'Identifier' ) {
							record( inner.key, inner.value );
						}
					}
				}
			}
		},
	} );
	return aliases;
}

/**
 * Collect every attribute name WRITTEN via setAttributes({...}) or the
 * house-style update('attr', val) setter. Same shapes as check-dead-
 * controls.js's collectControlledAttrs (textual, not AST — proven against
 * this codebase already; kept deliberately consistent rather than
 * reimplementing as a second, possibly-drifting AST version).
 *
 * @param {string} src Raw edit.js source.
 * @return {Set<string>} Written attribute names.
 */
function collectSetAttributesWrites( src ) {
	const controlled = new Set();
	if ( ! src ) {
		return controlled;
	}
	const setAttrRe = /setAttributes\(\s*\{\s*([^}]*)\}/g;
	let m;
	while ( ( m = setAttrRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		const keyRe = /(?:^|[\s,])(?:['"]?)([A-Za-z_$][\w$]*)(?:['"]?)\s*:/g;
		let k;
		while ( ( k = keyRe.exec( body ) ) !== null ) {
			controlled.add( k[ 1 ] );
		}
	}
	const updateRe = /\bupdate\(\s*['"]([A-Za-z_$][\w$]*)['"]/g;
	while ( ( m = updateRe.exec( src ) ) !== null ) {
		controlled.add( m[ 1 ] );
	}
	return controlled;
}

/**
 * Collect the [start,end) source-offset ranges of every <InspectorControls>
 * / <BlockControls> JSXElement subtree in the file.
 *
 * REVISED 2026-08-13 (real-tree measurement, see below): the FIRST version of
 * this detector scoped "used" to "referenced literally inside a JSX node,
 * outside InspectorControls/BlockControls" — matching the letter of the
 * task's design brief. Run against the real 83-block tree it produced 762
 * findings, an unusable false-positive rate. Root cause, confirmed by reading
 * sgs/accordion/edit.js and sgs/hero/edit.js directly: this codebase's
 * dominant convention computes a value's EFFECT (a className string, a
 * derived boolean like hero's `isMediaFirstDesktop = 'media-first' ===
 * splitContentOrder?.desktop`) in PLAIN JS *before* the return statement, then
 * spreads/references that DERIVED value inside JSX — the raw attribute
 * identifier itself often never appears a second time literally inside a JSX
 * node, even in completely healthy, working code. Scoping detection to
 * literal-JSX-containment alone cannot tell that apart from the real bug
 * (splitContentOrder's fixed shape: read once into a derived var, and that
 * derived var IS referenced inside JSX to alter the preview).
 *
 * The measurable distinction that actually separates the real bug from
 * healthy code is: is the attribute referenced ANYWHERE in the file OUTSIDE
 * the control's own InspectorControls/BlockControls binding — not "inside a
 * JSX node" specifically. So this function still finds the exclusion zones
 * (a control's own value=/onChange= binding must not itself count as
 * "preview usage" — that is the one part of the original design that DOES
 * hold up, and is exactly what let the real splitContentOrder bug through
 * check-dead-controls.js), but collectUsedIdentifiersOutsideExcluded() below
 * now scans the WHOLE FILE minus those zones, not JSX-only.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {Array<[number,number]>} Excluded [start,end) ranges.
 */
function collectExcludedRanges( ast ) {
	const ranges = [];
	traverse( ast, {
		JSXElement( nodePath ) {
			const name = jsxOpeningName( nodePath.node.openingElement );
			// A literal control container, OR a shared component that wraps
			// itself in one (see isControlSurfaceComponent above — this second
			// arm is what stops `<SgsColourPanel rows={…}>` reading as canvas
			// code across the 65 blocks that mount it).
			if (
				EXCLUDED_JSX_CONTAINERS.has( name ) ||
				isControlSurfaceComponent( name )
			) {
				ranges.push( [ nodePath.node.start, nodePath.node.end ] );
				nodePath.skip();
			}
		},
	} );
	return ranges;
}

function isInsideExcludedRanges( pos, ranges ) {
	return ranges.some( ( [ s, e ] ) => pos >= s && pos < e );
}

/**
 * Collect every Identifier name referenced anywhere in the file OUTSIDE the
 * excluded InspectorControls/BlockControls ranges, excluding positions that
 * are DECLARATIONS or WRITE-ONLY LABELS rather than reads: the destructuring
 * pattern itself (`const { attr } = attributes`), a non-computed object-
 * literal key (`setAttributes({ attr: val })`'s `attr`), JSX tag/attribute
 * names, and import specifiers.
 *
 * @param {Object}               ast            Parsed edit.js AST.
 * @param {Array<[number,number]>} excludedRanges From collectExcludedRanges().
 * @return {Set<string>} Identifier names read outside the excluded ranges.
 */
function collectUsedIdentifiersOutsideExcluded( ast, excludedRanges ) {
	const used = new Set();
	traverse( ast, {
		Identifier( nodePath ) {
			const node = nodePath.node;
			const parent = nodePath.parent;
			if ( parent.type === 'JSXAttribute' && parent.name === node ) {
				return; // the attribute NAME (e.g. `value` in value={x}), not a reference
			}
			if (
				( parent.type === 'JSXOpeningElement' || parent.type === 'JSXClosingElement' ) &&
				parent.name === node
			) {
				return; // the tag name
			}
			if ( parent.type === 'JSXMemberExpression' ) {
				return; // e.g. <Foo.Bar>
			}
			if (
				parent.type === 'ImportSpecifier' ||
				parent.type === 'ImportDefaultSpecifier' ||
				parent.type === 'ImportNamespaceSpecifier'
			) {
				return;
			}
			if ( parent.type === 'ObjectProperty' ) {
				const container = nodePath.parentPath.parentPath.node;
				if ( container.type === 'ObjectPattern' ) {
					return; // destructuring binding (key AND value), not a usage
				}
				if ( container.type === 'ObjectExpression' && parent.key === node && ! parent.computed ) {
					return; // a plain object-literal key (e.g. setAttributes({ attr: val })'s `attr`) is a label, not a read
				}
			}
			if ( isInsideExcludedRanges( node.start, excludedRanges ) ) {
				return;
			}
			used.add( node.name );
		},
	} );
	return used;
}

module.exports = {
	collectDestructuredAliases,
	collectDestructuredFromAttributes,
	collectExcludedRanges,
	collectSetAttributesWrites,
	collectUsedIdentifiersOutsideExcluded,
	isInsideExcludedRanges,
};
