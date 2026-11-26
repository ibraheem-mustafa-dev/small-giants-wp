/**
 * check-panel-initial-open.js
 *
 * Rule (Spec 49 §9.1): only the first panel of each inspector tab opens on first select; every other panel starts
 * closed. Which panel is first is decided by slot order at run time, so the rule has two halves:
 *
 *   Static (this script's --check). Every `PanelBody` says `initialOpen` outright (a `PanelBody` with none opens). A
 *   literal `initialOpen` true is allowed only on a block's own panel that `scripts/data/first-panels.json` names as
 *   that block's first panel in a tab. A shared panel takes `initialOpen` as a prop that defaults to closed
 *   (`SgsColourPanel`, the media panels), and the block passes true only where the data names that panel first.
 *   `components/media/panels/panel-model.js` `open: true` is refused.
 *
 *   Live (`scripts/check-editor-census.py open-panels`). The editor census (`investigate/i8-editor/census.mjs`) reads
 *   every block's panel list on first select; no panel past the first may be open.
 *
 * `scripts/data/first-panels.json` is written from a census: node scripts/check-panel-initial-open.js --from-census
 * <census.json>. It holds, per block and tab, the first panel's title, whether it is open today and how its source was
 * resolved (block panel, colour panel, media panel, shared panel, core or ToolsPanel).
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/check-panel-initial-open.js --from-census <census.json>   # writes scripts/data/first-panels.json
 *   node scripts/check-panel-initial-open.js --survey [--json out.json]    # every PanelBody by state; the first panels and what each becomes
 *   node scripts/check-panel-initial-open.js --check                       # exit 1 on any finding
 *   node scripts/check-panel-initial-open.js --self-test                   # proves the check can fail
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const scan = require( './lib/jsx-scan.js' );

const DATA_FILE = path.join( __dirname, 'data', 'first-panels.json' );
const PANEL_MODEL = path.join( scan.SRC, 'components', 'media', 'panels', 'panel-model.js' );
/** Components whose own `PanelBody` is exempt from the "no literal true" rule only when it reads a prop. */
const SHARED_COLOUR = 'SgsColourPanel';

/** Title text of a PanelBody: a string, `__( 'T' )`, a `<PanelTitle title=... />`, or null when dynamic. */
function titleText( el ) {
	const p = scan.prop( el, 'title' );
	if ( 'string' === p.kind ) {
		return p.value;
	}
	const e = p.node && p.node.value && p.node.value.expression;
	if ( ! e ) {
		return null;
	}
	const fromCall = ( c ) => ( c && 'CallExpression' === c.type && c.arguments[ 0 ] && 'StringLiteral' === c.arguments[ 0 ].type ? c.arguments[ 0 ].value : null );
	if ( 'CallExpression' === e.type ) {
		return fromCall( e );
	}
	if ( 'JSXElement' === e.type ) {
		const inner = scan.prop( e, 'title' );
		if ( 'string' === inner.kind ) {
			return inner.value;
		}
		const ie = inner.node && inner.node.value && inner.node.value.expression;
		return ie ? fromCall( ie ) : null;
	}
	return null;
}

/** Media panel titles from panel-model.js (plain text parse of `title: () => __( 'X'`). */
function mediaTitles() {
	const text = fs.readFileSync( PANEL_MODEL, 'utf8' );
	return [ ...text.matchAll( /title:\s*\(\)\s*=>\s*__\(\s*'([^']+)'/g ) ].map( ( m ) => m[ 1 ] );
}

/** Every PanelBody and SgsColourPanel mount in one source text. */
function scanText( text, file ) {
	const rows = [];
	scan.walkJsx( scan.parse( text ), ( node, ancestors ) => {
		const name = scan.jsxName( node );
		if ( 'PanelBody' !== name && SHARED_COLOUR !== name ) {
			return;
		}
		const io = scan.prop( node, 'initialOpen' );
		rows.push( {
			file,
			line: node.loc.start.line,
			name,
			symbol: scan.enclosingSymbol( ancestors ),
			title: 'PanelBody' === name ? titleText( node ) : 'Colour',
			initialOpen: io.kind,
			tab: tabOf( ancestors ),
			block: scan.blockOf( path.join( scan.PLUGIN, file ) ),
		} );
	} );
	return rows;
}

function scanTree( root = scan.SRC ) {
	const rows = [];
	const parseErrors = [];
	for ( const file of scan.jsFiles( root ) ) {
		const text = fs.readFileSync( file, 'utf8' );
		if ( ! /PanelBody|SgsColourPanel/.test( text ) ) {
			continue;
		}
		try {
			rows.push( ...scanText( text, scan.rel( file ) ) );
		} catch ( e ) {
			parseErrors.push( { file, error: e.message } );
		}
	}
	return { rows, parseErrors };
}

/** The first-panels data, or an empty one. */
function loadData() {
	return fs.existsSync( DATA_FILE ) ? JSON.parse( fs.readFileSync( DATA_FILE, 'utf8' ) ) : { blocks: {} };
}

/** Titles the data names first for a block, across both tabs. */
/**
 * Titles the data names first for a block in `tab` ('settings', 'styles'; null when the panel's tab is not known from its
 * own file, so either tab counts).
 */
const firstTitles = ( data, block, tab = null ) =>
	new Set( Object.entries( data.blocks[ block ] || {} ).filter( ( [ t ] ) => ! tab || t === tab ).map( ( [ , f ] ) => f.title ) );

/** The inspector tab a panel sits in, from its closest `InspectorControls` in the same file; null when there is none. */
function tabOf( ancestors ) {
	const ic = scan.closestJsx( ancestors, ( e ) => 'InspectorControls' === scan.jsxName( e ) );
	if ( ! ic ) {
		return null;
	}
	return 'styles' === scan.prop( ic, 'group' ).value ? 'styles' : 'settings';
}

/**
 * Static findings for the scanned rows.
 *
 * @param {Array}  rows  Rows from scanTree.
 * @param {Object} data  first-panels data.
 * @param {string} panelModelText Text of panel-model.js ('' to skip that rule).
 * @return {Array<{file:string,line:number,rule:string,message:string}>} Findings.
 */
function findingsFor( rows, data, panelModelText ) {
	const out = [];
	for ( const r of rows ) {
		const where = `${ r.file }:${ r.line }`;
		if ( 'PanelBody' === r.name ) {
			if ( 'absent' === r.initialOpen ) {
				out.push( { file: r.file, line: r.line, rule: 'explicit', message: `${ where } <PanelBody${ r.title ? ` title="${ r.title }"` : '' }> says no initialOpen, so it opens: say initialOpen={ false }.` } );
			} else if ( 'true' === r.initialOpen ) {
				if ( ! r.block ) {
					out.push( { file: r.file, line: r.line, rule: 'shared-literal-true', message: `${ where } a shared <PanelBody${ r.title ? ` title="${ r.title }"` : '' }> opens by a literal true: take an initialOpen prop that defaults to false.` } );
				} else if ( ! r.title || ! firstTitles( data, r.block, r.tab ).has( r.title ) ) {
					out.push( { file: r.file, line: r.line, rule: 'not-first', message: `${ where } <PanelBody title="${ r.title }"> opens, but first-panels.json does not name it first in a tab of ${ r.block }.` } );
				}
			}
		} else if ( 'true' === r.initialOpen && ! firstTitles( data, r.block ).has( 'Colour' ) ) {
			out.push( { file: r.file, line: r.line, rule: 'colour-not-first', message: `${ where } <SgsColourPanel initialOpen> in ${ r.block || 'shared code' }: Colour is not that block's first Styles panel.` } );
		}
	}
	if ( panelModelText ) {
		for ( const m of panelModelText.matchAll( /^\s*open:\s*true\b/gm ) ) {
			const line = panelModelText.slice( 0, m.index ).split( '\n' ).length;
			out.push( { file: 'src/components/media/panels/panel-model.js', line, rule: 'media-default-open', message: `src/components/media/panels/panel-model.js:${ line } a media panel opens by default: open it only where first-panels.json names it first.` } );
		}
	}
	// Colour is first in a block's Styles tab: that block's own mount passes initialOpen.
	for ( const [ block, tabs ] of Object.entries( data.blocks ) ) {
		if ( tabs.styles && 'Colour' === tabs.styles.title && 'colour' === tabs.styles.source ) {
			const mounts = rows.filter( ( r ) => SHARED_COLOUR === r.name && r.block === block );
			if ( mounts.length && ! mounts.some( ( r ) => 'true' === r.initialOpen || 'expr' === r.initialOpen ) ) {
				out.push( { file: mounts[ 0 ].file, line: mounts[ 0 ].line, rule: 'colour-first-open', message: `${ mounts[ 0 ].file }:${ mounts[ 0 ].line } ${ block }: Colour is the first Styles panel, so its <SgsColourPanel> passes initialOpen.` } );
			}
		}
	}
	return out;
}

/** Block-level resolution of a census first panel: where its panel is drawn. */
function resolveFirst( block, title, kind, bodyIndex, mediaSet ) {
	if ( 'tools' === kind ) {
		return { source: 'tools', note: 'a ToolsPanel has no collapse: always open' };
	}
	if ( 'Colour' === title ) {
		return { source: 'colour', note: 'SgsColourPanel: the mount passes initialOpen' };
	}
	const bare = title.replace( /^.*:\s+/, '' );
	const hits = bodyIndex.filter( ( r ) => r.title === title );
	const inBlock = hits.filter( ( r ) => r.block === block );
	if ( inBlock.length ) {
		return { source: 'block', note: `${ inBlock[ 0 ].file }::${ inBlock[ 0 ].symbol }`, count: inBlock.length };
	}
	if ( mediaSet.has( title ) || mediaSet.has( bare ) ) {
		return { source: 'media', note: `media panel "${ bare }": the slot opens it by the openPanel prop, not by panel-model default` };
	}
	if ( hits.length ) {
		return { source: 'shared', note: `${ hits[ 0 ].file }::${ hits[ 0 ].symbol }`, count: hits.length };
	}
	return { source: 'unresolved', note: 'title not found as a literal PanelBody title (core panel, dynamic title or SGS wrapper)' };
}

function fromCensus( censusFile ) {
	const census = JSON.parse( fs.readFileSync( censusFile, 'utf8' ) ).results;
	const { rows } = scanTree();
	const bodyIndex = rows.filter( ( r ) => 'PanelBody' === r.name && r.title );
	const mediaSet = new Set( [ ...mediaTitles() ] );
	const blocks = {};
	for ( const [ name, rec ] of Object.entries( census ) ) {
		if ( ! rec.ok || ! rec.L ) {
			continue;
		}
		const slug = name.replace( /^sgs\//, '' );
		for ( const tab of [ 'settings', 'styles' ] ) {
			const list = rec.L[ `${ tab }_settled` ];
			if ( ! list || ! list.length ) {
				continue;
			}
			const first = list[ 0 ];
			blocks[ slug ] = blocks[ slug ] || {};
			blocks[ slug ][ tab ] = { title: first.title, kind: first.kind, opened: first.opened, ...resolveFirst( slug, first.title, first.kind, bodyIndex, mediaSet ) };
		}
	}
	// A block the census could not read (its children mount only inside a started form): the first PanelBody in the
	// block's own `edit.js`, in JSX order, is its first Settings panel.
	for ( const [ name, rec ] of Object.entries( census ) ) {
		const slug = name.replace( /^sgs\//, '' );
		if ( blocks[ slug ] || ! rec.ok ) {
			continue;
		}
		const own = rows.filter( ( r ) => 'PanelBody' === r.name && r.title && r.file === `src/blocks/${ slug }/edit.js` ).sort( ( a, b ) => a.line - b.line );
		if ( own.length ) {
			blocks[ slug ] = { settings: { title: own[ 0 ].title, kind: 'body', opened: false, source: 'block', note: `${ own[ 0 ].file }::${ own[ 0 ].symbol }`, derived: 'source order (the census could not read this block)' } };
		}
	}
	const data = {
		_comment: 'First panel of each inspector tab per block, read from an editor census by `check-panel-initial-open.js --from-census`. `opened` is the state at the census. `source`: block = a PanelBody in the block\'s own files; colour = SgsColourPanel; media = a media panel; shared = a PanelBody in shared code; tools = a non-collapsing ToolsPanel; unresolved = a core panel or a title the scan cannot read.',
		census: path.basename( censusFile ),
		blocks: Object.fromEntries( Object.entries( blocks ).sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) ),
	};
	fs.writeFileSync( DATA_FILE, JSON.stringify( data, null, '\t' ) + '\n', 'utf8' );
	process.stdout.write( `wrote ${ scan.rel( DATA_FILE ) }: ${ Object.keys( data.blocks ).length } blocks\n` );
}

function survey( jsonOut ) {
	const { rows, parseErrors } = scanTree();
	const data = loadData();
	const byState = {};
	for ( const r of rows ) {
		const k = `${ r.name }:${ r.initialOpen }`;
		byState[ k ] = ( byState[ k ] || 0 ) + 1;
	}
	process.stdout.write( '[check-panel-initial-open --survey]\n' );
	for ( const [ k, n ] of Object.entries( byState ).sort() ) {
		process.stdout.write( `  ${ k }: ${ n }\n` );
	}
	const sources = {};
	const closedFirst = [];
	for ( const [ block, tabs ] of Object.entries( data.blocks ) ) {
		for ( const [ tab, f ] of Object.entries( tabs ) ) {
			sources[ f.source ] = ( sources[ f.source ] || 0 ) + 1;
			if ( 'body' === f.kind && ! f.opened ) {
				closedFirst.push( `${ block } ${ tab } "${ f.title }"` );
			}
		}
	}
	process.stdout.write( `  first panels in ${ data.census || 'no census data' }: ${ JSON.stringify( sources ) }\n` );
	process.stdout.write( `  first panels closed today (a PanelBody the codemod would open): ${ closedFirst.length }\n` );
	const findings = findingsFor( rows, data, fs.readFileSync( PANEL_MODEL, 'utf8' ) );
	const byRule = {};
	for ( const f of findings ) {
		byRule[ f.rule ] = ( byRule[ f.rule ] || 0 ) + 1;
	}
	process.stdout.write( `  findings by rule: ${ JSON.stringify( byRule ) }\n` );
	for ( const p of parseErrors ) {
		process.stdout.write( `  parse error: ${ p.file }: ${ p.error }\n` );
	}
	if ( jsonOut ) {
		fs.writeFileSync( jsonOut, JSON.stringify( { byState, rows, findings, firstPanels: data.blocks, closedFirst, parseErrors }, null, 1 ), 'utf8' );
	}
	process.exit( parseErrors.length ? 1 : 0 );
}

function check() {
	const { rows, parseErrors } = scanTree();
	const findings = findingsFor( rows, loadData(), fs.readFileSync( PANEL_MODEL, 'utf8' ) );
	for ( const f of findings ) {
		process.stdout.write( `${ f.message }\n` );
	}
	for ( const p of parseErrors ) {
		process.stdout.write( `parse error: ${ p.file }: ${ p.error }\n` );
	}
	if ( ! findings.length && ! parseErrors.length ) {
		process.stdout.write( '[check-panel-initial-open] OK\n' );
	}
	process.exit( findings.length || parseErrors.length ? 1 : 0 );
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[check-panel-initial-open --self-test]\n\n' );
	const data = { blocks: { hero: { styles: { title: 'Colour', source: 'colour' }, settings: { title: 'Hero Settings', source: 'block' } } } };
	const run = ( src, file = 'src/blocks/hero/edit.js', d = data, pm = '' ) => findingsFor( scanText( src, file ), d, pm ).map( ( f ) => f.rule );
	ok( 'accepts a closed PanelBody', 0 === run( 'export const A = () => (<PanelBody title="X" initialOpen={ false } />);' ).length );
	ok( 'CATCHES a PanelBody with no initialOpen', run( 'export const A = () => (<PanelBody title="X" />);' ).includes( 'explicit' ) );
	ok( 'accepts a literal true on the block\'s named first panel', 0 === run( 'export const A = () => (<PanelBody title={ __( \'Hero Settings\', \'sgs-blocks\' ) } initialOpen />);' ).length );
	ok( 'CATCHES a literal true on a panel the data does not name first', run( 'export const A = () => (<PanelBody title="Other" initialOpen={ true } />);' ).includes( 'not-first' ) );
	ok( 'CATCHES a literal true in shared code', run( 'export const A = () => (<PanelBody title="Shared" initialOpen />);', 'src/components/Shared.js' ).includes( 'shared-literal-true' ) );
	ok( 'accepts a prop-driven initialOpen in shared code', 0 === run( 'export const A = ( { initialOpen = false } ) => (<PanelBody title="S" initialOpen={ initialOpen } />);', 'src/components/Shared.js' ).length );
	ok( 'CATCHES Colour opened where Colour is not first', run( 'export const A = () => (<SgsColourPanel initialOpen rows={ r } />);', 'src/blocks/text/edit.js' ).includes( 'colour-not-first' ) );
	ok( 'accepts Colour opened where Colour is first', 0 === run( 'export const A = () => (<SgsColourPanel initialOpen rows={ r } />);' ).length );
	ok( 'CATCHES Colour not opened where Colour is first', run( 'export const A = () => (<SgsColourPanel rows={ r } />);' ).includes( 'colour-first-open' ) );
	ok( 'CATCHES a media panel that opens by default', run( 'export const A = () => 1;', 'src/x.js', data, 'const P = [ { id: \'media\',\n open: true, } ];' ).includes( 'media-default-open' ) );
	ok( 'a closed media model passes', 0 === run( 'export const A = () => 1;', 'src/x.js', data, 'const P = [ { id: \'media\',\n open: false, } ];' ).length );
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'cpio-' ) );
	fs.writeFileSync( path.join( root, 'bad.js' ), 'export const A = () => (<PanelBody title="X" />);', 'utf8' );
	fs.writeFileSync( path.join( root, 'good.js' ), 'export const A = () => (<PanelBody title="X" initialOpen={ false } />);', 'utf8' );
	const tree = scanTree( root );
	ok( 'the tree scan reports the planted file only', 1 === findingsFor( tree.rows, data, '' ).length );
	fs.rmSync( root, { recursive: true, force: true } );
	process.stdout.write( 0 === failures.length ? '\n[check-panel-initial-open --self-test] ALL ASSERTIONS PASS.\n' : `\n[check-panel-initial-open --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

const args = process.argv.slice( 2 );
if ( args.includes( '--self-test' ) ) {
	selfTest();
} else if ( args.includes( '--from-census' ) ) {
	fromCensus( args[ args.indexOf( '--from-census' ) + 1 ] );
} else if ( args.includes( '--survey' ) ) {
	survey( args.includes( '--json' ) ? args[ args.indexOf( '--json' ) + 1 ] : null );
} else if ( args.includes( '--check' ) ) {
	check();
} else {
	process.stdout.write( 'usage: node scripts/check-panel-initial-open.js --from-census <census.json> | --survey [--json out.json] | --check | --self-test\n' );
	process.exit( 2 );
}
