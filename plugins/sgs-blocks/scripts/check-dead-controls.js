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
	const ownCorpus = stripComments(
		readIfExists( path.join( dir, 'render.php' ) ) +
			'\n' + readIfExists( path.join( dir, 'save.js' ) ) +
			'\n' + readIfExists( path.join( dir, 'view.js' ) )
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
					'has an editor control in edit.js but its name appears in no render.php / save.js / view.js / shared includes — nothing renders it',
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
				`[check-dead-controls] OK — 0 net-new dead controls across ${ blockDirs.length } blocks.\n`
			);
		}
	}

	if ( check && netNew.length ) {
		process.exit( 1 );
	}
}

main();
