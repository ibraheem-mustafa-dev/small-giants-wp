/**
 * CHECK A: editor-canvas desync.
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
 *      attributes`) is read by its KEY name (`foo`) for `declaredAttrs`/
 *      `written` membership, matching this project's "attribute name is the
 *      schema key" convention. FIXED 2026-08-30 (D-pending) — a renamed LOCAL
 *      variable referenced outside InspectorControls IS now matched back to
 *      the key via `collectDestructuredAliases()`, after `sgs/pricing-table`
 *      `pricingTableStyle: style` proved the gap live: `style` is genuinely
 *      read at `edit.js:160` inside the wrapper className, but the finding
 *      loop only ever checked `usedOutsideControls.has('pricingTableStyle')`,
 *      which is never true for a renamed binding — a false positive, not a
 *      real editor-canvas desync.
 *   3. JSX assigned to an intermediate variable before being returned
 *      (`const preview = <div>...</div>; return preview;`) IS still caught —
 *      the JSXElement/JSXFragment scan is file-wide, not anchored to a
 *      literal `return (...)` statement — but a value passed into a CHILD
 *      component as a prop and used in THAT child component's OWN separate
 *      file is invisible (out of scope by design — cross-file JSX tracing is
 *      a different, much larger detector).
 *
 */

'use strict';

const path = require( 'path' );
const { hasServerSideRenderWithAttributes } = require( './lib-a-control-surface' );
const { collectDestructuredAliases, collectDestructuredFromAttributes, collectExcludedRanges, collectSetAttributesWrites, collectUsedIdentifiersOutsideExcluded } = require( './lib-a-destructure' );
const { checkCompanionExemption, checkNoPreviewNoticeExemption, collectSetAttributesGroups } = require( './lib-a-exemptions' );
const { SCRIM_ATTRS, checkLiveDataPlaceholderExemption, declaresScrimSupport } = require( './lib-a-live-data' );
const { NATIVE_SUPPORTS_ATTR_NAMES, readIfExists, safeParse } = require( './lib-blocks' );
const { COMPONENT_FILE_MAP, JSX_TAG_RE } = require( './lib-config' );
const { EDITOR_INVISIBLE_BY_DESIGN } = require( './lib-editor-invisible' );
const { collectDerivedVarMapAll } = require( './lib-php-attrvars' );
const { buildCommentMask, buildStringMask } = require( './lib-php-mask' );
const { attributeIsNonPaintSinkOnly, collectAttrVarMapBroad } = require( './lib-php-usage' );

/**
 * CHECK A driver for one block.
 *
 * @param {string}      blockName           Reporting name, e.g. 'sgs/hero'.
 * @param {string}      dir                 Absolute path to the block directory.
 * @param {Set<string>} declaredAttrs       Attribute names declared in block.json.
 * @param {Set<string>} [providesContextAttrs] Attribute names sourcing a providesContext key (default empty).
 * @return {Array<Object>} Findings.
 */
/**
 * R3-a widening, extracted 2026-09-05 so the self-test can assert it directly.
 *
 * Resolves every capitalised JSX tag in `src` to the file that DEFINES it and
 * folds that component's destructured/written attribute sets into the caller's
 * sets, MUTATING them in place. Behaviour is byte-identical to the inline block
 * this replaced.
 *
 * WHY IT IS A NAMED FUNCTION NOW. The R3-a regression test used to prove the
 * widening worked by asserting `bgSvgContent` appeared in the FINDINGS list —
 * even though its own comment said the findings list was NOT what it was
 * proving ("whether or not it ends up in the findings list depends on exemption
 * signals"). The moment `bgSvgContent` was legitimately FIXED (container now
 * previews it, 2026-09-05), the finding correctly disappeared and the test
 * became unpassable — a positive control that can never pass, on a green gate.
 * That is the shape someone "fixes" by deleting the control, which would lose
 * the only guard proving shared-component attrs are still resolved at all.
 * Exposing the widening lets the test assert RECOGNITION, which is what it
 * always meant to assert and which stays true regardless of whether the
 * attribute is currently a finding.
 *
 * @param {string}      src          edit.js source.
 * @param {Set<string>} destructured Mutated: gains shared components' destructured attrs.
 * @param {Set<string>} written      Mutated: gains shared components' setAttributes writes.
 * @return {{destructured: Set<string>, written: Set<string>}} The same sets, for convenience.
 */
function foldSharedComponentAttrSets( src, destructured, written ) {
	const jsxTagNames = new Set();
	JSX_TAG_RE.lastIndex = 0;
	let tagMatch;
	while ( ( tagMatch = JSX_TAG_RE.exec( src ) ) !== null ) {
		jsxTagNames.add( tagMatch[ 1 ] );
	}
	for ( const tagName of jsxTagNames ) {
		const componentFile = COMPONENT_FILE_MAP.get( tagName );
		if ( ! componentFile ) {
			continue;
		}
		const componentSrc = readIfExists( componentFile );
		if ( ! componentSrc ) {
			continue;
		}
		const componentAst = safeParse( componentSrc );
		if ( componentAst ) {
			for ( const n of collectDestructuredFromAttributes( componentAst ) ) {
				destructured.add( n );
			}
		}
		for ( const n of collectSetAttributesWrites( componentSrc ) ) {
			written.add( n );
		}
	}
	return { destructured, written };
}

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
	const destructuredAliases = collectDestructuredAliases( ast );
	const written = collectSetAttributesWrites( src );
	const excludedRanges = collectExcludedRanges( ast );
	const usedOutsideControls = collectUsedIdentifiersOutsideExcluded( ast, excludedRanges );

	// R3-a: a control can be destructured + written entirely inside a SHARED
	// component file (e.g. `container/components/WidthPanel.js` destructures
	// and setAttributes()-writes `contentWidth`, but edit.js only mounts
	// `<WidthPanel .../>` and never names the attribute itself). Resolve every
	// capitalised JSX tag in edit.js to the file that DEFINES it and fold its
	// destructured/written sets in too, so such an attribute is correctly
	// recognised as a real candidate for this check instead of silently never
	// appearing in `destructured` at all. Deliberately NOT folded into
	// `usedOutsideControls` — a shared component mounted via JSX is always
	// InspectorControls content in the parent, so its own internal usage of
	// the attribute doesn't prove the EDITOR CANVAS shows the attribute's
	// effect (the exact distinction this check exists to make).
	foldSharedComponentAttrSets( src, destructured, written );

	// Exemption-signal plumbing (2026-08-13 refinement — see file header).
	const phpSrc = readIfExists( path.join( dir, 'render.php' ) );
	const phpMask = phpSrc ? buildStringMask( phpSrc ) : null;
	const phpCommentMask = phpSrc ? buildCommentMask( phpSrc ) : null;
	const attrVarMap = phpSrc ? collectAttrVarMapBroad( phpSrc ) : new Map();
	const derivedVarMap = phpSrc ? collectDerivedVarMapAll( phpSrc, attrVarMap ) : new Map();
	const setAttributeGroups = collectSetAttributesGroups( src );
	const noticeExemptSet = checkNoPreviewNoticeExemption( ast, src, declaredAttrs );
	const liveDataPlaceholderExempt = checkLiveDataPlaceholderExemption( phpSrc, src );
	const scrimExempt = declaresScrimSupport( dir );

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
		const alias = destructuredAliases.get( attr );
		if ( alias && usedOutsideControls.has( alias ) ) {
			continue; // renamed destructuring binding read back under its LOCAL name, not the schema key
		}
		if ( phpSrc && attributeIsNonPaintSinkOnly( phpSrc, phpMask, phpCommentMask, attr, attrVarMap, derivedVarMap ) ) {
			continue; // SIGNAL 1 — every render.php consumption site is a non-paint sink
		}
		if ( checkCompanionExemption( attr, setAttributeGroups, usedOutsideControls ) ) {
			continue; // SIGNAL 2 — co-written with a companion attribute already visible in canvas
		}
		if ( noticeExemptSet.has( attr ) ) {
			continue; // SIGNAL 3 — gated by the same branch condition as an explicit no-preview Notice
		}
		if ( liveDataPlaceholderExempt ) {
			continue; // SIGNAL 4 — render.php reaches a live-data function; edit.js self-declares a placeholder
		}
		if ( scrimExempt && SCRIM_ATTRS.has( attr ) ) {
			continue; // SIGNAL 5 — declared supports.sgs.scrim; the scrim paints only while open
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

module.exports = {
	checkEditorCanvasDesync,
	foldSharedComponentAttrSets,
};
