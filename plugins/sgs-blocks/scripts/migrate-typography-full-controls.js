'use strict';

/**
 * migrate-typography-full-controls.js — Task 1 (2026-09-07, typography
 * surface-taxonomy track): turn on the FULL `TypographyControls` control set
 * on every already-adopting single-target call site, instead of the partial
 * sets currently wired up by accident.
 *
 * CONTEXT. Bean settled (this session) that the shared `TypographyControls`
 * component should expose EVERY control by default on EVERY text surface —
 * no curated per-surface taxonomy — because almost none of the exclusions
 * that curation would apply turned out to be technically justified (a price
 * field's letter-case DOES apply once currency text/suffixes are considered;
 * line-height affects box height even on a single line). The only genuine
 * exception is line-indent/columns, which are harmless-but-pointless on
 * non-paragraph text — left ON here too per the same "don't hand-curate for
 * marginal benefit" reasoning, not worth a detector.
 *
 * SCOPE — what this codemod does NOT touch, and why:
 *   - `showHover` is NEVER added. `includes/helpers-typography.php`'s
 *     `sgs_typography_css_rule()` has no code path for the hover trio
 *     (decoration/transform/weight-on-hover) at all — turning the JS control
 *     on anywhere would ship a dead control. Zero blocks use it today
 *     (verified: `grep -rn "showHover" src/blocks` across every edit.js returns nothing).
 *   - Blocks with a `targets` array (multi-surface switcher: card-grid,
 *     icon-list, option-picker, product-card, testimonial, trust-bar) are
 *     EXCLUDED — those need per-block judgement (some entries have deliberate
 *     `false` overrides tied to a native-typography conflict Task 5 fixes
 *     separately; others need the switcher shape itself extended). Handled
 *     by hand/subagent, not this script.
 *   - `sgs/media` and `sgs/before-after` are EXCLUDED — their edit.js imports
 *     `TypographyControls` but render.php hand-rolls a narrower, separate CSS
 *     emitter instead of calling `sgs_typography_css_rule()` (found live,
 *     2026-09-07). Flipping their JS controls on would ship controls with no
 *     effect. Needs the render side rewired first — a job for a subagent, not
 *     a boolean flip.
 *   - The 6 native-`supports.typography` holdouts (card-grid, collapsible-
 *     text, counter, icon-list, quote, testimonial) are only excluded where
 *     they ALSO appear in the targets-array list above; the ones that don't
 *     (counter, quote, and collapsible-text's/testimonial's single-target
 *     calls not tied to the native conflict) are in scope — their native
 *     typography governs a DIFFERENT element (D972 false-alarm ruling) or an
 *     unrelated attribute (textAlign only), so turning on their unrelated
 *     TypographyControls surface is safe.
 *
 * WHY AN AST, NOT A REGEX (THE-MIGRATION-METHOD.md Step 4): a JSX opening
 * element's attribute list is a real tree, not a line-shaped pattern — a
 * regex would mis-splice across multi-line attribute values or an attribute
 * whose name is a substring of another (e.g. `showTextAlign` vs `showText`).
 * Model: migrate-border-control.js — parse with @babel/parser, splice via
 * node.start/node.end on the ORIGINAL source text, never `generate()` the
 * whole file.
 *
 * Run:
 *   node migrate-typography-full-controls.js --survey
 *   node migrate-typography-full-controls.js --fix           # dry-run diff
 *   node migrate-typography-full-controls.js --fix --apply   # write
 *   node migrate-typography-full-controls.js --check         # CI gate
 *   node migrate-typography-full-controls.js --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );
const babelParser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

function findRepoRoot( start ) {
	let cur = path.resolve( start );
	for ( ;; ) {
		if ( fs.existsSync( path.join( cur, '.claude', 'THE-MIGRATION-METHOD.md' ) ) ) return cur;
		const parent = path.dirname( cur );
		if ( parent === cur ) throw new Error( 'repo root not found (.claude/THE-MIGRATION-METHOD.md missing)' );
		cur = parent;
	}
}

const ROOT = findRepoRoot( __dirname );
const BLOCKS_DIR = path.join( ROOT, 'plugins', 'sgs-blocks', 'src', 'blocks' );

// Props whose default is FALSE — must be explicitly added as `true` (JSX
// boolean shorthand `showX` on an element, `showX: true` in an object
// literal) to turn the surface on.
const EXTEND_PROPS = [
	'fontSizePresets',
	'showFontFamily',
	'showDecoration',
	'showTransform',
	'showLetterSpacing',
	'showTextAlign',
	'showTextWrap',
	'showTextColumns',
	'showTextIndent',
	'showWritingMode',
];

// Props whose default is TRUE — an explicit `false` here is a DEMOTION this
// task reverses (by deleting the override, which reverts to the true
// default). Absent = already true = nothing to do.
const DEFAULT_TRUE_PROPS = [ 'showSize', 'showWeight', 'showStyle', 'showLineHeight', 'showResponsive' ];

// Never touched — see the file header for why.
const NEVER_TOUCH = new Set( [ 'showHover' ] );

// Blocks excluded from this mechanical pass entirely (targets-array /
// render-side-fragmentation cases — see file header).
const EXCLUDED_BLOCKS = new Set( [
	'card-grid',
	'icon-list',
	'option-picker',
	'product-card',
	'testimonial',
	'trust-bar',
	'media',
	'before-after',
] );

function listBlockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() )
		.map( ( d ) => d.name )
		.filter( ( name ) => ! EXCLUDED_BLOCKS.has( name ) )
		.sort();
}

function parseJs( src ) {
	return babelParser.parse( src, { sourceType: 'module', plugins: [ 'jsx' ] } );
}

/** Find every `<TypographyControls .../>` JSXOpeningElement in the AST that
 * does NOT carry a `targets` attribute (single-target calls only — scope). */
function findSingleTargetCalls( ast ) {
	const found = [];
	traverse( ast, {
		JSXOpeningElement( p ) {
			const node = p.node;
			if ( node.name.type !== 'JSXIdentifier' || node.name.name !== 'TypographyControls' ) return;
			const hasTargets = node.attributes.some(
				( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === 'targets'
			);
			if ( hasTargets ) return; // out of scope for this codemod
			found.push( node );
		},
	} );
	return found;
}

/** Read current boolean-ish state of the relevant props on one opening
 * element. Returns { [propName]: 'true' | 'false' | 'absent' }. */
function readPropState( openingElement ) {
	const state = {};
	const allProps = [ ...EXTEND_PROPS, ...DEFAULT_TRUE_PROPS ];
	for ( const propName of allProps ) state[ propName ] = 'absent';
	for ( const attr of openingElement.attributes ) {
		if ( attr.type !== 'JSXAttribute' || ! attr.name || attr.name.type !== 'JSXIdentifier' ) continue;
		const name = attr.name.name;
		if ( ! allProps.includes( name ) ) continue;
		if ( attr.value === null ) {
			state[ name ] = 'true'; // bare shorthand `showX`
		} else if ( attr.value.type === 'JSXExpressionContainer' ) {
			const expr = attr.value.expression;
			if ( expr.type === 'BooleanLiteral' ) {
				state[ name ] = expr.value ? 'true' : 'false';
			} else {
				state[ name ] = 'dynamic'; // e.g. showX={someVariable} — refuse, don't guess
			}
		}
	}
	return state;
}

/**
 * Build the list of {start,end,insertBefore} splice ops for one opening
 * element. Returns null if nothing needs to change.
 */
function buildEdits( openingElement, state ) {
	const removals = []; // JSXAttribute nodes to delete entirely (revert to default true)
	const toAdd = []; // prop names to add as bare shorthand `showX`
	const dynamicWarnings = [];

	for ( const propName of EXTEND_PROPS ) {
		if ( state[ propName ] === 'absent' || state[ propName ] === 'false' ) {
			toAdd.push( { propName, removeExisting: state[ propName ] === 'false' } );
		} else if ( state[ propName ] === 'dynamic' ) {
			dynamicWarnings.push( propName );
		}
	}
	for ( const propName of DEFAULT_TRUE_PROPS ) {
		if ( state[ propName ] === 'false' ) {
			toAdd.push( { propName, removeExisting: true, demoteOnly: true } );
		} else if ( state[ propName ] === 'dynamic' ) {
			dynamicWarnings.push( propName );
		}
	}

	if ( ! toAdd.length && ! dynamicWarnings.length ) return null;

	for ( const { propName, removeExisting } of toAdd ) {
		if ( ! removeExisting ) continue;
		const existing = openingElement.attributes.find(
			( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === propName
		);
		if ( existing ) removals.push( existing );
	}

	return { toAdd, removals, dynamicWarnings };
}

/**
 * If `removal` sits ALONE on its own line (nothing but whitespace before it
 * back to the previous newline, and nothing but whitespace after it up to
 * the next newline), extend the deletion to swallow that whole line —
 * including its indentation and its trailing newline — so removing an
 * attribute never leaves a blank line behind. Falls back to "delete the
 * attribute + one leading space" (the same-line case, e.g. multiple
 * attributes sharing a line) when it isn't alone.
 */
function ownLineDeletionRange( src, start, end ) {
	let lineStart = start;
	while ( lineStart > 0 && src[ lineStart - 1 ] !== '\n' ) lineStart--;
	const prefix = src.slice( lineStart, start );
	if ( ! /^[ \t]*$/.test( prefix ) ) {
		// Not alone on its line — same-line removal, swallow one leading space.
		return { start: src[ start - 1 ] === ' ' ? start - 1 : start, end };
	}
	let lineEnd = end;
	while ( lineEnd < src.length && src[ lineEnd ] !== '\n' ) lineEnd++;
	const suffix = src.slice( end, lineEnd );
	if ( ! /^[ \t]*$/.test( suffix ) ) {
		return { start: src[ start - 1 ] === ' ' ? start - 1 : start, end };
	}
	// Alone on its line — swallow the indentation AND the trailing newline
	// (if one exists; the last line in a file might not have one).
	return { start: lineStart, end: lineEnd < src.length ? lineEnd + 1 : lineEnd };
}

function applyEditsToSource( src, edits ) {
	// Collect a flat list of splice operations across every call site, then
	// apply them in DESCENDING start-offset order so earlier offsets stay
	// valid as later (higher-offset) splices are applied first.
	const ops = [];

	for ( const { openingElement, editPlan } of edits ) {
		for ( const removal of editPlan.removals ) {
			const { start, end } = ownLineDeletionRange( src, removal.start, removal.end );
			ops.push( { start, end, text: '' } );
		}
		// Insert new bare-shorthand attrs right after the element's tag name
		// (or after the last existing attribute if any) — simplest anchor:
		// right after `name.end`.
		const propsToInsert = editPlan.toAdd.filter( ( a ) => ! a.demoteOnly ).map( ( a ) => a.propName );
		if ( propsToInsert.length ) {
			const insertAt = openingElement.name.end;
			const text = ' ' + propsToInsert.join( ' ' );
			ops.push( { start: insertAt, end: insertAt, text } );
		}
	}

	ops.sort( ( a, b ) => b.start - a.start );
	let out = src;
	for ( const op of ops ) {
		out = out.slice( 0, op.start ) + op.text + out.slice( op.end );
	}
	return out;
}

function processBlock( blockName, mode ) {
	const editFile = path.join( BLOCKS_DIR, blockName, 'edit.js' );
	if ( ! fs.existsSync( editFile ) ) return null;
	const src = fs.readFileSync( editFile, 'utf8' );
	let ast;
	try {
		ast = parseJs( src );
	} catch ( e ) {
		return { blockName, error: `parse error: ${ e.message }` };
	}

	const calls = findSingleTargetCalls( ast );
	if ( ! calls.length ) return { blockName, calls: [] };

	const callResults = [];
	const edits = [];
	for ( const openingElement of calls ) {
		const state = readPropState( openingElement );
		const editPlan = buildEdits( openingElement, state );
		callResults.push( { state, editPlan, line: openingElement.loc.start.line } );
		if ( editPlan && editPlan.toAdd.some( ( a ) => ! a.demoteOnly ) === false && ! editPlan.removals.length ) {
			continue;
		}
		if ( editPlan ) edits.push( { openingElement, editPlan } );
	}

	let newSrc = null;
	if ( mode === 'fix' && edits.length ) {
		newSrc = applyEditsToSource( src, edits );
	}

	return { blockName, editFile, src, newSrc, calls: callResults };
}

function printSurvey( results ) {
	let needsChange = 0;
	let clean = 0;
	let dynamic = 0;
	for ( const r of results ) {
		if ( r.error ) {
			console.log( `  [ERROR] ${ r.blockName }: ${ r.error }` );
			continue;
		}
		if ( ! r.calls.length ) continue;
		for ( const c of r.calls ) {
			const hasWork = c.editPlan && ( c.editPlan.toAdd.length || c.editPlan.removals.length );
			const hasDynamic = c.editPlan && c.editPlan.dynamicWarnings.length;
			if ( hasDynamic ) {
				dynamic++;
				console.log(
					`  [DYNAMIC] ${ r.blockName }:${ c.line } — non-literal value on: ${ c.editPlan.dynamicWarnings.join( ', ' ) } (refused, needs manual read)`
				);
			}
			if ( hasWork ) {
				needsChange++;
				const adding = c.editPlan.toAdd.filter( ( a ) => ! a.demoteOnly ).map( ( a ) => a.propName );
				const demoting = c.editPlan.toAdd.filter( ( a ) => a.demoteOnly ).map( ( a ) => a.propName );
				console.log(
					`  [NEEDS FIX] ${ r.blockName }:${ c.line } — add: [${ adding.join(
						', '
					) }]${ demoting.length ? `, revert-to-default: [${ demoting.join( ', ' ) }]` : '' }`
				);
			} else if ( ! hasDynamic ) {
				clean++;
			}
		}
	}
	console.log( `\nSUMMARY: ${ needsChange } call site(s) need a fix, ${ clean } already full, ${ dynamic } refused (dynamic value).` );
	return { needsChange, clean, dynamic };
}

function main() {
	const args = process.argv.slice( 2 );
	const mode = args.includes( '--check' )
		? 'check'
		: args.includes( '--fix' )
		? 'fix'
		: args.includes( '--self-test' )
		? 'self-test'
		: 'survey';
	const apply = args.includes( '--apply' );

	if ( mode === 'self-test' ) {
		return runSelfTest();
	}

	const blocks = listBlockDirs();
	const results = blocks.map( ( b ) => processBlock( b, mode === 'fix' ? 'fix' : 'survey' ) ).filter( Boolean );

	if ( mode === 'survey' ) {
		console.log( `Scanning ${ blocks.length } block(s) (excluded: ${ [ ...EXCLUDED_BLOCKS ].join( ', ' ) })\n` );
		printSurvey( results );
		return;
	}

	if ( mode === 'fix' ) {
		let written = 0;
		for ( const r of results ) {
			if ( r.error || ! r.newSrc || r.newSrc === r.src ) continue;
			if ( apply ) {
				fs.writeFileSync( r.editFile, r.newSrc, 'utf8' );
				console.log( `  WROTE ${ r.blockName }/edit.js` );
			} else {
				console.log( `  WOULD WRITE ${ r.blockName }/edit.js` );
			}
			written++;
		}
		console.log( `\n${ apply ? 'Applied' : 'Would apply' } changes to ${ written } file(s).` );
		return;
	}

	if ( mode === 'check' ) {
		const { needsChange, dynamic } = printSurvey( results );
		if ( needsChange > 0 || dynamic > 0 ) {
			console.error( `\n[migrate-typography-full-controls] GATE FAILED: ${ needsChange } unfixed, ${ dynamic } unresolved.` );
			process.exit( 1 );
		}
		console.log( '\n[migrate-typography-full-controls] GATE PASS — all in-scope call sites carry the full control set.' );
	}
}

function runSelfTest() {
	let failures = 0;
	function assert( cond, msg ) {
		if ( ! cond ) {
			failures++;
			console.error( `  FAIL: ${ msg }` );
		} else {
			console.log( `  ok: ${ msg }` );
		}
	}

	// Fixture 1: bare element with a `false` override on a default-true prop
	// and missing extend-props — should add extend-props + drop the override.
	const fixture1 = `<TypographyControls prefix="attribution" showWeight={ false } />`;
	const ast1 = parseJs( `const x = ${ fixture1 };` );
	const calls1 = findSingleTargetCalls( ast1 );
	assert( calls1.length === 1, 'fixture 1: finds the single-target call' );
	const state1 = readPropState( calls1[ 0 ] );
	assert( state1.showWeight === 'false', 'fixture 1: reads showWeight=false' );
	assert( state1.showFontFamily === 'absent', 'fixture 1: reads showFontFamily=absent' );
	const plan1 = buildEdits( calls1[ 0 ], state1 );
	assert( plan1 !== null, 'fixture 1: produces an edit plan' );
	assert( plan1.removals.length === 1, 'fixture 1: plans to remove the showWeight override' );
	assert(
		plan1.toAdd.some( ( a ) => a.propName === 'showFontFamily' && ! a.demoteOnly ),
		'fixture 1: plans to add showFontFamily'
	);
	const fixed1 = applyEditsToSource( `const x = ${ fixture1 };`, [ { openingElement: calls1[ 0 ], editPlan: plan1 } ] );
	assert( ! /showWeight/.test( fixed1 ), 'fixture 1: showWeight override removed from source' );
	assert( /showFontFamily/.test( fixed1 ), 'fixture 1: showFontFamily added to source' );
	// Re-parse the fixed output to prove it's still valid JS/JSX.
	let reparsed1Ok = true;
	try {
		parseJs( fixed1 );
	} catch ( e ) {
		reparsed1Ok = false;
	}
	assert( reparsed1Ok, 'fixture 1: fixed output re-parses as valid JS' );

	// Fixture 2: already-full call site — no changes.
	const fixture2 = `<TypographyControls prefix="" fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap showTextColumns showTextIndent showWritingMode />`;
	const ast2 = parseJs( `const x = ${ fixture2 };` );
	const calls2 = findSingleTargetCalls( ast2 );
	const state2 = readPropState( calls2[ 0 ] );
	const plan2 = buildEdits( calls2[ 0 ], state2 );
	assert( plan2 === null, 'fixture 2: already-full call site produces no edit plan' );

	// Fixture 3: a `targets` array call site — must be entirely skipped
	// (out of scope for this codemod).
	const fixture3 = `<TypographyControls targets={[{key:'a', prefix:'a', showWeight:false}]} attributes={attributes} setAttributes={setAttributes} />`;
	const ast3 = parseJs( `const x = ${ fixture3 };` );
	const calls3 = findSingleTargetCalls( ast3 );
	assert( calls3.length === 0, 'fixture 3: a targets-array call site is correctly out of scope' );

	// Fixture 4: dynamic (non-literal) value — must be refused, never guessed.
	const fixture4 = `<TypographyControls prefix="x" showFontFamily={ someFlag } />`;
	const ast4 = parseJs( `const x = ${ fixture4 };` );
	const calls4 = findSingleTargetCalls( ast4 );
	const state4 = readPropState( calls4[ 0 ] );
	assert( state4.showFontFamily === 'dynamic', 'fixture 4: a non-literal value is classified dynamic, never guessed' );
	const plan4 = buildEdits( calls4[ 0 ], state4 );
	assert(
		plan4 && plan4.dynamicWarnings.includes( 'showFontFamily' ),
		'fixture 4: dynamic value surfaces as a refusal, not a silent skip or a guess'
	);

	// Fixture 5: an attribute removal that sits ALONE on its own line (the
	// real-world multi-line JSX shape every actual block uses) must delete
	// the whole line — indentation and trailing newline included — not leave
	// a blank line behind. Caught live 2026-09-07: the first version of this
	// codemod only stripped one leading space, so `label/edit.js` came out
	// with three blank tabbed lines where `showWeight={ false }` etc. used to
	// be — valid JS, but a sloppy diff THE-MIGRATION-METHOD.md's own review
	// bar would reject.
	const fixture5 =
		'<TypographyControls\n' +
		'\tprefix=""\n' +
		'\tshowWeight={ false }\n' +
		'\tshowStyle={ false }\n' +
		'/>';
	const ast5 = parseJs( `const x = (\n${ fixture5 }\n);` );
	const calls5 = findSingleTargetCalls( ast5 );
	const state5 = readPropState( calls5[ 0 ] );
	const plan5 = buildEdits( calls5[ 0 ], state5 );
	const fixed5 = applyEditsToSource( `const x = (\n${ fixture5 }\n);`, [ { openingElement: calls5[ 0 ], editPlan: plan5 } ] );
	assert( ! /showWeight/.test( fixed5 ), 'fixture 5: showWeight override removed' );
	assert( ! /showStyle/.test( fixed5 ), 'fixture 5: showStyle override removed' );
	assert( ! /\n[ \t]*\n[ \t]*\n/.test( fixed5 ), 'fixture 5: no blank lines left where the own-line attrs used to be' );
	assert( /^\tprefix=""$/m.test( fixed5 ), 'fixture 5: the surviving prefix line is untouched (no stray whitespace)' );
	let reparsed5Ok = true;
	try {
		parseJs( fixed5 );
	} catch ( e ) {
		reparsed5Ok = false;
	}
	assert( reparsed5Ok, 'fixture 5: fixed output re-parses as valid JS' );

	console.log( `\n${ failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)' } — ${ 5 } fixtures, self-test ${ failures === 0 ? 'OK' : 'FAILED' }` );
	if ( failures > 0 ) process.exit( 1 );
}

main();
