/**
 * CHECK B: invalid CSS keyword passthrough.
 *
 * PRIOR ART (research-check, 2026-08-13): no direct prior art for either
 * shape scoped this narrowly. Closest analogues —
 *  (a) eslint-plugin-react's `jsx-uses-vars` rule exists because bare
 *      `no-unused-vars` doesn't see JSX usage at all; it treats "referenced
 *      ANYWHERE in JSX" as used. That is coarser than CHECK A needs: CHECK A
 *      must distinguish JSX usage INSIDE an InspectorControls panel (a
 *      control binding, not a preview effect) from JSX usage in the actual
 *      preview markup — no existing rule makes that distinction.
 *  (b) stylelint's `declaration-property-value-no-unknown` (backed by the
 *      csstree spec-derived keyword data) validates a CSS declaration's value
 *      against the property's spec-known keyword set — genuine prior art for
 *      the KEYWORD-VALIDATION half of CHECK B. It operates on raw CSS text,
 *      though, not on "does this SelectControl's option list, traced through
 *      a PHP render pipeline, land in that property" — the traceability half
 *      of CHECK B (SelectControl -> attribute -> PHP variable dataflow ->
 *      CSS emission site) has no existing analogue found.
 * Neither gap has an off-the-shelf tool; both are built fresh below,
 * following this project's own conventions (check-dead-controls.js's
 * self-contained baseline-file + pure-function + --check/--json/--self-test
 * shape; db-consistency/run.py's multi-check-in-one-script shape).
 *
 * SCHEMA CHECK (R-31-1, before hardcoding a new table): sgs-framework.db's
 * `property_suffixes` table was queried before building css-keyword-enums.json
 * (`SELECT * FROM property_suffixes LIMIT 5` / schema dump, 2026-08-13). It
 * maps an ATTRIBUTE-NAME SUFFIX (e.g. "Colour") to a css_property — a
 * naming convention, not a value-validity table. It carries no concept of "the
 * SET of valid keyword values for a given css_property." Genuinely new
 * concept, not a duplicate — so a small versioned JSON data file
 * (css-keyword-enums.json) is the correct home, per this project's own
 * attr-classification-overrides.json / css-property-classifications.json
 * precedent (R-31-1 objects to a hardcoded dict buried IN SCRIPT LOGIC, not to
 * a versioned JSON data file).
 *
 *
 * CHECK B METHOD
 * ---------------
 * 1. css-keyword-enums.json lists every fixed-keyword-enum CSS property this
 *    codebase actually emits via literal PHP-variable string concatenation in
 *    a render.php (grepped 2026-08-13 — see that file's own header for the
 *    exact grep). NOT a speculative universal CSS table.
 * 2. Per block, scan render.php for `property:'.$var.'`-shaped emission sites
 *    for each tracked property.
 * 3. Trace `$var` back to a real attribute name via a two-hop PHP dataflow
 *    scan: (a) direct reads — `$localVar = $attributes['AttrName']` (optional
 *    `?? default`); (b) one-hop DERIVED variables — `$derived = ...$localVar
 *    ...;` where `$localVar` is already resolved to an attribute by (a). This
 *    is exactly the real shape found in sgs/hero: `$image_object_fit =
 *    $attributes['imageObjectFit'] ?? 'cover';` then, ~350 lines later,
 *    `$safe_fit = in_array( $image_object_fit, $allowed_fits, true ) ?
 *    $image_object_fit : 'cover';` followed by the emission site using
 *    `$safe_fit`. A single-hop trace resolves this without needing a full
 *    PHP dataflow engine.
 * 4. For the resolved attribute name, find every SelectControl in edit.js
 *    whose onChange writes that exact attribute, and resolve its `options`
 *    prop (inline array literal or a top-level `const NAME = [...]` array
 *    referenced by identifier) to a list of string `value`s.
 * 5. Flag any option value that is NOT in the target property's valid keyword
 *    set — UNLESS render.php contains its own literal comparison against that
 *    exact value anywhere (`'value' === $var` or `$var === 'value'`), which
 *    is treated as evidence of a diverting conditional (e.g. hero's own
 *    `'custom' === $image_object_fit` branch) — that is a deliberate, correct
 *    interception, not a bug.
 *
 * CHECK B BLIND SPOTS:
 *   1. The interception check (step 5) is a LITERAL-TEXT search across the
 *      WHOLE render.php file, not a scoped control-flow proof that the
 *      matched conditional actually intercepts the SAME emission site before
 *      it runs. A coincidental unrelated comparison against the same string
 *      elsewhere in the file would suppress a real finding (bounded the same
 *      direction as check-dead-controls.js's own documented blind spots: this
 *      can only weaken the gate's ability to catch a bug, never manufacture a
 *      false positive).
 *   2. The two-hop dataflow trace (step 3) does not follow chains beyond one
 *      derivation hop. A THIRD variable derived from `$safe_fit` before
 *      reaching the emission site would not resolve back to the attribute
 *      name. Not observed live in the current codebase as of 2026-08-13.
 *   3. `options` resolution (step 4) only recognises an inline array literal
 *      or a same-file top-level `const` array. An options list imported from
 *      another module, or built by mapping over a constant at runtime, is
 *      invisible.
 *
 */

'use strict';

const path = require( 'path' );
const traverse = require( '@babel/traverse' ).default;
const { jsxAttrValueNode, jsxOpeningName } = require( './lib-ast' );
const { readIfExists, safeParse } = require( './lib-blocks' );
const { collectAttrVarMap, collectDerivedVarMap, resolveAttrForVar } = require( './lib-php-attrvars' );

/**
 * Find every `property:'.$var.'`-shaped emission site for each tracked
 * property.
 *
 * @param {string}        phpSrc       render.php source.
 * @param {Array<string>} trackedProps Properties from css-keyword-enums.json.
 * @return {Array<{property:string, varName:string}>}
 */
function findCssEmissionSites( phpSrc, trackedProps ) {
	const sites = [];
	for ( const prop of trackedProps ) {
		const escaped = prop.replace( /-/g, '\\-' );
		const re = new RegExp( escaped + "\\s*:\\s*'\\s*\\.\\s*\\$([A-Za-z_]\\w*)\\s*\\.\\s*'", 'g' );
		let m;
		while ( ( m = re.exec( phpSrc ) ) !== null ) {
			sites.push( { property: prop, varName: m[ 1 ] } );
		}
	}
	return sites;
}

/**
 * A candidate invalid value is treated as INTERCEPTED (deliberately diverted
 * before the generic emission — e.g. hero's own 'custom' === $image_object_fit
 * branch) if the literal value appears in its own comparison anywhere in the
 * file. Whole-file text search — see CHECK B blind spot 1 in the file header.
 *
 * @param {string} phpSrc        render.php source.
 * @param {string} invalidValue  The out-of-enum option value.
 * @return {boolean}
 */
function isValueIntercepted( phpSrc, invalidValue ) {
	const escaped = invalidValue.replace( /[-]/g, '\\-' );
	const re = new RegExp(
		"['\"]" + escaped + "['\"]\\s*(===|!==)\\s*\\$\\w+|\\$\\w+\\s*(===|!==)\\s*['\"]" + escaped + "['\"]"
	);
	return re.test( phpSrc );
}

function extractSetAttrKeyFromSrcSlice( slice ) {
	let m = /setAttributes\(\s*\{\s*([A-Za-z_$][\w$]*)\s*:/.exec( slice );
	if ( m ) {
		return m[ 1 ];
	}
	m = /update\(\s*['"]([A-Za-z_$][\w$]*)['"]/.exec( slice );
	if ( m ) {
		return m[ 1 ];
	}
	return null;
}

/**
 * Resolve a JSX prop's value node (ArrayExpression literal, or an Identifier
 * pointing at a same-file top-level `const NAME = [...]`) to a list of
 * string `value`s.
 *
 * @param {Object|null} node JSXExpressionContainer node, or null.
 * @param {Object}      ast  Whole-file AST (used to resolve an Identifier reference).
 * @return {Array<string>|null}
 */
function extractOptionValues( node, ast ) {
	if ( ! node || node.type !== 'JSXExpressionContainer' ) {
		return null;
	}
	const expr = node.expression;
	let arrayNode = null;
	if ( expr.type === 'ArrayExpression' ) {
		arrayNode = expr;
	} else if ( expr.type === 'Identifier' ) {
		let found = null;
		traverse( ast, {
			VariableDeclarator( nodePath ) {
				const n = nodePath.node;
				if ( n.id.type === 'Identifier' && n.id.name === expr.name && n.init && n.init.type === 'ArrayExpression' ) {
					found = n.init;
				}
			},
		} );
		arrayNode = found;
	}
	if ( ! arrayNode ) {
		return null;
	}
	const values = [];
	for ( const el of arrayNode.elements ) {
		if ( ! el || el.type !== 'ObjectExpression' ) {
			continue;
		}
		const valueProp = el.properties.find(
			( p ) => p.type === 'ObjectProperty' && p.key && p.key.name === 'value'
		);
		if ( valueProp && valueProp.value && valueProp.value.type === 'StringLiteral' ) {
			values.push( valueProp.value.value );
		}
	}
	return values;
}

/**
 * Map every SelectControl in edit.js to the attribute its onChange writes,
 * and the option values it offers.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {Map<string, Array<{values:Array<string>, line:number}>>}
 */
function collectSelectControlsByAttr( ast, src ) {
	const map = new Map();
	traverse( ast, {
		JSXElement( nodePath ) {
			const name = jsxOpeningName( nodePath.node.openingElement );
			if ( name !== 'SelectControl' ) {
				return;
			}
			const onChangeNode = jsxAttrValueNode( nodePath.node.openingElement, 'onChange' );
			if ( ! onChangeNode ) {
				return;
			}
			const slice = src.slice( onChangeNode.start, onChangeNode.end );
			const attrName = extractSetAttrKeyFromSrcSlice( slice );
			if ( ! attrName ) {
				return;
			}
			const optionsNode = jsxAttrValueNode( nodePath.node.openingElement, 'options' );
			const values = extractOptionValues( optionsNode, ast );
			if ( ! values || ! values.length ) {
				return;
			}
			const line = nodePath.node.loc ? nodePath.node.loc.start.line : 0;
			if ( ! map.has( attrName ) ) {
				map.set( attrName, [] );
			}
			map.get( attrName ).push( { values, line } );
		},
	} );
	return map;
}

/**
 * CHECK B driver for one block.
 *
 * @param {string} blockName    Reporting name.
 * @param {string} dir          Absolute path to the block directory.
 * @param {Object} keywordTable css-keyword-enums.json's `properties` map.
 * @return {Array<Object>} Findings.
 */
function checkInvalidKeywordPassthrough( blockName, dir, keywordTable ) {
	const renderPath = path.join( dir, 'render.php' );
	const editPath = path.join( dir, 'edit.js' );
	const phpSrc = readIfExists( renderPath );
	const jsSrc = readIfExists( editPath );
	if ( ! phpSrc || ! jsSrc ) {
		return [];
	}
	const trackedProps = Object.keys( keywordTable );
	const sites = findCssEmissionSites( phpSrc, trackedProps );
	if ( ! sites.length ) {
		return [];
	}
	const attrVarMap = collectAttrVarMap( phpSrc );
	const derivedVarMap = collectDerivedVarMap( phpSrc, attrVarMap );

	const editAst = safeParse( jsSrc );
	if ( ! editAst ) {
		return [];
	}
	const selectByAttr = collectSelectControlsByAttr( editAst, jsSrc );

	const findings = [];
	const seen = new Set();
	for ( const site of sites ) {
		const attrName = resolveAttrForVar( site.varName, attrVarMap, derivedVarMap );
		if ( ! attrName ) {
			continue;
		}
		const controls = selectByAttr.get( attrName );
		if ( ! controls ) {
			continue;
		}
		const validSet = new Set( keywordTable[ site.property ] );
		for ( const control of controls ) {
			for ( const value of control.values ) {
				if ( validSet.has( value ) ) {
					continue;
				}
				if ( isValueIntercepted( phpSrc, value ) ) {
					continue;
				}
				const key = `${ blockName }:${ attrName }:${ site.property }:${ value }`;
				if ( seen.has( key ) ) {
					continue;
				}
				seen.add( key );
				findings.push( {
					check: 'invalid-keyword-passthrough',
					block: blockName,
					attr: attrName,
					reason:
						`SelectControl for '${ attrName }' (edit.js:${ control.line }) offers option value ` +
						`"${ value }", which is not a valid CSS '${ site.property }' keyword (valid: ` +
						`${ [ ...validSet ].join( '|' ) }) — render.php emits it directly as the literal ` +
						`'${ site.property }' value with no diverting conditional, so the browser silently ` +
						'drops the declaration',
				} );
			}
		}
	}
	return findings;
}

module.exports = {
	checkInvalidKeywordPassthrough,
};
