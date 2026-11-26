/**
 * check-reset-only-menus.js
 *
 * A three-dots menu whose only job is "reset" is a permanent 24 to 32 px button on a panel that may hold no value. The
 * small reset (`components/SgsPanelReset.js`, shown only when the panel holds a value) replaces two kinds:
 *   1. The media panels' "Panel options" `DropdownMenu` (`components/media/panels/MediaPanels.js::MediaPanels`, one
 *      mount that draws 61 menus across 24 blocks).
 *   2. A `ToolsPanel` whose every item is shown by default (core's menu then offers only reset), 30 of 98.
 * A `ToolsPanel` with at least one optional item keeps core's menu: that is where the menu earns its place.
 *
 * Classification: a `ToolsPanel` whose direct `ToolsPanelItem` children all carry `isShownByDefault` is reset-only; one
 * with an optional item is standard. A panel whose items sit in helper components (`Item`, `BoxItem`, `ScrimControls`)
 * cannot be read from its own tag, so `scripts/data/tools-panel-overrides.json` holds the by-hand class for each.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/check-reset-only-menus.js --survey [--json out.json]   # every menu of either kind, with its class
 *   node scripts/check-reset-only-menus.js --check                      # exit 1 while a "Panel options" menu or a reset-only ToolsPanel remains
 *   node scripts/check-reset-only-menus.js --self-test                  # proves the check can fail
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const scan = require( './lib/jsx-scan.js' );

const OVERRIDES_FILE = path.join( __dirname, 'data', 'tools-panel-overrides.json' );

/** The visible text of a `label` prop: a string, or `__( 'text', ... )`. */
function labelText( el, name = 'label' ) {
	const p = scan.prop( el, name );
	if ( 'string' === p.kind ) {
		return p.value;
	}
	const e = p.node && p.node.value && p.node.value.expression;
	if ( e && 'CallExpression' === e.type && e.arguments[ 0 ] && 'StringLiteral' === e.arguments[ 0 ].type ) {
		return e.arguments[ 0 ].value;
	}
	return `<${ p.kind }>`;
}

/** `isShownByDefault` of one ToolsPanelItem: 'yes', 'no' or 'expr'. */
function shownByDefault( item ) {
	const d = scan.prop( item, 'isShownByDefault' );
	if ( 'true' === d.kind ) {
		return 'yes';
	}
	return 'expr' === d.kind ? 'expr' : 'no';
}

/** ToolsPanelItem flags and the other element names found anywhere under a ToolsPanel element. */
function panelContents( panel ) {
	const items = [];
	const others = new Set();
	const seen = new Set();
	const walk = ( node ) => {
		if ( ! node || 'object' !== typeof node || seen.has( node ) ) {
			return;
		}
		seen.add( node );
		if ( Array.isArray( node ) ) {
			node.forEach( walk );
			return;
		}
		if ( 'JSXElement' === node.type && node !== panel ) {
			const name = scan.jsxName( node );
			if ( 'ToolsPanelItem' === name ) {
				items.push( shownByDefault( node ) );
			} else {
				others.add( name );
			}
		}
		for ( const key of Object.keys( node ) ) {
			if ( ! [ 'loc', 'start', 'end', 'extra' ].includes( key ) ) {
				walk( node[ key ] );
			}
		}
	};
	walk( panel );
	return { items, others: [ ...others ] };
}

/**
 * Menus found in one source text.
 *
 * @param {string} text Source.
 * @param {string} file Plugin-relative path (for the override lookup and the report).
 * @param {Object} counters Per file+symbol+label ordinal counter, shared across files.
 * @param {Array}  overrides Override entries.
 * @return {Array<Object>} Rows: kind 'media-panel-options' or 'tools-panel'.
 */
function scanText( text, file, counters, overrides ) {
	const rows = [];
	scan.walkJsx( scan.parse( text ), ( node, ancestors ) => {
		const name = scan.jsxName( node );
		const symbol = scan.enclosingSymbol( ancestors );
		if ( 'DropdownMenu' === name && 'Panel options' === labelText( node ) ) {
			rows.push( { kind: 'media-panel-options', file, symbol, line: node.loc.start.line, cls: 'reset-only' } );
		}
		if ( 'ToolsPanel' !== name ) {
			return;
		}
		const label = labelText( node );
		const key = `${ file }|${ symbol }|${ label }`;
		const index = counters[ key ] || 0;
		counters[ key ] = index + 1;
		const { items, others } = panelContents( node );
		let cls;
		let source = 'direct items';
		if ( items.length ) {
			cls = items.every( ( i ) => 'yes' === i ) ? 'reset-only' : 'standard';
		} else {
			const o = overrides.find( ( x ) => x.file === file && x.symbol === symbol && x.label === label && x.index === index );
			cls = o ? o.cls : 'unclassified';
			source = o ? 'by-hand override' : 'no override';
		}
		rows.push( { kind: 'tools-panel', file, symbol, label, index, line: node.loc.start.line, items: items.length, optionalItems: items.filter( ( i ) => 'yes' !== i ).length, helpers: items.length ? [] : others.filter( ( n ) => /^[A-Z]/.test( n ) ), cls, source } );
	} );
	return rows;
}

function scanTree( root = scan.SRC, overrides = JSON.parse( fs.readFileSync( OVERRIDES_FILE, 'utf8' ) ).panels ) {
	const rows = [];
	const parseErrors = [];
	const counters = {};
	for ( const file of scan.jsFiles( root ) ) {
		const text = fs.readFileSync( file, 'utf8' );
		if ( ! /ToolsPanel|Panel options/.test( text ) ) {
			continue;
		}
		try {
			rows.push( ...scanText( text, scan.rel( file ), counters, overrides ) );
		} catch ( e ) {
			parseErrors.push( { file, error: e.message } );
		}
	}
	return { rows, parseErrors };
}

/** What the codemod would change: the findings. */
const findings = ( rows ) => rows.filter( ( r ) => 'media-panel-options' === r.kind || 'reset-only' === r.cls || 'unclassified' === r.cls );

function survey( jsonOut ) {
	const { rows, parseErrors } = scanTree();
	const tools = rows.filter( ( r ) => 'tools-panel' === r.kind );
	const count = ( c ) => tools.filter( ( r ) => r.cls === c ).length;
	const owners = ( c ) => new Set( tools.filter( ( r ) => r.cls === c ).map( ( r ) => r.file.split( '/' )[ 2 ] || '(shared)' ) ).size;
	process.stdout.write( '[check-reset-only-menus --survey]\n' );
	process.stdout.write( `  "Panel options" menu mounts: ${ rows.filter( ( r ) => 'media-panel-options' === r.kind ).length } (each draws a menu on every media panel with rows: 61 live)\n` );
	process.stdout.write( `  ToolsPanel tags: ${ tools.length } (reset-only ${ count( 'reset-only' ) }, standard ${ count( 'standard' ) }, unclassified ${ count( 'unclassified' ) }; reset-only owners ${ owners( 'reset-only' ) })\n` );
	process.stdout.write( '\n  reset-only ToolsPanels (become a PanelBody with the small reset):\n' );
	for ( const r of tools.filter( ( x ) => 'reset-only' === x.cls ) ) {
		process.stdout.write( `    ${ r.file }::${ r.symbol } "${ r.label }" (${ r.items || 'helper' } item${ 1 === r.items ? '' : 's' }, ${ r.source })\n` );
	}
	for ( const r of tools.filter( ( x ) => 'unclassified' === x.cls ) ) {
		process.stdout.write( `  UNCLASSIFIED ${ r.file }::${ r.symbol } "${ r.label }" index ${ r.index }: add it to scripts/data/tools-panel-overrides.json\n` );
	}
	for ( const p of parseErrors ) {
		process.stdout.write( `  parse error: ${ p.file }: ${ p.error }\n` );
	}
	if ( jsonOut ) {
		fs.writeFileSync( jsonOut, JSON.stringify( { rows, parseErrors }, null, 1 ), 'utf8' );
	}
	process.exit( parseErrors.length || count( 'unclassified' ) ? 1 : 0 );
}

function check() {
	const { rows, parseErrors } = scanTree();
	const bad = findings( rows );
	for ( const r of bad ) {
		if ( 'media-panel-options' === r.kind ) {
			process.stdout.write( `${ r.file }::${ r.symbol }: a "Panel options" menu holds only a reset: use SgsPanelReset, shown only while the panel holds a value.\n` );
		} else if ( 'unclassified' === r.cls ) {
			process.stdout.write( `${ r.file }::${ r.symbol } "${ r.label }": items sit in helpers and no by-hand class is recorded in scripts/data/tools-panel-overrides.json.\n` );
		} else {
			process.stdout.write( `${ r.file }::${ r.symbol } "${ r.label }": every item is shown by default, so core's menu holds only a reset: make it a PanelBody with SgsPanelReset.\n` );
		}
	}
	for ( const p of parseErrors ) {
		process.stdout.write( `parse error: ${ p.file }: ${ p.error }\n` );
	}
	if ( ! bad.length && ! parseErrors.length ) {
		process.stdout.write( '[check-reset-only-menus] OK\n' );
	}
	process.exit( bad.length || parseErrors.length ? 1 : 0 );
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[check-reset-only-menus --self-test]\n\n' );
	const one = ( src, overrides = [] ) => scanText( src, 'src/blocks/x/edit.js', {}, overrides );
	const wrap = ( inner ) => `export const Edit = () => (<ToolsPanel label="T">${ inner }</ToolsPanel>);`;
	const reset = one( wrap( '<ToolsPanelItem isShownByDefault hasValue={ a } label="A"><X /></ToolsPanelItem><ToolsPanelItem isShownByDefault={ true } label="B"><X /></ToolsPanelItem>' ) );
	ok( 'items all shown by default: reset-only', 'reset-only' === reset[ 0 ].cls );
	ok( 'CATCHES a reset-only ToolsPanel as a finding', 1 === findings( reset ).length );
	const std = one( wrap( '<ToolsPanelItem isShownByDefault label="A"><X /></ToolsPanelItem><ToolsPanelItem label="B"><X /></ToolsPanelItem>' ) );
	ok( 'one optional item: standard', 'standard' === std[ 0 ].cls );
	ok( 'a standard ToolsPanel is not a finding', 0 === findings( std ).length );
	const exprShown = one( wrap( '<ToolsPanelItem isShownByDefault={ x } label="A"><X /></ToolsPanelItem>' ) );
	ok( 'an expression flag counts as optional', 'standard' === exprShown[ 0 ].cls );
	const helper = one( wrap( '<Item label="A" /><Item label="B" />' ) );
	ok( 'helper items with no override: unclassified, and a finding', 'unclassified' === helper[ 0 ].cls && 1 === findings( helper ).length );
	const overridden = one( wrap( '<Item label="A" />' ), [ { file: 'src/blocks/x/edit.js', symbol: 'Edit', label: 'T', index: 0, cls: 'standard' } ] );
	ok( 'an override classifies helper items', 'standard' === overridden[ 0 ].cls && 0 === findings( overridden ).length );
	const two = scanText( `export const Edit = () => (<><ToolsPanel label="T"><A /></ToolsPanel><ToolsPanel label="T"><A /></ToolsPanel></>);`, 'src/blocks/x/edit.js', {}, [ { file: 'src/blocks/x/edit.js', symbol: 'Edit', label: 'T', index: 1, cls: 'reset-only' } ] );
	ok( 'the override index tells two same-titled panels apart', 'unclassified' === two[ 0 ].cls && 'reset-only' === two[ 1 ].cls );
	const menu = one( 'export const M = () => (<DropdownMenu icon={ i } label={ __( \'Panel options\', \'sgs-blocks\' ) } />);' );
	ok( 'CATCHES a "Panel options" DropdownMenu', 1 === findings( menu ).length && 'media-panel-options' === menu[ 0 ].kind );
	ok( 'another DropdownMenu is not a finding', 0 === findings( one( 'export const M = () => (<DropdownMenu label="More" />);' ) ).length );
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'rom-' ) );
	fs.writeFileSync( path.join( root, 'bad.js' ), wrap( '<ToolsPanelItem isShownByDefault label="A"><X /></ToolsPanelItem>' ), 'utf8' );
	fs.writeFileSync( path.join( root, 'good.js' ), wrap( '<ToolsPanelItem label="A"><X /></ToolsPanelItem>' ), 'utf8' );
	const tree = scanTree( root, [] );
	ok( 'the tree scan reports the planted reset-only file only', 1 === findings( tree.rows ).length && tree.rows.find( ( r ) => 'reset-only' === r.cls ) );
	fs.rmSync( root, { recursive: true, force: true } );
	process.stdout.write( 0 === failures.length ? '\n[check-reset-only-menus --self-test] ALL ASSERTIONS PASS.\n' : `\n[check-reset-only-menus --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

const args = process.argv.slice( 2 );
if ( args.includes( '--self-test' ) ) {
	selfTest();
} else if ( args.includes( '--survey' ) ) {
	survey( args.includes( '--json' ) ? args[ args.indexOf( '--json' ) + 1 ] : null );
} else if ( args.includes( '--check' ) ) {
	check();
} else {
	process.stdout.write( 'usage: node scripts/check-reset-only-menus.js --survey [--json out.json] | --check | --self-test\n' );
	process.exit( 2 );
}
