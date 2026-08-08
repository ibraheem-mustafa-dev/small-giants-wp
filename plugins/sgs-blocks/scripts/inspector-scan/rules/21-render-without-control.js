'use strict';

// GROUND-TRUTH: spec=.claude/plans/spec-35-control-type-contract.md §"The defect
// register" ("The fourth quadrant: declared + rendered + NO CONTROL") and §11
// field 7 ("Five buckets, not a boolean. The fifth is the fourth quadrant and
// needs the render-without-control rule").
//
// source=file evidence=live-read plugins/sgs-blocks/scripts/check-dead-controls.js
// on 2026-08-08. That script has FIVE checks and NONE of them covers this shape:
//   - CHECK 1/2 fire only when a control EXISTS (`:715` "Attributes that DO have
//     a control ... are explicitly skipped here").
//   - CHECK 4 (`checkFullyDeadAttrs`, `:704`) fires only when there is no control
//     AND no consumption. An attribute that IS consumed is skipped by
//     construction — so the whole of the fourth quadrant is invisible to it.
//     Confirmed empirically in the contract: running CHECK 4 reports 3 dead
//     attrs and sees NONE of the 53.
//   - CHECK 5 is dead ASSIGNMENTS inside render.php, a different shape again.
// This rule is therefore the exact complement of CHECK 4, not a duplicate of it:
//   CHECK 4  = no control AND no render.
//   rule 21  = no control AND render.
//
// EXPECTED POPULATION (declared BEFORE the first live run, per
// rules.json._meta.zeroIsAClaim — derived independently of this file's code, by
// the 2026-08-07 control-type-contract council's per-attribute audit, NOT by
// running anything written here): **53**, composed as
//   hover values across 9 blocks (incl. sgs/gallery: grayscaleHover,
//     shadowHover) ......................................................... 31
//   lineHeight/letterSpacing tiers (button 4, brand-strip 4, text 2) ....... 10
//   physics-canvas ......................................................... 8
//   heading/text boxShadow ................................................. 4
// A live number materially different from 53 is a red flag about THIS RULE, not
// about the framework, and must be reconciled attribute-by-attribute before the
// rule's advisoryReason is written.
//
// ── THE TWO TRAPS (both were walked into during the manual audit; between them
// they produced nearly 54 wrong findings) ────────────────────────────────────
// Trap A — FALSE NEGATIVE from literal-name matching on the RENDER side.
//   `sgs/brand-strip`'s tier attrs never appear verbatim in any PHP file. They
//   are built by `sgs_typography_attr( $prefix, 'LineHeightTablet' )` at
//   includes/helpers-typography.php:90,91,98,99. A literal-name render check
//   scores them "not rendered" and skips them — silently losing 4 of the 10
//   typography findings.
// Trap B — FALSE POSITIVE from literal-name matching on the CONTROL side.
//   `fontSizeTablet` has a real, working control, but its name is never written
//   out: src/components/TypographyControls.js:144 builds it as
//   `typographyAttrName( prefix, 'FontSizeTablet' )`. A literal-name control
//   check scores it "no control" and flags it.
//
// Both traps are the SAME phenomenon seen from two sides: an attribute key
// assembled from a variable part and a LITERAL part. So this rule resolves that
// one shape ONCE (`dynamicPartsOf` below) and applies it symmetrically to both
// corpora. Detecting it on the render side kills Trap A; detecting it on the
// control side kills Trap B.
//
// This is deliberately NOT a name-keyed allowlist of known attrs or known
// components. Per the 2026-08-08 methodology guardrail ("Detect by what a
// control DOES, not what it is called" — every gate keyed to a component name
// has a blind spot by construction, and `_KNOWN_CONTROLS` has exactly this bug),
// the corpora are resolved from source: a block's control corpus is its own
// edit.js PLUS the source of every shared component it actually renders
// (resolved via core/components.js the same way rule 18 resolves MediaPicker),
// and its render corpus is its own render files PLUS only those shared includes
// whose own functions it actually calls.

const fs = require( 'fs' );
const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

// Attribute keys that are documentation, not attributes. House convention,
// mirrored from check-dead-controls.js:342-352 (WordPress would register these
// as real schema fields with no consumer — 11 such keys exist library-wide).
const DOC_ATTR_RE = /^(_comment|_note)/;

// Extension-injected attributes. `inspector-scan` structurally CANNOT see
// src/blocks/extensions/ (no extensionsDir in run.js buildCtx; core/roster.js:58-70
// admits only directories containing a block.json), so an extension's controls
// are invisible to this rule and every `sgs*` attr would false-positive. This is
// the documented BLOCKED extension surface, not a judgement about these attrs —
// they are excluded until that plumbing lands, and the exclusion is reported in
// the run summary rather than being silent.
const SYSTEM_ATTR_RE = /^sgs[A-Z_]/;

// ── The WORDPRESS-CORE control surface ──────────────────────────────────────
// A SECOND structurally-invisible control surface, sibling to the extension
// surface above and NOT covered by it (the contract's §"EXTENSION SURFACE axis"
// names only src/blocks/extensions/). When a block.json opts into a core
// `supports` flag, WordPress itself REGISTERS the named attribute and RENDERS
// its control — the anchor field in the Advanced panel, the alignment toolbar,
// the Colour panel, the text-align toolbar. None of that lives in the block's
// edit.js or in any SGS shared component, so a corpus built from those two
// sources can never see it, and every such attribute false-positives.
//
// MEASURED 2026-08-08 against a live `node run.js --json` (280 findings): six
// findings were this shape and every one had a working core control —
//   sgs/heading.anchor + sgs/button.anchor            (supports.anchor)
//   sgs/responsive-logo.align                         (supports.align)
//   sgs/cta-section.textAlign                         (supports.typography.textAlign)
//   sgs/cta-section.backgroundColor + .textColor      (supports.color.background/text)
// Verified by reading each block.json's supports AND confirming edit.js has no
// mention of the attribute — i.e. the control is core's, not a missed local one.
//
// This is NOT a name-keyed allowlist of attributes (the failure mode the rule
// header warns about, and the bug in `_KNOWN_CONTROLS`). The predicate is the
// BLOCK'S OWN DECLARED `supports` — a per-block opt-in read from its block.json
// — and the names below are the fixed attribute keys the WordPress block API
// registers for those flags. A block that does not declare the support gets no
// exclusion, so the axis stays machine-readable per R-31-1.
//
// Deliberately NOT included: spacing / border / dimensions / shadow supports.
// Those serialise into the single `style` object attribute rather than
// registering a named attribute, so they can never produce a finding here and
// listing them would be inert code pretending to be a guard.
function coreSupportedAttrs( supports ) {
	const out = new Set();
	if ( ! supports || typeof supports !== 'object' ) return out;

	if ( supports.anchor ) out.add( 'anchor' );
	// `align` may be `true` or an array of permitted alignments; both register
	// the attribute and both render the toolbar control.
	if ( supports.align ) out.add( 'align' );
	if ( supports.className !== false && supports.customClassName !== false ) {
		out.add( 'className' );
	}
	// `layout` registers a named `layout` attribute plus core's Layout panel.
	if ( supports.layout ) out.add( 'layout' );

	const colour = supports.color;
	if ( colour && typeof colour === 'object' ) {
		if ( colour.background ) out.add( 'backgroundColor' );
		if ( colour.text ) out.add( 'textColor' );
		if ( colour.gradients ) out.add( 'gradient' );
	}

	const type = supports.typography;
	if ( type && typeof type === 'object' ) {
		if ( type.fontSize ) out.add( 'fontSize' );
		if ( type.fontFamily ) out.add( 'fontFamily' );
		if ( type.textAlign ) out.add( 'textAlign' );
	}

	return out;
}

// Files that constitute a block's own RENDER surface — what the framework paints.
const OWN_RENDER_FILES = [ 'render.php', 'view.js', 'save.js', 'style.css' ];

// ── Dynamic key-construction shapes ─────────────────────────────────────────
// Each captures a LITERAL fragment sitting against a concatenation or
// interpolation boundary. A PascalCase capture is a SUFFIX (the variable part is
// the prefix); a camelCase capture before `${` is a PREFIX (the variable part is
// the suffix).

const SUFFIX_SHAPES = [
	// PHP:  $attributes[ $base . 'Tablet' ]      /  $prefix . 'LineHeightTablet'
	/\$\w+\s*\.\s*['"]([A-Z][A-Za-z0-9_]*)['"]/g,
	// PHP:  "{$base}Tablet"
	/\{\$\w+\}([A-Z][A-Za-z0-9_]*)/g,
	// PHP:  sgs_typography_attr( $prefix, 'LineHeightTablet' )
	// JS:   typographyAttrName( prefix, 'FontSizeTablet' )
	/\(\s*[\w$.[\]]+\s*,\s*['"]([A-Z][A-Za-z0-9_]*)['"]\s*\)/g,
	// JS:   `${ base }Tablet`   /   attributes[ `${ side }MediaType` ]
	/\$\{[^}]*\}\s*([A-Z][A-Za-z0-9_]*)/g,
];

const PREFIX_SHAPES = [
	// JS:   `padding${ tier === 'tablet' ? 'Tablet' : 'Mobile' }`
	/`\s*([a-z][A-Za-z0-9_]*)\$\{/g,
	// PHP:  'padding' . $tier
	/['"]([a-z][A-Za-z0-9_]*)['"]\s*\.\s*\$\w+/g,
];

function lcFirst( s ) {
	return s.charAt( 0 ).toLowerCase() + s.slice( 1 );
}

/**
 * Collects every dynamically-constructed key fragment in a corpus.
 * Returns { suffixes: Set<PascalCase>, prefixes: Set<camelCase> }.
 */
function dynamicPartsOf( corpus ) {
	const suffixes = new Set();
	const prefixes = new Set();
	for ( const re of SUFFIX_SHAPES ) {
		re.lastIndex = 0;
		let m;
		while ( ( m = re.exec( corpus ) ) ) suffixes.add( m[ 1 ] );
	}
	for ( const re of PREFIX_SHAPES ) {
		re.lastIndex = 0;
		let m;
		while ( ( m = re.exec( corpus ) ) ) prefixes.add( m[ 1 ] );
	}
	return { suffixes, prefixes };
}

/**
 * Does `attr` resolve against this corpus — either by its literal name, or by a
 * dynamic construction that provably assembles it?
 *
 * Literal match is word-boundaried so `gap` does not match `gapTablet` (that
 * tier-blind join is STOP-17, and is the precise bug that let hero.splitImageTablet
 * ship declared-and-inert past CHECK 1 — see check-dead-controls.js:421-433).
 */
function resolves( attr, corpus, parts ) {
	if ( new RegExp( `\\b${ attr }\\b` ).test( corpus ) ) return true;

	for ( const suffix of parts.suffixes ) {
		// prefix '' case: sgs_typography_attr( '', 'LineHeightTablet' ) -> lineHeightTablet
		if ( attr === lcFirst( suffix ) ) return true;
		// non-empty prefix: <prefix>LineHeightTablet
		if ( attr.length > suffix.length && attr.endsWith( suffix ) ) return true;
	}
	for ( const prefix of parts.prefixes ) {
		// <prefix> + PascalCase remainder, e.g. padding + Tablet
		if ( attr.length > prefix.length && attr.startsWith( prefix ) ) {
			const rest = attr.slice( prefix.length );
			if ( /^[A-Z]/.test( rest ) ) return true;
		}
	}
	return false;
}

function readIfExists( ctx, file ) {
	return fs.existsSync( file ) ? ctx.stripped( file ) || '' : '';
}

/**
 * Every control-component file in the tree, keyed by component name.
 *
 * MEASURED 2026-08-08: resolving shared components from `src/components/` ALONE
 * (which is all core/components.js scans) produced 826 live findings against an
 * independently-derived expected population of 53. The dominant false-positive
 * family was the whole container/grid attribute set — `gap*`, `gridTemplate*`,
 * `contentWidth`, `maxWidth`, `alignContent`, `justifyItems`, `columns*` —
 * across ~22 blocks. Cause: `ContainerWrapperControls`, the façade that owns
 * every one of those controls, does NOT live in `src/components/`. It lives at
 * `src/blocks/container/components/ContainerWrapperControls.js` — a BLOCK-LOCAL
 * shared-component directory that core/components.js has no visibility into
 * (confirmed by grep: 6 blocks import it from `../container/components/`).
 *
 * Resolved HERE rather than by widening core/components.js, deliberately. That
 * module is consumed by rules 01 and 18, whose committed backlogs are 66 and 15;
 * widening its discovery would silently restage both populations — the same
 * "a write with an untraced reader propagates silently" shape that makes the
 * roster/`surfaces.*` coupling dangerous. Blast radius stays inside rule 21.
 */
// Resolved against the REAL src/ tree, never ctx.blocksDir. Shared-component
// discovery is a property of the framework, not of any one fixture — the same
// reasoning core/selftest.js:44-46 gives for resolving components against the
// real src/components/index.js rather than the fixture temp dir. Using
// ctx.blocksDir here would silently yield an EMPTY component map during
// self-test (blocksDir is a temp dir), so the shared-component negative control
// would pass for the wrong reason.
const REAL_SRC = path.resolve( __dirname, '..', '..', '..', 'src' );

let COMPONENT_FILE_CACHE = null;
function allControlComponentFiles() {
	if ( COMPONENT_FILE_CACHE ) return COMPONENT_FILE_CACHE;
	const map = new Map();

	// MEASURED 2026-08-08 (second correction): keying only by FILENAME still left
	// 611 findings, with the whole container/grid family intact even on
	// `sgs/container` itself. Cause: `ContainerWrapperControls.js` is a single
	// 57KB file that also declares and EXPORTS the individual panels
	// (`LayoutPanel`, `WidthPanel`, `BackgroundPanel`, `GridAreaPanel`, …).
	// Blocks import those named exports and render `<LayoutPanel`, never
	// `<ContainerWrapperControls` (confirmed: src/blocks/container/edit.js:20
	// imports FROM that path with no such tag anywhere). A filename-keyed map
	// has no `LayoutPanel` entry, so the file's attribute vocabulary — which
	// does contain `gapTablet` (:475), `flexDirection` (:503,511),
	// `gridTemplateRows*` (:431-433) — was never joined to the block.
	//
	// So index every name a file EXPORTS, plus its filename. This is still
	// "detect by what it does": a block is credited with a component's
	// attribute vocabulary because its JSX renders a name that component file
	// exports, cross-referenced against that file's own source.
	const EXPORT_DECL_RE =
		/export\s+(?:default\s+)?(?:function|const|let|class)\s+([A-Z]\w*)/g;
	const EXPORT_LIST_RE = /export\s*\{([^}]*)\}/g;

	const addDir = ( dir ) => {
		if ( ! fs.existsSync( dir ) ) return;
		for ( const f of fs.readdirSync( dir ) ) {
			if ( ! f.endsWith( '.js' ) || f === 'index.js' ) continue;
			const full = path.join( dir, f );
			const names = new Set( [ path.basename( f, '.js' ) ] );
			let src = '';
			try {
				src = fs.readFileSync( full, 'utf8' );
			} catch ( e ) {
				src = '';
			}
			EXPORT_DECL_RE.lastIndex = 0;
			let m;
			while ( ( m = EXPORT_DECL_RE.exec( src ) ) ) names.add( m[ 1 ] );
			EXPORT_LIST_RE.lastIndex = 0;
			while ( ( m = EXPORT_LIST_RE.exec( src ) ) ) {
				for ( const raw of m[ 1 ].split( ',' ) ) {
					const n = raw.trim().split( /\s+as\s+/ ).pop().trim();
					if ( /^[A-Z]\w*$/.test( n ) ) names.add( n );
				}
			}
			for ( const n of names ) if ( ! map.has( n ) ) map.set( n, full );
		}
	};

	// Framework-wide shared components.
	addDir( path.join( REAL_SRC, 'components' ) );
	// Block-local shared components (src/blocks/<block>/components/*.js).
	const blocksRoot = path.join( REAL_SRC, 'blocks' );
	if ( fs.existsSync( blocksRoot ) ) {
		for ( const b of fs.readdirSync( blocksRoot ) ) {
			addDir( path.join( blocksRoot, b, 'components' ) );
		}
	}

	COMPONENT_FILE_CACHE = map;
	return map;
}

/**
 * The block's CONTROL corpus: its own edit.js plus the SOURCE of every control
 * component it actually renders. Component membership is decided by the block's
 * JSX containing `<ComponentName`, cross-referenced against a component file
 * that was itself read — never by matching an import-path string (rule 18's
 * established technique, widened here from "does it render an <img>" to "what
 * attribute keys does it build").
 */
function controlCorpus( ctx, block ) {
	const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
	const own = readIfExists( ctx, editFile );
	if ( ! own ) return { text: '', editFile, ok: false };

	let text = own;
	for ( const [ name, file ] of allControlComponentFiles() ) {
		if ( ! new RegExp( `<${ name }\\b` ).test( own ) ) continue;
		text += '\n' + readIfExists( ctx, file );
	}
	return { text, editFile, ok: true };
}

/**
 * The block's RENDER corpus: its own render files, plus only those shared
 * includes/*.php files whose OWN declared functions this block actually calls.
 *
 * Admitting every shared include unconditionally would be wrong in the
 * false-positive direction: helpers-typography.php mentions 'LineHeightTablet',
 * so every block declaring a tier attr would score "rendered" whether or not it
 * ever calls the helper. Requiring a real call keeps Trap A closed (brand-strip
 * DOES call it) without inventing render consumption for blocks that don't.
 */
function renderCorpus( ctx, block ) {
	const dir = path.join( ctx.blocksDir, block.tail );
	let own = '';
	for ( const f of OWN_RENDER_FILES ) own += '\n' + readIfExists( ctx, path.join( dir, f ) );

	// Fixture-local `_includes` mirrors selftest.js's `_theme` convention, so the
	// shared-include path is genuinely exercisable in isolation. A rule reading a
	// FIXED absolute real-repo path could never be made to fail in self-test
	// (H6, "a gate that cannot fail reads green forever").
	const fixtureIncludes = path.join( ctx.blocksDir, '_includes' );
	const includesDir = fs.existsSync( fixtureIncludes )
		? fixtureIncludes
		: path.resolve( ctx.blocksDir, '..', '..', 'includes' );

	let shared = '';
	if ( fs.existsSync( includesDir ) ) {
		for ( const f of fs.readdirSync( includesDir ) ) {
			if ( ! f.endsWith( '.php' ) ) continue;
			const full = path.join( includesDir, f );
			const src = readIfExists( ctx, full );
			if ( ! src ) continue;

			// Admission predicate. MEASURED 2026-08-08: matching any declared
			// `function name(` is too broad to mean anything on its own —
			// class-sgs-container-wrapper.php declares exactly ONE function, the
			// method `render`, so the predicate degenerated to `\brender\s*\(`,
			// which 34 of 84 blocks match. A predicate that loose is the
			// "gate's evidence predicate can be too broad" shape, even when its
			// verdict happens to be right (nav-menu really does call
			// `SGS_Container_Wrapper::render(` at render.php:1436).
			//
			// So a CLASS file must be invoked as a class (`Name::` or
			// `new Name`), and only a genuinely top-level function may be
			// admitted by a bare call.
			let called = false;

			const classRe = /\bclass\s+([A-Za-z_]\w*)/g;
			let m;
			while ( ( m = classRe.exec( src ) ) ) {
				const cls = m[ 1 ];
				if ( new RegExp( `\\b${ cls }\\s*::|new\\s+${ cls }\\b` ).test( own ) ) {
					called = true;
					break;
				}
			}

			if ( ! called && ! /\bclass\s+[A-Za-z_]\w*/.test( src ) ) {
				const fnRe = /^\s*function\s+([a-z_]\w*)\s*\(/gm;
				while ( ( m = fnRe.exec( src ) ) ) {
					if ( new RegExp( `\\b${ m[ 1 ] }\\s*\\(` ).test( own ) ) {
						called = true;
						break;
					}
				}
			}

			if ( called ) shared += '\n' + src;
		}
	}
	return own + shared;
}

module.exports = {
	id: '21-render-without-control',
	checklistItem: null,
	title: 'Every attribute the framework RENDERS has a control the client can reach',
	scope: 'per-block',
	needs: [ 'stripped:edit.js', 'stripped:render.php', 'json:block.json', 'components' ],
	run( ctx, block ) {
		const blockJsonFile = path.join( ctx.blocksDir, block.tail, 'block.json' );
		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is roster-drift/parse-error territory

		const control = controlCorpus( ctx, block );
		if ( ! control.ok ) return []; // no edit.js at all — a different rule's concern

		const render = renderCorpus( ctx, block );
		if ( ! render.trim() ) return []; // nothing renders here, so nothing can be render-without-control

		const controlParts = dynamicPartsOf( control.text );
		const renderParts = dynamicPartsOf( render );

		// Read from the block's OWN declared supports, so the exclusion is a
		// per-block opt-in rather than a global attribute-name allowlist.
		const coreControlled = coreSupportedAttrs( blockJson.data.supports );

		const findings = [];
		for ( const attr of Object.keys( blockJson.data.attributes || {} ) ) {
			if ( DOC_ATTR_RE.test( attr ) ) continue;
			if ( SYSTEM_ATTR_RE.test( attr ) ) continue; // extension surface — structurally invisible here
			if ( coreControlled.has( attr ) ) continue; // WordPress core surface — likewise invisible here
			if ( resolves( attr, control.text, controlParts ) ) continue; // reachable by the client
			if ( ! resolves( attr, render, renderParts ) ) continue; // not rendered -> CHECK 4's territory

			findings.push(
				makeFinding( {
					rule: this.id,
					block: block.slug,
					file: blockJsonFile,
					severity: 'warn',
					detail:
						`"${ attr }" is declared in block.json and IS consumed by this block's render surface ` +
						'(its own render.php/view.js/save.js/style.css, or a shared include it calls), but NO ' +
						'inspector control resolves it — not in edit.js, and not in any shared component this ' +
						'block renders. The framework paints this value and no client can change it.',
					fix:
						`Add an inspector control for "${ attr }" following the matching control contract in ` +
						'.claude/plans/spec-35-control-type-contract.md, OR remove it from block.json and hard-code ' +
						'the rendered value if it was never meant to be client-settable.',
					keyParts: [ attr ],
				} )
			);
		}
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/21-render-without-control',
		mustFlag: [
			'rendered-no-control',
			'rendered-via-shared-include-no-control',
			// Positive twin of `core-supports-provided-control` — same defect
			// shape, no `supports` declared. Proves the core-supports exclusion
			// reads the block's own opt-in rather than skipping the attribute
			// names unconditionally (H6: a gate that cannot fail reads green).
			'core-supports-absent-still-flags',
		],
		mustNotFlag: [
			'rendered-with-control',
			'control-via-dynamic-key',
			'declared-but-not-rendered',
			'control-via-shared-component',
			'core-supports-provided-control',
		],
	},
};
