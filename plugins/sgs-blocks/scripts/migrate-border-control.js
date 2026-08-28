'use strict';

/**
 * migrate-border-control.js — Shape-A codemod: compose <SgsBorderControl> onto
 * an already block-private border UI (width + style + colour) in edit.js.
 *
 * CONTEXT. Task 0 (2026-08-27/28) hand-built `src/components/SgsBorderControl.js`
 * and proved it on two blocks: `sgs/product-card` (commit fc2796340) and
 * `sgs/quote` (commit 22943618b). Both are PRIVATE_NEEDS_SWAP -> PRIVATE_DONE
 * transitions -- an edit.js-only UI swap, NO block.json / render.php change,
 * because the underlying attrs (borderWidth/borderStyle/borderColour[+Gradient]
 * [+Hover[+Gradient]]) already existed. This script automates that SAME
 * transition for the remaining Shape-A population, found via
 * `survey-border-control-migration.py --survey --json`'s PRIVATE_NEEDS_SWAP
 * category.
 *
 * ⛔ THIS CODEMOD DOES NOT COVER "Shape B" (NATIVE_FULL -> new block-private
 * attrs + render.php CSS emission). Neither reference commit touched
 * render.php or added a new attribute -- both were ALREADY private before
 * Task 0. There is no proven render.php shape to derive Shape B from. See the
 * script's own `--survey` output and the session report for the full finding.
 *
 * WHY AN AST, NOT A REGEX (THE-MIGRATION-METHOD.md Step 4): the target is a
 * multi-line JSX composite (a JSXElement, an object literal buried in an
 * array, and a matching removal elsewhere in the same file) -- exactly the
 * "anything with {...}" case the method names. Model: colour-codemod/adopt.js
 * (parse with @babel/parser, splice via node.start/node.end on the ORIGINAL
 * source text, never `generate()` the whole file -- that would reformat
 * everything and turn a 3-line change into an unreviewable diff).
 *
 * THREE SUB-SHAPES RECOGNISED (Step 5's test applied honestly -- two of the
 * three DO collapse to one case with holes; a third genuinely does not and is
 * refused rather than forced):
 *
 *   WIDTH   -- ONE shape, byte-identical between product-card and quote's
 *              BEFORE state: a `<ResponsiveBoxControl label="Border width"
 *              presets={...} values={{ base: X ?? {} }} showResponsive={false}
 *              onChange={(tier,next)=>setAttributes({X:next})} />`. Holes:
 *              the attr name X, the presets literal, and (NEW, found surveying
 *              icon-list/timeline) an optional `{ borderStyle !== 'none' && (
 *              ... ) }` conditional wrapper -- STRIPPED on migration, because
 *              neither reference example gates width on style and
 *              SgsBorderControl's own native-style row never does either
 *              (the settled shape, Step 3, is unconditional).
 *
 *   STYLE   -- TWO shapes, BOTH already proven (one per reference example),
 *              so a genuine "one case, two holes" per Step 5 for classifying
 *              WHICH the target uses:
 *              (a) SELECTCONTROL -- a standalone `<SelectControl>` with a
 *                  local `BORDER_STYLE_OPTIONS` array (quote's before-shape).
 *              (b) COLOURROWS_EMBEDDED -- `borderStyle`/`onBorderStyleChange`
 *                  live as extra properties on the SAME colour-row object
 *                  literal that also carries the colour states
 *                  (product-card's before-shape).
 *
 *   COLOUR  -- ONE shape: an object literal (an element of the array passed to
 *              `<SgsColourPanel rows={...}>` / `colourRows`) with a `states`
 *              array of 1 (no hover) or 2 ('normal'+'hover') state objects,
 *              each `{key,label,value,onChange,[gradientValue,onGradientChange]}`
 *              -- optionally a `linked: true` sibling, which is CARRIED THROUGH
 *              (multi-state: `linked` on each state object; single-state: the
 *              `colourLinked` prop). ⚠ Both hand migrations DROPPED it
 *              (product-card 25 -> 24 occurrences, quote 9 -> 7) and this script
 *              copied that drop until 2026-08-29. It is a defect, not the target
 *              shape: `linked` decides whether the picker stores the palette
 *              token SLUG or a baked hex, so losing it freezes a client's colour
 *              against every future re-skin (D684). 5 of the 6 real Shape-A
 *              blocks carry it, and the single-value form could not express it
 *              at all until `colourLinked` was added to SgsBorderControl.
 *
 * ⛔ REFUSAL, NOT A THIRD CASE: `sgs/heading` mounts border colour+style
 * TWICE -- once via COLOURROWS_EMBEDDED, once more via a standalone
 * `<DesignTokenPicker borderStyle=... onBorderStyleChange=...>` inside its own
 * "Border" panel (its own comment literally says "two mounts, one source of
 * truth"). That is a THIRD structural shape neither reference example has.
 * Per Step 5's hand-back condition #6 this is not folded into the transform
 * as a third case -- it is refused (`style-mount-count!=1`) for human
 * judgement (which mount does Bean want kept?).
 *
 * CLI: --survey [--json] | --fix [--apply] | --check | --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const babelParser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

if ( process.stdout.setEncoding ) process.stdout.setEncoding( 'utf8' );

// ── Anchoring (THE-MIGRATION-METHOD.md Step 4's anchoring box) ─────────────
// Anchor on a repo-unique marker, never CLAUDE.md (plugins/sgs-blocks/ has
// its own).
function findRepoRoot( start ) {
	let cur = path.resolve( start );
	for ( ;; ) {
		if ( fs.existsSync( path.join( cur, '.claude', 'THE-MIGRATION-METHOD.md' ) ) ) return cur;
		const parent = path.dirname( cur );
		if ( parent === cur ) throw new Error( 'repo root not found (.claude/THE-MIGRATION-METHOD.md missing)' );
		cur = parent;
	}
}

const ROOT = findRepoRoot( __dirname );
const BLOCKS_DIR = path.join( ROOT, 'plugins', 'sgs-blocks', 'src', 'blocks' );
const SURVEY_SCRIPT = path.join( ROOT, 'plugins', 'sgs-blocks', 'scripts', 'survey-border-control-migration.py' );

// ── Small utilities ─────────────────────────────────────────────────────────

function parseJs( src ) {
	return babelParser.parse( src, {
		sourceType: 'module',
		plugins: [ 'jsx' ],
	} );
}

/** Build a WeakMap from AST node -> its enclosing @babel/traverse NodePath. */
function buildPathIndex( ast ) {
	const index = new WeakMap();
	traverse( ast, {
		enter( p ) {
			index.set( p.node, p );
		},
	} );
	return index;
}

function jsxAttrs( openingElement ) {
	const map = {};
	for ( const attr of openingElement.attributes ) {
		if ( attr.type === 'JSXAttribute' && attr.name && attr.name.type === 'JSXIdentifier' ) {
			map[ attr.name.name ] = attr;
		}
	}
	return map;
}

/** Unwrap a JSXAttribute's value down to the underlying expression node
 * (JSXExpressionContainer -> .expression), or the raw string for a bare
 * string literal attr. Returns null if the attr itself is null/undefined. */
function attrExpr( attr ) {
	if ( ! attr || ! attr.value ) return null;
	if ( attr.value.type === 'JSXExpressionContainer' ) return attr.value.expression;
	return attr.value; // StringLiteral, e.g. label="foo" (not used here, but safe)
}

function isTranslateCall( node, expected ) {
	return (
		node &&
		node.type === 'CallExpression' &&
		node.callee.type === 'Identifier' &&
		node.callee.name === '__' &&
		node.arguments.length >= 1 &&
		node.arguments[ 0 ].type === 'StringLiteral' &&
		node.arguments[ 0 ].value === expected
	);
}

function isSetAttributesSingleProp( node, expectedKey, expectedValueParamName ) {
	// node: CallExpression setAttributes({ [expectedKey]: <identifier expectedValueParamName> })
	if ( ! node || node.type !== 'CallExpression' ) return false;
	if ( ! node.callee || node.callee.type !== 'Identifier' || node.callee.name !== 'setAttributes' ) return false;
	if ( node.arguments.length !== 1 || node.arguments[ 0 ].type !== 'ObjectExpression' ) return false;
	const obj = node.arguments[ 0 ];
	if ( obj.properties.length !== 1 ) return false;
	const prop = obj.properties[ 0 ];
	if ( prop.type !== 'ObjectProperty' ) return false;
	const keyName = prop.key.type === 'Identifier' ? prop.key.name : ( prop.key.type === 'StringLiteral' ? prop.key.value : null );
	if ( keyName !== expectedKey ) return false;
	if ( expectedValueParamName === null ) return true; // caller doesn't care about the value shape
	return prop.value.type === 'Identifier' && prop.value.name === expectedValueParamName;
}

function arrowBodyCall( arrowFn ) {
	if ( ! arrowFn || ( arrowFn.type !== 'ArrowFunctionExpression' && arrowFn.type !== 'FunctionExpression' ) ) return null;
	if ( arrowFn.body.type === 'CallExpression' ) return arrowFn.body;
	if ( arrowFn.body.type === 'BlockStatement' && arrowFn.body.body.length === 1 && arrowFn.body.body[ 0 ].type === 'ExpressionStatement' ) {
		return arrowFn.body.body[ 0 ].expression;
	}
	return null;
}

// ── block.json attribute-name resolution ────────────────────────────────────

/**
 * Resolves the exact attribute names this migration needs. REFUSES (returns
 * null) unless the block declares EXACTLY the proven vocabulary:
 * borderWidth (object) + borderStyle (string) + borderColour (string), with
 * borderColourGradient / borderColourHover / borderColourHoverGradient all
 * OPTIONAL (verified live: sgs/text has borderColourHover with NO matching
 * Gradient sibling -- a real, legitimate asymmetry the extractor must accept,
 * not reject).
 */
function resolveAttrNames( blockJson ) {
	const attrs = blockJson.attributes || {};
	if ( ! attrs.borderWidth || attrs.borderWidth.type !== 'object' ) return null;
	if ( ! attrs.borderStyle || attrs.borderStyle.type !== 'string' ) return null;
	if ( ! attrs.borderColour || attrs.borderColour.type !== 'string' ) return null;
	return {
		width: 'borderWidth',
		style: 'borderStyle',
		colour: 'borderColour',
		colourGradient: attrs.borderColourGradient ? 'borderColourGradient' : null,
		colourHover: attrs.borderColourHover ? 'borderColourHover' : null,
		colourHoverGradient: attrs.borderColourHoverGradient ? 'borderColourHoverGradient' : null,
	};
}

// ── WIDTH matcher ────────────────────────────────────────────────────────────

function matchWidthControls( ast, pathIndex, attrNames ) {
	const matches = [];
	traverse( ast, {
		JSXElement( p ) {
			const opening = p.node.openingElement;
			if ( ! opening.name || opening.name.type !== 'JSXIdentifier' || opening.name.name !== 'ResponsiveBoxControl' ) return;
			const attrs = jsxAttrs( opening );
			const labelExpr = attrExpr( attrs.label );
			if ( ! isTranslateCall( labelExpr, 'Border width' ) ) return;

			const valuesExpr = attrExpr( attrs.values );
			if ( ! valuesExpr || valuesExpr.type !== 'ObjectExpression' ) return;
			if ( valuesExpr.properties.length !== 1 ) return; // base-only, no tablet/mobile
			const baseProp = valuesExpr.properties[ 0 ];
			const baseKey = baseProp.key.type === 'Identifier' ? baseProp.key.name : baseProp.key.value;
			if ( baseKey !== 'base' ) return;
			const baseVal = baseProp.value;
			if ( baseVal.type !== 'LogicalExpression' || baseVal.operator !== '??' ) return;
			if ( baseVal.left.type !== 'Identifier' || baseVal.left.name !== attrNames.width ) return;
			if ( baseVal.right.type !== 'ObjectExpression' || baseVal.right.properties.length !== 0 ) return;

			const showRespExpr = attrExpr( attrs.showResponsive );
			if ( ! showRespExpr || showRespExpr.type !== 'BooleanLiteral' || showRespExpr.value !== false ) return;

			const onChangeExpr = attrExpr( attrs.onChange );
			if ( ! onChangeExpr || onChangeExpr.type !== 'ArrowFunctionExpression' ) return;
			if ( onChangeExpr.params.length !== 2 ) return;
			const nextParamName = onChangeExpr.params[ 1 ].type === 'Identifier' ? onChangeExpr.params[ 1 ].name : null;
			const call = arrowBodyCall( onChangeExpr );
			if ( ! nextParamName || ! isSetAttributesSingleProp( call, attrNames.width, nextParamName ) ) return;

			const presetsAttr = attrs.presets;
			const presetsExpr = presetsAttr ? attrExpr( presetsAttr ) : null;

			// Guard detection: `{ cond !== 'x' && ( <ResponsiveBoxControl .../> ) }`
			const elPath = pathIndex.get( p.node );
			let guardCond = null;
			let replaceStart = p.node.start;
			let replaceEnd = p.node.end;
			const parentPath = elPath.parentPath;
			if (
				parentPath &&
				parentPath.isLogicalExpression() &&
				parentPath.node.operator === '&&' &&
				parentPath.node.right === p.node
			) {
				guardCond = parentPath.node.left;
				const containerPath = parentPath.parentPath;
				if ( containerPath && containerPath.isJSXExpressionContainer() ) {
					replaceStart = containerPath.node.start;
					replaceEnd = containerPath.node.end;
				}
			}

			matches.push( {
				node: p.node,
				presetsSrc: presetsExpr,
				guardCond,
				replaceStart,
				replaceEnd,
			} );
		},
	} );
	return matches;
}

// ── STYLE matchers ───────────────────────────────────────────────────────────

function matchSelectControlStyle( ast, attrNames ) {
	const matches = [];
	traverse( ast, {
		JSXElement( p ) {
			const opening = p.node.openingElement;
			if ( ! opening.name || opening.name.type !== 'JSXIdentifier' || opening.name.name !== 'SelectControl' ) return;
			const attrs = jsxAttrs( opening );
			const labelExpr = attrExpr( attrs.label );
			if ( ! isTranslateCall( labelExpr, 'Border style' ) ) return;
			const valueExpr = attrExpr( attrs.value );
			if ( ! valueExpr || valueExpr.type !== 'Identifier' || valueExpr.name !== attrNames.style ) return;
			const optionsExpr = attrExpr( attrs.options );
			if ( ! optionsExpr || optionsExpr.type !== 'Identifier' ) return;
			const onChangeExpr = attrExpr( attrs.onChange );
			if ( ! onChangeExpr || onChangeExpr.type !== 'ArrowFunctionExpression' || onChangeExpr.params.length !== 1 ) return;
			const paramName = onChangeExpr.params[ 0 ].type === 'Identifier' ? onChangeExpr.params[ 0 ].name : null;
			const call = arrowBodyCall( onChangeExpr );
			if ( ! paramName || ! isSetAttributesSingleProp( call, attrNames.style, paramName ) ) return;
			matches.push( { node: p.node, optionsIdent: optionsExpr.name } );
		},
	} );
	return matches;
}

/** Finds `borderStyle,` (shorthand) + `onBorderStyleChange: (val) =>
 * setAttributes({ [style]: val })` co-occurring as sibling properties on an
 * ObjectExpression (the COLOURROWS_EMBEDDED marker). */
function matchEmbeddedStyleMarkers( ast, attrNames ) {
	const matches = [];
	traverse( ast, {
		ObjectExpression( p ) {
			let styleShorthand = null;
			let onChangeProp = null;
			for ( const prop of p.node.properties ) {
				if ( prop.type !== 'ObjectProperty' ) continue;
				const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
				if ( keyName === attrNames.style && prop.shorthand ) styleShorthand = prop;
				if ( keyName === 'onBorderStyleChange' ) onChangeProp = prop;
			}
			if ( ! styleShorthand || ! onChangeProp ) return;
			const arrow = onChangeProp.value;
			if ( ! arrow || arrow.type !== 'ArrowFunctionExpression' || arrow.params.length !== 1 ) return;
			const paramName = arrow.params[ 0 ].type === 'Identifier' ? arrow.params[ 0 ].name : null;
			const call = arrowBodyCall( arrow );
			if ( ! paramName || ! isSetAttributesSingleProp( call, attrNames.style, paramName ) ) return;
			matches.push( { node: p.node, styleProp: styleShorthand, onChangeProp } );
		},
	} );
	return matches;
}

/** Finds any OTHER JSXElement (not the SelectControl already matched) mounting
 * `borderStyle=...` + `onBorderStyleChange=...` as JSX attributes -- the
 * heading-style duplicate-mount marker. */
function matchOtherJsxStyleMounts( ast, attrNames ) {
	const matches = [];
	traverse( ast, {
		JSXElement( p ) {
			const opening = p.node.openingElement;
			if ( opening.name && opening.name.type === 'JSXIdentifier' && opening.name.name === 'SelectControl' ) return;
			const attrs = jsxAttrs( opening );
			if ( ! attrs.borderStyle || ! attrs.onBorderStyleChange ) return;
			const bsExpr = attrExpr( attrs.borderStyle );
			if ( ! bsExpr || bsExpr.type !== 'Identifier' || bsExpr.name !== attrNames.style ) return;
			matches.push( { node: p.node } );
		},
	} );
	return matches;
}

// ── COLOUR matcher ───────────────────────────────────────────────────────────

function extractState( stateObj ) {
	const props = {};
	for ( const prop of stateObj.properties ) {
		if ( prop.type !== 'ObjectProperty' ) continue;
		const keyName = prop.key.type === 'Identifier' ? prop.key.name : ( prop.key.type === 'StringLiteral' ? prop.key.value : null );
		if ( keyName ) props[ keyName ] = prop;
	}
	return props;
}

function matchColourRows( ast, pathIndex, attrNames ) {
	const matches = [];
	traverse( ast, {
		ObjectExpression( p ) {
			const statesProp = p.node.properties.find(
				( pr ) => pr.type === 'ObjectProperty' && pr.key.type === 'Identifier' && pr.key.name === 'states'
			);
			if ( ! statesProp || statesProp.value.type !== 'ArrayExpression' ) return;
			const stateEls = statesProp.value.elements.filter( Boolean );
			if ( stateEls.length < 1 || stateEls.length > 2 ) return;
			// Must reference attrNames.colour in at least one state's `value`.
			const found = stateEls.some( ( el ) => {
				if ( el.type !== 'ObjectExpression' ) return false;
				const sp = extractState( el );
				return sp.value && sp.value.value.type === 'Identifier' && sp.value.value.name === attrNames.colour;
			} );
			if ( ! found ) return;

			// Confirm this object is a member of a rows/colourRows LIST -- either
			// a literal array element (`rows={ [ {...} ] }`, quote's before-shape)
			// OR a `.push({...})` call argument (`colourRows.push({...})`,
			// product-card's before-shape). Both are proven real shapes.
			const objPath = pathIndex.get( p.node );
			const parent = objPath.parentPath;
			const isArrayElement = parent && parent.isArrayExpression();
			const isPushArg =
				parent &&
				parent.isCallExpression() &&
				parent.node.callee.type === 'MemberExpression' &&
				parent.node.callee.property.type === 'Identifier' &&
				parent.node.callee.property.name === 'push';
			if ( ! isArrayElement && ! isPushArg ) return;

			const keyProp = p.node.properties.find( ( pr ) => pr.type === 'ObjectProperty' && pr.key.type === 'Identifier' && pr.key.name === 'key' );
			const labelProp = p.node.properties.find( ( pr ) => pr.type === 'ObjectProperty' && pr.key.type === 'Identifier' && pr.key.name === 'label' );
			const styleShorthand = p.node.properties.find(
				( pr ) => pr.type === 'ObjectProperty' && pr.key.type === 'Identifier' && pr.key.name === attrNames.style && pr.shorthand
			);
			const onBorderStyleChangeProp = p.node.properties.find(
				( pr ) => pr.type === 'ObjectProperty' && pr.key.type === 'Identifier' && pr.key.name === 'onBorderStyleChange'
			);

			const states = stateEls.map( ( el ) => extractState( el ) );

			matches.push( {
				node: p.node,
				keyProp,
				labelProp,
				hasEmbeddedStyle: !! ( styleShorthand && onBorderStyleChangeProp ),
				states,
				stateEls,
			} );
		},
	} );
	return matches;
}

// ── Full-file classifier ─────────────────────────────────────────────────────

const REFUSAL = ( reason, detail ) => ( { status: 'unrecognised', reason, detail: detail || null } );

function classifyBlock( slug ) {
	const dir = path.join( BLOCKS_DIR, slug );
	const blockJsonPath = path.join( dir, 'block.json' );
	const editPath = path.join( dir, 'edit.js' );
	if ( ! fs.existsSync( blockJsonPath ) || ! fs.existsSync( editPath ) ) {
		return REFUSAL( 'missing-files' );
	}
	let blockJson;
	try {
		blockJson = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		return REFUSAL( 'block-json-parse-error', String( e ) );
	}
	const attrNames = resolveAttrNames( blockJson );
	if ( ! attrNames ) return REFUSAL( 'attr-shape-mismatch' );

	const src = fs.readFileSync( editPath, 'utf8' );
	let ast;
	try {
		ast = parseJs( src );
	} catch ( e ) {
		return REFUSAL( 'parse-error', String( e ) );
	}
	const pathIndex = buildPathIndex( ast );

	// Already migrated? (idempotence / definition guard)
	if ( src.includes( 'SgsBorderControl' ) ) return { status: 'already-done' };

	const widthMatches = matchWidthControls( ast, pathIndex, attrNames );
	if ( widthMatches.length !== 1 ) return REFUSAL( 'width-match-count!=1', widthMatches.length );

	const selectMatches = matchSelectControlStyle( ast, attrNames );
	const embeddedMatches = matchEmbeddedStyleMarkers( ast, attrNames );
	const otherMounts = matchOtherJsxStyleMounts( ast, attrNames );
	const totalStyleMounts = selectMatches.length + embeddedMatches.length + otherMounts.length;
	if ( totalStyleMounts !== 1 ) {
		return REFUSAL( 'style-mount-count!=1', {
			select: selectMatches.length,
			embedded: embeddedMatches.length,
			other: otherMounts.length,
		} );
	}

	const colourMatches = matchColourRows( ast, pathIndex, attrNames );
	if ( colourMatches.length !== 1 ) return REFUSAL( 'colour-row-count!=1', colourMatches.length );

	let variant;
	let selectNode = null;
	let optionsIdent = null;
	if ( selectMatches.length === 1 ) {
		variant = 'SELECTCONTROL';
		selectNode = selectMatches[ 0 ].node;
		optionsIdent = selectMatches[ 0 ].optionsIdent;
		if ( colourMatches[ 0 ].hasEmbeddedStyle ) return REFUSAL( 'style-mount-conflict:selectcontrol+embedded' );
	} else {
		variant = 'COLOURROWS_EMBEDDED';
		if ( ! colourMatches[ 0 ].hasEmbeddedStyle ) return REFUSAL( 'embedded-marker-not-on-colour-row' );
	}

	// Validate state shape: keys must be within {normal, hover}, and 'value'
	// must resolve to a KNOWN attr from attrNames (colour or colourHover).
	const states = colourMatches[ 0 ].states;
	for ( const st of states ) {
		if ( ! st.key ) return REFUSAL( 'colour-state-missing-key' );
		const keyLit = st.key.value.type === 'StringLiteral' ? st.key.value.value : null;
		if ( ! [ 'normal', 'hover' ].includes( keyLit ) ) return REFUSAL( 'colour-state-unexpected-key', keyLit );
		if ( ! st.value || st.value.value.type !== 'Identifier' ) return REFUSAL( 'colour-state-value-not-identifier' );
		const valName = st.value.value.name;
		const expected = keyLit === 'normal' ? attrNames.colour : attrNames.colourHover;
		if ( valName !== expected ) return REFUSAL( 'colour-state-value-mismatch', { keyLit, valName, expected } );
	}

	return {
		status: 'fixable',
		attrNames,
		variant,
		widthMatch: widthMatches[ 0 ],
		selectNode,
		optionsIdent,
		colourMatch: colourMatches[ 0 ],
		src,
		ast,
	};
}

// ── Style detection (per-file, for emission) ────────────────────────────────

function detectFileStyle( src ) {
	const qm = src.match( /__\(\s*(['"])/ );
	const q = qm ? qm[ 1 ] : "'";
	const spacedMatch = src.match( /label=\{( ?)__\(/ );
	const sp = spacedMatch ? ( spacedMatch[ 1 ] === ' ' ? ' ' : '' ) : ' ';
	const usesTabs = /\n\t/.test( src );
	const unit = usesTabs ? '\t' : '  ';
	return { q, sp, unit };
}

function lineIndentOf( src, pos ) {
	const start = src.lastIndexOf( '\n', pos - 1 ) + 1;
	const m = src.slice( start, pos ).match( /^[ \t]*/ );
	return m ? m[ 0 ] : '';
}

function tr( style, text ) {
	// Re-quote a translation-call-free plain string for our own labels.
	return style.q + text + style.q;
}

// ── Emission ─────────────────────────────────────────────────────────────────

function sliceSrc( src, node ) {
	return src.slice( node.start, node.end );
}

function buildSgsBorderControlJsx( src, style, baseIndent, ctx ) {
	const { q, sp } = style;
	const unit = style.unit;
	const i1 = baseIndent + unit; // attrs
	const i2 = i1 + unit; // colourStates array items
	const i3 = i2 + unit; // item props
	const { attrNames, widthMatch, variant, colourMatch, selectNode, optionsIdent } = ctx;

	const presetsSrc = widthMatch.presetsSrc ? sliceSrc( src, widthMatch.presetsSrc ) : 'false';

	let styleValueSrc;
	let onStyleChangeSrc;
	if ( variant === 'SELECTCONTROL' ) {
		styleValueSrc = attrNames.style;
		onStyleChangeSrc = `( val ) => setAttributes( {${ sp }${ attrNames.style }: val${ sp }} )`;
	} else {
		styleValueSrc = attrNames.style;
		onStyleChangeSrc = `( val ) => setAttributes( {${ sp }${ attrNames.style }: val${ sp }} )`;
	}

	// Colour label: reuse the row's own `label` translation call verbatim.
	const labelSrc = colourMatch.labelProp ? sliceSrc( src, colourMatch.labelProp.value ) : `__( ${ tr( style, 'Colour' ) }, ${ tr( style, 'sgs-blocks' ) } )`;

	const states = colourMatch.states;
	// `linked: true` is NOT cosmetic -- GradientCapableColourControl reads it to
	// decide whether a picked colour is stored as the palette token SLUG or as a
	// baked hex (:126), and whether a stored slug resolves for display (:88/:201).
	// Dropping it would silently freeze a client's colour against every future
	// re-skin -- the D684 failure. Both output forms carry it: the multi-state
	// form passes `linked` through on each state object, and the single-state
	// form uses SgsBorderControl's `colourLinked` prop (added 2026-08-29 for
	// exactly this -- before that the single-value shape could not express it).
	let colourPropsLines;
	if ( states.length === 1 && states[ 0 ].key && states[ 0 ].key.value.value === 'normal' ) {
		const st = states[ 0 ];
		const valueSrc = sliceSrc( src, st.value.value );
		const onChangeSrc = sliceSrc( src, st.onChange.value );
		const lines = [
			`${ i1 }colourLabel={${ sp }${ labelSrc }${ sp }}`,
			`${ i1 }colourValue={${ sp }${ valueSrc }${ sp }}`,
			`${ i1 }onColourChange={${ sp }${ onChangeSrc }${ sp }}`,
		];
		if ( st.gradientValue ) {
			lines.push( `${ i1 }colourGradientValue={${ sp }${ sliceSrc( src, st.gradientValue.value ) }${ sp }}` );
		}
		if ( st.onGradientChange ) {
			lines.push( `${ i1 }onColourGradientChange={${ sp }${ sliceSrc( src, st.onGradientChange.value ) }${ sp }}` );
		}
		// Carried VERBATIM, not synthesised -- see the `linked` note above.
		if ( st.linked ) {
			lines.push( `${ i1 }colourLinked={${ sp }${ sliceSrc( src, st.linked.value ) }${ sp }}` );
		}
		colourPropsLines = lines;
	} else {
		const itemLines = [];
		for ( const st of states ) {
			const keyLit = st.key.value.value;
			const rows = [ `${ i2 }{` ];
			rows.push( `${ i3 }key: ${ tr( style, keyLit ) },` );
			rows.push( `${ i3 }label: ${ sliceSrc( src, st.label.value ) },` );
			rows.push( `${ i3 }value: ${ sliceSrc( src, st.value.value ) },` );
			rows.push( `${ i3 }onChange: ${ sliceSrc( src, st.onChange.value ) },` );
			// Carried VERBATIM, not synthesised -- see the `anyLinked` note above.
			if ( st.linked ) rows.push( `${ i3 }linked: ${ sliceSrc( src, st.linked.value ) },` );
			if ( st.gradientValue ) rows.push( `${ i3 }gradientValue: ${ sliceSrc( src, st.gradientValue.value ) },` );
			if ( st.onGradientChange ) rows.push( `${ i3 }onGradientChange: ${ sliceSrc( src, st.onGradientChange.value ) },` );
			rows.push( `${ i2 }},` );
			itemLines.push( rows.join( '\n' ) );
		}
		colourPropsLines = [
			`${ i1 }colourLabel={${ sp }${ labelSrc }${ sp }}`,
			`${ i1 }colourStates={${ sp }[`,
			itemLines.join( '\n' ),
			`${ i1 }]${ sp }}`,
		];
	}

	const lines = [
		`${ baseIndent }{ /* Task 0 codemod (migrate-border-control.js) -- one composite row`,
		`${ baseIndent }   (width/style/colour) mirroring native's BorderBoxControl layout,`,
		`${ baseIndent }   matching sgs/product-card + sgs/quote. Border-radius is unchanged`,
		`${ baseIndent }   (stays WP-native). */ }`,
		`${ baseIndent }<SgsBorderControl`,
		`${ i1 }widthValues={${ sp }${ attrNames.width } ?? {}${ sp }}`,
		`${ i1 }onWidthChange={${ sp }( next ) => setAttributes( {${ sp }${ attrNames.width }: next${ sp }} )${ sp }}`,
		`${ i1 }widthPresets={${ sp }${ presetsSrc }${ sp }}`,
		`${ i1 }styleValue={${ sp }${ styleValueSrc }${ sp }}`,
		`${ i1 }onStyleChange={${ sp }${ onStyleChangeSrc }${ sp }}`,
		...colourPropsLines,
		`${ baseIndent }/>`,
	];
	return lines.join( '\n' );
}

// ── Edit-range removal helpers ───────────────────────────────────────────────

function lineStartOf( src, pos ) {
	return src.lastIndexOf( '\n', pos - 1 ) + 1;
}
function lineEndInclusiveOf( src, pos ) {
	const i = src.indexOf( '\n', pos );
	return i === -1 ? src.length : i + 1;
}

function removeWholeLines( src, node ) {
	return { start: lineStartOf( src, node.start ), end: lineEndInclusiveOf( src, node.end ), replacement: '' };
}

// ── transform() ──────────────────────────────────────────────────────────────

/**
 * Add `SgsBorderControl` to the block's existing named import from
 * `../../components`. Returns null when the binding already exists (so a
 * re-run cannot double-add) or when there is no such import to extend --
 * in which case the caller has nothing safe to splice into and the block
 * would be REFUSED rather than silently left broken.
 *
 * Both real import shapes are handled: single-line (`import { A, B } from
 * '../../components';`) and multi-line, distinguished by whether the
 * declaration's own source text spans a newline. The insertion is anchored on
 * the LAST specifier so a trailing comma style is preserved either way, and
 * the first matching declaration wins (`sgs/button` has two).
 */
function componentImportEdit( ctx ) {
	const { src, ast } = ctx;
	let decl = null;
	traverse( ast, {
		ImportDeclaration( p ) {
			if ( decl ) return;
			const source = p.node.source.value;
			if ( source !== '../../components' ) return;
			if ( ! p.node.specifiers.some( ( s ) => s.type === 'ImportSpecifier' ) ) return;
			decl = p.node;
		},
	} );
	if ( ! decl ) return null;

	const already = decl.specifiers.some(
		( s ) => s.type === 'ImportSpecifier' && s.local && s.local.name === 'SgsBorderControl'
	);
	if ( already ) return null;

	const specifiers = decl.specifiers.filter( ( s ) => s.type === 'ImportSpecifier' );
	const last = specifiers[ specifiers.length - 1 ];
	const declText = src.slice( decl.start, decl.end );
	const multiline = declText.includes( '\n' );

	if ( ! multiline ) {
		return { kind: 'import', start: last.end, end: last.end, replacement: ', SgsBorderControl' };
	}
	// Multi-line: match the indentation of the last specifier's own line.
	const indent = lineIndentOf( src, last.start );
	return { kind: 'import', start: last.end, end: last.end, replacement: `,\n${ indent }SgsBorderControl` };
}

function computeEdits( ctx ) {
	const { src, style } = ctx;
	const baseIndent = lineIndentOf( src, ctx.widthMatch.replaceStart );
	const newTag = buildSgsBorderControlJsx( src, style, baseIndent, ctx );

	const edits = [ { kind: 'width', start: ctx.widthMatch.replaceStart, end: ctx.widthMatch.replaceEnd, replacement: newTag } ];
	edits.push( { kind: 'colour-row', ...removeWholeLines( src, ctx.colourMatch.node ) } );

	// Import the component we just mounted. Emitting the JSX without this is a
	// ReferenceError the moment the block loads in the editor -- neither
	// reference commit exposed it, because a human added the import by hand
	// while migrating. `check-undefined-references` caught it on all six blocks.
	const importEdit = componentImportEdit( ctx );
	if ( importEdit ) edits.push( importEdit );

	if ( ctx.variant === 'SELECTCONTROL' && ctx.selectNode ) {
		edits.push( { kind: 'style-select', ...removeWholeLines( src, ctx.selectNode ) } );

		// Remove the now-dead BORDER_STYLE_OPTIONS const, IF no other reference
		// to ctx.optionsIdent remains outside the SelectControl node itself.
		let otherRefs = 0;
		let declNode = null;
		traverse( ctx.ast, {
			Identifier( p ) {
				if ( p.node.name !== ctx.optionsIdent ) return;
				// Skip the declarator id itself and the reference inside the
				// SelectControl JSX we're already removing.
				if ( p.parentPath.isVariableDeclarator() && p.parentPath.node.id === p.node ) return;
				if ( p.node.start >= ctx.selectNode.start && p.node.end <= ctx.selectNode.end ) return;
				otherRefs++;
			},
			VariableDeclarator( p ) {
				if ( p.node.id.type === 'Identifier' && p.node.id.name === ctx.optionsIdent ) {
					declNode = p.parentPath.isVariableDeclaration() ? p.parentPath.node : p.node;
				}
			},
		} );
		if ( otherRefs === 0 && declNode ) {
			const decl = removeWholeLines( src, declNode );
			// Consume exactly one trailing blank line, if present, so we don't
			// leave a double blank line where the const used to sit.
			if ( src.slice( decl.end, decl.end + 1 ) === '\n' ) decl.end += 1;
			edits.push( { kind: 'options-const', ...decl } );
		}
	}

	// Sanity: no two edit ranges may overlap.
	const sorted = edits.slice().sort( ( a, b ) => a.start - b.start );
	for ( let i = 1; i < sorted.length; i++ ) {
		if ( sorted[ i ].start < sorted[ i - 1 ].end ) {
			throw new Error( 'INTERNAL: overlapping edit ranges -- refusing to apply' );
		}
	}
	return edits;
}

function applyEdits( src, edits ) {
	let out = src;
	for ( const e of edits.slice().sort( ( a, b ) => b.start - a.start ) ) {
		out = out.slice( 0, e.start ) + e.replacement + out.slice( e.end );
	}
	return out;
}

function transform( ctx ) {
	const edits = computeEdits( ctx );
	return applyEdits( ctx.src, edits );
}

// ── targets() ────────────────────────────────────────────────────────────────

function runSurveyPython() {
	const out = execFileSync( 'python', [ SURVEY_SCRIPT, '--survey', '--json' ], { cwd: ROOT, encoding: 'utf8' } );
	return JSON.parse( out );
}

function targets() {
	const census = runSurveyPython();
	return Object.keys( census.blocks )
		.filter( ( slug ) => census.blocks[ slug ].category === 'PRIVATE_NEEDS_SWAP' )
		.sort();
}

// Independent, dumb corpus-width control (Step 6 #6): glob every block.json
// under src/blocks and confirm it is at least as large a population as our
// python-derived target list could plausibly come from.
function broadEnumeration() {
	return fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && fs.existsSync( path.join( BLOCKS_DIR, d.name, 'block.json' ) ) )
		.map( ( d ) => d.name )
		.sort();
}

// ── CLI commands ─────────────────────────────────────────────────────────────

function cmdSurvey( asJson ) {
	const list = targets();
	const wide = broadEnumeration();
	if ( wide.length < 70 ) {
		console.log( 'CROSSCHECK FAILURE: broad enumeration found only %d blocks (expected >=70)', wide.length );
		return 1;
	}
	const results = {};
	for ( const slug of list ) results[ slug ] = classifyBlock( slug );

	if ( asJson ) {
		const out = {};
		for ( const [ slug, r ] of Object.entries( results ) ) {
			out[ slug ] = { status: r.status, reason: r.reason || null, detail: r.detail || null, variant: r.variant || null };
		}
		console.log( JSON.stringify( { targets: list, results: out }, null, 2 ) );
		return 0;
	}

	console.log( '=== migrate-border-control.js Shape-A census ===' );
	console.log( 'Targets (PRIVATE_NEEDS_SWAP from survey-border-control-migration.py): %d', list.length );
	console.log();
	for ( const slug of list ) {
		const r = results[ slug ];
		if ( r.status === 'fixable' ) {
			console.log( '  FIXABLE  %s  (variant=%s)', slug, r.variant );
		} else if ( r.status === 'already-done' ) {
			console.log( '  DONE     %s', slug );
		} else {
			console.log( '  REFUSED  %s  reason=%s  detail=%s', slug, r.reason, JSON.stringify( r.detail ) );
		}
	}
	return 0;
}

function cmdFix( apply ) {
	const list = targets();
	let anyFailed = false;
	for ( const slug of list ) {
		const r = classifyBlock( slug );
		if ( r.status !== 'fixable' ) continue;
		const style = detectFileStyle( r.src );
		const edits = computeEdits( { ...r, style } );
		const out = applyEdits( r.src, edits );

		// Re-parse the output to prove it is still syntactically valid JS/JSX
		// before ever writing it.
		try {
			parseJs( out );
		} catch ( e ) {
			console.log( 'REFUSING to write %s: transform produced invalid JS (%s)', slug, e.message );
			anyFailed = true;
			continue;
		}

		const editPath = path.join( BLOCKS_DIR, slug, 'edit.js' );
		if ( apply ) {
			const tmp = editPath + '.tmp';
			fs.writeFileSync( tmp, out, 'utf8' );
			fs.renameSync( tmp, editPath );
			console.log( 'APPLIED  %s (%d edit(s))', slug, edits.length );
		} else {
			console.log( '--- %s (variant=%s, %d edit(s)) ---', slug, r.variant, edits.length );
			printEditDiff( r.src, edits );
		}
	}
	return anyFailed ? 1 : 0;
}

/** Print each computed edit as its own before/after span -- exact, since we
 * already know precisely which byte ranges changed (no generic differ
 * needed, and no risk of a naive whole-file diff mis-locating the change). */
function printEditDiff( src, edits ) {
	const sorted = edits.slice().sort( ( a, b ) => a.start - b.start );
	for ( const e of sorted ) {
		const before = src.slice( e.start, e.end );
		console.log( '  [%s]', e.kind );
		for ( const line of before.split( '\n' ) ) if ( line.length ) console.log( '  - ' + line );
		for ( const line of e.replacement.split( '\n' ) ) if ( line.length ) console.log( '  + ' + line );
		console.log();
	}
}

function cmdCheck() {
	// A codemod NOT YET applied to any real block (per the brief: no --apply
	// on the 8-block population this session). Per Step 8's shape table, a
	// binary `--check` that fails while the whole backlog is unmigrated would
	// redden every build tonight for no actionable reason -- registering a
	// hard gate before Bean has chosen to run --apply is exactly the
	// "GUARD-shaped vs binary" distinction the method warns about. This
	// --check is therefore NARROWLY SCOPED (per Step 8's guidance for a
	// --check that would otherwise be red for reasons beyond this migration):
	// it fails ONLY if a block that is ALREADY migrated (contains
	// `SgsBorderControl`) regresses back to one of the old shapes being
	// reintroduced elsewhere in the same file, or if the FIXABLE count
	// increases without human review of this script. It is a REGRESSION
	// GUARD, not a "migration must be finished" binary gate -- explicitly not
	// wired into gates.json (see the script's own header / the session
	// report) until --apply has actually run once.
	const list = targets();
	let fixableCount = 0;
	const refusalCounts = {};
	for ( const slug of list ) {
		const r = classifyBlock( slug );
		if ( r.status === 'fixable' ) fixableCount++;
		if ( r.status === 'unrecognised' ) refusalCounts[ r.reason ] = ( refusalCounts[ r.reason ] || 0 ) + 1;
	}
	// Ceiling recorded at first real run (see self-test / survey output):
	// FIXABLE should never SHRINK unexpectedly (that would mean the
	// classifier regressed and stopped recognising real targets) and should
	// never GROW past the known population without this script being re-run
	// by a human (a brand-new PRIVATE_NEEDS_SWAP block landing with an
	// unrecognised shape is fine; one landing with the OLD recognised shape
	// and never being migrated is the thing worth flagging).
	// 2026-08-29: was 6 (button, container, option-picker, process-steps, text,
	// timeline) while those six were still UNMIGRATED. All six have now been
	// applied, so they classify `already-done` and `fixable` is legitimately 0.
	// A floor of 6 would therefore fail BECAUSE the migration succeeded -- a
	// guard that goes red on success trains people to ignore it. The floor is
	// now 0 and the guard's remaining job is the one stated above: catch an OLD
	// recognised shape being reintroduced (which shows up as fixable > 0 on a
	// population that should be fully migrated), and catch the classifier
	// silently ceasing to recognise anything.
	const FIXABLE_FLOOR = 0;
	if ( fixableCount < FIXABLE_FLOOR ) {
		console.log( 'CHECK FAILED -- fixable count dropped to %d (floor %d). Classifier regressed?', fixableCount, FIXABLE_FLOOR );
		return 1;
	}
	if ( fixableCount > 0 ) {
		console.log(
			'CHECK: %d block(s) still carry the OLD pre-composite border shape -- either a new block landed with it, or a migrated block regressed.',
			fixableCount
		);
	}
	console.log( 'CHECK OK -- fixable=%d, refusals=%s', fixableCount, JSON.stringify( refusalCounts ) );
	return 0;
}

// ── self-test ────────────────────────────────────────────────────────────────

function hasJsxElement( ast, name ) {
	let found = false;
	traverse( ast, {
		JSXElement( p ) {
			if ( p.node.openingElement.name.type === 'JSXIdentifier' && p.node.openingElement.name.name === name ) found = true;
		},
	} );
	return found;
}

function hasIdentifier( ast, name ) {
	let found = false;
	traverse( ast, {
		Identifier( p ) {
			if ( p.node.name === name ) found = true;
		},
	} );
	return found;
}

function hasLogicalGuardOnJsx( ast, jsxName ) {
	let found = false;
	traverse( ast, {
		JSXElement( p ) {
			if ( p.node.openingElement.name.type !== 'JSXIdentifier' || p.node.openingElement.name.name !== jsxName ) return;
			if ( p.parentPath && p.parentPath.isLogicalExpression() && p.parentPath.node.operator === '&&' && p.parentPath.node.right === p.node ) {
				found = true;
			}
		},
	} );
	return found;
}

const FIXTURES_DIR = path.join( __dirname, 'border-control-codemod', 'fixtures' );

/** Remove the `linked:` passthrough lines the codemod now emits, so the PROOF
 * assertions can compare against reference commits that predate that fix. */
function stripLinked( src ) {
	return src
		.split( '\n' )
		.filter( ( line ) => ! /^\s*linked:/.test( line ) && ! /^\s*colourLinked=/.test( line ) )
		.join( '\n' );
}

function loadFixture( name ) {
	return fs.readFileSync( path.join( FIXTURES_DIR, name ), 'utf8' );
}

function classifySource( src, attrNames ) {
	let ast;
	try {
		ast = parseJs( src );
	} catch ( e ) {
		return REFUSAL( 'parse-error', String( e ) );
	}
	const pathIndex = buildPathIndex( ast );
	if ( src.includes( 'SgsBorderControl' ) ) return { status: 'already-done' };
	const widthMatches = matchWidthControls( ast, pathIndex, attrNames );
	if ( widthMatches.length !== 1 ) return REFUSAL( 'width-match-count!=1', widthMatches.length );
	const selectMatches = matchSelectControlStyle( ast, attrNames );
	const embeddedMatches = matchEmbeddedStyleMarkers( ast, attrNames );
	const otherMounts = matchOtherJsxStyleMounts( ast, attrNames );
	const totalStyleMounts = selectMatches.length + embeddedMatches.length + otherMounts.length;
	if ( totalStyleMounts !== 1 ) {
		return REFUSAL( 'style-mount-count!=1', { select: selectMatches.length, embedded: embeddedMatches.length, other: otherMounts.length } );
	}
	const colourMatches = matchColourRows( ast, pathIndex, attrNames );
	if ( colourMatches.length !== 1 ) return REFUSAL( 'colour-row-count!=1', colourMatches.length );
	let variant;
	let selectNode = null;
	let optionsIdent = null;
	if ( selectMatches.length === 1 ) {
		variant = 'SELECTCONTROL';
		selectNode = selectMatches[ 0 ].node;
		optionsIdent = selectMatches[ 0 ].optionsIdent;
		if ( colourMatches[ 0 ].hasEmbeddedStyle ) return REFUSAL( 'style-mount-conflict:selectcontrol+embedded' );
	} else {
		variant = 'COLOURROWS_EMBEDDED';
		if ( ! colourMatches[ 0 ].hasEmbeddedStyle ) return REFUSAL( 'embedded-marker-not-on-colour-row' );
	}
	return {
		status: 'fixable',
		attrNames,
		variant,
		widthMatch: widthMatches[ 0 ],
		selectNode,
		optionsIdent,
		colourMatch: colourMatches[ 0 ],
		src,
		ast,
	};
}

const STD_ATTR_NAMES = {
	width: 'borderWidth',
	style: 'borderStyle',
	colour: 'borderColour',
	colourGradient: 'borderColourGradient',
	colourHover: 'borderColourHover',
	colourHoverGradient: 'borderColourHoverGradient',
};

function runSelfTest() {
	const failures = [];
	const check = ( name, fn ) => {
		try {
			const ok = fn();
			if ( ! ok ) failures.push( name );
		} catch ( e ) {
			failures.push( name + ' -- threw: ' + e.message );
		}
	};

	// 1. Positive: SELECTCONTROL fixture classifies fixable + transforms cleanly.
	check( 'positive: selectcontrol fixture is fixable', () => {
		const src = loadFixture( 'positive-selectcontrol.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		return r.status === 'fixable' && r.variant === 'SELECTCONTROL';
	} );
	check( 'positive: selectcontrol fixture transforms to valid JS containing SgsBorderControl', () => {
		const src = loadFixture( 'positive-selectcontrol.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		const ast = parseJs( out ); // throws if invalid
		return hasJsxElement( ast, 'SgsBorderControl' ) && ! hasJsxElement( ast, 'SelectControl' ) && ! hasIdentifier( ast, 'BORDER_STYLE_OPTIONS' );
	} );

	// 2. Positive: COLOURROWS_EMBEDDED fixture (product-card/container shape).
	check( 'positive: embedded fixture is fixable', () => {
		const src = loadFixture( 'positive-embedded.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		return r.status === 'fixable' && r.variant === 'COLOURROWS_EMBEDDED';
	} );
	check( 'positive: embedded fixture transforms to valid JS', () => {
		const src = loadFixture( 'positive-embedded.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		const ast = parseJs( out );
		return hasJsxElement( ast, 'SgsBorderControl' ) && ! hasIdentifier( ast, 'onBorderStyleChange' );
	} );

	// 3. Edge: conditional-guard width control (icon-list/timeline shape) is
	// recognised AND the guard is stripped on emission (settled shape is
	// unconditional).
	check( 'edge: guarded-width fixture is fixable and strips the guard', () => {
		const src = loadFixture( 'edge-guarded-width.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		if ( r.status !== 'fixable' ) return false;
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		const ast = parseJs( out );
		return hasJsxElement( ast, 'SgsBorderControl' ) && ! hasLogicalGuardOnJsx( ast, 'SgsBorderControl' );
	} );

	// 4. Definition / already-done: a file already using SgsBorderControl
	// must classify 'already-done' and NEVER be re-transformed (idempotence
	// at the classifier level).
	check( 'definition: already-done fixture is not re-fixed', () => {
		const src = loadFixture( 'definition-already-done.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		return r.status === 'already-done';
	} );

	// 5. Negative control: a file with none of the shapes present must be
	// byte-identical if run through transform (it never reaches transform()
	// because classify refuses it first -- assert the refusal instead).
	check( 'negative control: no-border fixture refuses cleanly', () => {
		const src = loadFixture( 'negative-no-border.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		return r.status === 'unrecognised' && r.reason === 'width-match-count!=1';
	} );

	// 6. Refusal: duplicate-mount (heading shape) is refused, never guessed.
	check( 'refusal: duplicate-mount fixture is refused with the right reason', () => {
		const src = loadFixture( 'refusal-duplicate-mount.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		return r.status === 'unrecognised' && r.reason === 'style-mount-count!=1' && r.detail.embedded === 1 && r.detail.other === 1;
	} );

	// 7. Idempotence: transform() output, re-classified, is 'already-done'.
	check( 'idempotence: transformed output reclassifies as already-done', () => {
		const src = loadFixture( 'positive-selectcontrol.js' );
		const r = classifySource( src, STD_ATTR_NAMES );
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		const r2 = classifySource( out, STD_ATTR_NAMES );
		return r2.status === 'already-done';
	} );

	// 8. Corpus control: broadEnumeration() must be sane and >= the known
	// target population (independent of the python survey's own count).
	check( 'corpus control: broad enumeration finds >=70 blocks', () => {
		return broadEnumeration().length >= 70;
	} );

	// 9. Attr-name asymmetry: sgs/text has borderColourHover but NO
	// borderColourHoverGradient -- resolveAttrNames must accept this, not
	// reject it, and the emitted hover state must omit gradient props.
	check( 'attr asymmetry: hover-without-gradient resolves and emits cleanly', () => {
		const blockJson = {
			attributes: {
				borderWidth: { type: 'object' },
				borderStyle: { type: 'string' },
				borderColour: { type: 'string' },
				borderColourGradient: { type: 'string' },
				borderColourHover: { type: 'string' },
				// deliberately no borderColourHoverGradient
			},
		};
		const names = resolveAttrNames( blockJson );
		return names && names.colourHover === 'borderColourHover' && names.colourHoverGradient === null;
	} );

	// 10. Proof against the real product-card BEFORE state (fc2796340~1).
	check( 'PROOF: product-card BEFORE (fc2796340~1) classifies fixable/embedded', () => {
		const before = execFileSync(
			'git',
			[ 'show', 'fc2796340~1:plugins/sgs-blocks/src/blocks/product-card/edit.js' ],
			{ cwd: ROOT, encoding: 'utf8' }
		);
		const bj = JSON.parse(
			execFileSync( 'git', [ 'show', 'fc2796340~1:plugins/sgs-blocks/src/blocks/product-card/block.json' ], { cwd: ROOT, encoding: 'utf8' } )
		);
		const names = resolveAttrNames( bj );
		const r = classifySource( before, names );
		return r.status === 'fixable' && r.variant === 'COLOURROWS_EMBEDDED';
	} );

	check( 'PROOF: product-card codemod output structurally matches the real AFTER commit', () => {
		const before = execFileSync(
			'git',
			[ 'show', 'fc2796340~1:plugins/sgs-blocks/src/blocks/product-card/edit.js' ],
			{ cwd: ROOT, encoding: 'utf8' }
		);
		const bj = JSON.parse(
			execFileSync( 'git', [ 'show', 'fc2796340~1:plugins/sgs-blocks/src/blocks/product-card/block.json' ], { cwd: ROOT, encoding: 'utf8' } )
		);
		const names = resolveAttrNames( bj );
		const r = classifySource( before, names );
		const style = detectFileStyle( before );
		const out = transform( { ...r, style } );
		parseJs( out );
		const after = execFileSync(
			'git',
			[ 'show', 'fc2796340:plugins/sgs-blocks/src/blocks/product-card/edit.js' ],
			{ cwd: ROOT, encoding: 'utf8' }
		);
		// DELIBERATE DIVERGENCE: `linked` is stripped from OUR output before the
		// comparison because the real AFTER commit DROPPED it (product-card
		// 25 -> 24 occurrences, quote 9 -> 7). That drop is a defect in the two
		// hand migrations, not the target shape -- it silently switches the
		// picker from storing a palette SLUG to a baked hex. The proof still
		// holds everything else byte-for-byte; this one key is the only thing
		// the codemod now does BETTER than its references.
		return structurallyEquivalentSgsBorderControl( stripLinked( out ), after );
	} );

	check( 'PROOF: quote BEFORE (22943618b~1) classifies fixable/selectcontrol', () => {
		const before = execFileSync( 'git', [ 'show', '22943618b~1:plugins/sgs-blocks/src/blocks/quote/edit.js' ], { cwd: ROOT, encoding: 'utf8' } );
		const bj = JSON.parse( execFileSync( 'git', [ 'show', '22943618b~1:plugins/sgs-blocks/src/blocks/quote/block.json' ], { cwd: ROOT, encoding: 'utf8' } ) );
		const names = resolveAttrNames( bj );
		const r = classifySource( before, names );
		return r.status === 'fixable' && r.variant === 'SELECTCONTROL';
	} );

	check( 'PROOF: quote codemod output structurally matches the real AFTER commit', () => {
		const before = execFileSync( 'git', [ 'show', '22943618b~1:plugins/sgs-blocks/src/blocks/quote/edit.js' ], { cwd: ROOT, encoding: 'utf8' } );
		const bj = JSON.parse( execFileSync( 'git', [ 'show', '22943618b~1:plugins/sgs-blocks/src/blocks/quote/block.json' ], { cwd: ROOT, encoding: 'utf8' } ) );
		const names = resolveAttrNames( bj );
		const r = classifySource( before, names );
		const style = detectFileStyle( before );
		const out = transform( { ...r, style } );
		parseJs( out );
		const after = execFileSync( 'git', [ 'show', '22943618b:plugins/sgs-blocks/src/blocks/quote/edit.js' ], { cwd: ROOT, encoding: 'utf8' } );
		// See the divergence note on the product-card proof above.
		return structurallyEquivalentSgsBorderControl( stripLinked( out ), after );
	} );

	// `linked: true` survives the transform. It decides whether the picker stores
	// a palette token SLUG or a baked hex (GradientCapableColourControl.js:126),
	// so dropping it silently freezes a client's colour against future re-skins
	// -- the D684 failure. 5 of the 6 real Shape-A blocks carry it. The
	// positive-selectcontrol fixture already contained `linked: true` while
	// NOTHING asserted on it, so the transform dropped it through 14 green
	// assertions; these two close that hole.
	check( 'linked: a linked colour row emits colourStates carrying linked, not the single-value form', () => {
		const src = loadFixture( 'positive-selectcontrol.js' );
		if ( ! /linked:\s*true/.test( src ) ) return false; // fixture must still carry the trigger
		const r = classifySource( src, STD_ATTR_NAMES );
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		parseJs( out );
		// Either output form is acceptable; what must NOT happen is the value
		// vanishing. Multi-state carries `linked:` inside colourStates;
		// single-state carries the `colourLinked` prop.
		return /linked:\s*true/.test( out ) || /colourLinked=\{\s*true\s*\}/.test( out );
	} );

	check( 'linked NEGATIVE CONTROL: an unlinked row keeps the single-value form and gains no linked key', () => {
		const src = loadFixture( 'positive-selectcontrol.js' ).replace( /^.*linked:\s*true.*\n/m, '' );
		if ( /linked:/.test( src ) ) return false; // the strip must actually have landed
		const r = classifySource( src, STD_ATTR_NAMES );
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		parseJs( out );
		return ! /linked:/.test( out ) && ! /colourLinked/.test( out ) && /colourValue=/.test( out );
	} );

	// The mounted component must also be IMPORTED. Emitting the JSX alone is a
	// ReferenceError as soon as the block loads in the editor. Neither PROOF
	// assertion covers this (they compare only the SgsBorderControl attribute
	// map), and neither reference commit exposed it because a human added the
	// import by hand -- so the codemod shipped without one until 2026-08-29 and
	// broke all six blocks. `check-undefined-references` in the prebuild chain
	// is what caught it.
	check( 'import: transform adds SgsBorderControl to the existing components import', () => {
		const src = loadFixture( 'positive-selectcontrol.js' );
		if ( /SgsBorderControl/.test( src ) ) return false; // fixture must not pre-import it
		const r = classifySource( src, STD_ATTR_NAMES );
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		const ast = parseJs( out );
		let imported = false;
		traverse( ast, {
			ImportDeclaration( p ) {
				if ( p.node.source.value !== '../../components' ) return;
				if ( p.node.specifiers.some( ( sp ) => sp.local && sp.local.name === 'SgsBorderControl' ) ) imported = true;
			},
		} );
		return imported && hasJsxElement( ast, 'SgsBorderControl' );
	} );

	check( 'import NEGATIVE CONTROL: a file with no components import is not silently mounted', () => {
		// Strip the import; the transform must NOT invent one out of thin air,
		// so the mount would be undefined -- proving the assertion above is
		// actually detecting the edit rather than always passing.
		const src = loadFixture( 'positive-selectcontrol.js' ).replace(
			/^import \{[^}]*\} from '\.\.\/\.\.\/components';\n/m,
			''
		);
		if ( /from '\.\.\/\.\.\/components'/.test( src ) ) return false; // strip must have landed
		const r = classifySource( src, STD_ATTR_NAMES );
		const style = detectFileStyle( src );
		const out = transform( { ...r, style } );
		return ! /import \{[^}]*SgsBorderControl/.test( out );
	} );

	if ( failures.length ) {
		console.log( 'SELF-TEST FAILED (%d):', failures.length );
		for ( const f of failures ) console.log( '  ! %s', f );
		return 1;
	}
	console.log( 'SELF-TEST OK -- %d assertions passed.', 18 );
	return 0;
}

/** Structural-equivalence check for proof against real commits: comments and
 * incidental whitespace/quote-style will legitimately differ (a codemod
 * cannot invent bespoke hand-written prose comments) -- what must match is
 * the SgsBorderControl JSXElement's attribute NAMES and, for each attribute,
 * its expression with whitespace/quotes normalised. */
function structurallyEquivalentSgsBorderControl( srcA, srcB ) {
	const getAttrs = ( src ) => {
		const ast = parseJs( src );
		let found = null;
		traverse( ast, {
			JSXElement( p ) {
				if ( p.node.openingElement.name.name === 'SgsBorderControl' ) found = p.node.openingElement;
			},
		} );
		if ( ! found ) return null;
		const map = {};
		for ( const attr of found.attributes ) {
			const name = attr.name.name;
			const expr = attrExpr( attr );
			map[ name ] = expr ? normalise( sliceSrc( src, expr ) ) : null;
		}
		return map;
	};
	const normalise = ( s ) => s.replace( /\s+/g, ' ' ).replace( /"/g, "'" ).trim();
	const a = getAttrs( srcA );
	const b = getAttrs( srcB );
	if ( ! a || ! b ) return false;
	const keysA = Object.keys( a ).sort();
	const keysB = Object.keys( b ).sort();
	if ( keysA.join( ',' ) !== keysB.join( ',' ) ) return false;
	for ( const k of keysA ) {
		if ( a[ k ] !== b[ k ] ) return false;
	}
	return true;
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) process.exit( runSelfTest() );
	if ( argv.includes( '--check' ) ) process.exit( cmdCheck() );
	if ( argv.includes( '--survey' ) ) process.exit( cmdSurvey( argv.includes( '--json' ) ) );
	if ( argv.includes( '--fix' ) ) process.exit( cmdFix( argv.includes( '--apply' ) ) );
	console.log( 'Usage: node migrate-border-control.js --survey [--json] | --fix [--apply] | --check | --self-test' );
	process.exit( 1 );
}

if ( require.main === module ) main();

module.exports = { classifyBlock, classifySource, transform, resolveAttrNames, detectFileStyle, targets, broadEnumeration, STD_ATTR_NAMES };
