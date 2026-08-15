/**
 * survey-wrapper-capability.js
 *
 * PHASE 0 CENSUS for the shared-wrapper decomposition.
 *
 * Answers, per consuming block × per wrapper control, three questions that this
 * project has repeatedly collapsed into one — and reports them SEPARATELY,
 * because the gap between them is the defect class:
 *
 *   DECLARED  the attribute exists in that block's block.json
 *   RENDERED  the control actually mounts in that block's inspector
 *   CONSUMED  the value can reach paint for that block
 *
 * A control is LIVE only when all three hold.
 *
 * ⭐ THE THING THIS SCRIPT EXISTS TO GET RIGHT: `kind` is TWO CHANNELS.
 *
 *   EDITOR kind — the `kind` prop on <ContainerWrapperControls>, which selects a
 *                 KIND_PANELS array. Measured: NEVER 'section'.
 *   PAINT  kind — argument 4 of SGS_Container_Wrapper::render() in render.php,
 *                 which gates which PHP layers emit. Measured: 'section' for 7
 *                 blocks.
 *
 * RENDERED resolves against the editor channel; CONSUMED against the paint
 * channel. They disagree for those 7 blocks, so a census built on one input is
 * wrong for every one of them. The wrapper's own in-file comment, Spec 31 §13.6
 * and the first draft of the plan behind this script all conflated the two.
 *
 * DELIBERATELY NOT A GREP. A grep for the component name matches COMMENTS and
 * has produced a wrong consumer list four times in this repo — most recently 8
 * false consumers, every one a comment, while writing the warning about it. All
 * mount detection is delegated to findMounts() in check-shared-panel-schema.js,
 * which blanks comments first and is itself self-tested.
 *
 * Triad (project standard): --survey only, for now. --fix and --check belong to
 * the prune and split phases and are deliberately not implemented here.
 *
 * Usage:
 *   node scripts/surveys/survey-wrapper-capability.js --survey
 *   node scripts/surveys/survey-wrapper-capability.js --json
 *   node scripts/surveys/survey-wrapper-capability.js --self-test
 *   node scripts/surveys/survey-wrapper-capability.js --self-test-demonstrate-failure
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const schema = require( '../check-shared-panel-schema.js' );
const kindLib = require( './lib/php-kind-consumption.js' );
const controlLib = require( './lib/control-detection.js' );

const ROOT = path.join( __dirname, '..', '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const WRAPPER_JS = path.join(
	BLOCKS_DIR,
	'container',
	'components',
	'ContainerWrapperControls.js'
);
const WRAPPER_PHP = path.join(
	ROOT,
	'includes',
	'class-sgs-container-wrapper.php'
);

const ALL_KINDS = kindLib.ALL_KINDS;

// ---------------------------------------------------------------------------
// Paint kind — argument 4 of SGS_Container_Wrapper::render()
// ---------------------------------------------------------------------------

/**
 * Extract the paint kind(s) a block's render.php passes to the wrapper.
 *
 * Comments are blanked first: `SGS_Container_Wrapper::render()` appears in
 * docblocks far more often than in code (measured: 27 code calls against ~40
 * prose mentions), so a naive scan reports phantom consumers.
 *
 * A block may call render() more than once on different branches (card-grid
 * calls it three times), so this returns a SET.
 *
 * @param {string} renderPhpPath Absolute path to a block's render.php.
 * @return {{kinds: string[], calls: number, dynamic: boolean}} Paint kinds found.
 */
function paintKindsOf( renderPhpPath ) {
	if ( ! fs.existsSync( renderPhpPath ) ) {
		return { kinds: [], calls: 0, dynamic: false };
	}
	const blanked = kindLib.blankPhpComments(
		fs.readFileSync( renderPhpPath, 'utf8' )
	);

	const kinds = new Set();
	let calls = 0;
	let dynamic = false;

	const re = /SGS_Container_Wrapper::render\s*\(/g;
	let m;
	while ( ( m = re.exec( blanked ) ) !== null ) {
		calls++;
		// Walk arguments at paren depth 1, splitting on top-level commas.
		let depth = 0;
		let arg = 0;
		let buf = '';
		let found = null;
		for ( let i = m.index + m[ 0 ].length - 1; i < blanked.length; i++ ) {
			const c = blanked[ i ];
			if ( c === '(' || c === '[' ) {
				depth++;
				if ( depth === 1 ) {
					continue;
				}
			} else if ( c === ')' || c === ']' ) {
				depth--;
				if ( depth === 0 ) {
					break;
				}
			}
			if ( depth === 1 && c === ',' ) {
				if ( arg === 3 ) {
					found = buf;
					break;
				}
				arg++;
				buf = '';
				continue;
			}
			buf += c;
		}
		if ( found === null && arg === 3 ) {
			found = buf;
		}
		if ( found === null ) {
			continue;
		}
		const literal = found.match( /'(section|layout|content)'/ );
		if ( literal ) {
			kinds.add( literal[ 1 ] );
		} else if ( found.trim() !== '' ) {
			dynamic = true;
		}
	}

	return { kinds: [ ...kinds ], calls, dynamic };
}

// ---------------------------------------------------------------------------
// Census
// ---------------------------------------------------------------------------

function readJson( p ) {
	return JSON.parse( fs.readFileSync( p, 'utf8' ) );
}

function blockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR )
		.filter( ( d ) =>
			fs.existsSync( path.join( BLOCKS_DIR, d, 'block.json' ) )
		)
		.sort();
}

/**
 * Build the full census.
 *
 * @return {Object} Census result.
 */
function buildCensus() {
	const wrapperSrc = fs.readFileSync( WRAPPER_JS, 'utf8' );
	const panelAttrShape = schema.buildPanelAttrShapeTable( wrapperSrc );
	const kindPanels = schema.buildKindPanelsTable( wrapperSrc );

	const phpSrc = fs.readFileSync( WRAPPER_PHP, 'utf8' );
	const { kindsByAttr, unresolvedComputedReads } =
		kindLib.analyseKindConsumption( phpSrc );

	// SHARED-COMPONENT CORPUS. A control mounted from a block does its writing in
	// the component's file. Scanning only per-block edit.js reported 36 colour
	// controls as missing that are all live — see attrsFromIndirectionMaps().
	const sharedComponentFiles = [];
	for ( const dir of [
		path.join( ROOT, 'src', 'components' ),
		path.join( BLOCKS_DIR, 'container', 'components' ),
	] ) {
		if ( ! fs.existsSync( dir ) ) {
			continue;
		}
		for ( const f of fs.readdirSync( dir ) ) {
			if ( f.endsWith( '.js' ) ) {
				sharedComponentFiles.push( path.join( dir, f ) );
			}
		}
	}
	const sharedControlled = controlLib.attrsFromSharedComponents(
		( f ) => schema.blankComments( fs.readFileSync( f, 'utf8' ) ),
		sharedComponentFiles
	);

	const consumers = [];
	const asymmetries = [];

	for ( const dir of blockDirs() ) {
		const blockDir = path.join( BLOCKS_DIR, dir );
		const bj = readJson( path.join( blockDir, 'block.json' ) );
		const mounts = schema.findMounts( blockDir, bj.name, kindPanels );
		if ( ! mounts.length ) {
			continue;
		}

		// RENDERED — union of every panel every mount pulls in, minus attrs
		// suppressed by a prop on that mount.
		const renderedAttrs = new Map(); // attr -> panel
		const editorKinds = new Set();
		const panelsMounted = new Set();
		let unclear = false;

		for ( const mount of mounts ) {
			if ( mount.unclear ) {
				unclear = true;
				continue;
			}
			if ( mount.kindOf === 'aggregator' ) {
				editorKinds.add( mount.rawKind );
			}
			for ( const panel of mount.panels ) {
				panelsMounted.add( panel );
				for ( const attr of ( panelAttrShape.get( panel ) || new Map() ).keys() ) {
					if ( mount.suppressed && mount.suppressed.has( attr ) ) {
						continue;
					}
					renderedAttrs.set( attr, panel );
				}
			}
		}

		const declared = new Set( Object.keys( bj.attributes || {} ) );
		const paint = paintKindsOf( path.join( blockDir, 'render.php' ) );

		const controls = [];
		for ( const [ attr, panel ] of [ ...renderedAttrs ].sort() ) {
			const consumedKinds = kindsByAttr.get( attr ) || [];
			const consumed =
				paint.kinds.length > 0 &&
				paint.kinds.some( ( k ) => consumedKinds.includes( k ) );
			controls.push( {
				attr,
				panel,
				declared: declared.has( attr ),
				rendered: true,
				consumed,
				consumedUnderKinds: consumedKinds,
				live: declared.has( attr ) && consumed,
			} );
		}

		// ORPHANS — the inverse gap, and the one the decomposition is actually
		// about.
		//
		// `declared == rendered` across the board is guaranteed, not discovered:
		// check-shared-panel-schema.js is a PREBUILD GATE that fails the build on
		// exactly that mismatch. Reporting it as a finding would be reporting that
		// a passing gate passes.
		//
		// The real question for a decomposition is the other direction: what does
		// this block CARRY that it cannot control? A wrapper attribute the block
		// declares (so it occupies schema, stored content and paint) while no
		// mounted panel offers the client any way to set it. sgs/physics-canvas is
		// the extreme — it paints the full 45-attr section surface and mounts a
		// 2-attr WidthPanel.
		// ⛔ SCOPE CORRECTION 2026-08-14. This set was originally built from the
		// PANEL table — every attribute some wrapper panel writes a control for.
		// That definition is blind by construction to an attribute NO panel
		// controls at all, which is the worst case, not an edge case:
		// sgs/container declares the entire overlay family
		// (backgroundOverlayColour + 4 overlayGradient*), the wrapper PHP paints
		// all five, and no panel and no block-private control writes any of them.
		// Measured against the panel table they were invisible.
		//
		// The honest denominator is what the wrapper CAN PAINT, so an attribute
		// with no control anywhere is counted rather than skipped.
		const allWrapperAttrs = new Set( kindsByAttr.keys() );
		for ( const attrs of panelAttrShape.values() ) {
			for ( const a of attrs.keys() ) {
				allWrapperAttrs.add( a );
			}
		}
		// An orphan is a CANDIDATE, not a defect. A block may deliberately decline
		// the shared control and write the same attribute from its own inspector —
		// sgs/gallery does exactly that for `layout`/`columns`, because the shared
		// LayoutPanel offers Stack/Flex/Grid while gallery's enum is
		// Grid/Masonry/Carousel and WordPress silently coerces the mismatch.
		//
		// Reporting the raw list as dead capability would repeat this repo's
		// recorded "a survey leg is a candidate list, not a defect list" error. So
		// each orphan is split by whether the block writes it itself.
		// ⛔ MUST be the JS blanker, not the PHP one. Measured 2026-08-14: the PHP
		// blanker over container/edit.js destroyed 58% of the file's non-space
		// content (14,129 → 5,960 chars), because JSX closing tags, regex literals
		// and apostrophes desync a PHP string-skipper. Every attribute probed
		// against that output reported "no control found", which silently inflated
		// the orphan count and deflated the self-controlled count.
		const ownEditSrc = ( () => {
			const p = path.join( blockDir, 'edit.js' );
			return fs.existsSync( p )
				? schema.blankComments( fs.readFileSync( p, 'utf8' ) )
				: '';
		} )();

		// Control detection is delegated to control-detection.js, which resolves
		// computed keys, tier maps and native supports. The two regexes that used
		// to live here saw only a literal `attr:` inside setAttributes — the one
		// shape this codebase mostly does NOT use — and the orphan count was
		// unusable in both directions as a result.
		const ownControls = controlLib.findControlledAttrs( ownEditSrc, bj ).controlled;
		// A control reached through a mounted shared component counts. Scoping
		// this to the block's own file is the blind spot that produced 36 false
		// "missing control" findings.
		const writesItself = ( attr ) =>
			ownControls.has( attr ) || sharedControlled.has( attr );

		const orphanAll = [ ...declared ]
			.filter( ( a ) => allWrapperAttrs.has( a ) && ! renderedAttrs.has( a ) )
			.sort();
		const orphans = orphanAll.filter( ( a ) => ! writesItself( a ) );
		const selfControlled = orphanAll.filter( writesItself );

		const editorKindList = [ ...editorKinds ];
		const asym =
			paint.kinds.length > 0 &&
			editorKindList.length > 0 &&
			! editorKindList.every( ( k ) => paint.kinds.includes( k ) );
		if ( asym || ( paint.kinds.includes( 'section' ) && ! editorKindList.includes( 'section' ) ) ) {
			asymmetries.push( {
				block: bj.name,
				editorKinds: editorKindList,
				paintKinds: paint.kinds,
				route: editorKindList.length ? 'aggregator' : 'direct-panels',
			} );
		}

		consumers.push( {
			block: bj.name,
			route: editorKindList.length ? 'aggregator' : 'direct-panels',
			editorKinds: editorKindList,
			paintKinds: paint.kinds,
			paintCalls: paint.calls,
			paintDynamic: paint.dynamic,
			panels: [ ...panelsMounted ].sort(),
			unclear,
			controls,
			orphans,
			selfControlled,
			counts: {
				rendered: controls.length,
				declared: controls.filter( ( c ) => c.declared ).length,
				consumed: controls.filter( ( c ) => c.consumed ).length,
				live: controls.filter( ( c ) => c.live ).length,
				orphaned: orphans.length,
				selfControlled: selfControlled.length,
			},
		} );
	}

	return {
		consumers,
		asymmetries,
		kindsByAttr: Object.fromEntries( kindsByAttr ),
		unresolvedComputedReads,
		panelSizes: Object.fromEntries(
			[ ...panelAttrShape ].map( ( [ p, a ] ) => [ p, a.size ] )
		),
		kindPanels: Object.fromEntries(
			[ ...kindPanels ].map( ( [ k, v ] ) => [ k, [ ...v ] ] )
		),
	};
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printSurvey( census ) {
	const w = process.stdout.write.bind( process.stdout );
	w( '[survey-wrapper-capability --survey]\n\n' );

	w( 'KIND_PANELS (editor channel):\n' );
	for ( const [ k, panels ] of Object.entries( census.kindPanels ) ) {
		const attrs = panels.reduce(
			( n, p ) => n + ( census.panelSizes[ p ] || 0 ),
			0
		);
		w( `  ${ k.padEnd( 8 ) } ${ panels.length } panels, ${ attrs } attrs — ${ panels.join( ', ' ) }\n` );
	}

	w( `\nCONSUMERS: ${ census.consumers.length }\n\n` );
	w( '  block                      route          editor    paint            R    D    C   LIVE\n' );
	w( '  ' + '-'.repeat( 96 ) + '\n' );
	for ( const c of census.consumers ) {
		w(
			'  ' +
				c.block.padEnd( 26 ) +
				c.route.padEnd( 15 ) +
				( c.editorKinds.join( '/' ) || '—' ).padEnd( 10 ) +
				( c.paintKinds.join( '/' ) || '—' ).padEnd( 15 ) +
				String( c.counts.rendered ).padStart( 4 ) +
				String( c.counts.declared ).padStart( 5 ) +
				String( c.counts.consumed ).padStart( 5 ) +
				String( c.counts.live ).padStart( 6 ) +
				'\n'
		);
	}

	w( `\nEDITOR-vs-PAINT ASYMMETRY: ${ census.asymmetries.length } blocks\n` );
	for ( const a of census.asymmetries ) {
		w(
			`  ${ a.block.padEnd( 26 ) } editor=${ ( a.editorKinds.join( '/' ) || 'none (direct panels)' ).padEnd( 22 ) } paint=${ a.paintKinds.join( '/' ) }\n`
		);
	}

	const byKind = {};
	for ( const [ attr, kinds ] of Object.entries( census.kindsByAttr ) ) {
		const key = kinds.join( '+' ) || 'NONE';
		( byKind[ key ] = byKind[ key ] || [] ).push( attr );
	}
	w( '\nPAINT REACH per attribute (branch-aware):\n' );
	for ( const key of Object.keys( byKind ).sort() ) {
		w( `  [${ key }] ${ byKind[ key ].length }: ${ byKind[ key ].sort().join( ', ' ) }\n` );
	}

	const notLive = [];
	for ( const c of census.consumers ) {
		for ( const ctl of c.controls ) {
			if ( ! ctl.live ) {
				notLive.push( { block: c.block, ...ctl } );
			}
		}
	}
	w( `\nRENDERED BUT NOT LIVE: ${ notLive.length } cells\n` );
	const undeclared = notLive.filter( ( n ) => ! n.declared );
	const unconsumed = notLive.filter( ( n ) => n.declared && ! n.consumed );
	w( `  undeclared (WP discards the write): ${ undeclared.length }\n` );
	w( `  declared but never reaches paint at this block's kind: ${ unconsumed.length }\n` );
	w( '  NOTE: declared==rendered is ENFORCED by the check-shared-panel-schema\n' );
	w( '  prebuild gate, so a 0 here restates a passing gate — it is not a discovery.\n' );

	const withOrphans = census.consumers.filter( ( c ) => c.orphans.length );
	const totalOrphans = withOrphans.reduce( ( n, c ) => n + c.orphans.length, 0 );
	w( `\n⭐ ORPHANED CAPABILITY — declared + paintable, but NO control mounted:\n` );
	w( `   ${ totalOrphans } attributes across ${ withOrphans.length } blocks\n` );
	w( '   Control detection resolves literal keys, COMPUTED keys, tier maps and\n' );
	w( '   native supports (control-detection.js). Remaining known blind spot: a\n' );
	w( '   control whose write happens inside a shared component this block passes\n' );
	w( '   an attr NAME to under a prop this detector does not yet recognise.\n' );
	w( '   Verify a row in the live editor before deleting anything on its word.\n\n' );
	for ( const c of withOrphans.sort( ( a, b ) => b.orphans.length - a.orphans.length ) ) {
		w( `  ${ c.block.padEnd( 26 ) } ${ String( c.orphans.length ).padStart( 2 ) }  ${ c.orphans.join( ', ' ) }\n` );
	}

	if ( census.unresolvedComputedReads.length ) {
		w( `\n⚠ UNRESOLVED computed-key reads in the wrapper PHP: ${ census.unresolvedComputedReads.length }\n` );
		for ( const r of census.unresolvedComputedReads ) {
			w( `    :${ r.line }  ${ r.text.slice( 0, 80 ) }\n` );
		}
	}
}

module.exports = { paintKindsOf, buildCensus };

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if ( require.main === module ) {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) || argv.includes( '--self-test-demonstrate-failure' ) ) {
		require( './lib/wrapper-capability-selftest.js' ).run(
			argv.includes( '--self-test-demonstrate-failure' )
		);
	} else {
		const census = buildCensus();
		if ( argv.includes( '--json' ) ) {
			process.stdout.write( JSON.stringify( census, null, 2 ) + '\n' );
		} else {
			printSurvey( census );
		}
		process.exit( 0 );
	}
}
