'use strict';

/**
 * survey-typography-opt-in-props.js — keeps the Typography panel's opt-in props
 * in step: every place that passes `showTextWrap` to `<TypographyControls>` also
 * states `showTextStroke` (hollow outlined lettering, Spec 32 FR-32-23).
 *
 * A block hands the panel its options in two forms, and both are matched:
 *   - JSX props:    <TypographyControls prefix="title" showTextWrap />
 *   - option lists: { key: 'title', prefix: 'title', showTextWrap: true } inside a
 *                   `targets` array, or inside a helper that builds one
 *                   (google-reviews' typoTarget).
 *
 * A site that passes `showTextWrap` as true is a TARGET: it needs `showTextStroke`
 * (JSX: the bare prop; option list: `showTextStroke: true`). A site that passes it
 * as `false` mirrors the opt-out with `showTextStroke: false`, so a helper's
 * default does not switch the outline on for an element that opted out of wrap.
 * A site whose value is computed is reported as UNRECOGNISED and never edited.
 *
 * The block.json attributes the new prop needs are written by
 * audit-typography-attr-declarations.js (SUFFIX_SHAPES.showTextStroke).
 *
 * Run:
 *   node scripts/survey-typography-opt-in-props.js --survey [--json]
 *   node scripts/survey-typography-opt-in-props.js --fix            # dry run, prints a diff
 *   node scripts/survey-typography-opt-in-props.js --fix --apply    # write
 *   node scripts/survey-typography-opt-in-props.js --check          # gate
 *   node scripts/survey-typography-opt-in-props.js --self-test
 */

const fs = require( 'fs' );
const path = require( 'path' );
const babelParser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

function findRepoRoot( start ) {
	let cur = path.resolve( start );
	for ( ;; ) {
		if ( fs.existsSync( path.join( cur, '.git' ) ) ) {
			return cur;
		}
		const parent = path.dirname( cur );
		if ( parent === cur ) {
			throw new Error( 'repo root not found' );
		}
		cur = parent;
	}
}

const ROOT = findRepoRoot( __dirname );
const SRC_DIR = path.join( ROOT, 'plugins', 'sgs-blocks', 'src' );

const OLD_PROP = 'showTextWrap';
const NEW_PROP = 'showTextStroke';

// The panel itself reads both props (destructuring, JSDoc, the `showTextWrap &&`
// render guard); those mentions are the definition, not call sites.
const EXCLUDE = [ path.join( 'components', 'TypographyControls.js' ) ];

function walk( dir, out = [] ) {
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		if ( 'node_modules' === entry.name ) {
			continue;
		}
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			walk( full, out );
		} else if ( /\.js$/.test( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
}

function parse( src ) {
	return babelParser.parse( src, { sourceType: 'module', plugins: [ 'jsx' ], errorRecovery: false } );
}

const keyName = ( prop ) => {
	if ( 'ObjectProperty' !== prop.type || prop.computed ) {
		return null;
	}
	return 'Identifier' === prop.key.type ? prop.key.name : prop.key.value;
};

// true | false | 'dynamic' for a JSX attribute value.
function jsxValue( attr ) {
	if ( null === attr.value ) {
		return true;
	}
	if ( 'JSXExpressionContainer' === attr.value.type && 'BooleanLiteral' === attr.value.expression.type ) {
		return attr.value.expression.value;
	}
	return 'dynamic';
}

function objectValue( prop ) {
	return 'BooleanLiteral' === prop.value.type ? prop.value.value : 'dynamic';
}

/**
 * Classify every showTextWrap mention in one source text.
 *
 * @param {string} src Source text.
 * @return {{sites: Object[], bare: number}} One entry per site, plus mentions that are neither form.
 */
function classify( src ) {
	const ast = parse( src );
	const sites = [];
	const claimed = new Set();

	traverse( ast, {
		JSXOpeningElement( p ) {
			const node = p.node;
			if ( 'JSXIdentifier' !== node.name.type || 'TypographyControls' !== node.name.name ) {
				return;
			}
			const attrs = node.attributes.filter( ( a ) => 'JSXAttribute' === a.type && a.name && 'JSXIdentifier' === a.name.type );
			const old = attrs.find( ( a ) => OLD_PROP === a.name.name );
			if ( ! old ) {
				return;
			}
			claimed.add( old.name );
			const prefixAttr = attrs.find( ( a ) => 'prefix' === a.name.name );
			sites.push( {
				kind: 'jsx',
				node: old,
				end: old.end,
				start: old.start,
				value: jsxValue( old ),
				has: attrs.some( ( a ) => NEW_PROP === a.name.name ),
				prefix: prefixAttr && prefixAttr.value && 'StringLiteral' === prefixAttr.value.type ? prefixAttr.value.value : null,
			} );
		},
		ObjectExpression( p ) {
			const old = p.node.properties.find( ( pr ) => OLD_PROP === keyName( pr ) );
			if ( ! old ) {
				return;
			}
			claimed.add( old.key );
			const prefixProp = p.node.properties.find( ( pr ) => 'prefix' === keyName( pr ) );
			sites.push( {
				kind: 'object',
				node: old,
				start: old.start,
				end: old.end,
				value: objectValue( old ),
				has: p.node.properties.some( ( pr ) => NEW_PROP === keyName( pr ) ),
				prefix: prefixProp && 'StringLiteral' === prefixProp.value.type ? prefixProp.value.value : null,
			} );
		},
	} );

	// A dumb second enumeration: every identifier or string naming the prop, wherever it sits.
	let mentions = 0;
	traverse( ast, {
		Identifier( p ) {
			if ( OLD_PROP === p.node.name ) {
				mentions++;
			}
		},
		JSXIdentifier( p ) {
			if ( OLD_PROP === p.node.name ) {
				mentions++;
			}
		},
		StringLiteral( p ) {
			if ( OLD_PROP === p.node.value ) {
				mentions++;
			}
		},
	} );

	return { sites, bare: mentions - claimed.size };
}

/**
 * The text edit that adds the new prop beside a site, or null when nothing is needed.
 *
 * @param {string} src  Source text.
 * @param {Object} site One classified site.
 * @return {{at: number, text: string}|null} Insertion point and text.
 */
function insertionFor( src, site ) {
	if ( site.has || 'dynamic' === site.value ) {
		return null;
	}
	const eol = src.includes( '\r\n' ) ? '\r\n' : '\n';
	const lineStart = src.lastIndexOf( '\n', site.start - 1 ) + 1;
	const before = src.slice( lineStart, site.start );
	const ownLine = /^[ \t]*$/.test( before );
	const indent = before.match( /^[ \t]*/ )[ 0 ];

	if ( 'jsx' === site.kind ) {
		return ownLine ? { at: site.end, text: eol + indent + NEW_PROP } : { at: site.end, text: ' ' + NEW_PROP };
	}

	const value = site.value ? 'true' : 'false';
	const after = src.slice( site.end ).match( /^[ \t]*(,)?/ );
	const hasComma = !! after[ 1 ];
	const at = site.end + after[ 0 ].length;
	if ( ownLine ) {
		return hasComma
			? { at, text: eol + indent + NEW_PROP + ': ' + value + ',' }
			: { at: site.end, text: ',' + eol + indent + NEW_PROP + ': ' + value };
	}
	return { at: site.end, text: ', ' + NEW_PROP + ': ' + value };
}

/**
 * Apply every needed insertion to one source text.
 *
 * @param {string} src Source text.
 * @return {{out: string, added: number}} The new text and the number of sites changed.
 */
function transform( src ) {
	const { sites } = classify( src );
	const edits = sites.map( ( s ) => insertionFor( src, s ) ).filter( Boolean ).sort( ( a, b ) => b.at - a.at );
	let out = src;
	for ( const e of edits ) {
		out = out.slice( 0, e.at ) + e.text + out.slice( e.at );
	}
	return { out, added: edits.length };
}

function listFiles() {
	return walk( SRC_DIR ).filter( ( f ) => ! EXCLUDE.some( ( x ) => f.endsWith( x ) ) );
}

const rel = ( f ) => path.relative( ROOT, f ).split( path.sep ).join( '/' );
const blockOf = ( f ) => {
	const m = rel( f ).match( /^plugins\/sgs-blocks\/src\/blocks\/([^/]+)\//u );
	return m ? m[ 1 ] : '(shared)';
};

function census() {
	const rows = [];
	let unrecognised = 0;
	for ( const f of listFiles() ) {
		const src = fs.readFileSync( f, 'utf8' );
		if ( ! src.includes( OLD_PROP ) ) {
			continue;
		}
		const { sites, bare } = classify( src );
		if ( bare > 0 ) {
			unrecognised += bare;
			rows.push( { file: rel( f ), block: blockOf( f ), kind: 'bare-mention', count: bare } );
		}
		for ( const s of sites ) {
			if ( 'dynamic' === s.value ) {
				unrecognised++;
			}
			rows.push( {
				file: rel( f ),
				block: blockOf( f ),
				kind: s.kind,
				prefix: s.prefix,
				value: s.value,
				done: s.has,
			} );
		}
	}
	const sites = rows.filter( ( r ) => 'bare-mention' !== r.kind );
	return {
		rows,
		targets: sites.filter( ( r ) => true === r.value ).length,
		optOuts: sites.filter( ( r ) => false === r.value ).length,
		unrecognised,
		todo: sites.filter( ( r ) => ! r.done && 'dynamic' !== r.value ).length,
		files: new Set( sites.map( ( r ) => r.file ) ).size,
		blocks: new Set( sites.map( ( r ) => r.block ) ).size,
	};
}

function unifiedDiff( file, before, after ) {
	const a = before.split( '\n' );
	const b = after.split( '\n' );
	const lines = [];
	let j = 0;
	for ( let i = 0; i < b.length; i++ ) {
		if ( a[ j ] === b[ i ] ) {
			j++;
			continue;
		}
		lines.push( `+ ${ b[ i ] }` );
	}
	return `--- ${ rel( file ) }\n${ lines.join( '\n' ) }`;
}

function main() {
	const args = process.argv.slice( 2 );
	if ( args.includes( '--self-test' ) ) {
		return selfTest();
	}
	const missingExclude = EXCLUDE.filter( ( x ) => ! fs.existsSync( path.join( SRC_DIR, x ) ) );
	if ( missingExclude.length ) {
		console.error( `EXCLUDE path no longer exists: ${ missingExclude.join( ', ' ) }` );
		process.exit( 1 );
	}

	if ( args.includes( '--fix' ) ) {
		const apply = args.includes( '--apply' );
		let changedFiles = 0;
		let changedSites = 0;
		for ( const f of listFiles() ) {
			const src = fs.readFileSync( f, 'utf8' );
			if ( ! src.includes( OLD_PROP ) ) {
				continue;
			}
			const { out, added } = transform( src );
			if ( ! added ) {
				continue;
			}
			changedFiles++;
			changedSites += added;
			if ( apply ) {
				fs.writeFileSync( f + '.tmp', out, 'utf8' );
				fs.renameSync( f + '.tmp', f );
			} else {
				console.log( unifiedDiff( f, src, out ) );
			}
		}
		console.log( `${ apply ? 'WROTE' : 'WOULD WRITE' }: ${ changedSites } site(s) in ${ changedFiles } file(s).` );
		return;
	}

	const c = census();
	if ( args.includes( '--survey' ) ) {
		if ( args.includes( '--json' ) ) {
			console.log( JSON.stringify( c, null, 2 ) );
			return;
		}
		const byFile = new Map();
		for ( const r of c.rows ) {
			byFile.set( r.file, ( byFile.get( r.file ) || [] ).concat( r ) );
		}
		for ( const [ file, rows ] of [ ...byFile ].sort() ) {
			const t = rows.filter( ( r ) => true === r.value ).length;
			const o = rows.filter( ( r ) => false === r.value ).length;
			const d = rows.filter( ( r ) => ! r.done && 'dynamic' !== r.value && 'bare-mention' !== r.kind ).length;
			const bad = rows.filter( ( r ) => 'dynamic' === r.value || 'bare-mention' === r.kind ).length;
			console.log( `  ${ file }  targets=${ t } opt-outs=${ o } missing=${ d }${ bad ? ` UNRECOGNISED=${ bad }` : '' }` );
		}
		console.log( `\nSUMMARY: ${ c.targets } target(s) + ${ c.optOuts } opt-out(s) in ${ c.files } file(s) across ${ c.blocks } block(s); ${ c.todo } still lack ${ NEW_PROP }; unrecognised=${ c.unrecognised }.` );
		return;
	}

	// --check
	for ( const r of c.rows.filter( ( x ) => ! x.done && 'dynamic' !== x.value && 'bare-mention' !== x.kind ) ) {
		console.error( `  ${ r.file }: ${ r.kind } site (prefix ${ JSON.stringify( r.prefix ) }) passes ${ OLD_PROP } but not ${ NEW_PROP }` );
	}
	if ( c.todo > 0 ) {
		console.error( `\n[survey-typography-opt-in-props] GATE FAILED: ${ c.todo } site(s). Run --fix --apply.` );
		process.exit( 1 );
	}
	if ( c.unrecognised > 0 ) {
		console.error( `\n[survey-typography-opt-in-props] GATE FAILED: ${ c.unrecognised } site(s) the survey cannot read (a dynamic value or a bare mention); make each a literal so it can be judged.` );
		process.exit( 1 );
	}
	console.log( `[survey-typography-opt-in-props] GATE PASS (${ c.targets + c.optOuts } site(s), unrecognised=${ c.unrecognised }).` );
}

function selfTest() {
	let failures = 0;
	const assert = ( cond, msg ) => {
		if ( ! cond ) {
			failures++;
			console.error( `  FAIL: ${ msg }` );
		} else {
			console.log( `  ok: ${ msg }` );
		}
	};

	const jsxBare = 'const a = <TypographyControls prefix="a" showTextAlign showTextWrap showTextColumns />;';
	const jsxBraced = 'const a = <TypographyControls prefix="a" showTextWrap={ true } />;';
	const jsxMulti = 'const a = (\n\t<TypographyControls\n\t\tprefix="a"\n\t\tshowTextWrap\n\t\tshowWritingMode\n\t/>\n);';
	const objInline = 'const t = [ { key: "a", prefix: "a", showTextWrap: true } ];';
	const objMulti = 'const t = [ {\n\t\tprefix: "a",\n\t\tshowTextWrap: true,\n\t\tshowTextColumns: true,\n\t} ];';
	const objLast = 'const t = [ {\n\t\tprefix: "a",\n\t\tshowTextWrap: true\n\t} ];';
	const optOut = 'const t = { prefix: "a", showTextWrap: false };';
	const dynamic = 'const t = { prefix: "a", showTextWrap: flag };';
	const done = 'const t = { prefix: "a", showTextWrap: true, showTextStroke: true };';
	const crlf = 'const t = {\r\n\tprefix: "a",\r\n\tshowTextWrap: true,\r\n};';

	// Positive: each form gains the prop, the output parses, and the target is then satisfied.
	for ( const [ name, src ] of Object.entries( { jsxBare, jsxBraced, jsxMulti, objInline, objMulti, objLast, crlf } ) ) {
		const { out, added } = transform( src );
		let parses = true;
		try {
			parse( out );
		} catch ( e ) {
			parses = false;
		}
		const after = classify( out ).sites;
		assert( 1 === added && parses && after.every( ( s ) => s.has ), `${ name }: gains ${ NEW_PROP } and still parses` );
	}

	// Definition: the added text is exactly the new prop, nothing else moved.
	assert( transform( jsxBare ).out === 'const a = <TypographyControls prefix="a" showTextAlign showTextWrap showTextStroke showTextColumns />;', 'jsx shorthand: inserted right after showTextWrap' );
	assert( transform( objMulti ).out.includes( 'showTextWrap: true,\n\t\tshowTextStroke: true,\n\t\tshowTextColumns' ), 'object list: new line copies the indentation' );
	assert( transform( crlf ).out.includes( 'showTextStroke: true,\r\n' ), 'CRLF file keeps its line endings' );
	assert( transform( optOut ).out.includes( 'showTextStroke: false' ), 'an opt-out mirrors as showTextStroke: false' );

	// Negative controls: untouched byte for byte.
	assert( transform( done ).out === done && 0 === transform( done ).added, 'already stated: byte-identical' );
	assert( transform( dynamic ).out === dynamic, 'a computed value is left alone' );
	assert( 'dynamic' === classify( dynamic ).sites[ 0 ].value, 'a computed value is classified dynamic' );
	assert( 0 === classify( 'const a = <Other showTextWrap />;' ).sites.length, 'another component is not a target' );

	// Idempotence.
	for ( const src of [ jsxBare, jsxMulti, objMulti, objLast ] ) {
		const once = transform( src ).out;
		assert( transform( once ).out === once, 'second run changes nothing' );
	}

	// Corpus control: a mention that is neither form is surfaced, never silently skipped.
	assert( classify( 'const { showTextWrap } = props;' ).bare > 0, 'a destructured mention is reported as bare' );
	assert( 0 === classify( jsxBare ).bare && 0 === classify( objInline ).bare, 'a classified site is not also a bare mention' );
	assert( EXCLUDE.every( ( x ) => fs.existsSync( path.join( SRC_DIR, x ) ) ), 'every EXCLUDE path still exists' );

	console.log( `\n${ 0 === failures ? 'ALL PASS' : failures + ' FAILURE(S)' } — self-test ${ 0 === failures ? 'OK' : 'FAILED' }` );
	if ( failures > 0 ) {
		process.exit( 1 );
	}
}

main();
