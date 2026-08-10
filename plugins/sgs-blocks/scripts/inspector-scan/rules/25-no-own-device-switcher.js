'use strict';

// GROUND-TRUTH: spec=task brief 2026-08-10 (global device toggle regression
// guard) + live read of src/components/ResponsiveControl.js,
// ResponsiveOverride.js, ResponsiveTriStateControl.js,
// src/blocks/extensions/responsive-device-toggle.js and src/components/
// DeviceTabs.js on 2026-08-10. This session replaced ~192 per-control
// Desktop/Tablet/Mobile switcher strips (73 <ResponsiveControl> call sites
// across 32 files) with ONE global toggle docked at the bottom of the
// inspector (`src/blocks/extensions/responsive-device-toggle.js`). The
// per-control <DeviceTabs> render was deleted from all three shared
// components. ResponsiveControl.js's own docblock names this exact rule:
// "⛔ Do NOT re-add a per-control switcher here or in any consumer. That is
// the whole point of the change, and `inspector-scan` rule 25 exists to
// catch it." This file is that rule.
//
// ── WHAT COUNTS AS "A BLOCK'S OWN DEVICE SWITCHER" ───────────────────────
// Three independent signals, any one of which is sufficient:
//
//   (A) A literal <DeviceTabs> JSX element rendered directly inside a
//       block's own edit.js. DeviceTabs itself is not banned — it is a
//       presentational shell still exported from src/components/index.js —
//       but a BLOCK reaching for it directly (rather than through
//       ResponsiveControl/ResponsiveOverride/ResponsiveTriStateControl,
//       none of which render it any more) reintroduces exactly the strip
//       that was deleted.
//
//   (B) A hand-rolled ButtonGroup or ToggleGroupControl whose set of
//       tier-shaped literal values is EXACTLY {desktop, tablet, mobile} —
//       no more, no fewer. This is a mechanism check, not a name check:
//       nav-menu's real burger-breakpoint ToggleGroupControl uses values
//       {always, tablet, mobile, custom} (edit.js:587-625) — it is a
//       breakpoint-VALUE picker for a single scalar attribute
//       (`collapsePoint`), not a tier switcher, and its value set is a
//       DIFFERENT set (missing "desktop", carrying two extra values) — so
//       it is exempted by shape, not by a hardcoded slug/name exclusion.
//       A control offering only two of the three tiers (responsive-logo's
//       "switch on mobile / on tablet & below" SelectControl, a genuine
//       2-way mode picker, not a 3-tier switcher) is exempted the same way.
//
//   (C) `useState('desktop')` whose setter is later invoked elsewhere in
//       the same file with both 'tablet' and 'mobile' literal arguments —
//       the classic hand-rolled local-tier-state shape ResponsiveOverride's
//       own comment names as "held its own `useState('desktop')`, so its
//       strip and every downstream feature only worked in that file"
//       (ResponsiveOverride.js:54). A bare `useState('desktop')` with no
//       tablet/mobile setter calls anywhere (e.g. an unrelated tab default)
//       is NOT flagged — the AND-guard exists specifically to avoid that
//       false positive; see the usestate-desktop-unrelated fixture.
//
// ── SCOPE BOUNDARY (declared, not an oversight) ──────────────────────────
// scope:'per-block' reads only src/blocks/*/edit.js, same boundary as rules
// 04/08/18/21/24. `core/roster.js` only admits a directory containing a
// block.json into the roster, so `src/blocks/extensions/` — which holds the
// GLOBAL toggle this session built — has no block.json and is structurally
// invisible to this rule by construction (run.js:32-42 documents this as a
// named separate surface, reachable only via ctx.extensionsDir, which this
// rule does not read). That is correct: the global toggle is the intended
// replacement mechanism, not a violation to catch.
// A shared component OTHER than the three canonical wrappers (a bespoke
// src/components/*.js file some future block might add) is out of scope the
// same way rule 24 documents for GradientOverlayControl.js — this rule only
// reads each block's own edit.js text, never a shared component file.
//
// ── EXPECTED POPULATION, stated BEFORE trusting a live run (rules.json
// _meta.zeroIsAClaim) ──────────────────────────────────────────────────────
// Method: independent of this rule's own AST-walking code — plain-text grep
// over src/blocks/*/edit.js (not this file, not Babel, not the scanner's
// cache), run live 2026-08-10, immediately after the switcher-deletion
// commit:
//   grep -rn "<DeviceTabs"                         src/blocks/*/edit.js -> 0 hits
//   grep -rln "ButtonGroup"                         src/blocks/*/edit.js -> 2 hits
//     (media/edit.js — "Select media type" image/video/svg, unrelated;
//      nav-menu/edit.js — no <ButtonGroup> element, only the exempted
//      burger-breakpoint ToggleGroupControl described above)
//   grep -rn "useState(\s*['\"]desktop"             src/blocks/*/edit.js -> 0 hits
// EXPECTED POPULATION: 0 findings tree-wide.
// This is a ROUND, SMALL number and is NOT trusted on its own — per
// zeroIsAClaim point (2) it is treated as a red flag, not a free pass. Two
// things corroborate it rather than assume it: (1) this rule is being
// added in the SAME session, immediately after the deletion commit that
// removed every existing instance — the class this rule targets was
// created and destroyed in one sitting, so a live population of exactly 0
// is the expected shape of "the fix landed clean", not a sign the rule is
// blind; (2) the rule was PROVEN able to flag real code by temporarily
// planting a real <DeviceTabs> render inside a real block's edit.js,
// confirming `--json` reported it, reverting, and confirming both the git
// diff and a second live run were clean — recorded in the build report
// (task close), not cached here so it cannot silently drift.
//
// FAILS TOWARD A FINDING, NEVER TOWARD SILENCE (the principle rules 21/23
// document): if the AST walk cannot parse a file, that is already a
// first-class parse-error finding via core/sources.js; this rule does not
// swallow that case into a clean result.

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

const EXACT_SWITCHER_SET = [ 'desktop', 'tablet', 'mobile' ].sort().join( ',' );

function setEquals( set, sortedTarget ) {
	return [ ...set ].sort().join( ',' ) === sortedTarget;
}

/**
 * Collect the OPTION VALUES a ButtonGroup/ToggleGroupControl offers.
 *
 * ⛔ TWO GAPS THIS FIXES, both found by an adversarial reviewer and then
 * reproduced against real code before the fix was written.
 *
 * GAP 1 — FALSE NEGATIVE, and it missed this rule's own reference idiom.
 * The first version called `elPath.traverse()` and collected any StringLiteral
 * inside the JSX subtree. But the canonical way to build these options — the
 * way `responsive-device-toggle.js` ITSELF does it — is to map over an array
 * declared OUTSIDE the JSX:
 *     const DEVICES = [ { value: 'Desktop' }, … ];
 *     …
 *     { DEVICES.map( ( d ) => <Option value={ d.value } /> ) }
 * Those literals live in a top-level declaration the subtree walk never
 * reaches, so the value set came back empty and nothing was flagged. VERIFIED:
 * planting exactly that shape in a real block produced 0 findings. A rule that
 * cannot see its own exemplar's idiom is enforcement theatre.
 *
 * GAP 2 — FALSE POSITIVE, from a closed vocabulary.
 * The first version filtered literals through a fixed 5-word
 * TIER_WORD_UNIVERSE {desktop,tablet,mobile,always,custom}. Any genuine
 * multi-value picker using an UNANTICIPATED word (print, auto, wide…) would
 * have that word silently dropped, leaving exactly {desktop,tablet,mobile}
 * behind — a false exact match on a control that is not a tier switch at all.
 * The docblock's "exempted by shape, not a slug list" was therefore only true
 * for words someone had already thought of.
 *
 * THE FIX for both: collect from `value` POSITIONS with NO vocabulary filter,
 * and follow `.map()` into the resolved array. Every option value now counts,
 * so an extra value of ANY word breaks the exact-match test (nav-menu's
 * {always,tablet,mobile,custom} still fails it, now for a structural reason
 * rather than because someone pre-listed its words), and mapped arrays are
 * reached.
 *
 * @param {Object} elPath Babel path for the JSX element.
 * @return {Set<string>} Lower-cased option values the control offers.
 */
function collectOptionValues( elPath ) {
	const values = new Set();

	const addFrom = ( node ) => {
		if ( node && node.type === 'StringLiteral' ) {
			values.add( String( node.value ).toLowerCase() );
		}
	};

	// ⚠ FOUR PRECISE SOURCES, not "every literal minus an exclusion list".
	//
	// A broad sweep was tried first and is WRONG: the buttongroup-trio idiom
	// writes `variant={ tier === 'desktop' ? 'primary' : 'secondary' }`, so a
	// collect-everything walk picks up 'primary' and 'secondary' too. The set
	// becomes five words, the exact-match test fails, and a REAL switcher goes
	// unflagged. The fixture caught that regression.
	//
	// None of the four sources below consults a list of expected value WORDS —
	// that is what keeps gap 2 (the closed vocabulary) fixed. They constrain by
	// SYNTACTIC POSITION instead, so an unanticipated 4th value is still
	// collected and still breaks the exact match.

	// (a) `value="desktop"` / `value={ 'desktop' }` written inline.
	elPath.traverse( {
		JSXAttribute( attrPath ) {
			if ( ! attrPath.node.name || attrPath.node.name.name !== 'value' ) return;
			const v = attrPath.node.value;
			if ( ! v ) return;
			if ( v.type === 'StringLiteral' ) addFrom( v );
			else if ( v.type === 'JSXExpressionContainer' ) addFrom( v.expression );
		},
	} );

	// (b) `tier === 'desktop'` — a comparison operand. This is how a ButtonGroup
	//     marks which option is active. Ternary BRANCHES are deliberately not
	//     collected, which is what keeps 'primary'/'secondary' out.
	elPath.traverse( {
		BinaryExpression( binPath ) {
			const op = binPath.node.operator;
			if ( op !== '===' && op !== '==' && op !== '!==' && op !== '!=' ) return;
			addFrom( binPath.node.left );
			addFrom( binPath.node.right );
		},
	} );

	// (c) `setAttributes( { tier: 'desktop' } )` — an object-property value passed
	//     to a call. This is the ButtonGroup's writer half.
	elPath.traverse( {
		CallExpression( callPath ) {
			callPath.node.arguments.forEach( ( arg ) => {
				if ( ! arg || arg.type !== 'ObjectExpression' ) return;
				arg.properties.forEach( ( prop ) => {
					if ( prop.type === 'ObjectProperty' ) addFrom( prop.value );
				} );
			} );
		},
	} );

	// (b) `{ SOME_ARRAY.map( … ) }` — resolve the identifier and read the
	//     `value:` properties of its array literal, wherever it is declared.
	elPath.traverse( {
		CallExpression( callPath ) {
			const callee = callPath.node.callee;
			if (
				! callee ||
				callee.type !== 'MemberExpression' ||
				! callee.property ||
				callee.property.name !== 'map' ||
				! callee.object ||
				callee.object.type !== 'Identifier'
			) {
				return;
			}
			const binding = callPath.scope.getBinding( callee.object.name );
			if ( ! binding || ! binding.path || ! binding.path.node ) return;
			const init = binding.path.node.init;
			if ( ! init || init.type !== 'ArrayExpression' ) return;

			init.elements.forEach( ( el ) => {
				if ( ! el ) return;
				// [ 'desktop', 'tablet', 'mobile' ]
				if ( el.type === 'StringLiteral' ) addFrom( el );
				// [ { value: 'Desktop', … }, … ]
				if ( el.type === 'ObjectExpression' ) {
					el.properties.forEach( ( prop ) => {
						if (
							prop.type === 'ObjectProperty' &&
							prop.key &&
							( prop.key.name === 'value' || prop.key.value === 'value' )
						) {
							addFrom( prop.value );
						}
					} );
				}
			} );
		},
	} );

	return values;
}

module.exports = {
	id: '25-no-own-device-switcher',
	checklistItem: null,
	title:
		'A block must not render its own per-control device switcher — the global toggle ' +
		'(src/blocks/extensions/responsive-device-toggle.js) replaced every per-control strip',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		// `this` is not reliably usable inside a nested Babel visitor callback
		// (Babel invokes visitor methods as plain functions) — captured here
		// instead, matching rules 04/24's identical documented workaround.
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];

		// Signal (C) needs a whole-file view (setter declared in one place,
		// invoked elsewhere), so it is collected across the single traversal
		// below rather than in a second pass — cheaper and keeps the AND-guard
		// logic in one place.
		const desktopStateSetters = new Set(); // setter identifier names
		const setterInvocationArgs = new Map(); // setterName -> Set of string args seen

		const ok = ctx.cache.traverse( editFile, {
			JSXElement( elPath ) {
				const opening = elPath.node.openingElement;
				const name = jsxName( opening );
				if ( ! name ) return;

				// Signal (A) — a literal <DeviceTabs> rendered directly.
				if ( name === 'DeviceTabs' ) {
					const line = opening.loc ? opening.loc.start.line : 0;
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: editFile,
							line,
							severity: 'warn',
							detail:
								`${ editFile }:${ line } — this block renders <DeviceTabs> directly. The per-control ` +
								`device strip was deleted from ResponsiveControl/ResponsiveOverride/` +
								`ResponsiveTriStateControl in favour of ONE global toggle ` +
								`(src/blocks/extensions/responsive-device-toggle.js); a block reaching for the ` +
								`shared DeviceTabs shell itself reintroduces exactly the strip that was removed.`,
							fix:
								'Remove the direct <DeviceTabs> render and drive the tier from the global toggle ' +
								"instead — use <ResponsiveControl> (or ResponsiveOverride / ResponsiveTriStateControl " +
								"for their own value shapes) and let it read core/editor's device type, or read " +
								"getDeviceType() from '@wordpress/editor' directly if no existing wrapper fits.",
							keyParts: [ 'devicetabs-direct', String( line ) ],
						} )
					);
					return; // do not also run the ButtonGroup/ToggleGroupControl check on this element
				}

				// Signal (B) — a hand-rolled ButtonGroup / ToggleGroupControl whose
				// literal value set is EXACTLY the three device tiers.
				if ( name !== 'ButtonGroup' && name !== 'ToggleGroupControl' ) return;

				// Every option value, un-filtered, including ones reached through
				// `.map()` over an array declared elsewhere. See collectOptionValues'
				// header for the two gaps this replaced and how each was reproduced.
				const tierValues = collectOptionValues( elPath );

				if ( setEquals( tierValues, EXACT_SWITCHER_SET ) ) {
					const line = opening.loc ? opening.loc.start.line : 0;
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: editFile,
							line,
							severity: 'warn',
							detail:
								`${ editFile }:${ line } — this <${ name }> offers exactly the three device tiers ` +
								`(desktop / tablet / mobile), which is the hand-rolled shape of a per-control device ` +
								`switcher, not a genuine value picker. Compare nav-menu's burger-breakpoint ` +
								`ToggleGroupControl, which is NOT flagged because its value set is {always, tablet, ` +
								`mobile, custom} — a breakpoint-value picker for one scalar attribute, not a tier ` +
								`switch.`,
							fix:
								'Remove the hand-rolled tier switcher and let the block read its per-tier attribute ' +
								"values from the global toggle's current device type (via <ResponsiveControl> or " +
								"getDeviceType() from '@wordpress/editor'), the same way the other 73 former call " +
								'sites now do.',
							keyParts: [ 'hand-rolled-switcher', name, String( line ) ],
						} )
					);
				}
			},
			CallExpression( callPath ) {
				const node = callPath.node;
				if ( node.callee.type !== 'Identifier' ) return;

				// `const [tier, setTier] = useState('desktop')`
				if (
					node.callee.name === 'useState' &&
					node.arguments.length &&
					node.arguments[ 0 ].type === 'StringLiteral' &&
					node.arguments[ 0 ].value === 'desktop' &&
					callPath.parentPath &&
					callPath.parentPath.node.type === 'VariableDeclarator' &&
					callPath.parentPath.node.id.type === 'ArrayPattern' &&
					callPath.parentPath.node.id.elements.length >= 2 &&
					callPath.parentPath.node.id.elements[ 1 ] &&
					callPath.parentPath.node.id.elements[ 1 ].type === 'Identifier'
				) {
					desktopStateSetters.add( callPath.parentPath.node.id.elements[ 1 ].name );
					return;
				}

				// Any call `someIdentifier('tablet')` / `someIdentifier('mobile')` —
				// recorded against every callee name seen; filtered against the
				// desktop-state setter set once the full file has been walked.
				if ( node.arguments.length === 1 && node.arguments[ 0 ].type === 'StringLiteral' ) {
					const argVal = node.arguments[ 0 ].value;
					if ( argVal === 'tablet' || argVal === 'mobile' ) {
						const calleeName = node.callee.name;
						if ( ! setterInvocationArgs.has( calleeName ) ) {
							setterInvocationArgs.set( calleeName, new Set() );
						}
						setterInvocationArgs.get( calleeName ).add( argVal );
					}
				}
			},
		} );
		if ( ! ok ) return []; // parse-error is its own first-class finding via core/sources.js cache

		// Resolve signal (C) now that the whole file has been walked.
		for ( const setterName of desktopStateSetters ) {
			const seenArgs = setterInvocationArgs.get( setterName );
			if ( seenArgs && seenArgs.has( 'tablet' ) && seenArgs.has( 'mobile' ) ) {
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						severity: 'warn',
						detail:
							`${ editFile } — declares \`useState('desktop')\` and later calls its setter ` +
							`(\`${ setterName }\`) with both 'tablet' and 'mobile' — a hand-rolled local device-tier ` +
							`state, the exact shape ResponsiveOverride.js's own header names as the pre-fix bug ` +
							`("held its own useState('desktop')").`,
						fix:
							"Remove the local tier state and read the block's current tier from the global toggle " +
							"instead — via <ResponsiveControl> or getDeviceType() from '@wordpress/editor'.",
						keyParts: [ 'usestate-desktop-tier', setterName ],
					} )
				);
			}
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/25-no-own-device-switcher',
		mustFlag: [
			'devicetabs-direct',
			'togglegroup-trio',
			'buttongroup-trio',
			'usestate-desktop-tier',
			// Regression guards added 2026-08-10 after a QC council found both
			// gaps and each was reproduced against real code before fixing.
			// Neither failure mode had fixture coverage, so --self-test would
			// have gone green on a reintroduction of either.
			'togglegroup-trio-mapped',
		],
		mustNotFlag: [
			'nav-menu-burger-breakpoint',
			'responsive-logo-switch-mode',
			'image-sequence-uses-responsive-control',
			'unrelated-buttongroup',
			'usestate-desktop-unrelated',
			'fourway-unknown-word',
		],
	},
};
