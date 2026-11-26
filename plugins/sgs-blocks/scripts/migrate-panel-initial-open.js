/**
 * migrate-panel-initial-open.js
 *
 * The codemod behind `check-panel-initial-open.js` (Spec 49 section 9.1: only the first panel of each inspector tab
 * opens). It rewrites every `PanelBody` so its `initialOpen` is explicit:
 *   - a block's own panel that `scripts/data/first-panels.json` names as that block's first panel in a tab: `initialOpen`;
 *   - every other `PanelBody`: `initialOpen={ false }`;
 *   - an `initialOpen={ expression }` (a prop passed through) is left alone;
 *   - `SgsInnerSection` is closed by design and is not touched.
 * It does not plumb a shared panel's prop, and does not change `SgsColourPanel` mounts or the media panel model: those
 * are edited by hand, because each needs a decision the data cannot make.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/migrate-panel-initial-open.js --fix            # dry run: files and tags it would change
 *   node scripts/migrate-panel-initial-open.js --fix --apply    # write
 *   node scripts/migrate-panel-initial-open.js --self-test
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const scan = require( './lib/jsx-scan.js' );

const DATA_FILE = path.join( __dirname, 'data', 'first-panels.json' );

/** Title text of a PanelBody: a string, `__( 'T' )`, or null. */
function titleText( el ) {
	const p = scan.prop( el, 'title' );
	if ( 'string' === p.kind ) {
		return p.value;
	}
	const e = p.node && p.node.value && p.node.value.expression;
	if ( e && 'CallExpression' === e.type && e.arguments[ 0 ] && 'StringLiteral' === e.arguments[ 0 ].type ) {
		return e.arguments[ 0 ].value;
	}
	return null;
}

/** Titles `data` names as `block`'s first panel in a tab (block-owned panels only). */
function firstTitles( data, block ) {
	const out = new Set();
	for ( const f of Object.values( ( data.blocks && data.blocks[ block ] ) || {} ) ) {
		if ( 'block' === f.source ) {
			out.add( f.title );
		}
	}
	return out;
}

/**
 * The edits for one source text.
 *
 * @param {string} text  Source.
 * @param {string} block Block slug the file belongs to ('' for shared code).
 * @param {Object} data  first-panels data.
 * @return {Array<{start:number,end:number,text:string,open:boolean}>} Edits.
 */
function planText( text, block, data ) {
	const edits = [];
	const firsts = block ? firstTitles( data, block ) : new Set();
	scan.walkJsx( scan.parse( text ), ( node ) => {
		if ( 'PanelBody' !== scan.jsxName( node ) ) {
			return;
		}
		const io = scan.prop( node, 'initialOpen' );
		if ( 'expr' === io.kind ) {
			return;
		}
		const title = titleText( node );
		const open = Boolean( block && title && firsts.has( title ) );
		if ( open ? 'true' === io.kind : 'false' === io.kind ) {
			return;
		}
		const attr = open ? 'initialOpen' : 'initialOpen={ false }';
		if ( io.present ) {
			edits.push( { start: io.node.start, end: io.node.end, text: attr, open } );
			return;
		}
		const opening = node.openingElement;
		const nameEnd = opening.name.end;
		const first = opening.attributes[ 0 ];
		let insertion = ` ${ attr }`;
		if ( first && text.slice( nameEnd, first.start ).includes( '\n' ) ) {
			const lineStart = text.lastIndexOf( '\n', first.start ) + 1;
			const indent = text.slice( lineStart, first.start );
			insertion = `\n${ indent }${ attr }`;
		}
		edits.push( { start: nameEnd, end: nameEnd, text: insertion, open } );
	} );
	return edits;
}

/** Apply edits (highest offset first). */
function applyEdits( text, edits ) {
	let out = text;
	for ( const e of [ ...edits ].sort( ( a, b ) => b.start - a.start ) ) {
		out = out.slice( 0, e.start ) + e.text + out.slice( e.end );
	}
	return out;
}

function run( apply, root = scan.SRC, data = JSON.parse( fs.readFileSync( DATA_FILE, 'utf8' ) ) ) {
	let tags = 0;
	let opened = 0;
	const changed = [];
	for ( const file of scan.jsFiles( root ) ) {
		const text = fs.readFileSync( file, 'utf8' );
		if ( ! text.includes( 'PanelBody' ) ) {
			continue;
		}
		const edits = planText( text, scan.blockOf( file ), data );
		if ( ! edits.length ) {
			continue;
		}
		tags += edits.length;
		opened += edits.filter( ( e ) => e.open ).length;
		changed.push( `${ scan.rel( file ) }: ${ edits.length }` );
		if ( apply ) {
			fs.writeFileSync( file, applyEdits( text, edits ), 'utf8' );
		}
	}
	process.stdout.write( `${ changed.join( '\n' ) }\n[migrate-panel-initial-open] ${ tags } PanelBody tags ${ apply ? 'rewritten' : 'would be rewritten' } in ${ changed.length } files (${ opened } open as a first panel, ${ tags - opened } closed)\n` );
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[migrate-panel-initial-open --self-test]\n\n' );
	const data = { blocks: { hero: { settings: { title: 'Hero Settings', source: 'block' }, styles: { title: 'Colour', source: 'colour' } } } };
	const go = ( src, block = 'hero' ) => applyEdits( src, planText( src, block, data ) );
	ok( 'a PanelBody with no flag is closed', go( 'const A = () => (<PanelBody title="X">y</PanelBody>);' ).includes( '<PanelBody initialOpen={ false } title="X">' ) );
	ok( 'a literal true on a non-first panel is closed', go( 'const A = () => (<PanelBody title="X" initialOpen={ true } />);' ).includes( 'initialOpen={ false }' ) && ! go( 'const A = () => (<PanelBody title="X" initialOpen={ true } />);' ).includes( '{ true }' ) );
	ok( 'the block\'s named first panel opens', go( 'const A = () => (<PanelBody title={ __( \'Hero Settings\', \'sgs-blocks\' ) } initialOpen={ false } />);' ).includes( ' initialOpen />' ) );
	ok( 'a first panel already open is left as it is', 0 === planText( 'const A = () => (<PanelBody title="Hero Settings" initialOpen />);', 'hero', data ).length );
	ok( 'an expression flag is left alone', 0 === planText( 'const A = () => (<PanelBody title="X" initialOpen={ open } />);', 'hero', data ).length );
	ok( 'shared code never opens a panel', go( 'const A = () => (<PanelBody title="Hero Settings" />);', '' ).includes( 'initialOpen={ false }' ) );
	const multi = go( 'const A = () => (\n\t<PanelBody\n\t\ttitle="X"\n\t\tclassName="y"\n\t/>\n);' );
	ok( 'a multi-line tag gets the flag on its own line, indented like the other props', multi.includes( '<PanelBody\n\t\tinitialOpen={ false }\n\t\ttitle="X"' ) );
	ok( 'it is idempotent', 0 === planText( go( 'const A = () => (<PanelBody title="X">y</PanelBody>);' ), 'hero', data ).length );
	ok( 'SgsInnerSection is not touched', 0 === planText( 'const A = () => (<SgsInnerSection title="X" />);', 'hero', data ).length );
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'mpio-' ) );
	fs.mkdirSync( path.join( root, 'blocks', 'hero' ), { recursive: true } );
	fs.writeFileSync( path.join( root, 'blocks', 'hero', 'edit.js' ), 'export const A = () => (<PanelBody title="X" />);', 'utf8' );
	const before = fs.readFileSync( path.join( root, 'blocks', 'hero', 'edit.js' ), 'utf8' );
	run( false, root, data );
	ok( 'a dry run writes nothing', before === fs.readFileSync( path.join( root, 'blocks', 'hero', 'edit.js' ), 'utf8' ) );
	fs.rmSync( root, { recursive: true, force: true } );
	process.stdout.write( 0 === failures.length ? '\n[migrate-panel-initial-open --self-test] ALL ASSERTIONS PASS.\n' : `\n[migrate-panel-initial-open --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

const args = process.argv.slice( 2 );
if ( args.includes( '--self-test' ) ) {
	selfTest();
} else if ( args.includes( '--fix' ) ) {
	run( args.includes( '--apply' ) );
} else {
	process.stdout.write( 'usage: node scripts/migrate-panel-initial-open.js --fix [--apply] | --self-test\n' );
	process.exit( 2 );
}
