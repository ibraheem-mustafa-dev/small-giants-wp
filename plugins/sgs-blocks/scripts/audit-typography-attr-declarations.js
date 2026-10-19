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
 * showTextStroke, showTextColumns, showTextIndent, showWritingMode. Wherever a block's
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
		if ( fs.existsSync( path.join( cur, '.git' ) ) ) return cur;
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
	showTextStroke: [
		{ suffix: 'TextStrokeWidth', shape: { type: 'object', default: {} } },
		{ suffix: 'TextStrokeColour', shape: { type: 'string', default: '' } },
		{ suffix: 'TextStrokeColourHover', shape: { type: 'string', default: '' } },
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

// Known missing declarations, keyed by block, each { reason, attrs }: reported but not failing
// --check. Empty: every typography attribute a control writes is declared. An entry whose
// attribute becomes declared fails --check until it is removed.
const BASELINE = {};

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
	const seenDescriptors = new Set();
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
					seenDescriptors.add( el );
					const prefixVal = getStringLiteralProp( el.properties, false, 'prefix' );
					if ( prefixVal === undefined ) continue; // dynamic prefix, skip
					calls.push( {
						prefix: prefixVal === null ? '' : prefixVal,
						showState: readShowProps( el.properties, false ),
					} );
				}
			}
		},
		// A target descriptor wherever it sits: a `targets` list wrapped in .filter() or a
		// conditional, or one built in another file of the block.
		ObjectExpression( p ) {
			if ( seenDescriptors.has( p.node ) ) return;
			const props = p.node.properties;
			const hasPrefix = props.some(
				( pr ) => pr.type === 'ObjectProperty' && ( pr.key.name === 'prefix' || pr.key.value === 'prefix' )
			);
			if ( ! hasPrefix ) return;
			const showState = readShowProps( props, false );
			if ( ! Object.keys( showState ).length ) return;
			const prefixVal = getStringLiteralProp( props, false, 'prefix' );
			if ( prefixVal === undefined || prefixVal === null ) return; // dynamic prefix, skip
			calls.push( { prefix: prefixVal, showState } );
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

/** Does this file offer the outline (showTextStroke set to anything but false) anywhere? */
function offersTextStroke( ast ) {
	let found = false;
	traverse( ast, {
		JSXAttribute( p ) {
			if ( p.node.name && p.node.name.name === 'showTextStroke' && jsxIsOff( p.node ) === false ) found = true;
		},
		ObjectProperty( p ) {
			const key = p.node.key.name || p.node.key.value;
			if ( key === 'showTextStroke' && ! ( p.node.value.type === 'BooleanLiteral' && p.node.value.value === false ) ) found = true;
		},
	} );
	return found;
}

function jsxIsOff( attr ) {
	return attr.value && attr.value.type === 'JSXExpressionContainer' && attr.value.expression.type === 'BooleanLiteral' && attr.value.expression.value === false;
}

/** Every .js file under one block's directory, edit.js and its helper panels alike. */
function blockJsFiles( dir ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...blockJsFiles( full ) );
		} else if ( /\.js$/.test( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
}

function auditBlock( blockName ) {
	const editFile = path.join( BLOCKS_DIR, blockName, 'edit.js' );
	const blockJsonFile = path.join( BLOCKS_DIR, blockName, 'block.json' );
	if ( ! fs.existsSync( editFile ) || ! fs.existsSync( blockJsonFile ) ) return null;

	const calls = [];
	let offersStroke = false;
	for ( const file of blockJsFiles( path.join( BLOCKS_DIR, blockName ) ) ) {
		const src = fs.readFileSync( file, 'utf8' );
		if ( ! src.includes( 'prefix' ) && ! src.includes( 'TypographyControls' ) && ! src.includes( 'showTextStroke' ) ) continue;
		try {
			const ast = parseJs( src );
			calls.push( ...findCalls( ast ) );
			offersStroke = offersStroke || offersTextStroke( ast );
		} catch ( e ) {
			return { blockName, error: `parse error in ${ path.basename( file ) }: ${ e.message }` };
		}
	}
	if ( ! calls.length && ! offersStroke ) return { blockName, missing: [] };

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

	// A block that offers the outline anywhere also needs it for every element whose text-wrap
	// it declares: the two ride the same typography rule, and a helper that builds targets from
	// a prefix argument (google-reviews' typoTarget) or a shared base object (google-rating-badge)
	// carries no literal prefix this scan could read.
	if ( offersStroke ) {
		for ( const name of declared ) {
			const m = /^(.*)TextWrap$/.exec( name ) || ( 'textWrap' === name ? [ name, '' ] : null );
			if ( ! m ) continue;
			for ( const { suffix, shape } of SUFFIX_SHAPES.showTextStroke ) {
				const attr = attrName( m[ 1 ], suffix );
				if ( ! declared.has( attr ) ) {
					missing.push( { name: attr, shape, showProp: 'showTextStroke (follows ' + name + ')', prefix: m[ 1 ] } );
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

	const baselined = BASELINE[ blockName ] ? BASELINE[ blockName ].attrs : [];
	const stale = baselined.filter( ( n ) => declared.has( n ) );
	return {
		blockName,
		missing: deduped.filter( ( m ) => ! baselined.includes( m.name ) ),
		baselined: deduped.filter( ( m ) => baselined.includes( m.name ) ),
		stale,
		blockJsonFile,
		blockJson,
	};
}

/**
 * Add the missing attributes to a block.json as text, leaving every other byte as it was. Each
 * new entry goes straight after the block's matching `{prefix}TextWrap` entry when it has one,
 * otherwise after the last attribute.
 */
function applyFix( blockJsonFile, blockJson, missing ) {
	const src = fs.readFileSync( blockJsonFile, 'utf8' );
	const root = babelParser.parseExpression( src );
	const attrsProp = root.properties.find( ( pr ) => ( pr.key.value || pr.key.name ) === 'attributes' );
	const entries = attrsProp.value.properties;
	const eol = src.includes( '\r\n' ) ? '\r\n' : '\n';
	const unit = src.match( /^\t/m ) ? '\t' : '  ';
	const indentOf = ( node ) => src.slice( src.lastIndexOf( '\n', node.start - 1 ) + 1, node.start );

	const inserts = [];
	for ( const m of missing ) {
		const anchorName = attrName( m.prefix, 'TextWrap' );
		const anchor = entries.find( ( e ) => ( e.key.value || e.key.name ) === anchorName ) || entries[ entries.length - 1 ];
		const indent = indentOf( anchor );
		const body = JSON.stringify( m.shape, null, unit ).split( '\n' ).join( eol + indent );
		inserts.push( { at: anchor.end, text: ',' + eol + indent + JSON.stringify( m.name ) + ': ' + body } );
	}
	// Later offsets first, so earlier ones stay valid; entries sharing an anchor keep their order.
	let out = src;
	const order = inserts.map( ( ins, i ) => ( { ...ins, i } ) ).sort( ( x, y ) => y.at - x.at || y.i - x.i );
	for ( const ins of order ) {
		out = out.slice( 0, ins.at ) + ins.text + out.slice( ins.at );
	}
	return out;
}

// The element manifest (supports.sgs.elements.<el>.attrMap) claims each attribute an element
// owns. An element that claims `{stem}TextWrap` as css:text-wrap also claims the outline the
// same typography rule paints, or check-element-manifest-conformance reports it as an orphan.
// The Hover colour needs no entry of its own: it is claimed through the colour it follows.
const MANIFEST_CLAIMS = [
	[ 'css:-webkit-text-stroke-width', 'TextStrokeWidth' ],
	[ 'css:-webkit-text-stroke-color', 'TextStrokeColour' ],
];

/**
 * The text insertions that add the missing outline claims to a block.json, as text so every
 * other byte stays as it was. A claim is only added once its attribute is declared.
 *
 * @param {string} src block.json text.
 * @return {{at: number, text: string, claim: string}[]} Insertions.
 */
function manifestClaimInserts( src ) {
	const root = babelParser.parseExpression( src );
	const keyOf = ( pr ) => pr.key.value || pr.key.name;
	const find = ( obj, key ) => obj && obj.properties && obj.properties.find( ( pr ) => key === keyOf( pr ) );
	const attrs = find( root, 'attributes' );
	const declared = new Set( attrs ? attrs.value.properties.map( keyOf ) : [] );
	const sgs = find( find( root, 'supports' )?.value, 'sgs' )?.value;
	const els = find( sgs, 'elements' )?.value;
	if ( ! els ) return [];
	const eol = src.includes( '\r\n' ) ? '\r\n' : '\n';
	const out = [];
	for ( const el of els.properties ) {
		const attrMap = find( el.value, 'attrMap' )?.value;
		const wrap = find( attrMap, 'css:text-wrap' );
		if ( ! wrap || 'StringLiteral' !== wrap.value.type ) continue;
		const stem = 'textWrap' === wrap.value.value ? '' : wrap.value.value.replace( /TextWrap$/, '' );
		const indent = src.slice( src.lastIndexOf( '\n', wrap.start - 1 ) + 1, wrap.start );
		for ( const [ cssKey, suffix ] of MANIFEST_CLAIMS ) {
			const attr = attrName( stem, suffix );
			if ( find( attrMap, cssKey ) || ! declared.has( attr ) ) continue;
			out.push( {
				at: wrap.end,
				text: ',' + eol + indent + JSON.stringify( cssKey ) + ': ' + JSON.stringify( attr ),
				claim: keyOf( el ) + ' ' + cssKey,
			} );
		}
	}
	return out;
}

function applyManifestClaims( src ) {
	const inserts = manifestClaimInserts( src ).map( ( ins, i ) => ( { ...ins, i } ) );
	let out = src;
	for ( const ins of inserts.sort( ( x, y ) => y.at - x.at || y.i - x.i ) ) {
		out = out.slice( 0, ins.at ) + ins.text + out.slice( ins.at );
	}
	return out;
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
			totalMissing++;
			continue;
		}
		if ( r.baselined && r.baselined.length ) {
			console.log( `  [${ r.blockName }] baselined (not fixed, not failing): ${ r.baselined.map( ( m ) => m.name ).join( ', ' ) }` );
		}
		if ( r.stale && r.stale.length ) {
			totalMissing += r.stale.length;
			console.log( `  [${ r.blockName }] STALE baseline entry (now declared, remove it from BASELINE): ${ r.stale.join( ', ' ) }` );
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

	// Second pass: the element-manifest claims for the attributes now declared.
	for ( const blockName of blocks ) {
		const file = path.join( BLOCKS_DIR, blockName, 'block.json' );
		if ( ! fs.existsSync( file ) ) continue;
		const src = fs.readFileSync( file, 'utf8' );
		const inserts = manifestClaimInserts( src );
		if ( ! inserts.length ) continue;
		totalMissing += inserts.length;
		console.log( `  [${ blockName }] missing ${ inserts.length } element-manifest claim(s): ${ inserts.map( ( i ) => i.claim ).join( '; ' ) }` );
		if ( 'fix' === mode && apply ) {
			fs.writeFileSync( file, applyManifestClaims( src ), 'utf8' );
			console.log( `      -> WROTE ${ blockName }/block.json` );
		}
	}

	console.log( `\nSUMMARY: ${ totalMissing } missing declaration(s) and claim(s) across ${ blocks.length } block(s).` );

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

	// Fixture 5: applyFix adds entries as text and moves nothing else; show props that
	// reach an object built outside a literal `targets` array are still read.
	const fixDir = fs.mkdtempSync( path.join( require( 'os' ).tmpdir(), 'sgs-audit-fix-' ) );
	const bjFile = path.join( fixDir, 'block.json' );
	const original = '{\n\t"name": "sgs/x",\n\t"attributes": {\n\t\t"titleTextWrap": { "type": "string" },\n\t\t"other": {\n\t\t\t"type": "string",\n\t\t\t"default": "a"\n\t\t}\n\t}\n}\n';
	fs.writeFileSync( bjFile, original );
	const shapes = SUFFIX_SHAPES.showTextStroke.map( ( s ) => ( { name: 'title' + s.suffix, shape: s.shape, showProp: 'showTextStroke', prefix: 'title' } ) );
	const fixed = applyFix( bjFile, JSON.parse( original ), shapes );
	const fixedJson = JSON.parse( fixed );
	assert( 'titleTextStrokeWidth' in fixedJson.attributes && 'titleTextStrokeColourHover' in fixedJson.attributes, 'fixture 5: the three outline attributes are added' );
	assert( Object.keys( fixedJson.attributes ).join() === 'titleTextWrap,titleTextStrokeWidth,titleTextStrokeColour,titleTextStrokeColourHover,other', 'fixture 5: entries sit straight after the matching TextWrap, in order' );
	assert( fixed.includes( '"other": {\n\t\t\t"type": "string",\n\t\t\t"default": "a"\n\t\t}' ), 'fixture 5: untouched entries keep their exact formatting' );
	assert( applyFix( bjFile, JSON.parse( original ), [] ) === original, 'fixture 5: nothing missing means byte-identical' );
	fs.rmSync( fixDir, { recursive: true, force: true } );

	const wrapped = parseJs( 'const x = <TypographyControls attributes={a} setAttributes={s} targets={ [ { prefix: "a", showTextStroke: true } ].filter( Boolean ) } />;' );
	assert( findCalls( wrapped ).some( ( c ) => 'a' === c.prefix && true === c.showState.showTextStroke ), 'fixture 5: a targets list wrapped in .filter() is read' );

	console.log( `\n${ failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)' } — self-test ${ failures === 0 ? 'OK' : 'FAILED' }` );
	if ( failures > 0 ) process.exit( 1 );
}

main();
