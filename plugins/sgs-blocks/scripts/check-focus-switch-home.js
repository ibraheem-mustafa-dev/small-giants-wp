/**
 * check-focus-switch-home.js
 *
 * The "Keyboard focus" switch (`sgsFocusRests`) is one block-wide row, not a panel of its own (Bean, 2026-11-25). Where
 * it lands depends on the block (Bean, 2026-11-26):
 *
 *   hover     the block declares `supports.sgs.motion`, so the motion Hover panel is mounted: the row is the LAST row of
 *             that panel, below everything else and under a rule (a slot that holds more than one block-wide switch).
 *   advanced  no Hover panel, but the block holds a hover value (an attribute with "hover" in its name): the row sits in
 *             WordPress's Advanced section (`InspectorAdvancedControls`).
 *   hidden    no Hover panel and no hover value: a switch with nothing to act on is not drawn.
 *
 * `--survey` lists every block that receives the setting with its destination and the evidence. `--check` fails when:
 *   1. `blocks/extensions/focus-rests.js` still draws a `PanelBody` of its own, or any `PanelBody` in `src/` is titled
 *      "Keyboard focus";
 *   2. `HoverPanel.js` does not render `<SgsBlockWideRowsSlot>` as the last child of its outer PanelBody, after the target
 *      picker and everything else;
 *   3. a hidden block holds a hover value;
 *   4. `focus-rests.js` does not fill `InspectorAdvancedControls` for the advanced destination, or
 *      `src/blocks/extensions/focus-switch-home.json` (what the editor reads) is not the survey's answer: run `--write`.
 *
 * Who receives the setting: the roster rule (`extension-roster.json`, extension `focusRests`, mode denylist): every
 * `sgs/*` block whose `supports.sgs.hideExtensions` does not list the rule's `hideSlug`.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/check-focus-switch-home.js --survey [--json out.json]
 *   node scripts/check-focus-switch-home.js --write      # writes src/blocks/extensions/focus-switch-home.json from the survey
 *   node scripts/check-focus-switch-home.js --check
 *   node scripts/check-focus-switch-home.js --self-test
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const scan = require( './lib/jsx-scan' );

/** The element HoverPanel renders, as its last child, for block-wide switches. */
const SLOT = 'SgsBlockWideRowsSlot';
const FOCUS_FILE = 'src/blocks/extensions/focus-rests.js';
const HOVER_FILE = 'src/blocks/extensions/motion/HoverPanel.js';
const ROSTER_FILE = 'src/blocks/extensions/extension-roster.json';
const HOMES_FILE = 'src/blocks/extensions/focus-switch-home.json';
const HOVER_ATTR = /hover/i;

const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

/**
 * Block.json facts for every block under src.
 *
 * @param {string} plugin Plugin root.
 * @return {Object[]} One record per block.
 */
function readBlocks( plugin = scan.PLUGIN ) {
	const out = [];
	for ( const group of [ 'blocks', 'commerce-blocks' ] ) {
		const root = path.join( plugin, 'src', group );
		if ( ! fs.existsSync( root ) ) {
			continue;
		}
		for ( const entry of fs.readdirSync( root, { withFileTypes: true } ) ) {
			const dir = path.join( root, entry.name );
			const jsonFile = path.join( dir, 'block.json' );
			if ( ! entry.isDirectory() || ! fs.existsSync( jsonFile ) ) {
				continue;
			}
			const json = readJson( jsonFile );
			const sgs = ( json.supports && json.supports.sgs ) || {};
			out.push( {
				name: json.name,
				slug: entry.name,
				dir,
				edit: path.join( dir, 'edit.js' ),
				hide: Array.isArray( sgs.hideExtensions ) ? sgs.hideExtensions : [],
				motion: Boolean( sgs.motion ),
				hoverAttrs: Object.keys( json.attributes || {} ).filter( ( a ) => HOVER_ATTR.test( a ) ).sort(),
			} );
		}
	}
	return out.sort( ( a, b ) => a.name.localeCompare( b.name ) );
}

/** The slug the roster's focusRests rule hides on, or null when the extension is missing. */
function hideSlugOf( plugin = scan.PLUGIN ) {
	const roster = readJson( path.join( plugin, ROSTER_FILE ) );
	const ext = ( roster.extensions || [] ).find( ( e ) => 'focusRests' === e.id );
	return ext ? ext.rule.hideSlug : null;
}

/**
 * The survey: one row per block that receives the setting.
 *
 * @param {string} plugin Plugin root.
 * @return {Object[]} Rows.
 */
function survey( plugin = scan.PLUGIN ) {
	const hideSlug = hideSlugOf( plugin );
	return readBlocks( plugin )
		.filter( ( b ) => b.name.startsWith( 'sgs/' ) && ! ( hideSlug && b.hide.includes( hideSlug ) ) )
		.map( ( b ) => {
			const hasHover = b.motion;
			const holdsHover = b.hoverAttrs.length > 0;
			const destination = hasHover ? 'hover' : holdsHover ? 'advanced' : 'hidden';
			return {
				name: b.name,
				hasHover,
				hoverDeterminedBy: hasHover ? 'supports.sgs.motion declared (HoverPanel mounts for it)' : 'no supports.sgs.motion',
				holdsHover,
				hoverEvidence: b.hoverAttrs,
				destination,
			};
		} );
}

/**
 * Panel titles equal to "Keyboard focus" and whether focus-rests.js draws a PanelBody.
 *
 * @param {string} plugin Plugin root.
 * @return {{titled: Object[], focusFileDrawsPanel: boolean}} Facts.
 */
function panelFacts( plugin = scan.PLUGIN ) {
	const titled = [];
	let focusFileDrawsPanel = false;
	for ( const file of scan.jsFiles( path.join( plugin, 'src' ) ) ) {
		const text = fs.readFileSync( file, 'utf8' );
		if ( ! /PanelBody/.test( text ) ) {
			continue;
		}
		const ast = scan.astOf( file );
		if ( ! ast ) {
			continue;
		}
		const relFile = path.relative( plugin, file ).split( path.sep ).join( '/' );
		scan.walkJsx( ast, ( el ) => {
			if ( 'PanelBody' !== scan.jsxName( el ) ) {
				return;
			}
			if ( relFile === FOCUS_FILE ) {
				focusFileDrawsPanel = true;
			}
			const literal = titleOf( el );
			if ( 'Keyboard focus' === literal ) {
				titled.push( { file: relFile, line: el.loc.start.line } );
			}
		} );
	}
	return { titled, focusFileDrawsPanel };
}

/** A PanelBody's literal title: a string prop or `__( 'Title', 'domain' )`; null for anything else. */
function titleOf( el ) {
	const t = scan.prop( el, 'title' );
	if ( 'string' === t.kind ) {
		return t.value;
	}
	const e = t.node && t.node.value && t.node.value.expression;
	return e && 'CallExpression' === e.type && e.arguments[ 0 ] && 'StringLiteral' === e.arguments[ 0 ].type ? e.arguments[ 0 ].value : null;
}

/** True when HoverPanel's outer PanelBody renders the slot as its last child, after the target picker. */
function hoverRendersSlot( plugin = scan.PLUGIN ) {
	const file = path.join( plugin, HOVER_FILE );
	const ast = fs.existsSync( file ) ? scan.astOf( file ) : null;
	if ( ! ast ) {
		return false;
	}
	let ok = false;
	scan.walkJsx( ast, ( el ) => {
		if ( 'PanelBody' !== scan.jsxName( el ) || 'Hover' !== titleOf( el ) ) {
			return;
		}
		const kids = el.children.filter( ( c ) => 'JSXElement' === c.type ).map( ( c ) => scan.jsxName( c ) );
		const s = kids.indexOf( SLOT );
		const t = kids.indexOf( 'TargetRow' );
		if ( s >= 0 && t >= 0 && s > t && s === kids.length - 1 ) {
			ok = true;
		}
	} );
	return ok;
}

/** True when focus-rests.js puts the switch in `InspectorAdvancedControls` for the advanced destination. */
function fillsAdvanced( plugin = scan.PLUGIN ) {
	const file = path.join( plugin, FOCUS_FILE );
	const ast = fs.existsSync( file ) ? scan.astOf( file ) : null;
	let ok = false;
	if ( ast ) {
		scan.walkJsx( ast, ( el ) => {
			if ( 'InspectorAdvancedControls' === scan.jsxName( el ) ) {
				ok = true;
			}
		} );
	}
	return ok;
}

/** The data the editor reads: block name to 'hover', 'advanced' or '' (not drawn). */
function homesData( rows ) {
	return {
		_comment: 'Where the "Keyboard focus" row of each block sits. Written by scripts/check-focus-switch-home.js --write from block.json; do not edit by hand. hover = the last row of the motion Hover panel, advanced = the Advanced section of the block inspector, empty = not drawn.',
		blocks: Object.fromEntries( rows.map( ( r ) => [ r.name, 'hidden' === r.destination ? '' : r.destination ] ) ),
	};
}

/** Problems for a plugin root. */
function problemsFor( plugin = scan.PLUGIN ) {
	const problems = [];
	const facts = panelFacts( plugin );
	if ( facts.focusFileDrawsPanel ) {
		problems.push( `${ FOCUS_FILE } still draws a PanelBody of its own: the switch is a row in Hover or in the Advanced section.` );
	}
	for ( const t of facts.titled ) {
		problems.push( `${ t.file }:${ t.line } a PanelBody titled "Keyboard focus" remains.` );
	}
	if ( ! hoverRendersSlot( plugin ) ) {
		problems.push( `${ HOVER_FILE }: the Hover PanelBody does not render <${ SLOT }> as its last child, after <TargetRow>.` );
	}
	if ( ! fillsAdvanced( plugin ) ) {
		problems.push( `${ FOCUS_FILE }: the advanced destination does not fill <InspectorAdvancedControls>.` );
	}
	const homesFile = path.join( plugin, HOMES_FILE );
	const want = JSON.stringify( homesData( survey( plugin ) ).blocks );
	const have = fs.existsSync( homesFile ) ? JSON.stringify( readJson( homesFile ).blocks ) : '';
	if ( want !== have ) {
		problems.push( `${ HOMES_FILE } is missing or stale: run node scripts/check-focus-switch-home.js --write.` );
	}
	for ( const row of survey( plugin ) ) {
		if ( 'hidden' === row.destination && row.holdsHover ) {
			problems.push( `${ row.name }: hidden although it holds hover values (${ row.hoverEvidence.join( ', ' ) }).` );
		}
	}
	return problems;
}

function writeHomes( plugin = scan.PLUGIN ) {
	const file = path.join( plugin, HOMES_FILE );
	fs.writeFileSync( file, JSON.stringify( homesData( survey( plugin ) ), null, '\t' ) + '\n', 'utf8' );
	process.stdout.write( `wrote ${ HOMES_FILE }\n` );
}

function printSurvey( rows, facts, jsonPath ) {
	const by = ( d ) => rows.filter( ( r ) => d === r.destination );
	process.stdout.write( `[check-focus-switch-home --survey] ${ rows.length } blocks receive sgsFocusRests\n` );
	for ( const d of [ 'hover', 'advanced', 'hidden' ] ) {
		process.stdout.write( `  ${ d }: ${ by( d ).length }
` );
	}
	for ( const d of [ 'advanced', 'hidden' ] ) {
		for ( const r of by( d ) ) {
			process.stdout.write( `    ${ d.padEnd( 8 ) } ${ r.name }  hover values: ${ r.hoverEvidence.join( ', ' ) || 'none' }
` );
		}
	}
	process.stdout.write( `  focus-rests.js draws its own PanelBody: ${ facts.focusFileDrawsPanel }; PanelBody titled "Keyboard focus" in src: ${ facts.titled.length }; HoverPanel renders <${ SLOT }> as its last child: ${ hoverRendersSlot() }\n` );
	if ( jsonPath ) {
		fs.writeFileSync( jsonPath, JSON.stringify( { blocks: rows, panelFacts: facts, hoverRendersSlot: hoverRendersSlot() }, null, 2 ), 'utf8' );
	}
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[check-focus-switch-home --self-test]\n\n' );
	// Each scenario gets its own tree: jsx-scan caches a parsed file by path.
	const roots = [];
	const tree = ( { focus, hover, homes } ) => {
		const root = fs.mkdtempSync( path.join( os.tmpdir(), 'fsh-' ) );
		roots.push( root );
		const put = ( rel, body ) => {
			const f = path.join( root, rel );
			fs.mkdirSync( path.dirname( f ), { recursive: true } );
			fs.writeFileSync( f, body, 'utf8' );
		};
		const block = ( slug, supportsSgs, attrs ) => put( `src/blocks/${ slug }/block.json`, JSON.stringify( { name: `sgs/${ slug }`, supports: { sgs: supportsSgs }, attributes: attrs } ) );
		put( ROSTER_FILE, JSON.stringify( { extensions: [ { id: 'focusRests', rule: { mode: 'denylist', hideSlug: 'focusRests' } } ] } ) );
		block( 'withmotion', { motion: {} }, { a: { type: 'string' } } );
		block( 'hoverblock', {}, { textColourHover: { type: 'string' } } );
		block( 'plain', {}, { a: { type: 'string' } } );
		block( 'opted-out', { hideExtensions: [ 'focusRests' ] }, {} );
		put( HOMES_FILE, homes === undefined ? JSON.stringify( homesData( survey( root ) ) ) : homes );
		put( FOCUS_FILE, focus );
		put( HOVER_FILE, hover );
		return root;
	};
	const GOOD = {
		focus: 'export const A = () => (<InspectorAdvancedControls><Toggle /></InspectorAdvancedControls>);',
		hover: `export default () => (<PanelBody title={ __( 'Hover', 'x' ) }><TargetRow /><PanelBody title="Fine-tune" /><${ SLOT } /></PanelBody>);`,
	};
	const has = ( root, text ) => problemsFor( root ).some( ( x ) => x.includes( text ) );
	const good = tree( GOOD );
	const rows = survey( good );
	ok( 'a motion block lands in Hover', 'hover' === rows.find( ( r ) => 'sgs/withmotion' === r.name ).destination );
	ok( 'no motion and a hover value lands in the Advanced section', 'advanced' === rows.find( ( r ) => 'sgs/hoverblock' === r.name ).destination );
	ok( 'no motion and no hover value is hidden', 'hidden' === rows.find( ( r ) => 'sgs/plain' === r.name ).destination );
	ok( 'a block hiding the extension is not listed', ! rows.some( ( r ) => 'sgs/opted-out' === r.name ) );
	ok( 'passes a tree that satisfies every rule', 0 === problemsFor( good ).length );
	const drawn = tree( { ...GOOD, focus: 'export const A = () => (<PanelBody title="Keyboard focus" initialOpen={ false } />);' } );
	ok( 'CATCHES a PanelBody still drawn by focus-rests.js', has( drawn, 'still draws a PanelBody' ) );
	ok( 'CATCHES a PanelBody titled Keyboard focus', has( drawn, 'titled "Keyboard focus"' ) );
	const hoverTree = ( body ) => tree( { ...GOOD, hover: `export default () => (<PanelBody title="Hover">${ body }</PanelBody>);` } );
	ok( 'CATCHES a Hover panel with no slot', has( hoverTree( '<TargetRow />' ), 'does not render' ) );
	ok( 'CATCHES the slot placed above the target picker', has( hoverTree( `<${ SLOT } /><TargetRow />` ), 'does not render' ) );
	ok( 'CATCHES the slot placed before a later control (it must be the last child)', has( hoverTree( `<TargetRow /><${ SLOT } /><HoverEffects />` ), 'does not render' ) );
	ok( 'accepts the slot as the last child, after the target picker and a later control', 0 === problemsFor( hoverTree( `<TargetRow /><HoverEffects /><${ SLOT } />` ) ).length );
	ok( 'CATCHES a focus-rests.js that never fills InspectorAdvancedControls', has( tree( { ...GOOD, focus: 'export const A = () => (<Fill />);' } ), 'InspectorAdvancedControls' ) );
	ok( 'CATCHES a stale homes file', has( tree( { ...GOOD, homes: JSON.stringify( { blocks: { 'sgs/plain': 'hover' } } ) } ), 'stale' ) );
	ok( 'the homes file records hover, advanced and not drawn', JSON.stringify( homesData( rows ).blocks ) === JSON.stringify( { 'sgs/hoverblock': 'advanced', 'sgs/plain': '', 'sgs/withmotion': 'hover' } ) );
	roots.forEach( ( r ) => fs.rmSync( r, { recursive: true, force: true } ) );
	process.stdout.write( 0 === failures.length ? '\n[check-focus-switch-home --self-test] ALL ASSERTIONS PASS.\n' : `\n[check-focus-switch-home --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

const argv = process.argv.slice( 2 );
if ( argv.includes( '--self-test' ) ) {
	selfTest();
} else if ( argv.includes( '--survey' ) ) {
	const i = argv.indexOf( '--json' );
	printSurvey( survey(), panelFacts(), i >= 0 ? argv[ i + 1 ] : null );
} else if ( argv.includes( '--write' ) ) {
	writeHomes();
} else if ( argv.includes( '--check' ) ) {
	const problems = problemsFor();
	problems.forEach( ( x ) => process.stdout.write( `${ x }\n` ) );
	process.stdout.write( problems.length ? `[check-focus-switch-home] ${ problems.length } problem(s)\n` : '[check-focus-switch-home] OK\n' );
	process.exit( problems.length ? 1 : 0 );
} else {
	process.stdout.write( 'usage: node scripts/check-focus-switch-home.js --survey [--json out] | --write | --check | --self-test\n' );
	process.exit( 2 );
}
