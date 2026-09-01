'use strict';

// GROUND-TRUTH: spec=coordinator brief 2026-09-01 ("Write a rule that checks
// OTHER blocks adopt the media-atom system correctly") source=file
// evidence=live-read src/components/media/atoms/registry.js (the 16-atom
// registry — `bases`/`types` per atom) + src/components/MediaElementPanel.js
// (the runtime, DATA-DRIVEN dispatcher that renders an atom's controls from
// its `bases`/`types`/`disclosure()`, not from static per-attribute JSX) +
// src/components/media/MediaPanelLayout.js (`sgs/media`'s own composition of
// `<MediaElementPanel>` calls) + src/blocks/before-after/edit.js:551,567
// (`sgs/before-after`'s own two direct `<MediaElementPanel>` mounts, one per
// comparison slot) + a live `node check-dead-controls.js --dump-json` run
// against BOTH reference blocks (2026-09-01, see the EMPIRICAL FINDING below)
// + a standalone throwaway script cross-referencing registry.js `types` against
// both blocks' own `mediaType`/`beforeMediaType`/`afterMediaType` enums
// (2026-09-01, see the SECOND EMPIRICAL FINDING below).
//
// ── WHAT THIS RULE IS FOR ────────────────────────────────────────────────
// `37-media-no-handroll` catches a block hand-rolling media CSS instead of
// adopting the shared layer. `38-media-attr-parity` catches an ADOPTING
// block's own `mediaElements` declaration resolving incorrectly against the
// generated PHP schema. Neither asks the question this rule asks: for a
// block that HAS adopted the layer, does the client actually GET a working,
// complete set of controls? Two independent shapes:
//
//   PART A — DECLARED-WITHOUT-CONTROL. An atom's injected attribute exists in
//     the block's live schema (per `supports.sgs.mediaElements` resolution)
//     but nothing in the editor lets the client set it.
//   PART B — TYPE-COVERAGE GAP. The block's own media-type picker (its
//     `mediaType`/`{prefix}MediaType` enum) offers a media type
//     (image/video/svg) that NONE of the block's declared atoms actually
//     support — picking that type silently strips a whole category of
//     styling control with no controls appearing at all.
//
// ── THE CRITICAL EMPIRICAL FINDING (Bean-locked acceptance criterion) ─────
// A NAIVE implementation of EITHER part flags both `sgs/media` and
// `sgs/before-after` — the two reference blocks that are supposed to be
// clean by construction. Both findings below were reproduced live before
// writing a single line of this rule's detection logic, per the brief's
// instruction to investigate rather than guess.
//
// PART A naive result: `check-dead-controls.js --dump-json`'s STATIC-JSX
// resolver reports `controlPresent:false` for essentially EVERY atom-injected
// attribute on both reference blocks (objectFit, overlayColour, borderRadius,
// caption, linkUrl, videoAutoplay, thumbnail, … — dozens of rows). This is
// NOT a real gap. `MediaElementPanel` (`src/components/MediaElementPanel.js`)
// is a single DATA-DRIVEN component: it takes an `atoms` prop and renders
// each atom's own `rows`/`disclosure()` logic at RUNTIME. There is no
// per-attribute JSX line for the resolver's `collectControlledAttrs()` (a
// static AST walk over `setAttributes({...})` calls / literal control
// elements) to find — the control genuinely exists, it is simply invisible
// to a scan that only understands literal per-attribute JSX. This is a
// STRUCTURAL blind spot in the *producer* this rule would otherwise trust
// (matching `plugins/sgs-blocks/CLAUDE.md`'s own "Detector blind spots" note
// on `check-dead-controls.js`: "asks 'is this attribute read by the render
// surface?' … cannot see" a category of indirection it wasn't built for).
//
// PART B naive result: comparing EVERY declared atom's `types` against the
// block's full `mediaType` enum flags `sgs/media` six times over (svg-
// presentation excludes image/video, object-fit/focal-point/caption exclude
// svg, video-behaviour excludes image/svg, link excludes video/svg) and
// `sgs/before-after` four times (object-fit/focal-point exclude svg on both
// the `before` and `after` slots). Every one of these is a DELIBERATE,
// documented restriction in registry.js itself — e.g. `object-fit`'s own
// comment: "object-fit does nothing to an inline <svg>; the SVG path needs
// preserveAspectRatio or a sized wrapper. `sgs/hero` already gets this right
// — render.php scopes its fit selector to `--image, --video` and excludes
// the SVG tier's `<span>` deliberately." A narrower `types` array is the
// framework's OWN answer to "does this concept apply to this media type" —
// registry.js says so explicitly ("`types` is enforced, not advisory: a
// picker is hard-restricted to it"). Flagging every instance of that
// enforcement working as designed is not a finding, it is restating the
// registry.
//
// ── THE FIX (one mechanism explains both blind spots) ────────────────────
// `MediaElementPanel` is the thing that makes BOTH naive signals unreliable:
// it self-gates per atom's own `types` at RENDER TIME (an atom whose `types`
// excludes the block's current `mediaType` simply renders nothing for that
// instance — correct, not a gap) AND it is the real control neither a static
// JSX scan nor a static enum-vs-types diff can see through. So: **this rule
// treats "the block mounts `<MediaElementPanel`" (directly in its own
// edit.js, or one import-hop away in a local wrapper component it imports —
// covers `sgs/media`'s indirection through `MediaPanelLayout.js`) as proof
// that BOTH parts are runtime-covered for that block, and goes silent for
// it.** Only a block that declares `supports.sgs.mediaElements` WITHOUT ever
// mounting the real dispatcher is treated as "hand-rolling the declaration
// with no runtime coverage at all" — for THAT block, a missing control (Part
// A) or an uncovered type (Part B) is a genuine, unmitigated gap, because
// nothing dynamic exists to hide or serve it.
//
// This mirrors `37-media-no-handroll`'s own precedent: a coarse, block-level
// gate (not a line-by-line proof) documented as such, because a finer-grained
// judgement is out of scope for a static advisory rule (see that rule's
// header, "THIRD SHAPE" note).
//
// ── KNOWN BLIND SPOTS (declared, not fixed here) ─────────────────────────
//   - The dispatcher-mount check is BLOCK-LEVEL (does `<MediaElementPanel`
//     appear anywhere reachable from this block's edit.js), not PER-ENTRY or
//     PER-ATOM. A block that mounts the dispatcher for ONE `mediaElements`
//     entry/atom subset but hand-rolls another would go silent on the
//     hand-rolled part too. Unmeasured — both live adopters mount it for
//     every declared atom, so this cannot currently produce a false silence.
//   - The indirection resolver follows a relative import to its file (or, for
//     a directory import, its barrel `index.js`), and — bounded to only a
//     re-export line naming a component this edit.js actually mounts as JSX
//     — one further hop through a barrel re-export. This is exactly deep
//     enough for `sgs/media`'s real shape (edit.js imports `MediaPanelLayout`
//     from the `src/components` barrel `'../../components'` -> `index.js` ->
//     `export { default as MediaPanelLayout } from './media/MediaPanelLayout'`
//     -> the file that actually mounts `<MediaElementPanel>`), proven against
//     the real file live rather than assumed. A wrapper mounted a THIRD hop
//     deep (a barrel re-exporting from another barrel) would not be found.
//     `resolveComponentFiles()` (`core/components.js`) was tried first and
//     rejected: it only reads files directly inside `src/components/` with no
//     recursion, so it cannot see `src/components/media/MediaPanelLayout.js`
//     either — confirmed live before writing the resolver actually used here.
//   - Part A's stored-attribute-name resolution shells out to the REAL
//     `sgs_media_element_stored_attr()` (mirroring 38's `phpResolve()` — same
//     "call the real function, never re-derive its STORED_AS table" reason),
//     but only requests bases for tiers named in the generated map's
//     `tiered` list — a base tiered by some OTHER mechanism this rule hasn't
//     seen would be missed. Matches 38's own documented tiering blind spot.
//   - Part B's type-selector-attribute resolver is a NAME heuristic
//     (`{prefix}MediaType` / `{prefix}Type`, falling back to a scan for any
//     attribute whose name starts with the prefix and whose enum overlaps
//     image/video/svg) — a type-selector named something this heuristic
//     doesn't try would be missed, and the entry would be silently skipped
//     rather than guessed at.
//
// ── EXPECTED POPULATION (stated BEFORE trusting a live run, per
//    rules.json._meta.zeroIsAClaim) ────────────────────────────────────
// `grep -rln '"mediaElements"' src/blocks/*/block.json` (excluding
// `_comment_mediaElements` prose keys) returns exactly TWO blocks today:
// `sgs/media` and `sgs/before-after`. Both mount `<MediaElementPanel`
// (`sgs/before-after/edit.js:551,567` directly; `sgs/media/edit.js` via its
// `MediaPanelLayout` import, itself mounting it six times) — the
// dispatcher-mount check therefore silences BOTH parts for both blocks by
// construction. Expected live population: **0 findings**. A non-zero result
// on either reference block is a bug in THIS rule, not the framework; a
// non-zero result once a Wave 7+ block adopts `mediaElements` without
// mounting `MediaElementPanel` is a real finding this rule exists to catch.

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const { makeFinding } = require( '../core/finding' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..', '..' );
const GENERATED_MAP_FILE = path.join(
	PLUGIN_ROOT,
	'includes',
	'media-element-attributes.generated.php'
);
const HELPERS_FILE = path.join( PLUGIN_ROOT, 'includes', 'helpers-media-element.php' );
const REGISTRY_FILE = path.join(
	PLUGIN_ROOT,
	'src',
	'components',
	'media',
	'atoms',
	'registry.js'
);
const CHECK_DEAD_CONTROLS_SCRIPT = path.resolve( __dirname, '..', '..', 'check-dead-controls.js' );

const MEDIA_TYPES = [ 'image', 'video', 'svg' ];

// ── Module-level caches — one shell-out per scan, mirrors rule 34/38's own
// documented rationale (a per-block rule must not re-spawn a child process
// once per block in the roster). Each slot holds either the resolved value
// or the caught error, so a broken producer only pays the cost once. ──────
let cachedRegistry = null;
let cachedRegistryError = null;
let cachedGeneratedMap = null;
let cachedGeneratedMapError = null;
let cachedDumpRows = null;
let cachedDumpError = null;

/**
 * Dynamic-import registry.js (an ES module this CommonJS rule cannot
 * `require()`) to get, per atom id, its `bases` (Part A) and `types`
 * (Part B) — the SAME "call the real thing, never re-derive it" shell-out
 * shape rule 38's `loadReadsMap()` already uses for the same file.
 *
 * @return {Object} atomId -> { bases: string[], types: string[] }.
 */
function loadRegistry() {
	if ( cachedRegistry ) return cachedRegistry;
	if ( cachedRegistryError ) throw cachedRegistryError;
	try {
		const url = 'file:///' + REGISTRY_FILE.split( String.fromCharCode( 92 ) ).join( '/' );
		const body =
			`import(${ JSON.stringify( url ) }).then((m) => {` +
			'const out = {};' +
			'for (const [id, atom] of Object.entries(m.MEDIA_ATOMS || {})) {' +
			'out[id] = { bases: atom.bases || [], types: atom.types || [] };' +
			'}' +
			'process.stdout.write(JSON.stringify(out));' +
			'process.exit(0);' +
			'}).catch((e) => { process.stderr.write(String(e && e.stack || e)); process.exit(1); });';
		const out = execFileSync( 'node', [ '-e', body ], { encoding: 'utf8' } );
		cachedRegistry = JSON.parse( out );
		return cachedRegistry;
	} catch ( e ) {
		cachedRegistryError = e;
		throw e;
	}
}

/**
 * Batch-resolve, via the REAL PHP function, the stored attribute name for a
 * (block, prefix, base) triple — same shell-out shape as rule 38's
 * `phpResolve()`, calling `sgs_media_element_stored_attr()` directly rather
 * than hand-copying its small STORED_AS override table a third time.
 *
 * @param {Array<{block:string, prefix:string, base:string}>} requests
 * @return {{generated: Object, storedNames: string[]}}
 */
function phpResolve( requests ) {
	const P = PLUGIN_ROOT.split( String.fromCharCode( 92 ) ).join( '/' );
	const body =
		// Both files guard on `defined('ABSPATH') || exit;` — without this PHP
		// exits silently with EMPTY stdout, surfacing downstream as a confusing
		// "Unexpected end of JSON input". Mirrors rule 38's identical guard.
		`define("ABSPATH", ${ JSON.stringify( P + '/' ) });` +
		'function esc_html($s){return $s;} function esc_html__($s,$d=null){return $s;}' +
		'function _doing_it_wrong($f,$m,$v){}' +
		`require ${ JSON.stringify( HELPERS_FILE.split( String.fromCharCode( 92 ) ).join( '/' ) ) };` +
		`$generated = require ${ JSON.stringify(
			GENERATED_MAP_FILE.split( String.fromCharCode( 92 ) ).join( '/' )
		) };` +
		`$requests = json_decode(${ JSON.stringify( JSON.stringify( requests ) ) }, true);` +
		'$stored = array_map(function($r){' +
		'return sgs_media_element_stored_attr($r["block"], $r["prefix"], $r["base"]);' +
		'}, $requests ?: array());' +
		'echo json_encode(array("generated"=>$generated, "storedNames"=>array_values($stored)));';
	const out = execFileSync( 'php', [ '-r', body ], { encoding: 'utf8' } );
	return JSON.parse( out );
}

function loadGeneratedMap() {
	if ( cachedGeneratedMap ) return cachedGeneratedMap;
	if ( cachedGeneratedMapError ) throw cachedGeneratedMapError;
	try {
		const result = phpResolve( [] );
		cachedGeneratedMap = result.generated || {};
		return cachedGeneratedMap;
	} catch ( e ) {
		cachedGeneratedMapError = e;
		throw e;
	}
}

/**
 * Resolve stored attribute names for a set of (prefix, base) pairs against
 * ONE block, expanding each base into its Tablet/Mobile siblings when the
 * generated map's own `tiered` list says that base carries tiers.
 *
 * @param {string} blockSlug
 * @param {Array<{prefix:string, base:string}>} pairs
 * @return {string[]} Stored attribute names (deduplicated).
 */
function resolveStoredNames( blockSlug, pairs ) {
	const generated = loadGeneratedMap();
	const tiered = generated.tiered || [];
	const requests = [];
	for ( const { prefix, base } of pairs ) {
		const tiers = tiered.includes( base ) ? [ '', 'Tablet', 'Mobile' ] : [ '' ];
		for ( const tier of tiers ) {
			requests.push( { block: blockSlug, prefix, base: base + tier } );
		}
	}
	if ( ! requests.length ) return [];
	const { storedNames } = phpResolve( requests );
	const out = [];
	( storedNames || [] ).forEach( ( n ) => {
		if ( ! out.includes( n ) ) out.push( n );
	} );
	return out;
}

function runDumpJson() {
	const out = execFileSync( process.execPath, [ CHECK_DEAD_CONTROLS_SCRIPT, '--dump-json' ], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	} );
	return JSON.parse( out );
}

/**
 * Same fixture seam `core/selftest.js` already wires generically for ANY
 * rule via `_dead-controls-dump.json` at the fixture root (built for rule
 * 34, reused here unmodified) — `check-dead-controls.js --dump-json` always
 * scans the REAL `src/blocks` tree and accepts no `--blocks-dir` flag, so a
 * fixture's synthetic block can never appear as a real dump row.
 */
function loadDumpRows( ctx ) {
	if ( ctx && Array.isArray( ctx.__deadControlsDumpRows ) ) return ctx.__deadControlsDumpRows;
	if ( cachedDumpError ) throw cachedDumpError;
	if ( ! cachedDumpRows ) {
		try {
			const rows = runDumpJson();
			if ( ! Array.isArray( rows ) || rows.length === 0 ) {
				throw new Error(
					'check-dead-controls.js --dump-json produced a zero-length dump — treated as a producer ' +
						'FAILURE, not "nothing to report".'
				);
			}
			cachedDumpRows = rows;
		} catch ( e ) {
			cachedDumpError = e;
			throw e;
		}
	}
	return cachedDumpRows;
}

// Matches an actual JSX mount (`<MediaElementPanel`, `<MediaElementPanel/>`,
// `<MediaElementPanel …`) — deliberately NOT a bare `indexOf('MediaElementPanel')`
// substring check. `ctx.stripped()` would be the natural comment-blanking tool
// here, but `@babel/parser` is an UNDECLARED transitive dependency of this
// plugin (see `core/sources.js`'s own header) and is genuinely absent in some
// environments (confirmed live while building this rule) — when it's missing,
// `strippedText()` silently falls back to raw, unstripped text. Relying on
// stripping would make this rule's correctness depend on an optional
// dependency being present. Requiring the JSX-tag shape instead means a prose
// comment merely NAMING the component (e.g. "the real runtime dispatcher
// (`MediaElementPanel`)" — a real bug hit building this rule's own
// negative-control fixtures, still visible in their header comments) can
// never false-positive, with or without comment stripping.
const MOUNTS_MEDIA_ELEMENT_PANEL_RE = /<MediaElementPanel(?=[\s/>])/;
// Any JSX-mounted component name, capitalised per the house/React convention
// — used to pick the right line inside a barrel re-export (see below).
const JSX_COMPONENT_NAME_RE = /<([A-Z]\w*)/g;
// A barrel's own re-export line: `export { default as Name } from './sub';`
// or `export { Name } from './sub';` — same shape `core/components.js`'s own
// `EXPORT_RE` already parses for the identical reason.
const BARREL_EXPORT_RE = /export\s*\{([^}]*)\}\s*from\s*['"](\.\/[^'"]+)['"]/g;

/**
 * Resolve a bare module specifier (no extension) to the real file it names —
 * either the file itself (`Foo` -> `Foo.js`) or, when it names a directory,
 * that directory's barrel `index.js`.
 */
function resolveModuleFile( basePath ) {
	const candidates = [ basePath, basePath + '.js', basePath + '.jsx', path.join( basePath, 'index.js' ) ];
	for ( const candidate of candidates ) {
		if ( fs.existsSync( candidate ) && fs.statSync( candidate ).isFile() ) return candidate;
	}
	return null;
}

/**
 * The empirically-required special case (see the header's "THE FIX"
 * section): does this block mount the real runtime dispatcher — directly in
 * its own edit.js, one import-hop away in a local file it imports, or TWO
 * hops away through a barrel re-export (`sgs/media`'s real shape: edit.js
 * imports `MediaPanelLayout` from the `src/components` BARREL, i.e.
 * `'../../components'` -> `index.js`, which itself re-exports
 * `MediaPanelLayout` from `'./media/MediaPanelLayout'` — the file that
 * actually mounts `<MediaElementPanel>` six times over)?
 *
 * A first attempt reused `core/components.js`'s `resolveComponentFiles()`
 * (the shared name -> defining-file map rule 31 and `check-dead-controls.js`
 * already trust) instead of hand-rolling this — and it FAILED on the real
 * `sgs/media` block too: that resolver only reads files directly inside
 * `src/components/` (`fs.readdirSync` with no recursion), so a component one
 * directory deeper (`src/components/media/MediaPanelLayout.js`) is invisible
 * to it. Neither shortcut works; the barrel-follow below is bounded (it only
 * follows a re-export line naming a component THIS edit.js actually mounts
 * as JSX) rather than a general module resolver.
 *
 * @param {Object} ctx
 * @param {string} blockDir Absolute path to the block's directory.
 * @return {boolean}
 */
function mountsMediaElementPanel( ctx, blockDir ) {
	const editFile = path.join( blockDir, 'edit.js' );
	let editText = '';
	try {
		editText = ctx.text( editFile ) || '';
	} catch ( e ) {
		editText = '';
	}
	if ( ! editText ) return false;
	if ( MOUNTS_MEDIA_ELEMENT_PANEL_RE.test( editText ) ) return true;

	const mountedNames = new Set();
	let nameMatch;
	JSX_COMPONENT_NAME_RE.lastIndex = 0;
	while ( ( nameMatch = JSX_COMPONENT_NAME_RE.exec( editText ) ) ) mountedNames.add( nameMatch[ 1 ] );

	const visited = new Set();
	const importRe = /from\s+['"](\.[^'"]+)['"]/g;
	let m;
	while ( ( m = importRe.exec( editText ) ) ) {
		const file = resolveModuleFile( path.resolve( blockDir, m[ 1 ] ) );
		if ( ! file || visited.has( file ) ) continue;
		visited.add( file );
		let text = '';
		try {
			text = ctx.text( file ) || '';
		} catch ( e ) {
			text = '';
		}
		if ( MOUNTS_MEDIA_ELEMENT_PANEL_RE.test( text ) ) return true;

		// One more hop: `file` may itself be a barrel re-exporting a name this
		// block mounts — follow only the line(s) that name it.
		BARREL_EXPORT_RE.lastIndex = 0;
		let barrelMatch;
		while ( ( barrelMatch = BARREL_EXPORT_RE.exec( text ) ) ) {
			const exportedNames = barrelMatch[ 1 ]
				.split( ',' )
				.map( ( part ) => part.trim().split( /\s+as\s+/ ).pop().trim() );
			if ( ! exportedNames.some( ( n ) => mountedNames.has( n ) ) ) continue;
			const subFile = resolveModuleFile( path.resolve( path.dirname( file ), barrelMatch[ 2 ] ) );
			if ( ! subFile || visited.has( subFile ) ) continue;
			visited.add( subFile );
			let subText = '';
			try {
				subText = ctx.text( subFile ) || '';
			} catch ( e ) {
				subText = '';
			}
			if ( MOUNTS_MEDIA_ELEMENT_PANEL_RE.test( subText ) ) return true;
		}
	}
	return false;
}

/**
 * Find the block's own media-type-selector attribute for a `mediaElements`
 * entry's `prefix` — a string attribute with an `enum` overlapping
 * image/video/svg. Named-candidate first, then a scoped fallback scan.
 *
 * @param {Object} attributes block.json `attributes`.
 * @param {string} prefix `mediaElements` entry prefix ('' = unprefixed).
 * @return {{name:string, types:string[]}|null}
 */
function findMediaTypeAttr( attributes, prefix ) {
	const candidates = prefix ? [ prefix + 'MediaType', prefix + 'Type' ] : [ 'mediaType', 'type' ];
	for ( const name of candidates ) {
		const def = attributes[ name ];
		if ( def && def.type === 'string' && Array.isArray( def.enum ) ) {
			const types = def.enum.filter( ( t ) => MEDIA_TYPES.includes( t ) );
			if ( types.length ) return { name, types };
		}
	}
	// Fallback: any attribute correctly scoped to this prefix (or unprefixed,
	// for an empty prefix) whose enum overlaps the media-type vocabulary.
	const prefixLower = prefix.toLowerCase();
	for ( const [ name, def ] of Object.entries( attributes ) ) {
		if ( ! def || def.type !== 'string' || ! Array.isArray( def.enum ) ) continue;
		const types = def.enum.filter( ( t ) => MEDIA_TYPES.includes( t ) );
		if ( ! types.length ) continue;
		if ( prefix ) {
			if ( ! name.toLowerCase().startsWith( prefixLower ) ) continue;
		} else if ( /^[a-z]/.test( name ) === false ) {
			continue;
		}
		return { name, types };
	}
	return null;
}

module.exports = {
	id: '39-media-control-coverage',
	checklistItem: null,
	title:
		'A block adopting supports.sgs.mediaElements has a declared atom attribute with no editor ' +
		'control, or offers a media type none of its declared atoms actually support',
	scope: 'per-block',
	needs: [ 'json:block.json', 'text:edit.js' ],
	run( ctx, block ) {
		const ruleId = this.id;
		const blockDir = path.join( ctx.blocksDir, block.tail );
		const blockJsonFile = path.join( blockDir, 'block.json' );
		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is roster-drift territory

		const data = blockJson.data || {};
		const mediaElements =
			data.supports && data.supports.sgs && Array.isArray( data.supports.sgs.mediaElements )
				? data.supports.sgs.mediaElements
				: null;
		if ( ! mediaElements || ! mediaElements.length ) return []; // this block does not adopt the layer

		// THE FIX: a block mounting the real runtime dispatcher is covered for
		// BOTH parts by construction — see the header's "THE FIX" section.
		if ( mountsMediaElementPanel( ctx, blockDir ) ) return [];

		let registry;
		let dumpRows;
		try {
			registry = loadRegistry();
		} catch ( e ) {
			return [
				makeFinding( {
					rule: ruleId,
					block: block.slug,
					file: blockJsonFile,
					severity: 'error',
					kind: 'registry-load-failed',
					detail: `Could not load the media-atom registry to check this block's coverage: ${ e.message }`,
					fix:
						'Run `node -e "import(\'src/components/media/atoms/registry.js\')"` manually and fix ' +
						'whatever it throws.',
					keyParts: [ 'registry-load-failed' ],
				} ),
			];
		}

		const findings = [];

		for ( const entry of mediaElements ) {
			const prefix = typeof entry.prefix === 'string' ? entry.prefix : '';
			const atomIds =
				Array.isArray( entry.atoms ) && entry.atoms.length ? entry.atoms : Object.keys( registry );

			// ── Part A: declared attribute, no control (no dispatcher to cover it) ──
			const pairs = [];
			for ( const atomId of atomIds ) {
				const atom = registry[ atomId ];
				if ( ! atom ) continue; // unknown-atom-id is rule 38's business, not this rule's
				atom.bases.forEach( ( base ) => pairs.push( { prefix, base } ) );
			}
			if ( pairs.length ) {
				try {
					dumpRows = loadDumpRows( ctx );
				} catch ( e ) {
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: blockJsonFile,
							severity: 'error',
							kind: 'dump-producer-failed',
							detail: `check-dead-controls.js --dump-json failed to run: ${ e.message }`,
							fix:
								'Run `node plugins/sgs-blocks/scripts/check-dead-controls.js --dump-json` directly ' +
								'and fix whatever it throws before trusting this rule\'s Part A output.',
							keyParts: [ 'dump-producer-failed' ],
						} )
					);
					dumpRows = [];
				}
				const storedNames = resolveStoredNames( block.slug, pairs );
				for ( const attrName of storedNames ) {
					const row = dumpRows.find( ( r ) => r.block === block.slug && r.attr === attrName );
					if ( ! row ) continue; // the dump never scanned this (block,attr) — not this rule's business
					if ( row.controlPresent || row.exempt ) continue;
					findings.push(
						makeFinding( {
							rule: ruleId,
							block: block.slug,
							file: blockJsonFile,
							severity: 'warn',
							kind: 'declared-without-control',
							detail:
								`"${ attrName }" is injected by this block's adopted media atoms (prefix ` +
								`${ JSON.stringify( prefix ) }), but check-dead-controls.js reports NO editor ` +
								'control for it and this block does not mount `<MediaElementPanel>` (the runtime ' +
								'dispatcher that would otherwise render it) — nothing lets the client set it.',
							fix:
								'Mount `<MediaElementPanel>` (directly, or via a local wrapper component) for this ' +
								"mediaElements entry so the atom's own control renders, or remove the atom/base " +
								'from the declaration if this attribute is not meant to be client-editable.',
							keyParts: [ 'declared-without-control', prefix, attrName ],
						} )
					);
				}
			}

			// ── Part B: a media type the enum offers, no declared atom supports ──
			const typeAttr = findMediaTypeAttr( data.attributes || {}, prefix );
			if ( ! typeAttr ) continue; // no type-selector found for this entry — not this rule's business
			for ( const atomId of atomIds ) {
				const atom = registry[ atomId ];
				if ( ! atom ) continue;
				const missing = typeAttr.types.filter( ( t ) => ! atom.types.includes( t ) );
				if ( ! missing.length ) continue;
				findings.push(
					makeFinding( {
						rule: ruleId,
						block: block.slug,
						file: blockJsonFile,
						severity: 'warn',
						kind: 'type-coverage-gap',
						detail:
							`"${ typeAttr.name }" offers ${ JSON.stringify( missing ) }, but the declared atom ` +
							`"${ atomId }" (types: ${ JSON.stringify( atom.types ) }) does not support ` +
							`${ missing.length > 1 ? 'those' : 'that' } type${ missing.length > 1 ? 's' : '' } — ` +
							'and this block does not mount `<MediaElementPanel>`, so nothing dynamically hides or ' +
							'substitutes a control for the unsupported type. Picking it leaves this concept with ' +
							'no control at all.',
						fix:
							`Mount \`<MediaElementPanel>\` so the atom self-gates by type at runtime, or restrict ` +
							`"${ typeAttr.name }"'s enum to the types this block's declared atoms actually cover, ` +
							`or declare an additional atom that supports ${ JSON.stringify( missing ) } for this ` +
							'entry.',
						keyParts: [ 'type-coverage-gap', prefix, atomId, missing.join( ',' ) ],
					} )
				);
			}
		}

		return findings;
	},
	selfTest: {
		fixture: 'fixtures/39-media-control-coverage',
		mustFlag: [ 'missing-control-mustflag', 'type-mismatch-mustflag' ],
		mustNotFlag: [
			'sgs-media-silent',
			'before-after-silent',
			'exempt-atom-not-flagged',
		],
	},
};
