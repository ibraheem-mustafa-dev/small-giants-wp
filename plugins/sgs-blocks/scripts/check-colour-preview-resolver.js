#!/usr/bin/env node
/**
 * check-colour-preview-resolver — the editor canvas must resolve a colour the
 * same way the server does.
 *
 * WHY THIS GATE EXISTS (D792, 2026-08-28)
 * ---------------------------------------
 * `colourVar()` in `src/utils/tokens.js` used to wrap its argument in
 * `var(--wp--preset--color--{slug})` UNCONDITIONALLY. Correct for a theme preset
 * slug; invalid for anything else. A custom hex became
 * `var(--wp--preset--color--#00FF00)`, which is not a valid CSS value, so the
 * browser discarded the entire declaration — every custom (non-palette) colour a
 * client picked was SILENTLY INVISIBLE in the editor canvas while rendering
 * correctly on the live page, across 120 call sites in 39 blocks.
 *
 * The server never had the bug: `sgs_colour_value()` (includes/helpers-tokens.php)
 * passes a raw CSS colour and an existing `var(...)` through untouched and only
 * slug-wraps what is left. This gate pins the JS to that same contract so the two
 * cannot drift apart again.
 *
 * A silently-dropped declaration is invisible to every other gate in this repo —
 * it reads identically to "no colour was set" — which is precisely why it needs
 * its own check rather than relying on a build passing.
 *
 * USAGE
 *   node scripts/check-colour-preview-resolver.js --check      # gate (exit 1 on failure)
 *   node scripts/check-colour-preview-resolver.js --self-test  # prove the gate can FAIL
 *
 * `--self-test` runs the same cases against the OLD unconditional implementation
 * and requires it to FAIL. A gate never seen failing is not a gate.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { pathToFileURL } = require( 'url' );

// Anchored on __dirname so a copy run from elsewhere scans this repo, not nothing.
const TOKENS = path.resolve( __dirname, '..', 'src', 'utils', 'tokens.js' );

/**
 * `CSS.supports` is a browser API and this gate runs in Node. Node 22 ships
 * no CSSOM, so the gate supplies the same oracle the browser gives the real
 * code — a conservative CSS-colour recogniser. It is deliberately NOT the
 * production discriminator (the browser's own `CSS.supports` is), only enough
 * to drive the contract cases below.
 */
function installCssSupportsShim() {
	if ( typeof globalThis.CSS === 'undefined' ) {
		globalThis.CSS = {};
	}
	if ( typeof globalThis.CSS.supports !== 'function' ) {
		globalThis.CSS.supports = ( prop, value ) => {
			if ( prop !== 'color' ) {
				return false;
			}
			const v = String( value ).trim();
			if ( /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test( v ) ) return true;
			if ( /^(rgb|rgba|hsl|hsla|oklch|lch|oklab|lab|hwb)\s*\(/i.test( v ) ) return true;
			if ( /^var\s*\(/i.test( v ) ) return true;
			// A minimal named-colour set — enough for the contract cases. The
			// production path uses the browser, which knows all of them.
			return [ 'red', 'blue', 'green', 'black', 'white', 'transparent', 'currentcolor' ]
				.includes( v.toLowerCase() );
		};
	}
}

/**
 * The contract. Each case states the CLIENT-VISIBLE consequence, so a failure
 * message says what breaks rather than which assertion tripped.
 */
const CASES = [
	{ in: 'primary',            expect: 'var(--wp--preset--color--primary)',      why: 'a palette colour must resolve to its preset custom property' },
	{ in: 'text-inverse',       expect: 'var(--wp--preset--color--text-inverse)', why: 'a hyphenated palette slug must still be slug-wrapped' },
	{ in: '#00FF00',            expect: '#00FF00',                                why: 'a custom hex must pass through — wrapping it emits invalid CSS and the colour silently disappears (D792)' },
	{ in: '#0A5',               expect: '#0A5',                                   why: 'a 3-digit hex must pass through for the same reason' },
	{ in: 'rgb(1, 2, 3)',       expect: 'rgb(1, 2, 3)',                           why: 'a functional colour must pass through' },
	{ in: 'oklch(0.7 0.1 200)', expect: 'oklch(0.7 0.1 200)',                     why: 'a modern colour space must pass through' },
	{ in: 'red',                expect: 'red',                                    why: 'a CSS named colour must pass through' },
	{ in: 'var(--brand)',       expect: 'var(--brand)',                           why: 'an existing custom-property reference must not be double-wrapped (mirrors sgs_colour_value)' },
	{ in: '',                   expect: undefined,                                why: 'an empty value must paint nothing rather than an empty var()' },
	{ in: '   ',                expect: undefined,                                why: 'a whitespace-only value must paint nothing' },
];

// ---------------------------------------------------------------------------
// CHECK 2 — raw-colour composition audit (2026-08-26)
// ---------------------------------------------------------------------------
//
// WHY A SECOND CHECK EXISTS.
// CHECK 1 above is a RUNTIME CONTRACT TEST on one function: it imports
// `colourVar()` and asserts its outputs. That shape can only ever prove
// `colourVar()` is correct — and `colourVar()` has been correct since D792.
//
// It is structurally blind to the bug that actually recurred. On 2026-08-26
// `resolveShadowPreviewComposed()` was found composing
//     `${ shape } ${ colour || 'rgba(0,0,0,0.1)' }`
// so a palette SLUG produced `0 2px 4px primary` — invalid `box-shadow`, which
// the browser drops whole, so the client's shadow silently vanished from the
// canvas while the frontend rendered it correctly (PHP's
// `sgs_shadow_value_composed()` calls `sgs_colour_value()`). The function never
// called `colourVar()` AT ALL, so a gate that only tests `colourVar()` could
// not see it. Same bug class as D792, different function, four call sites.
//
// The lesson generalises past this one function: the defect is not "the
// resolver is wrong", it is "a value was composed WITHOUT the resolver". That
// is a question about the SOURCE, not about one function's return value — so
// this check is static, and deliberately a different shape from CHECK 1.
//
// ⚠ Scoped to `src/utils/tokens.js` on purpose. That is where the shared
// preview composers live; widening it to every block would flag legitimate
// local composition and drown the signal.

const RESOLVER_CALLEES = new Set( [
	'colourVar',
	'resolveColourToken',
	'sgsColourValue',
] );

const COLOUR_PARAM_RE = /colour|color/i;

/**
 * Walk an arbitrary AST node, collecting Identifiers named `param` that are
 * NOT enclosed in a call to an approved resolver.
 *
 * @param {Object}   node    AST node.
 * @param {string}   param   Parameter name to hunt for.
 * @param {boolean}  guarded Is the current subtree already inside a resolver call?
 * @param {string[]} out     Accumulator.
 */
function collectRawColourRefs( node, param, guarded, out ) {
	if ( ! node || typeof node !== 'object' ) {
		return;
	}
	if ( Array.isArray( node ) ) {
		for ( const n of node ) {
			collectRawColourRefs( n, param, guarded, out );
		}
		return;
	}
	if ( node.type === 'Identifier' && node.name === param ) {
		if ( ! guarded ) {
			out.push( param );
		}
		return;
	}
	let nowGuarded = guarded;
	if (
		node.type === 'CallExpression' &&
		node.callee &&
		node.callee.type === 'Identifier' &&
		RESOLVER_CALLEES.has( node.callee.name )
	) {
		nowGuarded = true;
	}
	for ( const key of Object.keys( node ) ) {
		if ( key === 'loc' || key === 'start' || key === 'end' || key === 'type' ) {
			continue;
		}
		collectRawColourRefs( node[ key ], param, nowGuarded, out );
	}
}

/**
 * Find functions that interpolate a colour-ish parameter into a composed CSS
 * string without routing it through a resolver.
 *
 * @param {string} src Source of tokens.js.
 * @return {Array<{fn:string,param:string,line:number}>} Findings.
 */
function auditRawColourComposition( src ) {
	const parser = require( '@babel/parser' );
	const ast = parser.parse( src, { sourceType: 'module', plugins: [ 'jsx' ] } );
	const findings = [];

	const visitFn = ( name, node ) => {
		const params = ( node.params || [] )
			.filter( ( p ) => p.type === 'Identifier' && COLOUR_PARAM_RE.test( p.name ) )
			.map( ( p ) => p.name );
		if ( ! params.length ) {
			return;
		}
		// Only COMPOSED values matter — a template literal or string
		// concatenation that builds a CSS value out of parts.
		const composed = [];
		const findComposed = ( n ) => {
			if ( ! n || typeof n !== 'object' ) return;
			if ( Array.isArray( n ) ) return n.forEach( findComposed );
			if ( n.type === 'TemplateLiteral' && n.expressions.length ) composed.push( n );
			if ( n.type === 'BinaryExpression' && n.operator === '+' ) composed.push( n );
			for ( const k of Object.keys( n ) ) {
				if ( k === 'loc' || k === 'start' || k === 'end' || k === 'type' ) continue;
				findComposed( n[ k ] );
			}
		};
		findComposed( node.body );

		for ( const param of params ) {
			for ( const c of composed ) {
				const raw = [];
				collectRawColourRefs( c, param, false, raw );
				if ( raw.length ) {
					findings.push( {
						fn: name,
						param,
						line: ( c.loc && c.loc.start.line ) || 0,
					} );
					break;
				}
			}
		}
	};

	const walk = ( n ) => {
		if ( ! n || typeof n !== 'object' ) return;
		if ( Array.isArray( n ) ) return n.forEach( walk );
		if ( n.type === 'FunctionDeclaration' && n.id ) {
			visitFn( n.id.name, n );
		}
		if ( n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier' && n.init &&
			( n.init.type === 'ArrowFunctionExpression' || n.init.type === 'FunctionExpression' ) ) {
			visitFn( n.id.name, n.init );
		}
		for ( const k of Object.keys( n ) ) {
			if ( k === 'loc' || k === 'start' || k === 'end' || k === 'type' ) continue;
			walk( n[ k ] );
		}
	};
	walk( ast.program.body );
	return findings;
}

/**
 * The exact pre-fix body of resolveShadowPreviewComposed(), kept ONLY so
 * --self-test can watch CHECK 2 fail on the real historical defect rather than
 * on an invented fixture. ⛔ Do not "tidy" this into the fixed form — a
 * negative control that no longer reproduces the bug silently stops testing.
 */
const LEGACY_COMPOSER_SRC = `
export function resolveShadowPreviewComposed( shape, colour ) {
	if ( ! shape ) { return undefined; }
	return \`\${ shape } \${ colour || 'rgba(0,0,0,0.1)' }\`;
}
`;

/** The pre-D792 implementation, kept ONLY so --self-test can watch the gate fail. */
function legacyColourVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--color--${ slug })`;
}

async function main() {
	installCssSupportsShim();

	const argv = process.argv.slice( 2 );
	const selfTest = argv.includes( '--self-test' );
	const check = argv.includes( '--check' ) || selfTest;

	if ( ! check ) {
		console.log( 'usage: --check | --self-test' );
		process.exit( 0 );
	}

	const mod = await import( pathToFileURL( TOKENS ).href );
	const colourVar = mod.colourVar;

	if ( typeof colourVar !== 'function' ) {
		console.error( '[colour-preview-resolver] FAIL — src/utils/tokens.js does not export colourVar()' );
		process.exit( 1 );
	}

	const evaluate = ( label, fn ) => {
		const failures = [];
		for ( const c of CASES ) {
			let actual;
			try {
				actual = fn( c.in );
			} catch ( e ) {
				actual = `THREW: ${ e.message }`;
			}
			if ( actual !== c.expect ) {
				failures.push( { ...c, actual } );
			}
		}
		return { label, failures };
	};

	if ( selfTest ) {
		const legacy = evaluate( 'legacy (pre-D792)', legacyColourVar );
		const current = evaluate( 'current', colourVar );

		console.log( `[colour-preview-resolver --self-test] legacy failures: ${ legacy.failures.length }` );
		for ( const f of legacy.failures ) {
			console.log( `    would break: ${ JSON.stringify( f.in ) } -> ${ JSON.stringify( f.actual ) } (expected ${ JSON.stringify( f.expect ) })` );
		}

		if ( legacy.failures.length === 0 ) {
			console.error( '[colour-preview-resolver --self-test] FAIL — the legacy implementation PASSED. The gate cannot detect the bug it exists for; it is vacuous.' );
			process.exit( 1 );
		}
		if ( current.failures.length !== 0 ) {
			console.error( '[colour-preview-resolver --self-test] FAIL — the current implementation does not satisfy the contract.' );
			for ( const f of current.failures ) {
				console.error( `    ${ JSON.stringify( f.in ) } -> ${ JSON.stringify( f.actual ) }, expected ${ JSON.stringify( f.expect ) } — ${ f.why }` );
			}
			process.exit( 1 );
		}
		// CHECK 2's own negative control: the audit MUST flag the real
		// historical defect, and MUST NOT flag the current file.
		const legacyFindings = auditRawColourComposition( LEGACY_COMPOSER_SRC );
		const liveFindings = auditRawColourComposition( fs.readFileSync( TOKENS, 'utf8' ) );
		console.log( `[colour-preview-resolver --self-test] CHECK 2 legacy findings: ${ legacyFindings.length }` );
		if ( legacyFindings.length === 0 ) {
			console.error( '[colour-preview-resolver --self-test] FAIL — CHECK 2 did NOT flag the pre-fix resolveShadowPreviewComposed(). The composition audit is vacuous.' );
			process.exit( 1 );
		}
		if ( liveFindings.length !== 0 ) {
			console.error( '[colour-preview-resolver --self-test] FAIL — CHECK 2 flags the CURRENT tokens.js, so it over-matches:' );
			for ( const f of liveFindings ) {
				console.error( `    ${ f.fn }() composes '${ f.param }' raw at tokens.js:${ f.line }` );
			}
			process.exit( 1 );
		}
		console.log( '[colour-preview-resolver --self-test] PASS — both checks fail on the old code and pass on the new. They are real gates.' );
		process.exit( 0 );
	}

	const composition = auditRawColourComposition( fs.readFileSync( TOKENS, 'utf8' ) );
	if ( composition.length ) {
		console.error( `[colour-preview-resolver] FAIL — ${ composition.length } function(s) compose a colour into a CSS value without resolving it:` );
		for ( const f of composition ) {
			console.error( `  ${ f.fn }() interpolates '${ f.param }' raw — tokens.js:${ f.line }` );
		}
		console.error( '  A palette SLUG composed raw yields e.g. `0 2px 4px primary`, which is invalid' );
		console.error( '  CSS — the browser drops the whole declaration, so the client\'s value silently' );
		console.error( '  does nothing in the editor canvas while the PHP twin renders it correctly.' );
		console.error( '  Fix: wrap the colour in colourVar() rather than adding a second resolver.' );
		process.exit( 1 );
	}

	const { failures } = evaluate( 'current', colourVar );
	if ( failures.length ) {
		console.error( `[colour-preview-resolver] FAIL — ${ failures.length } contract violation(s) in colourVar():` );
		for ( const f of failures ) {
			console.error( `  ${ JSON.stringify( f.in ) } -> ${ JSON.stringify( f.actual ) }` );
			console.error( `      expected ${ JSON.stringify( f.expect ) } — ${ f.why }` );
		}
		console.error( '  A wrongly-wrapped colour emits invalid CSS, so the browser drops the whole' );
		console.error( '  declaration and the client\'s colour silently does nothing in the canvas.' );
		process.exit( 1 );
	}

	console.log( `[colour-preview-resolver] PASS — colourVar() satisfies all ${ CASES.length } contract cases.` );
	process.exit( 0 );
}

main().catch( ( e ) => {
	console.error( '[colour-preview-resolver] ERROR', e );
	process.exit( 1 );
} );
