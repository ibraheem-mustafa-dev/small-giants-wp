'use strict';

// GROUND-TRUTH: spec=plugins/sgs-blocks/scripts/consistency/golden-controls.json (written
// 2026-08-19, read live before writing this rule) `controls.colour` — the ONE canonical
// colour-control schema this rule enforces. It states five separate contracts:
//   (a) `nativeUi` — core's own supports.color panel competes with SGS's; detect via
//       block.json `supports.color` sub-flags, never JSX.
//   (b) `bannedLookalikes` — the four raw colour JSX components + `<TextControl type="color">`,
//       ALL at zero live instances as of 2026-08-19 (regression guards, not a backlog).
//   (c) `states` — every colour row carries >= 2 states (normal + hover) by default; the exact
//       required count = 1 + the states DECLARED on the row's matching `supports.sgs.elements.
//       <el>.states` entry (golden-controls.json `controls.colour.states.derivation`).
//   (d) `gradient` — every colour row needs a gradient path unless `supports.sgs.
//       colourExemptions.<rowKey>` names a real, non-boilerplate reason.
//   (e) `scope.nullSurfacesRule` — a block on disk but absent from roster.json gets
//       `surfaces: null`; reading `.colour` off it throws, which SKIPS an advisory rule
//       silently (run.js:189-201). Guard it and emit an INFORMATIONAL finding instead of
//       trusting silence as "clean".
//
// This rule is NOT a duplicate of rule 24 despite overlapping its banned-JSX-component check
// for colour. Rule 24 is `mode:"gate"` at 0 net backlog (rules.json _meta.note: "a widened
// gate's condition reds the build on its first finding with no chance to triage") and is a
// SEPARATE, older detector reading a different, hand-written Set (`RAW_COLOUR_COMPONENT_
// NAMES` + `RAW_LINK_COMPONENT_NAMES` together). This rule's `banned-lookalike` kind exists
// because the golden-colour-control SCHEMA (not rule 24's own Set) is the single contract this
// whole rule enforces end to end — colour rows, native UI, states, gradient AND the lookalike
// ban all read from the same one JSON file, so a future edit to golden-controls.json's
// `bannedLookalikes` list is picked up here without touching rule 24. The two rules are
// deliberately allowed to overlap on this one sub-check, exactly as rule 24 itself overlaps
// rules 04/08 by design (rule 24's own header, :24-32).
//
// ── EXPECTED POPULATION, stated BEFORE trusting a live run (rules.json _meta.zeroIsAClaim) ──
// Every figure below was produced by a method that does NOT run this rule's own code.
//
// (1) native-colour-ui — EXPECTED 26. Method: a standalone Python script reading every
//     `src/blocks/*/block.json` with `json.load` + checking `supports.color.{background,
//     gradients,text,link} is True` (no AST, no Babel, no shared helper). Result: 26 files,
//     matching golden-controls.json's own independently-dated `atLeastOneFlagTrue: 26` exactly
//     — two separate measurements, two separate days, same number.
//
// (2) banned-lookalike — EXPECTED 0. Method: `git grep -c "<ColorPalette" -- 'src/blocks/*/
//     edit.js'` (and the same for ColorGradientControl/GradientPicker/PanelColorGradient
//     Settings/`TextControl` with `type="color"`) — all five return 0 hits tree-wide, run live
//     2026-08-19. A zero here is a CLAIM per _meta.zeroIsAClaim point (2): proven via a
//     mustFlag fixture below, so the rule is provably able to fail.
//
// (3) row-below-minimum-states — EXPECTED ~186 (wide band, stated low-confidence). Method: a
//     standalone Python regex pass over every `src/blocks/*/edit.js` counting (a) every
//     `states: [...]` array literal's `key: '` occurrences as its state count, PLUS (b) every
//     standalone `<DesignTokenPicker ... value={...}>` element with no `states=` prop (the
//     legacy single-value API) counted as 1 state. Pass (a): 227 rows, 176 with <2 states. Pass
//     (b): 10 further single-state legacy rows. Total ~237 rows, ~186 below the 2-state floor.
//     This is a REGEX estimate (bracket/line matching, not AST) and is expected to diverge
//     slightly from the live AST count below — declared low-confidence, not trusted blindly.
//
// (4) row-missing-gradient — EXPECTED ~193. Same two-pass method: 183 (states-array rows with
//     neither `gradientValue` nor `onGradientChange` anywhere in their states block) + 10
//     (legacy single-value rows, which structurally cannot carry a gradient prop at all,
//     confirmed via `git grep -n "gradientValue"` returning zero hits attached directly to any
//     legacy-shape `<DesignTokenPicker value=.../>` tag). No `colourExemptions` entries exist
//     anywhere in the tree today (`git grep -rn "colourExemptions" -- 'src/blocks/*/block.
//     json'` -> 0 hits), so none of this predicted population is expected to be exempted away.
//
// (5) roster-surface-unknown — EXPECTED 0. Method: `core/roster.js`'s own header states
//     roster.json and `src/blocks/` are reconciled 83/83/83 as of the last regen (D543)
//     — every on-disk block has a roster entry, so `surfaces === null` should not occur live.
//     Declared UNTESTABLE via this rule's own self-test (see BLIND SPOTS) — the harness always
//     supplies `surfaces: {}` to a fixture block, never `null` (documented trap, core/
//     selftest.js:118-124), so a mustFlag fixture for this kind cannot exist by construction.
//
// ── BLIND SPOTS (declared, not fixed here) ───────────────────────────────────────────────────
//   - Same per-block-edit.js-text boundary as rules 04/08/18/24/30: a colour control reached
//     indirectly via a block's own local `components/` subfolder, or a shared `src/components/
//     *.js` file, is invisible. `src/components/SgsColourPanel.js`/`GradientOverlayControl.js`
//     themselves are correctly excluded by this same boundary, not by a name exemption.
//   - A `rows` array built as `rows={ colourRows }` where `colourRows` is populated via
//     `const colourRows = []; colourRows.push({...})` calls IS resolved (product-card, nav-menu,
//     social-icons all use exactly this shape per their own D618/D619 header comments — a
//     tree-wide `CallExpression` pre-pass collects every `<ident>.push(<arg>)` call before the
//     main JSX walk, so `rows={ colourRows }` resolves identically to an inline array literal).
//     What remains genuinely invisible: a `.push(...spread)` call, `.push()` with a computed/
//     ternary argument that doesn't reduce to an `ObjectExpression` (a `LogicalExpression`
//     `a && {...}` DOES resolve, via the same `unwrapRowObject` used for inline conditional
//     rows), or a rows array populated some OTHER way than literal/`.push()` (e.g.
//     `.concat()`, spread-merge, `Array.from()`). A `states` array (DesignTokenPicker) built
//     dynamically is the same remaining class of gap — this rule only resolves literal
//     `ArrayExpression`/`ObjectExpression` nodes there, same class of gap as rule 24/30's
//     `jsxName()` "dynamic tag name" blind spot. ⛔ MEASURED, not assumed: a live pre-fix run
//     found 0 rows tree-wide for product-card/nav-menu/social-icons (33 rows missing) purely
//     from the `rows={ colourRows }` gap; the push-collection pre-pass above closed it,
//     confirmed by a live re-run (EXPECTED POPULATION section below carries the POST-fix
//     numbers).
//   - The per-row REQUIRED-states derivation (golden-controls.json `states.derivation`) needs
//     to resolve a row's bound attribute name from its `normal` state's `value` expression back
//     to a `supports.sgs.elements.<el>.attrMap` entry. This rule resolves only a plain
//     `Identifier` (`value={ iconColour }`) or a flat `attributes.x` `MemberExpression`
//     (`value={ attributes.iconColour }`). A nested object-attribute access (`value={
//     asideSeparator?.colour }`) cannot be traced to a top-level `attrMap` value and falls back
//     to the schema's stated floor of 2 (normal+hover) rather than a derived higher minimum —
//     this can only ever UNDER-count the required minimum for that one row, never over-count.
//   - `roster-surface-unknown` cannot be proven live-failing by this rule's own self-test (see
//     EXPECTED POPULATION (5) above) — it is exercised only by the live run, where the current
//     83/83/83 reconciliation makes 0 the expected (and provably reconciled, not merely
//     assumed) result.
//   - `extensions/` is out of scope for the same structural reason as rules 24/30 (`core/
//     roster.js`'s `scanDisk` admits only directories with a `block.json`).

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );
const { hasRealReason } = require( '../core/baseline' );

const RAW_COLOUR_COMPONENT_NAMES = new Set( [
	'ColorPalette',
	'ColorGradientControl',
	'GradientPicker',
	'PanelColorGradientSettings',
] );

const NATIVE_COLOR_SUBFLAGS = [ 'background', 'gradients', 'text', 'link' ];

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

function findJsxAttr( openingElement, name ) {
	return ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === name
	);
}

function jsxAttrExpr( openingElement, name ) {
	const attr = findJsxAttr( openingElement, name );
	if ( ! attr || ! attr.value ) return null;
	if ( attr.value.type === 'JSXExpressionContainer' ) return attr.value.expression;
	return attr.value; // e.g. a plain StringLiteral attribute (type="color")
}

function jsxAttrStringValue( openingElement, name ) {
	const attr = findJsxAttr( openingElement, name );
	if ( ! attr || ! attr.value ) return null;
	if ( attr.value.type === 'StringLiteral' ) return attr.value.value;
	return null;
}

// Resolve a `rows` array element that may be wrapped in a conditional
// (`cond && { ... }`, as trust-bar's icon-circle-shadow row is at edit.js:382)
// down to its underlying ObjectExpression, or null if it isn't one.
function unwrapRowObject( node ) {
	let n = node;
	while ( n && n.type === 'LogicalExpression' ) n = n.right;
	return n && n.type === 'ObjectExpression' ? n : null;
}

function objProp( objExpr, name ) {
	if ( ! objExpr || objExpr.type !== 'ObjectExpression' ) return null;
	const p = objExpr.properties.find(
		( pr ) =>
			pr.type === 'ObjectProperty' &&
			( ( pr.key.type === 'Identifier' && pr.key.name === name ) ||
				( pr.key.type === 'StringLiteral' && pr.key.value === name ) )
	);
	return p ? p.value : null;
}

function objHasProp( objExpr, name ) {
	return objProp( objExpr, name ) !== null;
}

function stringLiteralValue( node ) {
	return node && node.type === 'StringLiteral' ? node.value : null;
}

function booleanLiteralValue( node ) {
	return node && node.type === 'BooleanLiteral' ? node.value : null;
}

// A row/state's `value` expression, resolved to a block.json attribute name.
// Handles the two shapes actually present in this tree: a plain destructured
// identifier (`value={ iconColour }`) and `attributes.x` (`value={
// attributes.iconColour }`). Anything else (nested object access like
// `asideSeparator?.colour`, a ternary, a template) is deliberately NOT
// resolved — see BLIND SPOTS: this can only under-count, never over-count,
// the derived required-states minimum.
function resolveAttrName( node ) {
	if ( ! node ) return null;
	if ( node.type === 'Identifier' ) return node.name;
	if (
		node.type === 'MemberExpression' &&
		! node.computed &&
		node.object &&
		node.object.type === 'Identifier' &&
		node.object.name === 'attributes' &&
		node.property &&
		node.property.type === 'Identifier'
	) {
		return node.property.name;
	}
	return null;
}

// Given a states ArrayExpression, find the 'normal' state object and resolve
// its bound attribute name.
function normalStateAttrName( statesArray ) {
	if ( ! statesArray || statesArray.type !== 'ArrayExpression' ) return null;
	for ( const el of statesArray.elements ) {
		if ( ! el || el.type !== 'ObjectExpression' ) continue;
		const keyVal = stringLiteralValue( objProp( el, 'key' ) );
		if ( keyVal === 'normal' ) return resolveAttrName( objProp( el, 'value' ) );
	}
	// A single-state row with no explicit 'normal' key still counts as the
	// base state — fall back to the first state object's value.
	const first = statesArray.elements.find( ( el ) => el && el.type === 'ObjectExpression' );
	return first ? resolveAttrName( objProp( first, 'value' ) ) : null;
}

function statesArrayHasGradient( statesArray ) {
	if ( ! statesArray || statesArray.type !== 'ArrayExpression' ) return false;
	return statesArray.elements.some(
		( el ) =>
			el &&
			el.type === 'ObjectExpression' &&
			( objHasProp( el, 'gradientValue' ) || objHasProp( el, 'onGradientChange' ) )
	);
}

// The schema's derived required-state count for a row bound to `attrName`:
// 1 (normal, always required) + the states DECLARED on the matching
// `supports.sgs.elements.<el>.states` entry, floored at 2 (golden-controls.
// json `controls.colour.states.minimum`). No match / no resolvable attrName
// => the schema's stated default floor of 2.
function requiredStatesFor( elements, attrName ) {
	if ( ! attrName || ! elements || typeof elements !== 'object' ) return 2;
	for ( const el of Object.values( elements ) ) {
		if ( ! el || typeof el !== 'object' || ! el.attrMap ) continue;
		if ( Object.values( el.attrMap ).includes( attrName ) ) {
			const declared = el.states && typeof el.states === 'object' ? Object.keys( el.states ) : [];
			return Math.max( 2, 1 + declared.length );
		}
	}
	return 2;
}

function slugify( s ) {
	return String( s )
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' );
}

module.exports = {
	id: '31-golden-colour-control',
	checklistItem: null,
	title:
		'A block\'s colour controls must match the golden colour-control schema (scripts/' +
		'consistency/golden-controls.json controls.colour) — no native colour UI competing with ' +
		'SGS\'s panel, no raw lookalike components, every row carrying its required state set, and ' +
		'a gradient path on every row unless a declared exemption names a real reason',
	scope: 'per-block',
	needs: [ 'ast:edit.js', 'json:block.json' ],
	run( ctx, block ) {
		// See rules 04/24/30's identical comment: `this.id` is not usable inside
		// a nested Babel visitor callback (Babel invokes visitor methods as
		// plain functions, so `this` resolves to the Node.js global object
		// there, confirmed empirically) — captured here instead.
		const ruleId = this.id;
		const findings = [];

		// ── (5) roster-surface-unknown — guard the null-surfaces trap FIRST,
		// before anything below reads `block.surfaces`, per golden-controls.
		// json `scope.nullSurfacesRule`: "Treat null surfaces as UNKNOWN, NOT
		// CLEAN". This does not gate the other four checks (none of them read
		// `block.surfaces`), it only documents the trap's existence.
		if ( block.surfaces === null ) {
			findings.push(
				makeFinding( {
					rule: ruleId,
					block: block.slug,
					file: null,
					line: null,
					severity: 'informational',
					detail:
						`${ block.slug } is on disk but absent from roster.json — its colour surface is ` +
						'UNKNOWN, not confirmed clean. An advisory rule that reads `.colour` off a null ' +
						'surfaces object throws and is silently SKIPPED by the scanner (run.js:189-201), ' +
						'which reads as green with no evidence.',
					fix:
						'Regenerate roster.json (`python scripts/consistency/build-roster.py`) so this ' +
						'block gets a roster entry, then re-run the scan to get a real answer for this block.',
					keyParts: [ 'roster-surface-unknown' ],
				} )
			);
		}

		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const blockJsonPath = path.join( ctx.blocksDir, block.tail, 'block.json' );

		// cache.json() returns a { ok, error, data } WRAPPER, never the parsed
		// object — reading straight off it yields undefined and silently
		// disables every block.json-dependent check below.
		const blockJsonWrapper = ctx.cache.json( blockJsonPath );
		const blockJson =
			blockJsonWrapper && blockJsonWrapper.ok && blockJsonWrapper.data ? blockJsonWrapper.data : null;

		// ── (1) native-colour-ui ────────────────────────────────────────────
		if ( blockJson && blockJson.supports && blockJson.supports.color ) {
			const color = blockJson.supports.color;
			const trueFlags = NATIVE_COLOR_SUBFLAGS.filter( ( k ) => color[ k ] === true );
			if ( trueFlags.length ) {
				// Best-effort line lookup for the human report; not load-bearing.
				const raw = ctx.cache.text( blockJsonPath ) || '';
				const lines = raw.split( '\n' );
				let line = 0;
				for ( let i = 0; i < lines.length; i++ ) {
					if ( /^\s*"color"\s*:/.test( lines[ i ] ) ) {
						line = i + 1;
						break;
					}
				}
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: blockJsonPath,
						line,
						severity: 'warn',
						detail:
							`${ blockJsonPath }${ line ? ':' + line : '' } — supports.color declares ` +
							`${ trueFlags.join( ', ' ) } true. Core renders its OWN colour panel in the ` +
							'Styles tab for every true sub-flag, competing with SGS\'s colour panel ' +
							'(golden-controls.json controls.colour.nativeUi).',
						fix:
							'Set every supports.color sub-flag to false (keep __experimentalSkipSerialization) ' +
							'so WordPress renders no native colour UI, and expose the same control via ' +
							'SgsColourPanel/DesignTokenPicker instead. See rules.json _meta / Spec 35 Part O ' +
							'Cross-cutting A for sequencing — retire native supports as its own tracked pass, ' +
							'not ad hoc per finding.',
						keyParts: [ 'native-colour-ui', trueFlags.sort().join( ',' ) ],
					} )
				);
			}
		}

		const elements =
			blockJson && blockJson.supports && blockJson.supports.sgs && blockJson.supports.sgs.elements
				? blockJson.supports.sgs.elements
				: null;
		const colourExemptions =
			blockJson && blockJson.supports && blockJson.supports.sgs && blockJson.supports.sgs.colourExemptions
				? blockJson.supports.sgs.colourExemptions
				: null;

		function checkRow( { rowKey, statesArray, gradientCapable, line } ) {
			const statesCount =
				statesArray && statesArray.type === 'ArrayExpression' ? statesArray.elements.length : 1;
			const attrName = normalStateAttrName( statesArray );
			const required = requiredStatesFor( elements, attrName );

			// ── (3) row-below-minimum-states ─────────────────────────────────
			if ( statesCount < required ) {
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: editFile,
						line,
						severity: 'warn',
						detail:
							`${ editFile }:${ line } — colour row "${ rowKey }" carries ${ statesCount } state` +
							`${ statesCount === 1 ? '' : 's' }, below the required ${ required } (golden-controls` +
							'.json controls.colour.states — minimum 2, or 1 + the states declared on this ' +
							'attribute\'s matching supports.sgs.elements entry).',
						fix:
							`Add the missing state(s) to this row's states array (a "hover" state at minimum ` +
							'— see sgs/button edit.js:381-399 for the canonical 2-state shape, or sgs/tabs ' +
							'edit.js:176-199 for the 3-state normal/hover/active shape).',
						keyParts: [ 'row-below-minimum-states', rowKey, String( line ) ],
					} )
				);
			}

			// ── (4) row-missing-gradient ──────────────────────────────────────
			const hasGradient = gradientCapable === true || statesArrayHasGradient( statesArray );
			if ( ! hasGradient ) {
				const exemption = colourExemptions ? colourExemptions[ rowKey ] : null;
				const exempt =
					exemption &&
					exemption.rule === 'gradient' &&
					hasRealReason( exemption.reason );
				if ( ! exempt ) {
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: editFile,
							line,
							severity: 'warn',
							detail:
								`${ editFile }:${ line } — colour row "${ rowKey }" has no gradient path (no ` +
								'gradientValue/onGradientChange on any state, and no gradientCapable:true) and ' +
								'no declared exemption (golden-controls.json controls.colour.gradient — ' +
								'required, with declared exemptions).',
							fix:
								'Add a per-state gradient toggle (gradientValue + onGradientChange, backed by a ' +
								'sibling {attr}Gradient attribute — see sgs/button edit.js:410-420) for ' +
								'background/border/icon colours, or gradientCapable:true + ' +
								'GradientCapableColourControl for text colour. If this row genuinely has no ' +
								'valid gradient form (e.g. a shadow colour), declare the exemption at ' +
								`block.json supports.sgs.colourExemptions.${ JSON.stringify(
									rowKey
								) } = { "rule": "gradient", "reason": "<specific reason>" } — a boilerplate reason ` +
								'will not suppress this finding.',
							keyParts: [ 'row-missing-gradient', rowKey, String( line ) ],
						} )
					);
				}
			}
		}

		// ── PRE-PASS: resolve a `rows` prop that is not a bare inline array
		// literal — three live shapes confirmed in this tree (all named in
		// their own blocks' D618/D619 header comments):
		//   (a) `const colourRows = []; colourRows.push({...})` (product-card)
		//       — collected below via a `CallExpression` visitor.
		//   (b) `const colourRows = [ {...}, {...} ];` then `rows={ colourRows }`
		//       (nav-menu) — collected below via a `VariableDeclarator` visitor.
		//   (c) `rows={ [ ...(cond ? [...] : []), {...} ] }` — a spread of a
		//       conditional inline in the array literal itself (social-icons)
		//       — handled by `resolveArrayLike`'s recursive walk, no pre-pass
		//       needed (it is already part of the JSX attribute's own AST).
		// A `.push(...spread)`, a variable populated via `.concat()`/
		// `Array.from()`, or a spread of something neither a nested array
		// literal nor a known local `const` array is NOT resolved — declared
		// blind spot (see header BLIND SPOTS).
		const pushedRows = Object.create( null );
		const declaredArrays = Object.create( null );
		ctx.cache.traverse( editFile, {
			CallExpression( nodePath ) {
				const node = nodePath.node;
				const callee = node.callee;
				if (
					! callee ||
					callee.type !== 'MemberExpression' ||
					callee.computed ||
					! callee.property ||
					callee.property.name !== 'push' ||
					! callee.object ||
					callee.object.type !== 'Identifier'
				) {
					return;
				}
				const varName = callee.object.name;
				for ( const arg of node.arguments ) {
					const rowObj = unwrapRowObject( arg );
					if ( ! rowObj ) continue;
					if ( ! pushedRows[ varName ] ) pushedRows[ varName ] = [];
					pushedRows[ varName ].push( rowObj );
				}
			},
			VariableDeclarator( nodePath ) {
				const node = nodePath.node;
				if (
					node.id &&
					node.id.type === 'Identifier' &&
					node.init &&
					node.init.type === 'ArrayExpression'
				) {
					declaredArrays[ node.id.name ] = node.init;
				}
			},
		} );

		// Recursively resolve an expression to the flat list of candidate row
		// nodes it can statically be shown to contribute — an inline array's
		// elements, a spread's argument (itself resolved recursively), both
		// branches of a ternary (a boolean attribute like `colourMode` is not
		// evaluated, so both branches are treated as reachable), a known
		// local `const` array identifier, or a `.filter(...)` call's receiver
		// array (the predicate itself is not evaluated — over-inclusive by
		// one call, never under). Terminates on anything else (blind spot).
		function resolveArrayLike( node, depth ) {
			if ( ! node || depth > 6 ) return [];
			if ( node.type === 'ArrayExpression' ) {
				return node.elements.flatMap( ( el ) =>
					el && el.type === 'SpreadElement'
						? resolveArrayLike( el.argument, depth + 1 )
						: [ el ]
				);
			}
			if ( node.type === 'Identifier' ) {
				if ( pushedRows[ node.name ] ) return pushedRows[ node.name ];
				if ( declaredArrays[ node.name ] ) return resolveArrayLike( declaredArrays[ node.name ], depth + 1 );
				return [];
			}
			if ( node.type === 'ConditionalExpression' ) {
				return resolveArrayLike( node.consequent, depth + 1 ).concat(
					resolveArrayLike( node.alternate, depth + 1 )
				);
			}
			if (
				node.type === 'CallExpression' &&
				node.callee &&
				node.callee.type === 'MemberExpression' &&
				node.callee.property &&
				node.callee.property.name === 'filter'
			) {
				return resolveArrayLike( node.callee.object, depth + 1 );
			}
			return [];
		}

		// Resolve a `rows` JSX attribute expression to a list of row
		// ObjectExpression nodes via `resolveArrayLike`, then reduce each
		// candidate node through `unwrapRowObject` (handles a plain object,
		// or a `cond && {...}` conditional row already reached via a pushed/
		// declared array or an inline literal).
		function resolveRowObjects( rowsExpr ) {
			return resolveArrayLike( rowsExpr, 0 ).map( unwrapRowObject ).filter( Boolean );
		}

		const ok = ctx.cache.traverse( editFile, {
			JSXOpeningElement( nodePath ) {
				const node = nodePath.node;
				const name = jsxName( node );
				if ( ! name ) return;
				const line = node.loc ? node.loc.start.line : 0;

				// ── (2) banned-lookalike ─────────────────────────────────────────
				if ( RAW_COLOUR_COMPONENT_NAMES.has( name ) ) {
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: editFile,
							line,
							severity: 'warn',
							detail:
								`${ editFile }:${ line } — raw <${ name }> is a BANNED lookalike under the golden ` +
								'colour-control schema (golden-controls.json controls.colour.bannedLookalikes). ' +
								'It renders directly here instead of going through DesignTokenPicker.',
							fix:
								'Replace <' +
								name +
								'> with the shared DesignTokenPicker component (src/components/' +
								'DesignTokenPicker.js) — it already carries the required states axis, gradient ' +
								'toggle and accessibility that a raw <' +
								name +
								'> lacks.',
							keyParts: [ 'banned-lookalike', name, String( line ) ],
						} )
					);
					return;
				}
				if ( name === 'TextControl' && jsxAttrStringValue( node, 'type' ) === 'color' ) {
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: editFile,
							line,
							severity: 'warn',
							detail:
								`${ editFile }:${ line } — a raw <TextControl type="color"> bypasses the theme ` +
								'token palette entirely (golden-controls.json controls.colour.bannedLookalikes' +
								'.patterns).',
							fix:
								'Replace with DesignTokenPicker (src/components/DesignTokenPicker.js), which ' +
								'renders the theme colour palette instead of a raw browser colour input.',
							keyParts: [ 'banned-lookalike', 'TextControl-type-color', String( line ) ],
						} )
					);
					return;
				}

				// ── SgsColourPanel: walk its `rows` — an inline array literal
				// (`rows={ [ ... ] }`) OR an identifier resolved via the
				// push-collection pre-pass (`rows={ colourRows }`, built via
				// `const colourRows = []; colourRows.push({...})`) ───────────
				if ( name === 'SgsColourPanel' ) {
					const rowsExpr = jsxAttrExpr( node, 'rows' );
					if ( ! rowsExpr ) return;
					const rowObjs = resolveRowObjects( rowsExpr );
					for ( const rowObj of rowObjs ) {
						const rowKey = stringLiteralValue( objProp( rowObj, 'key' ) ) || `row-line-${ line }`;
						const statesArray = objProp( rowObj, 'states' );
						const gradientCapable = booleanLiteralValue( objProp( rowObj, 'gradientCapable' ) );
						const rowLine = rowObj.loc ? rowObj.loc.start.line : line;
						checkRow( { rowKey, statesArray, gradientCapable, line: rowLine } );
					}
					return;
				}

				// ── standalone DesignTokenPicker (not inside a SgsColourPanel
				// rows array — those never appear as their own JSX element) ──────
				if ( name === 'DesignTokenPicker' ) {
					const statesExpr = jsxAttrExpr( node, 'states' );
					const labelExpr = jsxAttrExpr( node, 'label' );
					let labelText = null;
					if (
						labelExpr &&
						labelExpr.type === 'CallExpression' &&
						labelExpr.arguments[ 0 ] &&
						labelExpr.arguments[ 0 ].type === 'StringLiteral'
					) {
						labelText = labelExpr.arguments[ 0 ].value;
					}
					const rowKey = labelText ? slugify( labelText ) : `standalone-line-${ line }`;

					if ( statesExpr && statesExpr.type === 'ArrayExpression' ) {
						checkRow( { rowKey, statesArray: statesExpr, gradientCapable: false, line } );
					} else {
						// Legacy single-value API: value={...} onChange={...}, no
						// states array, and structurally no gradient prop (verified
						// live: no `<DesignTokenPicker` tag in the tree carries a
						// direct gradientValue/onGradientChange JSX attribute).
						const hasDirectGradient =
							!! findJsxAttr( node, 'gradientValue' ) || !! findJsxAttr( node, 'onGradientChange' );
						checkRow( {
							rowKey,
							statesArray: null,
							gradientCapable: hasDirectGradient,
							line,
						} );
					}
				}
			},
		} );
		if ( ! ok ) return findings; // parse-error is its own first-class finding via core/sources.js cache; keep the block.json-derived findings gathered above
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/31-golden-colour-control',
		mustFlag: [
			'native-colour-ui-block',
			'colorpalette-raw',
			'textcontrol-type-color',
			'single-state-row',
			'no-gradient-row',
			'legacy-single-value-row',
		],
		mustNotFlag: [
			'two-state-with-gradient',
			'three-state-required-by-element',
			'gradient-capable-text-row',
			'exempted-gradient-row',
			'native-color-all-false',
			'no-colour-controls',
		],
	},
};
