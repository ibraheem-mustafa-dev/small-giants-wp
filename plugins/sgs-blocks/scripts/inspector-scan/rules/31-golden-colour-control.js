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
// ── SHARED-OWNER SCAN (C4 step 2, 2026-08-20) — the edit.js-only boundary immediately below is
// now PARTIALLY closed, not fully. `row-below-minimum-states` and `row-missing-gradient` are
// widened to follow the SAME shared-component reach walk as the survey (`core/golden.js`
// `reachedComponents()` over `core/components.js` `resolveComponentFiles()`), so a colour row
// defined in `GridItemDefaultsPanel.js`/any other reached `components/` file is now found. THIS
// AXIS ALONE is widened — `banned-lookalike` stays edit.js-only DELIBERATELY (see its own check
// below): the canonical row components (`DesignTokenPicker.js`, `GradientCapableColourControl.js`)
// legitimately wrap `<ColorPalette>` internally, and widening banned-lookalike's reach would flag
// that conformant shape, destroying its own regression guard (0 live). `native-colour-ui` and
// `roster-surface-unknown` are untouched (they read block.json/roster, not JSX reach, by
// construction). A shared-owner row is attributed to the FILE that owns it, not to every block
// that mounts it — one FLAGGED finding per (owner file, rowKey), carrying `mountedBy: [block
// slugs]` as the per-block worklist. Computed ONCE per ctx (memoised on ctx itself — `run()` is
// invoked once per block by the harness, so a fresh ctx per real run / per self-test fixture run
// keeps this correctly scoped) and EMITTED ONCE overall (guarded by a ctx flag), regardless of
// which block's call happens to run first. A shared file nothing mounts is never in the reach map
// at all, so it is skipped by construction (dead code is not a client-facing defect).
//
// ── BLIND SPOTS (declared, not fixed here) ───────────────────────────────────────────────────
//   - Same per-block-edit.js-text boundary as rules 04/08/18/24/30 for `banned-lookalike` and for
//     the DIRECT edit.js scan: a colour control reached indirectly via a block's own local
//     `components/` subfolder, or a shared `src/components/*.js` file, is invisible to THAT axis
//     alone. `src/components/SgsColourPanel.js`/`GradientOverlayControl.js` themselves are
//     correctly excluded from `banned-lookalike` by this boundary, not by a name exemption.
//   - A shared-owner row's REQUIRED-states count always uses the schema's floor of 2, never a
//     derived higher minimum — `requiredStatesFor()` needs ONE mounting block's own
//     `supports.sgs.elements` to derive a higher floor, and a shared row can be mounted by several
//     blocks with different elements maps, so there is no single correct per-block answer for one
//     owner-scoped finding. This can only ever UNDER-count, same direction as the existing
//     nested-object-access blind spot below.
//   - A shared-owner row is never checked against `colourExemptions` — that field lives on a
//     MOUNTING block's own block.json, and is equally ambiguous across multiple mounting blocks
//     with potentially different exemptions. A shared row missing a gradient always flags.
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

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );
const { hasRealReason } = require( '../core/baseline' );

/**
 * Does this attribute's element ALSO paint a background?
 *
 * A text gradient is `background-image` plus `background-clip:text`, and
 * background-clip clips the element's WHOLE background painting area to the
 * glyph shapes — background-COLOUR included. So on an element that carries its
 * own background, a text gradient would clip that background to the letters and
 * destroy the fill. The text row on such an element has no valid gradient form.
 *
 * ⭐ STATED ONCE HERE, NOT PER BLOCK (Bean's ruling 2026-08-22; the same shape as
 * the shadow exemption, S-3). The fact is read from the element manifest — an
 * element whose attrMap maps both a `css:color*` and a `css:background*` member
 * IS the shared element — so no block list is hardcoded and no per-block
 * `colourExemptions` entry has to be written and then kept honest. sgs/button is
 * the canonical case: D288 makes the <a> itself the block root, so its `button`
 * element maps css:color alongside css:background-color/background-image, while
 * its separate `icon` element maps css:color alone and stays gradient-capable.
 *
 * @param {Object} elements supports.sgs.elements
 * @param {string} attrName The row's resting attribute name.
 * @return {boolean} True when text and background share one element.
 */
function textSharesElementWithBackground( elements, attrName ) {
	if ( ! attrName || ! elements || typeof elements !== 'object' ) return false;
	for ( const el of Object.values( elements ) ) {
		if ( ! el || typeof el !== 'object' || ! el.attrMap ) continue;
		const members = Object.keys( el.attrMap );
		if ( ! Object.values( el.attrMap ).includes( attrName ) ) continue;
		const paintsText = members.some( ( m ) => m.startsWith( 'css:color' ) );
		const paintsBackground = members.some( ( m ) => m.startsWith( 'css:background' ) );
		return paintsText && paintsBackground;
	}
	return false;
}
// discoverBlockDirNames + getSharedOwnerScan were EXTRACTED to core/components.js
// on 2026-08-24 so the components adoption-ledger writer can call the SAME
// one-hop resolver rather than growing a second one that disagrees with this.
// Behaviour is unchanged: proven by a byte-identical `node run.js --json` md5
// across the move.
const {
	resolveComponentFiles,
	discoverBlockDirNames,
	getSharedOwnerScan,
} = require( '../core/components' );

const RAW_COLOUR_COMPONENT_NAMES = new Set( [
	'ColorPalette',
	'ColorGradientControl',
	'GradientPicker',
	'PanelColorGradientSettings',
] );

const NATIVE_COLOR_SUBFLAGS = [ 'background', 'gradients', 'text', 'link' ];

// ── Standalone row-control recognition fix (2026-09-05) ──────────────────
// The standalone branch used to recognise ONLY the literal tag name
// 'DesignTokenPicker'. Two real gaps existed, both closed here:
//
//   (a) FALSE POSITIVE — `states={ ident.states }` where `ident` is bound to
//       a row-descriptor HELPER call (fillRow/textRow) elsewhere in the file
//       fell through to the legacy single-value path, which defaults the
//       state count to 1. Bean-verified live: process-steps
//       numberBackgroundRow (fillRow, base+hover+gradient+hoverGradient —
//       numberBackgroundHover IS declared) and site-header-row/
//       site-footer-row's fillRowDescriptor (backgroundColourHover IS
//       declared) were BOTH 2-state rows misreported as 1-state.
//   (b) INVISIBLE ROW — a block that mounts `<GradientCapableColourControl>`
//       DIRECTLY (never through SgsColourPanel) was skipped entirely by the
//       standalone branch's name check (card-grid x2, nav-drawer, text x2),
//       and a LOCAL ternary alias choosing between the two controls at
//       runtime (`const TextRowControl = cond ? GradientCapableColourControl
//       : DesignTokenPicker`, site-header-row/site-footer-row's own text
//       row) mounts under a THIRD name this rule never recognised at all —
//       worse than a false positive, a row with zero visibility.
//
// GradientCapableColourControl.js's own header states it mirrors
// DesignTokenPicker's row shape (states/label/gradientValue/onGradientChange)
// exactly, so recognising both — plus any local alias that resolves ONLY to
// the two of them — is sound without guessing at an arbitrary component name.
const STANDALONE_ROW_CONTROL_NAMES = new Set( [ 'DesignTokenPicker', 'GradientCapableColourControl' ] );

/**
 * ONE traversal collecting BOTH (a) local ternary aliases that resolve only
 * to STANDALONE_ROW_CONTROL_NAMES, and (b) every identifier bound to a
 * row-descriptor init (candidate for resolveRowDescriptorFromStatesExpr
 * below) — deliberately indiscriminate on (b): describeRow() is the strict
 * shape-checker, so collecting every VariableDeclarator init is safe (an
 * unrelated binding — a number, a JSX element, a function — simply fails
 * describeRow()'s shape checks and resolves to null, same as today).
 *
 * @param {Function} traverseFn Runs a Babel visitor object over one file.
 * @return {{aliases:Set<string>, descriptorBindings:Object}}
 */
function collectStandaloneRowHelpers( traverseFn ) {
	const aliases = new Set();
	const descriptorBindings = Object.create( null );
	traverseFn( {
		VariableDeclarator( nodePath ) {
			const node = nodePath.node;
			if ( ! node.id || node.id.type !== 'Identifier' || ! node.init ) return;
			descriptorBindings[ node.id.name ] = node.init;
			if (
				node.init.type === 'ConditionalExpression' &&
				node.init.consequent.type === 'Identifier' &&
				node.init.alternate.type === 'Identifier' &&
				STANDALONE_ROW_CONTROL_NAMES.has( node.init.consequent.name ) &&
				STANDALONE_ROW_CONTROL_NAMES.has( node.init.alternate.name )
			) {
				aliases.add( node.id.name );
			}
		},
	} );
	return { aliases, descriptorBindings };
}

/**
 * Resolve `ident.states` back to its row descriptor via describeRow() — the
 * SAME normaliser the SgsColourPanel `rows` path already uses for a helper
 * call (fillRow/textRow), so a row built this way scores identically
 * regardless of which JSX shape mounts it. Returns null when `statesExpr`
 * isn't that MemberExpression shape, OR the identifier isn't bound to
 * anything describeRow() recognises (falls through to the existing legacy
 * single-value path unchanged).
 *
 * @param {Object|null} statesExpr        The `states=` JSX attribute's expression.
 * @param {Object}      descriptorBindings collectStandaloneRowHelpers()'s result.
 * @return {Object|null} describeRow()'s descriptor, or null.
 */
function resolveRowDescriptorFromStatesExpr( statesExpr, descriptorBindings ) {
	if (
		! statesExpr ||
		statesExpr.type !== 'MemberExpression' ||
		statesExpr.computed ||
		! statesExpr.object ||
		statesExpr.object.type !== 'Identifier' ||
		! statesExpr.property ||
		statesExpr.property.type !== 'Identifier' ||
		statesExpr.property.name !== 'states'
	) {
		return null;
	}
	const init = descriptorBindings[ statesExpr.object.name ];
	return init ? describeRow( init ) : null;
}

// ── Shared golden engine (C4 step 1, 2026-08-19) ──────────────────────────
// These helpers were DEFINED here and are now imported. They moved verbatim so
// this rule's output cannot change — regression check on the extraction: 409
// findings before, 409 after. A refactor that moves a detector's number is not
// a refactor.
//
// They live in core/golden.js because enforcing golden-controls.json is five
// axes across thirteen control types; owning them per rule is 65 copies of the
// same five questions. `collectIndirectRowSources` in particular is the piece
// that cost a 33-row undercount to get right — product-card, nav-menu and
// social-icons build their rows prop indirectly and scored ZERO before it
// existed. It must never be reimplemented alongside this one.
const {
	collectIndirectRowSources,
	jsxName,
	findJsxAttr,
	jsxAttrExpr,
	jsxAttrStringValue,
	unwrapRowObject,
	objProp,
	objHasProp,
	stringLiteralValue,
	booleanLiteralValue,
	resolveAttrName,
	normalStateAttrName,
	statesArrayHasGradient,
	requiredStatesFor,
	soleDeclaredStateKey,
	slugify,
	reachedComponents,
	resolveMechanismFromCssProperty,
	getColourCssPropertyMap,
	normalStateGradientAttrName,
	describeRow,
} = require( '../core/golden' );

// ── Shared-owner scan helpers (C4 step 2, 2026-08-20) ────────────────────
// See the header SHARED-OWNER SCAN note above for what this closes and why
// it is scoped the way it is.

/**
 * Every subdirectory of ctx.blocksDir that has its own block.json — i.e. the
 * SAME "is this a block" test core/selftest.js's own harness uses (`if ( !
 * fs.existsSync( path.join( full, 'block.json' ) ) ) continue;`). Reads
 * ctx.blocksDir directly rather than ctx.roster.entries because self-test's
 * ctx carries `roster: { entries: [] }` (buildTestCtx, deliberately empty —
 * per-block fixtures are driven by directory names, not a roster). A reach
 * walk keyed on ctx.roster.entries would silently find zero blocks and never
 * exercise this axis in self-test at all.
 */

/**
 * Resolve + record ONE per-block row's paint mechanism (Step 2,
 * phase-colour-conformance.md) via `block_attributes.css_property`. Purely
 * additive: it stores the result on `ctx.__rule31RowMechanisms` for a future
 * step to assert against, and never itself pushes a finding or otherwise
 * changes what this rule reports — QA Gate A's requirement is that Step 2
 * makes mechanism VISIBLE without moving the finding count.
 *
 * On the FIRST call in a run, also prints a DB-wide (not merely
 * rows-seen-so-far) UNRESOLVED count to stderr, satisfying the plan's "the
 * run reports an explicit UNRESOLVED count" without inventing a new JSON
 * output surface this step doesn't otherwise need.
 *
 * Shared-owner rows (scanSharedOwnerRows) are deliberately NOT resolved here
 * — same reasoning as the existing colourExemptions blind spot for shared
 * rows (header BLIND SPOTS): one owner file can be mounted by several blocks,
 * and a bound attribute name is only meaningful per mounting block.
 */
function recordRowMechanism( ctx, blockSlug, rowKey, attrName, gradientAttrName ) {
	const map = getColourCssPropertyMap( ctx );
	if ( ! ctx.__rule31MechanismSummaryPrinted ) {
		ctx.__rule31MechanismSummaryPrinted = true;
		let total = 0;
		let unresolved = 0;
		for ( const attrs of Object.values( map ) ) {
			for ( const cssProperty of Object.values( attrs ) ) {
				total++;
				if ( resolveMechanismFromCssProperty( cssProperty ).unresolved ) unresolved++;
			}
		}
		process.stderr.write(
			`[rule 31] mechanism resolution: ${ unresolved } of ${ total } colour attrs UNRESOLVED ` +
				'(block_attributes.css_property empty or unrecognised — never guessed from the attr name)\n'
		);
	}

	if ( ! ctx.__rule31RowMechanisms ) ctx.__rule31RowMechanisms = [];

	// GROUND-TRUTH (2026-08-22, caught by this rule's own negative control):
	// a base attr alone is AMBIGUOUS. `css_property:'color'` is shared by
	// genuine TEXT rows (sgs/heading.textColour) AND SVG-icon rows painted via
	// CSS `color` + `fill:currentColor` (sgs/icon.iconColour) — but their
	// GRADIENT SIBLING disambiguates them cleanly: textColourGradient is
	// `color-gradient` (text), iconColourGradient is `stroke` (a real,
	// separate SVG-gradient helper, `sgs_svg_stroke_gradient()`, distinct from
	// both `sgs_text_colour_decl` and the plain per-state fill/border toggle).
	// Resolving ONLY the base attr flagged 12 live icon-colour rows as
	// "mechanism-mismatch" — a false alarm that would have sent an agent to
	// break 12 WORKING SVG gradients by adding gradientCapable:true to them.
	// The gradient sibling's mechanism is preferred when it resolves (more
	// specific evidence — it names the exact CSS the GRADIENT ITSELF uses,
	// which is precisely the question gradientPathMatchesMechanism asks);
	// the base attr is the fallback for a row with no gradient sibling at all
	// (e.g. a genuinely gradient-exempt shadow row) or one whose sibling
	// hasn't been seeded yet.
	const cssProperty = attrName && map[ blockSlug ] ? map[ blockSlug ][ attrName ] ?? null : null;
	const gradientCssProperty =
		gradientAttrName && map[ blockSlug ] ? map[ blockSlug ][ gradientAttrName ] ?? null : null;
	const base = resolveMechanismFromCssProperty( cssProperty );
	const grad = resolveMechanismFromCssProperty( gradientCssProperty );
	const mechanisms = Array.from( new Set( [ ...grad.mechanisms, ...base.mechanisms ] ) );
	const effectiveMechanisms = grad.mechanisms.length ? grad.mechanisms : base.mechanisms;

	const record = {
		block: blockSlug,
		rowKey,
		attrName,
		cssProperty,
		gradientAttrName,
		gradientCssProperty,
		mechanisms,
		effectiveMechanisms,
		unresolved: mechanisms.length === 0 || ! attrName,
	};
	ctx.__rule31RowMechanisms.push( record );
	return record;
}

/**
 * Does a row's ACTUAL gradient wiring match the mechanism its bound
 * attribute's `css_property` resolves to (Step 3, phase-colour-conformance.
 * md)? Text needs `background-clip:text`, which ONLY `gradientCapable:true`
 * (-> GradientCapableColourControl) provides — a per-state `gradientValue`
 * toggle there would paint a background gradient BEHIND the text, not clip
 * the text itself, so it does not count. Fill/border/stroke need the
 * opposite: a per-state gradient toggle; `gradientCapable:true` alone (the
 * text-only mechanism) does nothing for those. An unrecognised/multi-
 * mechanism set accepts either shape (the mechanism resolver already exposes
 * a comma-compound attribute as satisfying ANY of its named mechanisms).
 */
function gradientPathMatchesMechanism( mechanisms, gradientCapable, statesHasGradient ) {
	if ( mechanisms.includes( 'text' ) ) return gradientCapable === true;
	if ( mechanisms.some( ( m ) => m === 'fill' || m === 'border' || m === 'stroke' ) ) {
		return statesHasGradient === true;
	}
	return gradientCapable === true || statesHasGradient === true;
}


/**
 * Scans ONE owner file for colour rows — SgsColourPanel `rows` (resolved via
 * the SAME `collectIndirectRowSources`/`resolveArrayLike` mechanism the
 * per-block scan below uses, so a `.push()`-built or spread-conditional rows
 * array in a shared panel is resolved identically) and standalone
 * `DesignTokenPicker`. Deliberately does NOT check `banned-lookalike` — see
 * the header note. Emits ONE finding per rowKey, `block: null`, carrying
 * `mountedBy` for the per-block worklist.
 */
/**
 * Resolve a SHARED row's paint mechanism by checking every mounting block's
 * OWN attribute binding — not the owner file, which carries no attribute
 * names of its own (Step 3, phase-colour-conformance.md, extended past its
 * original per-block-only scope once ShadowControl.js proved to be where
 * every real shadow row in the tree actually lives). For each mounting
 * block, finds the JSXOpeningElement whose tag name equals the owner
 * component's own basename (this codebase's consistent default-import
 * convention — verified: every mounting file imports e.g. `ShadowControl`
 * under that exact identifier, never a local alias) and resolves its
 * `colour` prop (ShadowControl's own prop name for the colour value it
 * passes through to its internal DesignTokenPicker — verified live,
 * `button/edit.js:996` `colour={ boxShadowColour }`, distinct from its
 * `value` prop which carries the shadow DEPTH preset, not the colour) back
 * to an attribute name via the same `resolveAttrName` per-block rows
 * already use. A mechanism is trusted only
 * if it resolves for at least one mounting block — unlike colourExemptions
 * (genuinely ambiguous: different blocks can declare different reasons),
 * the underlying CSS mechanism is a property of the shared CONTROL's role,
 * not of which block mounts it, so agreement across mounting blocks is
 * expected and a single resolved block is sufficient evidence.
 */
function resolveSharedRowMechanism( ctx, ownerFile, mountedByList ) {
	const map = getColourCssPropertyMap( ctx );
	const ownerTagName = path.basename( ownerFile, path.extname( ownerFile ) );
	const allMechanisms = new Set();
	let anyResolved = false;

	for ( const blockSlug of mountedByList ) {
		const tail = blockSlug.replace( /^sgs\//, '' );
		const mountEditFile = path.join( ctx.blocksDir, tail, 'edit.js' );
		const parsed = ctx.cache.parse( mountEditFile );
		if ( ! parsed.ok ) continue;

		let attrName = null;
		ctx.cache.traverse( mountEditFile, {
			JSXOpeningElement( nodePath ) {
				if ( attrName ) return;
				const node = nodePath.node;
				if ( jsxName( node ) !== ownerTagName ) return;
				attrName = resolveAttrName(
					jsxAttrExpr( node, 'colour' ) || jsxAttrExpr( node, 'value' )
				);
			},
		} );
		if ( ! attrName ) continue;

		const cssProperty = map[ blockSlug ] ? map[ blockSlug ][ attrName ] ?? null : null;
		const { mechanisms, unresolved } = resolveMechanismFromCssProperty( cssProperty );
		if ( ! unresolved ) {
			anyResolved = true;
			mechanisms.forEach( ( m ) => allMechanisms.add( m ) );
		}
	}

	return { mechanisms: Array.from( allMechanisms ), unresolved: ! anyResolved };
}

function scanSharedOwnerRows( ctx, ruleId, file, mountedByList ) {
	const findings = [];

	const { pushedRows, declaredArrays } = collectIndirectRowSources(
		( visitors ) => ctx.cache.traverse( file, visitors ),
		unwrapRowObject
	);
	// Same standalone-control widening as the per-block walk below (header
	// comment on STANDALONE_ROW_CONTROL_NAMES) — the file's own comment on the
	// `statesProvidedByParent` guard warns these are TWO SEPARATE walks over
	// the same question; a fix added to one must be added to both, or half the
	// population drifts unfixed.
	const { aliases: sharedAliasNames, descriptorBindings: sharedDescriptorBindings } =
		collectStandaloneRowHelpers( ( visitors ) => ctx.cache.traverse( file, visitors ) );

	function resolveArrayLike( node, depth ) {
		if ( ! node || depth > 6 ) return [];
		if ( node.type === 'ArrayExpression' ) {
			return node.elements.flatMap( ( el ) =>
				el && el.type === 'SpreadElement' ? resolveArrayLike( el.argument, depth + 1 ) : [ el ]
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

	function resolveRowObjects( rowsExpr ) {
		return resolveArrayLike( rowsExpr, 0 ).map( unwrapRowObject ).filter( Boolean );
	}

	function emitSharedRow( {
		rowKey,
		statesArray,
		gradientCapable,
		line,
		statesCountOverride = null,
		hasGradientOverride = null,
	} ) {
		const statesCount =
			statesCountOverride !== null
				? statesCountOverride
				: statesArray && statesArray.type === 'ArrayExpression'
				? statesArray.elements.length
				: 1;
		// Shared-owner rows use the schema's floor of 2 — see the header note:
		// a per-mounting-block derived minimum has no single correct answer
		// for one owner-scoped finding, so this never attempts to derive one.
		const required = 2;
		const mountedByText = mountedByList.join( ', ' );

		if ( statesCount < required ) {
			findings.push( {
				...makeFinding( {
					rule: ruleId,
					block: null,
					file,
					line,
					severity: 'warn',
					detail:
						`${ file }:${ line } — SHARED colour row "${ rowKey }" (mounted by ${
							mountedByList.length
						} block(s): ${ mountedByText }) carries ${ statesCount } state${
							statesCount === 1 ? '' : 's'
						}, below the required 2 (golden-controls.json controls.colour.states — a shared row ` +
						'always uses the schema floor, never a per-block derived minimum).',
					fix:
						`Add the missing state(s) to this row's states array in ${ path.basename(
							file
						) } (a "hover" state at minimum — see sgs/button edit.js:381-399). This is a SHARED ` +
						'file: fixing it here clears the finding for every block in mountedBy at once, but ' +
						"each mounting block's own block.json must already declare the sibling attribute " +
						'this state writes to, or WordPress silently discards it on save.',
					keyParts: [ 'shared-row-below-minimum-states', rowKey, String( line ) ],
				} ),
				kind: 'below-min-states',
				mountedBy: mountedByList,
			} );
		}

		const hasGradient =
			hasGradientOverride !== null
				? hasGradientOverride
				: gradientCapable === true || statesArrayHasGradient( statesArray );
		const sharedMechanism = resolveSharedRowMechanism( ctx, file, mountedByList );
		const sharedShadowExempt = sharedMechanism.mechanisms.includes( 'shadow' );
		if ( ! hasGradient && ! sharedShadowExempt ) {
			findings.push( {
				...makeFinding( {
					rule: ruleId,
					block: null,
					file,
					line,
					severity: 'warn',
					detail:
						`${ file }:${ line } — SHARED colour row "${ rowKey }" (mounted by ${
							mountedByList.length
						} block(s): ${ mountedByText }) has no gradient path and no exemption is checked for ` +
						'a shared row (golden-controls.json controls.colour.gradient — exemptions are ' +
						'declared per mounting block\'s own block.json, which is ambiguous for one ' +
						'owner-scoped finding, so this always flags).',
					fix:
						`Add a per-state gradient toggle (gradientValue + onGradientChange) to this row in ${ path.basename(
							file
						) } — see sgs/button edit.js:410-420. This is a SHARED file: fixing it here clears ` +
						"the finding for every block in mountedBy at once, but each mounting block's own " +
						'block.json must already declare the sibling {attr}Gradient attribute this state ' +
						'writes to, or WordPress silently discards it on save.',
					keyParts: [ 'shared-row-missing-gradient', rowKey, String( line ) ],
				} ),
				kind: 'missing-gradient',
				mountedBy: mountedByList,
			} );
		}
	}

	const ok = ctx.cache.traverse( file, {
		JSXOpeningElement( nodePath ) {
			const node = nodePath.node;
			const name = jsxName( node );
			if ( ! name ) return;
			const line = node.loc ? node.loc.start.line : 0;

			// Deliberately NO banned-lookalike check here — see header note.

			if ( name === 'SgsColourPanel' ) {
				const rowsExpr = jsxAttrExpr( node, 'rows' );
				if ( ! rowsExpr ) return;
				const rowObjs = resolveRowObjects( rowsExpr );
				for ( const rowObj of rowObjs ) {
					const rowKey = stringLiteralValue( objProp( rowObj, 'key' ) ) || `row-line-${ line }`;
					const statesArray = objProp( rowObj, 'states' );
					const gradientCapable = booleanLiteralValue( objProp( rowObj, 'gradientCapable' ) );
					const rowLine = rowObj.loc ? rowObj.loc.start.line : line;
					emitSharedRow( { rowKey, statesArray, gradientCapable, line: rowLine } );
				}
				return;
			}

			if ( STANDALONE_ROW_CONTROL_NAMES.has( name ) || sharedAliasNames.has( name ) ) {
				// ⭐ `statesProvidedByParent` — the picker is single-state because its
				// ENCLOSING control owns the normal/hover axis (Bean's ruling 2026-08-22:
				// "the colour picker should be single state because the whole panel should
				// be 2 state"). Both states exist, one level up, so flagging this would be
				// a FALSE POSITIVE across all 30 mounting blocks — and a gate that cries
				// wolf is one people learn to skim. A literal JSX marker, statically
				// resolvable, never a runtime predicate (D738).
				//
				// ⚠ THIS SCAN NEEDS ITS OWN CHECK. The per-block scan has an identical
				// branch, and marking only that one left this finding live — the two walks
				// are separate code paths over the same question, which is exactly the
				// duplication describeRow() was introduced to end. Until they share a
				// walker, a guard added to one must be added to both.
				if ( findJsxAttr( node, 'statesProvidedByParent' ) ) return;
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
					emitSharedRow( {
						rowKey,
						statesArray: statesExpr,
						gradientCapable: name === 'GradientCapableColourControl',
						line,
					} );
				} else if ( statesExpr ) {
					// A `states=` attribute IS present but isn't a literal array — try
					// the descriptor resolver. If it doesn't resolve, this is a
					// GENUINELY AMBIGUOUS pass-through (e.g. SgsColourPanel.js's own
					// internal `const Control = row.gradientCapable ? … ;
					// <Control states={ row.states } />`, where `row` is a `.map()`
					// callback parameter, or SgsBorderControl.js's `states={
					// colourStates }` prop pass-through) — NOT the legacy
					// value=/onChange= shape. Defaulting an unresolvable case to "1
					// state, flag" would be a GUESS in the over-count direction — the
					// exact false-positive class this fix exists to remove. Skip
					// rather than guess; declared blind spot, same direction as every
					// other one in the header (can only under-count, never over).
					const descriptor = resolveRowDescriptorFromStatesExpr( statesExpr, sharedDescriptorBindings );
					if ( descriptor ) {
						emitSharedRow( {
							rowKey: descriptor.rowKey || rowKey,
							statesArray: null,
							gradientCapable: descriptor.gradientCapable === true,
							line: descriptor.line || line,
							statesCountOverride: descriptor.statesCount,
							hasGradientOverride: descriptor.hasGradient,
						} );
					}
				} else {
					// No `states` attr at all — the legacy single-value API
					// (value=/onChange=), structurally always 1 state. Unambiguous,
					// unchanged from before this fix.
					const hasDirectGradient =
						!! findJsxAttr( node, 'gradientValue' ) || !! findJsxAttr( node, 'onGradientChange' );
					emitSharedRow( {
						rowKey,
						statesArray: null,
						gradientCapable: hasDirectGradient || name === 'GradientCapableColourControl',
						line,
					} );
				}
			}
		},
	} );
	if ( ! ok ) return findings; // parse-error on the owner file itself; keep whatever was found before it
	return findings;
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
			findings.push( {
				...makeFinding( {
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
				} ),
				kind: 'roster-surface-unknown',
			} );
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
				findings.push( {
					...makeFinding( {
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
					} ),
					kind: 'native-colour-ui',
				} );
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

		// The *Override params carry a row resolved from a colour-variant HELPER call
		// (fillRow({...})), whose states are GENERATED inside the helper and are
		// therefore never a literal ArrayExpression here. Without them an adopted row
		// is INVISIBLE to this rule: it renders correctly, silently stops being
		// checked, and the finding count FALLS — which reads as progress. Measured on
		// the survey side, adopting a single row moved the census 255 -> 254.
		// describeRow() in core/golden.js is the one normaliser both this rule and the
		// survey use, so they cannot drift on what a row is.
		function checkRow( { rowKey, statesArray, gradientCapable, line,
			statesCountOverride = null, hasGradientOverride = null,
			attrNameOverride = null, gradientAttrNameOverride = null } ) {
			const statesCount =
				statesCountOverride !== null
					? statesCountOverride
					: statesArray && statesArray.type === 'ArrayExpression'
					? statesArray.elements.length
					: 1;
			const attrName = attrNameOverride !== null ? attrNameOverride : normalStateAttrName( statesArray );
			const gradientAttrName =
				gradientAttrNameOverride !== null
					? gradientAttrNameOverride
					: normalStateGradientAttrName( statesArray );
			const required = requiredStatesFor( elements, attrName );
			const mechanismInfo = recordRowMechanism( ctx, block.slug, rowKey, attrName, gradientAttrName );

			// ── (3) row-below-minimum-states ─────────────────────────────────
			//
			// A row may be exempted from the state floor, but ONLY for a row whose
			// element cannot be hovered at all — a drawer PANEL, a section
			// background, body text. Never for a row whose block simply has not
			// wired hover yet (Bean's ruling, 2026-08-22).
			//
			// ⭐ THAT DISTINCTION IS ENFORCED STRUCTURALLY, NOT BY THE PROSE. A reason
			// string alone would decay into the boilerplate the brief predicted for
			// shadows ("N copies of one sentence, each copy then a finding"). So the
			// exemption is REFUSED whenever the block already declares a matching
			// `<attr>Hover` attribute: if that attribute exists, the element
			// demonstrably CAN carry a hover state, and claiming otherwise would be a
			// capability downgrade dressed as conformance. sgs/button.colourText is
			// the case this protects — it declares colourTextHover and had a real
			// hover text colour under WP-native colour support; it must never become
			// states-exempt.
			const statesExemption = colourExemptions ? colourExemptions[ rowKey ] : null;
			const hoverAttrExists =
				!! attrName &&
				!! ( blockJson && blockJson.attributes && blockJson.attributes[ attrName + 'Hover' ] );
			const statesExempt =
				statesCount >= 1 &&
				!! statesExemption &&
				statesExemption.rule === 'states' &&
				hasRealReason( statesExemption.reason ) &&
				! hoverAttrExists;

			// ── State-scoped rows are not "missing" a state ──────────────
			// A row declaring exactly ONE state whose key is a real, admitted,
			// non-`normal` state is not a row that forgot its hover — it is a row
			// that IS a state. Measured 2026-09-03: nine rows, seven blocks, three
			// legitimate shapes (the hover half of a split control whose resting
			// half lives in SgsBorderControl; a colour for a hover-only feature;
			// a panel painted only when current). See soleDeclaredStateKey()'s
			// docblock in core/golden.js for the per-shape evidence.
			//
			// ⛔ This does NOT weaken the 2-state floor (golden-controls.json
			// states.minimumMeans, Bean 2026-08-19). For the split-control shape,
			// "add a normal state" would give a second control write-access to an
			// attribute SgsBorderControl already owns — the duplicate-writer defect
			// this project bans. The floor still binds every row that declares a
			// `normal` state, or an unkeyed one, or a key outside the vocabulary.
			const soleStateKey = soleDeclaredStateKey( statesArray );

			if ( statesCount < required && ! statesExempt && ! soleStateKey ) {
				findings.push( {
					...makeFinding( {
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
							hoverAttrExists && statesExemption && statesExemption.rule === 'states'
								? `EXEMPTION REFUSED: this block declares "${ attrName }Hover", so this element ` +
								  'CAN carry a hover state — the row is unwired, not un-hoverable. Wire the ' +
								  'hover state instead of exempting it; exempting here would remove a ' +
								  'capability the block already has.'
								: `Add the missing state(s) to this row's states array (a "hover" state at minimum ` +
								  '— see sgs/button edit.js:381-399 for the canonical 2-state shape, or sgs/tabs ' +
								  'edit.js:176-199 for the 3-state normal/hover/active shape). If this row paints ' +
								  'an element that CANNOT be hovered (a panel, a section background, body text), ' +
								  'declare block.json supports.sgs.colourExemptions."' + rowKey + '" = ' +
								  '{ "rule": "states", "reason": "<why this element has no hover state>" } — a ' +
								  'boilerplate reason will not suppress this finding.',
						keyParts: [ 'row-below-minimum-states', rowKey, String( line ) ],
					} ),
					kind: 'below-min-states',
				} );
			}

			// ── (4) row-missing-gradient / mechanism-mismatch ────────────────
			// Step 3 (phase-colour-conformance.md): mechanism-aware, BOTH
			// directions. A shadow-mechanism row is EXEMPT (box-shadow has no
			// gradient form) — this SUPERSEDES any per-block block.json
			// colourExemptions entry for the row, per S-3 (the mechanism is
			// stated once here rather than declared per block; Step 4 removes
			// post-grid's now-redundant exemption). An UNRESOLVED mechanism
			// falls back to the pre-Step-3 binary check (never guessed at) so
			// this rewrite cannot silently reduce coverage for the 157
			// attributes with no css_property yet.
			const statesHasGradient =
				hasGradientOverride !== null ? hasGradientOverride : statesArrayHasGradient( statesArray );
			const hasAnyGradient =
				hasGradientOverride !== null
					? hasGradientOverride
					: gradientCapable === true || statesHasGradient;
			const isShadowMechanism = mechanismInfo.mechanisms.includes( 'shadow' );

			if ( ! isShadowMechanism ) {
				const mechanismKnown = ! mechanismInfo.unresolved;
				const mismatched =
					mechanismKnown &&
					hasAnyGradient &&
					! gradientPathMatchesMechanism(
						mechanismInfo.effectiveMechanisms,
						gradientCapable,
						statesHasGradient
					);

				if ( ! hasAnyGradient || mismatched ) {
					const exemption = colourExemptions ? colourExemptions[ rowKey ] : null;
					// A TEXT row sharing its element with a background has no valid
					// gradient form — exempt BY MECHANISM, stated once (see
					// textSharesElementWithBackground). This supersedes any per-block
					// entry for that case, exactly as the shadow exemption does.
					const sharedElementTextExempt =
						mechanismInfo.effectiveMechanisms.includes( 'text' ) &&
						textSharesElementWithBackground( elements, attrName );
					const exempt =
						sharedElementTextExempt ||
						( exemption && exemption.rule === 'gradient' && hasRealReason( exemption.reason ) );
					if ( ! exempt ) {
						const mechanismText = mechanismKnown
							? ` (resolved mechanism: ${ mechanismInfo.mechanisms.join( '/' ) }, from ` +
							  `css_property "${ mechanismInfo.cssProperty }")`
							: ' (mechanism UNRESOLVED — block_attributes.css_property is empty for this attribute)';
						findings.push( {
							...makeFinding( {
								rule: ruleId,
								block: block.slug,
								file: editFile,
								line,
								severity: 'warn',
								detail: mismatched
									? `${ editFile }:${ line } — colour row "${ rowKey }" has a gradient path, but ` +
									  `it does not match this row's paint mechanism${ mechanismText }. A ${
											mechanismInfo.mechanisms.includes( 'text' ) ? 'text' : 'fill/border/stroke'
									  } row needs ${
											mechanismInfo.mechanisms.includes( 'text' )
												? 'gradientCapable:true (background-clip:text)'
												: 'a per-state gradientValue/onGradientChange toggle'
									  }, not the other shape.`
									: `${ editFile }:${ line } — colour row "${ rowKey }" has no gradient path (no ` +
									  'gradientValue/onGradientChange on any state, and no gradientCapable:true) and ' +
									  `no declared exemption${ mechanismText } (golden-controls.json controls.colour` +
									  '.gradient — required, with declared exemptions).',
								fix: mismatched
									? mechanismInfo.mechanisms.includes( 'text' )
										? 'Add gradientCapable:true + GradientCapableColourControl for this text row ' +
										  '— a per-state gradientValue toggle paints a background gradient BEHIND the ' +
										  'text, it does not clip the text itself.'
										: 'Add a per-state gradient toggle (gradientValue + onGradientChange, backed ' +
										  'by a sibling {attr}Gradient attribute — see sgs/button edit.js:410-420) — ' +
										  'gradientCapable:true is the text-only mechanism and does nothing here.'
									: 'Add a per-state gradient toggle (gradientValue + onGradientChange, backed by a ' +
									  'sibling {attr}Gradient attribute — see sgs/button edit.js:410-420) for ' +
									  'background/border/icon colours, or gradientCapable:true + ' +
									  'GradientCapableColourControl for text colour. If this row genuinely has no ' +
									  'valid gradient form (e.g. a shadow colour), declare the exemption at ' +
									  `block.json supports.sgs.colourExemptions.${ JSON.stringify(
											rowKey
									  ) } = { "rule": "gradient", "reason": "<specific reason>" } — a boilerplate reason ` +
									  'will not suppress this finding.',
								keyParts: [
									mismatched ? 'mechanism-mismatch' : 'row-missing-gradient',
									rowKey,
									String( line ),
								],
							} ),
							kind: mismatched ? 'mechanism-mismatch' : 'missing-gradient',
						} );
					}
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

		// Same standalone-control widening as scanSharedOwnerRows above (header
		// comment on STANDALONE_ROW_CONTROL_NAMES) — TWO SEPARATE walks over the
		// same question; a fix added to one must be added to both.
		const { aliases: standaloneAliasNames, descriptorBindings: standaloneDescriptorBindings } =
			collectStandaloneRowHelpers( ( visitors ) => ctx.cache.traverse( editFile, visitors ) );

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
					findings.push( {
						...makeFinding( {
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
						} ),
						kind: 'banned-lookalike',
					} );
					return;
				}
				if ( name === 'TextControl' && jsxAttrStringValue( node, 'type' ) === 'color' ) {
					findings.push( {
						...makeFinding( {
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
						} ),
						kind: 'banned-lookalike',
					} );
					return;
				}

				// ── SgsColourPanel: walk its `rows` — an inline array literal
				// (`rows={ [ ... ] }`) OR an identifier resolved via the
				// push-collection pre-pass (`rows={ colourRows }`, built via
				// `const colourRows = []; colourRows.push({...})`) ───────────
				if ( name === 'SgsColourPanel' ) {
					const rowsExpr = jsxAttrExpr( node, 'rows' );
					if ( ! rowsExpr ) return;
					for ( const el of resolveArrayLike( rowsExpr, 0 ) ) {
						const d = describeRow( el );
						if ( ! d ) continue;
						if ( d.viaHelper ) {
							checkRow( {
								rowKey: d.rowKey || `row-line-${ line }`,
								statesArray: null,
								// NOT hardcoded false: textRow emits gradientCapable:true,
								// which is the ONLY shape a text mechanism accepts.
								gradientCapable: d.gradientCapable === true,
								line: d.line || line,
								statesCountOverride: d.statesCount,
								hasGradientOverride: d.hasGradient,
								attrNameOverride: d.attrName,
								gradientAttrNameOverride: d.gradientAttrName,
							} );
							continue;
						}
						const rowObj = unwrapRowObject( el );
						if ( ! rowObj ) continue;
						const rowKey = stringLiteralValue( objProp( rowObj, 'key' ) ) || `row-line-${ line }`;
						const statesArray = objProp( rowObj, 'states' );
						const gradientCapable = booleanLiteralValue( objProp( rowObj, 'gradientCapable' ) );
						const rowLine = rowObj.loc ? rowObj.loc.start.line : line;
						checkRow( { rowKey, statesArray, gradientCapable, line: rowLine } );
					}
					return;
				}

				// ── standalone DesignTokenPicker / GradientCapableColourControl /
				// a local alias resolving only to the two of them (not inside a
				// SgsColourPanel rows array — those never appear as their own JSX
				// element) — see STANDALONE_ROW_CONTROL_NAMES header note ──────
				if ( STANDALONE_ROW_CONTROL_NAMES.has( name ) || standaloneAliasNames.has( name ) ) {
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

					// ⭐ `statesProvidedByParent` — a single-state picker whose ENCLOSING
					// control owns the normal/hover axis (Bean's ruling 2026-08-22 for
					// shadow: "the colour picker should be single state because the whole
					// panel should be 2 state"). Both states genuinely exist, one level
					// up, so flagging the picker as below-minimum would be a FALSE
					// POSITIVE — and a gate that cries wolf is one people learn to skim.
					// A literal JSX marker, statically resolvable, never a runtime
					// predicate (D738). It asserts WHERE the states live, not that the
					// requirement is waived.
					if ( findJsxAttr( node, 'statesProvidedByParent' ) ) {
						return;
					}
					if ( statesExpr && statesExpr.type === 'ArrayExpression' ) {
						checkRow( {
							rowKey,
							statesArray: statesExpr,
							// NOT hardcoded false: mounting GradientCapableColourControl
							// directly (bypassing SgsColourPanel's row-level flag) IS the
							// text-gradient mechanism declaration for THIS row — see the
							// mismatch this fixes below (card-grid, nav-drawer, text).
							gradientCapable: name === 'GradientCapableColourControl',
							line,
						} );
					} else if ( statesExpr ) {
						// A `states=` attribute IS present but isn't a literal array.
						// `ident.states` where `ident` is bound to a row-descriptor HELPER
						// call (fillRow/textRow) elsewhere in this file resolves via the
						// SAME normaliser the SgsColourPanel `rows` path uses for a helper
						// call, so this scores identically regardless of which JSX shape
						// mounts it — THE CONFIRMED FALSE-POSITIVE FIX (process-steps
						// numberBackgroundRow; site-header-row/site-footer-row
						// fillRowDescriptor: both genuine 2-state rows this branch used to
						// default to 1).
						//
						// ⛔ If it does NOT resolve, this is a GENUINELY AMBIGUOUS
						// pass-through (a `.map()` callback parameter, a plain function
						// argument) — NOT the legacy value=/onChange= shape below, which is
						// unambiguously 1 state by construction. Defaulting an unresolvable
						// case to "1 state, flag" would be a GUESS in the OVER-count
						// direction — precisely the false-positive class this fix removes.
						// Skip rather than guess; declared blind spot, same direction as
						// every other one in the header (can only under-count, never over).
						const descriptor = resolveRowDescriptorFromStatesExpr(
							statesExpr,
							standaloneDescriptorBindings
						);
						if ( descriptor ) {
							checkRow( {
								rowKey: descriptor.rowKey || rowKey,
								statesArray: null,
								gradientCapable: descriptor.gradientCapable === true,
								line: descriptor.line || line,
								statesCountOverride: descriptor.statesCount,
								hasGradientOverride: descriptor.hasGradient,
								attrNameOverride: descriptor.attrName,
								gradientAttrNameOverride: descriptor.gradientAttrName,
							} );
						}
					} else {
						// No `states` attr at all — the legacy single-value API
						// (value={...} onChange={...}), structurally always 1 state and
						// structurally no gradient prop except a direct gradientValue/
						// onGradientChange JSX attribute. Unambiguous, unchanged from
						// before this fix.
						const hasDirectGradient =
							!! findJsxAttr( node, 'gradientValue' ) || !! findJsxAttr( node, 'onGradientChange' );
						checkRow( {
							rowKey,
							statesArray: null,
							gradientCapable: hasDirectGradient || name === 'GradientCapableColourControl',
							line,
						} );
					}
				}
			},
		} );

		// ── Shared-owner scan, emitted ONCE overall regardless of which block's
		// call happens to run first (see header SHARED-OWNER SCAN note). Runs
		// even when this block's OWN edit.js failed to parse (`! ok` above) —
		// the two are independent files.
		if ( ! ctx.__rule31SharedOwnerFindingsEmitted ) {
			ctx.__rule31SharedOwnerFindingsEmitted = true;
			const { ownerMountedBy } = getSharedOwnerScan( ctx );
			for ( const [ ownerFile, mountedBySet ] of ownerMountedBy ) {
				const mountedByList = Array.from( mountedBySet ).sort();
				findings.push( ...scanSharedOwnerRows( ctx, ruleId, ownerFile, mountedByList ) );
			}
		}

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
			// Shared-owner scan (C4 step 2, 2026-08-20) — matched by the owner
			// FILE's basename (findingMatchesName), since a shared finding
			// carries block: null. Proves a colour row reached only via a
			// component mount, in a file outside any block's own edit.js, is
			// found.
			'FixtureSharedRowPanel',
			// Negative control for the describeRow() gradientCapable fix: ONLY
			// textRow emits gradientCapable, so a fillRow on a text-mechanism
			// attribute must still be caught. Pairs with the mustNotFlag entry
			// 'textrow-helper-gradient' below — identical fixtures, one helper
			// name apart, proving the fix matches without over-matching.
			'fillrow-helper-on-text-attr',
			// OVER-MATCH CONTROL for the sole-declared-state exemption
			// (2026-09-03). Identical to 'sole-declared-state-row' below apart
			// from the state KEY, which is outside golden-controls.json's
			// _meta.stateVocabulary.real. A typo must not buy silent exemption
			// from the state floor, or the floor stops meaning anything.
			'sole-unknown-state-row',
			// NEGATIVE CONTROLS for the 2026-09-05 standalone-control fix (below)
			// — each proves the fix resolves a REAL 2-state/gradient row without
			// blanket-exempting every row shaped like it.
			'standalone-descriptor-row-missing-hover',
			'standalone-gradientcapable-direct-missing-hover',
		],
		mustNotFlag: [
			// A row whose SOLE state is a declared, admitted, non-normal state IS
			// a state — not a row missing one. Nine real rows, seven blocks,
			// measured 2026-09-03. For the split-control shape the resting half
			// is owned by SgsBorderControl, so adding a 'normal' state here would
			// create a second writer for that attribute: the fix would be the bug.
			'sole-declared-state-row',
			'two-state-with-gradient',
			'three-state-required-by-element',
			'gradient-capable-text-row',
			'textrow-helper-gradient',
			'exempted-gradient-row',
			'native-color-all-false',
			'no-colour-controls',
			// Shared-owner scan negative control — a fully conformant row
			// reached the same way as FixtureSharedRowPanel above must not
			// flag.
			'FixtureCleanSharedRowPanel',
			// THE 2026-09-05 FIX — Bean-verified false positive (process-steps
			// numberBackgroundRow; site-header-row/site-footer-row
			// fillRowDescriptor): a standalone control mounted via
			// `states={ ident.states }` where `ident` is bound to a fillRow()/
			// textRow() call must resolve its REAL state/gradient count, not
			// the legacy-default 1.
			'standalone-descriptor-row-conformant',
			// Widened recognition — a DIRECT <GradientCapableColourControl>
			// mount (bypassing SgsColourPanel entirely) was previously
			// INVISIBLE to this rule (card-grid, nav-drawer, text). Must not
			// flag when conformant, and gradientCapable must derive from the
			// tag name itself (proven via the seeded 'text' mechanism in
			// _css-property-map.json).
			'standalone-gradientcapable-direct-conformant',
			// Proves the descriptor-resolution fix applies to
			// scanSharedOwnerRows() too, not only the per-block walk — see
			// the file's own `statesProvidedByParent` comment on why these
			// are two separate walks over the same question.
			'shared-descriptor-row-mount',
		],
	},
};
