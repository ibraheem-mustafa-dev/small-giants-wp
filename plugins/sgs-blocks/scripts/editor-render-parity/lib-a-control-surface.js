/**
 * CHECK A: which JSX components are control surfaces, and which edit.js uses server-side render.
 */

'use strict';

const traverse = require( '@babel/traverse' ).default;
const { jsxAttrValueNode, jsxOpeningName } = require( './lib-ast' );
const { readIfExists, safeParse } = require( './lib-blocks' );
const { COMPONENT_FILE_MAP } = require( './lib-config' );

// ---------------------------------------------------------------------------
// CHECK A — editor-canvas desync
// ---------------------------------------------------------------------------

const EXCLUDED_JSX_CONTAINERS = new Set( [ 'InspectorControls', 'BlockControls' ] );

/**
 * Is this JSX tag a SHARED COMPONENT whose entire rendered output is a control
 * surface — i.e. it wraps itself in `<InspectorControls>` / `<BlockControls>`
 * internally rather than being mounted inside one?
 *
 * WHY THIS EXISTS (2026-08-26)
 * ---------------------------
 * `collectExcludedRanges()` used to recognise a control surface ONLY by the
 * LITERAL tag names above. `SgsColourPanel` renders its own
 * `<InspectorControls group="styles">` internally (SgsColourPanel.js:115-137)
 * but is mounted in edit.js under its own name, as a SIBLING of any literal
 * `<InspectorControls>`. So its `rows={[…]}` prop was never inside an excluded
 * range, and every attribute referenced only there counted as "used outside
 * controls" — which the E3 exemption then treated as proof the editor canvas
 * paints it.
 *
 * It does not. 65 of the 84 blocks mount this component, and a measured
 * differential put the resulting blind spot at ~130-160 genuinely missed
 * findings. Evidence: `reports/2026-08-26-check-a-E3-blindspot.md` (root cause
 * 1) and `-minor-signals.md` (the same mechanism defeating the E5 signal).
 *
 * ⛔ THE PREDICATE IS DELIBERATELY STRICT, AND MUST STAY STRICT.
 * A component counts ONLY when EVERY JSX value it returns is an excluded
 * container. A component that returns control markup on one branch and CANVAS
 * markup on another paints something, so excluding it wholesale would hide
 * real canvas usage and manufacture false NEGATIVES — the very failure this
 * change exists to remove. `null` returns are ignored (they render nothing);
 * a non-JSX return disqualifies, because we cannot see what it renders.
 *
 * ⚠ Only returns belonging to the component's OWN top-level function count.
 * `SgsColourPanel` also contains `visible.map( ( row ) => { return ( … ) } )`,
 * whose return describes that CALLBACK's output, not the component's. Counting
 * it would disqualify the component and silently restore the blind spot, so
 * any function nested inside another is skipped.
 *
 * Resolution reuses the existing R3-a `COMPONENT_FILE_MAP` rather than adding a
 * second name-to-file resolver. Derived per component, so a future shared
 * control panel is recognised automatically — there is no hand-kept list.
 *
 * @param {string} name JSX tag name.
 * @return {boolean} True when the component is a pure control surface.
 */
const controlSurfaceCache = new Map();

function isControlSurfaceComponent( name ) {
	if ( controlSurfaceCache.has( name ) ) {
		return controlSurfaceCache.get( name );
	}
	// Seed false BEFORE recursing: a component cycle must terminate, and the
	// safe default is "not a control surface" (report, rather than hide).
	controlSurfaceCache.set( name, false );

	const componentFile = COMPONENT_FILE_MAP.get( name );
	if ( ! componentFile ) {
		return false;
	}
	const componentSrc = readIfExists( componentFile );
	if ( ! componentSrc ) {
		return false;
	}
	const componentAst = safeParse( componentSrc );
	if ( ! componentAst ) {
		return false;
	}

	let sawJsxReturn = false;
	let everyReturnIsControl = true;

	const classify = ( node ) => {
		if ( ! node ) {
			return; // bare `return;` renders nothing
		}
		if ( node.type === 'NullLiteral' ) {
			return; // `return null` renders nothing
		}
		if ( node.type === 'Identifier' && node.name === 'undefined' ) {
			return;
		}
		if ( node.type !== 'JSXElement' ) {
			everyReturnIsControl = false; // opaque — cannot prove it is control-only
			return;
		}
		sawJsxReturn = true;
		if ( ! EXCLUDED_JSX_CONTAINERS.has( jsxOpeningName( node.openingElement ) ) ) {
			everyReturnIsControl = false;
		}
	};

	traverse( componentAst, {
		ReturnStatement( nodePath ) {
			const fn = nodePath.getFunctionParent();
			// Skip returns inside a nested callback — see the `.map()` note above.
			if ( ! fn || fn.getFunctionParent() ) {
				return;
			}
			classify( nodePath.node.argument );
		},
		ArrowFunctionExpression( nodePath ) {
			// Concise-body arrow component: `const X = () => <InspectorControls…/>`
			// has no ReturnStatement at all.
			if ( nodePath.node.body.type === 'BlockStatement' ) {
				return;
			}
			if ( nodePath.getFunctionParent() ) {
				return;
			}
			classify( nodePath.node.body );
		},
	} );

	const result = sawJsxReturn && everyReturnIsControl;
	controlSurfaceCache.set( name, result );
	return result;
}

/**
 * Check if the edit.js file contains a ServerSideRender JSX element with
 * an attributes prop that passes the attributes object (either
 * attributes={attributes} or attributes={ attributes }).
 *
 * If true, all attributes in this block flow through the REST-rendered
 * render.php preview, so no attribute can meaningfully be "unused" by the
 * editor canvas — the whole attributes object is passed as-is to the real
 * server-rendered output.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {boolean}
 */
function hasServerSideRenderWithAttributes( ast ) {
	let found = false;
	traverse( ast, {
		JSXElement( nodePath ) {
			const name = jsxOpeningName( nodePath.node.openingElement );
			if ( name !== 'ServerSideRender' ) {
				return;
			}
			const attrsNode = jsxAttrValueNode( nodePath.node.openingElement, 'attributes' );
			if ( ! attrsNode ) {
				return;
			}
			// Accept either the bare identifier (`attributes={ attributes }`) or a
			// single-argument PASS-THROUGH WRAPPER whose only argument is that same
			// identifier (`attributes={ omitNullAttributes( attributes ) }`).
			//
			// Why the wrapper form counts (2026-09-05): `sgs/before-after` hands the
			// whole attributes object through `omitNullAttributes()` — a transport-layer
			// helper that strips null-valued keys so the /wp/v2/block-renderer REST call
			// doesn't 400 on `["boolean","null"]` attrs (see that file's own header). The
			// canvas still shows real render.php output for EVERY attribute, so the
			// exemption's premise holds exactly as it does for the bare form — but the
			// Identifier-only test missed it and flagged all 14 of that block's
			// attributes as editor-canvas desyncs. Confirmed false positives.
			//
			// Deliberately NARROW: the call must take EXACTLY ONE argument and it must be
			// the bare `attributes` identifier. A multi-arg or subset-picking call
			// (`pickSome( attributes, [ 'a', 'b' ] )`) does NOT exempt, because such a
			// helper CAN drop attributes from the preview — which is a real desync this
			// gate must keep catching. Widening past single-arg pass-through would make
			// the exemption unfalsifiable.
			if ( attrsNode.type !== 'JSXExpressionContainer' || ! attrsNode.expression ) {
				return;
			}
			const expr = attrsNode.expression;
			const isBareAttributes =
				expr.type === 'Identifier' && expr.name === 'attributes';
			const isPassThroughWrapper =
				expr.type === 'CallExpression' &&
				expr.arguments.length === 1 &&
				expr.arguments[ 0 ].type === 'Identifier' &&
				expr.arguments[ 0 ].name === 'attributes';
			if ( isBareAttributes || isPassThroughWrapper ) {
				found = true;
				nodePath.stop();
			}
		},
	} );
	return found;
}

module.exports = {
	EXCLUDED_JSX_CONTAINERS,
	hasServerSideRenderWithAttributes,
	isControlSurfaceComponent,
};
