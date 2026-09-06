'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const crypto = require( 'crypto' );

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md
// source=file evidence=`@babel/*` confirmed NOT a declared devDependency of
// plugins/sgs-blocks/package.json (checked live 2026-08-03); it resolves only
// transitively via @wordpress/scripts today. Per the task's constraint we do
// not edit the shared package.json to declare it (concurrent agents are
// editing that file this session) — instead its absence is handled
// explicitly and loudly here, never silently.
let babelParser = null;
let babelTraverse = null;
let babelAvailable = true;
let babelUnavailableReason = null;

try {
	babelParser = require( '@babel/parser' );
} catch ( e ) {
	babelAvailable = false;
	babelUnavailableReason =
		`@babel/parser could not be required (${ e.message }). It is used ` +
		'transitively via @wordpress/scripts and is NOT a declared devDependency ' +
		'of plugins/sgs-blocks/package.json. If a future @wordpress/scripts bump ' +
		'drops it, every AST-based rule fails CLOSED via this message rather than ' +
		'silently skipping the block.';
}

if ( babelAvailable ) {
	try {
		const traverseModule = require( '@babel/traverse' );
		babelTraverse =
			typeof traverseModule === 'function'
				? traverseModule
				: traverseModule.default;
		if ( typeof babelTraverse !== 'function' ) {
			throw new Error( '@babel/traverse did not export a callable default' );
		}
	} catch ( e ) {
		babelAvailable = false;
		babelUnavailableReason =
			`@babel/traverse could not be required (${ e.message }). Same ` +
			'undeclared-transitive-dependency risk as @babel/parser.';
	}
}

const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [
		'jsx',
		'classProperties',
		'objectRestSpread',
		'optionalChaining',
		'nullishCoalescingOperator',
	],
	errorRecovery: false,
};

/**
 * One parse per file, one read per file, for the whole run — regardless of
 * how many rules ask for the same file. This is the design's main
 * performance + correctness lever (design §4.3).
 */
class SourceCache {
	constructor() {
		this._text = new Map();
		this._stripped = new Map();
		this._ast = new Map();
		this._json = new Map();
		this._reads = 0;
		this._parses = 0;
		this.manifest = new Map(); // path -> {bytes, mtime, sha256} — H10 run manifest
	}

	_readRaw( file ) {
		if ( this._text.has( file ) ) return this._text.get( file );
		if ( ! fs.existsSync( file ) ) {
			this._text.set( file, null );
			return null;
		}
		const buf = fs.readFileSync( file );
		this._reads += 1;
		const raw = buf.toString( 'utf8' );
		this._text.set( file, raw );
		const stat = fs.statSync( file );
		this.manifest.set( file, {
			bytes: stat.size,
			mtime: stat.mtime.toISOString(),
			sha256: crypto.createHash( 'sha256' ).update( buf ).digest( 'hex' ),
		} );
		return raw;
	}

	text( file ) {
		return this._readRaw( file );
	}

	json( file ) {
		if ( this._json.has( file ) ) return this._json.get( file );
		const raw = this._readRaw( file );
		if ( raw == null ) {
			const result = { ok: false, error: 'file-not-found', data: null };
			this._json.set( file, result );
			return result;
		}
		try {
			const result = { ok: true, error: null, data: JSON.parse( raw ) };
			this._json.set( file, result );
			return result;
		} catch ( e ) {
			const result = { ok: false, error: e.message, data: null };
			this._json.set( file, result );
			return result;
		}
	}

	/**
	 * Comment-stripped text. For .js this comes from the AST's own comment
	 * table (Babel), never a regex — dissolves H5 / STOP-GATE-COMMENT-STRIPPER
	 * for JS. For anything else (PHP/CSS) a single, documented, known-limited
	 * regex stripper is used — retained only because no better tool is in
	 * scope for this skeleton. Its known failure mode (a `/*` inside a string
	 * literal swallows the rest of the file) is NOT fixed here; callers must
	 * not treat it as authoritative for PHP.
	 */
	strippedText( file ) {
		if ( this._stripped.has( file ) ) return this._stripped.get( file );
		const raw = this._readRaw( file );
		if ( raw == null ) {
			this._stripped.set( file, null );
			return null;
		}
		let out;
		if ( path.extname( file ) === '.js' ) {
			const parsed = this.parse( file );
			if ( parsed.ok ) {
				out = raw;
				// Blank out comment ranges without shifting offsets, so any
				// downstream index/line math derived from the raw text stays valid.
				for ( const c of parsed.comments ) {
					out =
						out.slice( 0, c.start ) +
						' '.repeat( c.end - c.start ) +
						out.slice( c.end );
				}
			} else {
				out = raw; // parse-error already surfaced as its own finding
			}
		} else {
			// KNOWN-LIMITED (STOP-GATE-COMMENT-STRIPPER, D339d): a `/*` inside a
			// PHP/CSS string literal swallows the rest of the file. Do not treat
			// this as a general-purpose PHP parser.
			//
			// S1 fix (2026-09-02): `//` PHP line comments are stripped so a comment
			// merely MENTIONING an attribute name (e.g. "// FR-22-6: scalar attrs
			// are intentionally NOT read here") does not count as a live render
			// reference — proven false positive on 3 baselined rule-21 findings
			// (cta-section headline/body, hero subHeadline). Only a FULL-LINE `//`
			// comment (the first non-whitespace token on its line) is stripped —
			// deliberately not a trailing inline `//` after real code, since that
			// risks truncating a same-line string containing "//" (e.g. a URL).
			//
			// ⛔ ORDER IS LOAD-BEARING (2026-09-02 fix): line comments MUST be
			// stripped BEFORE block comments. Reversed — as it was until now — a
			// `/*`-shaped sequence sitting INSIDE a `//` comment opens a spurious
			// block comment that swallows everything up to the next `*/`. Measured:
			// `hero/render.php`'s line comment containing the literal text
			// `*Tablet/*Mobile` blanked ~50KB of real code, including the
			// `$attributes['contentWidth']` read and the `padding-inline:` emission
			// that rule 23 was checking for — producing a confident, wholly false
			// "contentWidth is declared but never read" finding on a block whose
			// band demonstrably works. Stripping line comments first removes the
			// `/*` before it can be misread. Do not swap these two back.
			if ( path.extname( file ) === '.php' ) {
				out = raw.replace( /^([ \t]*)\/\/.*$/gm, ( m, indent ) =>
					indent + ' '.repeat( m.length - indent.length )
				);
			} else {
				out = raw;
			}
			out = out.replace( /\/\*[\s\S]*?\*\//g, ( m ) => ' '.repeat( m.length ) );
		}
		this._stripped.set( file, out );
		return out;
	}

	parse( file ) {
		if ( this._ast.has( file ) ) return this._ast.get( file );
		const raw = this._readRaw( file );
		if ( raw == null ) {
			const result = { ok: false, error: 'file-not-found', ast: null, comments: [] };
			this._ast.set( file, result );
			return result;
		}
		if ( ! babelAvailable ) {
			const result = {
				ok: false,
				error: `babel-unavailable: ${ babelUnavailableReason }`,
				ast: null,
				comments: [],
			};
			this._ast.set( file, result );
			return result;
		}
		this._parses += 1;
		try {
			const tree = babelParser.parse( raw, BABEL_PARSE_OPTS );
			const result = { ok: true, error: null, ast: tree, comments: tree.comments || [] };
			this._ast.set( file, result );
			return result;
		} catch ( e ) {
			const result = { ok: false, error: e.message, ast: null, comments: [] };
			this._ast.set( file, result );
			return result;
		}
	}

	traverse( file, visitors ) {
		const parsed = this.parse( file );
		if ( ! parsed.ok ) return false;
		babelTraverse( parsed.ast, visitors );
		return true;
	}

	stats() {
		return { reads: this._reads, parses: this._parses };
	}
}

module.exports = { SourceCache, babelAvailable, babelUnavailableReason };
