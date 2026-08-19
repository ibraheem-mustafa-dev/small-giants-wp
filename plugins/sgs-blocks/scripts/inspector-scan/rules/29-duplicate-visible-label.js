'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md §5 (canonical-assignment +
// banned-lookalike table) + Part A5 (nested ToolsPanel double-title) source=file evidence=live-read
// 2026-08-18 of src/components/ResponsiveOverride.js:94-96, src/components/ResponsiveControl.js:
// 133-137, and commit 895aef9b0f410646b22431ba53257558f7f5f876 ("stop 9 controls painting their
// label twice — hideLabelFromVision is a no-op on BoxControl"), which is the proven mechanism this
// rule is built on: verified live against WP 7.0.4's own
// packages/components/src/box-control/index.tsx that `BoxControl` renders its `label` prop
// UNCONDITIONALLY through `<BaseControl.VisualLabel>` — there is no `hideLabelFromVision` branch in
// that component at all, so passing the prop is a silent no-op, not a suppression.
//
// WHY THIS RULE EXISTS, and why it is TWO detections in one file, not two rules.
//
// Both detections answer the same client-facing question — "does the operator read the identical
// label text painted twice in a row?" — via two structurally distinct mechanisms this repo actually
// uses, and no existing rule sees either:
//
//   KIND 1 — responsive-wrapper double-paint. `ResponsiveOverride` (:94-96) and `ResponsiveControl`
//   (:133-137) each unconditionally render their own `label` prop as a visible
//   `<span className="…__label">`. When the control nested inside also renders the SAME text as its
//   own `label` — either because the call site forgot `hideLabelFromVision`, or because the inner
//   control is `BoxControl` (which ignores that prop regardless) — the operator sees the label
//   twice, once in sentence case (the wrapper's span) and once in WP's uppercase `BaseControl`
//   styling (the inner control's own label).
//
//   KIND 2 — nested-panel double-title. A native `<ToolsPanel label="X">` rendered directly inside a
//   `<PanelBody title="X">` with the SAME title paints "X" as the panel's `<h2>` and immediately
//   again as the ToolsPanel's own heading. Spec 35 Part A5 names this defect class; commit
//   `4a859e42` (2026-08-14) fixed 5 instances of it by adding `className="sgs-nested-tools-panel"`
//   (paired with a CSS rule hiding the inner `<h2>`).
//
// KIND 2 is NOT a widening of rule 28 (fix-durability). Rule 28 asks "did a fix that WAS applied
// survive" — it walks a fixed roster of blocks that already reference the
// `sgs-nested-tools-panel` marker and checks the JS/CSS halves stay paired. It is structurally
// blind to a nested pair that NEVER got the fix applied in the first place, because there is no
// marker for it to find on either side. That is exactly the gap KIND 2 closes here: it flags a
// same-title PanelBody/ToolsPanel nesting that carries NO `sgs-nested-tools-panel` class at all.
// A pair that DOES carry the marker is deliberately treated as already-handled (rule 28 owns its
// ongoing durability) and is never re-flagged here — the two rules partition the same defect class
// by lifecycle stage (never-fixed vs fixed-then-maybe-regressed) rather than overlapping it.
//
// ── KIND 1 MECHANISM, verified against the live tree ──────────────────────────────────────────
//
// `hideLabelFromVision` suppresses the inner paint for EVERY control type this rule has found it on
// EXCEPT `BoxControl` (proven above). So:
//   wrapper label="X" + inner label="X" + inner has hideLabelFromVision, inner NOT BoxControl -> OK
//   wrapper label="X" + inner label="X" + inner has NO hideLabelFromVision                     -> DEFECT
//   wrapper label="X" + inner is BoxControl label="X" (hideLabelFromVision present or absent)   -> DEFECT
// "Same label" also covers the case where wrapper and inner both receive the SAME VARIABLE
// (`label={ label }`) rather than the same string/`__()` literal — this is exactly how the two
// `BooleanResponsiveControl.js` sites (blocks/media, blocks/before-after) pass a shared `label` prop
// into both `<ResponsiveControl>` and the desktop-tier `<ToggleControl>`.
//
// ── CORPUS — why this rule is scope:'global', not 'per-block' ────────────────────────────────────
//
// The 5 live KIND 1 defects and the 3 live KIND 2 defects are NOT confined to `<blocksDir>/<tail>/
// edit.js`: two of the five KIND 1 sites are `blocks/media/BooleanResponsiveControl.js` and
// `blocks/before-after/BooleanResponsiveControl.js` — files living directly in the block directory
// ROOT, sibling to edit.js, not inside a `components/` subfolder and not edit.js itself. A
// scope:'per-block' rule reading only `<tail>/edit.js` (rules 04/08/14/18/24/30's boundary) would be
// structurally blind to both. This rule instead scans, per block directory: every `.js` file
// directly in the block root (catches edit.js AND block-local helper files like
// BooleanResponsiveControl.js) plus every `.js` file in that block's own `components/` subfolder
// (mirrors rule 26's Root 1) — then adds `ctx.componentsDir/*.js` (the shared `src/components/`
// barrel where `ResponsiveBoxControl.js`/`ResponsiveBoxControls.js`/`TypographyControls.js` live —
// reachable per the 0.5 plumbing note in run.js) and `ctx.extensionsDir/*.js` (mirrors rule 26's
// Root 2). This is the exact corpus a full-tree AST census (independent script, `@babel/parser` +
// `@babel/traverse` run directly against `src/blocks/**/*.js` + `src/components/**/*.js`, no
// recursion past one `components/` level in either root — verified empty one level deeper, e.g.
// `src/components/primitives/`, `IconPicker/`, `colour-picker/`, `gradient-picker/`, and every
// per-block subfolder other than `components/`) was cross-checked against before writing this file.
//
// ── POPULATION — predicted BEFORE the first live run, per rules.json _meta.zeroIsAClaim ──────────
//
// KIND 1 predicted: 5 — `blocks/button/edit.js` :642 ("Icon size (px)"), :789 ("Line height"), :832
// ("Letter spacing (px)") — all three a `ResponsiveOverride` wrapper + inner control sharing the
// identical `__()` string with NO `hideLabelFromVision`; `blocks/media/BooleanResponsiveControl.js`
// :87/:91 and `blocks/before-after/BooleanResponsiveControl.js` :87/:91 — both a `ResponsiveControl`
// wrapper + the desktop-tier `ToggleControl` sharing the SAME `label` variable, again no suppression
// prop. Zero live `BoxControl`-under-suppression sites were predicted, because commit `895aef9b`
// already removed the wrapper `label` at every one of the 9 sites that commit touched (verified live
// at `components/ResponsiveBoxControl.js:159-163` and `components/ResponsiveBoxControls.js:94-107` —
// neither `ResponsiveOverride`/`ResponsiveControl` call wrapping a `BoxControl` branch passes a
// wrapper `label` any more, so KIND 1's "wrapper has a label" precondition never fires there).
//
// KIND 2 predicted: 3 — of the 8 same-title `PanelBody`>`ToolsPanel` nestings tree-wide (a number
// independently confirmed by the AST census below), 5 already carry `sgs-nested-tools-panel`
// (`label`/`option-picker`/`quote`/`testimonial`×2 — the exact 5-block "pass" roster rule 28's own
// header declares) and are excluded by design (see the rule-28 partition note above); the remaining
// 3 never received the fix at all: `blocks/image-sequence/edit.js` :404/:414 ("Responsive frame
// sources"), `blocks/product-card/edit.js` :1787/:1845 ("CTA Button Style") and :2054/:2064
// ("Picker style").
//
// MEASURED (independent census, `@babel/parser`+`@babel/traverse` walking `src/blocks/**/*.js` +
// `src/components/**/*.js` directly, not this rule's own code): KIND 1 = 5/5 exact match, 0 extra,
// 0 missing. KIND 2 = 8 total same-title nestings, 3 without the marker (exact match), 5 with it
// (matches rule 28's own "5 pass" roster by name). Both predictions held with no reconciliation
// needed — recorded because rules 26/28/30 in this same file each needed one, and a rule whose first
// live run needs none is still required to state that explicitly rather than let a lucky match read
// as "no work was done here" (Bean-locked `_meta.zeroIsAClaim` intent, generalised to "any
// suspiciously clean match").
//
// ── BLIND SPOTS (declared, not fixed here) ────────────────────────────────────────────────────────
//   - KIND 1's "same label" match is per-string/per-variable-name equality, not semantic — two
//     labels that read identically to an operator but are built from different i18n calls or string
//     concatenation would not match. Not observed live; declared as a known gap.
//   - KIND 1 does not walk INTO a child component the wrapper renders (e.g. a bespoke row component
//     imported and used as the render-prop child) — only JSX elements written literally inside the
//     render-prop arrow body in the SAME file are inspected. A wrapper whose child control lives in
//     yet another imported file is invisible, same class of gap rule 14's own header documents for
//     MediaUpload/MediaGalleryPicker.
//   - KIND 2 only checks a `ToolsPanel` that is a DIRECT descendant of the `PanelBody` carrying the
//     matching title (via `findParent`, same technique rule 30 uses for its `ResponsiveOverride`
//     ancestor search) — a same-title `ToolsPanel` reached through an intermediate component is
//     invisible. Not observed live in the 8-pair census; declared as a known gap.
//   - Neither KIND recurses more than one directory level past `blocksDir/*` or `componentsDir` (see
//     the CORPUS note above) — verified empty at that depth for this repo today, but a future file
//     added two levels deep would be invisible without widening `corpusFiles()`.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

const WRAPPERS = new Set( [ 'ResponsiveOverride', 'ResponsiveControl' ] );

function jsxName( node ) {
	if ( ! node ) return null;
	if ( node.type === 'JSXIdentifier' ) return node.name;
	if ( node.type === 'JSXMemberExpression' ) return jsxName( node.property );
	return null;
}

function findAttr( attributes, key ) {
	return attributes.find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === key
	);
}

/** A stable identity for "what text does this label attribute paint" — a string
 *  literal, an `__()` call's literal argument, or (for the wrapper/inner-share-a-
 *  variable shape) the bare identifier name. Anything else is deliberately not
 *  matched (see the declared blind spot above) rather than risk a false positive
 *  from guessing at an unresolved expression's runtime value. */
function labelIdentity( attr ) {
	if ( ! attr || ! attr.value ) return null;
	const v = attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value;
	if ( ! v ) return null;
	if ( v.type === 'StringLiteral' ) return 'STR:' + v.value;
	if (
		v.type === 'CallExpression' &&
		v.callee &&
		v.callee.type === 'Identifier' &&
		v.callee.name === '__' &&
		v.arguments[ 0 ] &&
		v.arguments[ 0 ].type === 'StringLiteral'
	) {
		return 'STR:' + v.arguments[ 0 ].value;
	}
	if ( v.type === 'Identifier' ) return 'VAR:' + v.name;
	return null;
}

/** Files this rule owns: per-block root .js (edit.js + block-local helper files
 *  like BooleanResponsiveControl.js) + per-block components/*.js + the shared
 *  componentsDir + extensionsDir. Mirrors rule 26's two roots and adds the
 *  block-root level rule 26 does not need (its own defects never lived there). */
function corpusFiles( ctx ) {
	const files = [];

	if ( ctx.blocksDir && fs.existsSync( ctx.blocksDir ) ) {
		for ( const entry of fs.readdirSync( ctx.blocksDir, { withFileTypes: true } ) ) {
			if ( ! entry.isDirectory() ) continue;
			const blockDir = path.join( ctx.blocksDir, entry.name );

			for ( const f of fs.readdirSync( blockDir, { withFileTypes: true } ) ) {
				if ( f.isFile() && f.name.endsWith( '.js' ) ) {
					files.push( path.join( blockDir, f.name ) );
				}
			}

			const compDir = path.join( blockDir, 'components' );
			if ( fs.existsSync( compDir ) ) {
				for ( const f of fs.readdirSync( compDir ) ) {
					if ( f.endsWith( '.js' ) ) files.push( path.join( compDir, f ) );
				}
			}
		}
	}

	if ( ctx.componentsDir && fs.existsSync( ctx.componentsDir ) ) {
		for ( const f of fs.readdirSync( ctx.componentsDir ) ) {
			if ( f.endsWith( '.js' ) ) files.push( path.join( ctx.componentsDir, f ) );
		}
	}

	if ( ctx.extensionsDir && fs.existsSync( ctx.extensionsDir ) ) {
		for ( const f of fs.readdirSync( ctx.extensionsDir ) ) {
			if ( f.endsWith( '.js' ) ) files.push( path.join( ctx.extensionsDir, f ) );
		}
	}

	return files;
}

function detectKind1( file, ast, findings, ruleId ) {
	const { default: traverse } = require( '@babel/traverse' );
	traverse( ast, {
		JSXElement( p ) {
			const opening = p.node.openingElement;
			const name = jsxName( opening.name );
			if ( ! WRAPPERS.has( name ) ) return;

			const wrapperLabelAttr = findAttr( opening.attributes, 'label' );
			const wrapperKey = labelIdentity( wrapperLabelAttr );
			if ( ! wrapperKey ) return; // no wrapper label -> nothing to double-paint

			let arrow = null;
			for ( const child of p.node.children || [] ) {
				if (
					child.type === 'JSXExpressionContainer' &&
					child.expression &&
					( child.expression.type === 'ArrowFunctionExpression' ||
						child.expression.type === 'FunctionExpression' )
				) {
					arrow = child.expression;
					break;
				}
			}
			if ( ! arrow ) return;

			traverse(
				arrow.body,
				{
					noScope: true,
					JSXOpeningElement( ip ) {
						const innerName = jsxName( ip.node.name );
						if ( WRAPPERS.has( innerName ) ) return; // a nested wrapper, not the control

						const innerLabelAttr = findAttr( ip.node.attributes, 'label' );
						const innerKey = labelIdentity( innerLabelAttr );
						if ( ! innerKey || innerKey !== wrapperKey ) return;

						const hasHide = !! findAttr( ip.node.attributes, 'hideLabelFromVision' );
						const isBoxControl = innerName === 'BoxControl';
						if ( hasHide && ! isBoxControl ) return; // suppressed, and the suppression works

						const line = ip.node.loc ? ip.node.loc.start.line : 0;
						findings.push(
							makeFinding( {
								rule: ruleId,
								file,
								line,
								severity: 'warn',
								detail:
									`${ file }:${ line } — <${ name }> and its nested <${ innerName }> both ` +
									`render the same visible label` +
									( isBoxControl
										? ' (BoxControl ignores hideLabelFromVision — core has no such branch, ' +
											'proven live against WP 7.0.4 packages/components/src/box-control/index.tsx)'
										: ' with no hideLabelFromVision on the inner control' ) +
									', so the operator reads it twice.',
								fix: isBoxControl
									? 'Remove the label prop from the wrapper (<' + name + '>) — keep BoxControl\'s ' +
										'own label, since that is the one BaseControl associates with the inputs ' +
										'(mirrors the fix already applied at components/ResponsiveBoxControl.js:159-163 ' +
										'and components/ResponsiveBoxControls.js:94-107).'
									: 'Add hideLabelFromVision to the inner control, OR remove the label prop from ' +
										'the wrapper (<' + name + '>) if the wrapper\'s own label is the one that ' +
										'should stay visible — pick one, not both.',
								keyParts: [ 'kind1', name, innerName, String( line ) ],
							} )
						);
					},
				},
				p.scope,
				p,
				p.parentPath
			);
		},
	} );
}

function detectKind2( file, ast, findings, ruleId ) {
	const { default: traverse } = require( '@babel/traverse' );
	traverse( ast, {
		JSXOpeningElement( p ) {
			const name = jsxName( p.node.name );
			if ( name !== 'ToolsPanel' ) return;

			const labelAttr = findAttr( p.node.attributes, 'label' );
			const labelKey = labelIdentity( labelAttr );
			if ( ! labelKey ) return;

			const panelParent = p.parentPath
				? p.parentPath.findParent(
						( pp ) => pp.isJSXElement() && jsxName( pp.node.openingElement.name ) === 'PanelBody'
				  )
				: null;
			if ( ! panelParent ) return;

			const titleAttr = findAttr( panelParent.node.openingElement.attributes, 'title' );
			const titleKey = labelIdentity( titleAttr );
			if ( ! titleKey || titleKey !== labelKey ) return;

			// Already fixed-and-durability-guarded by rule 28 — do not re-flag.
			const classAttr = findAttr( p.node.attributes, 'className' );
			if ( classAttr && classAttr.value ) {
				const v = classAttr.value;
				const raw =
					v.type === 'StringLiteral'
						? v.value
						: v.type === 'JSXExpressionContainer' && v.expression.type === 'StringLiteral'
							? v.expression.value
							: null;
				if ( raw && raw.includes( 'sgs-nested-tools-panel' ) ) return;
			}

			const panelLine = panelParent.node.loc ? panelParent.node.loc.start.line : 0;
			const toolsLine = p.node.loc ? p.node.loc.start.line : 0;

			findings.push(
				makeFinding( {
					rule: ruleId,
					file,
					line: toolsLine,
					severity: 'warn',
					detail:
						`${ file }:${ panelLine }/${ toolsLine } — <PanelBody title="…"> and its nested ` +
						`<ToolsPanel label="…"> render the identical title, painting it twice ` +
						`(Spec 35 Part A5).`,
					fix:
						'Add className="sgs-nested-tools-panel" to the ToolsPanel and pair it with a CSS ' +
						'rule in this block\'s editor.css hiding the inner <h2> (mirrors the fix already ' +
						'shipped at label/option-picker/quote/testimonial\'s equivalent panels, commit ' +
						'4a859e42) — OR give the ToolsPanel its own distinct label if it genuinely covers ' +
						'a narrower scope than the PanelBody title suggests. Once fixed, rule 28 ' +
						'(fix-durability) guards the pairing from silently regressing.',
					keyParts: [ 'kind2', String( panelLine ), String( toolsLine ) ],
				} )
			);
		},
	} );
}

module.exports = {
	id: '29-duplicate-visible-label',
	checklistItem: 29,
	title:
		'No control paints the same visible label twice — neither a responsive wrapper double-' +
		'painting its nested control\'s label (§5), nor a nested ToolsPanel repeating its parent ' +
		'PanelBody\'s title (Part A5)',
	scope: 'global',
	needs: [ 'ast:blocks-tree', 'ast:components', 'ast:extensions' ],
	run( ctx ) {
		const ruleId = this.id;
		const findings = [];
		for ( const file of corpusFiles( ctx ) ) {
			const parsed = ctx.cache.parse( file );
			if ( ! parsed.ok ) continue; // surfaced by the scanner's own parseErrorFindings channel
			detectKind1( file, parsed.ast, findings, ruleId );
			detectKind2( file, parsed.ast, findings, ruleId );
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/29-duplicate-visible-label',
		mustFlag: [
			'kind1-no-suppression',
			'kind1-boxcontrol-with-suppression',
			'kind1-shared-variable',
			'kind2-no-marker',
		],
		mustNotFlag: [
			'kind1-suppressed-non-boxcontrol',
			'kind1-different-labels',
			'kind1-no-wrapper',
			'kind2-with-marker',
			'kind2-different-titles',
		],
	},
};
