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
 *   node scripts/check-dead-controls.js --dump-json  # per-(block,attr) consumption dump (Task 1,
 *                                                     # 2026-08-27) — REPORTING ONLY, always exit 0,
 *                                                     # never changes --check/--json output. Emits a
 *                                                     # JSON array, one row per declared attribute of
 *                                                     # every block this script scans: { block, attr,
 *                                                     # renderConsumed, controlPresent, renderVia,
 *                                                     # exempt, exemptReason }.
 *                                                     # renderVia names WHICH of this script's seven-
 *                                                     # corpus resolvers proved consumption (literal /
 *                                                     # dynamic-prefix / prefixed-helper / shared-
 *                                                     # include / block-context / responsive-variant /
 *                                                     # none) — the field a downstream consumer needs to
 *                                                     # distinguish a real absence from a resolver
 *                                                     # limitation. exempt/exemptReason surface the SAME
 *                                                     # gate exemptions checkFullyDeadAttrs() applies
 *                                                     # before resolving (isSystemAttr / EDITOR_ONLY_ATTRS
 *                                                     # / KEY_NOISE), plus a fourth dump-only exemption
 *                                                     # (Important 4, 2026-08-27) for a WP-native
 *                                                     # `supports`-backed attribute (e.g. `anchor`) that
 *                                                     # core itself renders — reason one of 'system-attr' /
 *                                                     # 'editor-only' / 'key-noise' / 'core-supports' /
 *                                                     # null — so a
 *                                                     # `renderConsumed: false` row can be told apart
 *                                                     # from an attribute the blocking gate actually
 *                                                     # flags as dead (a by-design editor-only attr —
 *                                                     # `templateMode` was the historical example until
 *                                                     # it was removed as vestigial, see
 *                                                     # `.superpowers/sdd/task-3-report.md` — would have
 *                                                     # renderConsumed=false but exempt=true, not a real
 *                                                     # finding). Exists
 *                                                     # so a second instrument (inspector-scan rule 34)
 *                                                     # can consume this script's verdicts instead of
 *                                                     # re-deriving them with a narrower corpus — see
 *                                                     # `.superpowers/sdd/task-1-brief.md`.
 *
 * Wired into `prebuild` / `prestart` in package.json, so `npm run build` FAILS
 * on a net-new dead control (it actually runs — not a dormant --check).
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { resolveComponentFiles } = require( './inspector-scan/core/components' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const INCLUDES_DIR = path.join( ROOT, 'includes' );
const SHARED_CONTROLS_JS = path.join(
	BLOCKS_DIR,
	'container',
	'components',
	'ContainerWrapperControls.js'
);

// R3-a (2026-08-20): the shared name -> file resolver (components.js), used
// two ways below to close the "control lives in a shared component file"
// blind spot documented in the R-3 register (`.claude/plans/phase-shop-
// container-remediation.md` R3-a). Computed once — resolveComponentFiles()
// walks the filesystem, so caching it avoids re-reading every component file
// per block during a single run.
const COMPONENT_FILE_MAP = resolveComponentFiles();

// Any capitalised JSX tag referenced in a source file, e.g. `<WidthPanel`.
const JSX_TAG_RE = /<([A-Z]\w*)\b/g;

/**
 * Given a source file's text (typically a block's edit.js), find every
 * capitalised JSX tag it references, resolve each name to the FILE that
 * DEFINES it via the shared resolver, and return the concatenated source of
 * every resolved file. This is how a control living in a shared component
 * (e.g. `container/components/WidthPanel.js`, mounted via `<WidthPanel .../>`
 * in edit.js) becomes visible to the text-based `collectControlledAttrs()`
 * scan below, instead of being invisible because it never appears as literal
 * text inside edit.js itself.
 *
 * Deliberately resolves by JSX TAG NAME, cross-referenced against a
 * component whose own source was read — never by import-path string
 * matching (components.js's own documented discipline).
 *
 * @param {string} src Source text to scan for JSX tags.
 * @return {string} Concatenated source of every resolved component file (may be empty).
 */
function collectReferencedComponentSources( src ) {
	if ( ! src ) {
		return '';
	}
	const names = new Set();
	JSX_TAG_RE.lastIndex = 0;
	let m;
	while ( ( m = JSX_TAG_RE.exec( src ) ) !== null ) {
		names.add( m[ 1 ] );
	}
	const seen = new Set();
	let out = '';
	for ( const name of names ) {
		const file = COMPONENT_FILE_MAP.get( name );
		if ( file && ! seen.has( file ) ) {
			seen.add( file );
			out += '\n' + readIfExists( file );
		}
	}
	return out;
}

/**
 * Resolve the set of files a "facade" component file (one that only
 * re-exports its real implementation files, e.g. ContainerWrapperControls.js
 * after the 2026-08-17 panel split) actually brings in, by reading its own
 * local `import { Name } from './Name'` statements and resolving each Name
 * to the file that DEFINES it. Replaces the old single-hardcoded-file read
 * (`readIfExists( SHARED_CONTROLS_JS )` alone), which measured 0 hits for
 * `contentWidth`/`gapTablet`/etc. because those controls moved OUT of the
 * facade into per-panel files it merely re-exports (R3-a register).
 *
 * @param {string} facadePath Absolute path to the facade file.
 * @return {string} Concatenated source: the facade itself + every locally-imported file it resolves to.
 */
function collectFacadeResolvedSources( facadePath ) {
	const facadeSrc = readIfExists( facadePath );
	if ( ! facadeSrc ) {
		return '';
	}
	const localImportRe = /import\s*\{([^}]*)\}\s*from\s*['"]\.\/[^'"]+['"]/g;
	const names = new Set();
	let m;
	while ( ( m = localImportRe.exec( facadeSrc ) ) !== null ) {
		for ( const part of m[ 1 ].split( ',' ) ) {
			const n = part.trim().split( /\s+as\s+/ ).pop().trim();
			if ( /^[A-Z]\w*$/.test( n ) ) {
				names.add( n );
			}
		}
	}
	const files = new Set();
	for ( const n of names ) {
		const file = COMPONENT_FILE_MAP.get( n );
		if ( file ) {
			files.add( file );
		}
	}
	let out = facadeSrc;
	for ( const file of files ) {
		out += '\n' + readIfExists( file );
	}
	return out;
}
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
//
// Was intentionally EMPTY 2026-08-27 -> 2026-09-02 (the only prior member,
// `templateMode`, was removed outright as vestigial — see
// `.superpowers/sdd/task-3-report.md`). `templateLock` (sgs/container,
// sgs/hero) is the next genuinely editor-only attribute: it drives
// useInnerBlocksProps' `templateLock` option (Spec 20-pattern-template-lock's
// repair target) and is never read in render.php — the InnerBlocks structural
// lock is a block-editor-only behaviour, confirmed live (grep for
// "templateLock" across both blocks' render.php: 0 matches). Keep this list
// tiny and justified; do not repopulate it with a stale name once an
// attribute is gone.
const EDITOR_ONLY_ATTRS = new Set( [ 'templateLock' ] );

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

// Attributes that are genuinely dead to THIS gate's render/editor scope (no
// render.php/save.js/view.js consumer, no editor control) but are kept alive
// deliberately for a NON-render consumer: the Python cloning pipeline. This is
// structurally distinct from every exemption above — not a WP `supports`-
// backed attribute (`core-supports`), not editor-only UI wiring
// (`editor-only`), not a naming-convention/object-literal artefact
// (`key-noise`/`system-attr`) — so it gets its own reason rather than being
// folded into one of those.
//
// `sgs/hero`'s `splitImage`/`splitImageMobile` USED to be the DB-side
// routing anchors for the scalar-media art-direction mechanism, kept alive
// here purely so `/sgs-update` Stage 9's orphan-prune wouldn't silently
// delete their `block_attributes` rows (`role='scalar-media'`) and lose the
// routing entirely — the exact 2026-08-02 regression this mechanism existed
// to prevent. 2026-09-02 (Wave 7b): the anchor was re-pointed onto
// `splitMediaType` (genuinely read by render.php, so it needs no dead-control
// exemption of its own) and `splitImage`/`splitImageMobile` were deleted from
// block.json outright — nothing declares them any more, so this gate can
// never see them, and the two-entry roster below is now empty. Source of
// truth for the re-anchor: `plugins/sgs-blocks/scripts/data/scalar-media-
// roles.json`'s `__RE_ANCHOR_2026_09_02` note.
//
// The exemption MECHANISM (Set + isCloningPipelineAnchorAttr helper) is kept
// rather than deleted — it is a general-purpose category (a declared attr
// that is dead to THIS gate's render/editor scope but load-bearing for the
// Python cloning pipeline elsewhere), not hero-specific, and a future
// virtual-only anchor could need it again. Keyed by `block::attr` (same
// convention as inspector-scan rule 34's dumpRowKey()) so any future entry
// can never accidentally widen to catch an unrelated block's same-named
// attribute.
const CLONING_PIPELINE_ANCHOR_ATTRS = new Set( [] );

function isCloningPipelineAnchorAttr( blockName, attr ) {
	return CLONING_PIPELINE_ANCHOR_ATTRS.has( blockName + '::' + attr );
}

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
	// ORDER IS LOAD-BEARING — line comments FIRST, block comments LAST.
	//
	// The reverse order (block-first, shipped until 2026-08-10) let a slash-star
	// sequence written inside a DOUBLE-SLASH comment silently delete real code. A
	// glob in prose is not a comment opener to a human, but the block-comment
	// regex cannot tell it sits inside a line comment, so it opened a span that
	// ran to the next close-delimiter ANYWHERE later in the file and replaced
	// everything between with a single space.
	//
	// MEASURED 2026-08-10: one such sequence in a container-wrapper comment
	// removed every $attributes['gapTablet']-style read from the shared corpus.
	// isConsumed() then found nothing, so this gate reported 73 NET-NEW dead
	// controls against completely healthy code and blocked the build — and the
	// message accused the code, not the scanner. It also inflated CHECK 4 from 3
	// to 102. Two more instances live in helpers-css-safety.php (:91, :128),
	// harmless only by luck: whether damage occurs depends on where the next
	// close-delimiter happens to fall.
	//
	// Stripping line comments first removes the stray sequence before the block
	// rule ever runs. This can only make the corpus MORE complete, so findings
	// can only fall or stay equal — verified before/after on the real tree, not
	// reasoned about. Test G in --self-test asserts both directions.
	return src
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1 ' ) // line comment (avoid http://)
		.replace( /^\s*#[^\n]*/gm, ' ' ) // PHP hash line comment
		.replace( /\/\*[\s\S]*?\*\//g, ' ' ); // block comment, LAST — see above
}

/**
 * Is `attr` consumed anywhere in `corpus`? Word-boundary match so `nameFontSize`
 * does NOT match inside `nameFontSizeTablet`. The corpus is the block's own
 * render/save/view source plus the shared includes corpus, comments stripped.
 */
/**
 * Attribute names a corpus consumes through the MEDIA-ATOM name helpers.
 *
 * The media layer never writes an attribute name as a literal. It composes one
 * from a PREFIX (the block's own call-site argument to
 * `SGS_Media_Element::style()`/`::css()`, e.g. hero's `'splitMedia'`/`'media'`,
 * or `''` for an unprefixed surface like `sgs/media`/`sgs/decorative-image`)
 * and a PascalCase BASE (a literal string inside the shared atom file, e.g.
 * `focal-point.php`'s `'ObjectPosition'`):
 *
 *     sgs_media_element_attr( '', 'VideoPlaysInline' )         -> videoPlaysInline
 *     sgs_media_element_attr( 'splitMedia', 'ObjectPosition' ) -> splitMediaObjectPosition
 *     mediaStoredAttrName( slug, prefix, 'ImageUrl' )          -> {prefix}ImageUrl
 *
 * so a literal grep reports every one of them as unrendered. That is a real
 * blind spot, not a real finding: `sgs/media`'s videoPlaysInline trio was
 * flagged the moment render.php started resolving those three flags through
 * `sgs_media_atom_video_behaviour_requires()` — the attributes went from
 * consumed to "dead" while becoming MORE correct.
 *
 * WIDENED 2026-09-02 (rule-34 findings review): this used to derive ONLY the
 * unprefixed (`prefix === ''`) form — `lcfirst(base)` — because it never
 * looked for the prefix argument at all. That is correct for `sgs/media` and
 * `sgs/decorative-image` (both call the helper with a literal `''` prefix),
 * but produced 5 false-positive "dead" findings on `sgs/hero`, whose call
 * sites pass `'splitMedia'`/`'media'` — the real stored names
 * (`splitMediaObjectPosition`, `mediaOverlayColour`, …) were never generated,
 * so `isConsumed()` never matched them even though `SGS_Media_Element::style()`
 * genuinely resolves them at render time (see the atom's own
 * `sgs_media_element_stored_attr( $block_slug, $prefix, $base )` call — prefix
 * concatenation, not string literal). Every literal prefix this BLOCK'S OWN
 * corpus passes to `::style()`/`::css()` is found structurally (the same
 * "resolve the call site's own literal argument" discipline
 * `collectPrefixedHelperConsumed()` already uses for `sgs_typography_css_rule`)
 * and combined with every base found anywhere in the corpus — `''` is always
 * tried too, so the pre-existing unprefixed blocks keep working unchanged.
 *
 * This is the same shape `sgs/before-after` already documents ("tier keys are
 * written as WHOLE literal suffixes because this checker cannot follow a key
 * whose tail is a second variable") for its OWN dynamic (loop-variable) prefix
 * — that shape is NOT resolved here (a non-literal 2nd argument can't be
 * statically determined) and is out of scope for this widening; before-after
 * works around it today by writing the composed literal names directly. A
 * future block hitting the same dynamic-prefix shape needs the same treatment
 * or a further-generalised resolver, not a baseline entry.
 *
 * Unprefixed and tiered forms are both derived, because a base composes into
 * up to three real attribute names per prefix.
 *
 * @param {string} corpus Render/save/view source, comments stripped (this
 *   block's own corpus + the shared includes corpus — prefixes are read from
 *   whichever half of `corpus` actually calls `::style()`/`::css()`, which in
 *   practice is always the block's own render.php; no `includes/*.php` file
 *   calls either method, so cross-block prefix leakage cannot occur).
 * @return {Set<string>} Attribute names reachable through the helpers.
 */
function mediaAtomComposedNames( corpus ) {
	const names = new Set();
	const baseRe =
		/(?:sgs_media_element_attr|sgs_media_element_stored_attr|mediaAttrName|mediaStoredAttrName)\s*\([^)]*?['"]([A-Z][A-Za-z0-9]*)['"]\s*\)/g;
	const bases = new Set();
	let m;
	while ( ( m = baseRe.exec( corpus ) ) !== null ) {
		bases.add( m[ 1 ] );
	}
	if ( bases.size === 0 ) {
		return names;
	}

	// Literal prefixes this corpus passes as the 2nd argument to
	// `SGS_Media_Element::style()`/`::css()`. `''` is always tried — the
	// unprefixed shape every surface used before any block passed a real prefix.
	const prefixRe = /SGS_Media_Element::(?:style|css)\(\s*[^,]+,\s*['"]([A-Za-z0-9]*)['"]/g;
	const prefixes = new Set( [ '' ] );
	while ( ( m = prefixRe.exec( corpus ) ) !== null ) {
		prefixes.add( m[ 1 ] );
	}

	for ( const base of bases ) {
		for ( const prefix of prefixes ) {
			// Mirrors sgs_media_element_attr()'s own rule exactly: a non-empty
			// prefix concatenates verbatim; an empty prefix lower-cases the base's
			// first letter instead.
			const composed = '' !== prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
			names.add( composed );
			names.add( composed + 'Tablet' );
			names.add( composed + 'Mobile' );
		}
	}
	return names;
}

function isConsumed( attr, corpus ) {
	// Escape nothing needed — attr names are [A-Za-z0-9_$]. Word boundary on both
	// sides; allow the JS/PHP token to be quoted, a property, or an array key.
	const re = new RegExp( '\\b' + attr + '\\b' );
	if ( re.test( corpus ) ) {
		return true;
	}
	// Composed through a media-atom name helper — see above.
	return mediaAtomComposedNames( corpus ).has( attr );
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
		// GROUND-TRUTH: spec=.superpowers/sdd/task-2-brief.md Important 4 (2026-08-27)
		// source=file evidence=live-read block.json for sgs/button, sgs/heading,
		// sgs/nav-drawer — all three declare an `anchor` attribute AND a top-level
		// `supports.anchor: true`. DUMP-ONLY: this field is additive on the block
		// descriptor and is read by NOTHING in CHECK 1-5 (checkBlock,
		// checkFullyDeadAttrs, etc.) — only dumpAttributeRows() below reads it, so
		// adding it cannot change --check/--json output.
		supports: meta.supports || {},
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
		// Added 2026-08-26 with the helper's own font-family branch (G4). Until
		// then `sgs_typography_css_rule()` could NOT emit font-family, so blocks
		// that offered TypographyControls' showFontFamily picker had to emit it
		// block-privately — and that private emission was the only LITERAL
		// occurrence of the attr name. Deleting it in favour of the shared helper
		// made `sgs/product-card.titleFontFamily` look "fully unused" to this
		// checker, which is what this list exists to prevent: both the control
		// (TypographyControls.js:160 builds `typographyAttrName(prefix,
		// 'FontFamily')`) and the render (`sgs_typography_attr($prefix,
		// 'FontFamily')`) construct the key, so neither end contains the string.
		'FontFamily',
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
		'TextAlign',
		// Added 2026-09-06 with the helper's own text-wrap branch, for exactly
		// the reason the FontFamily comment above describes. Until then
		// `sgs_typography_css_rule()` could not emit `text-wrap`, so the only
		// block offering it (`sgs/heading`) emitted it BLOCK-PRIVATELY — and
		// that private emission was the sole LITERAL occurrence of the attr
		// name in any PHP file. Moving it into the shared helper made
		// `textWrap` look unrendered to this checker at both ends: the control
		// builds the key as `typographyAttrName( prefix, 'TextWrap' )` and the
		// render as `sgs_typography_attr( $prefix, 'TextWrap' )`, so the string
		// "textWrap" appears in neither.
		//
		// ⛔ This is the CORRECT fix, not a baseline entry. `dead-controls-
		// baseline.json`'s own header and this repo's CLAUDE.md both say to
		// broaden the resolver when it false-positives a legitimate consumption
		// pattern rather than accepting the finding — a baselined entry would
		// silence this attribute on every block forever, including a future one
		// where it really is dead.
		'TextWrap',
		// Added 2026-09-06 alongside the helper's column-count / text-indent /
		// writing-mode branches — same dynamic-key reason as every suffix above.
		//
		// ⚠ TextIndent is emitted on its OWN selector (the adjacent-sibling
		// rule), not into $base_decls, but it is still read as
		// `sgs_typography_attr( $prefix, 'TextIndent' )` inside the same helper
		// call, so it belongs in this list exactly like the others — the list
		// records which SUFFIXES the helper consumes, not which CSS rule they
		// land in.
		'TextColumns',
		'TextIndent',
		'WritingMode',
	],
	sgs_button_element_style_css: [
		'ColourBackground',
		'ColourText',
		'ColourBorder',
		'ColourBorderGradient',
		// Added 2026-09-03 alongside the helper's own fill-gradient branch —
		// sgs_background_paint_decl() reads these two by the same $prefix.
		// 'Suffix' concatenation as every other entry in this list.
		'ColourBackgroundGradient',
		'ColourBackgroundHoverGradient',
		'ColourBackgroundHover',
		'ColourTextHover',
		'ColourBorderHover',
		'ColourBorderHoverGradient',
		// Added 2026-09-04 (D942/D956 gate) — the helper's text-gradient
		// branch reads these two the same $prefix.'Suffix' way; only paints
		// per-state when that state's own ColourBackground(Hover) is unset.
		'ColourTextGradient',
		'ColourTextHoverGradient',
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

// The media-ATOM resolver (2026-09-02, task-2 findings-34 fix). A THIRD
// computed-key shape, distinct from both PREFIXED_HELPER_SUFFIXES (a fixed
// helper name, prefix as a literal 2nd-arg string) and the dynamic-prefix
// `$attributes[ $var . 'Suffix' ]` concatenation: `SGS_Media_Element::style(
// $attributes, '<prefix>', '<block-slug>', $uid, array( 'atom-id', ... ) )`
// (`includes/class-sgs-media-element.php`). Each named atom owns a fixed set
// of PascalCase "bases" (e.g. the `focal-point` atom owns `ObjectPosition`);
// inside the atom's own PHP twin the actual read is
// `$attributes[ sgs_media_element_stored_attr( $block_slug, $prefix, $base ) ]`
// — a bracket access keyed by a FUNCTION CALL, not a literal or a simple
// concatenation, so neither existing resolver can see it. `sgs/hero`'s
// `splitMediaObjectPosition`/`mediaOverlayColour`/`mediaOverlayGradient` are
// exactly this shape (verified live: `hero/render.php` calls
// `SGS_Media_Element::style( $attributes, 'splitMedia', 'sgs/hero', $uid,
// array( 'object-fit', 'focal-point' ) )` and
// `SGS_Media_Element::style( $attributes, 'media', 'sgs/hero', $uid,
// array( 'overlay' ) )`).
//
// MEDIA_ELEMENT_ATOM_BASES is a byte-for-byte mirror of the atom -> bases map
// `src/components/media/atoms/registry.js` builds from `MEDIA_BASES` in
// `src/components/MediaElementControls.js` (the JS registry this whole
// mechanism is driven by) — kept in sync the same way PREFIXED_HELPER_SUFFIXES
// is kept in sync with each PHP helper's own doc-comment (see that dict's
// comment above). Adding a 17th atom there means adding its `id`+`bases` here;
// nothing else in this resolver is atom-specific. MEDIA_ELEMENT_TIERED_BASES /
// MEDIA_ELEMENT_TIERS mirror `MEDIA_TIERED_BASES`/`MEDIA_TIERS` from the same
// JS file — only a tiered base gets `+Tablet`/`+Mobile` siblings.
//
// Known limitation (documented, not silently assumed away): `sgs_media_
// element_stored_attr()` (`includes/helpers-media-element.php`) applies a
// STORED_AS override for exactly two blocks (`sgs/before-after`,
// `sgs/decorative-image`) — today every override maps to the SAME name the
// default prefix+base convention already produces (verified live,
// 2026-09-02), so ignoring STORED_AS here changes no result. If a future
// STORED_AS entry genuinely renames a base, this resolver will miss it until
// updated — the same class of drift PREFIXED_HELPER_SUFFIXES already accepts
// for its own helpers.
const MEDIA_ELEMENT_ATOM_BASES = {
	source: [
		'Image', 'ImageId', 'ImageUrl', 'Video', 'VideoId', 'VideoUrl', 'Svg',
		'SvgContent', 'Thumbnail', 'ThumbnailId',
	],
	'media-type': [ 'MediaType', 'VideoSource', 'VideoMimeType' ],
	'video-behaviour': [
		'VideoAutoplay', 'VideoLoop', 'VideoMuted', 'VideoControls',
		'VideoPlaysInline', 'VideoLazyLoad', 'VideoCaptionsId', 'VideoCaptionsUrl',
		'VideoCaptionsLabel', 'VideoCaptionsSrcLang',
	],
	meaning: [ 'ImageAlt', 'VideoAlt', 'ImageIsDecorative' ],
	intrinsic: [ 'ImageWidth', 'ImageHeight' ],
	'svg-presentation': [
		'SvgAnimation', 'SvgAnimationSpeed', 'SvgOpacity', 'SvgPosition',
		'SvgMinHeight', 'SvgTextShadow',
	],
	'object-fit': [ 'ObjectFit', 'Size' ],
	'focal-point': [ 'ObjectPosition', 'Position', 'Repeat', 'Attachment' ],
	'box-shape': [
		'MediaSizing', 'AspectRatio', 'Shape', 'Height', 'HeightUnit', 'MaxHeight',
		'MaxHeightUnit', 'MaxWidth', 'MaxWidthUnit', 'MaxWidthPercent', 'MinHeight',
		'Width', 'WidthUnit', 'BorderRadius', 'BorderWidth', 'BorderStyle',
		'BorderColour', 'BorderColourGradient',
	],
	overlay: [
		'OverlayColour', 'OverlayColourHover', 'OverlayGradient',
		'OverlayGradientHover', 'OverlayOpacity', 'OverlayBlendMode',
	],
	motion: [ 'KenBurns', 'Parallax', 'AnimationDuration' ],
	opacity: [ 'Opacity' ],
	shadow: [ 'BoxShadow', 'BoxShadowColour', 'BoxShadowColourHover' ],
	'media-padding': [ 'Padding' ],
	caption: [ 'Caption', 'CaptionTag' ],
	link: [ 'LinkUrl', 'LinkOpensNewTab', 'LinkRel' ],
};

const MEDIA_ELEMENT_TIERED_BASES = new Set( [
	'Image', 'ImageId', 'ImageUrl', 'Video', 'VideoId', 'VideoUrl', 'Svg',
	'SvgContent', 'Thumbnail', 'ThumbnailId',
	'VideoAutoplay', 'VideoLoop', 'VideoMuted', 'VideoControls',
	'VideoPlaysInline', 'VideoLazyLoad', 'VideoCaptionsId', 'VideoCaptionsUrl',
	'VideoCaptionsLabel', 'VideoCaptionsSrcLang',
	'ObjectFit', 'ObjectPosition', 'Height', 'Width', 'MinHeight',
	'OverlayOpacity', 'BorderRadius', 'Padding',
] );

const MEDIA_ELEMENT_TIERS = [ 'Tablet', 'Mobile' ];

// `SGS_Media_Element::style( $attributes, 'prefix', 'sgs/block', $uid,
// array( 'atom-a', 'atom-b' ) )` — prefix + block-slug + the atom-id array,
// each a literal string/array so this can be resolved statically. A call
// site with a computed (non-literal) prefix or block-slug is skipped, same
// discipline as isDynamicPrefixConsumed()'s own "can't resolve, don't claim"
// rule.
const MEDIA_ELEMENT_STYLE_CALL_RE =
	/SGS_Media_Element::style\(\s*\$\w+\s*,\s*['"]([A-Za-z0-9]*)['"]\s*,\s*['"][a-z0-9-]+\/[a-z0-9-]+['"]\s*,\s*\$\w+\s*,\s*array\(\s*((?:['"][a-z0-9-]+['"]\s*,?\s*)+)\)/g;

const MEDIA_ELEMENT_ATOM_ID_RE = /['"]([a-z0-9-]+)['"]/g;

/**
 * Collect every attribute name consumed via an `SGS_Media_Element::style()`
 * call site in `corpus` — the prefix+base(+tier) product of each call's
 * literal prefix and its declared atom ids.
 *
 * @param {string} corpus PHP source (comments already stripped).
 * @return {Set<string>} Attribute names consumed via a media-element atom.
 */
function collectMediaElementAtomConsumed( corpus ) {
	const consumed = new Set();
	let m;
	MEDIA_ELEMENT_STYLE_CALL_RE.lastIndex = 0;
	while ( ( m = MEDIA_ELEMENT_STYLE_CALL_RE.exec( corpus ) ) !== null ) {
		const prefix = m[ 1 ];
		const atomIdsRaw = m[ 2 ];
		let atomMatch;
		MEDIA_ELEMENT_ATOM_ID_RE.lastIndex = 0;
		while ( ( atomMatch = MEDIA_ELEMENT_ATOM_ID_RE.exec( atomIdsRaw ) ) !== null ) {
			const atomId = atomMatch[ 1 ];
			const bases = MEDIA_ELEMENT_ATOM_BASES[ atomId ];
			if ( ! bases ) {
				continue; // unknown atom id — not this resolver's business to guess
			}
			for ( const base of bases ) {
				const attrName = '' !== prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
				consumed.add( attrName );
				if ( MEDIA_ELEMENT_TIERED_BASES.has( base ) ) {
					for ( const tier of MEDIA_ELEMENT_TIERS ) {
						const tieredBase = base + tier;
						const tieredAttrName =
							'' !== prefix ? prefix + tieredBase : tieredBase.charAt( 0 ).toLowerCase() + tieredBase.slice( 1 );
						consumed.add( tieredAttrName );
					}
				}
			}
		}
	}
	return consumed;
}

// ---------------------------------------------------------------------------
// CHECK 1 — per-block dead controls
// ---------------------------------------------------------------------------

function checkBlock( block, wrapperControlled, sharedCorpus, contextConsumed ) {
	const findings = [];
	const editJs = readIfExists( path.join( block.dir, 'edit.js' ) );

	// R3-a: widen the corpus to include any shared component file edit.js
	// mounts via JSX (e.g. `<WidthPanel .../>`) — a control living entirely
	// inside that component's own source is otherwise invisible here.
	const controlled = collectControlledAttrs( editJs + collectReferencedComponentSources( editJs ) );

	// Consumption corpus for this block: its own render/save/view source plus the
	// shared includes corpus (forms engine, container wrapper, helpers).
	// NOTE: deliberately NOT broadened to all other blocks' sources — generic
	// attr names (title ×91, label ×74…) would collide and mask real dead
	// controls (qc-council Rater C, rule (c) rejected). Cross-block consumption
	// is recognised only via the declared providesContext/usesContext channel.
	const corpus = block.ownCorpus + '\n' + sharedCorpus;
	const prefixedHelperConsumed = collectPrefixedHelperConsumed( corpus );
	const mediaElementAtomConsumed = collectMediaElementAtomConsumed( corpus );

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
			// Media-element atom (SGS_Media_Element::style() dispatch -- see the
			// resolver's own comment above CHECK 1). The literal call site names
			// the prefix + the atom-id array; the full attr name is resolvable
			// even though the atom's own PHP twin builds the key via a helper
			// function call, not a literal or a simple concatenation.
			if ( mediaElementAtomConsumed.has( attr ) ) {
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
		//
		// NARROWED AGAIN 2026-08-07 (D516) — now BREAKPOINT_DYNAMIC_RE, matching
		// CHECK 4. Scoping to ownCorpus (above) removed the shared-corpus noise but
		// left the block's OWN `@media` as sufficient evidence, which is still not a
		// statement about THIS attr: hero.splitImageTablet was cleared purely because
		// hero emits @media for a dozen unrelated properties. Only dynamic tier-key
		// construction legitimately hides a tier attr's literal name.
		//
		// Sequenced deliberately: this check BLOCKS THE BUILD, so the strict rule
		// shipped in advisory CHECK 4 first and `--tier-audit` measured this check's
		// exposure at 0 (positive-controlled: 91 rows when the "own name consumed"
		// skip is dropped, so the traversal provably reaches real attrs). Tightened
		// while the exposure was nil rather than discovering it later on a red build.
		const suffix = attr.match( BREAKPOINT_SUFFIX_RE );
		if ( suffix ) {
			const base = attr.slice( 0, -suffix[ 1 ].length );
			if (
				base &&
				isConsumed( base, corpus ) &&
				BREAKPOINT_DYNAMIC_RE.test( block.ownCorpus )
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
	// R3-a: same widening as checkBlock() above — see its comment.
	const controlled = collectControlledAttrs( editJs + collectReferencedComponentSources( editJs ) );
	const corpus = block.ownCorpus + '\n' + sharedCorpus;
	const prefixedHelperConsumed = collectPrefixedHelperConsumed( corpus );
	const mediaElementAtomConsumed = collectMediaElementAtomConsumed( corpus );
	const dynamicPrefixSuffixes = collectDynamicPrefixSuffixes( corpus );

	for ( const attr of block.attrs ) {
		if ( isSystemAttr( attr ) ) {
			continue; // extension attr — different gate (generate-extension-attributes.js)
		}
		if ( EDITOR_ONLY_ATTRS.has( attr ) || KEY_NOISE.has( attr ) ) {
			continue; // by-design editor-only, or stray non-attribute key
		}
		if ( isCloningPipelineAnchorAttr( block.name, attr ) ) {
			continue; // kept alive for the Python cloning pipeline — see CLONING_PIPELINE_ANCHOR_ATTRS
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
		// Media-element atom (SGS_Media_Element::style() dispatch -- see the
		// resolver's own comment above CHECK 1; same rule as CHECK 1).
		if ( mediaElementAtomConsumed.has( attr ) ) {
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
	// ONE alternation pass, NOT two sequential .replace() calls — the comment
	// style that STARTS FIRST must win, and only a single left-to-right scan
	// can decide that.
	//
	// Why (real bug, fixed 2026-08-17): block comments used to be stripped in
	// their own pass BEFORE line comments. `hero/render.php` has an ordinary
	// `//` line comment reading "the *Tablet/*Mobile siblings ..." — the `/*`
	// inside it opened a phantom block comment that did not close until another
	// `//` comment ~715 lines later happened to contain `*/`. Everything between
	// was deleted before the liveness check ran, so CHECK 5 reported 24 live
	// attributes as dead. All 24 findings were false.
	//
	// Reordering the two passes instead would only move the bug: a `//` comment
	// containing `*/` would then leave an unterminated `/*` behind, which the
	// block pattern cannot match, silently leaking comment text back into the
	// analysed source (a false NEGATIVE — the mirror of the bug above).
	return src
		.replace(
			/\/\*[\s\S]*?\*\/|(^|[^:])\/\/[^\n]*/g,
			( _match, lineCommentPrefix ) =>
				// undefined => the block-comment branch matched (no capture group).
				undefined === lineCommentPrefix ? ' ' : lineCommentPrefix + ' '
		)
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
// --dump-json — per-(block, attr) consumption dump (Task 1, 2026-08-27)
// ---------------------------------------------------------------------------
//
// REPORTING ONLY. Reuses this script's existing resolver functions exactly as
// CHECK 1 / CHECK 4 call them — isConsumed / isDynamicPrefixConsumed /
// collectPrefixedHelperConsumed / collectDynamicPrefixSuffixes / the live
// providesContext->usesContext chain / the BREAKPOINT_DYNAMIC_RE responsive-
// variant rule — with NO changes to any of them. It does not touch findings,
// baselines, or the exit code; main() reads it in a fully separate branch.
//
// `renderVia` names WHICH resolver proved consumption, so a consumer (e.g.
// inspector-scan rule 34, which currently re-derives consumption with none of
// these resolvers and drifts 317 findings from this gate) can tell a real
// absence ('none') apart from a resolver limitation:
//   'literal'            the attr's own name appears in the block's OWN corpus
//                         (its .php files / save.js / *view*.js).
//   'shared-include'      the attr's own name appears only in the shared
//                         includes/*.php corpus, not the block's own.
//   'dynamic-prefix'      resolved via isDynamicPrefixConsumed() against a
//                         structurally-discovered `$attributes[ $var . 'Suffix' ]`
//                         read (collectDynamicPrefixSuffixes()).
//   'prefixed-helper'     resolved via a PREFIXED_HELPER_SUFFIXES call site
//                         (collectPrefixedHelperConsumed()) — e.g.
//                         sgs/brand-strip.nameFontSize via
//                         sgs_typography_css_rule( $attributes, 'name', ... ).
//   'block-context'       resolved via a live providesContext -> usesContext
//                         chain (contextConsumedByBlock, computed in main()).
//   'responsive-variant'  rule (a): a {base}Tablet/Mobile/Desktop attr whose
//                         OWN literal name never appears anywhere, resolved
//                         only because its BASE attr is consumed AND the
//                         block's own corpus builds tier keys dynamically
//                         (BREAKPOINT_DYNAMIC_RE) — e.g. `$attributes[ $base
//                         . 'Tablet' ]`. Distinct from 'literal'/'shared-
//                         include': what matched is the BASE attr's name, not
//                         this attr's own, so labelling it 'literal' would be
//                         wrong by the definition above.
//   'none'                none of the above resolved it.
//
// `exempt` / `exemptReason` surface the SAME FOUR exemptions
// checkFullyDeadAttrs() applies BEFORE resolving consumption (isSystemAttr() /
// EDITOR_ONLY_ATTRS / KEY_NOISE / CLONING_PIPELINE_ANCHOR_ATTRS — see that
// function's own comment), PLUS a fifth, dump-only exemption this function
// alone applies (Important 4, 2026-08-27): 'core-supports'. Without them,
// `renderConsumed: false` conflates a genuinely dead control with a by-design
// editor-only attr (the mechanism currently has no live example —
// `templateMode` was it until removed as vestigial, see
// `.superpowers/sdd/task-3-report.md`), a registered extension attr, a
// WP-native `supports`-backed attribute (e.g. `anchor`, `lock`) that
// WordPress core itself renders, or a cloning-pipeline routing anchor (the
// mechanism currently has no live example either — `sgs/hero::splitImage`/
// `splitImageMobile` were its only entries and both were DELETED from
// block.json 2026-09-02, Wave 7b, once the DB anchor moved to
// `splitMediaType` — see CLONING_PIPELINE_ANCHOR_ATTRS above, currently
// empty) — none of the five are a finding.
// `exemptReason` is one of 'system-attr' / 'editor-only' / 'key-noise' /
// 'core-supports' / 'cloning-pipeline-anchor' / null (not exempt).
//
// 'core-supports' — CONSUMPTION RESOLUTION BELONGS TO THE PRODUCER (design
// decision, Important 4). A block.json attribute IS consumed when its own
// name is also a top-level `supports` key set to a non-`false` value (e.g.
// `{ "attributes": { "anchor": {...} }, "supports": { "anchor": true } }`) —
// WordPress core renders that attribute itself (the anchor/lock/align
// mechanism), so the block's OWN render.php never needs to reference it
// literally. Before this exemption existed, an attribute like
// `sgs/button::anchor` escaped CHECK 4 / rule 34 only by COINCIDENCE — the
// literal string "anchor" happens to appear somewhere in the shared-includes
// corpus for unrelated reasons. Acting on a false "dead" verdict for a
// `supports`-backed attribute would delete a WORKING WordPress core feature.
// isCoreSupportsAttr() below is the ONLY thing that reads `block.supports`
// (added to readBlock()'s return purely for this) — DUMP-ONLY, never
// consulted by CHECK 1-5, so it cannot change --check/--json output.

/**
 * DUMP-ONLY (Important 4). True when `attr` is itself a top-level `supports`
 * key whose value is not `false` — WordPress core's own supports-driven
 * attribute mechanism (anchor/align/lock/…), not this block's own render
 * corpus. Reads only the block's OWN `supports` object (readBlock()'s
 * `meta.supports`); no cross-block dict, no hardcoded name list beyond the
 * literal-name-match itself.
 *
 * @param {string} attr The attribute name.
 * @param {Object} supports The block's own `block.json` `supports` object.
 * @return {boolean}
 */
function isCoreSupportsAttr( attr, supports ) {
	return (
		!! supports &&
		Object.prototype.hasOwnProperty.call( supports, attr ) &&
		supports[ attr ] !== false
	);
}

/**
 * @param {Array<Object>} blocks Parsed block descriptors (readBlock() output).
 * @param {Set<string>} wrapperControlled Attrs the shared ContainerWrapperControls mounts.
 * @param {string} sharedCorpus Concatenated includes/*.php corpus, comments stripped.
 * @param {Map<string,Set<string>>} contextConsumedByBlock block.name -> Set(attrName),
 *   from main()'s live-context pass (rule (b)).
 * @return {Array<Object>} One row per (block, attr): { block, attr, renderConsumed,
 *   controlPresent, renderVia, exempt, exemptReason }.
 */
function dumpAttributeRows( blocks, wrapperControlled, sharedCorpus, contextConsumedByBlock ) {
	const rows = [];
	for ( const block of blocks ) {
		const editJs = readIfExists( path.join( block.dir, 'edit.js' ) );
		// Same widened control-resolution CHECK 1/CHECK 4 use (R3-a).
		const controlled = collectControlledAttrs( editJs + collectReferencedComponentSources( editJs ) );
		const corpus = block.ownCorpus + '\n' + sharedCorpus;
		const prefixedHelperConsumed = collectPrefixedHelperConsumed( corpus );
		const dynamicPrefixSuffixes = collectDynamicPrefixSuffixes( corpus );
		const mediaElementAtomConsumed = collectMediaElementAtomConsumed( corpus );
		const contextConsumed = contextConsumedByBlock.get( block.name ) || new Set();

		for ( const attr of block.attrs ) {
			const controlPresent =
				controlled.has( attr ) || ( block.usesWrapper && wrapperControlled.has( attr ) );

			// Same three exemptions checkFullyDeadAttrs() applies before resolving
			// consumption (:875-880) — CALLED, not re-derived, so a change to any
			// of the three predicates is automatically reflected here.
			let exemptReason = null;
			if ( isSystemAttr( attr ) ) {
				exemptReason = 'system-attr';
			} else if ( EDITOR_ONLY_ATTRS.has( attr ) ) {
				exemptReason = 'editor-only';
			} else if ( KEY_NOISE.has( attr ) ) {
				exemptReason = 'key-noise';
			} else if ( isCoreSupportsAttr( attr, block.supports ) ) {
				exemptReason = 'core-supports';
			} else if ( isCloningPipelineAnchorAttr( block.name, attr ) ) {
				// Render/editor-dead by design — kept alive as a routing anchor for
				// the Python cloning pipeline's scalar-media mechanism. Source of
				// truth: plugins/sgs-blocks/scripts/data/scalar-media-roles.json.
				exemptReason = 'cloning-pipeline-anchor';
			}

			let renderVia = 'none';
			if ( contextConsumed.has( attr ) ) {
				renderVia = 'block-context';
			} else if ( prefixedHelperConsumed.has( attr ) ) {
				renderVia = 'prefixed-helper';
			} else if ( isDynamicPrefixConsumed( attr, corpus, dynamicPrefixSuffixes ) ) {
				renderVia = 'dynamic-prefix';
			} else if ( mediaElementAtomConsumed.has( attr ) ) {
				renderVia = 'media-element-atom';
			} else if ( isConsumed( attr, block.ownCorpus ) ) {
				renderVia = 'literal';
			} else if ( isConsumed( attr, sharedCorpus ) ) {
				renderVia = 'shared-include';
			} else {
				// Rule (a) — the same responsive-variant fallback CHECK 1/CHECK 4
				// apply: a {base}Tablet/Mobile/Desktop attr is consumed if its base
				// is consumed AND the block's own corpus builds responsive keys
				// dynamically (BREAKPOINT_DYNAMIC_RE), even though the tier attr's
				// own literal name never appears verbatim. What matched is the
				// BASE attr's name, not this attr's own — never 'literal' or
				// 'shared-include', which both mean "this attr's OWN name
				// appears" by the docblock's own definition above.
				const suffix = attr.match( BREAKPOINT_SUFFIX_RE );
				if ( suffix ) {
					const base = attr.slice( 0, -suffix[ 1 ].length );
					if ( base && isConsumed( base, corpus ) && BREAKPOINT_DYNAMIC_RE.test( block.ownCorpus ) ) {
						renderVia = 'responsive-variant';
					}
				}
			}

			rows.push( {
				block: block.name,
				attr,
				renderConsumed: renderVia !== 'none',
				controlPresent,
				renderVia,
				exempt: exemptReason !== null,
				exemptReason,
			} );
		}
	}
	return rows;
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
		// R3-a: same widening as checkBlock() above.
		const controlled = collectControlledAttrs( editJs + collectReferencedComponentSources( editJs ) );
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
	const dumpJsonOnly = process.argv.includes( '--dump-json' );

	EXTENSION_ATTRS = loadExtensionAttrs();
	const sharedCorpus = stripComments( loadSharedCorpus() );
	// R3-a: resolve the facade's own locally-imported panel files (WidthPanel.js,
	// LayoutPanel.js, etc.) via the shared resolver instead of reading only the
	// facade file's text — the facade RE-EXPORTS those panels post-split
	// (2026-08-17) and no longer contains their control code itself.
	const wrapperControlled = collectControlledAttrs(
		collectFacadeResolvedSources( SHARED_CONTROLS_JS )
	);

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

	if ( dumpJsonOnly ) {
		const rows = dumpAttributeRows( blocks, wrapperControlled, sharedCorpus, contextConsumedByBlock );
		process.stdout.write( JSON.stringify( rows, null, 2 ) + '\n' );
		process.exit( 0 );
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
		// PROMOTION TRIGGER (R3-c, dated 2026-08-20) — CHECK 4 stays advisory ONLY while
		// real net-new findings exist. As of 2026-08-20 there are exactly TWO:
		//   sgs/before-after :: maxWidthUnit   sgs/button :: fontFamily
		// Both are fully dead — no control anywhere AND no render consumption anywhere.
		// ⏱ TRIGGER: when `--check` reports 0 net-new for CHECK 4, make this BLOCKING in the
		// same commit that clears the last one. Do NOT baseline them to reach zero — a
		// fully-dead attribute has nothing to preserve; delete it or wire it. An advisory
		// with no stated promotion condition is how a gate quietly becomes decoration, which
		// is the exact failure R3-c exists to end.
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
		// PROMOTION TRIGGER (R3-c, dated 2026-08-20) — CHECK 5 measured **0 net-new** on
		// 2026-08-20, immediately after R3-a widened this script's corpus to resolve shared
		// component files. It is therefore ALREADY at the state CHECK 4 is working towards.
		// ⏱ TRIGGER: promote to BLOCKING on the next deliberate pass over this file, which
		// is safe precisely because it starts green — any future finding is a real
		// regression. It was left advisory here only because flipping it means re-plumbing
		// the exit path, and that deserves its own commit with its own self-test rather
		// than riding along at the end of a long session. Do not let this note outlive the
		// next such pass.
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
	const dumpJsonPass = runDumpJsonSelfTest( log );

	if ( ! pass || ! check4Pass || ! check5Pass || ! dumpJsonPass ) {
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
			// Synthetic, not a real attribute — proves the EDITOR_ONLY_ATTRS
			// exemption mechanism itself works, independent of whether any
			// real attribute currently uses it (the set is legitimately
			// empty since `templateMode` was removed as vestigial — see
			// `.superpowers/sdd/task-3-report.md`). Added to EDITOR_ONLY_ATTRS
			// below for the duration of this test only, then removed.
			fixtureEditorOnlyAttr: { type: 'string', default: '' },
		},
	};
	EDITOR_ONLY_ATTRS.add( 'fixtureEditorOnlyAttr' );
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

	if ( ! findingAttrs.has( 'fixtureEditorOnlyAttr' ) ) {
		log( 'PASS — Test D: EDITOR_ONLY_ATTRS-exempted attr ("fixtureEditorOnlyAttr") was NOT flagged.' );
	} else {
		log( 'FAIL — Test D: EDITOR_ONLY_ATTRS-exempted attr ("fixtureEditorOnlyAttr") was flagged — allowlist broken.' );
		pass = false;
	}
	EDITOR_ONLY_ATTRS.delete( 'fixtureEditorOnlyAttr' ); // cleanup — do not leak into other self-tests

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

	// Test G — stripComments() must NOT let a slash-star sequence inside a LINE
	// comment swallow the code that follows it. This is the 2026-08-10 regression:
	// one glob in a container-wrapper comment removed every
	// $attributes['gapTablet'] read from the shared corpus, and this gate then
	// reported 73 NET-NEW dead controls against healthy code while blocking the
	// build.
	//
	// The stray sequence is BUILT BY CONCATENATION, never written literally, so
	// this test file cannot re-trigger the very bug it guards.
	//
	// ⚠ THE FIXTURE MUST CARRY A CLOSING DELIMITER AFTER THE CODE. The first
	// version of this test omitted it and was VACUOUS — it passed with the bug
	// deliberately reintroduced, because the block-comment regex needs a closing
	// delimiter to match at all, so with none present nothing was ever swallowed.
	// The real-world damage only happened because a LATER docblock supplied that
	// close, putting the live code inside the accidental span. Proven able to fail
	// by reverting the strip order in place and watching Test G go red.
	//
	// Positive control (sequence present) and negative control (absent) are
	// asserted TOGETHER — a test that only checks the clean case passes happily
	// while the bug is live, which is precisely how this shipped.
	const closer = '/*' + '* doc *' + '/';
	const strayOpener =
		'// see wp:sgs' + '/' + '* for detail\n' + "$attributes['gapTablet'];\n" + closer + '\n';
	const noOpener =
		'// see sgs blocks for detail\n' + "$attributes['gapTablet'];\n" + closer + '\n';
	const survivesWithStray = isConsumed( 'gapTablet', stripComments( strayOpener ) );
	const survivesWithout = isConsumed( 'gapTablet', stripComments( noOpener ) );
	if ( survivesWithStray && survivesWithout ) {
		log(
			'PASS — Test G: a slash-star sequence inside a line comment no longer eats ' +
				'the code after it (consumed=true with AND without the stray sequence).'
		);
	} else {
		log(
			`FAIL — Test G: gapTablet consumed with stray opener=${ survivesWithStray } ` +
				`(expected true), without=${ survivesWithout } (expected true). ` +
				'stripComments() must strip LINE comments before BLOCK comments.'
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
			// Negative control 4 — REGRESSION GUARD for the comment-swallow bug
			// (fixed 2026-08-17). Assigned BEFORE a `//` line comment that
			// happens to contain the two characters `/*`, then used AFTER it and
			// before a later `//` comment containing `*/`. This is the exact
			// sgs/hero shape: assignment at :208, stray `/*` inside a `//`
			// comment at :313, real use at :345, stray `*/` inside another `//`
			// comment at :1028. Pre-fix, the block-comment pass ran first and
			// deleted everything between the two strays — swallowing the real
			// use and reporting 24 live hero attributes as dead. Must NOT flag.
			commentSwallowAttr: { type: 'string', default: '' },
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
			// Regression guard: the two stray comment sequences below live
			// inside ORDINARY `//` line comments, copied in shape from
			// sgs/hero/render.php:313 and :1028. The real use of
			// $swallow_var sits between them and must survive stripping.
			"$swallow_var = $attributes['commentSwallowAttr'] ?? '';",
			'// 3b) the *Tablet/*Mobile siblings no longer exist in block.json',
			'echo esc_html( $swallow_var );',
			'// splitMediaType*/splitVideo* were declared + read into local vars',
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

	if ( ! findingAttrs.has( 'commentSwallowAttr' ) ) {
		log(
			'PASS — Test G (regression, the 2026-08-17 comment-swallow bug): a real use sitting ' +
				'between a `//` comment containing "/*" and a later one containing "*/" was NOT swallowed.'
		);
	} else {
		log(
			'FAIL — Test G: "commentSwallowAttr" was flagged. The comment stripper is swallowing ' +
				'source between two stray sequences inside line comments — this is the bug that ' +
				'produced 24 false hero findings. Fix stripPhpCommentsForAssignmentCheck(), not this test.'
		);
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

	// R3-a widening regression test (2026-08-20). NEGATIVE CONTROL against the
	// OLD narrow corpus: `collectControlledAttrs( readIfExists( SHARED_CONTROLS_JS ) )`
	// (facade text alone) genuinely misses `contentWidth` — it lives entirely
	// in WidthPanel.js, which ContainerWrapperControls.js only re-exports
	// since the 2026-08-17 panel split. Proves the widened
	// `collectFacadeResolvedSources()` path finds it where the old path does not.
	log( '\n[check-dead-controls --self-test] R3-a resolver-widening regression test' );
	const oldNarrowControlled = collectControlledAttrs( readIfExists( SHARED_CONTROLS_JS ) );
	const widenedControlled = collectControlledAttrs( collectFacadeResolvedSources( SHARED_CONTROLS_JS ) );
	if ( ! oldNarrowControlled.has( 'contentWidth' ) && widenedControlled.has( 'contentWidth' ) ) {
		log(
			'PASS — Test H (negative control): the old facade-only read does NOT see ' +
				"'contentWidth' (it moved to WidthPanel.js); the resolver-widened read DOES."
		);
	} else {
		log(
			`FAIL — Test H: old-narrow has contentWidth=${ oldNarrowControlled.has( 'contentWidth' ) } ` +
				`(expected false), widened has contentWidth=${ widenedControlled.has( 'contentWidth' ) } (expected true).`
		);
		pass = false;
	}

	log(
		pass
			? '\n[check-dead-controls --self-test] CHECK 5 — ALL SYNTHETIC TESTS PASS.'
			: '\n[check-dead-controls --self-test] CHECK 5 — FAIL.'
	);
	return pass;
}

// ---------------------------------------------------------------------------
// --dump-json self-test (Task 1, 2026-08-27) — proves dumpAttributeRows()
// reports every one of the six renderVia values correctly, including a real
// LIVE example of the prefixed-helper resolver (sgs/brand-strip.nameFontSize
// via sgs_typography_css_rule(), brand-strip/render.php:412) so the field
// this task exists to add is proven against real code, not only a fixture.
// ---------------------------------------------------------------------------

function runDumpJsonSelfTest( log ) {
	const os = require( 'os' );
	let pass = true;

	// This function reassigns the module-level EXTENSION_ATTRS global (below,
	// for the live brand-strip check) — save/restore it so a caller after this
	// one (currently none — this runs last in runSelfTest — but that is an
	// ordering fact about the CALLER, not a guarantee this function can rely
	// on) always sees the value it had on entry, not whatever this test last
	// set it to.
	const savedExtensionAttrs = EXTENSION_ATTRS;

	log( '\n[check-dead-controls --self-test] --dump-json (Task 1 per-attribute dump)\n' );

	// Synthetic block covering all seven renderVia values plus all three
	// exemption reasons, on hand-built corpora (fully isolated from real
	// source, so no real code can make this pass by accident): literal (own
	// corpus), shared-include (shared corpus only), prefixed-helper (a real
	// PREFIXED_HELPER_SUFFIXES call shape), dynamic-prefix (a real
	// `$attributes[ $var . 'Suffix' ]` shape), block-context, responsive-
	// variant (rule (a): a {base}Tablet attr whose OWN name never appears,
	// resolved via a dynamic `$x . 'Tablet'` key build + a consumed base), a
	// controlled-but-dead attr (proves controlPresent and renderConsumed vary
	// independently), a fully-dead attr (no control, no consumption, not
	// exempt), and one attr per exemption reason (system-attr / editor-only /
	// key-noise) each with no control and no consumption, proving `exempt`
	// disambiguates them from a real fully-dead finding.
	//
	// `sgsAnimation` is a REAL registered extension attribute (verified:
	// includes/extension-attributes.generated.php declares `'sgsAnimation' =>
	// array(...)`, matching loadExtensionAttrs()'s own `sgs[A-Za-z0-9]+`
	// extraction pattern — NOT the same allowlist as EXTENSION_EDITOR_ONLY_ATTRS,
	// whose `fxPreset` entry does not start with `sgs` and so is NOT in
	// EXTENSION_ATTRS at all), used here — rather than a synthetic name — so
	// the system-attr case is proven against isSystemAttr()'s real
	// EXTENSION_ATTRS (loaded earlier in runSelfTest, before this function
	// runs) instead of requiring a temporary mutation of that global just for
	// this test.
	const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-dump-json-self-test-' ) );
	const editJsSrc = [
		"setAttributes( { literalAttr: 'x' } );",
		"setAttributes( { deadControlledAttr: 'x' } );",
	].join( '\n' );
	fs.writeFileSync( path.join( tmpDir, 'edit.js' ), editJsSrc, 'utf8' );

	const syntheticBlock = {
		name: 'sgs/fixture-dump',
		dir: tmpDir,
		attrs: new Set( [
			'literalAttr',
			'sharedAttr',
			'ctaFontSize',
			'beforeImageId',
			'ctxAttr',
			'respBase',
			'respBaseTablet',
			'deadControlledAttr',
			'fullyDeadAttr',
			'sgsAnimation',
			'fixtureEditorOnlyAttr',
			'id',
			'anchor',
		] ),
		dynamic: true,
		usesWrapper: false,
		ownCorpus:
			"echo esc_html( $attributes['literalAttr'] ?? '' );\n" +
			"echo sgs_button_element_style_css( $attributes, 'cta', '.cta' );\n" +
			"$prefix = 'before' === $modifier ? 'before' : 'after';\n" +
			"echo $attributes[ $prefix . 'ImageId' ] ?? '';\n" +
			"echo $attributes['respBase'] ?? '';\n" +
			"$tierKey = $respVar . 'Tablet';\n",
		providesContext: {},
		usesContext: [],
		// Important 4 (2026-08-27): `anchor` is a top-level `supports` key set to
		// `true` and is NEVER referenced anywhere in ownCorpus/editJsSrc above —
		// proves the new exemption fires from `block.supports` alone, not from
		// any literal-name coincidence.
		supports: { anchor: true },
	};
	const syntheticSharedCorpus = "echo $attributes['sharedAttr'] ?? '';\n";
	const syntheticContextConsumedByBlock = new Map( [
		[ 'sgs/fixture-dump', new Set( [ 'ctxAttr' ] ) ],
	] );

	// 'fixtureEditorOnlyAttr' proves the 'editor-only' exemptReason path — a
	// synthetic name, not a real attribute, because EDITOR_ONLY_ATTRS is
	// legitimately empty (its only member, `templateMode`, was removed as
	// vestigial — see `.superpowers/sdd/task-3-report.md`). Added for the
	// duration of this test only, then removed.
	EDITOR_ONLY_ATTRS.add( 'fixtureEditorOnlyAttr' );
	const rows = dumpAttributeRows(
		[ syntheticBlock ],
		new Set(), // wrapperControlled — irrelevant, syntheticBlock.usesWrapper is false
		syntheticSharedCorpus,
		syntheticContextConsumedByBlock
	);
	EDITOR_ONLY_ATTRS.delete( 'fixtureEditorOnlyAttr' ); // cleanup — do not leak into other self-tests
	const byAttr = {};
	rows.forEach( ( r ) => {
		byAttr[ r.attr ] = r;
	} );

	// [ attr, expControl, expConsumed, expVia, expExempt, expExemptReason ]
	const expected = [
		[ 'literalAttr', true, true, 'literal', false, null ],
		[ 'sharedAttr', false, true, 'shared-include', false, null ],
		[ 'ctaFontSize', false, true, 'prefixed-helper', false, null ],
		[ 'beforeImageId', false, true, 'dynamic-prefix', false, null ],
		[ 'ctxAttr', false, true, 'block-context', false, null ],
		[ 'respBaseTablet', false, true, 'responsive-variant', false, null ],
		[ 'deadControlledAttr', true, false, 'none', false, null ],
		[ 'fullyDeadAttr', false, false, 'none', false, null ],
		[ 'sgsAnimation', false, false, 'none', true, 'system-attr' ],
		[ 'fixtureEditorOnlyAttr', false, false, 'none', true, 'editor-only' ],
		[ 'id', false, false, 'none', true, 'key-noise' ],
		[ 'anchor', false, false, 'none', true, 'core-supports' ],
	];
	for ( const [ attr, expControl, expConsumed, expVia, expExempt, expExemptReason ] of expected ) {
		const row = byAttr[ attr ];
		const ok =
			row &&
			row.controlPresent === expControl &&
			row.renderConsumed === expConsumed &&
			row.renderVia === expVia &&
			row.exempt === expExempt &&
			row.exemptReason === expExemptReason;
		if ( ok ) {
			log(
				`PASS — Test I (${ attr }): controlPresent=${ row.controlPresent } ` +
					`renderConsumed=${ row.renderConsumed } renderVia=${ row.renderVia } ` +
					`exempt=${ row.exempt } exemptReason=${ row.exemptReason }`
			);
		} else {
			log(
				`FAIL — Test I (${ attr }): got ${ JSON.stringify( row ) }, expected ` +
					`controlPresent=${ expControl } renderConsumed=${ expConsumed } renderVia=${ expVia } ` +
					`exempt=${ expExempt } exemptReason=${ expExemptReason }`
			);
			pass = false;
		}
	}

	fs.rmSync( tmpDir, { recursive: true, force: true } );

	// Live check — the exact case the brief names as verified: sgs/brand-strip
	// declares `nameFontSize` with NO own edit.js control (it is emitted via the
	// shared TypographyControls component, resolved separately from this
	// PHP-side check) and consumes it via
	// sgs_typography_css_rule( $attributes, 'name', ... ) at
	// brand-strip/render.php:412 — a genuine PREFIXED_HELPER_SUFFIXES call.
	log( '\n[check-dead-controls --self-test] Live check: sgs/brand-strip.nameFontSize via --dump-json' );
	EXTENSION_ATTRS = loadExtensionAttrs();
	const sharedCorpusLive = stripComments( loadSharedCorpus() );
	const wrapperControlledLive = collectControlledAttrs(
		collectFacadeResolvedSources( SHARED_CONTROLS_JS )
	);
	const liveBlockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );
	const liveBlocks = [];
	for ( const dir of liveBlockDirs ) {
		const b = readBlock( dir );
		if ( b ) {
			liveBlocks.push( b );
		}
	}
	// NOTE: contextConsumedByBlock is passed empty here — this Test J assertion
	// only checks the prefixed-helper resolution of sgs/brand-strip.nameFontSize
	// (below), which never depends on block-context, so reconstructing main()'s
	// full providesContext -> usesContext live-context pass here would be ~20
	// lines that measure nothing (a MIRROR of main() with no assertion reading
	// its output — flagged by code review, 2026-08-27). Real block-context
	// resolution is exercised by Test I's synthetic `ctxAttr` case above; if a
	// future assertion here needs to depend on a LIVE context-provided attr,
	// rebuild this pass at that point rather than resurrecting it unused.
	const liveRows = dumpAttributeRows(
		liveBlocks,
		wrapperControlledLive,
		sharedCorpusLive,
		new Map()
	);
	const brandStripRow = liveRows.find(
		( r ) => 'sgs/brand-strip' === r.block && 'nameFontSize' === r.attr
	);
	if ( brandStripRow && true === brandStripRow.renderConsumed && 'prefixed-helper' === brandStripRow.renderVia ) {
		log(
			'PASS — Test J (live): sgs/brand-strip.nameFontSize -> renderConsumed=true, ' +
				'renderVia=prefixed-helper (brand-strip/render.php:412).'
		);
	} else {
		log( `FAIL — Test J (live): got ${ JSON.stringify( brandStripRow ) }` );
		pass = false;
	}

	// Live check — the synthetic sgsAnimation case above (Test I) proves the
	// exemptReason='system-attr' WIRING against the real EXTENSION_ATTRS set,
	// but on a fixture block, not a real block.json. This confirms the SAME
	// resolution holds through the full live pipeline: sgs/card-grid declares
	// sgsAnimation for real, and it must come back exempt here too.
	const cardGridAnimRow = liveRows.find(
		( r ) => 'sgs/card-grid' === r.block && 'sgsAnimation' === r.attr
	);
	if ( cardGridAnimRow && true === cardGridAnimRow.exempt && 'system-attr' === cardGridAnimRow.exemptReason ) {
		log(
			'PASS — Test J (live, exempt): sgs/card-grid.sgsAnimation -> exempt=true, ' +
				"exemptReason='system-attr'."
		);
	} else {
		log( `FAIL — Test J (live, exempt): got ${ JSON.stringify( cardGridAnimRow ) }` );
		pass = false;
	}

	// Live check — Important 4 (2026-08-27): sgs/button declares `anchor` AND a
	// top-level `supports.anchor: true`. Before this fix it escaped CHECK 4/
	// rule 34 only because the literal string "anchor" happens to appear
	// somewhere in the shared corpus by coincidence; this proves the NEW
	// exemption fires deliberately, from `block.supports`, not from that
	// coincidence.
	const buttonAnchorRow = liveRows.find( ( r ) => 'sgs/button' === r.block && 'anchor' === r.attr );
	if ( buttonAnchorRow && true === buttonAnchorRow.exempt && 'core-supports' === buttonAnchorRow.exemptReason ) {
		log(
			'PASS — Test J (live, exempt): sgs/button.anchor -> exempt=true, ' +
				"exemptReason='core-supports'."
		);
	} else {
		log( `FAIL — Test J (live, exempt): got ${ JSON.stringify( buttonAnchorRow ) }` );
		pass = false;
	}

	// Live check — task-2 findings-34 fix (2026-09-02): sgs/hero declares
	// `splitMediaObjectPosition`/`mediaOverlayColour`/`mediaOverlayGradient`
	// with NO own edit.js control and consumes them entirely via
	// `SGS_Media_Element::style( $attributes, 'splitMedia'|'media', 'sgs/hero',
	// $uid, array( 'focal-point' )|array( 'overlay' ) )` — a bracket read keyed
	// by a HELPER FUNCTION CALL (`sgs_media_element_stored_attr()`), which
	// neither PREFIXED_HELPER_SUFFIXES nor the dynamic-prefix resolver could
	// see (both require the key expression to be a literal or a simple `$var .
	// 'Suffix'` concatenation). Positive control for the new
	// collectMediaElementAtomConsumed() resolver.
	const heroObjectPositionRow = liveRows.find(
		( r ) => 'sgs/hero' === r.block && 'splitMediaObjectPosition' === r.attr
	);
	if (
		heroObjectPositionRow &&
		true === heroObjectPositionRow.renderConsumed &&
		'media-element-atom' === heroObjectPositionRow.renderVia
	) {
		log(
			'PASS — Test K (live): sgs/hero.splitMediaObjectPosition -> renderConsumed=true, ' +
				'renderVia=media-element-atom (hero/render.php SGS_Media_Element::style(), focal-point atom).'
		);
	} else {
		log( `FAIL — Test K (live): got ${ JSON.stringify( heroObjectPositionRow ) }` );
		pass = false;
	}
	const heroOverlayColourRow = liveRows.find(
		( r ) => 'sgs/hero' === r.block && 'mediaOverlayColour' === r.attr
	);
	if (
		heroOverlayColourRow &&
		true === heroOverlayColourRow.renderConsumed &&
		'media-element-atom' === heroOverlayColourRow.renderVia
	) {
		log(
			'PASS — Test K (live): sgs/hero.mediaOverlayColour -> renderConsumed=true, ' +
				'renderVia=media-element-atom (hero/render.php SGS_Media_Element::style(), overlay atom).'
		);
	} else {
		log( `FAIL — Test K (live): got ${ JSON.stringify( heroOverlayColourRow ) }` );
		pass = false;
	}

	// Negative control — USED to target sgs/hero's `splitImage` (object, no
	// suffix), a genuinely orphaned attribute left over from the 2026-09-01
	// migration to the decomposed splitImageId/splitImageUrl/splitImageAlt
	// fields (never a media-element-atom base, never read anywhere in
	// render.php). Proved the resolver does not over-match: it must NOT clear
	// a real dead attribute just because the block also uses
	// SGS_Media_Element::style() for unrelated atoms.
	//
	// 2026-09-02 (Wave 7b): `splitImage`/`splitImageMobile` were DELETED from
	// block.json outright (the DB-anchor role that was their only remaining
	// reason to exist moved to `splitMediaType`, which render.php genuinely
	// reads — see scripts/data/scalar-media-roles.json's
	// `__RE_ANCHOR_2026_09_02` note). That removed this negative control's
	// fixture: sgs/hero currently declares no unexempt orphaned attribute at
	// all (verified via `--dump-json` the same day), so there is nothing live
	// left to assert a FAIL against without inventing one. Rather than either
	// silently deleting the negative control (leaving the resolver's
	// non-over-match behaviour unproven) or hard-failing the whole self-test
	// on an absent-by-design fixture, this WARNS and skips — honest about
	// what it can and cannot currently prove. If a future change reintroduces
	// a genuinely orphaned attribute on sgs/hero (or another
	// SGS_Media_Element::style()-using block), retarget this at it.
	const heroSplitImageRow = liveRows.find( ( r ) => 'sgs/hero' === r.block && 'splitImage' === r.attr );
	if ( heroSplitImageRow && false === heroSplitImageRow.renderConsumed && 'none' === heroSplitImageRow.renderVia ) {
		log(
			'PASS — Test K (live, negative control): sgs/hero.splitImage -> renderConsumed=false, ' +
				'renderVia=none (genuinely orphaned, not a media-element-atom base — resolver does not over-match).'
		);
	} else if ( undefined === heroSplitImageRow ) {
		log(
			'WARN — Test K (live, negative control): sgs/hero.splitImage no longer exists ' +
				'(deleted 2026-09-02, Wave 7b) — no live orphaned-attr fixture currently ' +
				'available on sgs/hero to prove the resolver does not over-match. Not counted ' +
				'as a failure; retarget at a real fixture if one reappears.'
		);
	} else {
		log( `FAIL — Test K (live, negative control): got ${ JSON.stringify( heroSplitImageRow ) }` );
		pass = false;
	}

	EXTENSION_ATTRS = savedExtensionAttrs;

	log(
		pass
			? '\n[check-dead-controls --self-test] --dump-json — ALL TESTS PASS.'
			: '\n[check-dead-controls --self-test] --dump-json — FAIL.'
	);
	return pass;
}

if ( process.argv.includes( '--self-test' ) ) {
	runSelfTest();
} else {
	main();
}
