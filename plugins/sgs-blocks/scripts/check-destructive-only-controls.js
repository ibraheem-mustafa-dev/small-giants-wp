/**
 * check-destructive-only-controls.js
 *
 * STRUCTURAL GUARD (D787-class, 2026-08-27) — catches a defect class that sits
 * in a gap none of the existing ~70 gates cover: `check-dead-controls.js` asks
 * "does a control render nothing?" (a control exists but is a no-op);
 * `inspector-scan` rule 21 asks the inverse ("is there rendered output with no
 * control at all?"). NEITHER asks the question this file exists to answer:
 *
 *     "Once a value-bearing attribute is SET, is the only reachable control
 *      for it a DESTRUCTIVE one — so a client must destroy the value before
 *      they can see a picker/replace control again?"
 *
 * The motivating bug (D787): `sgs/product-card` in typed mode rendered a
 * MediaPlaceholder picker only when `image` was EMPTY, and a destructive
 * "Remove image" button only when it was SET. A client whose image URL is
 * broken — exactly how a freshly cloned card lands — could only destroy the
 * value to get the picker back. `check-dead-controls.js` never sees this: the
 * destructive control DOES render something real (a working "Remove" button
 * that really clears the attribute) — it just isn't the only control that
 * class of state needs.
 *
 * METHOD — detect by what the JSX DOES, not by control/component name:
 *
 *   1. A "media-bearing" attribute is one this file structurally observes
 *      being SET to a non-empty value by an `onSelect={ (media) => setAttributes({ attr: media.url... }) }`
 *      handler ANYWHERE in the source — this is what a picker (MediaUpload /
 *      MediaPlaceholder, any wrapping/naming) DOES, regardless of what the
 *      surrounding component is called.
 *   2. A "destructive clear" is any `onClick`/`isDestructive`-adjacent
 *      `setAttributes({ attr: '' | null | {} | false | 0, ... })` call — again
 *      identified by the VALUE being written (an empty/falsy sentinel), never
 *      by the button's label text.
 *   3. Every top-level ternary `{ cond ? ( TRUE ) : ( FALSE ) }` in the file is
 *      resolved via paren-balancing (the exact shape every conditional-render
 *      branch in this plugin's edit.js files uses — see product-card.js:2289,
 *      2307, container.js, hero.js, etc.). For each branch: if it contains a
 *      destructive clear for a media-bearing attribute X, but does NOT also
 *      contain an onSelect-set for X anywhere in that SAME branch, X is
 *      unreachable except by destruction from that state — FLAGGED.
 *
 * SCOPE / KNOWN BLIND SPOTS (read before trusting a "0 findings" block):
 *   - Only resolves the `cond ? ( A ) : ( B )` shape (both branches
 *     parenthesised) — the dominant style in this codebase. A ternary using a
 *     single JSX expression with no wrapping parens, or an `if`/early-return
 *     branch instead of a ternary, is invisible to this pass.
 *   - A destructive clear / picker OUTSIDE any ternary (unconditionally
 *     rendered) is not scoped to a branch and is not evaluated by this pass —
 *     the defect class this file targets is specifically the "two mutually
 *     exclusive branches, one has no way back" shape.
 *   - "media-bearing" is proved structurally (an onSelect writing a real
 *     value SOMEWHERE in the file) — a picker that lives in a shared
 *     component file mounted via JSX (not literal text in this edit.js) is
 *     invisible to this pass (same blind spot check-dead-controls.js
 *     documents for its own shared-component resolution — R3-a is NOT
 *     replicated here to keep this file's scope proportionate).
 *
 * BASELINE: scripts/destructive-only-controls-baseline.json lists already-
 * known findings the team has accepted, each with a reason. `--check` fails
 * only on NET-NEW findings not present there. Empty `accepted` = zero
 * tolerance.
 *
 * Usage:
 *   node scripts/check-destructive-only-controls.js            # report, exit 0
 *   node scripts/check-destructive-only-controls.js --check     # CI gate, exit 1 on net-new
 *   node scripts/check-destructive-only-controls.js --json      # machine-readable findings
 *   node scripts/check-destructive-only-controls.js --self-test # fixture + negative-control proof
 *
 * NOT wired into prebuild/package.json by this change (out of file-list scope
 * for the task that built it) — run standalone until a maintainer wires it.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const BASELINE_FILE = path.join( __dirname, 'destructive-only-controls-baseline.json' );
const FIXTURES_DIR = path.join( __dirname, 'fixtures', 'destructive-only-controls' );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

/**
 * Balance parens starting at `openIdx` (index of an opening `(`). Returns the
 * index of the matching `)`, or -1 if unbalanced (malformed input — never
 * guessed at).
 *
 * @param {string} src     Source text.
 * @param {number} openIdx Index of the opening paren.
 * @return {number} Index of the matching close paren, or -1.
 */
function matchParen( src, openIdx ) {
	let depth = 0;
	for ( let i = openIdx; i < src.length; i++ ) {
		if ( src[ i ] === '(' ) {
			depth++;
		} else if ( src[ i ] === ')' ) {
			depth--;
			if ( depth === 0 ) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * Find every `? ( TRUE ) : ( FALSE )` ternary pair in `src`, resolved via
 * paren-balancing rather than a naive non-greedy regex (which cannot handle
 * nested parens inside either branch — and JSX with arrow-function props
 * always has some). The `: ( FALSE )` half is optional; a pair with only a
 * true branch (no recognised false branch) still yields a usable range.
 *
 * @param {string} src Source text (a whole edit.js file).
 * @return {Array<{trueStart:number, trueEnd:number, falseStart:number, falseEnd:number}>}
 */
function findTernaryBranches( src ) {
	const pairs = [];
	const openRe = /\?\s*\(/g;
	let m;
	while ( ( m = openRe.exec( src ) ) !== null ) {
		const trueOpenIdx = m.index + m[ 0 ].length - 1; // index of the '('
		const trueEndIdx = matchParen( src, trueOpenIdx );
		if ( trueEndIdx === -1 ) {
			continue; // malformed / unbalanced — never guess
		}
		let falseStart = -1;
		let falseEnd = -1;
		const rest = src.slice( trueEndIdx + 1, trueEndIdx + 40 );
		const falseMatch = /^\s*:\s*\(/.exec( rest );
		if ( falseMatch ) {
			const falseOpenIdx = trueEndIdx + 1 + falseMatch[ 0 ].length - 1;
			const fEnd = matchParen( src, falseOpenIdx );
			if ( fEnd !== -1 ) {
				falseStart = falseOpenIdx + 1;
				falseEnd = fEnd;
			}
		}
		pairs.push( {
			trueStart: trueOpenIdx + 1,
			trueEnd: trueEndIdx,
			falseStart,
			falseEnd,
		} );
	}
	return pairs;
}

/**
 * Parse the object-literal body of a `setAttributes({ ... })` call for
 * `key: value` pairs, tolerant of string/null/empty-object/false/number
 * literals only (the sentinel shapes this guard cares about — it does not
 * need to resolve arbitrary expressions).
 *
 * @param {string} body Text between the `{` and `}` of a setAttributes call.
 * @return {Array<{key:string, value:string}>}
 */
function parseSetAttributesBody( body ) {
	const out = [];
	const kvRe =
		/([A-Za-z_$][\w$]*)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|null|undefined|false|true|0|\{\s*\}|[A-Za-z_$][\w$.]*(?:\([^)]*\))?)\s*(?:,|$)/g;
	let m;
	while ( ( m = kvRe.exec( body ) ) !== null ) {
		out.push( { key: m[ 1 ], value: m[ 2 ].trim() } );
	}
	return out;
}

function isEmptySentinel( value ) {
	return (
		value === "''" ||
		value === '""' ||
		value === 'null' ||
		value === 'undefined' ||
		value === 'false' ||
		value === '0' ||
		/^\{\s*\}$/.test( value )
	);
}

/**
 * Find every `setAttributes({ ... })` call in `src` and classify it as a
 * "clear" occurrence (any key set to an empty/falsy sentinel) if it sits near
 * an `isDestructive` token, or a "set" occurrence (any key set to something
 * that is NOT an empty sentinel) if it sits inside an `onSelect=` handler —
 * the two structural shapes this guard cares about, independent of what the
 * surrounding component/button is named.
 *
 * @param {string} src Source text.
 * @return {{clears: Array<{index:number, attrs:string[]}>, sets: Array<{index:number, attrs:string[]}>}}
 */
function collectClearsAndSets( src ) {
	const clears = [];
	const sets = [];
	const callRe = /setAttributes\(\s*\{([^}]*)\}\s*\)/g;
	let m;
	while ( ( m = callRe.exec( src ) ) !== null ) {
		const idx = m.index;
		const pairs = parseSetAttributesBody( m[ 1 ] );
		if ( pairs.length === 0 ) {
			continue;
		}
		const clearedAttrs = pairs.filter( ( p ) => isEmptySentinel( p.value ) ).map( ( p ) => p.key );
		const setAttrs = pairs.filter( ( p ) => ! isEmptySentinel( p.value ) ).map( ( p ) => p.key );

		// Look back up to 400 chars for the nearest `isDestructive` / `onClick=`
		// token — proves this call is reachable via a click handler, not e.g. a
		// render-time computed default. A destructive-clear call must be wired
		// to SOME click affordance to be reachable at all; onClick= is the
		// universal marker for that regardless of isDestructive being present.
		const behind = src.slice( Math.max( 0, idx - 400 ), idx );
		const isClickHandler = /onClick\s*=\s*\{[^}]*$/.test( behind ) || /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*$/.test( behind );
		if ( clearedAttrs.length > 0 && isClickHandler ) {
			clears.push( { index: idx, attrs: clearedAttrs } );
		}

		// Look back up to 200 chars for the nearest `onSelect=` token — proves
		// this call is a picker's result handler, not an unrelated setAttributes.
		const behindShort = src.slice( Math.max( 0, idx - 200 ), idx );
		const isOnSelect = /onSelect\s*=\s*\{[^}]*$/.test( behindShort );
		if ( setAttrs.length > 0 && isOnSelect ) {
			sets.push( { index: idx, attrs: setAttrs } );
		}
	}
	return { clears, sets };
}

function lineOf( src, index ) {
	return src.slice( 0, index ).split( '\n' ).length;
}

/**
 * Run the detector against one edit.js source string.
 *
 * @param {string} src       File source.
 * @param {string} blockName Block slug (or fixture label) for reporting.
 * @param {string} filePath  Path for reporting (line numbers).
 * @return {Array<object>} Findings.
 */
function detect( src, blockName, filePath ) {
	const findings = [];
	if ( ! src ) {
		return findings;
	}

	const { clears, sets } = collectClearsAndSets( src );
	if ( clears.length === 0 ) {
		return findings; // nothing destructive in this file at all
	}

	// Media-bearing attrs: proved structurally by an onSelect-set ANYWHERE in
	// the file (not just within a branch) — this is what marks an attribute as
	// "the kind of thing a picker controls" at all.
	const mediaBearingAttrs = new Set();
	for ( const s of sets ) {
		s.attrs.forEach( ( a ) => mediaBearingAttrs.add( a ) );
	}
	if ( mediaBearingAttrs.size === 0 ) {
		return findings; // no picker anywhere — nothing this guard can reason about
	}

	const branches = findTernaryBranches( src );

	const withinRange = ( idx, start, end ) => start !== -1 && idx >= start && idx <= end;

	for ( const branch of branches ) {
		for ( const region of [
			{ label: 'true', start: branch.trueStart, end: branch.trueEnd },
			{ label: 'false', start: branch.falseStart, end: branch.falseEnd },
		] ) {
			if ( region.start === -1 ) {
				continue;
			}
			const clearsInRegion = clears.filter( ( c ) => withinRange( c.index, region.start, region.end ) );
			if ( clearsInRegion.length === 0 ) {
				continue;
			}
			const setsInRegion = sets.filter( ( s ) => withinRange( s.index, region.start, region.end ) );
			const setAttrsInRegion = new Set();
			setsInRegion.forEach( ( s ) => s.attrs.forEach( ( a ) => setAttrsInRegion.add( a ) ) );

			for ( const c of clearsInRegion ) {
				for ( const attr of c.attrs ) {
					if ( ! mediaBearingAttrs.has( attr ) ) {
						continue; // not a value-bearing attr this guard reasons about
					}
					if ( setAttrsInRegion.has( attr ) ) {
						continue; // a replace/set control for the SAME attr co-exists in this branch
					}
					findings.push( {
						check: 'destructive-only',
						block: blockName,
						attr,
						branch: region.label,
						file: filePath,
						line: lineOf( src, c.index ),
						reason:
							`'${ attr }' is a media/value-bearing attribute (proven by an onSelect-set ` +
							`elsewhere in this file) whose ONLY reachable control in the '${ region.label }' ` +
							'branch of a conditional render is a destructive clear (setAttributes to an ' +
							'empty/falsy sentinel behind onClick) — no replace/set control for the same ' +
							'attribute exists in that same branch, so a client must destroy the value to ' +
							'ever see a picker again.',
					} );
				}
			}
		}
	}

	return findings;
}

// ---------------------------------------------------------------------------
// Repo-wide scan
// ---------------------------------------------------------------------------

function scanRepo() {
	const findings = [];
	if ( ! fs.existsSync( BLOCKS_DIR ) ) {
		return findings;
	}
	const dirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );

	for ( const dir of dirs ) {
		const editPath = path.join( dir, 'edit.js' );
		const src = readIfExists( editPath );
		if ( ! src ) {
			continue;
		}
		const blockJsonPath = path.join( dir, 'block.json' );
		let blockName = path.basename( dir );
		if ( fs.existsSync( blockJsonPath ) ) {
			try {
				const meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
				if ( meta.name ) {
					blockName = meta.name;
				}
			} catch ( e ) {
				// malformed block.json is a different gate's problem — fall back to dir name
			}
		}
		findings.push( ...detect( src, blockName, editPath ) );
	}
	return findings;
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function loadBaseline() {
	if ( ! fs.existsSync( BASELINE_FILE ) ) {
		return { accepted: [] };
	}
	try {
		const parsed = JSON.parse( fs.readFileSync( BASELINE_FILE, 'utf8' ) );
		return { accepted: Array.isArray( parsed.accepted ) ? parsed.accepted : [] };
	} catch ( e ) {
		throw new Error( `Invalid ${ BASELINE_FILE }: ${ e.message }` );
	}
}

function isBaselined( finding, accepted ) {
	return accepted.some(
		( a ) => a.check === finding.check && a.block === finding.block && a.attr === finding.attr
	);
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function runSelfTest() {
	let pass = true;
	const log = ( s ) => process.stdout.write( s + '\n' );

	log( '[check-destructive-only-controls --self-test]\n' );

	// --- Test A: MUST-FLAG fixture (the watched-failing fixture) -----------
	// Reproduces the exact D787 shape: image-set branch has a destructive
	// clear and NO picker; the picker lives only in the else branch.
	const positivePath = path.join( FIXTURES_DIR, 'positive', 'edit.js' );
	const positiveSrc = readIfExists( positivePath );
	if ( ! positiveSrc ) {
		log( `FAIL — Test A: fixture missing at ${ positivePath }` );
		pass = false;
	} else {
		const findings = detect( positiveSrc, 'sgs/fixture-positive', positivePath );
		const hit = findings.find( ( f ) => f.attr === 'image' && f.branch === 'true' );
		if ( hit ) {
			log(
				`PASS — Test A (watched-failing fixture flags): ${ hit.block }.${ hit.attr } ` +
					`(branch=${ hit.branch }, line ${ hit.line })`
			);
		} else {
			log(
				'FAIL — Test A: the watched-failing fixture (destructive-only image branch) ' +
					`produced NO finding for 'image'. Got: ${ JSON.stringify( findings ) }`
			);
			pass = false;
		}
	}

	// --- Test B: NEGATIVE CONTROL — the fixed shape must NOT flag ----------
	// Same fixture family, but the true-branch also mounts a MediaUpload
	// replace control for `image` — proves the detector isn't vacuously
	// flagging every destructive button, only the unreachable-without-one case.
	const negativePath = path.join( FIXTURES_DIR, 'negative', 'edit.js' );
	const negativeSrc = readIfExists( negativePath );
	if ( ! negativeSrc ) {
		log( `FAIL — Test B: fixture missing at ${ negativePath }` );
		pass = false;
	} else {
		const findings = detect( negativeSrc, 'sgs/fixture-negative', negativePath );
		const hit = findings.find( ( f ) => f.attr === 'image' );
		if ( ! hit ) {
			log( 'PASS — Test B (negative control clean): fixed shape produced NO finding for \'image\'.' );
		} else {
			log( `FAIL — Test B: negative-control fixture (has a replace control) still flagged: ${ JSON.stringify( hit ) }` );
			pass = false;
		}
	}

	// --- Test C: unrelated destructive control (e.g. a delete-row button on
	// a repeater item with no media semantics at all) must not flag — proves
	// scoping to media-bearing attrs, not "any destructive click".
	const unrelatedSrc = [
		"export default function Edit({ attributes, setAttributes }) {",
		"  const { items } = attributes;",
		"  return (",
		"    <div>",
		"      { items.length ? (",
		"        <Button isDestructive onClick={ () => setAttributes({ items: [] }) }>Clear all</Button>",
		"      ) : (",
		"        <p>No items</p>",
		"      ) }",
		"    </div>",
		"  );",
		"}",
	].join( '\n' );
	const unrelatedFindings = detect( unrelatedSrc, 'sgs/fixture-unrelated', '<synthetic>' );
	if ( unrelatedFindings.length === 0 ) {
		log( "PASS — Test C: a destructive control with no onSelect anywhere in the file (not media-bearing) does not flag." );
	} else {
		log( `FAIL — Test C: unrelated destructive control incorrectly flagged: ${ JSON.stringify( unrelatedFindings ) }` );
		pass = false;
	}

	// --- Test D: live check — the REAL product-card edit.js (post-fix) must
	// be clean for `image`. Proves the fix in Part 1 actually satisfies the
	// rule this detector enforces, on the real file, not only on a fixture.
	const liveEditPath = path.join( BLOCKS_DIR, 'product-card', 'edit.js' );
	const liveSrc = readIfExists( liveEditPath );
	if ( ! liveSrc ) {
		log( `FAIL — Test D: could not read live file ${ liveEditPath }` );
		pass = false;
	} else {
		const liveFindings = detect( liveSrc, 'sgs/product-card', liveEditPath );
		const liveImageHit = liveFindings.find( ( f ) => f.attr === 'image' );
		if ( ! liveImageHit ) {
			log( 'PASS — Test D (live, post-fix): sgs/product-card.image produces no finding.' );
		} else {
			log( `FAIL — Test D (live): sgs/product-card.image still flags: ${ JSON.stringify( liveImageHit ) }` );
			pass = false;
		}
	}

	log(
		pass
			? '\n[check-destructive-only-controls --self-test] ALL TESTS PASS.'
			: '\n[check-destructive-only-controls --self-test] FAIL.'
	);
	process.exit( pass ? 0 : 1 );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const args = process.argv.slice( 2 );
	const asJson = args.includes( '--json' );
	const checkMode = args.includes( '--check' );

	const findings = scanRepo();
	const { accepted } = loadBaseline();
	const netNew = findings.filter( ( f ) => ! isBaselined( f, accepted ) );

	if ( asJson ) {
		process.stdout.write( JSON.stringify( findings, null, 2 ) + '\n' );
		process.exit( 0 );
	}

	if ( findings.length === 0 ) {
		console.log( '[check-destructive-only-controls] 0 findings across the block library.' );
	} else {
		console.log( `[check-destructive-only-controls] ${ findings.length } finding(s) (${ netNew.length } net-new):\n` );
		for ( const f of findings ) {
			const baselined = isBaselined( f, accepted ) ? ' [baselined]' : '';
			console.log( `  ${ f.block } — ${ f.attr } (branch=${ f.branch })${ baselined }` );
			console.log( `    ${ f.file }:${ f.line }` );
			console.log( `    ${ f.reason }\n` );
		}
	}

	if ( checkMode ) {
		process.exit( netNew.length > 0 ? 1 : 0 );
	}
	process.exit( 0 );
}

// Guarded by require.main so this file can be `require()`d (e.g. by its own
// --self-test's live-file check, or by another script re-using `detect()`)
// without triggering a full repo scan / process.exit as a side effect of
// loading the module — the same discipline check-dead-controls.js does not
// need (it is never required elsewhere) but this file's self-test does.
if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		runSelfTest();
	} else {
		main();
	}
}

module.exports = { detect, findTernaryBranches, collectClearsAndSets };
