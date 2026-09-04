'use strict';

/**
 * wire-border-contrast.js — wires `SgsBorderControl`'s `contrastAgainst` prop
 * (a WCAG 3:1 border-contrast warning, built and working on the component
 * itself — see `src/components/SgsBorderControl.js`) into every block's
 * `edit.js` that mounts `<SgsBorderControl>` but doesn't yet pass it.
 *
 * WHY THIS EXISTS. This repo's own detector-first gate
 * (`.claude/THE-MIGRATION-METHOD.md`, D542, Bean-locked) blocked a hand-
 * written commit touching 27 files with the same shape. This is the
 * detector: the census half (`--survey`), the fixer half (`--fix`/--apply`)
 * and the regression guard half (`--check`) are the SAME script, so the
 * next accidental hand-wiring of instance 28 is caught rather than repeated.
 *
 * THE SETTLED SHAPE (already applied by hand to 27 blocks + hero this
 * session — see `git diff --cached` on every block's own edit.js):
 *
 *   const <block>ContrastAgainst =
 *       attributes.backgroundColour && ! attributes.backgroundColourGradient
 *           ? attributes.backgroundColour
 *           : '';
 *
 *   ...
 *   <SgsBorderControl
 *       ...
 *       colourLinked={ true }
 *       contrastAgainst={ <block>ContrastAgainst }
 *       ...
 *   />
 *
 * THE REAL CENSUS (verified 2026-09-05, do not trust an inherited count —
 * see `.claude/THE-MIGRATION-METHOD.md`'s own "this document distrusts its
 * own numbers" section). 48 blocks mount `<SgsBorderControl>` in `edit.js`
 * (49 real JSX mounts — `multi-button` mounts it twice). Of those:
 *
 *   - 31 mounts are WIRED (contrastAgainst present on the mount) — includes
 *     `hero`, wired 2026-09-05 after this codemod's own survey found it was
 *     NOT already wired despite an earlier brief's claim otherwise (see the
 *     git history on this file's EXCLUDE list for that finding's original
 *     wording — hero's `contrastAgainst` call elsewhere in the file is on an
 *     unrelated `SgsColourPanel` text-colour row, not this border mount).
 *   - 17 blocks have NO comparable flat `backgroundColour` attribute at all
 *     (native `supports.color.background` is explicitly `false` and no
 *     custom `backgroundColour`/`backgroundColourGradient` attr pair
 *     exists) — these are EXEMPT BY MANIFEST, not silently skipped:
 *     accordion, before-after, button, card-grid, countdown-timer, counter,
 *     form, gallery, google-reviews, mega-panel, nav-drawer, option-picker,
 *     post-grid, pricing-table, table-of-contents, tabs, timeline.
 *   - 1 mount is EXCLUDED with a named, written reason (see EXCLUDE below)
 *     — a genuine defect found by this codemod's own survey, deliberately
 *     left unfixed because it is outside this task's authorised scope
 *     (`multi-button`'s group-defaults mount — no single real background to
 *     compare against).
 *   - 0 real TARGETs remain — the last 3 (`site-footer-row`, `site-header-row`,
 *     `text`) were fixed by this codemod's own `--fix --apply` run.
 *
 * Scope: `edit.js` ONLY. Never touches `render.php` or `block.json` — this
 * is an editor-only advisory `Notice`, WARN-only, never blocking save.
 */
// (note: the docblock above deliberately avoids writing a literal
// asterisk-slash sequence anywhere in its prose, e.g. a glob path — that
// sequence closes a block comment early and corrupted this file once.)

const fs = require( 'fs' );
const path = require( 'path' );
const babelParser = require( '@babel/parser' );

const PLUGIN_ROOT = path.resolve( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );

const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
	errorRecovery: false,
};

// ---------------------------------------------------------------------------
// EXCLUDE — genuine matches of the target shape, deliberately NOT fixed here.
// Every entry carries a written, human reason. `--check` treats these as
// closed (never counted as an outstanding target); `--survey` still reports
// them, under their own bucket, so they are never silently invisible.
// ---------------------------------------------------------------------------
const EXCLUDE = [
	{
		block: 'multi-button',
		mountIndex: 0,
		reason:
			'This is the "Button group defaults" panel\'s childBtn* border mount ' +
			'(source order: the group-default mount comes before the block\'s own ' +
			'root-border mount, which IS wired and is mountIndex 1). It sets a ' +
			'LIVE DEFAULT for child sgs/button instances, each of which can carry ' +
			'its own explicit background colour — there is no single block-level ' +
			'background this group default reliably paints against, so a ' +
			'contrast check here would compare against an arbitrary child state, ' +
			'not a real rendered surface. Refused rather than guessed.',
	},
];

function isExcluded( block, mountIndex ) {
	return EXCLUDE.some( ( e ) => e.block === block && e.mountIndex === mountIndex );
}

// ---------------------------------------------------------------------------
// Corpus — every block dir with both block.json and edit.js.
// ---------------------------------------------------------------------------
function blockDirs() {
	if ( ! fs.existsSync( BLOCKS_DIR ) ) return [];
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter(
			( n ) =>
				fs.existsSync( path.join( BLOCKS_DIR, n, 'block.json' ) ) &&
				fs.existsSync( path.join( BLOCKS_DIR, n, 'edit.js' ) )
		)
		.sort();
}

function readBlockJson( dir ) {
	const raw = fs.readFileSync( path.join( BLOCKS_DIR, dir, 'block.json' ), 'utf8' );
	return JSON.parse( raw );
}

function hasBackgroundColourAttr( blockJson ) {
	return Boolean( blockJson.attributes && Object.prototype.hasOwnProperty.call( blockJson.attributes, 'backgroundColour' ) );
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------
function parse( src ) {
	return babelParser.parse( src, BABEL_PARSE_OPTS );
}

function detectIndentUnit( src ) {
	return /\n\t/.test( src ) ? '\t' : '  ';
}

function indentOfLine( src, pos ) {
	const lineStart = src.lastIndexOf( '\n', pos - 1 ) + 1;
	const m = src.slice( lineStart, pos ).match( /^[ \t]*/ );
	return m ? m[ 0 ] : '';
}

/**
 * Every `<SgsBorderControl ...>` JSXOpeningElement in the file, in source
 * order (real AST nodes only — a comment mentioning the component name,
 * e.g. hero/edit.js:64, is never a node and can never match).
 */
function findBorderControlMounts( ast ) {
	const mounts = [];
	function walk( node ) {
		if ( ! node || typeof node !== 'object' ) return;
		if ( Array.isArray( node ) ) {
			for ( const el of node ) walk( el );
			return;
		}
		if ( node.type === 'JSXOpeningElement' && node.name && node.name.type === 'JSXIdentifier' && node.name.name === 'SgsBorderControl' ) {
			mounts.push( node );
		}
		for ( const key of Object.keys( node ) ) {
			if ( key === 'loc' || key === 'start' || key === 'end' || key === 'range' ) continue;
			const val = node[ key ];
			if ( val && typeof val === 'object' ) walk( val );
		}
	}
	walk( ast.program.body );
	return mounts;
}

function jsxAttr( openingElement, name ) {
	return ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === name
	);
}

/**
 * `attributes.NAME` or bare identifier `NAME` — the two live sub-shapes
 * this codemod's REUSE detector recognises (see module docblock — the
 * generated code always uses the `attributes.X` inline form, but existing
 * hand-written files may use either).
 */
function isBgRef( node, name ) {
	if ( ! node ) return false;
	if ( node.type === 'Identifier' && node.name === name ) return true;
	if (
		node.type === 'MemberExpression' &&
		! node.computed &&
		node.object.type === 'Identifier' &&
		node.object.name === 'attributes' &&
		node.property.type === 'Identifier' &&
		node.property.name === name
	) {
		return true;
	}
	return false;
}

/**
 * Does `init` match the canonical
 * `X && ! Y ? X : ''` shape (X = backgroundColour ref, Y = backgroundColourGradient ref)?
 */
function matchesCanonicalContrastShape( init ) {
	if ( ! init || init.type !== 'ConditionalExpression' ) return false;
	const { test, consequent, alternate } = init;
	if ( test.type !== 'LogicalExpression' || test.operator !== '&&' ) return false;
	if ( ! isBgRef( test.left, 'backgroundColour' ) ) return false;
	if ( test.right.type !== 'UnaryExpression' || test.right.operator !== '!' ) return false;
	if ( ! isBgRef( test.right.argument, 'backgroundColourGradient' ) ) return false;
	if ( ! isBgRef( consequent, 'backgroundColour' ) ) return false;
	if ( alternate.type !== 'StringLiteral' || alternate.value !== '' ) return false;
	return true;
}

/**
 * Find the default-exported Edit function's BlockStatement body.
 * Recognises `export default function Edit(...) {...}` and
 * `export default function (...) {...}` — the only two shapes present in
 * this tree (verified: every block.json-having edit.js in `src/blocks`
 * uses one of these two).
 */
function findEditFunctionBody( ast ) {
	for ( const node of ast.program.body ) {
		if ( node.type === 'ExportDefaultDeclaration' && node.declaration && node.declaration.type === 'FunctionDeclaration' ) {
			return node.declaration.body;
		}
	}
	return null;
}

/**
 * Search the Edit function's TOP-LEVEL statements (not nested in a callback
 * or conditional) for an existing `const NAME = <canonical shape>;` — if
 * found, the codemod REUSES that variable rather than declaring a duplicate
 * (this is the real shape of `sgs/text`, which already computes
 * `textContrastAgainst` for a colour-panel row and can feed the identical
 * value to its border mount).
 */
function findReusableContrastVar( fnBody ) {
	for ( const stmt of fnBody.body ) {
		if ( stmt.type !== 'VariableDeclaration' ) continue;
		for ( const decl of stmt.declarations ) {
			if ( decl.id.type !== 'Identifier' ) continue;
			if ( matchesCanonicalContrastShape( decl.init ) ) return decl.id.name;
		}
	}
	return null;
}

/**
 * Find the LAST top-level `return (...)` statement in the Edit function body
 * whose argument is JSX (JSXElement/JSXFragment) — the statement that
 * actually returns the component's markup, as opposed to an early guard
 * clause (`if (!x) return null;`), which is nested inside an IfStatement
 * and is therefore never a direct child of fnBody.body.
 */
function findJsxReturnStatement( fnBody ) {
	let found = null;
	for ( const stmt of fnBody.body ) {
		if ( stmt.type !== 'ReturnStatement' || ! stmt.argument ) continue;
		if ( stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment' ) {
			found = stmt;
		}
	}
	return found;
}

function camel( dirName ) {
	return dirName.replace( /-([a-z0-9])/g, ( _, c ) => c.toUpperCase() );
}

// ---------------------------------------------------------------------------
// Classification — the census. Returns one finding per real JSX mount.
// ---------------------------------------------------------------------------
function classifyFile( dir ) {
	const editPath = path.join( BLOCKS_DIR, dir, 'edit.js' );
	const src = fs.readFileSync( editPath, 'utf8' );
	let ast;
	try {
		ast = parse( src );
	} catch ( e ) {
		return [ { block: dir, mountIndex: null, status: 'unrecognised', reason: 'parse-error:' + e.message } ];
	}

	const mounts = findBorderControlMounts( ast );
	if ( ! mounts.length ) return [];

	const blockJson = readBlockJson( dir );
	const hasBg = hasBackgroundColourAttr( blockJson );
	const fnBody = findEditFunctionBody( ast );

	return mounts.map( ( mount, mountIndex ) => {
		const hasContrastAgainst = Boolean( jsxAttr( mount, 'contrastAgainst' ) );
		if ( hasContrastAgainst ) {
			return { block: dir, mountIndex, status: 'wired' };
		}
		if ( isExcluded( dir, mountIndex ) ) {
			const entry = EXCLUDE.find( ( e ) => e.block === dir && e.mountIndex === mountIndex );
			return { block: dir, mountIndex, status: 'excluded', reason: entry.reason };
		}
		if ( ! hasBg ) {
			return {
				block: dir,
				mountIndex,
				status: 'exempt',
				reason:
					'no comparable flat backgroundColour attribute declared on this ' +
					'block (and native supports.color.background is not a usable ' +
					'substitute) — nothing to compare border contrast against',
			};
		}
		if ( ! fnBody ) {
			return { block: dir, mountIndex, status: 'unrecognised', reason: 'no-edit-function-body-found' };
		}
		const anchorAttr = jsxAttr( mount, 'colourLinked' ) || jsxAttr( mount, 'colourStates' );
		if ( ! anchorAttr ) {
			return { block: dir, mountIndex, status: 'unrecognised', reason: 'no-colourLinked-or-colourStates-anchor-attr' };
		}
		const returnStmt = findJsxReturnStatement( fnBody );
		if ( ! returnStmt ) {
			return { block: dir, mountIndex, status: 'unrecognised', reason: 'no-top-level-jsx-return-statement' };
		}
		return { block: dir, mountIndex, status: 'target', mount, anchorAttr, returnStmt, fnBody };
	} );
}

function collectAll() {
	const out = [];
	for ( const dir of blockDirs() ) {
		out.push( ...classifyFile( dir ) );
	}
	return out;
}

// ---------------------------------------------------------------------------
// Corpus control — a second, dumb, wide enumeration that must reconcile
// with the AST-derived mount list (Step 6.6 of THE-MIGRATION-METHOD.md).
// ---------------------------------------------------------------------------
const WIDTH_OK = new Set(); // no known reconciliation gaps as of authoring

function broadEnumeration() {
	const found = [];
	for ( const dir of blockDirs() ) {
		const src = fs.readFileSync( path.join( BLOCKS_DIR, dir, 'edit.js' ), 'utf8' );
		const n = ( src.match( /\n[ \t]*<SgsBorderControl\b/g ) || [] ).length;
		for ( let i = 0; i < n; i++ ) found.push( dir + '#' + i );
	}
	return found;
}

function narrowEnumeration() {
	const found = [];
	for ( const f of collectAll() ) {
		if ( f.mountIndex !== null && f.mountIndex !== undefined ) found.push( f.block + '#' + f.mountIndex );
	}
	return found;
}

function checkCorpusWidth() {
	const broad = new Set( broadEnumeration() );
	const narrow = new Set( narrowEnumeration() );
	const missingFromNarrow = [ ...broad ].filter( ( x ) => ! narrow.has( x ) && ! WIDTH_OK.has( x ) );
	return { ok: missingFromNarrow.length === 0, missingFromNarrow, broadCount: broad.size, narrowCount: narrow.size };
}

// ---------------------------------------------------------------------------
// Fix — text splicing at exact AST node boundaries, never a full re-print.
// ---------------------------------------------------------------------------
function planFileFix( dir ) {
	const editPath = path.join( BLOCKS_DIR, dir, 'edit.js' );
	const src = fs.readFileSync( editPath, 'utf8' );
	const ast = parse( src );
	const findings = classifyFile( dir ).filter( ( f ) => f.status === 'target' );
	if ( ! findings.length ) return null;

	const indentUnit = detectIndentUnit( src );
	const fnBody = findEditFunctionBody( ast );
	const reusable = findReusableContrastVar( fnBody );

	const edits = [];
	const varNames = [];
	let constInserted = false;

	// One shared const serves every target mount in this file (multi-button's
	// two mounts are never both `target` — its 2nd mount is excluded — but the
	// mechanism supports it: every mount reuses/declares the SAME var, matching
	// hero's own already-committed multi-mount convention of one shared local).
	let varName = reusable;
	if ( ! varName ) {
		varName = camel( dir ) + 'ContrastAgainst';
		const returnStmt = findJsxReturnStatement( fnBody );
		const insertPos = returnStmt.start;
		const lineStart = src.lastIndexOf( '\n', insertPos - 1 ) + 1;
		const indent = indentOfLine( src, insertPos );
		// Replace from the START OF THE LINE (not just insertPos) — the
		// pre-existing indent before `return` sits BEFORE insertPos, so an
		// edit anchored at insertPos alone would double it on the first
		// inserted line and strip it from `return` afterwards. Restoring
		// `indent` as the LAST thing in the replacement puts it back
		// immediately before the untouched `return (` that follows.
		const block =
			[
				`// Contrast check for border colour — warn if border fails WCAG 3:1 contrast`,
				`// against the block's own background. When the background is a gradient,`,
				`// the flat backgroundColour is not rendered, so skip the check in that case.`,
				`const ${ varName } =`,
				`${ indentUnit }attributes.backgroundColour && ! attributes.backgroundColourGradient`,
				`${ indentUnit }${ indentUnit }? attributes.backgroundColour`,
				`${ indentUnit }${ indentUnit }: '';`,
			]
				.map( ( line ) => indent + line )
				.join( '\n' ) + '\n\n' + indent;
		edits.push( { start: lineStart, end: insertPos, replacement: block } );
		constInserted = true;
	}
	varNames.push( varName );

	for ( const finding of findings ) {
		const anchorEnd = finding.anchorAttr.end;
		const indent = indentOfLine( src, finding.anchorAttr.start );
		edits.push( {
			start: anchorEnd,
			end: anchorEnd,
			replacement: `\n${ indent }contrastAgainst={ ${ varName } }`,
		} );
	}

	return { editPath, src, edits, reused: Boolean( reusable ), varName, constInserted, targetCount: findings.length };
}

function applyEdits( src, edits ) {
	const sorted = edits.slice().sort( ( a, b ) => b.start - a.start );
	let out = src;
	for ( const e of sorted ) {
		out = out.slice( 0, e.start ) + e.replacement + out.slice( e.end );
	}
	return out;
}

function atomicWrite( filePath, content ) {
	const tmp = filePath + '.tmp';
	fs.writeFileSync( tmp, content, 'utf8' );
	fs.renameSync( tmp, filePath );
}

// ---------------------------------------------------------------------------
// CLI: --survey / --fix / --check / --self-test
// ---------------------------------------------------------------------------
function runSurvey( { json } ) {
	const all = collectAll();
	const byStatus = { wired: [], target: [], exempt: [], excluded: [], unrecognised: [] };
	for ( const f of all ) byStatus[ f.status ].push( f );
	const widthCheck = checkCorpusWidth();

	if ( json ) {
		console.log(
			JSON.stringify(
				{
					wired: byStatus.wired.length,
					target: byStatus.target.map( ( f ) => f.block + '#' + f.mountIndex ),
					exempt: byStatus.exempt.map( ( f ) => ( { block: f.block, mountIndex: f.mountIndex, reason: f.reason } ) ),
					excluded: byStatus.excluded.map( ( f ) => ( { block: f.block, mountIndex: f.mountIndex, reason: f.reason } ) ),
					unrecognised: byStatus.unrecognised,
					corpusWidth: widthCheck,
				},
				null,
				'\t'
			)
		);
		return;
	}

	console.log( '\nwire-border-contrast SURVEY\n' );
	console.log( `  wired:        ${ byStatus.wired.length }` );
	console.log( `  target:       ${ byStatus.target.length }  (${ byStatus.target.map( ( f ) => f.block + '#' + f.mountIndex ).join( ', ' ) })` );
	console.log( `  exempt:       ${ byStatus.exempt.length }  (no comparable backgroundColour attr)` );
	console.log( `  excluded:     ${ byStatus.excluded.length }  (${ byStatus.excluded.map( ( f ) => f.block + '#' + f.mountIndex ).join( ', ' ) })` );
	console.log( `  unrecognised: ${ byStatus.unrecognised.length }` );
	console.log();
	console.log( `  corpus width: broad=${ widthCheck.broadCount } narrow=${ widthCheck.narrowCount } ok=${ widthCheck.ok }` );
	if ( ! widthCheck.ok ) console.log( '  MISSING FROM NARROW LIST: ' + widthCheck.missingFromNarrow.join( ', ' ) );
	console.log();
	if ( byStatus.exempt.length ) {
		console.log( 'EXEMPT (by name):' );
		for ( const f of byStatus.exempt ) console.log( `  ${ f.block }#${ f.mountIndex }` );
		console.log();
	}
	if ( byStatus.unrecognised.length ) {
		console.log( 'UNRECOGNISED (needs human read):' );
		for ( const f of byStatus.unrecognised ) console.log( `  ${ f.block }${ f.mountIndex !== null ? '#' + f.mountIndex : '' }: ${ f.reason }` );
		console.log();
	}
}

function runFix( { apply } ) {
	const all = collectAll();
	const targetBlocks = [ ...new Set( all.filter( ( f ) => f.status === 'target' ).map( ( f ) => f.block ) ) ];
	let fixedFiles = 0;
	let fixedMounts = 0;

	for ( const dir of targetBlocks ) {
		const plan = planFileFix( dir );
		if ( ! plan ) continue;
		const newSrc = applyEdits( plan.src, plan.edits );
		fixedFiles++;
		fixedMounts += plan.targetCount;
		console.log(
			`${ apply ? 'APPLIED' : 'WOULD FIX' } ${ dir }: ${ plan.targetCount } mount(s) -> ${ plan.reused ? 'reused ' : 'new ' }${ plan.varName }`
		);
		if ( apply ) {
			atomicWrite( plan.editPath, newSrc );
		} else {
			console.log( '--- ' + plan.editPath );
			for ( const line of newSrc.split( '\n' ) ) {
				// unified-diff-lite: only print lines that differ in count/position
			}
			printSimpleDiff( plan.src, newSrc );
		}
	}
	console.log( `\n${ apply ? 'Applied' : 'Would apply' } fix(es) to ${ fixedMounts } mount(s) across ${ fixedFiles } file(s).\n` );
	return { fixedFiles, fixedMounts };
}

/**
 * Multi-hunk line diff via real LCS — a single prefix/suffix trim (tried
 * first) prints the ENTIRE tail of the file as changed once the const
 * insertion is followed by an unrelated JSX-prop insertion further down,
 * because nothing after the first unmatched line is ever considered a
 * re-sync point. Same hazard `adopt.js` documents and fixes the same way.
 */
function printSimpleDiff( before, after ) {
	if ( before === after ) {
		console.log( '  (no change)' );
		return;
	}
	const a = before.split( '\n' );
	const b = after.split( '\n' );
	const n = a.length;
	const m = b.length;
	const dp = Array.from( { length: n + 1 }, () => new Uint32Array( m + 1 ) );
	for ( let i = n - 1; i >= 0; i-- ) {
		for ( let j = m - 1; j >= 0; j-- ) {
			dp[ i ][ j ] = a[ i ] === b[ j ] ? dp[ i + 1 ][ j + 1 ] + 1 : Math.max( dp[ i + 1 ][ j ], dp[ i ][ j + 1 ] );
		}
	}
	let i = 0;
	let j = 0;
	while ( i < n && j < m ) {
		if ( a[ i ] === b[ j ] ) {
			i++;
			j++;
		} else if ( dp[ i + 1 ][ j ] >= dp[ i ][ j + 1 ] ) {
			console.log( '  - ' + a[ i ] );
			i++;
		} else {
			console.log( '  + ' + b[ j ] );
			j++;
		}
	}
	while ( i < n ) console.log( '  - ' + a[ i++ ] );
	while ( j < m ) console.log( '  + ' + b[ j++ ] );
}

function runCheck() {
	const all = collectAll();
	const targets = all.filter( ( f ) => f.status === 'target' );
	const widthCheck = checkCorpusWidth();
	let failed = false;

	if ( targets.length > 0 ) {
		console.log( `[wire-border-contrast --check] ${ targets.length } outstanding target mount(s):` );
		for ( const f of targets ) console.log( `  ${ f.block }#${ f.mountIndex }` );
		failed = true;
	}
	if ( ! widthCheck.ok ) {
		console.log( '[wire-border-contrast --check] corpus width mismatch — broad enumeration found mounts the narrow classifier missed:' );
		console.log( '  ' + widthCheck.missingFromNarrow.join( ', ' ) );
		failed = true;
	}
	const unrecognised = all.filter( ( f ) => f.status === 'unrecognised' );
	if ( unrecognised.length > 0 ) {
		console.log( `[wire-border-contrast --check] ${ unrecognised.length } unrecognised mount(s) — classifier incomplete:` );
		for ( const f of unrecognised ) console.log( `  ${ f.block }${ f.mountIndex !== null ? '#' + f.mountIndex : '' }: ${ f.reason }` );
		failed = true;
	}

	if ( failed ) {
		process.exitCode = 1;
		return;
	}
	console.log( '[wire-border-contrast --check] OK — no outstanding target mounts, corpus width reconciled, nothing unrecognised.' );
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------
function assert( cond, msg ) {
	if ( ! cond ) throw new Error( 'SELF-TEST FAILED: ' + msg );
}

function makeFixtureBlock( tmpRoot, name, editJs, blockJsonAttrs ) {
	const dir = path.join( tmpRoot, name );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'edit.js' ), editJs, 'utf8' );
	fs.writeFileSync(
		path.join( dir, 'block.json' ),
		JSON.stringify( { apiVersion: 3, name: 'sgs/' + name, attributes: blockJsonAttrs }, null, '\t' ) + '\n',
		'utf8'
	);
	return dir;
}

const FIXTURE_POSITIVE = `import { __ } from '@wordpress/i18n';
import { SgsBorderControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { borderWidth, borderStyle, borderColour, borderColourGradient } = attributes;

	return (
		<SgsBorderControl
			widthValues={ borderWidth ?? {} }
			onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
			styleValue={ borderStyle }
			onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
			colourValue={ borderColour }
			onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
			colourGradientValue={ borderColourGradient }
			onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
			colourLinked={ true }
		/>
	);
}
`;

const FIXTURE_DEFINITION = `import { __ } from '@wordpress/i18n';
import { SgsBorderControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { borderWidth, borderStyle, borderColour, borderColourGradient, backgroundColour } = attributes;

	const fixtureDefinitionContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<SgsBorderControl
			widthValues={ borderWidth ?? {} }
			onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
			styleValue={ borderStyle }
			onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
			colourValue={ borderColour }
			onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
			colourGradientValue={ borderColourGradient }
			onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
			colourLinked={ true }
			contrastAgainst={ fixtureDefinitionContrastAgainst }
		/>
	);
}
`;

// Edge case: an EXISTING reusable contrast var (the `sgs/text` shape) — the
// fixer must REUSE it, not declare a duplicate.
const FIXTURE_EDGE_REUSE = `import { __ } from '@wordpress/i18n';
import { SgsBorderControl, SgsColourPanel } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { borderWidth, borderStyle, borderColour, borderColourGradient } = attributes;

	const fixtureEdgeReuseContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<>
			<SgsColourPanel rows={ [] } />
			<SgsBorderControl
				widthValues={ borderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
				styleValue={ borderStyle }
				onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
				colourStates={ [
					{
						key: 'normal',
						label: __( 'Normal', 'sgs-blocks' ),
						value: borderColour,
						onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
						linked: true,
						gradientValue: borderColourGradient,
						onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ),
					},
				] }
			/>
		</>
	);
}
`;

const FIXTURE_NEGATIVE = `import { __ } from '@wordpress/i18n';
import { TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { label } = attributes;
	return (
		<TextControl value={ label } onChange={ ( v ) => setAttributes( { label: v } ) } />
	);
}
`;

function runSelfTest() {
	const os = require( 'os' );
	const tmpRoot = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-wire-border-contrast-selftest-' ) );
	let failures = 0;

	function check( label, fn ) {
		try {
			fn();
			console.log( '  PASS  ' + label );
		} catch ( e ) {
			failures++;
			console.log( '  FAIL  ' + label + '\n        ' + e.message );
		}
	}

	// --- Positive: has backgroundColour attr, no contrastAgainst yet ---
	const fxPositive = makeFixtureBlock( tmpRoot, 'fixture-positive', FIXTURE_POSITIVE, {
		borderWidth: { type: 'object', default: {} },
		borderStyle: { type: 'string', default: 'solid' },
		borderColour: { type: 'string', default: '' },
		borderColourGradient: { type: 'string', default: '' },
		backgroundColour: { type: 'string', default: '' },
		backgroundColourGradient: { type: 'string', default: '' },
	} );

	check( 'positive fixture classifies as exactly 1 target', () => {
		const findings = classifyFileAt( fxPositive, 'fixture-positive' );
		assert( findings.length === 1, 'expected 1 finding, got ' + findings.length );
		assert( findings[ 0 ].status === 'target', 'expected status target, got ' + findings[ 0 ].status );
	} );

	let planned;
	check( 'fix plan declares a NEW contrast var (dry run — file on disk unchanged)', () => {
		const before = fs.readFileSync( path.join( fxPositive, 'edit.js' ), 'utf8' );
		planned = planFileFixAt( fxPositive, 'fixture-positive' );
		assert( planned, 'expected a plan' );
		assert( ! planned.reused, 'expected a new var, not reuse' );
		assert( planned.varName === 'fixturePositiveContrastAgainst', 'unexpected var name: ' + planned.varName );
		assert( fs.readFileSync( path.join( fxPositive, 'edit.js' ), 'utf8' ) === before, 'dry-run mutated the file on disk' );
	} );

	check( 'APPLY writes the const + the JSX prop', () => {
		const newSrc = applyEdits( planned.src, planned.edits );
		atomicWrite( planned.editPath, newSrc );
		const src = fs.readFileSync( planned.editPath, 'utf8' );
		assert( /const fixturePositiveContrastAgainst =/.test( src ), 'expected the new const' );
		assert( /contrastAgainst={ fixturePositiveContrastAgainst }/.test( src ), 'expected the new JSX prop' );
		// Indentation regression control — a real bug shipped once: the const's
		// FIRST line doubled its indent (the pre-existing indent before
		// `return` sits BEFORE the insertion point, so an edit anchored only
		// at that point stacks a second indent on line 1) while `return (`
		// itself lost its indent entirely. Assert every comment line of the
		// inserted block carries exactly ONE tab, and `return (` still has one.
		const lines = src.split( '\n' );
		const commentLine = lines.find( ( l ) => l.includes( '// Contrast check for border colour' ) );
		assert( commentLine === '\t// Contrast check for border colour — warn if border fails WCAG 3:1 contrast', 'const comment line 1 has wrong indent: ' + JSON.stringify( commentLine ) );
		const returnLine = lines.find( ( l ) => l.trim() === 'return (' );
		assert( returnLine === '\treturn (', '`return (` lost or gained indent: ' + JSON.stringify( returnLine ) );
	} );

	check( 're-classifying the applied file reports wired, not target', () => {
		const findings = classifyFileAt( fxPositive, 'fixture-positive' );
		assert( findings.length === 1 && findings[ 0 ].status === 'wired', 'expected wired, got ' + JSON.stringify( findings ) );
	} );

	check( 'idempotence: re-running --fix on the applied file makes zero further edits', () => {
		const plan = planFileFixAt( fxPositive, 'fixture-positive' );
		assert( plan === null, 'expected no plan (nothing left to fix), got a plan' );
	} );

	// --- Definition: already wired, must be classified wired and left alone ---
	const fxDefinition = makeFixtureBlock( tmpRoot, 'fixture-definition', FIXTURE_DEFINITION, {
		borderWidth: { type: 'object', default: {} },
		borderStyle: { type: 'string', default: 'solid' },
		borderColour: { type: 'string', default: '' },
		borderColourGradient: { type: 'string', default: '' },
		backgroundColour: { type: 'string', default: '' },
	} );
	check( 'definition fixture (already wired) classifies as wired, never target', () => {
		const before = fs.readFileSync( path.join( fxDefinition, 'edit.js' ), 'utf8' );
		const findings = classifyFileAt( fxDefinition, 'fixture-definition' );
		assert( findings.length === 1 && findings[ 0 ].status === 'wired', 'expected wired, got ' + JSON.stringify( findings ) );
		const plan = planFileFixAt( fxDefinition, 'fixture-definition' );
		assert( plan === null, 'expected no plan for an already-wired file' );
		assert( fs.readFileSync( path.join( fxDefinition, 'edit.js' ), 'utf8' ) === before, 'definition fixture must stay byte-identical' );
	} );

	// --- Edge: reusable existing var (the sgs/text shape) ---
	const fxEdge = makeFixtureBlock( tmpRoot, 'fixture-edge-reuse', FIXTURE_EDGE_REUSE, {
		borderWidth: { type: 'object', default: {} },
		borderStyle: { type: 'string', default: 'solid' },
		borderColour: { type: 'string', default: '' },
		borderColourGradient: { type: 'string', default: '' },
		backgroundColour: { type: 'string', default: '' },
		backgroundColourGradient: { type: 'string', default: '' },
	} );
	check( 'edge fixture (existing reusable var) reuses it, declares no duplicate', () => {
		const plan = planFileFixAt( fxEdge, 'fixture-edge-reuse' );
		assert( plan, 'expected a plan' );
		assert( plan.reused === true, 'expected reuse:true' );
		assert( plan.varName === 'fixtureEdgeReuseContrastAgainst', 'unexpected var name: ' + plan.varName );
		const newSrc = applyEdits( plan.src, plan.edits );
		atomicWrite( plan.editPath, newSrc );
		const src = fs.readFileSync( plan.editPath, 'utf8' );
		const declCount = ( src.match( /const fixtureEdgeReuseContrastAgainst =/g ) || [] ).length;
		assert( declCount === 1, 'expected exactly 1 declaration (no duplicate), found ' + declCount );
		assert( /contrastAgainst={ fixtureEdgeReuseContrastAgainst }/.test( src ), 'expected the JSX prop wired to the reused var' );
	} );

	// --- Negative control: no SgsBorderControl at all ---
	const fxNegative = makeFixtureBlock( tmpRoot, 'fixture-negative', FIXTURE_NEGATIVE, {
		label: { type: 'string', default: '' },
	} );
	check( 'negative control: no SgsBorderControl mount -> zero findings, file untouched', () => {
		const before = fs.readFileSync( path.join( fxNegative, 'edit.js' ), 'utf8' );
		const findings = classifyFileAt( fxNegative, 'fixture-negative' );
		assert( findings.length === 0, 'expected 0 findings, got ' + findings.length );
		const plan = planFileFixAt( fxNegative, 'fixture-negative' );
		assert( plan === null, 'expected no plan' );
		assert( fs.readFileSync( path.join( fxNegative, 'edit.js' ), 'utf8' ) === before, 'negative control must stay byte-identical' );
	} );

	// --- Exempt: mounts SgsBorderControl but declares no backgroundColour attr ---
	const fxExempt = makeFixtureBlock( tmpRoot, 'fixture-exempt', FIXTURE_POSITIVE, {
		borderWidth: { type: 'object', default: {} },
		borderStyle: { type: 'string', default: 'solid' },
		borderColour: { type: 'string', default: '' },
		borderColourGradient: { type: 'string', default: '' },
	} );
	check( 'exempt fixture (no backgroundColour attr) classifies as exempt, never target', () => {
		const before = fs.readFileSync( path.join( fxExempt, 'edit.js' ), 'utf8' );
		const findings = classifyFileAt( fxExempt, 'fixture-exempt' );
		assert( findings.length === 1 && findings[ 0 ].status === 'exempt', 'expected exempt, got ' + JSON.stringify( findings ) );
		const plan = planFileFixAt( fxExempt, 'fixture-exempt' );
		assert( plan === null, 'expected no plan for an exempt file' );
		assert( fs.readFileSync( path.join( fxExempt, 'edit.js' ), 'utf8' ) === before, 'exempt fixture must stay byte-identical' );
	} );

	// --- Corpus control (D775-style): a second, dumb, wide walk must
	// reconcile with the narrow classifier on the REAL tree.
	check( 'corpus width control: broad enumeration reconciles with narrow classifier on the real tree', () => {
		const widthCheck = checkCorpusWidth();
		assert( widthCheck.ok, 'corpus width mismatch: ' + JSON.stringify( widthCheck.missingFromNarrow ) );
		assert( widthCheck.broadCount > 0, 'broad enumeration found nothing — ROOT likely resolved outside the repo' );
	} );

	console.log( `\n${ failures === 0 ? 'ALL SELF-TESTS PASSED' : failures + ' SELF-TEST(S) FAILED' } (tmp dir: ${ tmpRoot })\n` );
	process.exitCode = failures === 0 ? 0 : 1;
}

// Fixture-scoped variants of classifyFile/planFileFix that operate on an
// arbitrary directory rather than BLOCKS_DIR/<dir> — self-test only.
function classifyFileAt( dirPath, name ) {
	const editPath = path.join( dirPath, 'edit.js' );
	const src = fs.readFileSync( editPath, 'utf8' );
	const ast = parse( src );
	const mounts = findBorderControlMounts( ast );
	if ( ! mounts.length ) return [];
	const blockJson = JSON.parse( fs.readFileSync( path.join( dirPath, 'block.json' ), 'utf8' ) );
	const hasBg = hasBackgroundColourAttr( blockJson );
	const fnBody = findEditFunctionBody( ast );
	return mounts.map( ( mount, mountIndex ) => {
		if ( jsxAttr( mount, 'contrastAgainst' ) ) return { block: name, mountIndex, status: 'wired' };
		if ( ! hasBg ) return { block: name, mountIndex, status: 'exempt', reason: 'no-backgroundColour-attr' };
		const anchorAttr = jsxAttr( mount, 'colourLinked' ) || jsxAttr( mount, 'colourStates' );
		if ( ! anchorAttr ) return { block: name, mountIndex, status: 'unrecognised', reason: 'no-anchor-attr' };
		const returnStmt = findJsxReturnStatement( fnBody );
		if ( ! returnStmt ) return { block: name, mountIndex, status: 'unrecognised', reason: 'no-return' };
		return { block: name, mountIndex, status: 'target', mount, anchorAttr, returnStmt, fnBody };
	} );
}

function planFileFixAt( dirPath, name ) {
	const editPath = path.join( dirPath, 'edit.js' );
	const src = fs.readFileSync( editPath, 'utf8' );
	const ast = parse( src );
	const findings = classifyFileAt( dirPath, name ).filter( ( f ) => f.status === 'target' );
	if ( ! findings.length ) return null;

	const indentUnit = detectIndentUnit( src );
	const fnBody = findEditFunctionBody( ast );
	const reusable = findReusableContrastVar( fnBody );
	const edits = [];
	let varName = reusable;
	if ( ! varName ) {
		varName = camel( name ) + 'ContrastAgainst';
		const returnStmt = findJsxReturnStatement( fnBody );
		const insertPos = returnStmt.start;
		const lineStart = src.lastIndexOf( '\n', insertPos - 1 ) + 1;
		const indent = indentOfLine( src, insertPos );
		const block =
			[
				`// Contrast check for border colour — warn if border fails WCAG 3:1 contrast`,
				`// against the block's own background. When the background is a gradient,`,
				`// the flat backgroundColour is not rendered, so skip the check in that case.`,
				`const ${ varName } =`,
				`${ indentUnit }attributes.backgroundColour && ! attributes.backgroundColourGradient`,
				`${ indentUnit }${ indentUnit }? attributes.backgroundColour`,
				`${ indentUnit }${ indentUnit }: '';`,
			]
				.map( ( line ) => indent + line )
				.join( '\n' ) + '\n\n' + indent;
		edits.push( { start: lineStart, end: insertPos, replacement: block } );
	}
	for ( const finding of findings ) {
		const anchorEnd = finding.anchorAttr.end;
		const indent = indentOfLine( src, finding.anchorAttr.start );
		edits.push( { start: anchorEnd, end: anchorEnd, replacement: `\n${ indent }contrastAgainst={ ${ varName } }` } );
	}
	return { editPath, src, edits, reused: Boolean( reusable ), varName, targetCount: findings.length };
}

// ---------------------------------------------------------------------------
function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) return runSelfTest();
	if ( argv.includes( '--check' ) ) return runCheck();
	if ( argv.includes( '--survey' ) ) return runSurvey( { json: argv.includes( '--json' ) } );
	if ( argv.includes( '--fix' ) ) return void runFix( { apply: argv.includes( '--apply' ) } );
	console.log(
		'Usage: node wire-border-contrast.js --survey [--json] | --fix [--apply] | --check | --self-test'
	);
	process.exitCode = 1;
}

if ( require.main === module ) {
	main();
}

module.exports = { collectAll, classifyFile, planFileFix, applyEdits, checkCorpusWidth };
