// One block's calibration (FR-47-2, FR-48-93): plans its instances, measures them incrementally or in full, folds the
// reads into a slot map and a default paint, and writes the outputs that are due.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { attrsFor, enumSettings, variantInfo } from './db.mjs';
import { blockSchema } from './resolve.mjs';
import { instancesDue, splitCalibration, writeSlotMap, writePaint, readSlotMap, readPaint, slotMapWriteDecision, refusedFile } from './cache.mjs';
import { isContainerQueryBlock, renderedNothingReason } from './calibrate-container.mjs';
import { unreadProps } from './calibrate-props.mjs';
import { READ_KEY, slotFor, foldReading, defaultPaint, longhands, discoverEffects, triggerFor, planInstances, instanceCtx, stateTarget, missedReason } from './calibrate.mjs';
import { contentRowsFor, planContentInstances, needlesOf, collectContent } from './calibrate-content.mjs';
import { stageClock } from './calibrate-timing.mjs';
import { measurePages, PageError } from './calibrate-pages.mjs';
import { codeIndex, fingerprints, fixtureKeyOf, fullBecause, planIncremental, paintMoved, canaryDiffers, mergeSlotMap, measureWithFallback } from './calibrate-incremental.mjs';

// Every attribute name the block declares today (its own and the shared extensions'), from the framework DB: the slot
// map refusal ignores a setting the block no longer has.
function declaredAttrs( db, block ) {
	return new Set( db.prepare( 'SELECT attr_name FROM block_attributes WHERE block_slug = ?' ).all( block ).map( ( r ) => r.attr_name ) );
}

// A paint state's paint: every property, or only `props` (the properties its render shape changes) where the state
// names them. A filtered state keeps no context keys (`_tag`, `_parentDisplay`, ...); Fill reads those from the default.
export function statePaint( elements, props ) {
	if ( ! Array.isArray( props ) ) {
		return elements;
	}
	return Object.fromEntries( Object.entries( elements ).map( ( [ p, widths ] ) => [ p, Object.fromEntries( Object.entries( widths ).map( ( [ w, styles ] ) => [ w, Object.fromEntries( Object.entries( styles || {} ).filter( ( [ k ] ) => props.includes( k ) ) ) ] ) ) ] ) );
}

// The paint states a fixture declares that a run did not measure.
export function missingPaintStates( fixture, paintStates ) {
	return ( fixture?.paintStates || [] ).map( ( s ) => s.name ).filter( ( n ) => ! paintStates?.[ n ] );
}

// The PHP files of the block's build, as text: the lines a setting's fingerprint covers.
function blockPhp( repo, short ) {
	const dir = path.join( repo, 'plugins/sgs-blocks/build/blocks', short );
	return fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '.php' ) && ! f.endsWith( '.asset.php' ) ).map( ( f ) => fs.readFileSync( path.join( dir, f ), 'utf8' ) ) : [];
}

// Folds a measurement's instances into the block's readings.
function foldMeasured( instances, { block, short, repo, fixture, states } ) {
	const untested = [ ...states ];
	// Default paint: every variant's elements (a path seen in several variants keeps the first).
	const elements = {};
	instances.filter( ( i ) => i.isDefault ).forEach( ( i ) => Object.entries( defaultPaint( i.read ) ).forEach( ( [ p, v ] ) => ( elements[ p ] ??= v ) ) );
	// Each paint state's own default paint, with the condition Fill matches a node against (lib/paint-state.mjs).
	const paintStates = Object.fromEntries( instances.filter( ( i ) => i.paintState && i.read ).map( ( i ) => [ i.paintState.name, { when: i.paintState.when, elements: statePaint( defaultPaint( i.read ), i.paintState.props ) } ] ) );
	// A state the fixture declares that was not measured (its instance rejected or unread): the paint is not written, so
	// the next run measures it again instead of keeping a paint key that claims the state.
	const statesMissing = missingPaintStates( fixture, paintStates );
	// A block whose tiers follow its container's width (an @container rule) reaches a tier at fewer page widths by design.
	// Either the built stylesheet holds an @container rule, or the render emits them at run time (site-footer-row's
	// built style-index.css has none, because the wrapper writes its tier rules when it renders).
	const containerQuery = isContainerQueryBlock( short, path.join( repo, 'plugins/sgs-blocks/build/blocks' ), path.join( repo, 'plugins/sgs-blocks/src/blocks' ) );
	const settings = {};
	const dead = [];
	const oneWidth = [];
	const discovered = {};
	instances.forEach( ( inst ) => {
		if ( inst.discover ) {
			const fx = discoverEffects( inst.def, inst.read );
			const d = ( discovered[ inst.discover.attr ] ??= {} );
			for ( const [ prop, e ] of Object.entries( fx ) ) {
				( d[ prop ] ??= { slots: [], values: {}, ...( inst.discover.tier ? { tier: inst.discover.tier } : {} ) } );
				d[ prop ].slots = [ ...new Set( [ ...d[ prop ].slots, ...e.slots ] ) ];
				d[ prop ].values[ inst.discover.value ] = e.value;
			}
			return;
		}
		if ( inst.content || ! inst.row ) {
			return;
		}
		const name = inst.row.attr_name;
		if ( [ 'hover', 'focus', 'class', 'open' ].includes( inst.trigger ) && inst.hoverMissed ) {
			untested.push( `${ name }:${ inst.row.css_state } (${ missedReason( inst.hoverWhy ) })` );
			return;
		}
		if ( 'scroll' === inst.trigger && inst.scrollMissed ) {
			untested.push( `${ name }:${ inst.row.css_state } (the header never took is-header-scrolled)` );
			return;
		}
		// A scrolled marker is compared with its variant's default read scrolled too, so the state's own look is not
		// counted as the marker's effect.
		const s = 'scroll' === inst.trigger
			? slotFor( inst.row, inst.marker, inst.defScrolled, inst.readScrolled, { containerQuery, own: stateTarget( block, inst.row ) } )
			: slotFor( inst.row, inst.marker, inst.def, inst.read, { containerQuery, own: stateTarget( block, inst.row ) } );
		foldReading( { settings, dead, oneWidth }, inst, s );
	} );
	// Dead: no marker of the setting changed anything (a setting with one live marker is not dead).
	const deadNames = [ ...new Set( dead ) ].filter( ( n ) => ! settings[ n ] );
	// text, presence and link are omitted entirely when the block has nothing of that kind.
	const content = collectContent( instances.filter( ( i ) => i.content && i.contentRead ) );
	return { elements, paintStates, statesMissing, settings, deadNames, oneWidth, discovered, content, untested: [ ...new Set( untested ) ] };
}

// The block's error in { block, error }, or its counts. due: { slotMap, paint } (lib/cache.mjs::dueOutputs).
export async function calibrateBlock( block, { site, target, env, shared, fixtures, snapshot, rawSnapshot, db, slotKey, paintKey, snapshotKey, due, rejectedOut, image, allowLoss = {}, cache, repo, recalibrate = false } ) {
	const short = block.replace( /^sgs\//, '' );
	const clock = stageClock();
	const fixture = fixtures[ block ];
	if ( ! fixture ) {
		return { block, error: 'no fixture in calibration-fixtures.json (not guessed)' };
	}
	// A block whose render returns before any output on this site is named here, before a page is built or waited on.
	const renderPhp = path.join( repo, 'plugins/sgs-blocks/src/blocks', short, 'render.php' );
	const why = renderedNothingReason( block, { renderSource: fs.existsSync( renderPhp ) ? fs.readFileSync( renderPhp, 'utf8' ) : '', rawSnapshot } );
	if ( why ) {
		return { block, error: why };
	}
	const schema = blockSchema( block ) || {};
	const rows = attrsFor( db, block ).filter( ( r ) => longhands( r.css_property ).length );
	// Preconditions come from the framework's own data: the block's variant slots and a media object on the site.
	const variant = variantInfo( db, block );
	const ctx = instanceCtx( variant, image, fixture );
	const plan = planInstances( block, { rows, enumRows: enumSettings( db, block ), schema, snapshot, fixture, ctx } );
	// Text, presence and link settings paint no CSS property, so attrsFor never returns them: they are queried by role
	// and planned apart (lib/calibrate-content.mjs), then read for existence, text and link attributes.
	const contentPlan = planContentInstances( block, { contentRows: contentRowsFor( db, block ), variant, schema, fixture, ctx } );
	const needles = needlesOf( contentPlan.instances );
	const noMarker = new Set( [ ...plan.noMarker, ...contentPlan.noMarker ] );
	// A state with no trigger (lib/calibrate.mjs::STATE_TRIGGERS) is reported, never calibrated.
	const states = rows.filter( ( r ) => r.css_state && undefined === triggerFor( r.css_state ) ).map( ( r ) => `${ r.attr_name }:${ r.css_state }` );
	const planned = [ ...plan.instances, ...contentPlan.instances ].filter( ( i ) => ! i.row || undefined !== i.trigger );
	const all = instancesDue( planned, due );
	const prev = readSlotMap( cache, block );
	const prevPaint = readPaint( cache, site, block );
	const prints = fingerprints( planned, codeIndex( blockPhp( repo, short ) ) );
	const fixtureKey = fixtureKeyOf( fixture );
	const declared = declaredAttrs( db, block );
	// FR-48-75: the Playwright and browser builds that produced this file; G0 treats a change in either as stale.
	const versions = { playwrightVersion: createRequire( import.meta.url )( 'playwright/package.json' ).version, browserVersion: shared.context.browser()?.version() ?? null };
	let fullWhy = due.slotMap ? fullBecause( { prev, prevPaint, fixtureKey, snapshotKey, readKey: READ_KEY, site, recalibrate, versions } ) : 'only the default paint is due';
	const incremental = fullWhy ? null : planIncremental( prev, planned, prints, slotKey, declared );
	if ( incremental?.unplanned.length ) {
		fullWhy = `${ incremental.unplanned.join( ', ' ) } no longer planned`;
	}
	const pageCtx = { fixture, site, target, env, shared, repo, treeFile: path.join( cache, `${ short }.tree.json` ), needles, clock, extraProps: unreadProps( rows ) };
	let run;
	try {
		run = await measureWithFallback( {
			why: fullWhy,
			all,
			plan: incremental,
			measure: async ( list ) => {
				const measured = await measurePages( block, list, pageCtx );
				return { ...measured, ...foldMeasured( measured.kept, { block, short, repo, fixture, states } ) };
			},
			verify: ( r ) => paintMoved( prevPaint.elements, r.elements )
				|| Object.keys( { ...prevPaint.paintStates, ...r.paintStates } ).map( ( n ) => paintMoved( prevPaint.paintStates?.[ n ]?.elements, r.paintStates?.[ n ]?.elements ) ).find( Boolean )
				|| canaryDiffers( prev, { settings: r.settings, discovered: r.discovered, ...r.content }, incremental.canary ),
		} );
	} catch ( e ) {
		if ( e instanceof PageError ) {
			return { block, error: e.message };
		}
		throw e;
	}
	const { reading } = run;
	const { kept, rejected, pages, elements, paintStates, statesMissing, settings, deadNames, oneWidth, discovered, content } = reading;
	rejectedOut.push( ...rejected.map( ( r ) => ( { block, ...r } ) ) );
	const measuredFile = { block, site, slotKey, paintKey, readKey: READ_KEY, fixtureKey, fingerprints: prints, ...versions, measured: new Date().toISOString(), settings, discovered, elements, ...( Object.keys( paintStates ).length ? { paintStates } : {} ), ...content, dead: deadNames, oneWidth, noMarker: [ ...noMarker ], untestedStates: reading.untested, rejected };
	const isIncremental = 'incremental' === run.mode;
	const mark = { chain: ( prev?.incremental?.chain || 0 ) + 1, lastFull: prev?.incremental?.lastFull ?? prev?.slotKey ?? null, lastFullAt: prev?.incremental?.lastFullAt ?? prev?.measured ?? null };
	const file = isIncremental ? { ...mergeSlotMap( prev, measuredFile, [ ...incremental.measure, ...incremental.canary ], declared ), incremental: mark } : measuredFile;
	// Only the output that is due is written.
	const { slotMap, paint } = splitCalibration( file );
	const decision = due.slotMap ? slotMapWriteDecision( prev, slotMap, allowLoss[ block ] || [], declared ) : { write: false, lost: [] };
	decision.write && writeSlotMap( cache, block, slotMap );
	decision.write && fs.rmSync( refusedFile( cache, block ), { force: true } );
	due.paint && ! statesMissing.length && writePaint( cache, site, block, paint );
	const counts = { mode: run.mode, ...( isIncremental ? { measuredSettings: incremental.measure.length, canary: incremental.canary.length } : { fullBecause: run.why } ), instances: kept.length, pages, timing: clock.summary() };
	if ( decision.lost.length ) {
		fs.writeFileSync( refusedFile( cache, block ), JSON.stringify( { ...slotMap, refusedBecause: { lost: decision.lost } }, null, 1 ) );
		const names = decision.lost.map( ( l ) => l.setting ).join( ', ' );
		return { block, error: `refused: the new slot map drops ${ names } that the existing one reaches; candidate kept in cache/${ short }.refused.json; pass --allow-loss ${ block }:<setting> to accept a named loss`, ...counts };
	}
	if ( due.paint && statesMissing.length ) {
		return { block, error: `paint state(s) ${ statesMissing.join( ', ' ) } not measured (rejected or unread); the default paint was not written, so the next run measures it again` };
	}
	// A paint-only run built only the default and paint-state instances (lib/cache.mjs::instancesDue).
	if ( ! due.slotMap ) {
		return { block, paintOnly: true, elements: Object.keys( elements ).length, paintStates: Object.keys( paintStates ).length, rejected: rejected.length, timing: clock.summary() };
	}
	return { block, settings: Object.keys( file.settings ).length, dead: ( file.dead || [] ).length, oneWidth: ( file.oneWidth || [] ).length, noMarker: noMarker.size, rejected: rejected.length, ...counts };
}
