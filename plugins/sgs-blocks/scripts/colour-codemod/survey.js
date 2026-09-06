'use strict';

/**
 * survey.js — the CENSUS half of the colour-conformance triad (D542).
 *
 * WHY THIS EXISTS. rule 31 already answers "which rows are wrong?" (388
 * findings across 61 blocks). It does NOT answer "which of those can a codemod
 * fix without guessing?", and that is the only question deciding whether this
 * is one script or fifteen agent dispatches. D542 is explicit: if an item
 * touches more than ~3 blocks the first deliverable is the detector, not the
 * edit — and the survey runs BEFORE the design, not after it.
 *
 * `--fix [--apply]` DELEGATES to fix.js (spawned as a child process, its own
 * engine untouched) rather than duplicating fix.js's AST-level per-row parse
 * here — that parse is what fix.js's own refusal reasons are built on, and
 * re-deriving it a second way risks the two tools disagreeing. This makes
 * survey.js the ONE entry point Bean asked for (2026-09-05): find (census),
 * categorise (verdict), and fix, in one command — `node survey.js --fix
 * --apply` — without the historical split into two commands a user had to
 * know to run in order. Plain `node survey.js` (no flag) still only writes
 * the census, unchanged.
 *
 * AUTOFIXABILITY IS GATED ON THE BLOCK'S OWN EMISSION CAPABILITY. Adding a hover
 * state or a gradient path is two mechanical edits (edit.js + block.json). The
 * THIRD edit — emitting the actual CSS rule — needs a real SELECTOR.
 *
 * ⛔ DO NOT USE block_attributes.derived_selector FOR THIS. Its name is a trap.
 * An earlier version of this survey classified on it and reported 58%
 * autofixable; that number was WRONG. Verified by grepping the tree: ZERO of its
 * values exist as classes anywhere — `.sgs-button__letterSpacing`,
 * `.sgs-card-grid__gap`, even the plausible-looking `.sgs-accordion__header` all
 * return 0 files. It is a synthetic per-attribute identifier, not a CSS emit
 * target.
 *
 * The clinching case: sgs/accordion.headerColour does not render in
 * sgs/accordion AT ALL. block.json:279 passes it via providesContext
 * ("sgs/accordionHeaderColour") to the CHILD block sgs/accordion-item, which
 * owns the real class .sgs-accordion-item__header. A selector can live in a
 * DIFFERENT BLOCK, so no per-attribute column could encode it.
 *
 * So capability is read from the block's OWN render.php: does it already call a
 * colour helper (and therefore already have a scoped selector in hand), and does
 * it already emit state-aware CSS? Anything else is refused with a named reason
 * — the same refuse-rather-than-guess rule migrate-tier-object.py applies to
 * its UNCLEAR class.
 *
 * Reuses core/golden.js + core/sources.js wholesale. collectIndirectRowSources
 * in particular cost a 33-row undercount to get right (product-card, nav-menu
 * and social-icons build their rows prop indirectly and scored ZERO before it
 * existed). It must never be reimplemented alongside the original.
 *
 * ── 2026-09-05 CENSUS-CORRECTNESS FIXES (4 confirmed bugs + 1 coordinator-flagged) ──
 *
 * Bug 1 — declared block.json `supports.sgs.colourExemptions` entries were
 * completely invisible here (0 references), so a formally, deliberately excused
 * row (e.g. sgs/site-header's `text` gradient exemption — background-clip:text
 * would hijack the header's own background) was refused forever. Now read with
 * the IDENTICAL semantics rule 31 applies (`hasRealReason()` boilerplate
 * rejection + the hoverAttrExists refusal for a "states" exemption) — see
 * `isStatesExempt()`/`isGradientExempt()` below. Exempted rows land in their
 * own `EXEMPT:declared-*` bucket, never silently dropped from the totals.
 *
 * Bug 2 — a `states={ descriptor.states }` / `states={ descriptor }` mount
 * (a helper-built row hoisted to a `const` and spread in, e.g. sgs/process-steps
 * `numberBackgroundRow`) fell through the standalone-picker branch's
 * `ArrayExpression`-only check and was misreported. Now resolved back to its
 * `VariableDeclarator` and normalised through the SAME `describeRow()` the
 * SgsColourPanel path already uses. Paired with this: `<TextRowControl>` —
 * a LOCAL VARIABLE aliasing `DesignTokenPicker`/`GradientCapableColourControl`
 * via a ternary (sgs/site-header-row, sgs/site-footer-row) — matched NEITHER
 * recognised component name and was never scanned at all. Both
 * `GradientCapableColourControl` (used directly in several blocks) and any
 * locally-aliased ternary between the two are now recognised as the same
 * CLASS of mount, not as three named instances.
 *
 * Bug 3 — `gradientExtensibility()` only recognised the three original
 * paint-decl primitives, so real gradient-capable paths were misreported under
 * the generic `no-gradient-capable-paint-path-found` reason instead of a
 * specific one (or, for the coordinator-flagged case, misreported as
 * NOT extensible at all). Fixed on three fronts:
 *   (a) COMPOSER_MAP_HELPERS (`sgs_fill_decls`/`sgs_fill_states_css`/
 *       `sgs_text_decls`/`sgs_text_states_css`/`sgs_border_states_css`) —
 *       take the whole `$attributes` array plus a `$map` naming which of the
 *       block's own keys is 'base'/'gradient'; the attribute name is a STRING
 *       inside the map, never `attributes['<attr>']` directly, so the
 *       original hop1/hop2 regex could never see it.
 *   (b) `sgs_button_element_style_css( $attributes, '<prefix>', ... )` reads
 *       `{prefix}ColourBackground|Text|Border` (+ their Gradient siblings)
 *       via a dynamic `$prefix.$suffix` key, keyed on the prefix STRING, never
 *       on the attribute name literally.
 *   (c) `sgs_svg_stroke_gradient()` (icon/SVG stroke-or-fill gradient path,
 *       `includes/helpers-svg-gradient.php`) is called with the row's SIBLING
 *       `{attr}Gradient` value, never the base attr — a structurally different
 *       calling convention from the three original primitives.
 *   Negative-evidence naming was ALSO widened (never to a new positive,
 *   only to a more specific REFUSED reason): the colour-valued-custom-property
 *   blocker is now traced across up to 3 hops of local-var assignment (the
 *   original checked only a DIRECT `attributes[attr]` bind — sgs/mega-panel's
 *   `$panel_bg_raw` -> `$panel_bg_value` -> `--sgs-mm-panel-bg` needs the
 *   second hop), and two `foreach ( $map as $k => $v )` shapes (attr-keyed and
 *   css-var-keyed) are recognised directly.
 *
 * Bug 4 — the legacy single-value `<DesignTokenPicker value={x} onChange={…}>`
 * API always set `attr: null` (`isArr ? normalStateAttrName(...) : null`),
 * refusing every such row as `unresolvable-attr` even when `value` plainly
 * named a real attribute (sgs/modal's `overlayColour`). Now resolved via the
 * SAME `resolveAttrName()` rule 31 uses for a row's `normal` state.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const { SourceCache } = require( '../inspector-scan/core/sources' );
const { hasRealReason } = require( '../inspector-scan/core/baseline' );
const {
	collectIndirectRowSources,
	jsxName,
	findJsxAttr,
	jsxAttrExpr,
	unwrapRowObject,
	objProp,
	stringLiteralValue,
	booleanLiteralValue,
	resolveAttrName,
	normalStateAttrName,
	statesArrayHasGradient,
	slugify,
	resolveMechanismFromCssProperty,
	describeRow,
} = require( '../inspector-scan/core/golden' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
const EXPORTER = path.join(
	PLUGIN_ROOT,
	'scripts',
	'inspector-scan',
	'export-colour-css-property.py'
);

/**
 * Rich DB rows. Fails CLOSED — a silent empty map here would classify every
 * row as NEEDS-DATA and read as "nothing is auto-fixable", which is
 * indistinguishable from a correct answer. Same guard rule 31 already carries.
 */
function loadDbRows() {
	const out = execFileSync( 'python', [ EXPORTER, '--rich' ], { encoding: 'utf8' } );
	if ( ! out || ! out.trim() ) {
		throw new Error(
			'survey: exporter returned nothing — refusing to treat every row as unresolved.'
		);
	}
	return JSON.parse( out );
}

/**
 * Can this attribute's EXISTING paint path carry a gradient?
 *
 * ⛔ THIS IS THE QUESTION THE FIRST TWO VERSIONS OF THIS SURVEY DID NOT ASK, and it
 * cost a whole task. `AUTOFIXABLE:helper-at-existing-selector` only ever established
 * that the block emits colour SOMEWHERE it owns. Task 2 was scoped at 38 rows on that
 * verdict and delivered 2, because 19 of 24 gradient rows paint through a CSS CUSTOM
 * PROPERTY holding a colour (`--sgs-mm-card`, `--sgs-tab-text`). A custom property
 * holding a colour cannot carry a gradient — a gradient is `background-image`, a
 * different CSS property. Those rows were correctly refused by the fixer, but the
 * census had already promised them. A census that over-promises is worse than one that
 * under-counts: it scopes work that cannot be delivered.
 *
 * BIASED CONSERVATIVE ON PURPOSE: returns false unless extensibility is PROVEN.
 * Under-promising costs a re-measure; over-promising costs a task.
 *
 * Two hops, because that is the shape the tree actually uses (verified):
 *   $nav_bg = isset( $attributes['navBg'] ) ? (string) $attributes['navBg'] : '';
 *   ... sgs_background_paint_decl( $nav_bg, $nav_bg_gradient )
 */
const GRADIENT_CAPABLE_HELPERS = [
	'sgs_background_paint_decl',
	'sgs_border_gradient_css',
	'sgs_resolve_text_colour_or_gradient',
];

/**
 * Helpers whose ARGUMENT is the row's SIBLING `{attr}Gradient` value ALONE —
 * never the base attribute — a structurally different calling convention from
 * GRADIENT_CAPABLE_HELPERS above. Verified live 2026-09-05:
 * `sgs_svg_stroke_gradient()` (includes/helpers-svg-gradient.php) is the
 * icon/SVG stroke-or-fill gradient path — sgs/star-rating's `starColour`/
 * `emptyColour` and sgs/google-reviews' `starColour` all call it with
 * `'fill'`, passing `attributes['starColourGradient']` (or a bound local of
 * it), never `attributes['starColour']` itself.
 *
 * ⛔ THIS LIST MUST GROW WHEN A NEW GRADIENT-ONLY-ARG HELPER IS ADDED. There is
 * no generic way to prove "accepts a gradient CSS string and paints with it"
 * from static analysis of an arbitrary PHP function body — this is the
 * deliberate, single, named place that fact lives. `--self-test` asserts
 * `sgs_svg_stroke_gradient` stays in this list; if that assertion goes red,
 * add the new helper here rather than editing the assertion.
 */
const GRADIENT_ONLY_ARG_HELPERS = [ 'sgs_svg_stroke_gradient' ];

/**
 * Composer helpers that take the WHOLE `$attributes` array plus a `$map`
 * naming which of the block's OWN attribute keys is 'base'/'gradient'/
 * 'hover'/'hover_gradient' (`includes/helpers-colour-variants.php`) — the
 * attribute name is a STRING inside the map literal, never
 * `attributes['<attr>']` directly, so GRADIENT_CAPABLE_HELPERS' hop1/hop2
 * checks can never see it. Verified live 2026-09-05 against real callers
 * (sgs/icon-list, sgs/product-card, sgs/product-faq-item, sgs/tab, and 15+
 * others) — every one passes `'base' => '<attr>', 'gradient' =>
 * '<attr>Gradient', ...` as an inline array literal to one of these five.
 *
 * ⛔ SAME GROWTH CONTRACT AS GRADIENT_ONLY_ARG_HELPERS — one named place,
 * `--self-test` asserts the full set stays present.
 */
const COMPOSER_MAP_HELPERS = [
	'sgs_fill_decls',
	'sgs_fill_states_css',
	'sgs_text_decls',
	'sgs_text_states_css',
	'sgs_border_states_css',
];

/**
 * Every call to `calleeName( ... )` in `php`, returning the raw text between
 * the function's OWN parens (paren-balanced — a nested array literal's own
 * parens/brackets never terminate the match early). A regex alone cannot
 * balance parens; this is the smallest correct alternative to a real PHP
 * parser for this one job.
 */
function extractCallArgLists( php, calleeName ) {
	const out = [];
	const opener = new RegExp( '\\b' + calleeName + '\\s*\\(', 'g' );
	let m;
	while ( ( m = opener.exec( php ) ) !== null ) {
		let depth = 1;
		let i = opener.lastIndex;
		while ( i < php.length && depth > 0 ) {
			if ( php[ i ] === '(' ) depth++;
			else if ( php[ i ] === ')' ) depth--;
			i++;
		}
		out.push( php.slice( opener.lastIndex, i - 1 ) );
		opener.lastIndex = i;
	}
	return out;
}

/** Bug 3(a) — a COMPOSER_MAP_HELPERS call whose map's 'base' is this attr AND
 * whose 'gradient' key is non-empty (proof the sibling is actually wired, not
 * merely that the composer ran for some OTHER row on the same file). */
function composerMapExtensible( php, attr ) {
	for ( const helper of COMPOSER_MAP_HELPERS ) {
		for ( const argsText of extractCallArgLists( php, helper ) ) {
			const baseRe = new RegExp( '[\'"]base[\'"]\\s*=>\\s*[\'"]' + attr + '[\'"]' );
			const gradientRe = /['"]gradient['"]\s*=>\s*['"][^'"]+['"]/;
			if ( baseRe.test( argsText ) && gradientRe.test( argsText ) ) {
				return { extensible: true, reason: 'composer-map-gradient:' + helper };
			}
		}
	}
	return null;
}

/** Bug 3(b) — `sgs_button_element_style_css( $attributes, '<prefix>', ... )`
 * unconditionally reads `{prefix}ColourBackground|Text|Border` and their
 * Gradient siblings — keyed on the STRING prefix, never the attribute name. */
function buttonElementStyleExtensible( php, attr ) {
	const GRADIENT_SUFFIXES = [ 'ColourBackground', 'ColourText', 'ColourBorder' ];
	const re = /sgs_button_element_style_css\(\s*\$\w+\s*,\s*['"]([A-Za-z0-9_]+)['"]/g;
	let m;
	while ( ( m = re.exec( php ) ) !== null ) {
		const prefix = m[ 1 ];
		for ( const suffix of GRADIENT_SUFFIXES ) {
			if ( attr === prefix + suffix ) {
				return { extensible: true, reason: 'button-element-style-css:' + prefix };
			}
		}
	}
	return null;
}

/** Bug 3(c) — GRADIENT_ONLY_ARG_HELPERS take the sibling `{attr}Gradient`
 * value alone; mirrors GRADIENT_CAPABLE_HELPERS' own hop1/hop2 shape but
 * keyed on `attr + 'Gradient'` instead of `attr`. */
function gradientOnlyArgExtensible( php, attr ) {
	const gradAttr = attr + 'Gradient';
	const HELPERS = GRADIENT_ONLY_ARG_HELPERS.join( '|' );

	const direct = new RegExp(
		'(' + HELPERS + ')\\([^)]*attributes\\[\\s*[\'"]' + gradAttr + '[\'"]'
	);
	if ( direct.test( php ) ) return { extensible: true, reason: 'direct-gradient-only-helper-arg' };

	const bind = new RegExp(
		'\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=[^;\\n]*attributes\\[\\s*[\'"]' + gradAttr + '[\'"]',
		'g'
	);
	const vars = [];
	let m;
	while ( ( m = bind.exec( php ) ) !== null ) vars.push( m[ 1 ] );
	for ( const v of vars ) {
		if ( new RegExp( '(' + HELPERS + ')\\([^)]*\\$' + v + '\\b' ).test( php ) ) {
			return { extensible: true, reason: 'gradient-only-helper-via-local-var' };
		}
	}
	return null;
}

/**
 * Trace `attributes[attr]` forward through up to `maxHops` further local-var
 * assignments (`$v1 = ...attributes[attr]...`, then `$v2 = ...$v1...`, etc).
 * Used ONLY for NEGATIVE-evidence naming (never to invent a new positive) —
 * sgs/mega-panel needs the second hop: `$panel_bg_raw` (direct) ->
 * `$panel_bg_value` (via `sgs_colour_value( $panel_bg_raw )`) -> written into
 * `--sgs-mm-panel-bg`. A 1-hop-only check reports the generic reason for a
 * row whose real, provable blocker is this one.
 */
function traceBoundVars( php, attr, maxHops ) {
	const direct = new RegExp(
		'\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=[^;\\n]*attributes\\[\\s*[\'"]' + attr + '[\'"]',
		'g'
	);
	let all = [];
	let m;
	while ( ( m = direct.exec( php ) ) !== null ) all.push( m[ 1 ] );

	const seen = new Set( all );
	let frontier = all.slice();
	for ( let hop = 0; hop < maxHops && frontier.length; hop++ ) {
		const next = [];
		for ( const v of frontier ) {
			const re = new RegExp( '\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=[^;\\n]*\\$' + v + '\\b', 'g' );
			let mm;
			while ( ( mm = re.exec( php ) ) !== null ) {
				if ( ! seen.has( mm[ 1 ] ) ) {
					seen.add( mm[ 1 ] );
					next.push( mm[ 1 ] );
				}
			}
		}
		all = all.concat( next );
		frontier = next;
	}
	return all;
}

function gradientExtensibility( php, attr ) {
	if ( ! php || ! attr ) return { extensible: false, reason: 'no-render-source' };

	// No regex-escaping needed anywhere below: an attribute name is always a plain
	// JS identifier and a PHP local is always [A-Za-z_][A-Za-z0-9_]*. An earlier
	// version carried escape() calls "for safety" and the escaping itself was the
	// only thing that broke — unnecessary defence against impossible input.
	const HELPERS = GRADIENT_CAPABLE_HELPERS.join( '|' );

	// Hop 1 — the attribute read directly as a gradient-capable helper's argument.
	const direct = new RegExp( '(' + HELPERS + ')\\([^)]*attributes\\[\\s*[\'"]' + attr + '[\'"]' );
	if ( direct.test( php ) ) return { extensible: true, reason: 'direct-helper-arg' };

	// Hop 2 — the attribute is bound to a local $var; is THAT var passed to one?
	const bind = new RegExp(
		'\\$([A-Za-z_][A-Za-z0-9_]*)\\s*=[^;\\n]*attributes\\[\\s*[\'"]' + attr + '[\'"]',
		'g'
	);
	const directVars = [];
	let m;
	while ( ( m = bind.exec( php ) ) !== null ) directVars.push( m[ 1 ] );

	for ( const v of directVars ) {
		if ( new RegExp( '(' + HELPERS + ')\\([^)]*\\$' + v + '\\b' ).test( php ) ) {
			return { extensible: true, reason: 'helper-via-local-var' };
		}
	}

	// Bug 3 — three further POSITIVE paths, each a distinct, verified calling
	// convention the three original primitives above do not cover.
	const composer = composerMapExtensible( php, attr );
	if ( composer ) return composer;
	const buttonEl = buttonElementStyleExtensible( php, attr );
	if ( buttonEl ) return buttonEl;
	const gradOnly = gradientOnlyArgExtensible( php, attr );
	if ( gradOnly ) return gradOnly;

	// Negative evidence — NAME the blocker, so a refusal is actionable, not a shrug.
	// Traced across up to 3 hops total (see traceBoundVars docblock).
	const tracedVars = traceBoundVars( php, attr, 2 );
	for ( const v of tracedVars ) {
		if ( new RegExp( '--sgs-[a-z0-9-]+\\s*:[^;]*\\$' + v + '\\b' ).test( php ) ) {
			return { extensible: false, reason: 'paints-via-colour-valued-custom-property' };
		}
	}
	// A `foreach ( $map as $k => $v )` custom-property shape, either key
	// orientation — verified live: sgs/tabs (`'attrName' => '--sgs-prop'`),
	// sgs/product-search (`'--sgs-prop' => $attributes['attrName']`).
	if (
		new RegExp( '[\'"]' + attr + '[\'"]\\s*=>\\s*[\'"]--sgs-[a-z0-9-]+[\'"]' ).test( php ) ||
		new RegExp(
			'[\'"]--sgs-[a-z0-9-]+[\'"]\\s*=>\\s*\\$attributes\\[\\s*[\'"]' + attr + '[\'"]'
		).test( php )
	) {
		return { extensible: false, reason: 'paints-via-colour-valued-custom-property' };
	}
	for ( const v of tracedVars ) {
		if ( new RegExp( 'sgs_text_colour_decl\\([^)]*\\$' + v + '\\b' ).test( php ) ) {
			return { extensible: false, reason: 'text-colour-decl-takes-no-gradient' };
		}
	}
	return { extensible: false, reason: 'no-gradient-capable-paint-path-found' };
}

function blockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( n ) => fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) )
		.sort();
}

/**
 * Bug 1 — read `block.json` `supports.sgs.colourExemptions.<rowKey>` with the
 * IDENTICAL semantics `rules/31-golden-colour-control.js` applies: same
 * `hasRealReason()` boilerplate-rejection standard, same refusal of a
 * "states" exemption when the block already declares the matching
 * `<attr>Hover` attribute (Bean's 2026-08-22 ruling — that attribute existing
 * proves the element CAN carry a hover state, so exempting it would be a
 * capability downgrade dressed as conformance, not a genuine exemption).
 */
function readExemption( blockJson, rowKey ) {
	if (
		! blockJson ||
		! blockJson.supports ||
		! blockJson.supports.sgs ||
		! blockJson.supports.sgs.colourExemptions ||
		! rowKey
	) {
		return null;
	}
	return blockJson.supports.sgs.colourExemptions[ rowKey ] || null;
}

function isStatesExempt( blockJson, rowKey, attrName ) {
	const exemption = readExemption( blockJson, rowKey );
	if ( ! exemption || exemption.rule !== 'states' || ! hasRealReason( exemption.reason ) ) {
		return false;
	}
	const hoverAttrExists =
		!! attrName &&
		!! ( blockJson && blockJson.attributes && blockJson.attributes[ attrName + 'Hover' ] );
	return ! hoverAttrExists;
}

function isGradientExempt( blockJson, rowKey ) {
	const exemption = readExemption( blockJson, rowKey );
	return !! exemption && exemption.rule === 'gradient' && hasRealReason( exemption.reason );
}

// Bug 2 (paired hazard) — the two row-control components a `states` prop can
// mount, PLUS any local variable that ALIASES one of them via a ternary (the
// `<TextRowControl>` shape in sgs/site-header-row and sgs/site-footer-row:
// `const TextRowControl = cond ? GradientCapableColourControl :
// DesignTokenPicker;`). Handled as a CLASS (any JSX tag resolving to one of
// these two components, directly or via one level of local aliasing), not as
// three named instances.
const KNOWN_ROW_COMPONENTS = new Set( [ 'DesignTokenPicker', 'GradientCapableColourControl' ] );

function isAliasedRowComponent( name, declaredVars ) {
	const init = declaredVars[ name ];
	if ( ! init ) return false;
	if ( init.type === 'Identifier' ) return KNOWN_ROW_COMPONENTS.has( init.name );
	if ( init.type === 'ConditionalExpression' ) {
		const c = init.consequent;
		const a = init.alternate;
		return (
			( !! c && c.type === 'Identifier' && KNOWN_ROW_COMPONENTS.has( c.name ) ) ||
			( !! a && a.type === 'Identifier' && KNOWN_ROW_COMPONENTS.has( a.name ) )
		);
	}
	return false;
}

// Bug 2 (primary) — resolve `states={ ident }` / `states={ ident.states }`
// back to `ident`'s own `VariableDeclarator` and normalise it through the
// SAME `describeRow()` the SgsColourPanel path uses (handles a hoisted
// `fillRow({...})`/`textRow({...})` call identically to an inline literal).
function resolveStandaloneDescriptor( statesExpr, declaredVars ) {
	if ( ! statesExpr ) return null;
	let identName = null;
	if ( statesExpr.type === 'Identifier' ) {
		identName = statesExpr.name;
	} else if (
		statesExpr.type === 'MemberExpression' &&
		! statesExpr.computed &&
		statesExpr.object &&
		statesExpr.object.type === 'Identifier' &&
		statesExpr.property &&
		statesExpr.property.type === 'Identifier' &&
		statesExpr.property.name === 'states'
	) {
		identName = statesExpr.object.name;
	}
	if ( ! identName || ! declaredVars[ identName ] ) return null;
	return describeRow( declaredVars[ identName ] );
}

/** Every colour ROW in one edit.js, mirroring rule 31's own walk exactly. */
function rowsInFile( cache, file ) {
	const rows = [];
	if ( ! fs.existsSync( file ) ) return rows;

	const { pushedRows, declaredArrays } = collectIndirectRowSources(
		( visitors ) => cache.traverse( file, visitors ),
		unwrapRowObject
	);

	// Bug 2 — file-wide `const X = ...` collection so a `states={ ident }` /
	// `states={ ident.states }` mount can resolve back to its declaration.
	// Deliberately flat (no scope tracking) — same simplification
	// collectIndirectRowSources already makes for pushedRows/declaredArrays.
	const declaredVars = Object.create( null );
	cache.traverse( file, {
		VariableDeclarator( p ) {
			const node = p.node;
			if ( node.id && node.id.type === 'Identifier' && node.init ) {
				declaredVars[ node.id.name ] = node.init;
			}
		},
	} );

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
			if ( declaredArrays[ node.name ] ) {
				return resolveArrayLike( declaredArrays[ node.name ], depth + 1 );
			}
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

	cache.traverse( file, {
		JSXOpeningElement( p ) {
			const node = p.node;
			const name = jsxName( node );
			if ( ! name ) return;
			const line = node.loc ? node.loc.start.line : 0;

			if ( name === 'SgsColourPanel' ) {
				const rowsExpr = jsxAttrExpr( node, 'rows' );
				if ( ! rowsExpr ) return;
				// describeRow normalises BOTH shapes — a literal row object and a
				// colour-variant helper CALL (fillRow({...})). Reading only
				// ObjectExpressions here is what made an adopted row VANISH from the
				// census (255 -> 254) while still rendering perfectly: the count fell,
				// which reads like progress. One shared normaliser so rule 31 and this
				// survey can never disagree about what a row is.
				for ( const el of resolveArrayLike( rowsExpr, 0 ) ) {
					const d = describeRow( el );
					if ( ! d ) continue;
					rows.push( {
						rowKey: d.rowKey || 'row-line-' + line,
						line: d.line || line,
						statesCount: d.statesCount,
						attr: d.attrName,
						hasGradient: d.hasGradient,
						via: d.viaHelper ? 'helper:' + d.viaHelper : 'SgsColourPanel',
					} );
				}
				return;
			}

			// Bug 2 — the class of standalone row-control mounts: DesignTokenPicker,
			// GradientCapableColourControl, or a local ternary alias of either
			// (`<TextRowControl>`), not a hardcoded list of three block names.
			if ( name === 'DesignTokenPicker' || name === 'GradientCapableColourControl' || isAliasedRowComponent( name, declaredVars ) ) {
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

				const resolved = resolveStandaloneDescriptor( statesExpr, declaredVars );
				if ( resolved ) {
					rows.push( {
						rowKey: resolved.rowKey || ( labelText ? slugify( labelText ) : 'standalone-line-' + line ),
						line: resolved.line || line,
						statesCount: resolved.statesCount,
						attr: resolved.attrName,
						hasGradient: resolved.hasGradient,
						via: resolved.viaHelper ? 'helper:' + resolved.viaHelper : name,
					} );
					return;
				}

				const isArr = statesExpr && statesExpr.type === 'ArrayExpression';
				// Bug 4 — the legacy single-value API (`value={x} onChange={...}`, no
				// `states` array) still names its attribute in `value`; resolve it the
				// same way rule 31 resolves a row's `normal` state value instead of
				// hardcoding null and refusing every such row as unresolvable.
				const valueExpr = jsxAttrExpr( node, 'value' );
				rows.push( {
					rowKey: labelText ? slugify( labelText ) : 'standalone-line-' + line,
					line,
					statesCount: isArr ? statesExpr.elements.length : 1,
					attr: isArr ? normalStateAttrName( statesExpr ) : resolveAttrName( valueExpr ),
					hasGradient: isArr
						? statesArrayHasGradient( statesExpr )
						: !! findJsxAttr( node, 'gradientValue' ) ||
						  !! findJsxAttr( node, 'onGradientChange' ),
					via: name,
				} );
			}
		},
	} );

	return rows;
}

function main() {
	const db = loadDbRows();
	const cache = new SourceCache();
	const results = [];

	for ( const dir of blockDirs() ) {
		const slug = 'sgs/' + dir;
		const editFile = path.join( BLOCKS_DIR, dir, 'edit.js' );
		const renderFile = path.join( BLOCKS_DIR, dir, 'render.php' );
		const blockJsonFile = path.join( BLOCKS_DIR, dir, 'block.json' );
		const php = fs.existsSync( renderFile ) ? fs.readFileSync( renderFile, 'utf8' ) : '';
		const blockJson = fs.existsSync( blockJsonFile )
			? JSON.parse( fs.readFileSync( blockJsonFile, 'utf8' ) )
			: null;
		const wrapperRouted = /SGS_Container_Wrapper::render/.test( php );
		// Does this block already hold a scoped selector it emits colour CSS at?
		// That, not a DB column, is what makes the render half mechanical.
		const emitsColour = [
			'sgs_text_colour_decl',
			'sgs_background_paint_decl',
			'sgs_border_gradient_css',
			'sgs_emit_state_colour_css',
			'sgs_colour_value',
		].some( ( h ) => php.includes( h + '(' ) );
		const emitsState = php.includes( 'sgs_emit_state_colour_css' ) || php.includes( ':hover' );

		for ( const row of rowsInFile( cache, editFile ) ) {
			const dbRow = row.attr && db[ slug ] ? db[ slug ][ row.attr ] : null;
			const cssProperty = dbRow ? dbRow.css_property : null;
			const selector = dbRow ? dbRow.derived_selector : null;
			// resolveMechanismFromCssProperty returns { mechanisms: [...], unresolved }
			// — an ARRAY, plural. Reading a singular `.mechanism` off it yields
			// undefined, which is falsy, which silently classified EVERY row as
			// NEEDS-DATA:no-css_property and reported 0% autofixable. Verified the
			// real shape by calling the function, not by assuming it.
			// It is plural on purpose: one css_property can legitimately map to more
			// than one mechanism (css_property 'color' is shared by genuine text and
			// by SVG-icon fill-via-currentColor).
			const mech = resolveMechanismFromCssProperty( cssProperty );
			const mechanisms = mech.unresolved ? [] : mech.mechanisms || [];
			const mechanism = mechanisms.length ? mechanisms.join( '|' ) : null;

			const needsHover = row.statesCount < 2;
			// Shadow has no gradient form — exempt BY MECHANISM, never per block.
			const needsGradient = ! row.hasGradient && ! mechanisms.includes( 'shadow' );

			// Bug 1 — a declared, real-reasoned block.json colourExemptions entry
			// suppresses the corresponding need, with rule 31's own semantics.
			const statesExempt = needsHover && isStatesExempt( blockJson, row.rowKey, row.attr );
			const gradientExempt = needsGradient && isGradientExempt( blockJson, row.rowKey );
			const effectiveNeedsHover = needsHover && ! statesExempt;
			const effectiveNeedsGradient = needsGradient && ! gradientExempt;

			let verdict;
			if ( ! effectiveNeedsHover && ! effectiveNeedsGradient ) {
				if ( statesExempt || gradientExempt ) {
					const tags = [];
					if ( statesExempt ) tags.push( 'states' );
					if ( gradientExempt ) tags.push( 'gradient' );
					// Own clearly-labelled bucket — never silently folded into
					// CONFORMANT (a different, unexempted claim) nor dropped.
					verdict = 'EXEMPT:declared-' + tags.join( '+' );
				} else {
					verdict = 'CONFORMANT';
				}
			} else if ( ! row.attr ) {
				verdict = 'REFUSED:unresolvable-attr';
			} else if ( ! mechanism ) {
				verdict = 'REFUSED:no-css_property';
			} else if ( effectiveNeedsGradient && ! gradientExtensibility( php, row.attr ).extensible ) {
				// A row needing a GRADIENT is only autofixable if its EXISTING paint
				// path can actually carry one. This is the check whose absence scoped
				// Task 2 at 38 rows and delivered 2: 19 of 24 gradient rows paint via a
				// colour-valued CSS custom property, which cannot hold a gradient.
				// The reason is carried in the verdict so a refusal is actionable.
				verdict =
					'REFUSED:gradient-not-extensible:' +
					gradientExtensibility( php, row.attr ).reason;
			} else if ( emitsState ) {
				// Block already emits state-aware colour CSS at its own selector:
				// a shared helper adds the hover variant at that SAME selector.
				verdict = 'AUTOFIXABLE:helper-at-existing-selector';
			} else if ( emitsColour ) {
				// Selector exists but no state machinery yet — mechanical, but it
				// wires in the state emitter rather than reusing one.
				verdict = 'AUTOFIXABLE:wire-state-emitter';
			} else if ( wrapperRouted ) {
				verdict = 'AUTOFIXABLE:wrapper-emits';
			} else {
				verdict = 'REFUSED:block-emits-no-colour-css';
			}

			results.push( {
				block: slug,
				...row,
				cssProperty,
				mechanism,
				selector,
				wrapperRouted,
				emitsColour,
				emitsState,
				needsHover: effectiveNeedsHover,
				needsGradient: effectiveNeedsGradient,
				needsHoverRaw: needsHover,
				needsGradientRaw: needsGradient,
				statesExempt,
				gradientExempt,
				verdict,
			} );
		}
	}

	if ( process.argv.includes( '--json' ) ) {
		process.stdout.write( JSON.stringify( { rows: results }, null, 1 ) );
		return;
	}

	const counts = {};
	for ( const r of results ) counts[ r.verdict ] = ( counts[ r.verdict ] || 0 ) + 1;
	// EXEMPT rows are neither a backlog item nor a plain CONFORMANT claim — they
	// stay OUT of the non-conformant denominator (an accepted exception is not
	// outstanding work) but stay IN `results`/`counts` above, so the total row
	// count and the printed table both still carry them. Never silently dropped.
	const nonConf = results.filter(
		( r ) => r.verdict !== 'CONFORMANT' && ! r.verdict.startsWith( 'EXEMPT' )
	);
	const blocks = new Set( results.map( ( r ) => r.block ) ).size;

	console.log(
		'\ncolour-conformance SURVEY — ' + results.length + ' colour rows across ' + blocks + ' blocks\n'
	);
	Object.entries( counts )
		.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
		.forEach( ( [ k, v ] ) => console.log( '  ' + String( v ).padStart( 4 ) + '  ' + k ) );

	const fixable = Object.entries( counts ).filter( ( [ k ] ) => k.startsWith( 'AUTOFIXABLE' ) ).reduce( ( a, [ , v ] ) => a + v, 0 );
	const pct = nonConf.length ? Math.round( ( fixable / nonConf.length ) * 100 ) : 0;
	console.log(
		'\n  of ' + nonConf.length + ' non-conformant rows, ' + fixable +
		' are AUTOFIXABLE (' + pct + '%)'
	);
	console.log( '  the rest are REFUSED with a named reason — never guessed.\n' );

	const byBlock = {};
	for ( const r of nonConf ) {
		byBlock[ r.block ] = byBlock[ r.block ] || { fix: 0, data: 0 };
		if ( r.verdict.startsWith( 'AUTOFIXABLE' ) ) byBlock[ r.block ].fix++;
		else byBlock[ r.block ].data++;
	}
	console.log( '  top blocks (autofixable / needs-data):' );
	Object.entries( byBlock )
		.sort( ( a, b ) => b[ 1 ].fix + b[ 1 ].data - ( a[ 1 ].fix + a[ 1 ].data ) )
		.slice( 0, 12 )
		.forEach( ( [ b, c ] ) =>
			console.log(
				'    ' + b.padEnd( 26 ) + String( c.fix ).padStart( 3 ) + ' / ' + c.data
			)
		);
	console.log();
}

// ---------------------------------------------------------------------------
// --self-test — synthetic fixtures only, never touches the real block tree.
// Modelled on scripts/colour-codemod/fix.js's own self-test section (assert()
// + check() + PASS/FAIL log), including MANDATORY negative controls per fix.
// ---------------------------------------------------------------------------
function assert( cond, msg ) {
	if ( ! cond ) throw new Error( 'SELF-TEST FAILED: ' + msg );
}

function runSelfTest() {
	const os = require( 'os' );
	let failures = 0;

	function check( label, fn ) {
		try {
			fn();
			console.log( '  PASS  ' + label );
		} catch ( e ) {
			failures++;
			console.log( '  FAIL  ' + label + '\n        ' + e.message );
		}
	}

	// ── Bug 1 — declared colourExemptions ──────────────────────────────────
	check( 'a real-reasoned gradient exemption is honoured', () => {
		const blockJson = {
			supports: {
				sgs: {
					colourExemptions: {
						text: {
							rule: 'gradient',
							reason: 'A text gradient needs background-clip:text, which hijacks this element\'s own background box.',
						},
					},
				},
			},
		};
		assert( isGradientExempt( blockJson, 'text' ) === true, 'expected the declared exemption to be honoured' );
	} );
	check( 'NEGATIVE CONTROL — a boilerplate reason does NOT exempt', () => {
		const blockJson = {
			supports: {
				sgs: { colourExemptions: { text: { rule: 'gradient', reason: 'seeded on 2026-01-01.' } } },
			},
		};
		assert( isGradientExempt( blockJson, 'text' ) === false, 'a seed-template reason must not suppress the finding' );
	} );
	check( 'NEGATIVE CONTROL — a too-short reason does NOT exempt', () => {
		const blockJson = {
			supports: { sgs: { colourExemptions: { text: { rule: 'gradient', reason: 'no.' } } } },
		};
		assert( isGradientExempt( blockJson, 'text' ) === false, 'a too-short reason must not suppress the finding' );
	} );
	check( 'NEGATIVE CONTROL — states exemption REFUSED when <attr>Hover exists', () => {
		const blockJson = {
			attributes: { colourTextHover: { type: 'string' } },
			supports: {
				sgs: {
					colourExemptions: {
						colourText: { rule: 'states', reason: 'A real, specific, non-boilerplate reason here.' },
					},
				},
			},
		};
		assert(
			isStatesExempt( blockJson, 'colourText', 'colourText' ) === false,
			'a states exemption must be refused when the block already declares the matching Hover attribute'
		);
	} );
	check( 'a states exemption without a matching Hover attribute IS honoured', () => {
		const blockJson = {
			attributes: {},
			supports: {
				sgs: {
					colourExemptions: {
						panelBg: { rule: 'states', reason: 'A drawer panel background cannot be hovered by definition.' },
					},
				},
			},
		};
		assert( isStatesExempt( blockJson, 'panelBg', 'panelBg' ) === true, 'expected the exemption to be honoured' );
	} );

	// ── Bug 2 — helper-built descriptor + aliased component class ──────────
	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-colour-survey-selftest-' ) );

	function writeFixture( name, editJs ) {
		const dir = path.join( tmpRoot, name );
		fs.mkdirSync( dir, { recursive: true } );
		const file = path.join( dir, 'edit.js' );
		fs.writeFileSync( file, editJs, 'utf8' );
		return file;
	}

	check( 'a states={ descriptor.states } helper-built row is resolved', () => {
		const file = writeFixture(
			'helper-descriptor',
			`import { fillRow, DesignTokenPicker } from '../../components';
export default function Edit( { attributes, setAttributes } ) {
	const numberBackgroundRow = fillRow( {
		key: 'numberBackground',
		label: 'Number background colour',
		attrs: { base: 'numberBackground', hover: 'numberBackgroundHover', gradient: 'numberBackgroundGradient' },
		attributes,
		setAttributes,
	} );
	return (
		<DesignTokenPicker label={ numberBackgroundRow.label } states={ numberBackgroundRow.states } />
	);
}
`
		);
		const cache = new SourceCache();
		const rows = rowsInFile( cache, file );
		assert( rows.length === 1, 'expected exactly one row, got ' + rows.length );
		assert( rows[ 0 ].attr === 'numberBackground', 'expected attr numberBackground, got ' + rows[ 0 ].attr );
		assert( rows[ 0 ].statesCount === 2, 'expected statesCount 2 (base+hover), got ' + rows[ 0 ].statesCount );
	} );

	check( 'a <TextRowControl> local ternary alias of DesignTokenPicker/GradientCapableColourControl is scanned', () => {
		const file = writeFixture(
			'aliased-component',
			`import { textRow, DesignTokenPicker, GradientCapableColourControl } from '../../components';
export default function Edit( { attributes, setAttributes } ) {
	const textRowDescriptor = textRow( {
		key: 'text',
		label: 'Row text colour',
		attrs: { base: 'textColour', gradient: 'textColourGradient' },
		attributes,
		setAttributes,
	} );
	const TextRowControl = textRowDescriptor.gradientCapable
		? GradientCapableColourControl
		: DesignTokenPicker;
	return (
		<TextRowControl label={ textRowDescriptor.label } states={ textRowDescriptor.states } />
	);
}
`
		);
		const cache = new SourceCache();
		const rows = rowsInFile( cache, file );
		assert( rows.length === 1, 'expected exactly one row from the aliased mount, got ' + rows.length );
		assert( rows[ 0 ].attr === 'textColour', 'expected attr textColour, got ' + rows[ 0 ].attr );
	} );

	check( 'NEGATIVE CONTROL — an unresolvable identifier still falls through cleanly (no crash, no phantom row)', () => {
		const file = writeFixture(
			'unresolvable-identifier',
			`import { DesignTokenPicker } from '../../components';
export default function Edit() {
	return (
		<DesignTokenPicker label="X" states={ someUndeclaredIdentifier } />
	);
}
`
		);
		const cache = new SourceCache();
		const rows = rowsInFile( cache, file );
		assert( rows.length === 1, 'expected the row to still be counted via the fallback path, got ' + rows.length );
		assert( rows[ 0 ].attr === null, 'an unresolvable identifier must not be guessed at — expected null attr' );
	} );

	// ── Bug 4 — legacy single-value API attribute resolution ───────────────
	check( 'a legacy value={ overlayColour } picker resolves its attribute', () => {
		const file = writeFixture(
			'legacy-value',
			`import { DesignTokenPicker } from '../../components';
export default function Edit( { attributes, setAttributes } ) {
	const { overlayColour } = attributes;
	return (
		<DesignTokenPicker
			label="Overlay colour"
			value={ overlayColour }
			onChange={ ( val ) => setAttributes( { overlayColour: val ?? '' } ) }
		/>
	);
}
`
		);
		const cache = new SourceCache();
		const rows = rowsInFile( cache, file );
		assert( rows.length === 1, 'expected exactly one row, got ' + rows.length );
		assert( rows[ 0 ].attr === 'overlayColour', 'expected attr overlayColour, got ' + rows[ 0 ].attr );
	} );

	check( 'NEGATIVE CONTROL — a nested member-access value is NOT guessed at (documented blind spot)', () => {
		const file = writeFixture(
			'legacy-value-nested',
			`import { DesignTokenPicker } from '../../components';
export default function Edit( { attributes, setAttributes } ) {
	return (
		<DesignTokenPicker
			label="X"
			value={ attributes.asideSeparator?.colour }
			onChange={ () => {} }
		/>
	);
}
`
		);
		const cache = new SourceCache();
		const rows = rowsInFile( cache, file );
		assert( rows.length === 1, 'expected exactly one row, got ' + rows.length );
		assert( rows[ 0 ].attr === null, 'a nested member-access value must not be resolved — expected null attr' );
	} );

	fs.rmSync( tmpRoot, { recursive: true, force: true } );

	// ── Bug 3(a) — composer-map helpers ─────────────────────────────────────
	check( 'sgs_fill_states_css with a wired gradient map is extensible', () => {
		const php = `<?php
$sgs_ilist_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
`;
		const r = gradientExtensibility( php, 'backgroundColour' );
		assert( r.extensible === true, 'expected extensible, got refusal: ' + r.reason );
	} );
	check( 'NEGATIVE CONTROL — composer-map helper for a DIFFERENT base attr does not over-match', () => {
		const php = `<?php
$x = sgs_fill_states_css( $sel, $attributes, array( 'base' => 'someOtherAttr', 'gradient' => 'someOtherAttrGradient' ) );
`;
		const r = gradientExtensibility( php, 'backgroundColour' );
		assert( r.extensible === false, 'must not match a map keyed on a different attribute' );
	} );
	check( 'NEGATIVE CONTROL — composer-map helper with NO gradient key is not extensible via this path', () => {
		const php = `<?php
$x = sgs_border_states_css( $sel, $attributes, array( 'base' => 'borderColour', 'width' => '1px' ) );
`;
		const r = gradientExtensibility( php, 'borderColour' );
		assert( r.extensible === false, 'a map with no gradient key must not be reported extensible' );
	} );

	// ── Bug 3(b) — sgs_button_element_style_css prefix ──────────────────────
	check( 'sgs_button_element_style_css prefix derivation is extensible for ColourBackground/Text/Border', () => {
		const php = `<?php
$sgs_card_typo_css .= sgs_button_element_style_css(
	$attributes,
	'cta',
	'.' . $sgs_card_uid . ' .sgs-product-card__cta--primary',
	true
);
`;
		for ( const suffix of [ 'ColourBackground', 'ColourText', 'ColourBorder' ] ) {
			const r = gradientExtensibility( php, 'cta' + suffix );
			assert( r.extensible === true, 'expected extensible for cta' + suffix + ', got: ' + r.reason );
		}
	} );
	check( 'NEGATIVE CONTROL — sgs_button_element_style_css with a different prefix does not over-match', () => {
		const php = `<?php
$x = sgs_button_element_style_css( $attributes, 'close', $sel, true, true );
`;
		const r = gradientExtensibility( php, 'ctaColourBackground' );
		assert( r.extensible === false, 'must not match a different button-element prefix' );
	} );

	// ── Bug 3(c) — gradient-only-arg helper (coordinator-flagged) ───────────
	check( 'sgs_svg_stroke_gradient keyed on the sibling Gradient attr is extensible (sgs/star-rating shape)', () => {
		const php = `<?php
$star_colour_gradient  = (string) ( $attributes['starColourGradient'] ?? '' );
$star_fill_grad = sgs_svg_stroke_gradient( $star_colour_gradient, $uid . '-star-grad', 'fill' );
`;
		const r = gradientExtensibility( php, 'starColour' );
		assert( r.extensible === true, 'expected extensible, got refusal: ' + r.reason );
	} );
	check( 'sgs_svg_stroke_gradient direct-arg form (no bound local) is extensible', () => {
		const php = `<?php
$grad = sgs_svg_stroke_gradient( $attributes['emptyColourGradient'] ?? '', $id, 'fill' );
`;
		const r = gradientExtensibility( php, 'emptyColour' );
		assert( r.extensible === true, 'expected extensible, got refusal: ' + r.reason );
	} );
	check( 'NEGATIVE CONTROL — sgs_svg_stroke_gradient for a DIFFERENT attr does not over-match', () => {
		const php = `<?php
$x = (string) ( $attributes['otherThingGradient'] ?? '' );
$g = sgs_svg_stroke_gradient( $x, $id, 'fill' );
`;
		const r = gradientExtensibility( php, 'starColour' );
		assert( r.extensible === false, 'must not match a different attribute\'s gradient sibling' );
	} );

	// ── Bug 3 negative-evidence widening — multi-hop custom-property trace ──
	check( 'a 2-hop colour-valued custom property chain is labelled specifically (sgs/mega-panel shape)', () => {
		const php = `<?php
$panel_bg_raw = isset( $attributes['panelBg'] ) ? (string) $attributes['panelBg'] : '';
$panel_bg_value = '' !== $panel_bg_raw ? sgs_colour_value( $panel_bg_raw ) : '';
$css = '--sgs-mm-panel-bg:' . $panel_bg_value . ';';
`;
		const r = gradientExtensibility( php, 'panelBg' );
		assert(
			r.extensible === false && r.reason === 'paints-via-colour-valued-custom-property',
			'expected the specific custom-property reason, got: ' + JSON.stringify( r )
		);
	} );
	check( 'a foreach attr-keyed custom-property map is labelled specifically (sgs/tabs shape)', () => {
		const php = `<?php
$colour_props = array( 'tabTextColour' => '--sgs-tab-text' );
foreach ( $colour_props as $attr => $prop ) {
	if ( ! empty( $attributes[ $attr ] ) ) {
		$css_vars[] = $prop . ':' . sgs_colour_value( $attributes[ $attr ] );
	}
}
`;
		const r = gradientExtensibility( php, 'tabTextColour' );
		assert(
			r.reason === 'paints-via-colour-valued-custom-property',
			'expected the specific custom-property reason, got: ' + r.reason
		);
	} );
	check( 'a foreach css-var-keyed custom-property map is labelled specifically (sgs/product-search shape)', () => {
		const php = `<?php
$sgs_ps_colour_attrs = array( '--sgs-ps-input-border' => $attributes['inputBorderColour'] ?? '' );
foreach ( $sgs_ps_colour_attrs as $prop => $val ) {
	$decls[] = $prop . ':' . sgs_colour_value( $val );
}
`;
		const r = gradientExtensibility( php, 'inputBorderColour' );
		assert(
			r.reason === 'paints-via-colour-valued-custom-property',
			'expected the specific custom-property reason, got: ' + r.reason
		);
	} );
	check( 'NEGATIVE CONTROL — multi-hop trace does not promote an unrelated attribute', () => {
		const php = `<?php
$other_raw = isset( $attributes['otherAttr'] ) ? (string) $attributes['otherAttr'] : '';
$other_value = sgs_colour_value( $other_raw );
$css = '--sgs-x:' . $other_value . ';';
`;
		const r = gradientExtensibility( php, 'panelBg' );
		assert(
			r.reason === 'no-gradient-capable-paint-path-found',
			'must not attribute an unrelated chain\'s custom-property blocker to this attr'
		);
	} );

	// ── Growth-contract self-checks (coordinator's caution 1) ───────────────
	check( 'GRADIENT_ONLY_ARG_HELPERS still names sgs_svg_stroke_gradient', () => {
		assert(
			GRADIENT_ONLY_ARG_HELPERS.includes( 'sgs_svg_stroke_gradient' ),
			'sgs_svg_stroke_gradient must stay listed — add any NEW gradient-only-arg helper here'
		);
	} );
	check( 'COMPOSER_MAP_HELPERS still names all five verified composers', () => {
		for ( const h of [ 'sgs_fill_decls', 'sgs_fill_states_css', 'sgs_text_decls', 'sgs_text_states_css', 'sgs_border_states_css' ] ) {
			assert( COMPOSER_MAP_HELPERS.includes( h ), h + ' must stay listed — add any NEW composer helper here' );
		}
	} );

	console.log(
		'\n' + ( failures === 0 ? 'ALL SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED' ) + '\n'
	);
	return failures === 0;
}

/**
 * `--fix [--apply]` — delegate to fix.js as a child process (its engine is
 * untouched; this is a thin CLI merge, not a reimplementation). Runs the
 * census first so a fix run always starts from a fresh classification, then
 * hands off. Exit code propagates so a `--check`-style CI use stays honest.
 */
function runFixDelegate( applyFlag ) {
	main();
	const fixJs = path.join( __dirname, 'fix.js' );
	const args = [ fixJs, '--fix' ];
	if ( applyFlag ) args.push( '--apply' );
	try {
		execFileSync( 'node', args, { stdio: 'inherit' } );
	} catch ( err ) {
		process.exitCode = err.status || 1;
	}
}

/**
 * Library surface for OTHER scripts in this directory (e.g.
 * classify-end-shape.js) that need this file's row-detection + per-attribute
 * tracing primitives. Deliberately does NOT export `main`/`runSelfTest`/
 * `runFixDelegate` — a consumer wanting the census or the fix pipeline should
 * shell out to this file's CLI, not call its entry points as a library (the
 * CLI's own stdout/exit-code contract is the stable interface for that; these
 * are the internals a sibling classifier needs instead, so the row parse is
 * never re-derived a second way).
 */
module.exports = {
	BLOCKS_DIR,
	loadDbRows,
	blockDirs,
	rowsInFile,
	isStatesExempt,
	isGradientExempt,
	gradientExtensibility,
	extractCallArgLists,
	traceBoundVars,
	GRADIENT_CAPABLE_HELPERS,
	GRADIENT_ONLY_ARG_HELPERS,
	COMPOSER_MAP_HELPERS,
};

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		process.exit( runSelfTest() ? 0 : 1 );
	} else if ( process.argv.includes( '--fix' ) ) {
		runFixDelegate( process.argv.includes( '--apply' ) );
	} else {
		main();
	}
}
