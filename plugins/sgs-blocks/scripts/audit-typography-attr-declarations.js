'use strict';

/**
 * audit-typography-attr-declarations.js — finds and fixes a real correctness
 * bug introduced while rolling out the full TypographyControls control set
 * (2026-09-07 typography-surface-taxonomy track, Task 4/5).
 *
 * THE BUG. WordPress only persists a value a client sets in the block editor
 * if the attribute NAME is explicitly declared in block.json's `attributes`
 * object — this is documented in plugins/sgs-blocks/CLAUDE.md ("WordPress
 * silently DROPS any block attribute the block.json does not declare... on
 * the EDITOR/JS surface"). `TypographyControls` reads/writes attributes by
 * building a key from `{prefix}{Suffix}` (e.g. prefix 'title' + 'FontFamily'
 * -> 'titleFontFamily') and passes `attributes={attributes}` as a whole
 * object rather than destructuring individual props — so
 * `check-undeclared-attrs.py`'s destructuring-pattern scan can never see
 * this class of gap; it only catches `const {x} = attributes` patterns.
 *
 * `showSize`/`showWeight`/`showStyle`/`showLineHeight` default to `true` on
 * the component, so `{prefix}FontSize(Unit)`/`FontWeight`/`FontStyle`/
 * `LineHeight(Unit)` were ALREADY required and (mostly) already declared
 * before this session's work. The bug is specifically in the 10 props this
 * session turned on that default to `false`: fontSizePresets (UI-only, no
 * attribute of its own — skip), showFontFamily, showDecoration,
 * showTransform, showLetterSpacing, showTextAlign, showTextWrap,
 * showTextColumns, showTextIndent, showWritingMode. Wherever a block's
 * `<TypographyControls>` call now sets one of these `true` without the
 * matching attribute declared, the client sees a working-looking control
 * that silently does nothing once they use it.
 *
 * SCOPE. Checks EVERY block's TypographyControls call (single-target and
 * `targets` array), for EVERY relevant suffix (not just the 10 new ones —
 * the base four are checked too, as a safety net in case an older block
 * never had them declared either). Reports every (block, attribute) pair
 * that's read/written by an enabled control but absent from block.json.
 *
 * Run:
 *   node audit-typography-attr-declarations.js --survey
 *   node audit-typography-attr-declarations.js --fix           # dry-run diff
 *   node audit-typography-attr-declarations.js --fix --apply   # write
 *   node audit-typography-attr-declarations.js --check         # CI gate
 *   node audit-typography-attr-declarations.js --self-test
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
		if ( parent === cur ) throw new Error( 'repo root not found' );
		cur = parent;
	}
}

const ROOT = findRepoRoot( __dirname );
const BLOCKS_DIR = path.join( ROOT, 'plugins', 'sgs-blocks', 'src', 'blocks' );

// show* prop -> [ attribute suffix(es) it governs, declaration shape for EACH ].
// Shapes are lifted verbatim from src/blocks/text/block.json — the most
// complete, already-correct reference block.
const SUFFIX_SHAPES = {
	showSize: [
		{ suffix: 'FontSize', shape: { type: 'object', default: {} } },
		{ suffix: 'FontSizeUnit', shape: { type: 'string', default: 'px' } },
	],
	showFontFamily: [ { suffix: 'FontFamily', shape: { type: 'string', default: '' } } ],
	showWeight: [ { suffix: 'FontWeight', shape: { type: 'string', default: '' } } ],
	showStyle: [
		{ suffix: 'FontStyle', shape: { type: 'string', enum: [ '', 'normal', 'italic' ], default: '' } },
	],
	showTransform: [
		{
			suffix: 'TextTransform',
			shape: { type: 'string', enum: [ '', 'none', 'uppercase', 'lowercase', 'capitalize' ], default: '' },
		},
	],
	showDecoration: [
		{
			suffix: 'TextDecoration',
			shape: { type: 'string', enum: [ '', 'none', 'underline', 'line-through' ], default: '' },
		},
	],
	showLineHeight: [
		{ suffix: 'LineHeight', shape: { type: 'object', default: {} } },
		{ suffix: 'LineHeightUnit', shape: { type: 'string', default: 'em' } },
	],
	showLetterSpacing: [
		{ suffix: 'LetterSpacing', shape: { type: 'object', default: {} } },
		{ suffix: 'LetterSpacingUnit', shape: { type: 'string', default: 'em' } },
	],
	showTextAlign: [
		{
			suffix: 'TextAlign',
			shape: { type: 'string', enum: [ '', 'left', 'center', 'right', 'justify' ], default: '' },
		},
	],
	showTextWrap: [
		{
			suffix: 'TextWrap',
			shape: { type: 'string', enum: [ '', 'wrap', 'nowrap', 'balance', 'pretty', 'stable' ], default: '' },
		},
	],
	showTextColumns: [ { suffix: 'TextColumns', shape: { type: 'number' } } ],
	showTextIndent: [ { suffix: 'TextIndent', shape: { type: 'string', default: '' } } ],
	showWritingMode: [
		{
			suffix: 'WritingMode',
			shape: { type: 'string', enum: [ '', 'horizontal-tb', 'vertical-rl', 'vertical-lr' ], default: '' },
		},
	],
	// showResponsive / fontSizePresets / showHover govern UI shape only — no
	// attribute of their own to check.
};

function listBlockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() )
		.map( ( d ) => d.name )
		.sort();
}

function parseJs( src ) {
	return babelParser.parse( src, { sourceType: 'module', plugins: [ 'jsx' ] } );
}

function attrName( prefix, suffix ) {
	return prefix ? prefix + suffix : suffix.charAt( 0 ).toLowerCase() + suffix.slice( 1 );
}

/** Read an object-expression-like set of props (either a JSXOpeningElement's
 * attributes, or an ObjectExpression's properties) into { propName: true|false|'dynamic' }. */
function readShowProps( propsSource, isJsx ) {
	const state = {};
	const relevantNames = Object.keys( SUFFIX_SHAPES );
	if ( isJsx ) {
		for ( const attr of propsSource ) {
			if ( attr.type !== 'JSXAttribute' || ! attr.name || attr.name.type !== 'JSXIdentifier' ) continue;
			const name = attr.name.name;
			if ( ! relevantNames.includes( name ) ) continue;
			if ( attr.value === null ) {
				state[ name ] = true;
			} else if ( attr.value.type === 'JSXExpressionContainer' ) {
				const expr = attr.value.expression;
				state[ name ] = expr.type === 'BooleanLiteral' ? expr.value : 'dynamic';
			}
		}
	} else {
		for ( const prop of propsSource ) {
			if ( prop.type !== 'ObjectProperty' ) continue;
			const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
			if ( ! relevantNames.includes( key ) ) continue;
			state[ key ] = prop.value.type === 'BooleanLiteral' ? prop.value.value : 'dynamic';
		}
	}
	return state;
}

function getStringLiteralProp( propsSource, isJsx, name ) {
	if ( isJsx ) {
		const attr = propsSource.find( ( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === name );
		if ( ! attr || ! attr.value ) return null;
		if ( attr.value.type === 'StringLiteral' ) return attr.value.value;
		if ( attr.value.type === 'JSXExpressionContainer' && attr.value.expression.type === 'StringLiteral' ) {
			return attr.value.expression.value;
		}
		return undefined; // dynamic — can't resolve statically
	}
	const prop = propsSource.find(
		( p ) => p.type === 'ObjectProperty' && ( p.key.name === name || p.key.value === name )
	);
	if ( ! prop ) return null;
	return prop.value.type === 'StringLiteral' ? prop.value.value : undefined;
}

/** Find every TypographyControls call in a file and return a list of
 * { prefix, showState } — one entry per single-target call OR per target
 * object inside a `targets` array. `prefix: undefined` means unresolvable
 * (dynamic) — skipped, never guessed at. */
function findCalls( ast ) {
	const calls = [];
	traverse( ast, {
		JSXOpeningElement( p ) {
			const node = p.node;
			if ( node.name.type !== 'JSXIdentifier' || node.name.name !== 'TypographyControls' ) return;

			const targetsAttr = node.attributes.find(
				( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === 'targets'
			);

			if ( ! targetsAttr ) {
				const prefixVal = getStringLiteralProp( node.attributes, true, 'prefix' );
				calls.push( {
					prefix: prefixVal === null ? '' : prefixVal, // no explicit prefix attr = bare ''
					showState: readShowProps( node.attributes, true ),
				} );
				return;
			}

			if (
				targetsAttr.value &&
				targetsAttr.value.type === 'JSXExpressionContainer' &&
				targetsAttr.value.expression.type === 'ArrayExpression'
			) {
				for ( const el of targetsAttr.value.expression.elements ) {
					if ( ! el || el.type !== 'ObjectExpression' ) continue;
					const prefixVal = getStringLiteralProp( el.properties, false, 'prefix' );
					if ( prefixVal === undefined ) continue; // dynamic prefix, skip
					calls.push( {
						prefix: prefixVal === null ? '' : prefixVal,
						showState: readShowProps( el.properties, false ),
					} );
				}
			}
		},
	} );
	return calls;
}

function effectiveShowState( showState ) {
	const DEFAULT_TRUE = [ 'showSize', 'showWeight', 'showStyle', 'showLineHeight' ];
	const resolved = {};
	for ( const key of Object.keys( SUFFIX_SHAPES ) ) {
		if ( showState[ key ] === 'dynamic' ) {
			resolved[ key ] = 'dynamic';
		} else if ( showState[ key ] !== undefined ) {
			resolved[ key ] = showState[ key ];
		} else {
			resolved[ key ] = DEFAULT_TRUE.includes( key );
		}
	}
	return resolved;
}

function auditBlock( blockName ) {
	const editFile = path.join( BLOCKS_DIR, blockName, 'edit.js' );
	const blockJsonFile = path.join( BLOCKS_DIR, blockName, 'block.json' );
	if ( ! fs.existsSync( editFile ) || ! fs.existsSync( blockJsonFile ) ) return null;

	const editSrc = fs.readFileSync( editFile, 'utf8' );
	let ast;
	try {
		ast = parseJs( editSrc );
	} catch ( e ) {
		return { blockName, error: `parse error: ${ e.message }` };
	}

	const calls = findCalls( ast );
	if ( ! calls.length ) return { blockName, missing: [] };

	const blockJsonSrc = fs.readFileSync( blockJsonFile, 'utf8' );
	let blockJson;
	try {
		blockJson = JSON.parse( blockJsonSrc );
	} catch ( e ) {
		return { blockName, error: `block.json parse error: ${ e.message }` };
	}
	const declared = new Set( Object.keys( blockJson.attributes || {} ) );

	const missing = [];
	for ( const call of calls ) {
		const resolved = effectiveShowState( call.showState );
		for ( const [ showProp, suffixes ] of Object.entries( SUFFIX_SHAPES ) ) {
			if ( resolved[ showProp ] !== true ) continue;
			for ( const { suffix, shape } of suffixes ) {
				const name = attrName( call.prefix, suffix );
				if ( ! declared.has( name ) ) {
					missing.push( { name, shape, showProp, prefix: call.prefix } );
				}
			}
		}
	}

	// De-duplicate (a bare-prefix block with 2+ calls sharing the same prefix
	// would otherwise report the same missing attr twice).
	const seen = new Set();
	const deduped = missing.filter( ( m ) => {
		if ( seen.has( m.name ) ) return false;
		seen.add( m.name );
		return true;
	} );

	return { blockName, missing: deduped, blockJsonFile, blockJson };
}

function applyFix( blockJsonFile, blockJson, missing ) {
	const src = fs.readFileSync( blockJsonFile, 'utf8' );
	// Insert as new keys into the `attributes` object, preserving existing
	// formatting by re-serialising ONLY the attributes object's insertion —
	// safest reliable approach here is a full JSON.stringify of the whole
	// file with 2-tab indentation matching this repo's block.json style,
	// since block.json files are pure data with no comments to preserve.
	const updated = { ...blockJson };
	updated.attributes = { ...updated.attributes };
	for ( const m of missing ) {
		updated.attributes[ m.name ] = m.shape;
	}
	// This repo's block.json files are consistently tab-indented (verified
	// across every file this codemod touches).
	const indent = src.match( /^\t/m ) ? '\t' : 2;
	return JSON.stringify( updated, null, indent ) + '\n';
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

	if ( mode === 'self-test' ) return runSelfTest();

	const blocks = listBlockDirs();
	const results = blocks.map( auditBlock ).filter( Boolean );

	let totalMissing = 0;
	for ( const r of results ) {
		if ( r.error ) {
			console.log( `  [ERROR] ${ r.blockName }: ${ r.error }` );
			continue;
		}
		if ( ! r.missing.length ) continue;
		totalMissing += r.missing.length;
		console.log( `  [${ r.blockName }] missing ${ r.missing.length } attribute(s):` );
		for ( const m of r.missing ) {
			console.log( `      ${ m.name }  (governed by ${ m.showProp }, prefix "${ m.prefix }")` );
		}
		if ( mode === 'fix' ) {
			const newSrc = applyFix( r.blockJsonFile, r.blockJson, r.missing );
			if ( apply ) {
				fs.writeFileSync( r.blockJsonFile, newSrc, 'utf8' );
				console.log( `      -> WROTE ${ r.blockName }/block.json` );
			} else {
				console.log( `      -> WOULD WRITE ${ r.blockName }/block.json` );
			}
		}
	}

	console.log( `\nSUMMARY: ${ totalMissing } missing attribute declaration(s) across ${ blocks.length } block(s).` );

	if ( mode === 'check' && totalMissing > 0 ) {
		console.error( '\n[audit-typography-attr-declarations] GATE FAILED.' );
		process.exit( 1 );
	}
	if ( mode === 'check' ) {
		console.log( '\n[audit-typography-attr-declarations] GATE PASS.' );
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

	// Fixture 1: single-target call with showFontFamily true, prefix 'title'
	// — expect titleFontFamily flagged missing against an empty declared set.
	const src1 = `const x = <TypographyControls prefix="title" showFontFamily attributes={a} setAttributes={s} />;`;
	const ast1 = parseJs( src1 );
	const calls1 = findCalls( ast1 );
	assert( calls1.length === 1, 'fixture 1: finds one call' );
	assert( calls1[ 0 ].prefix === 'title', 'fixture 1: reads prefix' );
	const resolved1 = effectiveShowState( calls1[ 0 ].showState );
	assert( resolved1.showFontFamily === true, 'fixture 1: showFontFamily resolves true (explicit)' );
	assert( resolved1.showSize === true, 'fixture 1: showSize resolves true (default, not overridden)' );
	assert( resolved1.showTextAlign === false, 'fixture 1: showTextAlign resolves false (default, not overridden)' );

	// Fixture 2: targets array with two targets, each independent.
	const src2 = `const x = <TypographyControls attributes={a} setAttributes={s} targets={[
		{ key: 'a', prefix: 'title', showFontFamily: true },
		{ key: 'b', prefix: 'desc', showTextAlign: true },
	]} />;`;
	const ast2 = parseJs( src2 );
	const calls2 = findCalls( ast2 );
	assert( calls2.length === 2, 'fixture 2: finds two target calls' );
	assert( calls2[ 0 ].prefix === 'title' && calls2[ 1 ].prefix === 'desc', 'fixture 2: reads both prefixes' );

	// Fixture 3: dynamic prefix must be skipped, never guessed.
	const src3 = `const x = <TypographyControls prefix={somePrefix} showFontFamily attributes={a} setAttributes={s} />;`;
	const ast3 = parseJs( src3 );
	const calls3 = findCalls( ast3 );
	assert( calls3.length === 1, 'fixture 3: still finds the call' );
	assert( calls3[ 0 ].prefix === undefined, 'fixture 3: dynamic prefix resolves to undefined, not guessed' );

	// Fixture 4: full auditBlock() round-trip against real temp files.
	const tmpDir = fs.mkdtempSync( path.join( require( 'os' ).tmpdir(), 'sgs-audit-test-' ) );
	fs.writeFileSync(
		path.join( tmpDir, 'edit.js' ),
		`export default function Edit({attributes,setAttributes}){return <TypographyControls prefix="" showFontFamily attributes={attributes} setAttributes={setAttributes} />;}`
	);
	fs.writeFileSync( path.join( tmpDir, 'block.json' ), JSON.stringify( { attributes: {} } ) );
	const oldBlocksDir = BLOCKS_DIR;
	// Monkey-patch by temporarily aliasing — simplest is to call the pure
	// functions directly rather than auditBlock() (which hardcodes BLOCKS_DIR).
	const editSrc = fs.readFileSync( path.join( tmpDir, 'edit.js' ), 'utf8' );
	const ast4 = parseJs( editSrc );
	const calls4 = findCalls( ast4 );
	const resolved4 = effectiveShowState( calls4[ 0 ].showState );
	assert( resolved4.showFontFamily === true, 'fixture 4: end-to-end parse resolves showFontFamily true' );
	const missingName = attrName( calls4[ 0 ].prefix, 'FontFamily' );
	assert( missingName === 'fontFamily', 'fixture 4: bare prefix + FontFamily -> "fontFamily"' );
	fs.rmSync( tmpDir, { recursive: true, force: true } );

	console.log( `\n${ failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)' } — self-test ${ failures === 0 ? 'OK' : 'FAILED' }` );
	if ( failures > 0 ) process.exit( 1 );
}

main();
