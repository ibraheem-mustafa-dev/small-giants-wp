'use strict';

// GROUND-TRUTH: spec=.claude/scratch/2026-08-27-c16-spacing-presets-design.md (the C16
// spacing-presets design) + src/components/SgsBoxControl.js's own file header ("Default
// OFF (`presets = false`) ... Pilot: `sgs/container` only ... per Bean's design-gate
// sign-off") source=file evidence=live-read src/blocks/container/edit.js:613,635,714
// (the only 3 mounts in the tree that already carry `presets`).
//
// WHY THIS RULE EXISTS. `presets` is a generic, zero-ripple opt-in flag threaded through
// `<ResponsiveBoxControl>` -> `SgsBoxControl` (forwarded opaquely, see
// ResponsiveBoxControl.js:149/168). The pilot proved the shape on one block; this rule is
// the census half of rolling it out to every other mount, per THE-MIGRATION-METHOD.md's
// "detector before the 4th file edit" rule — there are 47+ target mounts, not 3.
//
// SCOPE IS DELIBERATELY NARROW: does this JSX element have a truthy `presets` attribute,
// nothing more. No box_family classification happens here — that lookup (needed to decide
// FULL scale vs the border-width-restricted `['XXS','XS','S']` subset) lives in the
// migration script (`migrate-box-control-presets.py`), which is DB-backed. Keeping this
// rule DB-free means it can run with zero external dependencies, same as every other rule
// in this directory.
//
// THE NAME COLLISION THIS RULE MUST NOT FALL INTO: `<ResponsiveBoxControls>` (plural) is a
// SEPARATE, unrelated component (`src/components/ResponsiveBoxControls.js`) mounted by
// `gallery`/`site-footer-row`/`site-header-row`. A substring match on
// "ResponsiveBoxControl" would wrongly catch all three. This rule matches the JSX name
// EXACTLY, the same discipline rule 30 uses for `BoxControl` vs `BoxControl`-alikes.
//
// EXPECTED POPULATION, stated before the first live run, by a method independent of this
// rule's own code: `grep -rlE "<ResponsiveBoxControl([^A-Za-z]|$)" */edit.js` inside
// `src/blocks/` returns 48 files (includes `sgs/container`, which is already migrated and
// should therefore report ZERO findings), for 104 total mounts tree-wide. `sgs/container`
// carries exactly 3 mounts (padding/margin/border-width), all three already declaring
// `presets` — so the live count of MOUNTS missing `presets` should be 104 - 3 = 101 across
// 47 blocks (48 files minus container). This is a mount-count, not a block-count: several
// blocks (e.g. `hero`) mount `<ResponsiveBoxControl>` more than once.
//
// ── BLIND SPOTS (declared, not fixed here) ──────────────────────────────────────────────
//   - Per-block `scope:'per-block'` reads only `<blocksDir>/<tail>/edit.js`, same boundary
//     as rules 24/30 — a `<ResponsiveBoxControl>` mounted from a block's own local
//     `components/` subfolder (there are none known at authoring time) would be invisible.
//   - A dynamically-computed JSX tag name is invisible, same limitation as every other
//     `jsxName()`-based rule in this directory (only resolves a literal `JSXIdentifier`/
//     `JSXMemberExpression`).

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

/**
 * A `presets` JSX attribute is "truthy" for this rule's purposes when it is:
 *   - bare shorthand (`presets`, no value) — treated as `presets={true}`
 *   - `presets={true}`
 *   - `presets={ [ 'XXS', ... ] }` — any non-empty array literal
 * and NOT truthy when it is absent, `presets={false}`, or any other falsy literal.
 * This mirrors SgsBoxControl.js's own `Array.isArray(presets) || presets === true` gate —
 * see its `hasPresets` line — so the rule and the runtime agree on what "on" means.
 */
function presetsAttrIsTruthy( attr ) {
	if ( ! attr.value ) return true; // bare shorthand `presets`
	if ( attr.value.type !== 'JSXExpressionContainer' ) return false;
	const expr = attr.value.expression;
	if ( ! expr ) return false;
	if ( expr.type === 'BooleanLiteral' ) return expr.value === true;
	if ( expr.type === 'ArrayExpression' ) return expr.elements.length > 0;
	// Anything else (identifier, member expression, ternary, etc.) — cannot prove it's
	// falsy statically, so do not flag a false positive. This rule only needs to catch
	// the ABSENT / explicitly-false case; an unusual truthy-looking expression is not
	// this rule's job to second-guess.
	return true;
}

module.exports = {
	id: '36-box-control-presets-missing',
	checklistItem: null,
	title:
		'A <ResponsiveBoxControl> mount has no truthy `presets` prop — the C16 spacing-preset ' +
		'dropdown rollout has not reached this control yet',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		// See 04/24/30's identical comment: `this.id` is not usable inside a nested Babel
		// visitor callback (Babel invokes visitor methods as plain functions, so `this`
		// resolves to the Node.js global object there) — captured here instead.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];
		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( name !== 'ResponsiveBoxControl' ) return; // exact match — NOT the plural sibling

				const presetsAttr = ( node.attributes || [] ).find(
					( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === 'presets'
				);
				if ( presetsAttr && presetsAttrIsTruthy( presetsAttr ) ) return;

				const line = node.loc ? node.loc.start.line : 0;

				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'informational',
						detail:
							`${ editFile }:${ line } — this <ResponsiveBoxControl> mount has no truthy ` +
							'`presets` prop, so the client sees the plain number+slider row instead of the ' +
							'theme.json spacing-scale dropdown (C16, 2026-08-27).',
						fix:
							'Run `python scripts/migrate-box-control-presets.py --fix --apply` to add the ' +
							'correct `presets` value automatically (full `presets` for a padding/margin ' +
							"mount, the restricted `presets={ [ 'XXS', 'XS', 'S' ] }` for a border-width " +
							'mount — resolved from `block_attributes.box_family`).',
						keyParts: [ 'box-control-presets-missing', String( line ) ],
					} )
				);
			},
		} );
		if ( ! ok ) return []; // parse-error is its own first-class finding via core/sources.js cache
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/36-box-control-presets-missing',
		mustFlag: [ 'no-presets-prop' ],
		mustNotFlag: [ 'presets-true', 'presets-array' ],
	},
};
