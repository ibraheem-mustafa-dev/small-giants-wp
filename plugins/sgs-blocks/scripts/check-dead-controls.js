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
	const attrs = new Set( Object.keys( meta.attributes || {} ) );
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

function main() {
	const check = process.argv.includes( '--check' );
	const asJson = process.argv.includes( '--json' );

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

	// Subtract the baseline (accepted, with reasons).
	const baseline = new Set( loadBaseline().map( findingKey ) );
	const netNew = findings.filter( ( f ) => ! baseline.has( findingKey( f ) ) );
	const accepted = findings.filter( ( f ) => baseline.has( findingKey( f ) ) );

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify( { netNew, accepted, baselineSize: baseline.size }, null, 2 ) + '\n'
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
	}

	if ( check && netNew.length ) {
		process.exit( 1 );
	}
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
			? '\n[check-dead-controls --self-test] ALL SYNTHETIC TESTS PASS.'
			: '\n[check-dead-controls --self-test] FAIL.'
	);
	if ( ! pass ) {
		process.exit( 1 );
	}
}

if ( process.argv.includes( '--self-test' ) ) {
	runSelfTest();
} else {
	main();
}
