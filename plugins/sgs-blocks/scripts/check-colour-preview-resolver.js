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
		console.log( '[colour-preview-resolver --self-test] PASS — the gate fails on the old code and passes on the new. It is a real gate.' );
		process.exit( 0 );
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
