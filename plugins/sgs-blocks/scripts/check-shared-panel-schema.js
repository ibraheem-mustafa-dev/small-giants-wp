/**
 * check-shared-panel-schema.js
 *
 * STRUCTURAL GUARD — closes the gap in the "dead control" family that
 * check-dead-controls.js (control exists, nothing renders it) and
 * check-dead-pattern-attrs.py (pattern markup passes an undeclared attr) do
 * NOT cover: a block MOUNTS a shared panel from
 * container/components/ContainerWrapperControls.js, and that panel writes
 * `setAttributes({ key: shape })` for a fixed set of keys in a fixed SHAPE
 * (object vs scalar) — but the consuming block's OWN block.json either never
 * declares `key` at all, or declares it with the WRONG `type`. WordPress
 * SILENTLY DISCARDS a write to an undeclared attribute, and coerces a
 * mismatched-type write back to the attribute's default (D338/D563) — so the
 * control renders, the client changes it, nothing happens, no error anywhere.
 *
 * Three real, separately-shipped bugs this session were all this ONE root
 * cause:
 *   1. sgs/gallery mounted ContentBandPanel (writes contentBandBackground /
 *      contentBandPadding) with NEITHER attribute declared in its own
 *      block.json at all. Fixed by removing the mount (69d1a3d8).
 *   2. 15 blocks mounted WidthPanel (writes maxWidth/contentWidth as OBJECTS
 *      via ResponsiveOverride) while declaring both as "type":"string" in
 *      their own block.json. Fixed by migrating all 15 declarations to
 *      "type":"object","default":{}.
 *   3. sgs/feature-grid declared a dead `columns` object attr nothing read,
 *      while edit.js/render.php still used a legacy flat trio with no shared
 *      panel behind it. Fixed by rewiring to the object attr.
 *
 * MECHANISM
 * ---------
 *  1. Statically parse ContainerWrapperControls.js: for every exported panel
 *     function (WidthPanel, ContentBandPanel, LayoutPanel, BackgroundPanel,
 *     ShapeDividersPanel, GridItemDefaultsPanel — GridAreaPanel is
 *     DELIBERATELY excluded, its attr names are template-literal-derived from
 *     a runtime `areaName` prop, not static keys), extract every attribute
 *     key it writes via setAttributes({...}) and classify the write as
 *     OBJECT (bound through <ResponsiveOverride>/<BoxControl>/
 *     <ResponsiveBorderRadiusControl>, or a direct `{ ... }` object literal —
 *     e.g. the media-picker attrs) or SCALAR (anything else). This produces
 *     PANEL_ATTR_SHAPE, the ground-truth table.
 *  2. Parse the KIND_PANELS registry in the same file to know which panels
 *     the <ContainerWrapperControls kind="layout"|"section"|"content">
 *     aggregator pulls in per `kind` value.
 *  3. Scan every real block's src/blocks/*\/edit.js (COMMENTS STRIPPED FIRST
 *     — this project has been bitten twice by a grep matching a comment, not
 *     a live usage) for real JSX mounts: either a direct
 *     `<WidthPanel .../>`-style import+usage (gallery's pattern), or
 *     `<ContainerWrapperControls kind="X" .../>` (resolved via KIND_PANELS;
 *     a dynamic `kind={expr}` is reported as UNCLEAR and NOT cross-checked —
 *     this script refuses to guess, per this project's own
 *     migrate-tier-object.py S2/S3 convention).
 *  4. For every real mount, cross-check the consuming block's OWN block.json:
 *     every key the mounted panel(s) write must be DECLARED, and an
 *     OBJECT-shape write must be declared `"type":"object"`; a SCALAR-shape
 *     write must NOT be declared `"type":"object"`. Missing → MISSING_ATTR.
 *     Type wrong → TYPE_MISMATCH.
 *
 * NO HARDCODED ATTRIBUTE DICT (blub.db 260): the panel→attr→shape table is
 * DERIVED from ContainerWrapperControls.js on every run, not memorised. The
 * only constants are the panel function NAMES (a fixed, small, named export
 * list — the exact analogue of check-dead-controls.js's "small structural
 * allowlists, each with a one-line justification") and the three
 * OBJECT-family control component names (ResponsiveOverride / BoxControl /
 * ResponsiveBorderRadiusControl) used to classify identifier-only writes.
 *
 * Usage:
 *   node scripts/check-shared-panel-schema.js --survey     # census, exit 0 always
 *   node scripts/check-shared-panel-schema.js --check       # gate, exit 1 on any finding
 *   node scripts/check-shared-panel-schema.js --json        # machine-readable findings
 *   node scripts/check-shared-panel-schema.js --self-test   # synthetic + real fixtures
 *
 * Wired into `prebuild` / `npm run check:shared-panel-schema` in package.json.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const SHARED_CONTROLS_JS = path.join(
	ROOT,
	'src',
	'blocks',
	'container',
	'components',
	'ContainerWrapperControls.js'
);

// ---------------------------------------------------------------------------
// Structural constants (small, named, justified — not a data dictionary)
// ---------------------------------------------------------------------------

// The panel functions this guard understands. GridAreaPanel is deliberately
// excluded — see file docblock. If ContainerWrapperControls.js gains a new
// exported panel, add its name here in the SAME commit (this list is asserted
// against `export function` names in --self-test, so an omission is caught).
const PANEL_NAMES = [
	'WidthPanel',
	'ContentBandPanel',
	'LayoutPanel',
	'BackgroundPanel',
	'ShapeDividersPanel',
	'GridItemDefaultsPanel',
];

// Control components whose onChange hands setAttributes a whole OBJECT
// (a {desktop,tablet,mobile} tier object, a BoxControl {top,right,...} value,
// or a border-radius corner object) rather than a scalar. Derived from
// reading every onChange in the file once; kept as a named constant because
// re-deriving "which WP component APIs are object-shaped" from source alone
// is not possible — WordPress core doesn't self-describe this.
const OBJECT_FAMILY_TAGS = new Set( [
	'ResponsiveOverride',
	'BoxControl',
	'ResponsiveBorderRadiusControl',
] );

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

/**
 * Blank out // and /* *\/ comments IN PLACE (same length, newlines kept) so
 * every later index/line-number computed against the result still lines up
 * with the original file. This is what stops a comment-only mention (e.g.
 * cta-section's "ContentBandPanel sub-panels still write to LEGACY FLAT
 * attrs") from being read as a real JSX mount — the project's own recorded
 * failure mode (`a-grep-for-a-class-name-is-not-a-usage-census`).
 *
 * Deliberately naive about strings containing `//` or `/*` (this codebase's
 * JSX/JS does not do that in the files this script scans); good enough for a
 * structural guard, not a general-purpose JS lexer.
 *
 * @param {string} src
 * @returns {string}
 */
function blankComments( src ) {
	let out = '';
	let i = 0;
	const n = src.length;
	while ( i < n ) {
		if ( src[ i ] === '/' && src[ i + 1 ] === '/' ) {
			let j = i;
			while ( j < n && src[ j ] !== '\n' ) {
				out += src[ j ] === '\n' ? '\n' : ' ';
				j++;
			}
			i = j;
			continue;
		}
		if ( src[ i ] === '/' && src[ i + 1 ] === '*' ) {
			let j = i;
			while ( j < n && ! ( src[ j ] === '*' && src[ j + 1 ] === '/' ) ) {
				out += src[ j ] === '\n' ? '\n' : ' ';
				j++;
			}
			// consume the closing */
			out += '  ';
			i = j + 2;
			continue;
		}
		out += src[ i ];
		i++;
	}
	return out;
}

/**
 * Line number (1-based) for a character index into `src`.
 *
 * @param {string} src
 * @param {number} idx
 * @returns {number}
 */
function lineAt( src, idx ) {
	let line = 1;
	for ( let i = 0; i < idx && i < src.length; i++ ) {
		if ( src[ i ] === '\n' ) {
			line++;
		}
	}
	return line;
}

/**
 * Given `src[openIdx]` is an opening bracket char, return the index of its
 * matching closing bracket (balanced, ignoring bracket chars inside quoted
 * strings or template literals).
 *
 * @param {string} src
 * @param {number} openIdx
 * @param {string} openChar
 * @param {string} closeChar
 * @returns {number} Index of the matching close, or -1 if unbalanced.
 */
function findMatching( src, openIdx, openChar, closeChar ) {
	let depth = 0;
	let inStr = null; // one of ' " `
	for ( let i = openIdx; i < src.length; i++ ) {
		const c = src[ i ];
		if ( inStr ) {
			if ( c === '\\' ) {
				i++; // skip escaped char
				continue;
			}
			if ( c === inStr ) {
				inStr = null;
			}
			continue;
		}
		if ( c === '"' || c === "'" || c === '`' ) {
			inStr = c;
			continue;
		}
		if ( c === openChar ) {
			depth++;
		} else if ( c === closeChar ) {
			depth--;
			if ( depth === 0 ) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * Split the inner text of an object literal ("a: 1, b: { c: 2 }") into
 * top-level key/value entries, respecting nested {}, [], () and quotes.
 *
 * @param {string} inner
 * @returns {Array<{key: string, value: string}>}
 */
function splitTopLevelEntries( inner ) {
	const entries = [];
	let depth = 0;
	let inStr = null;
	let start = 0;
	let colonIdx = -1;
	const flush = ( end ) => {
		const raw = inner.slice( start, end ).trim();
		if ( ! raw ) {
			return;
		}
		if ( colonIdx === -1 ) {
			return; // shorthand `{ foo }` — not a setAttributes()-style write we can classify by key name alone; skip.
		}
		const key = inner.slice( start, colonIdx ).trim();
		const value = inner.slice( colonIdx + 1, end ).trim();
		if ( /^[A-Za-z_$][\w$]*$/.test( key ) ) {
			entries.push( { key, value } );
		}
	};
	for ( let i = 0; i < inner.length; i++ ) {
		const c = inner[ i ];
		if ( inStr ) {
			if ( c === '\\' ) {
				i++;
				continue;
			}
			if ( c === inStr ) {
				inStr = null;
			}
			continue;
		}
		if ( c === '"' || c === "'" || c === '`' ) {
			inStr = c;
			continue;
		}
		if ( c === '{' || c === '(' || c === '[' ) {
			depth++;
		} else if ( c === '}' || c === ')' || c === ']' ) {
			depth--;
		} else if ( c === ':' && depth === 0 && colonIdx === -1 ) {
			colonIdx = i;
		} else if ( c === ',' && depth === 0 ) {
			flush( i );
			start = i + 1;
			colonIdx = -1;
		}
	}
	flush( inner.length );
	return entries;
}

// ---------------------------------------------------------------------------
// Step 1 — parse ContainerWrapperControls.js → PANEL_ATTR_SHAPE
// ---------------------------------------------------------------------------

/**
 * @typedef {'object'|'scalar'} AttrShape
 */

/**
 * Extract the source span of `export function <name>( ... ) { ... }` for a
 * named panel, using balanced-brace matching on the function body.
 *
 * @param {string} src
 * @param {string} name
 * @returns {{start: number, end: number, body: string}|null}
 */
function extractFunctionSpan( src, name ) {
	const re = new RegExp( `export\\s+function\\s+${ name }\\s*\\(` );
	const m = re.exec( src );
	if ( ! m ) {
		return null;
	}
	const parenOpen = src.indexOf( '(', m.index );
	const parenClose = findMatching( src, parenOpen, '(', ')' );
	if ( parenClose === -1 ) {
		return null;
	}
	const braceOpen = src.indexOf( '{', parenClose );
	const braceClose = findMatching( src, braceOpen, '{', '}' );
	if ( braceClose === -1 ) {
		return null;
	}
	return { start: braceOpen, end: braceClose, body: src.slice( braceOpen, braceClose + 1 ) };
}

/**
 * Nearest preceding JSX opening tag name before `idx` in `body` (bounded
 * lookback so an unrelated tag far above can't be picked up).
 *
 * @param {string} body
 * @param {number} idx
 * @param {number} [lookback]
 * @returns {string|null}
 */
function nearestPrecedingTag( body, idx, lookback = 1200 ) {
	const from = Math.max( 0, idx - lookback );
	const window = body.slice( from, idx );
	const re = /<([A-Za-z_][\w.]*)\b/g;
	let last = null;
	let m;
	while ( ( m = re.exec( window ) ) ) {
		last = m[ 1 ];
	}
	return last;
}

/**
 * Classify every setAttributes({...}) write inside one panel function body.
 *
 * @param {string} body Panel function body (from extractFunctionSpan).
 * @param {string} fnStart Absolute offset of `body` within the full file (for evidence lines).
 * @param {string} fullSrc Full file source (for line numbers).
 * @returns {Map<string, {shape: AttrShape, line: number}>}
 */
function classifyPanelWrites( body, fnStartOffset, fullSrc ) {
	const shapes = new Map();
	const record = ( key, shape, absIdx ) => {
		const existing = shapes.get( key );
		// OBJECT is sticky: if ANY write to this key in this panel is
		// object-shaped, treat the key as object-shaped overall — a
		// scalar-looking secondary write (e.g. a `Tablet`/`Mobile` sibling
		// key with no object wrapper) should never downgrade a real
		// tier-object attribute.
		if ( existing && existing.shape === 'object' ) {
			return;
		}
		shapes.set( key, { shape, line: lineAt( fullSrc, fnStartOffset + absIdx ) } );
	};

	// Pass A — direct single-param passthrough: onChange={ ( x ) => setAttributes( { key: x } ) }
	const passthroughRe = /onChange=\{\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>\s*setAttributes\(\s*\{\s*([A-Za-z_$][\w$]*)\s*:\s*\1\s*\}\s*\)\s*\}/g;
	let m;
	while ( ( m = passthroughRe.exec( body ) ) ) {
		const tag = nearestPrecedingTag( body, m.index );
		const shape = OBJECT_FAMILY_TAGS.has( tag ) ? 'object' : 'scalar';
		record( m[ 2 ], shape, m.index );
	}

	// Pass B — two-param passthrough (ResponsiveBorderRadiusControl's
	// `( _tier, next ) => setAttributes( { key: next } )`).
	const passthrough2Re = /onChange=\{\s*\(\s*[A-Za-z_$][\w$]*\s*,\s*([A-Za-z_$][\w$]*)\s*\)\s*=>\s*setAttributes\(\s*\{\s*([A-Za-z_$][\w$]*)\s*:\s*\1\s*\}\s*\)\s*\}/g;
	while ( ( m = passthrough2Re.exec( body ) ) ) {
		const tag = nearestPrecedingTag( body, m.index );
		const shape = OBJECT_FAMILY_TAGS.has( tag ) ? 'object' : 'scalar';
		record( m[ 2 ], shape, m.index );
	}

	// Pass C / D — every remaining setAttributes({...}) call, generic:
	// balanced-brace extract the argument object, split top-level keys, and
	// classify each value. A value that itself starts with `{` (a literal
	// object — e.g. the media-picker `{ id, url, alt }` shape) is OBJECT.
	// Everything else defaults to SCALAR unless it is a bare identifier that
	// resolves to an OBJECT-family tag immediately preceding this call (the
	// same rule as passes A/B, covering any shape this regex-first pass
	// missed structurally rather than duplicating a finding already caught).
	const callRe = /\bsetAttributes\s*\(/g;
	while ( ( m = callRe.exec( body ) ) ) {
		const parenOpen = m.index + m[ 0 ].length - 1;
		const parenClose = findMatching( body, parenOpen, '(', ')' );
		if ( parenClose === -1 ) {
			continue;
		}
		const argText = body.slice( parenOpen + 1, parenClose ).trim();
		if ( ! argText.startsWith( '{' ) ) {
			continue;
		}
		const braceClose = findMatching( body, parenOpen + 1 + ( argText === body.slice( parenOpen + 1, parenClose ).trim() ? body.slice( parenOpen + 1, parenClose ).indexOf( '{' ) : 0 ), '{', '}' );
		// Recompute the brace span robustly from the original body (avoid off-by-offset from trimming).
		const braceOpenAbs = body.indexOf( '{', parenOpen + 1 );
		if ( braceOpenAbs === -1 || braceOpenAbs > parenClose ) {
			continue;
		}
		const braceCloseAbs = findMatching( body, braceOpenAbs, '{', '}' );
		if ( braceCloseAbs === -1 ) {
			continue;
		}
		const inner = body.slice( braceOpenAbs + 1, braceCloseAbs );
		const entries = splitTopLevelEntries( inner );
		for ( const { key, value } of entries ) {
			if ( shapes.has( key ) ) {
				continue; // already resolved by pass A/B (the common, precise case)
			}
			let shape = 'scalar';
			if ( value.startsWith( '{' ) ) {
				shape = 'object'; // direct object literal (media picker, etc.)
			} else if ( /^[A-Za-z_$][\w$]*$/.test( value ) ) {
				const tag = nearestPrecedingTag( body, m.index );
				if ( OBJECT_FAMILY_TAGS.has( tag ) ) {
					shape = 'object';
				}
			}
			record( key, shape, m.index );
		}
	}

	return shapes;
}

/**
 * Parse ContainerWrapperControls.js into { panelName: Map<attr, {shape,line}> }.
 *
 * @param {string} src
 * @returns {Map<string, Map<string, {shape: AttrShape, line: number}>>}
 */
function buildPanelAttrShapeTable( rawSrc ) {
	// Comments blanked FIRST (same length, newlines kept) — otherwise a
	// backtick or brace inside an unrelated comment elsewhere in the function
	// body throws off balanced-brace matching for the REAL function span
	// (measured: LayoutPanel's body contains several `` `{desktop:'x', ...}` ``
	// code-snippet comments whose backticks silently swallowed the function's
	// real closing brace when matched against the raw source).
	const src = blankComments( rawSrc );
	const table = new Map();
	for ( const name of PANEL_NAMES ) {
		const span = extractFunctionSpan( src, name );
		if ( ! span ) {
			continue; // panel not found — reported separately as a self-test/consistency concern
		}
		table.set( name, classifyPanelWrites( span.body, span.start, src ) );
	}
	return table;
}

// ---------------------------------------------------------------------------
// Step 2 — parse KIND_PANELS → { kindName: Set(panelName) }
// ---------------------------------------------------------------------------

/**
 * @param {string} src
 * @returns {Map<string, Set<string>>}
 */
function buildKindPanelsTable( rawSrc ) {
	// Same rationale as buildPanelAttrShapeTable — blank comments before any
	// balanced-brace/bracket matching so an unrelated comment elsewhere in
	// the registry can't desync the KIND_PANELS array boundaries.
	const src = blankComments( rawSrc );
	const result = new Map();
	const anchor = src.indexOf( 'const KIND_PANELS' );
	if ( anchor === -1 ) {
		return result;
	}
	const braceOpen = src.indexOf( '{', anchor );
	const braceClose = findMatching( src, braceOpen, '{', '}' );
	if ( braceClose === -1 ) {
		return result;
	}
	const registryText = src.slice( braceOpen + 1, braceClose );

	// Each top-level entry looks like `kindName: [ ... ],`. Find each
	// `identifier:` at depth 0 followed by a `[`, then balanced-match the
	// array.
	const kindRe = /(^|[,{\s])([A-Za-z_$][\w$]*)\s*:\s*\[/g;
	let m;
	while ( ( m = kindRe.exec( registryText ) ) ) {
		const kindName = m[ 2 ];
		const bracketOpen = registryText.indexOf( '[', m.index + m[ 0 ].length - 1 );
		const bracketClose = findMatching( registryText, bracketOpen, '[', ']' );
		if ( bracketClose === -1 ) {
			continue;
		}
		const arrayText = registryText.slice( bracketOpen, bracketClose + 1 );
		const panels = new Set();
		for ( const name of PANEL_NAMES ) {
			const tagRe = new RegExp( `<${ name }\\b` );
			if ( tagRe.test( arrayText ) ) {
				panels.add( name );
			}
		}
		result.set( kindName, panels );
	}
	return result;
}

// ---------------------------------------------------------------------------
// Step 3 — find real JSX mounts across every block's edit.js
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Mount
 * @property {string} block
 * @property {string} file
 * @property {number} line
 * @property {'aggregator'|'direct'} kindOf
 * @property {string[]} panels Resolved panel names (empty + unclear=true when kind is dynamic).
 * @property {boolean} unclear
 * @property {string} [rawKind]
 */

/**
 * Extract a JSX opening tag's attribute text, handling `{ expr }` values
 * that may themselves contain `>` or `/` (brace-depth aware).
 *
 * @param {string} src
 * @param {number} tagNameEndIdx Index right after `<TagName`.
 * @returns {{attrText: string, tagEnd: number}|null}
 */
function extractTagAttrs( src, tagNameEndIdx ) {
	let i = tagNameEndIdx;
	let depth = 0;
	let inStr = null;
	while ( i < src.length ) {
		const c = src[ i ];
		if ( inStr ) {
			if ( c === '\\' ) {
				i += 2;
				continue;
			}
			if ( c === inStr ) {
				inStr = null;
			}
			i++;
			continue;
		}
		if ( c === '"' || c === "'" ) {
			inStr = c;
			i++;
			continue;
		}
		if ( c === '{' ) {
			depth++;
			i++;
			continue;
		}
		if ( c === '}' ) {
			depth--;
			i++;
			continue;
		}
		if ( depth === 0 && c === '>' ) {
			return { attrText: src.slice( tagNameEndIdx, i ), tagEnd: i };
		}
		i++;
	}
	return null;
}

/**
 * @param {string} blockDir
 * @param {string} blockName
 * @param {Map<string, Set<string>>} kindPanels
 * @returns {Mount[]}
 */
function findMounts( blockDir, blockName, kindPanels ) {
	const editPath = path.join( blockDir, 'edit.js' );
	if ( ! fs.existsSync( editPath ) ) {
		return [];
	}
	const raw = fs.readFileSync( editPath, 'utf8' );
	const src = blankComments( raw );
	const mounts = [];

	// Aggregator mounts: <ContainerWrapperControls ...>
	const aggRe = /<ContainerWrapperControls\b/g;
	let m;
	while ( ( m = aggRe.exec( src ) ) ) {
		const tag = extractTagAttrs( src, aggRe.lastIndex );
		if ( ! tag ) {
			continue;
		}
		const kindStrMatch = /\bkind\s*=\s*["']([\w-]+)["']/.exec( tag.attrText );
		const kindDynamicMatch = /\bkind\s*=\s*\{/.test( tag.attrText );
		const line = lineAt( raw, m.index );
		if ( kindStrMatch ) {
			const kind = kindStrMatch[ 1 ];
			const panels = kindPanels.has( kind )
				? Array.from( kindPanels.get( kind ) )
				: Array.from( kindPanels.get( 'section' ) || [] );
			mounts.push( { block: blockName, file: editPath, line, kindOf: 'aggregator', panels, unclear: false, rawKind: kind } );
		} else if ( kindDynamicMatch ) {
			mounts.push( { block: blockName, file: editPath, line, kindOf: 'aggregator', panels: [], unclear: true, rawKind: '(dynamic)' } );
		} else {
			// No `kind` prop at all → component default is 'section'.
			const panels = Array.from( kindPanels.get( 'section' ) || [] );
			mounts.push( { block: blockName, file: editPath, line, kindOf: 'aggregator', panels, unclear: false, rawKind: '(default: section)' } );
		}
	}

	// Direct named-panel mounts: <WidthPanel ... />, <ContentBandPanel ... />, etc.
	for ( const name of PANEL_NAMES ) {
		const tagRe = new RegExp( `<${ name }\\b`, 'g' );
		while ( ( m = tagRe.exec( src ) ) ) {
			const line = lineAt( raw, m.index );
			mounts.push( { block: blockName, file: editPath, line, kindOf: 'direct', panels: [ name ], unclear: false } );
		}
	}

	return mounts;
}

// ---------------------------------------------------------------------------
// Step 4 — cross-check mounts against block.json
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Finding
 * @property {'MISSING_ATTR'|'TYPE_MISMATCH'} kind
 * @property {string} block
 * @property {string} panel
 * @property {string} attr
 * @property {AttrShape} expectedShape
 * @property {string} [declaredType]
 * @property {string} file
 * @property {number} line
 */

/**
 * @param {Map<string, Map<string, {shape: AttrShape, line: number}>>} panelAttrShape
 * @param {Map<string, Set<string>>} kindPanels
 * @returns {{findings: Finding[], unclearMounts: Mount[], blocksScanned: number}}
 */
function runDetection( panelAttrShape, kindPanels ) {
	const findings = [];
	const unclearMounts = [];
	let blocksScanned = 0;

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'container' && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );

	for ( const dir of blockDirs ) {
		const blockJsonPath = path.join( dir, 'block.json' );
		if ( ! fs.existsSync( blockJsonPath ) ) {
			continue;
		}
		blocksScanned++;
		let blockJson;
		try {
			blockJson = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
		} catch ( e ) {
			continue; // malformed block.json is a different gate's problem
		}
		const declared = blockJson.attributes || {};
		const blockName = blockJson.name || path.basename( dir );

		const mounts = findMounts( dir, blockName, kindPanels );
		for ( const mount of mounts ) {
			if ( mount.unclear ) {
				unclearMounts.push( mount );
				continue;
			}
			for ( const panelName of mount.panels ) {
				const attrShape = panelAttrShape.get( panelName );
				if ( ! attrShape ) {
					continue;
				}
				for ( const [ attr, info ] of attrShape ) {
					const decl = declared[ attr ];
					if ( ! decl ) {
						findings.push( {
							kind: 'MISSING_ATTR',
							block: blockName,
							panel: panelName,
							attr,
							expectedShape: info.shape,
							file: mount.file,
							line: mount.line,
						} );
						continue;
					}
					const declaredType = decl.type;
					const isObjectDeclared = declaredType === 'object';
					const shouldBeObject = info.shape === 'object';
					if ( isObjectDeclared !== shouldBeObject ) {
						findings.push( {
							kind: 'TYPE_MISMATCH',
							block: blockName,
							panel: panelName,
							attr,
							expectedShape: info.shape,
							declaredType: declaredType || '(untyped)',
							file: mount.file,
							line: mount.line,
						} );
					}
				}
			}
		}
	}

	return { findings, unclearMounts, blocksScanned };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function findingKey( f ) {
	return `${ f.kind }:${ f.block }:${ f.panel }:${ f.attr }`;
}

function printSurvey( findings, unclearMounts, panelAttrShape, blocksScanned ) {
	process.stdout.write( '[check-shared-panel-schema --survey]\n\n' );

	process.stdout.write( `Ground-truth panel table (from ContainerWrapperControls.js):\n` );
	for ( const [ panel, attrs ] of panelAttrShape ) {
		const parts = Array.from( attrs.entries() ).map( ( [ k, v ] ) => `${ k }:${ v.shape }` );
		process.stdout.write( `  ${ panel } — ${ parts.join( ', ' ) || '(no writes found)' }\n` );
	}

	process.stdout.write( `\nBlocks scanned: ${ blocksScanned }\n` );
	process.stdout.write( `Findings: ${ findings.length }\n\n` );

	const byKind = { MISSING_ATTR: [], TYPE_MISMATCH: [] };
	for ( const f of findings ) {
		byKind[ f.kind ].push( f );
	}

	for ( const kind of [ 'MISSING_ATTR', 'TYPE_MISMATCH' ] ) {
		const list = byKind[ kind ];
		process.stdout.write( `${ kind } (${ list.length })\n` );
		const byPanel = new Map();
		for ( const f of list ) {
			if ( ! byPanel.has( f.panel ) ) {
				byPanel.set( f.panel, [] );
			}
			byPanel.get( f.panel ).push( f );
		}
		for ( const [ panel, items ] of byPanel ) {
			process.stdout.write( `  ${ panel }:\n` );
			for ( const f of items ) {
				const rel = path.relative( ROOT, f.file );
				const detail =
					f.kind === 'MISSING_ATTR'
						? `expects "type":"${ f.expectedShape === 'object' ? 'object' : '(non-object)' }", not declared at all`
						: `expects "type":"${ f.expectedShape === 'object' ? 'object' : '(non-object)' }", declared "${ f.declaredType }"`;
				process.stdout.write( `    - ${ f.block }.${ f.attr } — ${ detail } (mounted ${ rel }:${ f.line })\n` );
			}
		}
		process.stdout.write( '\n' );
	}

	if ( unclearMounts.length ) {
		process.stdout.write( `UNCLEAR (dynamic kind={...}, not cross-checked) — ${ unclearMounts.length }:\n` );
		for ( const u of unclearMounts ) {
			const rel = path.relative( ROOT, u.file );
			process.stdout.write( `  - ${ u.block } (${ rel }:${ u.line })\n` );
		}
	}
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function assert( cond, label, failures ) {
	if ( cond ) {
		process.stdout.write( `  [PASS] ${ label }\n` );
	} else {
		process.stdout.write( `  [FAIL] ${ label }\n` );
		failures.push( label );
	}
}

function runSelfTest() {
	process.stdout.write( '[check-shared-panel-schema --self-test]\n\n' );
	const failures = [];

	// -------------------------------------------------------------------
	// Ground-truth parse of the REAL ContainerWrapperControls.js — every
	// assertion below depends on this parsing correctly, so prove it first.
	// -------------------------------------------------------------------
	const realSrc = readIfExists( SHARED_CONTROLS_JS );
	assert( realSrc.length > 0, 'ContainerWrapperControls.js is readable', failures );
	const realPanelShape = buildPanelAttrShapeTable( realSrc );
	const realKindPanels = buildKindPanelsTable( realSrc );

	assert(
		PANEL_NAMES.every( ( n ) => new RegExp( `export\\s+function\\s+${ n }\\s*\\(` ).test( realSrc ) ),
		'every name in PANEL_NAMES has a matching `export function` in the source (no stale allowlist entry)',
		failures
	);

	const widthShape = realPanelShape.get( 'WidthPanel' );
	assert(
		!! widthShape && widthShape.get( 'maxWidth' )?.shape === 'object' && widthShape.get( 'contentWidth' )?.shape === 'object',
		'WidthPanel: maxWidth + contentWidth both classified OBJECT',
		failures
	);

	const layoutShape = realPanelShape.get( 'LayoutPanel' );
	assert(
		!! layoutShape &&
			[ 'columns', 'gap', 'gridTemplateColumns', 'gridTemplateRows' ].every( ( k ) => layoutShape.get( k )?.shape === 'object' ) &&
			layoutShape.get( 'layout' )?.shape === 'scalar',
		'LayoutPanel: columns/gap/gridTemplateColumns/gridTemplateRows OBJECT, layout SCALAR',
		failures
	);

	assert(
		realKindPanels.get( 'layout' )?.has( 'ContentBandPanel' ) === true,
		'KIND_PANELS.layout includes ContentBandPanel (parsed from the registry, not assumed)',
		failures
	);
	assert(
		realKindPanels.get( 'content' )?.has( 'ContentBandPanel' ) !== true,
		'KIND_PANELS.content does NOT include ContentBandPanel',
		failures
	);

	// -------------------------------------------------------------------
	// Real negative control 1 — cta-section/edit.js's ContentBandPanel
	// mentions are COMMENTS ONLY (lines 20 + 225 in the file as authored).
	// This is the project's own recorded false-positive class
	// (`a-grep-for-a-class-name-is-not-a-usage-census`).
	// -------------------------------------------------------------------
	const ctaMounts = findMounts( path.join( BLOCKS_DIR, 'cta-section' ), 'sgs/cta-section', realKindPanels );
	assert(
		! ctaMounts.some( ( mnt ) => mnt.panels.includes( 'ContentBandPanel' ) ),
		'cta-section/edit.js: comment-only "ContentBandPanel" mentions are NOT read as a mount',
		failures
	);

	// -------------------------------------------------------------------
	// Real negative control 2 — sgs/card-grid's maxWidth/contentWidth are
	// already fixed to "type":"object" (verified live 2026-08-11/12
	// migration). WidthPanel-driven attrs on this block must pass clean.
	// -------------------------------------------------------------------
	const { findings: realFindings } = runDetection( realPanelShape, realKindPanels );
	assert(
		! realFindings.some(
			( f ) => f.block === 'sgs/card-grid' && ( f.attr === 'maxWidth' || f.attr === 'contentWidth' )
		),
		'sgs/card-grid: maxWidth/contentWidth (WidthPanel) pass clean — already migrated',
		failures
	);

	// -------------------------------------------------------------------
	// Synthetic fixtures — build a miniature ContainerWrapperControls.js +
	// edit.js + block.json set in a tmp dir so positive controls (must FAIL)
	// are provable without depending on the real tree ever regressing.
	// -------------------------------------------------------------------
	const os = require( 'os' );
	const tmpDir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-panel-schema-self-test-' ) );
	try {
		const syntheticControls = `
export function WidthPanel( { attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label="Outer max-width"
			value={ attributes.maxWidth }
			onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
		>
			{ ( { ownValue } ) => <UnitControl value={ ownValue } /> }
		</ResponsiveOverride>
	);
}
export function ShapeDividersPanel( { attributes, setAttributes } ) {
	return (
		<SelectControl
			value={ attributes.shapeDividerTop }
			onChange={ ( val ) => setAttributes( { shapeDividerTop: val } ) }
		/>
	);
}
`;
		const synthPanelShape = buildPanelAttrShapeTable( syntheticControls );
		assert(
			synthPanelShape.get( 'WidthPanel' )?.get( 'maxWidth' )?.shape === 'object',
			'synthetic fixture: ResponsiveOverride-bound write classified OBJECT',
			failures
		);
		assert(
			synthPanelShape.get( 'ShapeDividersPanel' )?.get( 'shapeDividerTop' )?.shape === 'scalar',
			'synthetic fixture: SelectControl-bound write classified SCALAR',
			failures
		);

		// Positive control 1 — MISSING_ATTR: block mounts <WidthPanel/> directly,
		// block.json declares NEITHER maxWidth nor contentWidth.
		const missingBlockDir = path.join( tmpDir, 'fake-missing-attr' );
		fs.mkdirSync( missingBlockDir, { recursive: true } );
		fs.writeFileSync(
			path.join( missingBlockDir, 'edit.js' ),
			`import { WidthPanel } from '../container/components/ContainerWrapperControls';\nexport default function Edit() {\n\treturn <InspectorControls><WidthPanel attributes={attributes} setAttributes={setAttributes} /></InspectorControls>;\n}\n`
		);
		fs.writeFileSync(
			path.join( missingBlockDir, 'block.json' ),
			JSON.stringify( { name: 'sgs/fake-missing-attr', attributes: { someOtherAttr: { type: 'string' } } }, null, 2 )
		);

		// Positive control 2 — TYPE_MISMATCH: block declares maxWidth as string.
		const mismatchBlockDir = path.join( tmpDir, 'fake-type-mismatch' );
		fs.mkdirSync( mismatchBlockDir, { recursive: true } );
		fs.writeFileSync(
			path.join( mismatchBlockDir, 'edit.js' ),
			`import { WidthPanel } from '../container/components/ContainerWrapperControls';\nexport default function Edit() {\n\treturn <InspectorControls><WidthPanel attributes={attributes} setAttributes={setAttributes} /></InspectorControls>;\n}\n`
		);
		fs.writeFileSync(
			path.join( mismatchBlockDir, 'block.json' ),
			JSON.stringify( { name: 'sgs/fake-type-mismatch', attributes: { maxWidth: { type: 'string' } } }, null, 2 )
		);

		// Negative control 3 — clean block: declares maxWidth correctly as object.
		const cleanBlockDir = path.join( tmpDir, 'fake-clean' );
		fs.mkdirSync( cleanBlockDir, { recursive: true } );
		fs.writeFileSync(
			path.join( cleanBlockDir, 'edit.js' ),
			`import { WidthPanel } from '../container/components/ContainerWrapperControls';\nexport default function Edit() {\n\treturn <InspectorControls><WidthPanel attributes={attributes} setAttributes={setAttributes} /></InspectorControls>;\n}\n`
		);
		fs.writeFileSync(
			path.join( cleanBlockDir, 'block.json' ),
			JSON.stringify( { name: 'sgs/fake-clean', attributes: { maxWidth: { type: 'object', default: {} } } }, null, 2 )
		);

		// Negative control 4 — aggregator with a default (no `kind` prop) mount,
		// correctly declared: proves the "no kind attr → section default" path.
		const defaultKindDir = path.join( tmpDir, 'fake-default-kind' );
		fs.mkdirSync( defaultKindDir, { recursive: true } );
		fs.writeFileSync(
			path.join( defaultKindDir, 'edit.js' ),
			`import ContainerWrapperControls from '../container/components/ContainerWrapperControls';\nexport default function Edit() {\n\treturn <ContainerWrapperControls attributes={attributes} setAttributes={setAttributes} />;\n}\n`
		);
		fs.writeFileSync(
			path.join( defaultKindDir, 'block.json' ),
			JSON.stringify( { name: 'sgs/fake-default-kind', attributes: { maxWidth: { type: 'object', default: {} } } }, null, 2 )
		);

		// A fake KIND_PANELS: section → [WidthPanel] only (keeps this fixture
		// self-contained and independent of the real registry's other panels).
		const fakeKindPanels = new Map( [ [ 'section', new Set( [ 'WidthPanel' ] ) ] ] );

		const savedBlocksDir = BLOCKS_DIR;
		// runDetection() reads BLOCKS_DIR as a module-level const — re-implement
		// its body pointed at tmpDir instead of monkey-patching a const.
		const fixtureFindings = [];
		for ( const name of [ 'fake-missing-attr', 'fake-type-mismatch', 'fake-clean', 'fake-default-kind' ] ) {
			const dir = path.join( tmpDir, name );
			const bj = JSON.parse( fs.readFileSync( path.join( dir, 'block.json' ), 'utf8' ) );
			const mounts = findMounts( dir, bj.name, fakeKindPanels );
			for ( const mount of mounts ) {
				if ( mount.unclear ) {
					continue;
				}
				for ( const panelName of mount.panels ) {
					const attrShape = synthPanelShape.get( panelName );
					if ( ! attrShape ) {
						continue;
					}
					for ( const [ attr, info ] of attrShape ) {
						const decl = ( bj.attributes || {} )[ attr ];
						if ( ! decl ) {
							fixtureFindings.push( { kind: 'MISSING_ATTR', block: bj.name, attr } );
							continue;
						}
						const isObjectDeclared = decl.type === 'object';
						const shouldBeObject = info.shape === 'object';
						if ( isObjectDeclared !== shouldBeObject ) {
							fixtureFindings.push( { kind: 'TYPE_MISMATCH', block: bj.name, attr } );
						}
					}
				}
			}
		}
		void savedBlocksDir;

		assert(
			fixtureFindings.some( ( f ) => f.kind === 'MISSING_ATTR' && f.block === 'sgs/fake-missing-attr' && f.attr === 'maxWidth' ),
			'positive control: undeclared maxWidth on a WidthPanel mount → MISSING_ATTR',
			failures
		);
		assert(
			fixtureFindings.some( ( f ) => f.kind === 'TYPE_MISMATCH' && f.block === 'sgs/fake-type-mismatch' && f.attr === 'maxWidth' ),
			'positive control: maxWidth declared "type":"string" on a WidthPanel mount → TYPE_MISMATCH',
			failures
		);
		assert(
			! fixtureFindings.some( ( f ) => f.block === 'sgs/fake-clean' ),
			'negative control: correctly-declared maxWidth (type:object) passes clean',
			failures
		);
		assert(
			! fixtureFindings.some( ( f ) => f.block === 'sgs/fake-default-kind' ),
			'negative control: aggregator mount with NO kind prop resolves to section default and passes clean',
			failures
		);
	} finally {
		fs.rmSync( tmpDir, { recursive: true, force: true } );
	}

	process.stdout.write(
		failures.length === 0
			? '\n[check-shared-panel-schema --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-shared-panel-schema --self-test] ${ failures.length } FAILURE(S).\n`
	);
	process.exit( failures.length === 0 ? 0 : 1 );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
	const check = process.argv.includes( '--check' );
	const asJson = process.argv.includes( '--json' );

	const src = readIfExists( SHARED_CONTROLS_JS );
	if ( ! src ) {
		process.stderr.write( `[check-shared-panel-schema] cannot read ${ SHARED_CONTROLS_JS }\n` );
		process.exit( check ? 1 : 0 );
	}

	const panelAttrShape = buildPanelAttrShapeTable( src );
	const kindPanels = buildKindPanelsTable( src );
	const { findings, unclearMounts, blocksScanned } = runDetection( panelAttrShape, kindPanels );

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify( { findings, unclearMounts, blocksScanned }, null, 2 ) + '\n'
		);
	} else {
		printSurvey( findings, unclearMounts, panelAttrShape, blocksScanned );
	}

	if ( check ) {
		process.exit( findings.length > 0 ? 1 : 0 );
	}
	process.exit( 0 );
}

if ( process.argv.includes( '--self-test' ) ) {
	runSelfTest();
} else {
	main();
}

module.exports = {
	buildPanelAttrShapeTable,
	buildKindPanelsTable,
	findMounts,
	runDetection,
	findingKey,
};
