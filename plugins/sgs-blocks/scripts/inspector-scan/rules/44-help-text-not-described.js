'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART F
// (anti-patterns, "help text not linked via aria-describedby") source=task
// brief 2026-09-04 (Bean-scoped, Task 2c), CONFIRMED LIVE before building —
// evidence=Playwright against the sandybrown canary block editor
// (`sgs/accordion`'s native `<ToggleControl help={...}>` "Allow multiple
// open"): WordPress DOES self-wire `aria-describedby` for its OWN native
// controls built on `useBaseControlProps` (TextControl/ToggleControl/
// SelectControl/etc.) — the rendered DOM showed
// `<input id="inspector-toggle-control-0" aria-describedby=
// "inspector-toggle-control-0__help">` paired with
// `<p id="inspector-toggle-control-0__help">`. That live check gates this
// rule's whole existence per the task brief's stop-and-report condition: had
// it come back FALSE the true scope would have jumped to hundreds of
// controls and needed re-planning, not this build. It came back TRUE, so
// the SCOPE NARROWS to exactly the shape self-wiring cannot reach: a raw
// `<BaseControl help={...}>` MOUNT, wrapping a child that is NOT one of
// WP's own self-wiring native controls (`ColorPalette`, a bare `Button`, a
// repeater — anything hand-composed) — `<BaseControl>` renders the help
// text as a sibling `<p id="...__help">` but, unlike TextControl/
// ToggleControl/etc., does NOT automatically stamp `aria-describedby` onto
// an arbitrary child; that wiring is each self-wiring control's own
// internal `useBaseControlProps()` call, which a raw `<BaseControl>` mount
// never gets for free.
//
// TWO NAMED CANDIDATES CONFIRMED BY READING THE SOURCE (not run through this
// rule in isolation — read directly): `src/components/LinkPopoverControl.js`
// (`LinkPopoverField`, :267) mounts `<BaseControl label={label} help={help}>`
// wrapping a bare `<Button>` + conditional `<LinkPopoverContent>`, with no
// `aria-describedby` anywhere in that subtree. `src/components/
// DesignTokenPicker.js` (:583, the plain-colour branch) mounts the same
// `<BaseControl id={id} label={label} help={help}>` wrapping a raw
// `<ColorPalette>`, again with no `aria-describedby`. The REFERENCE for
// correct wiring is `src/components/GradientCapableColourControl.js`
// (:414) — it does NOT use `<BaseControl>` at all; it builds its own label/
// help/id and manually writes `aria-describedby={ hasStates ? descId :
// undefined }` onto the control it wraps. This rule's job is narrower than
// "does every custom control announce its help text" (that would need a
// live axe pass per control) — it is the STATIC, structural half: "a raw
// BaseControl+help mount with no literal aria-describedby anywhere in its
// subtree, wrapping something that isn't self-wiring".
//
// WHY WHOLE-TREE, NOT per-block. The two confirmed candidates both live in
// `src/components/*.js` — SHARED components, not any one block's own
// edit.js. A per-block scope (reading only `src/blocks/*/edit.js`) would be
// structurally blind to both, the same class of gap rule 24's own header
// documents for `GradientOverlayControl.js`. This rule reads every block's
// `edit.js` (+ any block-local `components/*.js`, mirroring check-empty-
// inspector-containers.js's own collectFiles) AND every shared
// `src/components/*.js` file — using `ctx.blocksDir`/`ctx.componentsDir`
// exactly as run.js's buildCtx already supplies them (never a hardcoded
// real-repo path — the same discipline core/selftest.js documents for
// themeDir/extensionsDir: a rule pointed at a fixed real path can never be
// exercised in isolation).
//
// WHAT COUNTS AS "help present" — deliberately OPTIMISTIC, not literal-only.
// A first draft required `help` to be a literal string or a translation
// call, and it MISSED BOTH confirmed real candidates: LinkPopoverControl.js
// and DesignTokenPicker.js are SHARED components whose `help` prop is a
// pass-through parameter (`help={ help }`, an Identifier reference) — the
// actual text is supplied by each call site, not authored inline in the
// component that needs the fix. Requiring a literal would make this rule
// structurally blind to the exact shape the task brief named. Only a
// SYNTACTICALLY OBVIOUS empty value is treated as "no help" and skipped: an
// empty string literal, a literal `undefined`/`null`, or `false`. Every
// other shape (an Identifier/prop reference, a call, a ternary, a template
// literal) is presumed capable of carrying real text and is analysed —
// optimistic-but-bounded, the mirror image of rule 35/41's "narrow and
// always-right" discipline, chosen here because the cost of a false
// positive (an extra finding worth a two-second human glance) is far lower
// than the cost of staying blind to the two components the brief named.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// WordPress's own BaseControl-driven native controls — each calls
// useBaseControlProps() (or the older equivalent) internally and wires
// aria-describedby to its OWN focusable element for free. A `help` prop on
// one of THESE (mounted directly, not nested inside a raw <BaseControl>) is
// already correctly wired and is not this rule's concern.
const SELF_WIRING_CONTROLS = new Set( [
	'BaseControl',
	'TextControl',
	'TextareaControl',
	'SelectControl',
	'ToggleControl',
	'RangeControl',
	'CheckboxControl',
	'RadioControl',
	'ComboboxControl',
	'SearchControl',
	'UnitControl',
	'__experimentalUnitControl',
	'NumberControl',
	'__experimentalNumberControl',
	'ToggleGroupControl',
	'__experimentalToggleGroupControl',
	'FormTokenField',
	'CustomSelectControl',
	'__experimentalCustomSelectControl',
	'InputControl',
	'__experimentalInputControl',
	'ColorPicker',
] );

/**
 * Does this `help` attribute VALUE node carry (or possibly carry) text? Only
 * a SYNTACTICALLY OBVIOUS empty value is treated as "no help" — see the
 * header's "WHAT COUNTS AS help present" note for why this is deliberately
 * optimistic rather than literal-only.
 */
function helpIsNonEmptyResolvable( attrValue ) {
	if ( ! attrValue ) return false;
	if ( attrValue.type === 'StringLiteral' ) return attrValue.value.trim() !== '';
	if ( attrValue.type !== 'JSXExpressionContainer' ) return false;
	const expr = attrValue.expression;
	if ( ! expr ) return false;
	if ( expr.type === 'StringLiteral' ) return expr.value.trim() !== '';
	if ( expr.type === 'TemplateLiteral' ) {
		return expr.expressions.length > 0 || expr.quasis.some( ( q ) => q.value.raw.trim() !== '' );
	}
	if ( expr.type === 'Identifier' && expr.name === 'undefined' ) return false;
	if ( expr.type === 'NullLiteral' ) return false;
	if ( expr.type === 'BooleanLiteral' && expr.value === false ) return false;
	// Identifier reference / CallExpression / ConditionalExpression /
	// LogicalExpression / MemberExpression, etc. — presumed capable of
	// carrying real text (this is exactly the LinkPopoverControl.js /
	// DesignTokenPicker.js shape: `help={ help }`, a pass-through parameter).
	return true;
}

function findJsxAttr( openingElement, name ) {
	for ( const attr of openingElement.attributes || [] ) {
		if ( attr.type === 'JSXAttribute' && attr.name && attr.name.name === name ) return attr;
	}
	return null;
}

/**
 * Walk a JSXElement's whole subtree (the element itself included) looking
 * for (a) any child JSX COMPONENT (capitalised tag) that is NOT in the
 * self-wiring allowlist and is not the BaseControl root itself, and (b) any
 * literal `aria-describedby` JSXAttribute anywhere in the subtree.
 */
function analyseSubtree( rootNode ) {
	let hasNonSelfWiringChild = false;
	let hasAriaDescribedby = false;
	const seen = new Set();
	const walk = ( n ) => {
		if ( ! n || typeof n !== 'object' ) return;
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( seen.has( n ) ) return;
		seen.add( n );
		if ( n.type === 'JSXAttribute' && n.name ) {
			const attrName = n.name.type === 'JSXIdentifier' ? n.name.name : null;
			if ( attrName === 'aria-describedby' ) hasAriaDescribedby = true;
		}
		if ( n.type === 'JSXOpeningElement' ) {
			const nameNode = n.name;
			const name = nameNode && nameNode.type === 'JSXIdentifier' ? nameNode.name : null;
			if ( name && /^[A-Z]/.test( name ) && ! SELF_WIRING_CONTROLS.has( name ) ) {
				hasNonSelfWiringChild = true;
			}
		}
		for ( const key of Object.keys( n ) ) {
			if ( [ 'loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments' ].includes( key ) ) continue;
			walk( n[ key ] );
		}
	};
	walk( rootNode );
	return { hasNonSelfWiringChild, hasAriaDescribedby };
}

/**
 * Every editor-side source file worth scanning: each block's own edit.js
 * (+ that block's own local components/ subfolder, if any) plus every
 * shared src/components/*.js file. Mirrors check-empty-inspector-
 * containers.js's collectFiles(), adapted to read from ctx (never a
 * hardcoded real-repo path — see this file's header).
 */
function collectFiles( ctx ) {
	const out = [];
	if ( fs.existsSync( ctx.blocksDir ) ) {
		for ( const dir of fs.readdirSync( ctx.blocksDir ) ) {
			const full = path.join( ctx.blocksDir, dir );
			if ( ! fs.statSync( full ).isDirectory() ) continue;
			const edit = path.join( full, 'edit.js' );
			if ( fs.existsSync( edit ) ) out.push( edit );
			const comps = path.join( full, 'components' );
			if ( fs.existsSync( comps ) ) {
				for ( const f of fs.readdirSync( comps ) ) {
					if ( f.endsWith( '.js' ) ) out.push( path.join( comps, f ) );
				}
			}
		}
	}
	if ( ctx.componentsDir && fs.existsSync( ctx.componentsDir ) ) {
		for ( const f of fs.readdirSync( ctx.componentsDir ) ) {
			if ( f.endsWith( '.js' ) ) out.push( path.join( ctx.componentsDir, f ) );
		}
	}
	return out.sort();
}

module.exports = {
	id: '44-help-text-not-described',
	checklistItem: null,
	title:
		'A raw <BaseControl help={...}> mount wrapping a non-self-wiring child must carry aria-describedby ' +
		'itself (Spec 35 PART F) — WordPress only self-wires it for native useBaseControlProps controls',
	needs: [ 'ast' ],
	run( ctx ) {
		const ruleId = this.id;
		const files = collectFiles( ctx );
		const findings = [];

		for ( const file of files ) {
			const parsed = ctx.cache.parse( file );
			if ( ! parsed.ok ) continue;

			const ok = ctx.cache.traverse( file, {
				JSXElement( nodePath ) {
					const node = nodePath.node;
					if ( node.openingElement.selfClosing ) return;
					const nameNode = node.openingElement.name;
					const name = nameNode && nameNode.type === 'JSXIdentifier' ? nameNode.name : null;
					if ( name !== 'BaseControl' ) return;

					const helpAttr = findJsxAttr( node.openingElement, 'help' );
					if ( ! helpAttr || ! helpIsNonEmptyResolvable( helpAttr.value ) ) return;

					const { hasNonSelfWiringChild, hasAriaDescribedby } = analyseSubtree( node );
					if ( ! hasNonSelfWiringChild || hasAriaDescribedby ) return;

					const line = node.loc ? node.loc.start.line : 0;
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: null,
							file,
							line,
							severity: 'warn',
							kind: 'help-text-not-described',
							detail:
								`${ file }:${ line } — a raw <BaseControl help={...}> mount wraps a non-self-wiring child ` +
								'(a bare Button, ColorPalette, or other hand-composed control), but no aria-describedby ' +
								'appears anywhere in its subtree. BaseControl renders the help text as a sibling <p>, but ' +
								'unlike TextControl/ToggleControl/etc. it does NOT auto-wire aria-describedby onto an ' +
								"arbitrary child — that wiring belongs to each native control's own useBaseControlProps() " +
								'call, which this mount never gets. A screen-reader user tabbing to the control never hears ' +
								'the help text.',
							fix:
								'Wire aria-describedby manually onto the focusable child, the way ' +
								'GradientCapableColourControl.js does (a useInstanceId()-derived help id passed as ' +
								'aria-describedby={ helpId } on the control, matching the id BaseControl/your own <p> uses ' +
								'for the help text) — or switch to one of the native self-wiring controls if the shape fits.',
							keyParts: [ 'help-not-described', String( line ) ],
						} )
					);
				},
			} );
			if ( ! ok ) continue;
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/44-help-text-not-described',
		mustFlag: [
			'basecontrol-button-help',
			'basecontrol-colorpalette-help',
			'block-with-basecontrol',
			'basecontrol-conditional-help',
		],
		mustNotFlag: [
			'basecontrol-with-describedby',
			'basecontrol-no-help',
			'basecontrol-only-selfwiring-child',
			'basecontrol-explicit-undefined-help',
		],
	},
};
