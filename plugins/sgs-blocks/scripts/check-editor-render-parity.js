/**
 * check-editor-render-parity.js
 *
 * NEW STRUCTURAL GUARD (2026-08-13) — closes a class of bug no existing gate
 * in this repo catches: "a control is set up correctly on ONE side (editor
 * OR live-page rendering) but not the other, or does something on one side
 * that doesn't match the other." Two shapes, found live in sgs/hero this
 * session:
 *
 *  SHAPE A — editor-canvas desync. `splitContentOrder` was destructured from
 *    `attributes` in edit.js and correctly WRITTEN by a control (a real
 *    RangeControl `value={}`/`onChange={}` binding, reading and writing the
 *    attribute), and render.php correctly CONSUMED it to produce right
 *    frontend CSS — but edit.js's own JSX preview never referenced the
 *    attribute anywhere in its actual `return (...)` markup OUTSIDE the
 *    InspectorControls/BlockControls panels, so the editor canvas never
 *    visually reflected the control despite the control "working" (writing
 *    the attribute) and the frontend being completely correct. This project's
 *    own check-dead-controls.js only checks whether an attribute is consumed
 *    ANYWHERE (destructure + any file mention counts as consumed) — it has no
 *    concept of "does the JSX *return* body actually use this value," so this
 *    bug sailed through that gate clean. CHECK A closes that gap.
 *
 *  SHAPE B — invalid-value passthrough. An edit.js SelectControl offers an
 *    option whose `value` is not a member of the native CSS property's valid
 *    keyword set that render.php ultimately writes it into as a literal
 *    string-concatenated declaration (e.g. `object-fit` only accepts
 *    fill|contain|cover|none|scale-down — sgs/hero's `imageObjectFit` control
 *    offered `match-height`/`match-width`, neither valid, so the browser
 *    silently dropped the declaration). The value is structurally "accepted"
 *    (present in the options array, allowlisted before use) but produces no
 *    coherent behaviour once it reaches a real CSS property with a small
 *    fixed keyword set. CHECK B closes that gap.
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
 * CHECK A METHOD
 * ---------------
 * 1. Parse edit.js with @babel/parser (same parser + plugin set as
 *    check-duplicate-controls.js, this project's own AST-tooling precedent).
 * 2. Collect every attribute name destructured FROM `attributes` (either
 *    `const { a, b } = attributes;` or the nested function-param shape
 *    `function Edit( { attributes: { a, b }, setAttributes } )`).
 * 3. Collect every attribute WRITTEN via a `setAttributes({...})` call or the
 *    house-style `update('attr', val)` setter, anywhere in the file — reusing
 *    the exact regex shapes check-dead-controls.js's collectControlledAttrs
 *    already uses and has proven against this codebase.
 * 4. Collect every Identifier referenced ANYWHERE ELSE in the file, EXCLUDING
 *    any subtree rooted at an <InspectorControls> or <BlockControls> element
 *    — those are editor-chrome/control bindings, not the preview canvas. A
 *    control's own `value={attr}` binding lives inside InspectorControls and
 *    deliberately does NOT count as "used" — that is the exact distinction
 *    the real bug hid behind. NOT scoped to "inside a JSX node" (see the
 *    REVISED note on collectExcludedRanges() below — that narrower scoping
 *    was tried first and produced 762 false positives against the real
 *    tree, because this codebase's dominant convention computes a value's
 *    effect — a className string, a derived boolean — in plain JS BEFORE the
 *    return statement, and only the DERIVED value appears again inside JSX).
 * 5. Flag any attribute that is destructured AND written AND declared in the
 *    block's own block.json, but never appears as a genuine Identifier
 *    reference (not a destructuring binding, not a plain-object-literal key)
 *    anywhere outside the excluded ranges. (Destructured-but-not-written is
 *    CHECK 1's job in check-dead-controls.js — deliberately out of scope
 *    here to avoid double-reporting the same underlying defect under two
 *    different gate names.)
 *
 * CHECK A BLIND SPOTS (name-match, not scope-resolved — same convention this
 * project's other checks use, e.g. check-dead-controls.js's word-boundary
 * regex match on attribute names):
 *   1. A local variable with the SAME NAME as a destructured attribute, used
 *      inside the preview JSX but shadowing the real attribute, would clear
 *      the finding even though the attribute itself is unused (false
 *      negative — this check never causes a false POSITIVE from this gap).
 *   2. Attribute renaming in destructuring (`const { foo: renamed } =
 *      attributes`) is read by its KEY name (`foo`), matching this project's
 *      "attribute name is the schema key" convention — a renamed LOCAL
 *      variable referenced in JSX under the renamed name is not currently
 *      matched back to the key. Not observed live in this codebase as of
 *      2026-08-13 (no renamed attribute-destructure found in the survey run
 *      below); documented in case it appears later.
 *   3. JSX assigned to an intermediate variable before being returned
 *      (`const preview = <div>...</div>; return preview;`) IS still caught —
 *      the JSXElement/JSXFragment scan is file-wide, not anchored to a
 *      literal `return (...)` statement — but a value passed into a CHILD
 *      component as a prop and used in THAT child component's OWN separate
 *      file is invisible (out of scope by design — cross-file JSX tracing is
 *      a different, much larger detector).
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
 * ADVISORY-FIRST (both checks, 2026-08-13): per this project's own doctrine
 * (inspector-scan/rules.json _meta note: "Every GENUINELY NEW rule starts
 * advisory"; check-dead-controls.js's CHECK_4_BLOCKS_BUILD/CHECK_5_BLOCKS_
 * BUILD flip-flag pattern) — a brand-new detector never promotes to a
 * build-blocking gate on the run that introduces it. CHECK_A_BLOCKS_BUILD and
 * CHECK_B_BLOCKS_BUILD below are both `false`. Flip either to `true` only
 * after that check's live-survey backlog (see the commit that ships this
 * file for the measured count) has been triaged — fixed or accepted into
 * editor-render-parity-baseline.json with a reason.
 *
 * BASELINE: editor-render-parity-baseline.json, same shape and discipline as
 * dead-controls-baseline.json — findings NOT listed there are "net-new".
 *
 * Usage:
 *   node scripts/check-editor-render-parity.js               # survey (report, exit 0)
 *   node scripts/check-editor-render-parity.js --survey       # same, explicit
 *   node scripts/check-editor-render-parity.js --check        # for prebuild/CI (advisory: exit 0 unless flipped to gate)
 *   node scripts/check-editor-render-parity.js --json         # machine-readable
 *   node scripts/check-editor-render-parity.js --self-test    # positive + negative fixtures, both checks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const parser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const KEYWORD_TABLE_PATH = path.join( __dirname, 'css-keyword-enums.json' );
const BASELINE_FILE = path.join( __dirname, 'editor-render-parity-baseline.json' );

// Same parser + plugin set as check-duplicate-controls.js (this project's own
// AST-tooling precedent) — reused rather than introducing a new dependency.
const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [
		'jsx',
		'classProperties',
		'objectRestSpread',
		'optionalChaining',
		'nullishCoalescingOperator',
		'dynamicImport',
	],
	errorRecovery: true,
};

// Escape hatch for a destructured+written attribute that is LEGITIMATELY
// editor-invisible by design (e.g. pure a11y text, SEO-only fields, attrs
// that only affect frontend interactivity with zero visual editor
// difference). Kept tiny and structural, same discipline as check-dead-
// controls.js's EDITOR_ONLY_ATTRS — the primary escape hatch for a specific
// finding is the baseline file below; this is for a genuinely universal name.
const EDITOR_INVISIBLE_BY_DESIGN = new Set();

// WP-native block-supports attribute names, consumed automatically by
// useBlockProps()/WP's own serialization machinery — NOT by literal code in
// edit.js. Measured 2026-08-13: sgs/accordion's `style` (WP-native
// supports.spacing/color target) false-positived on the FIRST real-tree
// survey run for exactly this reason — its only appearance in edit.js is
// `attributes.style?.spacing?.padding` inside its OWN ResponsiveBoxControl
// binding (itself inside InspectorControls, correctly excluded), because the
// native style object is applied to the block wrapper by the block editor
// framework itself when useBlockProps() runs, never by an explicit
// identifier reference in the block author's own code. Structural, tiny,
// same discipline as EDITOR_ONLY_ATTRS/SYSTEM_ATTR_PREFIXES in check-dead-
// controls.js.
const NATIVE_SUPPORTS_ATTR_NAMES = new Set( [ 'style', 'className', 'anchor', 'lock', 'metadata' ] );

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

function safeParse( src ) {
	try {
		return parser.parse( src, BABEL_PARSE_OPTS );
	} catch ( e ) {
		return null;
	}
}

function loadKeywordTable() {
	const raw = readIfExists( KEYWORD_TABLE_PATH );
	if ( ! raw ) {
		return {};
	}
	const data = JSON.parse( raw );
	return data.properties || {};
}

function readDeclaredAttrs( dir ) {
	const blockJsonPath = path.join( dir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) {
		return null;
	}
	let meta;
	try {
		meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		return null;
	}
	const attrs = new Set(
		Object.keys( meta.attributes || {} ).filter(
			( k ) => ! k.startsWith( '_comment' ) && ! k.startsWith( '_note' )
		)
	);
	// `providesContext` values are the SOURCE ATTRIBUTE feeding a WP block-
	// context key a CHILD block consumes (e.g. sgs/accordion-item reads
	// `sgs\accordionHeaderColour` context, sourced from the parent's own
	// `headerColour` attribute). The parent's own edit.js legitimately never
	// re-references such an attribute — its "canvas" is the CHILD block's own
	// editor preview, not the parent's. Same exemption class check-dead-
	// controls.js's CHECK 1 rule (b) already grants; CHECK A needs its own
	// copy because it scans a different corpus (JS identifiers, not text
	// consumption). Deliberately NOT verifying the child block actually
	// CONSUMES the context live (check-dead-controls.js's stricter
	// liveContextKeys cross-check) — documented as a blind spot below rather
	// than reimplementing that cross-block wiring here.
	const providesContextAttrs = new Set( Object.values( meta.providesContext || {} ) );
	return { name: meta.name || path.basename( dir ), attrs, providesContextAttrs };
}

function jsxOpeningName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) {
		return null;
	}
	if ( n.type === 'JSXIdentifier' ) {
		return n.name;
	}
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

function jsxAttrValueNode( openingElement, attrName ) {
	const attr = ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === attrName
	);
	return attr ? attr.value : null;
}

// ---------------------------------------------------------------------------
// CHECK A — editor-canvas desync
// ---------------------------------------------------------------------------

const EXCLUDED_JSX_CONTAINERS = new Set( [ 'InspectorControls', 'BlockControls' ] );

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
			// Check if the attributes prop is a JSXExpressionContainer with an Identifier 'attributes'
			if (
				attrsNode.type === 'JSXExpressionContainer' &&
				attrsNode.expression &&
				attrsNode.expression.type === 'Identifier' &&
				attrsNode.expression.name === 'attributes'
			) {
				found = true;
				nodePath.stop();
			}
		},
	} );
	return found;
}

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
			if ( EXCLUDED_JSX_CONTAINERS.has( name ) ) {
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

/**
 * CHECK A driver for one block.
 *
 * @param {string}      blockName           Reporting name, e.g. 'sgs/hero'.
 * @param {string}      dir                 Absolute path to the block directory.
 * @param {Set<string>} declaredAttrs       Attribute names declared in block.json.
 * @param {Set<string>} [providesContextAttrs] Attribute names sourcing a providesContext key (default empty).
 * @return {Array<Object>} Findings.
 */
function checkEditorCanvasDesync( blockName, dir, declaredAttrs, providesContextAttrs ) {
	providesContextAttrs = providesContextAttrs || new Set();
	const editJsPath = path.join( dir, 'edit.js' );
	const src = readIfExists( editJsPath );
	if ( ! src ) {
		return [];
	}
	const ast = safeParse( src );
	if ( ! ast ) {
		return []; // parse failure is not this check's concern
	}

	// If this block uses ServerSideRender with attributes={attributes}, the
	// editor canvas displays the actual render.php output via REST — all
	// attributes flow into that real render, so none can be "unused" by the
	// editor preview. Exempt the entire block.
	if ( hasServerSideRenderWithAttributes( ast ) ) {
		return [];
	}

	const destructured = collectDestructuredFromAttributes( ast );
	const written = collectSetAttributesWrites( src );
	const excludedRanges = collectExcludedRanges( ast );
	const usedOutsideControls = collectUsedIdentifiersOutsideExcluded( ast, excludedRanges );

	const findings = [];
	for ( const attr of destructured ) {
		if ( ! declaredAttrs.has( attr ) ) {
			continue; // not a real block.json attribute (e.g. a shared-component prop)
		}
		if ( ! written.has( attr ) ) {
			continue; // destructured-but-never-controlled is check-dead-controls.js's job
		}
		if ( EDITOR_INVISIBLE_BY_DESIGN.has( attr ) || NATIVE_SUPPORTS_ATTR_NAMES.has( attr ) ) {
			continue;
		}
		if ( providesContextAttrs.has( attr ) ) {
			continue; // consumed by a CHILD block's own editor preview via block context, not this block's
		}
		if ( usedOutsideControls.has( attr ) ) {
			continue;
		}
		findings.push( {
			check: 'editor-canvas-desync',
			block: blockName,
			attr,
			reason:
				`'${ attr }' is destructured from attributes and written by a control ` +
				"(setAttributes/update) in edit.js, but never referenced anywhere in the file outside " +
				'its own InspectorControls/BlockControls binding — the control writes the attribute but ' +
				'nothing outside the control panel itself (editor canvas preview, computed className, ' +
				'derived variable) reads it back, so the editor canvas never shows its effect',
		} );
	}
	return findings;
}

// ---------------------------------------------------------------------------
// CHECK B — invalid CSS keyword passthrough
// ---------------------------------------------------------------------------

// `$localVar = $attributes['AttrName']` (optional `?? default`, optional
// leading paren) — the direct-read shape.
const ATTR_READ_RE = /\$([A-Za-z_]\w*)\s*=\s*\(?\s*\$attributes\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g;

/**
 * Collect every direct `$var = $attributes['AttrName']` read in render.php.
 *
 * @param {string} phpSrc render.php source.
 * @return {Map<string,string>} localVar -> attrName.
 */
function collectAttrVarMap( phpSrc ) {
	const map = new Map();
	let m;
	ATTR_READ_RE.lastIndex = 0;
	while ( ( m = ATTR_READ_RE.exec( phpSrc ) ) !== null ) {
		map.set( m[ 1 ], m[ 2 ] );
	}
	return map;
}

/**
 * One-hop derived-variable trace: `$derived = ...$original...;` where
 * `$original` is already resolved to an attribute by collectAttrVarMap.
 *
 * @param {string}              phpSrc     render.php source.
 * @param {Map<string,string>}  attrVarMap Direct-read map (localVar -> attrName).
 * @return {Map<string,string>} derivedVar -> attrName (same attribute, one hop away).
 */
function collectDerivedVarMap( phpSrc, attrVarMap ) {
	const derived = new Map();
	const assignRe = /\$([A-Za-z_]\w*)\s*=([^;]*);/g;
	let m;
	while ( ( m = assignRe.exec( phpSrc ) ) !== null ) {
		const lhs = m[ 1 ];
		const rhs = m[ 2 ];
		if ( attrVarMap.has( lhs ) ) {
			continue; // that IS a direct-read assignment, not a derivation
		}
		for ( const [ origVar, attrName ] of attrVarMap ) {
			const re = new RegExp( '\\$' + origVar + '\\b' );
			if ( re.test( rhs ) ) {
				derived.set( lhs, attrName );
				break;
			}
		}
	}
	return derived;
}

function resolveAttrForVar( varName, attrVarMap, derivedVarMap ) {
	return attrVarMap.get( varName ) || derivedVarMap.get( varName ) || null;
}

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

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return [];
	}
	const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
	return Array.isArray( data.accepted ) ? data.accepted : [];
}

function findingKey( f ) {
	return `${ f.check }:${ f.block }:${ f.attr }`;
}

// ---------------------------------------------------------------------------
// Survey driver
// ---------------------------------------------------------------------------

function collectAllBlockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );
}

function runSurvey() {
	const keywordTable = loadKeywordTable();
	const dirs = collectAllBlockDirs();
	let findingsA = [];
	let findingsB = [];
	let scanned = 0;
	for ( const dir of dirs ) {
		const meta = readDeclaredAttrs( dir );
		if ( ! meta ) {
			continue;
		}
		scanned++;
		findingsA = findingsA.concat(
			checkEditorCanvasDesync( meta.name, dir, meta.attrs, meta.providesContextAttrs )
		);
		findingsB = findingsB.concat( checkInvalidKeywordPassthrough( meta.name, dir, keywordTable ) );
	}
	return { findingsA, findingsB, blockCount: scanned };
}

function printReport( title, netNew, accepted ) {
	process.stdout.write( `${ title } — advisory, does not fail the build:\n` );
	if ( accepted.length ) {
		process.stdout.write( `  ${ accepted.length } baselined finding(s) (accepted with reason).\n` );
	}
	if ( ! netNew.length ) {
		process.stdout.write( '  OK — 0 net-new findings.\n\n' );
		return;
	}
	process.stdout.write( `  ${ netNew.length } net-new finding(s):\n` );
	for ( const f of netNew ) {
		process.stdout.write( `   - [${ f.block }] ${ f.attr } — ${ f.reason }\n` );
	}
	process.stdout.write( '\n' );
}

// ---------------------------------------------------------------------------
// Self-test — proves each check can FAIL (positive control) and stays clear
// on the negative/intercepted controls.
// ---------------------------------------------------------------------------

function assertTrue( cond, msg, failures ) {
	if ( ! cond ) {
		failures.push( msg );
	}
}

function runSelfTest() {
	let pass = true;
	const log = ( msg ) => process.stdout.write( msg + '\n' );
	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-editor-render-parity-' ) );

	function writeBlock( dirName, files ) {
		const dir = path.join( tmpRoot, dirName );
		fs.mkdirSync( dir, { recursive: true } );
		for ( const [ name, content ] of Object.entries( files ) ) {
			fs.writeFileSync( path.join( dir, name ), content, 'utf8' );
		}
		return dir;
	}

	log( '[check-editor-render-parity --self-test] CHECK A (editor-canvas desync)\n' );
	const failuresA = [];

	const posADir = writeBlock( 'check-a-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-positive',
			attributes: { splitContentOrder: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview">Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const posAMeta = readDeclaredAttrs( posADir );
	const posAFindings = checkEditorCanvasDesync( posAMeta.name, posADir, posAMeta.attrs );
	assertTrue(
		posAFindings.some( ( f ) => f.attr === 'splitContentOrder' ),
		'positive fixture: expected splitContentOrder to be flagged, got none',
		failuresA
	);

	const negADir = writeBlock( 'check-a-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-negative',
			attributes: { splitContentOrder: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder } = attributes;',
			'\treturn (',
			'\t\t<div { ...useBlockProps() }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<div className="preview" style={ { order: splitContentOrder } }>Hello</div>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const negAMeta = readDeclaredAttrs( negADir );
	const negAFindings = checkEditorCanvasDesync( negAMeta.name, negADir, negAMeta.attrs );
	assertTrue(
		! negAFindings.some( ( f ) => f.attr === 'splitContentOrder' ),
		'negative fixture: splitContentOrder should NOT be flagged (referenced in preview), but was',
		failuresA
	);

	// Second negative control — proves the codebase's DOMINANT real convention
	// (a value computed into a className/derived variable in plain JS BEFORE
	// the return statement, never re-appearing as a literal identifier inside
	// JSX) is correctly NOT flagged. This is the exact shape sgs/accordion's
	// `iconPosition` uses (className built pre-return, then spread via
	// useBlockProps) — the shape that broke the first version of this
	// detector (762 false positives; see collectExcludedRanges()'s doc
	// comment) before CHECK A was rescoped to whole-file-minus-excluded-
	// ranges.
	const negA2Dir = writeBlock( 'check-a-negative-prereturn', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-negative-prereturn',
			attributes: { iconPosition: { type: 'string' } },
		} ),
		'edit.js': [
			"import { InspectorControls, useBlockProps } from '@wordpress/block-editor';",
			"import { PanelBody, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { iconPosition } = attributes;',
			'\tconst className = `sgs-accordion--icon-${ iconPosition }`;',
			'\tconst blockProps = useBlockProps( { className } );',
			'\treturn (',
			'\t\t<div { ...blockProps }>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<SelectControl value={ iconPosition } onChange={ ( v ) => setAttributes( { iconPosition: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\tHello',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const negA2Meta = readDeclaredAttrs( negA2Dir );
	const negA2Findings = checkEditorCanvasDesync( negA2Meta.name, negA2Dir, negA2Meta.attrs );
	assertTrue(
		! negA2Findings.some( ( f ) => f.attr === 'iconPosition' ),
		'negative fixture (pre-return convention): iconPosition should NOT be flagged (used to build ' +
			'className before the return, then spread via useBlockProps), but was',
		failuresA
	);

	// Positive control for ServerSideRender exemption — attributes are
	// destructured and written, but the editor canvas shows the actual
	// render.php output via REST, so no attribute is unused. All should be
	// exempt.
	const ssrDir = writeBlock( 'check-a-ssr-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-a-ssr-positive',
			attributes: {
				splitContentOrder: { type: 'string' },
				otherAttr: { type: 'string' },
			},
		} ),
		'edit.js': [
			"import { ServerSideRender } from '@wordpress/server-side-render';",
			"import { InspectorControls } from '@wordpress/block-editor';",
			"import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';",
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { splitContentOrder, otherAttr } = attributes;',
			'\treturn (',
			'\t\t<div>',
			'\t\t\t<InspectorControls>',
			'\t\t\t\t<PanelBody>',
			'\t\t\t\t\t<RangeControl value={ splitContentOrder } onChange={ ( v ) => setAttributes( { splitContentOrder: v } ) } />',
			'\t\t\t\t\t<SelectControl value={ otherAttr } onChange={ ( v ) => setAttributes( { otherAttr: v } ) } />',
			'\t\t\t\t</PanelBody>',
			'\t\t\t</InspectorControls>',
			'\t\t\t<ServerSideRender',
			'\t\t\t\tblock="sgs/fixture-a-ssr-positive"',
			'\t\t\t\tattributes={ attributes }',
			'\t\t\t/>',
			'\t\t</div>',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const ssrMeta = readDeclaredAttrs( ssrDir );
	const ssrFindings = checkEditorCanvasDesync( ssrMeta.name, ssrDir, ssrMeta.attrs );
	assertTrue(
		ssrFindings.length === 0,
		'SSR positive fixture: ServerSideRender with attributes={ attributes } should exempt ALL attributes, ' +
			'but got ' + ssrFindings.length + ' finding(s): ' +
			ssrFindings.map( ( f ) => f.attr ).join( ', ' ),
		failuresA
	);

	if ( failuresA.length ) {
		pass = false;
		log( 'CHECK A — FAIL' );
		failuresA.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'CHECK A — PASS (positive control flagged, negative control clear)' );
	}

	log( '\n[check-editor-render-parity --self-test] CHECK B (invalid CSS keyword passthrough)\n' );
	const failuresB = [];
	const keywordTable = loadKeywordTable();

	const renderPhpFixture = [
		'<?php',
		"$image_object_fit = $attributes['imageObjectFit'] ?? 'cover';",
		"$allowed_fits = array('fill','contain','cover','none');",
		'$safe_fit = in_array($image_object_fit,$allowed_fits,true) ? $image_object_fit : \'cover\';',
		"echo '<style>.x{object-fit:'.$safe_fit.'}</style>';",
	].join( '\n' );

	const posBDir = writeBlock( 'check-b-positive', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-b-positive',
			attributes: { imageObjectFit: { type: 'string' } },
		} ),
		'render.php': renderPhpFixture,
		'edit.js': [
			"import { SelectControl } from '@wordpress/components';",
			'const FIT_OPTIONS = [',
			"\t{ label: 'Cover', value: 'cover' },",
			"\t{ label: 'Match height', value: 'match-height' },",
			'];',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { imageObjectFit } = attributes;',
			'\treturn (',
			'\t\t<SelectControl value={ imageObjectFit } options={ FIT_OPTIONS } onChange={ ( v ) => setAttributes( { imageObjectFit: v } ) } />',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const posBFindings = checkInvalidKeywordPassthrough( 'sgs/fixture-b-positive', posBDir, keywordTable );
	assertTrue(
		posBFindings.some( ( f ) => f.reason.includes( 'match-height' ) ),
		'positive fixture: expected match-height flagged for object-fit, got none',
		failuresB
	);

	const negBDir = writeBlock( 'check-b-negative', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-b-negative',
			attributes: { imageObjectFit: { type: 'string' } },
		} ),
		'render.php': renderPhpFixture,
		'edit.js': [
			"import { SelectControl } from '@wordpress/components';",
			'const FIT_OPTIONS = [',
			"\t{ label: 'Cover', value: 'cover' },",
			"\t{ label: 'Contain', value: 'contain' },",
			'];',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { imageObjectFit } = attributes;',
			'\treturn (',
			'\t\t<SelectControl value={ imageObjectFit } options={ FIT_OPTIONS } onChange={ ( v ) => setAttributes( { imageObjectFit: v } ) } />',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const negBFindings = checkInvalidKeywordPassthrough( 'sgs/fixture-b-negative', negBDir, keywordTable );
	assertTrue(
		negBFindings.length === 0,
		`negative fixture: expected 0 findings (all option values valid), got ${ negBFindings.length }`,
		failuresB
	);

	const interceptedDir = writeBlock( 'check-b-intercepted', {
		'block.json': JSON.stringify( {
			name: 'sgs/fixture-b-intercepted',
			attributes: { imageObjectFit: { type: 'string' } },
		} ),
		'render.php': [
			'<?php',
			"$image_object_fit = $attributes['imageObjectFit'] ?? 'cover';",
			"if ( 'stretch' === $image_object_fit ) {",
			"\techo '<style>.x{object-fit:cover}</style>';",
			'} else {',
			"\t$allowed_fits = array('fill','contain','cover','none');",
			"\t$safe_fit = in_array($image_object_fit,$allowed_fits,true) ? $image_object_fit : 'cover';",
			"\techo '<style>.x{object-fit:'.$safe_fit.'}</style>';",
			'}',
		].join( '\n' ),
		'edit.js': [
			"import { SelectControl } from '@wordpress/components';",
			'const FIT_OPTIONS = [',
			"\t{ label: 'Cover', value: 'cover' },",
			"\t{ label: 'Stretch', value: 'stretch' },",
			'];',
			'export default function Edit( { attributes, setAttributes } ) {',
			'\tconst { imageObjectFit } = attributes;',
			'\treturn (',
			'\t\t<SelectControl value={ imageObjectFit } options={ FIT_OPTIONS } onChange={ ( v ) => setAttributes( { imageObjectFit: v } ) } />',
			'\t);',
			'}',
		].join( '\n' ),
	} );
	const interceptedFindings = checkInvalidKeywordPassthrough(
		'sgs/fixture-b-intercepted',
		interceptedDir,
		keywordTable
	);
	assertTrue(
		! interceptedFindings.some( ( f ) => f.reason.includes( '"stretch"' ) ),
		"intercepted fixture: 'stretch' is diverted by its own conditional branch before the generic " +
			'emission — should NOT be flagged, but was',
		failuresB
	);

	if ( failuresB.length ) {
		pass = false;
		log( 'CHECK B — FAIL' );
		failuresB.forEach( ( f ) => log( '  - ' + f ) );
	} else {
		log( 'CHECK B — PASS (positive control flagged, negative + intercepted controls clear)' );
	}

	fs.rmSync( tmpRoot, { recursive: true, force: true } );

	return pass ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const args = process.argv.slice( 2 );
	const isJson = args.includes( '--json' );
	const isCheck = args.includes( '--check' );
	const isSelfTest = args.includes( '--self-test' );

	if ( isSelfTest ) {
		process.exit( runSelfTest() );
		return;
	}

	const { findingsA, findingsB, blockCount } = runSurvey();
	const baseline = new Set( loadBaseline().map( findingKey ) );
	const netNewA = findingsA.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const netNewB = findingsB.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const acceptedA = findingsA.filter( ( f ) => baseline.has( findingKey( f ) ) );
	const acceptedB = findingsB.filter( ( f ) => baseline.has( findingKey( f ) ) );

	// ADVISORY-FIRST (2026-08-13) — see file header. Flip either to `true` only
	// after that check's backlog is triaged (fixed or baselined).
	const CHECK_A_BLOCKS_BUILD = false;
	const CHECK_B_BLOCKS_BUILD = false;

	if ( isJson ) {
		process.stdout.write(
			JSON.stringify(
				{
					editorCanvasDesync: { netNew: netNewA, accepted: acceptedA, blocking: CHECK_A_BLOCKS_BUILD },
					invalidKeywordPassthrough: { netNew: netNewB, accepted: acceptedB, blocking: CHECK_B_BLOCKS_BUILD },
					blockCount,
				},
				null,
				2
			) + '\n'
		);
	} else {
		process.stdout.write( `[check-editor-render-parity] surveyed ${ blockCount } blocks.\n\n` );
		printReport( 'CHECK A (editor-canvas desync)', netNewA, acceptedA );
		printReport( 'CHECK B (invalid CSS keyword passthrough)', netNewB, acceptedB );
	}

	if ( isCheck && ( ( CHECK_A_BLOCKS_BUILD && netNewA.length ) || ( CHECK_B_BLOCKS_BUILD && netNewB.length ) ) ) {
		process.exit( 1 );
		return;
	}
	process.exit( 0 );
}

main();
