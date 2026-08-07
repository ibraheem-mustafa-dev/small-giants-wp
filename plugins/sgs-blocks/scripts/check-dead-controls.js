/**
 * check-dead-controls.js
 *
 * STRUCTURAL GUARD (HC2, 2026-06-08) — stops the "dead control" class of bug
 * from regressing. A dead control is an editor control a client can change that
 * does NOTHING to the rendered page: the attribute has a control in edit.js (or
 * a shared controls component) but is never consumed in render.php / save.js /
 * view.js / a known shared wrapper / native supports / the extension system.
 *
 * They arise from migration debt — when a block moves its rendering to child
 * InnerBlocks (FR-22-6) or to WP-native supports, the old parent control is left
 * pointing at a now-dead attribute. The HC2 audit found 34 of them across 8
 * blocks. This guard is the Rule-10 structural defence so the next migration
 * can't silently re-introduce the problem.
 *
 * TWO CHECKS
 * ----------
 *  CHECK 1 (per block): every attribute a block's OWN edit.js writes via
 *    setAttributes({ X: ... }) (incl. responsive attrMap literals) must be
 *    consumed somewhere real for that block.
 *  CHECK 2 (shared component): every attribute the shared
 *    container/components/ContainerWrapperControls.js writes a control for must
 *    be consumed by the shared SGS_Container_Wrapper PHP (or another known
 *    consumer). One dead shared control = dead on EVERY block that mounts it,
 *    so it is validated once here rather than per block.
 *
 * NO HARDCODED DICTS (blub.db 260): the "consumed by the shared wrapper" set is
 * DERIVED at runtime by scanning class-sgs-container-wrapper.php for
 * $attributes['X'] accesses; the shared-control set is derived by scanning
 * ContainerWrapperControls.js. Only the small structural allowlists below are
 * constant, each with a one-line justification.
 *
 * CHECK 4 (per block, added 2026-08-05): a THIRD class of dead attribute sits
 * in the gap between this file and check-dead-pattern-attrs.py — a block.json
 * attribute with NEITHER an editor control (so CHECK 1/2 never see it — they
 * only fire when a control exists) NOR any render consumption (so it isn't
 * the control-without-render shape either). check-dead-pattern-attrs.py only
 * inspects THEME PATTERN markup against block.json; an attribute absent from
 * every pattern is never examined by it. Reuses this file's existing
 * consumption-resolution engine (isConsumed / sharedCorpus / prefixed-helper
 * / live-context / responsive-variant rules) — the SAME rules that already
 * prove `sgs/google-reviews`'s `gap`/`gapTablet`/`gapMobile` are consumed by
 * the shared wrapper (they are textually present in
 * includes/class-sgs-container-wrapper.php, part of sharedCorpus) even though
 * neither attribute has its own control. See checkFullyDeadAttrs() below.
 *
 * CHECK 4 BLIND SPOTS (enumerated 2026-08-05 — read before trusting a "0
 * findings" result for a specific block):
 *   1. JS-only computed-key consumption. If an attribute's ONLY consumer is a
 *      frontend/editor JS file reading a template-literal key (e.g.
 *      `attributes[ \`${side}Suffix\` ]`), CHECK 4 cannot resolve it — only
 *      the PHP shape (`$attributes[ $var . 'Suffix' ]`) is structurally
 *      resolved (isDynamicPrefixConsumed). A rough grep for the JS shape
 *      (`${...}` immediately followed by an identifier) across src/blocks/
 *      (excluding extensions/) hits ~22 files on 2026-08-05 — each is a
 *      candidate for a false positive this check cannot yet clear on its own
 *      merits; every current CHECK 4 finding was hand-verified against this
 *      blind spot before being reported as real backlog (see commit message).
 *   2. src/blocks/extensions/*.js is NOT in CHECK 4's consumption corpus
 *      (only sharedCorpus = includes/*.php + the block's own ownCorpus are
 *      scanned). An attribute consumed only by an extension's JS-side
 *      getSaveContent.extraProps consumer (rather than a shared includes/
 *      PHP file) would false-positive. Low risk in practice — extension
 *      attrs are almost always `sgs*`-prefixed and already exempted via
 *      isSystemAttr() — but a non-`sgs*` attribute an extension reads would
 *      not be caught by that exemption. Unmeasured; 11 extension files exist
 *      on 2026-08-05.
 *   3. theme/sgs-theme/ (patterns, parts, templates, inc/) is NOT in the
 *      consumption corpus. WordPress block patterns are static markup, not
 *      render logic, so this is expected to be a non-issue architecturally —
 *      but it is asserted, not measured, and inc/ does contain PHP that COULD
 *      theoretically read a block attribute directly. Unmeasured.
 *   4. The dynamic-prefix resolver (isDynamicPrefixConsumed) treats ANY
 *      quoted string literal matching the candidate prefix as proof of
 *      consumption, anywhere in the corpus — it does not verify the literal
 *      is actually passed to the SAME function that performs the
 *      concatenation. A corpus containing an unrelated string that happens to
 *      match a prefix could produce a false negative (a genuinely dead attr
 *      wrongly cleared). Bounded risk: this only weakens the gate's ability
 *      to catch a dead attr, never causes a false positive on a live one.
 *
 * BASELINE: scripts/dead-controls-baseline.json lists already-known findings
 * that are accepted (with a reason) so the guard fails ONLY on NET-NEW dead
 * controls. Empty baseline = zero tolerance. To accept a finding, add it to the
 * baseline with a reason; to fix one, wire or remove the control.
 *
 * Usage:
 *   node scripts/check-dead-controls.js          # report (exit 0 unless net-new findings)
 *   node scripts/check-dead-controls.js --check   # same, for prebuild/CI (exit 1 on net-new)
 *   node scripts/check-dead-controls.js --json     # machine-readable findings
 *
 * Wired into `prebuild` / `prestart` in package.json, so `npm run build` FAILS
 * on a net-new dead control (it actually runs — not a dormant --check).
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const INCLUDES_DIR = path.join( ROOT, 'includes' );
const SHARED_CONTROLS_JS = path.join(
	BLOCKS_DIR,
	'container',
	'components',
	'ContainerWrapperControls.js'
);
// CHECK 3 target (Step L, 2026-08-01): src/blocks/extensions/*.js registers
// attributes on other blocks via `blocks.registerBlockType` JS filters, not a
// block.json — so CHECK 1 (which iterates block DIRECTORIES and explicitly
// skips `extensions`) never reaches this surface at all, and neither has any
// other guard in this project. That is the exact gap Spec 38's inspector
// panels (fx.js's "Scroll & effects" panel foremost) shipped through.
const EXTENSIONS_DIR = path.join( BLOCKS_DIR, 'extensions' );
const BASELINE_FILE = path.join( __dirname, 'dead-controls-baseline.json' );

// ---------------------------------------------------------------------------
// Structural allowlists (constant, each justified). NOT lookup dicts of
// per-block behaviour — those are derived from source below.
// ---------------------------------------------------------------------------

// Attribute-name prefixes that are consumed by a system OTHER than the block's
// own render path, so they are never "dead controls" in this guard's scope:
//  sgs*  — cross-block editor extensions (animation/visibility/hover/etc.),
//          validated by generate-extension-attributes.js, consumed server-side
//          via register_block_type_args. (Different gate owns these.)
const SYSTEM_ATTR_PREFIXES = [ 'sgs' ];

// Attribute names that are ALWAYS editor-only by design (drive allowedBlocks,
// templates, or other editor-side behaviour) and legitimately have no render
// consumption. Keep this list tiny and justified (Spec 22 BY-DESIGN).
const EDITOR_ONLY_ATTRS = new Set( [
	'templateMode', // container: drives allowedBlocks in the editor (Spec 22 BY-DESIGN).
] );

// Extension attributes that are BY-DESIGN editor-only — never emitted as a
// data-attribute / consumed server-side, with the design decision documented
// at the point that would otherwise consume them. Keep tiny and justified,
// same discipline as EDITOR_ONLY_ATTRS above (this is CHECK 3's own version
// of that allowlist, kept separate because the two checks scan different
// corpora and a block-attr name could coincidentally collide).
const EXTENSION_EDITOR_ONLY_ATTRS = new Set( [
	// fx/Scroll & effects panel (Spec 38 §7): a preset is a WRITER, not a
	// stored effect parameter — choosing "Dramatic" stamps its whole governed
	// set into the real fx* attributes (fx.js `applyPreset`), and `fxPreset`
	// survives only as a label so the panel can show which preset is still
	// truthfully applied. `includes/fx-attributes.php`'s own FX_ATTR_MAP
	// docblock states this explicitly: "fxPreset is ABSENT on purpose... a
	// preset writes its values into the params above, so emitting the label
	// too would ship a data attribute no runtime reads." Confirmed absent
	// from FX_ATTR_MAP (2026-08-01).
	'fxPreset',
] );

// Object-literal keys that show up inside setAttributes()-adjacent callbacks
// (e.g. MediaUpload onSelect `{ id, url, alt }`, ternary results `? false : x`)
// but are never attribute names. Filtered from the controlled set so they don't
// masquerade as dead controls.
const KEY_NOISE = new Set( [ 'id', 'url', 'alt', 'true', 'false', 'null', 'undefined' ] );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

// The real set of extension (`sgs*`) attributes, loaded from the generated
// register-side file. Populated in main(); an `sgs`-prefixed attr is exempt ONLY
// if it is a genuine registered extension attr — NOT merely because it starts
// with `sgs` (a normal-but-dead attr named e.g. `sgsFooColour` must still be
// checked). adversarial-council Guard-Skeptic M1, 2026-06-08.
let EXTENSION_ATTRS = new Set();

/**
 * Parse the extension-attribute names from includes/extension-attributes.generated.php
 * (lines like `'sgsName' => array( ... ),`). Falls back to the empty set if the
 * file is absent (then isSystemAttr uses the prefix heuristic as a safety net).
 */
function loadExtensionAttrs() {
	const src = readIfExists(
		path.join( INCLUDES_DIR, 'extension-attributes.generated.php' )
	);
	const set = new Set();
	const re = /['"](sgs[A-Za-z0-9]+)['"]\s*=>/g;
	let m;
	while ( ( m = re.exec( src ) ) !== null ) {
		set.add( m[ 1 ] );
	}
	return set;
}

function isSystemAttr( name ) {
	if ( EXTENSION_ATTRS.size > 0 ) {
		return EXTENSION_ATTRS.has( name );
	}
	// Fallback only when the generated file is missing: the prefix heuristic.
	return SYSTEM_ATTR_PREFIXES.some(
		( pre ) => name.startsWith( pre ) && name.length > pre.length && /[A-Z]/.test( name[ pre.length ] )
	);
}

/**
 * Collect every attribute name written via setAttributes(...) in a JS source.
 * Catches three shapes used across the block library:
 *   setAttributes( { foo: val } )            -> foo
 *   setAttributes( { [ attr ]: val } ) with  -> resolved from nearby attrMap literals
 *     const attrMap = { desktop: 'foo', tablet: 'bar', mobile: 'baz' }
 *   setAttributes( { 'foo': val } )          -> foo
 *
 * Returns a Set of attribute names that have an editor control.
 */
function collectControlledAttrs( src ) {
	const controlled = new Set();
	if ( ! src ) {
		return controlled;
	}

	// Direct object-key writes inside setAttributes({ ... }).
	// Match the first key in each setAttributes call's object literal.
	const setAttrRe = /setAttributes\(\s*\{\s*([^}]*)\}/g;
	let m;
	while ( ( m = setAttrRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		// Literal keys: foo: / 'foo': / "foo":  (but NOT computed [x]: )
		const keyRe = /(?:^|[\s,])(?:['"]?)([A-Za-z_$][\w$]*)(?:['"]?)\s*:/g;
		let k;
		while ( ( k = keyRe.exec( body ) ) !== null ) {
			if ( ! KEY_NOISE.has( k[ 1 ] ) ) {
				controlled.add( k[ 1 ] );
			}
		}
	}

	// Responsive attrMap literals: { desktop: 'foo', tablet: 'bar', mobile: 'baz' }
	// Used with setAttributes({ [ attrMap[ breakpoint ] ]: val }). Treat every
	// string value of such a map as a controlled attr.
	const attrMapRe =
		/\b(?:attrMap|ATTR_MAP)\s*=\s*\{([^}]*)\}/g;
	while ( ( m = attrMapRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		const valRe = /['"]([A-Za-z_$][\w$]*)['"]/g;
		let v;
		while ( ( v = valRe.exec( body ) ) !== null ) {
			controlled.add( v[ 1 ] );
		}
	}

	// House-style single-arg attribute setter: update( 'attrName', value ) — a
	// thin wrapper around setAttributes used in counter/hero/etc. The literal
	// first string argument is the attr being controlled (adversarial-council
	// Spec-Lawyer M1, 2026-06-08).
	const updateRe = /\bupdate\(\s*['"]([A-Za-z_$][\w$]*)['"]/g;
	while ( ( m = updateRe.exec( src ) ) !== null ) {
		controlled.add( m[ 1 ] );
	}

	// Responsive control component props: attrDesktop="foo" attrTablet="fooTablet"
	// attrMobile="fooMobile" — the real attr names arrive as JSX string-literal
	// props on a wrapper (e.g. hero's RRangeControl), so the computed setAttributes
	// key is never a literal (Spec-Lawyer M2, 2026-06-08).
	const attrPropRe =
		/\battr(?:Desktop|Tablet|Mobile|Base)?\s*=\s*['"]([A-Za-z_$][\w$]*)['"]/g;
	while ( ( m = attrPropRe.exec( src ) ) !== null ) {
		controlled.add( m[ 1 ] );
	}

	return controlled;
}

/**
 * Recursively read every .php under includes/ and concatenate it once. This is
 * the SHARED consumption corpus — central processors (forms engine), the
 * container wrapper, render helpers, schema emitters, etc. An attribute consumed
 * by any of these is not a dead control even if its own block dir has no
 * render.php. Read once per run.
 */
function loadSharedCorpus() {
	let buf = '';
	const walk = ( dir ) => {
		if ( ! fs.existsSync( dir ) ) {
			return;
		}
		for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const p = path.join( dir, entry.name );
			if ( entry.isDirectory() ) {
				walk( p );
			} else if ( entry.name.endsWith( '.php' ) ) {
				buf += '\n' + fs.readFileSync( p, 'utf8' );
			}
		}
	};
	walk( INCLUDES_DIR );
	return buf;
}

/**
 * Strip line + block comments from source so an attribute name surviving only
 * in a doc-comment is NOT counted as consumed. Crude but sufficient — handles
 * `//`, `#`, `/* *​/`. Applied to PHP and JS consumption corpora.
 */
function stripComments( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ) // /* ... */
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ) // // ... (avoid http://)
		.replace( /^\s*#[^\n]*/gm, ' ' ); // # ... (PHP line comment)
}

/**
 * Is `attr` consumed anywhere in `corpus`? Word-boundary match so `nameFontSize`
 * does NOT match inside `nameFontSizeTablet`. The corpus is the block's own
 * render/save/view source plus the shared includes corpus, comments stripped.
 */
function isConsumed( attr, corpus ) {
	// Escape nothing needed — attr names are [A-Za-z0-9_$]. Word boundary on both
	// sides; allow the JS/PHP token to be quoted, a property, or an array key.
	const re = new RegExp( '\\b' + attr + '\\b' );
	return re.test( corpus );
}

/**
 * Read a block.json and return the block descriptor. `providesContext` maps a
 * context-key → attribute name (WP block context); `usesContext` is the list of
 * context-keys this block consumes; `ownCorpus` is this block's own render/save/
 * view source (comments stripped) — used to confirm a consumed context-key is
 * actually read by the consuming block.
 */
function readBlock( dir ) {
	const blockJsonPath = path.join( dir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) {
		return null;
	}
	let meta;
	try {
		meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		throw new Error( `Invalid block.json in ${ dir }: ${ e.message }` );
	}
	// House convention (JSON has no comment syntax): a block.json `attributes`
	// key prefixed `_comment` or `_note` is inline documentation, not a real
	// attribute — WordPress would happily register it as a schema field with no
	// consumer, which is exactly the false-positive CHECK 4 measured on
	// 2026-08-05 (11 such keys across the block library, e.g. before-after's
	// `_comment_ssr_nullable`). Excluded once here so every downstream check
	// (CHECK 1-4) sees only real attributes.
	const attrs = new Set(
		Object.keys( meta.attributes || {} ).filter(
			( k ) => ! k.startsWith( '_comment' ) && ! k.startsWith( '_note' )
		)
	);
	const dynamic = fs.existsSync( path.join( dir, 'render.php' ) );
	const editJs = readIfExists( path.join( dir, 'edit.js' ) );
	const usesWrapper = /ContainerWrapperControls/.test( editJs );
	/*
	 * The block's own RENDER corpus.
	 *
	 * Deliberately NOT the three literal filenames render.php / save.js /
	 * view.js this used to read. A block's render layer is routinely split
	 * across partials that render.php `require`s — `sgs/buybox` renders its
	 * product gallery from `gallery-col.php` and its back-in-stock form from
	 * `notify-form.php`, and ships a second view module as `notify-view.js`.
	 * An attribute consumed only in one of those files was invisible here, so
	 * a correctly-wired control got reported as dead: a false positive that
	 * pushes the next person toward the baseline file, which is exactly the
	 * escape hatch this gate exists to deny.
	 *
	 * So the corpus is derived from what the directory CONTAINS: every `.php`
	 * file (all of them are render-side by construction — a block directory has
	 * no other use for PHP), plus `save.js`, plus every `*view*.js` frontend
	 * module.
	 *
	 * `edit.js` and `index.js` stay excluded, and that exclusion is
	 * load-bearing: edit.js is where the CONTROL is declared, so folding it into
	 * the corpus would make every attribute trivially "consumed" and this gate
	 * could never fail again.
	 */
	const ownCorpus = stripComments(
		fs
			.readdirSync( dir, { withFileTypes: true } )
			.filter( ( entry ) => entry.isFile() )
			.map( ( entry ) => entry.name )
			.filter(
				( name ) =>
					name.endsWith( '.php' ) ||
					'save.js' === name ||
					( name.endsWith( '.js' ) && name.includes( 'view' ) )
			)
			.sort()
			.map( ( name ) => readIfExists( path.join( dir, name ) ) )
			.join( '\n' )
	);
	const providesContext = meta.providesContext || {}; // { contextKey: attrName }
	const usesContext = Array.isArray( meta.usesContext ) ? meta.usesContext : [];
	return {
		name: meta.name || path.basename( dir ),
		dir,
		attrs,
		dynamic,
		usesWrapper,
		ownCorpus,
		providesContext,
		usesContext,
	};
}

const BREAKPOINT_SUFFIX_RE = /(Tablet|Mobile|Desktop)$/;
// A token proving a file builds responsive keys dynamically / emits @media — so
// a {base}Tablet/Mobile/Desktop variant whose literal name never appears is
// still consumed via the same responsive mechanism as its (consumed) base.
const BREAKPOINT_TOKEN_RE = /['"`](?:Tablet|Mobile|Desktop)['"`]|@media/;

/**
 * STRICTER breakpoint evidence, for the fully-dead check (2026-08-07).
 *
 * BREAKPOINT_TOKEN_RE accepts a bare `@media` anywhere in the block's own corpus
 * as proof that a `{base}Tablet` attr is consumed. That is far too weak: a block
 * emits @media for a dozen unrelated properties, so the test is effectively
 * "does this block have ANY responsive CSS" — which says nothing about THIS attr.
 *
 * Measured: `sgs/hero.splitImageTablet` had NO editor control and NO render
 * consumption — the exact shape CHECK 4 exists to catch — and CHECK 4 stayed
 * silent for it, because `splitImage` is consumed and hero's render.php is full
 * of @media. The attr shipped declared-and-inert; it was found by hand, not by
 * the gate that owns this class.
 *
 * What legitimately hides a tier attr's literal name is DYNAMIC KEY CONSTRUCTION
 * — `$attributes[ $base . 'Tablet' ]`, `"{$base}Mobile"`, `` `${base}Tablet` ``,
 * or a suffix list the code loops over. Those all leave a tier word adjacent to
 * a concatenation/interpolation boundary, which is what this matches. A plain
 * `@media` does not, and no longer counts.
 *
 * Deliberately NOT swapped into CHECK 1 (line ~610): CHECK 1 BLOCKS THE BUILD,
 * and tightening it could fail the build on blocks nobody has audited yet. CHECK
 * 4 is advisory, so it is the safe place to raise the bar first. The same blind
 * spot does exist in CHECK 1 for a CONTROLLED tier attr with no render — see the
 * count reported by `--tier-audit`, which measures that exposure without
 * changing CHECK 1's behaviour.
 */
const BREAKPOINT_DYNAMIC_RE =
	/[.+]\s*['"`](?:Tablet|Mobile|Desktop)['"`]|\}(?:Tablet|Mobile|Desktop)|['"`](?:Tablet|Mobile|Desktop)['"`]\s*(?:,|\)|\]|=>)/;

// Shared "prefixed attribute set" PHP helpers (Bean R-22-13 pattern): each
// reads $attributes[ $prefix . 'Suffix' ] via string concatenation, so the
// literal attribute name (e.g. "ctaBorderStyle") never appears anywhere in
// source text — only the prefix ('cta') and the suffix ('BorderStyle') do,
// as separate tokens passed to/used inside the helper. A literal-substring
// scan can never match this legitimately-dynamic pattern, so it is resolved
// structurally here: find every call site `helperFn( $attributes, 'prefix',
// ... )` in the corpus and mark `prefix + suffix` consumed for every suffix
// the named helper is documented to read. Keep this list in sync with each
// helper's own doc-comment (helpers-typography.php / helpers-button-style.php).
const PREFIXED_HELPER_SUFFIXES = {
	sgs_typography_css_rule: [
		'FontSize',
		'FontSizeUnit',
		'FontSizeTablet',
		'FontSizeMobile',
		'FontWeight',
		'FontStyle',
		'TextTransform',
		'TextDecoration',
		'LineHeight',
		'LineHeightUnit',
		'LineHeightTablet',
		'LineHeightMobile',
		'LetterSpacing',
		'LetterSpacingUnit',
		'LetterSpacingTablet',
		'LetterSpacingMobile',
	],
	sgs_button_element_style_css: [
		'ColourBackground',
		'ColourText',
		'ColourBorder',
		'ColourBackgroundHover',
		'ColourTextHover',
		'ColourBorderHover',
		'BorderStyle',
		'BorderWidth',
		'BorderRadius',
		'FontWeight',
		'FontSize',
		'Padding',
		'WidthType',
	],
};

/**
 * Scan `corpus` for call sites of every helper in PREFIXED_HELPER_SUFFIXES,
 * extract the literal prefix argument (2nd parameter, e.g. 'cta' / 'title'),
 * and return the set of `prefix + suffix` attribute names each call site
 * consumes. A helper call with a non-literal (computed) prefix is skipped —
 * it can't be resolved statically and is not claimed as consumed.
 *
 * @param {string} corpus PHP source (comments already stripped).
 * @return {Set<string>} Attribute names consumed via a prefixed helper call.
 */
function collectPrefixedHelperConsumed( corpus ) {
	const consumed = new Set();
	for ( const [ fnName, suffixes ] of Object.entries( PREFIXED_HELPER_SUFFIXES ) ) {
		const re = new RegExp( fnName + '\\s*\\(\\s*[^,]+,\\s*[\'"]([A-Za-z0-9_]*)[\'"]', 'g' );
		let m;
		while ( ( m = re.exec( corpus ) ) !== null ) {
			const prefix = m[ 1 ];
			for ( const suffix of suffixes ) {
				const attrName = '' !== prefix ? prefix + suffix : suffix.charAt( 0 ).toLowerCase() + suffix.slice( 1 );
				consumed.add( attrName );
			}
		}
	}
	return consumed;
}

// A generalised version of the R-22-13 prefixed-attribute-set pattern above,
// for the DYNAMIC-prefix shape found live in sgs/before-after's media
// resolver (media-render.php, added 2026-08-05 while building CHECK 4): the
// prefix is not a literal call-site argument to a fixed helper name — it's a
// LOCAL variable ($prefix = 'before' === $modifier ? 'before' : 'after';)
// used to build `$attributes[ $prefix . 'ImageId' ]`. The literal attribute
// name never appears verbatim anywhere in source; only the SUFFIX ('ImageId')
// and the candidate PREFIX values ('before' / 'after', passed as literal
// string args at the resolver's OWN call sites in render.php) appear, as
// separate tokens. Unlike PREFIXED_HELPER_SUFFIXES this needs no per-function
// suffix roster: it is discovered structurally from the `$var . 'Suffix'`
// concatenation shape itself, so it generalises to any block using the same
// dynamic-prefix convention without a new dict entry per block.
const DYNAMIC_PREFIX_SUFFIX_RE = /\$attributes\[\s*\$\w+\s*\.\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g;

/**
 * Collect every SUFFIX used in a `$attributes[ $var . 'Suffix' ]` dynamic-key
 * read anywhere in `corpus`.
 *
 * @param {string} corpus PHP source (comments already stripped).
 * @return {Set<string>} Suffix strings (e.g. 'ImageId', 'MediaType').
 */
function collectDynamicPrefixSuffixes( corpus ) {
	const suffixes = new Set();
	let m;
	DYNAMIC_PREFIX_SUFFIX_RE.lastIndex = 0;
	while ( ( m = DYNAMIC_PREFIX_SUFFIX_RE.exec( corpus ) ) !== null ) {
		suffixes.add( m[ 1 ] );
	}
	return suffixes;
}

/**
 * Is `attr` consumed via the dynamic-prefix-concatenation shape? True only
 * when `attr` ends with a KNOWN dynamic-read suffix AND the remaining prefix
 * portion appears as its OWN quoted string literal somewhere in the same
 * corpus (proving that exact prefix value is genuinely used, not merely a
 * coincidental suffix match on an unrelated attribute name).
 *
 * @param {string}      attr     Candidate attribute name.
 * @param {string}      corpus   PHP source (comments already stripped).
 * @param {Set<string>} suffixes Suffixes collected by collectDynamicPrefixSuffixes().
 * @return {boolean}
 */
function isDynamicPrefixConsumed( attr, corpus, suffixes ) {
	for ( const suffix of suffixes ) {
		if ( attr.length <= suffix.length || ! attr.endsWith( suffix ) ) {
			continue;
		}
		const prefix = attr.slice( 0, -suffix.length );
		if ( ! prefix ) {
			continue;
		}
		const litRe = new RegExp( '[\'"]' + prefix + '[\'"]' );
		if ( litRe.test( corpus ) ) {
			return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// CHECK 1 — per-block dead controls
// ---------------------------------------------------------------------------

function checkBlock( block, wrapperControlled, sharedCorpus, contextConsumed ) {
	const findings = [];
	const editJs = readIfExists( path.join( block.dir, 'edit.js' ) );

	const controlled = collectControlledAttrs( editJs );

	// Consumption corpus for this block: its own render/save/view source plus the
	// shared includes corpus (forms engine, container wrapper, helpers).
	// NOTE: deliberately NOT broadened to all other blocks' sources — generic
	// attr names (title ×91, label ×74…) would collide and mask real dead
	// controls (qc-council Rater C, rule (c) rejected). Cross-block consumption
	// is recognised only via the declared providesContext/usesContext channel.
	const corpus = block.ownCorpus + '\n' + sharedCorpus;
	const prefixedHelperConsumed = collectPrefixedHelperConsumed( corpus );

	for ( const attr of controlled ) {
		// Only attributes actually DECLARED in this block.json count; a stray
		// match (e.g. a child-block prop in a template literal) is not this block's.
		if ( ! block.attrs.has( attr ) ) {
			continue;
		}
		if ( isSystemAttr( attr ) ) {
			continue; // extension attr — different gate
		}
		if ( EDITOR_ONLY_ATTRS.has( attr ) ) {
			continue; // by-design editor-only
		}
		// Wrapper-control attrs surfaced through the shared ContainerWrapperControls
		// are CHECK 2's responsibility, not the block's own.
		if ( block.usesWrapper && wrapperControlled.has( attr ) ) {
			continue;
		}
		// Rule (b) — cross-block context: consumed by a child via a LIVE
		// providesContext→usesContext→render chain (verified upstream).
		if ( contextConsumed.has( attr ) ) {
			continue;
		}
		// Prefixed-attribute-set helper (sgs_typography_css_rule / sgs_button_
		// element_style_css): the literal call site names the prefix, so the
		// full attr name is resolvable even though the helper builds the key
		// via string concatenation and the literal never appears verbatim.
		if ( prefixedHelperConsumed.has( attr ) ) {
			continue;
		}
		// Rule (a) — responsive variant: a {base}Tablet/Mobile/Desktop attr is
		// consumed if its base is consumed AND the BLOCK'S OWN corpus builds
		// responsive keys dynamically / emits @media (the legitimate reason its
		// literal name is absent — e.g. mobile-nav's `$attributes[$base.'Tablet']`
		// loop). The breakpoint token MUST be sought in block.ownCorpus, NOT the
		// shared corpus: includes/ PHP contains @media everywhere, which would make
		// the test globally true and clear genuinely-dead variants (adversarial-
		// council Spec-Lawyer M3 / Guard-Skeptic S2, 2026-06-08).
		const suffix = attr.match( BREAKPOINT_SUFFIX_RE );
		if ( suffix ) {
			const base = attr.slice( 0, -suffix[ 1 ].length );
			if (
				base &&
				isConsumed( base, corpus ) &&
				BREAKPOINT_TOKEN_RE.test( block.ownCorpus )
			) {
				continue;
			}
		}
		if ( ! isConsumed( attr, corpus ) ) {
			findings.push( {
				check: 'block',
				block: block.name,
				attr,
				reason:
					"has an editor control in edit.js but its name appears in none of the block's .php files / save.js / *view*.js / shared includes — nothing renders it",
			} );
		}
	}
	return findings;
}

// ---------------------------------------------------------------------------
// CHECK 2 — shared ContainerWrapperControls vs the shared wrapper consumer
// ---------------------------------------------------------------------------

function checkSharedControls( wrapperControlled, sharedCorpus, declaredAnywhere ) {
	const findings = [];
	for ( const attr of wrapperControlled ) {
		if ( isSystemAttr( attr ) || EDITOR_ONLY_ATTRS.has( attr ) || KEY_NOISE.has( attr ) ) {
			continue;
		}
		// Only real attributes (declared in at least one block.json) — filters
		// stray media-callback keys that slipped through.
		if ( ! declaredAnywhere.has( attr ) ) {
			continue;
		}
		// The shared wrapper is supposed to consume its OWN controls so every block
		// that mounts them gets the effect for free. If the name appears nowhere in
		// the shared includes corpus, the control is dead on every block that does
		// not separately consume it itself.
		if ( ! isConsumed( attr, sharedCorpus ) ) {
			findings.push( {
				check: 'shared',
				block: 'ContainerWrapperControls (shared)',
				attr,
				reason:
					'shared wrapper renders a control for this attr but no shared includes PHP consumes it — dead on EVERY block that mounts the shared controls (unless that block consumes it itself)',
			} );
		}
	}
	return findings;
}

// ---------------------------------------------------------------------------
// CHECK 4 — fully-dead attribute (no control AND no consumption anywhere)
// ---------------------------------------------------------------------------
//
// The blind spot in the gap between this file and check-dead-pattern-attrs.py
// (2026-08-05): CHECK 1 only fires when a CONTROL exists (nothing to check
// otherwise); check-dead-pattern-attrs.py only inspects theme PATTERN markup
// against block.json (an attr absent from every pattern is never examined).
// A block.json attribute that has neither is invisible to both.
//
// This reuses CHECK 1's own consumption-resolution engine — corpus, prefixed-
// helper resolution, live-context, responsive-variant rule — applied to EVERY
// declared attribute, not only the controlled subset. Attributes that DO have
// a control (own edit.js or the shared wrapper) are explicitly skipped here:
// that shape is CHECK 1/2's job, already reported there, and reporting it
// twice under two different check names would double-count the same finding.
//
// NEGATIVE CONTROL (must never fire here): sgs/google-reviews declares `gap`,
// `gapTablet`, `gapMobile` with NO editor control anywhere — the exact shape
// this check exists to catch. They are legitimate: SGS_Container_Wrapper
// (includes/class-sgs-container-wrapper.php, part of sharedCorpus) reads
// `$attributes['gap']` / `['gapTablet']` / `['gapMobile']` directly, so
// isConsumed() finds them and this check correctly does not flag them.

function checkFullyDeadAttrs( block, wrapperControlled, sharedCorpus, contextConsumed ) {
	const findings = [];
	const editJs = readIfExists( path.join( block.dir, 'edit.js' ) );
	const controlled = collectControlledAttrs( editJs );
	const corpus = block.ownCorpus + '\n' + sharedCorpus;
	const prefixedHelperConsumed = collectPrefixedHelperConsumed( corpus );
	const dynamicPrefixSuffixes = collectDynamicPrefixSuffixes( corpus );

	for ( const attr of block.attrs ) {
		if ( isSystemAttr( attr ) ) {
			continue; // extension attr — different gate (generate-extension-attributes.js)
		}
		if ( EDITOR_ONLY_ATTRS.has( attr ) || KEY_NOISE.has( attr ) ) {
			continue; // by-design editor-only, or stray non-attribute key
		}

		// Attrs with a control are CHECK 1/2's responsibility (own edit.js, or the
		// shared wrapper mounted via ContainerWrapperControls). Skip here so a
		// genuinely dead control-bearing attr is reported once, not twice.
		const hasOwnControl = controlled.has( attr );
		const hasWrapperControl = block.usesWrapper && wrapperControlled.has( attr );
		if ( hasOwnControl || hasWrapperControl ) {
			continue;
		}

		// Rule (b) — live cross-block context (same as CHECK 1).
		if ( contextConsumed.has( attr ) ) {
			continue;
		}
		// Prefixed-attribute-set helper (same as CHECK 1).
		if ( prefixedHelperConsumed.has( attr ) ) {
			continue;
		}
		// Dynamic-prefix-concatenation resolver (e.g. sgs/before-after's
		// media-render.php `$attributes[ $prefix . 'ImageId' ]`, where $prefix
		// is a local variable, not a literal call-site argument).
		if ( isDynamicPrefixConsumed( attr, corpus, dynamicPrefixSuffixes ) ) {
			continue;
		}

		let consumed = isConsumed( attr, corpus );
		if ( ! consumed ) {
			// Rule (a) — responsive variant (same as CHECK 1): a {base}Tablet/
			// Mobile/Desktop attr is consumed if its base is consumed AND the
			// block's own corpus builds responsive keys dynamically / emits @media.
			const suffix = attr.match( BREAKPOINT_SUFFIX_RE );
			if ( suffix ) {
				const base = attr.slice( 0, -suffix[ 1 ].length );
				// STRICTER than CHECK 1's rule (a) on purpose — see
				// BREAKPOINT_DYNAMIC_RE. A bare @media is not evidence about THIS
				// attr; dynamic tier-key construction is.
				if (
					base &&
					isConsumed( base, corpus ) &&
					BREAKPOINT_DYNAMIC_RE.test( block.ownCorpus )
				) {
					consumed = true;
				}
			}
		}
		if ( consumed ) {
			continue;
		}

		findings.push( {
			check: 'fully-dead',
			block: block.name,
			attr,
			reason:
				'declared in block.json but has NEITHER an editor control (own edit.js or the ' +
				'shared wrapper) NOR any render consumption (own .php/save.js/*view*.js, shared ' +
				'includes/*.php, a prefixed-helper call, or live block context) — invisible to both ' +
				'check-dead-controls.js CHECK 1/2 (require a control) and check-dead-pattern-attrs.py ' +
				'(only inspects theme pattern markup)',
		} );
	}
	return findings;
}

// ---------------------------------------------------------------------------
// CHECK 3 — extension-registered controls (src/blocks/extensions/*.js)
// ---------------------------------------------------------------------------
//
// Every other check in this file (and check-control-ux.js / audit-inspector-
// conformance.js) is keyed to a block.json + a block DIRECTORY. An extension
// file registers its attributes on OTHER blocks via a `blocks.registerBlockType`
// JS filter and renders its own inspector panel via `editor.BlockEdit` — there
// is no block.json to enumerate and no per-block directory to walk, so CHECK 1
// structurally cannot reach it (it explicitly filters `d.name !== 'extensions'`)
// and no other guard in this project has ever scanned this surface either.
// Confirmed live 2026-08-01: `fxPreset` is the one attribute in this file that
// intentionally has no consumer (see EXTENSION_EDITOR_ONLY_ATTRS above); every
// other fx* / sgs* attribute IS consumed, either by this file's own
// `getSaveContent.extraProps` function (static blocks) or by the matching
// `includes/*.php` file via the `render_block` filter (dynamic blocks) — both
// already fall inside `sharedCorpus`, since that is every .php file under
// `includes/`.

/**
 * Extract a `{ ... }` block starting at `openBraceIndex`, using brace-depth
 * balancing so a nested `}` does not end the match early. Returns null on
 * unbalanced input (malformed source — treat as "not found", never guess).
 *
 * @param {string} text           Full source text.
 * @param {number} openBraceIndex Index of the opening `{`.
 * @return {string|null} The balanced block, or null.
 */
function extractBalancedBraceBlock( text, openBraceIndex ) {
	let depth = 0;
	for ( let i = openBraceIndex; i < text.length; i++ ) {
		if ( text[ i ] === '{' ) {
			depth++;
		} else if ( text[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) {
				return text.slice( openBraceIndex, i + 1 );
			}
		}
	}
	return null;
}

/**
 * Find the body of the function registered as the callback for a given
 * `addFilter( 'hookName', 'namespace/id', fnName )` call, where `fnName` is a
 * classic `function fnName( ... ) { ... }` declaration in the same file.
 *
 * This is deliberately the ONLY shape resolved. Every extension's own
 * getSaveContent.extraProps consumer in this codebase today uses a named
 * function declaration (fx.js `addFxSaveProps`, animation.js
 * `addAnimationSaveProps`, custom-css.js `saveCustomCssAttribute`,
 * custom-spacing.js `applySpacingClasses`, responsive-visibility.js
 * `addVisibilityClasses`) — confirmed by reading each file, not assumed. A
 * file whose consumer is an inline arrow or `const` HOC (none currently is)
 * resolves to '' here rather than guessing a boundary; that file's attrs then
 * fall back to `sharedCorpus` alone, which is correct for the pattern
 * hover-effects.js documents explicitly: no JS-side extraProps at all,
 * consumption is 100% server-side via the `render_block` PHP filter.
 *
 * @param {string} src      Full extension-file source.
 * @param {string} hookName The addFilter hook name, e.g. 'blocks.getSaveContent.extraProps'.
 * @return {string} The callback's function body (braces included), or ''.
 */
function extractFilterCallbackBody( src, hookName ) {
	const hookRe = new RegExp(
		"addFilter\\(\\s*['\"]" +
			hookName.replace( /\./g, '\\.' ) +
			"['\"]\\s*,\\s*['\"][^'\"]*['\"]\\s*,\\s*(\\w+)"
	);
	const hookMatch = hookRe.exec( src );
	if ( ! hookMatch ) {
		return '';
	}
	const fnName = hookMatch[ 1 ];
	const fnRe = new RegExp( 'function\\s+' + fnName + '\\s*\\([^)]*\\)\\s*\\{' );
	const fnMatch = fnRe.exec( src );
	if ( ! fnMatch ) {
		return '';
	}
	const openBraceIndex = fnMatch.index + fnMatch[ 0 ].length - 1;
	return extractBalancedBraceBlock( src, openBraceIndex ) || '';
}

/**
 * Collect controlled attrs for an extension file, recognising the same
 * `setAttributes( { ... } )` shapes `collectControlledAttrs` already knows,
 * PLUS the `setParam( { ... } )` convenience wrapper fx.js defines and
 * documents as "a WRITER, not a filter" that always resolves to a real
 * `setAttributes` call (see fx.js `withFxControls`). A textual alias
 * substitution reuses the one tested regex implementation rather than
 * maintaining a second parallel attribute-key parser that could silently
 * drift from it.
 *
 * @param {string} src Extension-file source.
 * @return {Set<string>} Controlled attribute names.
 */
function collectExtensionControlledAttrs( src ) {
	return collectControlledAttrs( src.replace( /\bsetParam\(/g, 'setAttributes(' ) );
}

/**
 * Pure check function — takes source text directly rather than a file path,
 * so the self-test can exercise the exact same logic against a synthetic
 * fixture without touching the real extensions directory.
 *
 * @param {string}      name          Reporting name, e.g. 'fx.js'.
 * @param {string}      src           Extension-file source (raw, not comment-stripped).
 * @param {string}      sharedCorpus  Comment-stripped concatenation of every includes/*.php file.
 * @param {Set<string>} declaredAttrs The real extension-attribute registry (EXTENSION_ATTRS in
 *                                    production; an injected fixture set in the self-test).
 * @return {Array<Object>} Findings, same shape as CHECK 1/2.
 */
function checkExtensionFileSrc( name, src, sharedCorpus, declaredAttrs ) {
	const findings = [];
	const controlled = collectExtensionControlledAttrs( src );
	const ownSaveCorpus = stripComments(
		extractFilterCallbackBody( src, 'blocks.getSaveContent.extraProps' )
	);
	const corpus = ownSaveCorpus + '\n' + sharedCorpus;

	for ( const attr of controlled ) {
		// Only real, registered extension attributes count — a stray key
		// (e.g. a destructured prop name that happens to look like an
		// object-literal key inside a setAttributes call) is not this
		// check's concern.
		if ( ! declaredAttrs.has( attr ) ) {
			continue;
		}
		if ( EXTENSION_EDITOR_ONLY_ATTRS.has( attr ) ) {
			continue;
		}
		if ( isConsumed( attr, corpus ) ) {
			continue;
		}
		findings.push( {
			check: 'extension',
			block: `extensions/${ name }`,
			attr,
			reason:
				"has a control in this extension's inspector panel but its name appears in neither " +
				"the extension's own getSaveContent.extraProps consumer nor any shared includes/*.php " +
				'— nothing renders it',
		} );
	}
	return findings;
}

/**
 * File-path wrapper around checkExtensionFileSrc for production runs.
 *
 * @param {string} filePath    Absolute path to the extension .js file.
 * @param {string} sharedCorpus Comment-stripped concatenation of every includes/*.php file.
 * @return {Array<Object>} Findings.
 */
function checkExtensionFile( filePath, sharedCorpus ) {
	const src = readIfExists( filePath );
	if ( ! src ) {
		return [];
	}
	return checkExtensionFileSrc( path.basename( filePath ), src, sharedCorpus, EXTENSION_ATTRS );
}

// ---------------------------------------------------------------------------
// CHECK 5 — dead assignment (attribute read into a PHP variable that is then
// never used), advisory (2026-08-06)
// ---------------------------------------------------------------------------
//
// THE DEFECT THIS CLOSES (measured 2026-08-06): sgs/form's `formName` had a
// live editor control (edit.js:97) and two block variations seeding
// translatable copy ("Contact Us", "Newsletter Signup" —
// includes/variations/sgs-form-variations.php) — and NOTHING rendered it.
// render.php DID contain `$form_name = $attributes['formName'] ?? '';`, so
// `isConsumed()` (CHECK 1/2/4's bare word-boundary regex on the attribute
// name) counted `formName` as consumed the moment it saw that text — but the
// assignment target, `$form_name`, was never read again. A client could type
// a form name into the control and nothing happened. "Referenced in
// render.php" is not "reaches output". Fixed live 2026-08-06 (render.php's
// own ACCESSIBLE NAME comment — `formName` now renders as `aria-label`), so
// it is a NEGATIVE control below, not a finding.
//
// THE RULE (all three must hold for an attribute to be flagged):
//  1. At least one `$var = ... $attributes['attr'] ...` assignment exists in
//     the block's OWN render.php.
//  2. The quoted attribute name ('attr' or "attr") appears NOWHERE ELSE in
//     render.php beyond those assignments — the count of quoted occurrences
//     must not exceed the number of matching assignments. A second, direct
//     `$attributes['attr']` read elsewhere (e.g. passed straight into a
//     shared-include helper call) is real consumption and clears the finding
//     via this rule alone.
//  3. EVERY variable the attribute was assigned to is unused afterwards —
//     its total `$var` occurrence count in the file does not exceed the
//     number of times it was assigned.
//
// Comments are stripped before analysis so an attribute name surviving only
// in a docblock/comment can't hide a real dead assignment or fake one.
//
// SCOPE: unlike CHECK 1/2/4, this does NOT consult sharedCorpus, the
// wrapper-controlled set, or live context — it looks ONLY at the block's own
// render.php, because the defect it targets is specifically "the variable
// this file assigned is never read again inside this file". See BLIND SPOTS
// below for what that narrower scope costs — and note it can flag a variable
// as dead even when the underlying ATTRIBUTE is separately alive via a
// helper that re-reads `$attributes[...]` directly elsewhere in the
// codebase (e.g. sgs/gallery's `$trans_duration`/`$trans_easing`, dead as
// variables even though `sgs_transition_vars( $attributes )` on the same
// file reads the raw attributes again) — the finding is still real: those
// specific lines are genuinely unreachable dead code and the editor control
// for them is unverified to do anything without separately auditing the
// helper.
//
// ADVISORY ONLY (CHECK_5_BLOCKS_BUILD = false, mirrors CHECK 4's flip-flag
// pattern): 18 findings exist across the current block library on the day
// this shipped (2026-08-06) — a real backlog to see, not to fail the build
// over. Flip CHECK_5_BLOCKS_BUILD to true only after that backlog is fixed
// or explicitly baselined.
//
// BLIND SPOTS (enumerated 2026-08-06 — read before trusting a "0 findings"
// result for a specific block):
//   1. Own render.php ONLY. CHECK 5 never reads a shared include
//      (includes/*.php) or a required local partial directly, so it cannot
//      see a consumer living there. In practice this is bounded by rule 2:
//      to get the raw value into a shared-include consumer, render.php has
//      to either (a) pass the LOCAL VARIABLE as an argument — which leaves a
//      second `$var` occurrence in render.php's own text, satisfying rule
//      3's "used again" check (real example: sgs/form's
//      `$store_submissions`, assigned then passed into
//      `SGS_Container_Wrapper::render()`'s `extra_attrs` array — a shared-
//      include function — right there in render.php); or (b) re-read
//      `$attributes['attr']` a second time at the call site — which leaves a
//      second quoted occurrence of the attribute name, satisfying rule 2
//      (real example: sgs/gallery's `transitionDuration`/`transitionEasing`
//      — the variable IS flagged, correctly, per the note above). A shared
//      include consuming the value with literally ZERO trace left in
//      render.php's own text is not constructible in ordinary PHP (the
//      value has to get there somehow), so this is a bounded gap, not an
//      open one — but a genuinely dead LOCAL VARIABLE can still coexist with
//      a genuinely alive ATTRIBUTE, as above.
//   2. Cannot follow a variable into a helper's PARAMETER NAME. If render.php
//      calls `some_helper( $form_name )` and `some_helper()`'s own body (in
//      a shared include) never touches its parameter, CHECK 5 correctly
//      raises nothing (the call-site reference satisfies rule 3) — but that
//      would be a DIFFERENT kind of dead code (a dead parameter inside the
//      callee), entirely outside this check's scope. CHECK 5 only proves the
//      LOCAL variable in render.php is referenced again; it cannot prove
//      that downstream reference does anything.
//   3. Object/array destructuring and `extract()` are invisible. A value
//      folded straight into an array literal (`$context['formName'] =
//      $attributes['formName'] ?? ''`) is not matched by the plain
//      `\$var\s*=` assignment shape at all — no finding either way. This
//      check only recognises the scalar-variable assignment shape
//      sgs/form's original `formName` bug used.
//   4. Multiple assignments to the SAME variable name for DIFFERENT
//      attributes in one file (not observed in this library) could
//      undercount "assignedTimes" per attribute if `$var` is reused across
//      two different `$attributes[...]` reads — unmeasured, low risk.
//
// BASELINE: findings flow through the SAME findingKey()/baseline mechanism
// as CHECK 1-4 (`check:block:attr`, check = 'dead-assign'), suppressible via
// scripts/dead-controls-baseline.json.

/**
 * Strip PHP `//`, `#` and `/* *​/` comments from a single render.php source
 * so an attribute name surviving only in a comment can't be mistaken for a
 * real assignment or a real "appears elsewhere" hit. Kept separate from the
 * shared stripComments() (tuned for the mixed PHP/JS multi-file corpus used
 * elsewhere in this script) — CHECK 5 always operates on one PHP file, so a
 * simpler pass is sufficient and easier to reason about in isolation.
 *
 * @param {string} src Raw render.php source.
 * @return {string} Comment-stripped source.
 */
function stripPhpCommentsForAssignmentCheck( src ) {
	return src
		.replace( /\/\*[\s\S]*?\*\//g, ' ' )
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' )
		.replace( /^[ \t]*#[^\n]*/gm, ' ' );
}

/**
 * Find every attribute in `attrs` whose ONLY appearance in `src` is a dead
 * scalar-variable assignment — see the CHECK 5 rule above. Pure function,
 * source in / findings out, so the self-test can exercise it directly
 * against synthetic fixtures without touching disk beyond the fixture files
 * it plants itself.
 *
 * @param {string}               src   Comment-stripped render.php source.
 * @param {Array<string>}        attrs Candidate attribute names (already
 *                                     filtered for system/editor-only/noise).
 * @return {Array<{attr:string, vars:string[]}>} Dead-assignment findings.
 */
function findDeadAssignments( src, attrs ) {
	const out = [];
	for ( const attr of attrs ) {
		const assignRe = new RegExp(
			'\\$([A-Za-z_]\\w*)\\s*=[^;]*\\$attributes\\[\\s*[\'"]' + attr + '[\'"]\\s*\\]',
			'g'
		);
		const vars = [];
		let m;
		while ( ( m = assignRe.exec( src ) ) !== null ) {
			vars.push( m[ 1 ] );
		}
		if ( ! vars.length ) {
			continue; // Rule 1 — no assignment shape found; not this check's concern.
		}

		// Rule 2 — the attribute name must not appear anywhere OTHER than
		// those assignments (a direct re-read elsewhere is real consumption).
		const quoted = ( src.match( new RegExp( '[\'"]' + attr + '[\'"]', 'g' ) ) || [] ).length;
		if ( quoted > vars.length ) {
			continue;
		}

		// Rule 3 — every variable it was assigned to must be unused after
		// assignment.
		const allDead = vars.every( ( v ) => {
			const uses = ( src.match( new RegExp( '\\$' + v + '\\b', 'g' ) ) || [] ).length;
			const assignedTimes = vars.filter( ( x ) => x === v ).length;
			return uses <= assignedTimes;
		} );
		if ( allDead ) {
			out.push( { attr, vars } );
		}
	}
	return out;
}

/**
 * CHECK 5 driver for one block: read its own render.php, strip comments, run
 * findDeadAssignments() over its declared attributes (minus system/editor-
 * only/noise attrs — the same exclusions every other check in this file
 * applies).
 *
 * @param {Object} block Block descriptor from readBlock().
 * @return {Array<Object>} Findings, same shape as CHECK 1/2/4.
 */
function checkDeadAssignments( block ) {
	const renderPath = path.join( block.dir, 'render.php' );
	if ( ! fs.existsSync( renderPath ) ) {
		return [];
	}
	const src = stripPhpCommentsForAssignmentCheck( readIfExists( renderPath ) );

	const candidateAttrs = Array.from( block.attrs ).filter(
		( attr ) => ! isSystemAttr( attr ) && ! EDITOR_ONLY_ATTRS.has( attr ) && ! KEY_NOISE.has( attr )
	);

	return findDeadAssignments( src, candidateAttrs ).map( ( f ) => ( {
		check: 'dead-assign',
		block: block.name,
		attr: f.attr,
		reason:
			`its ONLY appearance in render.php is the assignment $${ f.vars.join( ', $' ) } = ` +
			`$attributes['${ f.attr }'] — the variable is never read afterwards, so nothing ` +
			'reaches output even though the attribute text is textually present in the file',
	} ) );
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return [];
	}
	try {
		const data = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
		return Array.isArray( data.accepted ) ? data.accepted : [];
	} catch ( e ) {
		throw new Error( `Invalid dead-controls-baseline.json: ${ e.message }` );
	}
}

function findingKey( f ) {
	return `${ f.check }:${ f.block }:${ f.attr }`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * --tier-audit (2026-08-07): measure CHECK 1's exposure to the same blind spot
 * CHECK 4 just closed, WITHOUT changing CHECK 1's behaviour.
 *
 * CHECK 1 clears a `{base}Tablet/Mobile/Desktop` attr whenever the base is
 * consumed and the block's own corpus contains ANY breakpoint token — including
 * a bare `@media`. This lists the CONTROLLED tier attrs that survive only
 * because of that weak evidence: each has a control, its base is consumed, its
 * own literal name is NOT consumed, and the block shows no dynamic tier-key
 * construction. Every row is a candidate dead control the build currently
 * passes.
 *
 * Reported, deliberately not enforced: CHECK 1 BLOCKS THE BUILD, so tightening
 * it is a separate, deliberate decision that needs this number first.
 */
function tierAudit( blocks, sharedCorpus, wrapperControlled ) {
	const rows = [];
	for ( const block of blocks ) {
		const editJs = readIfExists( path.join( block.dir, 'edit.js' ) );
		const controlled = collectControlledAttrs( editJs );
		const corpus = block.ownCorpus + '\n' + sharedCorpus;
		for ( const attr of block.attrs ) {
			const suffix = attr.match( BREAKPOINT_SUFFIX_RE );
			if ( ! suffix || isSystemAttr( attr ) ) {
				continue;
			}
			const hasControl =
				controlled.has( attr ) ||
				( block.usesWrapper && wrapperControlled.has( attr ) );
			if ( ! hasControl ) {
				continue; // no control -> CHECK 4's territory, already tightened
			}
			const base = attr.slice( 0, -suffix[ 1 ].length );
			if ( ! base || isConsumed( attr, corpus ) ) {
				continue; // its own name is consumed -> genuinely fine
			}
			if ( ! isConsumed( base, corpus ) ) {
				continue; // base dead too -> CHECK 1 already reports it
			}
			// Survives ONLY on the weak @media evidence?
			if (
				BREAKPOINT_TOKEN_RE.test( block.ownCorpus ) &&
				! BREAKPOINT_DYNAMIC_RE.test( block.ownCorpus )
			) {
				rows.push( `${ block.name } :: ${ attr }` );
			}
		}
	}
	return rows;
}

function main() {
	const check = process.argv.includes( '--check' );
	const asJson = process.argv.includes( '--json' );
	const tierAuditOnly = process.argv.includes( '--tier-audit' );

	EXTENSION_ATTRS = loadExtensionAttrs();
	const sharedCorpus = stripComments( loadSharedCorpus() );
	const wrapperControlled = collectControlledAttrs( readIfExists( SHARED_CONTROLS_JS ) );

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );

	// First pass: read every block + build the union of all declared attribute
	// names (used to filter stray keys out of the shared-controls check).
	const blocks = [];
	const declaredAnywhere = new Set();
	for ( const dir of blockDirs ) {
		const block = readBlock( dir );
		if ( ! block ) {
			continue;
		}
		blocks.push( block );
		block.attrs.forEach( ( a ) => declaredAnywhere.add( a ) );
	}

	if ( tierAuditOnly ) {
		const rows = tierAudit( blocks, sharedCorpus, wrapperControlled );
		process.stdout.write(
			`[check-dead-controls --tier-audit] ${ rows.length } CONTROLLED tier attr(s) ` +
				'cleared by CHECK 1 on bare-@media evidence alone (candidate dead controls ' +
				"the build currently passes; CHECK 1 is NOT changed by this flag):\n"
		);
		rows.forEach( ( r ) => process.stdout.write( `  - ${ r }\n` ) );
		if ( ! rows.length ) {
			process.stdout.write( '  (none — CHECK 1 has no exposure to this blind spot today)\n' );
		}
		process.exit( 0 );
	}

	// Rule (b) prep — LIVE context keys: a context-key is live only if some block
	// lists it in usesContext AND that consumer's own render/save/view actually
	// references the key (a stale providesContext with no live consumer must NOT
	// whitelist its source attr — qc-council Rater C). Then map live keys back to
	// each provider block's source attribute names.
	const liveContextKeys = new Set();
	for ( const b of blocks ) {
		for ( const key of b.usesContext ) {
			if ( isConsumed( key, b.ownCorpus ) ) {
				liveContextKeys.add( key );
			}
		}
	}
	const contextConsumedByBlock = new Map(); // block.name → Set(attrName)
	for ( const b of blocks ) {
		const set = new Set();
		for ( const [ key, attrName ] of Object.entries( b.providesContext ) ) {
			if ( liveContextKeys.has( key ) ) {
				set.add( attrName );
			}
		}
		contextConsumedByBlock.set( b.name, set );
	}

	let findings = [];
	for ( const block of blocks ) {
		findings = findings.concat(
			checkBlock(
				block,
				wrapperControlled,
				sharedCorpus,
				contextConsumedByBlock.get( block.name ) || new Set()
			)
		);
	}
	findings = findings.concat(
		checkSharedControls( wrapperControlled, sharedCorpus, declaredAnywhere )
	);

	// CHECK 3 — extension-registered controls (src/blocks/extensions/*.js).
	// Structurally unreachable from CHECK 1/2 above (see the CHECK 3 docblock).
	const extensionFiles = fs.existsSync( EXTENSIONS_DIR )
		? fs.readdirSync( EXTENSIONS_DIR ).filter( ( f ) => f.endsWith( '.js' ) )
		: [];
	for ( const file of extensionFiles ) {
		findings = findings.concat(
			checkExtensionFile( path.join( EXTENSIONS_DIR, file ), sharedCorpus )
		);
	}

	// CHECK 4 — fully-dead attrs (no control anywhere AND no consumption
	// anywhere). Kept in a SEPARATE array from CHECK 1-3's `findings`: this is a
	// brand-new gate closing a backlog that has never been measured before, so
	// (per the ADVISORY-FIRST rule below) it must not fail builds on day one.
	let fullyDeadFindings = [];
	for ( const block of blocks ) {
		fullyDeadFindings = fullyDeadFindings.concat(
			checkFullyDeadAttrs(
				block,
				wrapperControlled,
				sharedCorpus,
				contextConsumedByBlock.get( block.name ) || new Set()
			)
		);
	}

	// Subtract the baseline (accepted, with reasons). Baseline entries are keyed
	// by `check:block:attr`, so `fully-dead` findings can be individually
	// baselined the same way as CHECK 1-3 findings once triaged.
	// CHECK 5 — dead assignments (attribute assigned into a PHP variable that
	// is then never used). Own render.php only, per block — see the CHECK 5
	// docblock above. Kept in its own array for the same reason CHECK 4's is:
	// a brand-new gate closing a freshly-measured backlog must not fail the
	// build on day one (ADVISORY-FIRST rule below).
	let deadAssignFindings = [];
	for ( const block of blocks ) {
		deadAssignFindings = deadAssignFindings.concat( checkDeadAssignments( block ) );
	}

	const baseline = new Set( loadBaseline().map( findingKey ) );
	const netNew = findings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const accepted = findings.filter( ( f ) => baseline.has( findingKey( f ) ) );
	const fullyDeadNetNew = fullyDeadFindings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const fullyDeadAccepted = fullyDeadFindings.filter( ( f ) => baseline.has( findingKey( f ) ) );
	const deadAssignNetNew = deadAssignFindings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const deadAssignAccepted = deadAssignFindings.filter( ( f ) => baseline.has( findingKey( f ) ) );

	// ADVISORY-FIRST FLAG (2026-08-05): CHECK 4 ships advisory-only — it reports
	// but never fails the build — because its backlog has not yet been triaged
	// to zero (see the script's --self-test output / commit message for the
	// measured count on the day this shipped). Flipping it to blocking later is
	// this ONE line: change `false` to `true`. Do not flip it without first
	// baselining or fixing the then-current backlog, or a correct build starts
	// failing on day one of enforcement.
	const CHECK_4_BLOCKS_BUILD = false;

	// ADVISORY-FIRST FLAG (2026-08-06): CHECK 5 ships advisory-only for the
	// same reason CHECK 4 did — 18 findings exist on the day this shipped
	// (see the script's --self-test output / commit message for the measured
	// count) and have not been triaged to zero. Flip to `true` only after
	// baselining or fixing the then-current backlog.
	const CHECK_5_BLOCKS_BUILD = false;

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify(
				{
					netNew,
					accepted,
					baselineSize: baseline.size,
					fullyDead: { netNew: fullyDeadNetNew, accepted: fullyDeadAccepted, blocking: CHECK_4_BLOCKS_BUILD },
					deadAssign: { netNew: deadAssignNetNew, accepted: deadAssignAccepted, blocking: CHECK_5_BLOCKS_BUILD },
				},
				null,
				2
			) + '\n'
		);
	} else {
		if ( accepted.length ) {
			process.stdout.write(
				`[check-dead-controls] ${ accepted.length } baselined finding(s) (accepted with reason).\n`
			);
		}
		if ( netNew.length ) {
			process.stderr.write(
				`[check-dead-controls] ${ netNew.length } NET-NEW dead control(s):\n`
			);
			for ( const f of netNew ) {
				process.stderr.write(
					`  - [${ f.check }] ${ f.block } :: ${ f.attr } — ${ f.reason }\n`
				);
			}
			process.stderr.write(
				'Fix: WIRE the attr into render (emit its effect) OR REMOVE the control + attr. ' +
					'If genuinely acceptable, add it to scripts/dead-controls-baseline.json with a reason.\n'
			);
		} else {
			process.stdout.write(
				`[check-dead-controls] OK — 0 net-new dead controls across ${ blockDirs.length } blocks ` +
					`+ ${ extensionFiles.length } extension file(s).\n`
			);
		}

		// CHECK 4 report — always printed, ADVISORY (never affects exit code
		// unless CHECK_4_BLOCKS_BUILD is flipped to true).
		if ( fullyDeadAccepted.length ) {
			process.stdout.write(
				`[check-dead-controls] CHECK 4 (advisory): ${ fullyDeadAccepted.length } baselined ` +
					'fully-dead finding(s) (accepted with reason).\n'
			);
		}
		if ( fullyDeadNetNew.length ) {
			process.stdout.write(
				`[check-dead-controls] CHECK 4 (ADVISORY — does not fail the build): ` +
					`${ fullyDeadNetNew.length } fully-dead attribute(s) — no control anywhere AND no ` +
					'render consumption anywhere:\n'
			);
			for ( const f of fullyDeadNetNew ) {
				process.stdout.write( `  - ${ f.block } :: ${ f.attr }\n` );
			}
			process.stdout.write(
				'Fix: WIRE the attr into render, add a control, or REMOVE it from block.json. ' +
					'Or accept it in scripts/dead-controls-baseline.json with a reason.\n'
			);
		} else {
			process.stdout.write(
				'[check-dead-controls] CHECK 4 (advisory): OK — 0 net-new fully-dead attributes.\n'
			);
		}

		// CHECK 5 report — always printed, ADVISORY (never affects exit code
		// unless CHECK_5_BLOCKS_BUILD is flipped to true).
		if ( deadAssignAccepted.length ) {
			process.stdout.write(
				`[check-dead-controls] CHECK 5 (advisory): ${ deadAssignAccepted.length } baselined ` +
					'dead-assignment finding(s) (accepted with reason).\n'
			);
		}
		if ( deadAssignNetNew.length ) {
			process.stdout.write(
				`[check-dead-controls] CHECK 5 (ADVISORY — does not fail the build): ` +
					`${ deadAssignNetNew.length } dead-assignment attribute(s) — the attribute's ONLY ` +
					'appearance in render.php is a PHP variable assignment that is never used afterwards:\n'
			);
			for ( const f of deadAssignNetNew ) {
				process.stdout.write( `  - ${ f.block } :: ${ f.attr }\n` );
			}
			process.stdout.write(
				'Fix: use the assigned variable in output, or REMOVE the dead assignment/control. ' +
					'Or accept it in scripts/dead-controls-baseline.json with a reason.\n'
			);
		} else {
			process.stdout.write(
				'[check-dead-controls] CHECK 5 (advisory): OK — 0 net-new dead-assignment attributes.\n'
			);
		}
	}

	if (
		shouldFailBuild(
			check,
			netNew.length,
			CHECK_4_BLOCKS_BUILD,
			fullyDeadNetNew.length,
			CHECK_5_BLOCKS_BUILD,
			deadAssignNetNew.length
		)
	) {
		process.exit( 1 );
	}
}

/**
 * Pure exit-decision function, extracted so the self-test can assert the
 * CHECK_4_BLOCKS_BUILD flag genuinely changes the exit code BOTH ways without
 * spawning a subprocess or duplicating main()'s logic.
 *
 * @param {boolean} checkFlag           Whether `--check` was passed.
 * @param {number}  netNewLen           CHECK 1-3 net-new finding count (always blocking).
 * @param {boolean} check4BlocksBuild   The CHECK_4_BLOCKS_BUILD flip flag.
 * @param {number}  fullyDeadNetNewLen  CHECK 4 net-new finding count.
 * @param {boolean} [check5BlocksBuild] The CHECK_5_BLOCKS_BUILD flip flag. Defaults to
 *                                      false so existing CHECK 4-only call sites (and the
 *                                      original 4-arg self-test assertions) keep working
 *                                      unchanged.
 * @param {number}  [deadAssignNetNewLen] CHECK 5 net-new finding count. Defaults to 0.
 * @return {boolean} True if the process should exit(1).
 */
function shouldFailBuild(
	checkFlag,
	netNewLen,
	check4BlocksBuild,
	fullyDeadNetNewLen,
	check5BlocksBuild = false,
	deadAssignNetNewLen = 0
) {
	return (
		checkFlag &&
		( netNewLen > 0 ||
			( check4BlocksBuild && fullyDeadNetNewLen > 0 ) ||
			( check5BlocksBuild && deadAssignNetNewLen > 0 ) )
	);
}

// ---------------------------------------------------------------------------
// Self-test (HARD REQUIREMENT, Step L 2026-08-01) — proves CHECK 3 can FAIL.
// ---------------------------------------------------------------------------
//
// A gate that has never been observed to fail reads green forever whether or
// not it is actually checking anything (mistakes.md: "a gate that cannot fail
// reads green forever"). This plants a KNOWN dead control into a synthetic
// fixture, confirms the plant landed on disk, then asserts CHECK 3 catches it
// — alongside a negative control (a genuinely-wired attr that must NOT be
// flagged) and the documented editor-only exemption (fxPreset-shaped, must
// also NOT be flagged). It then runs the same function against the REAL
// extensions directory and reports what it finds, so the "zero false
// positives on the current panel" acceptance condition has real evidence
// rather than an assumption.
function runSelfTest() {
	const os = require( 'os' );
	let pass = true;
	const log = ( msg ) => process.stdout.write( msg + '\n' );

	log( '[check-dead-controls --self-test] CHECK 3 (extension-file dead controls)\n' );

	// Synthetic extension file, same shape as the real fx.js:
	//   liveAttr — declared, controlled, genuinely consumed by its own
	//              getSaveContent.extraProps function. Must NOT be flagged.
	//   deadAttr — declared, controlled, consumed NOWHERE. The PLANTED
	//              DEFECT — the known failure this self-test exists to catch.
	//   fxPreset — declared, controlled, consumed nowhere, but on the
	//              documented EXTENSION_EDITOR_ONLY_ATTRS allowlist. Proves
	//              the allowlist path works rather than just "nothing fires".
	const fixtureSrc = [
		"import { addFilter } from '@wordpress/hooks';",
		'',
		'function addFixtureAttributes( settings ) {',
		'	return {',
		'		...settings,',
		'		attributes: {',
		'			...settings.attributes,',
		"			liveAttr: { type: 'string', default: '' },",
		"			deadAttr: { type: 'string', default: '' },",
		"			fxPreset: { type: 'string', default: '' },",
		'		},',
		'	};',
		'}',
		"addFilter( 'blocks.registerBlockType', 'sgs/fixture-attributes', addFixtureAttributes );",
		'',
		'const withFixtureControls = ( BlockEdit ) => ( props ) => {',
		'	const { setAttributes } = props;',
		"	setAttributes( { liveAttr: 'x' } );",
		"	setAttributes( { deadAttr: 'x' } ); // PLANTED DEFECT — never consumed below.",
		"	setAttributes( { fxPreset: 'dramatic' } );",
		'	return null;',
		'};',
		"addFilter( 'editor.BlockEdit', 'sgs/fixture-controls', withFixtureControls );",
		'',
		'function addFixtureSaveProps( props, blockType, attributes ) {',
		'	const data = {};',
		'	if ( attributes.liveAttr ) {',
		"		data[ 'data-sgs-fixture-live' ] = attributes.liveAttr;",
		'	}',
		'	return { ...props, ...data };',
		'}',
		"addFilter( 'blocks.getSaveContent.extraProps', 'sgs/fixture-save', addFixtureSaveProps );",
		'',
	].join( '\n' );

	const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-ext-guard-self-test-' ) );
	const fixturePath = path.join( tmpDir, 'fixture-extension.js' );
	fs.writeFileSync( fixturePath, fixtureSrc, 'utf8' );

	// Confirm the plant actually landed on disk before trusting anything
	// derived from it (a write can silently no-op or a copy-paste edit can
	// silently drop the one line that matters).
	const readBack = fs.readFileSync( fixturePath, 'utf8' );
	const planted =
		readBack.includes( "deadAttr: { type: 'string', default: '' }," ) &&
		/setAttributes\(\s*\{\s*deadAttr:\s*'x'\s*\}\s*\)/.test( readBack );
	if ( ! planted ) {
		log( 'FAIL — the planted defect ("deadAttr") did not land in the fixture file on disk.' );
		fs.rmSync( tmpDir, { recursive: true, force: true } );
		process.exit( 1 );
	}
	log( 'CONFIRMED — planted defect ("deadAttr") is present in the on-disk fixture.\n' );

	const declaredAttrs = new Set( [ 'liveAttr', 'deadAttr', 'fxPreset' ] );
	// Empty sharedCorpus is deliberate: this isolates the JS-side own-corpus
	// path so the test cannot pass-by-accident off unrelated real includes/
	// PHP text containing the word "liveAttr" or "deadAttr".
	const findings = checkExtensionFileSrc( 'fixture-extension.js', readBack, '', declaredAttrs );
	const findingAttrs = new Set( findings.map( ( f ) => f.attr ) );

	if ( findingAttrs.has( 'deadAttr' ) ) {
		log( 'PASS — Test A: the KNOWN FAILURE ("deadAttr") was flagged.' );
	} else {
		log( 'FAIL — Test A: the KNOWN FAILURE ("deadAttr") was NOT flagged. The guard cannot fail.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'liveAttr' ) ) {
		log( 'PASS — Test B (negative control): genuinely-consumed "liveAttr" was NOT flagged.' );
	} else {
		log( 'FAIL — Test B: genuinely-consumed "liveAttr" was flagged — false positive.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'fxPreset' ) ) {
		log( 'PASS — Test C: documented editor-only attr ("fxPreset") was NOT flagged.' );
	} else {
		log( 'FAIL — Test C: documented editor-only attr ("fxPreset") was flagged — allowlist broken.' );
		pass = false;
	}

	fs.rmSync( tmpDir, { recursive: true, force: true } );

	// Live scan — same function, the real files. Informational: a real
	// finding here is a real finding to report, not a self-test failure.
	log( '\n[check-dead-controls --self-test] Live scan of src/blocks/extensions/*.js:' );
	EXTENSION_ATTRS = loadExtensionAttrs();
	const sharedCorpusLive = stripComments( loadSharedCorpus() );
	const liveFiles = fs.existsSync( EXTENSIONS_DIR )
		? fs.readdirSync( EXTENSIONS_DIR ).filter( ( f ) => f.endsWith( '.js' ) )
		: [];
	let liveFindings = [];
	for ( const file of liveFiles ) {
		liveFindings = liveFindings.concat(
			checkExtensionFile( path.join( EXTENSIONS_DIR, file ), sharedCorpusLive )
		);
	}
	if ( liveFindings.length === 0 ) {
		log( `OK — 0 findings across ${ liveFiles.length } extension file(s): ${ liveFiles.join( ', ' ) }` );
	} else {
		log( `${ liveFindings.length } finding(s):` );
		for ( const f of liveFindings ) {
			log( `  - ${ f.block } :: ${ f.attr } — ${ f.reason }` );
		}
	}

	log(
		pass
			? '\n[check-dead-controls --self-test] CHECK 3 — ALL SYNTHETIC TESTS PASS.'
			: '\n[check-dead-controls --self-test] CHECK 3 — FAIL.'
	);

	const check4Pass = runCheck4SelfTest( log );
	const check5Pass = runCheck5SelfTest( log );

	if ( ! pass || ! check4Pass || ! check5Pass ) {
		process.exit( 1 );
	}
}

// ---------------------------------------------------------------------------
// CHECK 4 self-test (2026-08-05) — proves the fully-dead-attribute gate can
// FAIL, proves its negative controls hold (own-corpus consumption, shared/
// wrapper-corpus consumption — the exact sgs/google-reviews `gap` shape,
// editor-only exemption), proves baseline suppression works, and proves the
// CHECK_4_BLOCKS_BUILD advisory flag genuinely changes the exit code both
// ways via the pure shouldFailBuild() function (no subprocess needed).
// ---------------------------------------------------------------------------
function runCheck4SelfTest( log ) {
	const os = require( 'os' );
	let pass = true;

	log( '\n[check-dead-controls --self-test] CHECK 4 (fully-dead attributes)\n' );

	const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-fully-dead-self-test-' ) );

	const blockJson = {
		name: 'sgs/fixture-fully-dead',
		attributes: {
			liveAttr: { type: 'string', default: '' }, // consumed in this fixture's own render.php
			deadAttr: { type: 'string', default: '' }, // PLANTED DEFECT — consumed nowhere
			wrapperAttr: { type: 'string', default: '' }, // consumed only via shared/wrapper corpus — mirrors sgs/google-reviews' gap/gapTablet/gapMobile shape
			templateMode: { type: 'string', default: '' }, // documented EDITOR_ONLY_ATTRS exemption
		},
	};
	fs.writeFileSync( path.join( tmpDir, 'block.json' ), JSON.stringify( blockJson, null, 2 ), 'utf8' );
	fs.writeFileSync(
		path.join( tmpDir, 'render.php' ),
		"<?php\n$live = $attributes['liveAttr'] ?? '';\necho esc_html( $live );\n",
		'utf8'
	);

	// Confirm the plant actually landed on disk before trusting anything
	// derived from it.
	const readBackJson = fs.readFileSync( path.join( tmpDir, 'block.json' ), 'utf8' );
	const readBackRender = fs.readFileSync( path.join( tmpDir, 'render.php' ), 'utf8' );
	const planted =
		readBackJson.includes( '"deadAttr"' ) && ! new RegExp( '\\bdeadAttr\\b' ).test( readBackRender );
	if ( ! planted ) {
		log( 'FAIL — the planted defect ("deadAttr") did not land correctly in the fixture on disk.' );
		fs.rmSync( tmpDir, { recursive: true, force: true } );
		return false;
	}
	log( 'CONFIRMED — planted defect ("deadAttr") is present in block.json and absent from render.php.\n' );

	const block = readBlock( tmpDir );
	// Fake shared/wrapper corpus: `wrapperAttr` is consumed here, NOT in the
	// fixture's own render.php — the exact mechanism that makes
	// sgs/google-reviews' gap/gapTablet/gapMobile legitimate (consumed by
	// includes/class-sgs-container-wrapper.php, not the block's own files).
	const fakeSharedCorpus = "$x = $attributes['wrapperAttr'] ?? '';";

	const findings = checkFullyDeadAttrs( block, new Set(), fakeSharedCorpus, new Set() );
	const findingAttrs = new Set( findings.map( ( f ) => f.attr ) );

	if ( findingAttrs.has( 'deadAttr' ) ) {
		log( 'PASS — Test A: the KNOWN FAILURE ("deadAttr") was flagged.' );
	} else {
		log( 'FAIL — Test A: the KNOWN FAILURE ("deadAttr") was NOT flagged. The guard cannot fail.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'liveAttr' ) ) {
		log( 'PASS — Test B (negative control): own-corpus-consumed "liveAttr" was NOT flagged.' );
	} else {
		log( 'FAIL — Test B: own-corpus-consumed "liveAttr" was flagged — false positive.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'wrapperAttr' ) ) {
		log(
			'PASS — Test C (negative control, sgs/google-reviews shape): shared-corpus-consumed ' +
				'"wrapperAttr" (no control, consumed only by the shared includes corpus) was NOT flagged.'
		);
	} else {
		log( 'FAIL — Test C: shared-corpus-consumed "wrapperAttr" was flagged — would false-positive on ' +
			'real wrapper-consumed attrs like sgs/google-reviews\' gap/gapTablet/gapMobile.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'templateMode' ) ) {
		log( 'PASS — Test D: documented editor-only attr ("templateMode") was NOT flagged.' );
	} else {
		log( 'FAIL — Test D: documented editor-only attr ("templateMode") was flagged — allowlist broken.' );
		pass = false;
	}

	// Test E — baseline suppression: a baselined finding key must move from
	// netNew to accepted.
	const baselineKey = 'fully-dead:sgs/fixture-fully-dead:deadAttr';
	const baseline = new Set( [ baselineKey ] );
	const netNewWithBaseline = findings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const acceptedWithBaseline = findings.filter( ( f ) => baseline.has( findingKey( f ) ) );
	if (
		acceptedWithBaseline.some( ( f ) => f.attr === 'deadAttr' ) &&
		! netNewWithBaseline.some( ( f ) => f.attr === 'deadAttr' )
	) {
		log( 'PASS — Test E: baselining "deadAttr" moves it from netNew to accepted (suppression proven).' );
	} else {
		log( 'FAIL — Test E: baseline entry did not suppress "deadAttr".' );
		pass = false;
	}

	// Test F — the CHECK_4_BLOCKS_BUILD flip flag genuinely changes the exit
	// code BOTH ways, using the real production shouldFailBuild() function.
	const failsWhenAdvisory = shouldFailBuild( true, 0, false, findings.length );
	const failsWhenBlocking = shouldFailBuild( true, 0, true, findings.length );
	if ( ! failsWhenAdvisory && failsWhenBlocking ) {
		log(
			'PASS — Test F: CHECK_4_BLOCKS_BUILD=false does NOT fail the build; ' +
				'CHECK_4_BLOCKS_BUILD=true DOES — the flip flag works both ways.'
		);
	} else {
		log(
			`FAIL — Test F: shouldFailBuild(advisory)=${ failsWhenAdvisory } (expected false), ` +
				`shouldFailBuild(blocking)=${ failsWhenBlocking } (expected true).`
		);
		pass = false;
	}

	fs.rmSync( tmpDir, { recursive: true, force: true } );

	log(
		pass
			? '\n[check-dead-controls --self-test] CHECK 4 — ALL SYNTHETIC TESTS PASS.'
			: '\n[check-dead-controls --self-test] CHECK 4 — FAIL.'
	);
	return pass;
}

// ---------------------------------------------------------------------------
// CHECK 5 self-test (2026-08-06) — proves the dead-assignment gate can FAIL
// (the KNOWN pre-fix sgs/form.formName shape), proves three distinct
// negative-control shapes hold (assigned-then-reused-later, read-directly-
// with-no-intermediate-variable, assigned-then-passed-into-a-shared-include
// call), proves baseline suppression works, and proves the
// CHECK_5_BLOCKS_BUILD advisory flag genuinely changes the exit code both
// ways via the pure shouldFailBuild() function.
// ---------------------------------------------------------------------------
function runCheck5SelfTest( log ) {
	const os = require( 'os' );
	let pass = true;

	log( '\n[check-dead-controls --self-test] CHECK 5 (dead assignment)\n' );

	const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-dead-assign-self-test-' ) );

	const blockJson = {
		name: 'sgs/fixture-dead-assign',
		attributes: {
			// PLANTED DEFECT — mirrors the real pre-fix sgs/form.formName shape
			// exactly: assigned into a variable, that variable never read again.
			deadAttr: { type: 'string', default: '' },
			// Negative control 1 — assigned, then genuinely reused later in the
			// same file (mirrors sgs/form's `successRedirect`, which is
			// reassigned via wp_validate_redirect() then placed into $context).
			reuseAttr: { type: 'string', default: '' },
			// Negative control 2 — read directly at its use site, no
			// intermediate variable at all. Rule 1 never even matches this
			// shape, so it must not be flagged.
			directReadAttr: { type: 'string', default: '' },
			// Negative control 3 — assigned, then the LOCAL VARIABLE is passed
			// into a shared-include-style function call (mirrors sgs/form's
			// `storeSubmissions`, assigned then passed into
			// SGS_Container_Wrapper::render()'s extra_attrs array — a
			// shared-include function — right there in render.php).
			passedToHelperAttr: { type: 'string', default: '' },
		},
	};
	fs.writeFileSync( path.join( tmpDir, 'block.json' ), JSON.stringify( blockJson, null, 2 ), 'utf8' );
	fs.writeFileSync(
		path.join( tmpDir, 'render.php' ),
		[
			'<?php',
			"$dead_var = $attributes['deadAttr'] ?? '';",
			'',
			"$reuse_var = $attributes['reuseAttr'] ?? '';",
			"$reuse_var = $reuse_var ? strtoupper( $reuse_var ) : '';",
			'echo $reuse_var;',
			'',
			"echo esc_html( $attributes['directReadAttr'] ?? '' );",
			'',
			"$helper_var = $attributes['passedToHelperAttr'] ?? '';",
			"sgs_some_shared_helper( array( 'x' => $helper_var ) );",
			'',
		].join( '\n' ),
		'utf8'
	);

	// Confirm the plant actually landed on disk before trusting anything
	// derived from it: the assignment line is present, AND `$dead_var`
	// appears EXACTLY once in the whole file (the assignment itself) — proof
	// it really is never referenced again, not just an assumption from the
	// fixture's own authoring.
	const readBackRender = fs.readFileSync( path.join( tmpDir, 'render.php' ), 'utf8' );
	const deadVarOccurrences = ( readBackRender.match( /\$dead_var\b/g ) || [] ).length;
	const planted =
		readBackRender.includes( "$dead_var = $attributes['deadAttr'] ?? '';" ) && deadVarOccurrences === 1;
	if ( ! planted ) {
		log( 'FAIL — the planted defect ("deadAttr" / $dead_var) did not land correctly in the fixture on disk.' );
		fs.rmSync( tmpDir, { recursive: true, force: true } );
		return false;
	}
	log( 'CONFIRMED — planted defect ($dead_var, from "deadAttr") is present and never re-referenced.\n' );

	const block = readBlock( tmpDir );
	const findings = checkDeadAssignments( block );
	const findingAttrs = new Set( findings.map( ( f ) => f.attr ) );

	if ( findingAttrs.has( 'deadAttr' ) ) {
		log( 'PASS — Test A: the KNOWN FAILURE ("deadAttr", the pre-fix sgs/form.formName shape) was flagged.' );
	} else {
		log( 'FAIL — Test A: the KNOWN FAILURE ("deadAttr") was NOT flagged. The guard cannot fail.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'reuseAttr' ) ) {
		log(
			'PASS — Test B (negative control, sgs/form.successRedirect shape): assigned-then-reused ' +
				'"reuseAttr" was NOT flagged.'
		);
	} else {
		log( 'FAIL — Test B: assigned-then-reused "reuseAttr" was flagged — false positive.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'directReadAttr' ) ) {
		log(
			'PASS — Test C (negative control): directly-read-with-no-intermediate-variable ' +
				'"directReadAttr" was NOT flagged.'
		);
	} else {
		log( 'FAIL — Test C: directly-read "directReadAttr" was flagged — false positive.' );
		pass = false;
	}

	if ( ! findingAttrs.has( 'passedToHelperAttr' ) ) {
		log(
			'PASS — Test D (negative control, sgs/form.storeSubmissions shape): assigned-then-passed-' +
				'into-a-shared-include-call "passedToHelperAttr" was NOT flagged.'
		);
	} else {
		log( 'FAIL — Test D: "passedToHelperAttr" was flagged — would false-positive on real ' +
			"shared-include-consumed attrs like sgs/form's storeSubmissions." );
		pass = false;
	}

	// Test E — baseline suppression: a baselined finding key must move from
	// netNew to accepted.
	const baselineKey = 'dead-assign:sgs/fixture-dead-assign:deadAttr';
	const baseline = new Set( [ baselineKey ] );
	const netNewWithBaseline = findings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const acceptedWithBaseline = findings.filter( ( f ) => baseline.has( findingKey( f ) ) );
	if (
		acceptedWithBaseline.some( ( f ) => f.attr === 'deadAttr' ) &&
		! netNewWithBaseline.some( ( f ) => f.attr === 'deadAttr' )
	) {
		log( 'PASS — Test E: baselining "deadAttr" moves it from netNew to accepted (suppression proven).' );
	} else {
		log( 'FAIL — Test E: baseline entry did not suppress "deadAttr".' );
		pass = false;
	}

	// Test F — the CHECK_5_BLOCKS_BUILD flip flag genuinely changes the exit
	// code BOTH ways, using the real production shouldFailBuild() function.
	const failsWhenAdvisory = shouldFailBuild( true, 0, false, 0, false, findings.length );
	const failsWhenBlocking = shouldFailBuild( true, 0, false, 0, true, findings.length );
	if ( ! failsWhenAdvisory && failsWhenBlocking ) {
		log(
			'PASS — Test F: CHECK_5_BLOCKS_BUILD=false does NOT fail the build; ' +
				'CHECK_5_BLOCKS_BUILD=true DOES — the flip flag works both ways.'
		);
	} else {
		log(
			`FAIL — Test F: shouldFailBuild(advisory)=${ failsWhenAdvisory } (expected false), ` +
				`shouldFailBuild(blocking)=${ failsWhenBlocking } (expected true).`
		);
		pass = false;
	}

	fs.rmSync( tmpDir, { recursive: true, force: true } );

	// Live scan — same function, the real block library. Informational: a
	// real finding here is a real finding to report (see the module docblock
	// for the measured 2026-08-06 count), not a self-test failure.
	log( '\n[check-dead-controls --self-test] Live scan of src/blocks/*/render.php:' );
	const liveBlockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );
	let liveFindings = [];
	for ( const dir of liveBlockDirs ) {
		const liveBlock = readBlock( dir );
		if ( liveBlock ) {
			liveFindings = liveFindings.concat( checkDeadAssignments( liveBlock ) );
		}
	}
	if ( liveFindings.length === 0 ) {
		log( `OK — 0 findings across ${ liveBlockDirs.length } block(s).` );
	} else {
		log( `${ liveFindings.length } finding(s):` );
		for ( const f of liveFindings ) {
			log( `  - ${ f.block } :: ${ f.attr }` );
		}
	}

	log(
		pass
			? '\n[check-dead-controls --self-test] CHECK 5 — ALL SYNTHETIC TESTS PASS.'
			: '\n[check-dead-controls --self-test] CHECK 5 — FAIL.'
	);
	return pass;
}

if ( process.argv.includes( '--self-test' ) ) {
	runSelfTest();
} else {
	main();
}
