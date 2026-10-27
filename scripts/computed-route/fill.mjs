#!/usr/bin/env node
// Fill (FR-47-4): from a skeleton tree (which blocks, nested how, with the draft's words, each node naming the draft
// element it copies) to a tree resolved root-down in one pass, before anything is built.
//   node scripts/computed-route/fill.mjs --client <slug> --surface <name> --skeleton <file>
//        (--draft-url <url> | --draft-dir <folder> [--draft-index <file>]) --live-url <url>
//        [--out <dir>] [--open <regex>] [--cache <dir>] [--no-sweep] [--headed] [--allow-external] [--mirror <url> <file>]...
//   node scripts/computed-route/fill.mjs --serve <folder> [--draft-index <file>]    serve a draft folder until Ctrl-C
// Reads sites/<client>/build/surfaces.json (the surface's walker states), sites/<client>/theme-snapshot.json and the
// divergence ledger; writes into --out (and adds each width-threshold snap to that ledger as a `breakpoint-snap` entry): filled.tree.json, fill-report.md, fill-report.json, unmapped.json,
// handover.json, binding-groups.json, breakpoints.json, opener.json (the state a drawer or panel surface was opened with, the widths it rendered at and any state refused), the generated walker config and, when the draft's focus, press or link-state looks
// live in the theme, theme-snapshot.patch.json (the keys to merge into the client's theme-snapshot.json: Fill never
// edits it). It never builds a page and never writes the surface's own tree file. Beside the tree it writes <surface>.origin.json (cr-ref to tpl key and fingerprint) when the
// skeleton names its draft elements by tpl finder.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb, statesVocabulary } from './lib/db.mjs';
import { loadSnapshot } from './lib/normalise.mjs';
import { readTree, addRefs, refOf, walk } from './lib/tree.mjs';
import { lintSkeleton } from './lint.mjs';
import { load as loadLedger, addEntries } from './lib/ledger.mjs';
import { assertDraftPage, draftPageProblem, serveDraft } from './lib/draft.mjs';
import { skeletonNodes, skeletonProblems, cleanTree, expandSiteInfoRows, originMap } from './lib/fill-skeleton.mjs';
import { draftHashOf, stampOrigin } from './lib/origin-file.mjs';
import { readDraft } from './lib/fill-read.mjs';
import { stateOpener, readUrlOf, refusalRows, openedAt, describeWays } from './lib/fill-open.mjs';
import { openerRefusals } from './lib/fill-opener-refusals.mjs';
import { inputHashes, readSetFile } from './lib/census-reads.mjs';
import { fillTree } from './lib/fill-resolve.mjs';
import { fillStates } from './lib/fill-state.mjs';
import { sampleMotion } from './lib/fill-entrance.mjs';
import { confirmRecords, defectIndex } from './lib/fill-confirm.mjs';
import { imageRecords } from './lib/fill-media.mjs';
import { logoSizeWrites } from './lib/fill-logo-size.mjs';
import { widthLadderWrites } from './lib/fill-width-ladder.mjs';
import { stepRungWrites } from './lib/fill-step-rungs.mjs';
import { dimensionWrites } from './lib/fill-dimensions.mjs';
import { scrollbarPatch, mergePatch } from './lib/fill-scrollbar.mjs';
import { motionWrites } from './lib/fill-motion.mjs';
import { draftCssOf, templateOf } from './lib/fill-behaviour.mjs';
import { groupBindings, noFactsWarning } from './lib/fill-binding-group.mjs';
import { factsFile, loadFacts } from './lib/fact-record.mjs';
import { currentItemGroups } from './lib/fill-current-item.mjs';
import { widthGateWrites, maskHiddenVariants } from './lib/fill-width-gate.mjs';
import { addDefectLooks } from './lib/fill-state-defect.mjs';
import { draftDefectsFile, writeDraftDefects } from './lib/draft-defects-file.mjs';
import { presetWrites, dropPresetMotion } from './lib/fill-preset.mjs';
import { formWrites, formSources } from './lib/fill-form.mjs';
import { listContentWrites, logicReader, applyChildren } from './lib/fill-list-content.mjs';
import { loadShopParts, shopPartWrites } from './lib/fill-shop-parts.mjs';
import { shopPartTargets } from './lib/fill-shop-targets.mjs';
import { blockSchema } from './lib/resolve.mjs';
import { motionDb } from './lib/motion-db.mjs';
import { loadMotionSchema } from './lib/motion-schema.mjs';
import { sweepSteps } from './lib/fill-values.mjs';
import { walkerConfigs, WALK_WIDTHS } from './lib/fill-config.mjs';
import { walkerStates, walkRefusalRows } from './lib/walker-states.mjs';
import { fillReport, unmappedList, readFailureRows, passSettled } from './lib/fill-report.mjs';
import { calibrationFor } from './solve.mjs';
import { motionSettled, motionRejudged, transitionListOutcomes } from './lib/fill-motion-settle.mjs';
import { stateMap } from './lib/state-map.mjs';
import { readMediaMap } from './lib/fill-media.mjs';
import { assertCurrent } from './lib/freshness.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../..' );

// The calibration loader for one site: the route's own cache (solve.mjs::calibrationFor), or the cache files in `dir` (a
// run against another checkout's measured cache). Default paint comes from `site`'s own file only.
export function calibrationLoader( site, dir = null ) {
	return ( block ) => calibrationFor( block, site, dir ? path.resolve( dir ) : undefined );
}

// `--mirror <url> <file>` (repeatable) as { url: absolute file path }.
export function parseMirrors( argv ) {
	const out = {};
	argv.forEach( ( a, i ) => {
		if ( '--mirror' === a ) {
			if ( ! argv[ i + 1 ] || ! argv[ i + 2 ] ) {
				throw new Error( '--mirror takes a url and a file' );
			}
			out[ argv[ i + 1 ] ] = path.resolve( argv[ i + 2 ] );
		}
	} );
	return out;
}

const stamp = () => new Date().toISOString().replace( /[:.]/g, '-' ).slice( 0, 19 );

// The re-derived animation inventory (Spec 48 FR-48-25) from the client's intake: { records, rootComponent }, where
// rootComponent is the served index draft's component (else the inventory's first, entry, draft); no records when
// intake has not run.
function animationInventory( buildDir, draftIndex, log ) {
	const file = path.join( buildDir, 'intake', 'intake.json' );
	if ( ! fs.existsSync( file ) ) {
		log( `no ${ path.relative( REPO, file ) }: motion is not written` );
		return { records: [], rootComponent: null, draftDefects: [], flags: [] };
	}
	const intake = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	assertCurrent( intake, path.join( buildDir, '..', 'handoff' ), { label: path.relative( REPO, file ) } );
	const inv = intake.inventory?.animations || {};
	const drafts = inv.drafts || [];
	const entry = drafts.find( ( d ) => draftIndex && d.file === path.basename( draftIndex ) ) || drafts[ 0 ];
	return { records: inv.records || [], rootComponent: entry?.dc ?? null, draftDefects: intake.draftDefects || [], flags: intake.flags || [] };
}

// Runs Fill and writes its outputs. o: { client, surface, skeleton (a file), draftUrl | draftDir (+ draftIndex), liveUrl,
// out, open, cache, sweep (default true), headless (default true), external, mirror ({ url: local file } answered
// from disk), repo, log }. Returns the report object.
export async function fillSurface( o ) {
	const repo = o.repo || REPO;
	const log = o.log || ( () => {} );
	for ( const k of [ 'client', 'surface', 'skeleton', 'liveUrl' ] ) {
		if ( ! o[ k ] ) {
			throw new Error( `--${ k.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) } is required` );
		}
	}
	if ( ! o.draftUrl === ! o.draftDir ) {
		throw new Error( 'name the draft with exactly one of --draft-url and --draft-dir' );
	}
	const buildDir = path.join( repo, 'sites', o.client, 'build' );
	const surfaces = JSON.parse( fs.readFileSync( path.join( buildDir, 'surfaces.json' ), 'utf8' ) );
	const entry = surfaces[ o.surface ];
	if ( ! entry ) {
		throw new Error( `no surface "${ o.surface }" in sites/${ o.client }/build/surfaces.json` );
	}
	if ( ! entry.site ) {
		throw new Error( `surface "${ o.surface }" names no site in sites/${ o.client }/build/surfaces.json, so there is no default paint to read` );
	}
	const db = openDb();
	const snapshotFile = path.join( repo, 'sites', o.client, 'theme-snapshot.json' );
	const snapshot = loadSnapshot( snapshotFile );
	const rawSnapshot = JSON.parse( fs.readFileSync( snapshotFile, 'utf8' ) );
	const authored = readTree( o.skeleton );
	const problems = [ ...skeletonProblems( authored ), ...lintSkeleton( authored, db, path.basename( o.skeleton ) ) ];
	if ( problems.length ) {
		throw new Error( `the skeleton is not valid (R-47-10):\n- ${ problems.join( '\n- ' ) }` );
	}
	const skeleton = expandSiteInfoRows( authored );
	const outDir = path.resolve( o.out || path.join( buildDir, 'qa', 'fill', o.surface, stamp() ) );
	fs.mkdirSync( outDir, { recursive: true } );
	const tree = cleanTree( skeleton );
	addRefs( tree, o.surface );
	const nodes = skeletonNodes( skeleton );
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	// The skeleton writer's identity: every node that names its draft element by a tpl finder, kept beside the tree (the
	// built tree itself is unchanged). Written with the run's outputs, so a run that aborts (no draft page, no target read)
	// leaves the tracked file as it was; written only when the skeleton has any, so a hand-authored skeleton leaves no file.
	const origin = originMap( nodes, flat.map( ( n ) => refOf( n ) ) );
	const writeOrigin = () => {
		if ( ! Object.keys( origin ).length ) {
			return;
		}
		// FR-48-10: each entry carries the draft hash of the export it was derived from, so pairing refuses it after a re-export.
		const manifestFile = path.join( buildDir, '..', 'handoff', 'MANIFEST.json' );
		const hash = fs.existsSync( manifestFile ) ? draftHashOf( JSON.parse( fs.readFileSync( manifestFile, 'utf8' ) ) ) : null;
		fs.writeFileSync( path.join( buildDir, `${ o.surface }.origin.json` ), `${ JSON.stringify( hash ? stampOrigin( origin, hash ) : origin, null, 2 ) }\n` );
	};
	const served = o.draftDir ? await serveDraft( assertDraftPage( o.draftDir, o.draftIndex || null ), { index: o.draftIndex || null } ) : null;
	const url = served ? served.url : o.draftUrl;
	try {
		// The state vocabulary (FR-48-81): a DB seeded before the states table reads no state looks, and says so.
		const vocab = statesVocabulary( db );
		if ( vocab.missing ) {
			log( vocab.missing );
		}
		// FR-48-13: the surface's sc-if rows from its generated state map, so the reader also enters the draft's own logic
		// states (lib/fill-logic-state.mjs); none when intake has not run.
		const intakeFile = path.join( buildDir, 'intake', 'intake.json' );
		const logicRows = fs.existsSync( intakeFile ) && vocab.rows.length ? stateMap( { surfaces, surface: o.surface, intake: JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ), vocab: vocab.rows } ).scIf : [];
		const facts = fs.existsSync( factsFile( repo, o.client ) ) ? loadFacts( o.client, { repo } ) : null;
		// The entry draft's component and the draft defects intake lists (the served root host is named `Root`, the fact record names it after the component).
		const intakeParts = animationInventory( buildDir, o.draftIndex, log );
		const currentGroups = facts ? currentItemGroups( facts, intakeParts.rootComponent ) : [];
		// A drawer or mega-menu panel exists only while its draft state holds: the opener (lib/fill-open.mjs) names the state
		// from the surface's handoff record, and a route-mounted component is read on its own route. Null for any other surface.
		const intakeData = fs.existsSync( intakeFile ) ? JSON.parse( fs.readFileSync( intakeFile, 'utf8' ) ) : null;
		const skeletonRecord = intakeData?.skeletons?.[ entry.intakeSurface ] ?? null;
		const handoffFile = path.join( repo, 'sites', o.client, 'handoff', 'surfaces.json' );
		const handoffRecord = skeletonRecord && fs.existsSync( handoffFile ) ? ( JSON.parse( fs.readFileSync( handoffFile, 'utf8' ) ).records || [] ).find( ( r ) => r.id === skeletonRecord.id ) : null;
		const opener = stateOpener( { entry, skeleton: skeletonRecord, record: handoffRecord, facts, rootComponent: intakeParts.rootComponent } );
		// A page surface or a state-driven surface is read at its route; a state-page draft opens it by state (lib/state-route.mjs).
		const readUrl = readUrlOf( { url, opener, record: skeletonRecord, routing: intakeData?.routing } );
		opener && log( opener.state ? `state opener: ${ describeWays( opener ) } on ${ opener.component }${ opener.route && '*' !== opener.route ? ` at ${ opener.route }` : '' }${ opener.dropped.length ? ` (not offered: ${ opener.dropped.map( ( d ) => d.key ).join( ', ' ) })` : '' }` : `state opener refused: ${ opener.refused.map( ( r ) => r.reason ).join( '; ' ) }` );
		// FR-48-60 to FR-48-62: the draft elements of the shop parts (build/shop-parts.json locators) are measured at their parts' slots.
		const calFor = calibrationLoader( entry.site, o.cache );
		const shopRecord = loadShopParts( buildDir );
		const shopTargets = shopPartTargets( { record: shopRecord, nodes, facts, rootComponent: intakeParts.rootComponent, db, calFor } );
		// The skeleton inventory beside the skeleton: the draft rendered on this surface (the list pass reads a loop's copies
		// from it) and the place of each slot's draft element (a part drawn outside its block's).
		const invFile = o.skeleton.replace( /\.skeleton\.json$/, '.inventory.json' );
		const inventory = invFile !== o.skeleton && fs.existsSync( invFile ) ? JSON.parse( fs.readFileSync( invFile, 'utf8' ) ) : null;
		const reads = await readDraft( { url: readUrl, nodes, open: o.open || null, opener, headless: o.headless ?? true, sweep: o.sweep ?? true, external: !! o.external, mirror: o.mirror || {}, states: vocab.rows, logicRows, currentGroups, log } );
		// FR-48-69: a state declaration the draft never paints (intake.json `draftDefects`) is built from the code value, as a code look.
		maskHiddenVariants( reads, nodes, facts, intakeParts.rootComponent );
		const defectLooks = addDefectLooks( { reads, jobs: nodes.flatMap( ( n ) => n.targets.map( ( t ) => ( { id: t.id, finder: t.finder } ) ) ), facts, draftDefects: intakeParts.draftDefects, rootComponent: intakeParts.rootComponent } );
		const ledgerFile = path.join( buildDir, 'qa', 'divergences.json' );
		const result = fillTree( {
			tree, nodes, reads, db, calFor, origin: reads.origin,
			// FR-48-30: the confirmed page map (a draft's #/route link is written as that page's permalink); null before intake.
			pages: fs.existsSync( path.join( buildDir, 'page-map.json' ) ) ? JSON.parse( fs.readFileSync( path.join( buildDir, 'page-map.json' ), 'utf8' ) ) : null,
			// FR-48-39: the uploaded images of the surface's site (a null map when media-upload has not run).
			media: { map: readMediaMap( path.join( buildDir, 'media-map.json' ) ), site: entry.site },
			snapshot, rawSnapshot, facts, rootComponent: intakeParts.rootComponent,
			fixtures: JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-fixtures.json' ), 'utf8' ) ),
			ledger: loadLedger( ledgerFile ),
			ledgerStates: Object.entries( entry.states || {} ).filter( ( [ , v ] ) => null === v ).map( ( [ k ] ) => k ),
		} );
		// FR-48-81: each target's state looks, through the settings that hold their states.
		const states = fillStates( { tree, nodes, reads, calFor, db, snapshot } );
		result.writes.push( ...states.writes );
		result.notes.push( ...defectLooks.listed.map( ( d ) => `draft defect ${ d.draftId } (${ d.state } ${ d.prop }, ${ d.declared }): the draft never paints it; built from the code value ${ JSON.stringify( d.built ) } by width; listed for Bean (intake.json draftDefects, FR-48-69)` ), ...defectLooks.gaps.map( ( g ) => `draft defect ${ g.draftId } (${ g.state } ${ g.prop }${ g.width ? ` at ${ g.width }px` : '' }): not built: ${ g.reason }` ) );
		// FR-48-69: the client's draft-defects list, rebuilt from intake (when intake has run) with the value each defect was built as.
		if ( fs.existsSync( path.join( repo, 'sites', o.client, 'build', 'intake', 'intake.json' ) ) ) {
			writeDraftDefects( draftDefectsFile( { client: o.client, repo, listed: defectLooks.listed } ), { client: o.client, repo } );
		}
		result.unmapped.push( ...states.unmapped );
		// A state whose surface never rendered is refused, never read as a closed surface: its gap row names the state and why.
		const widthsOpen = Object.entries( reads.opener?.widths || {} ).filter( ( [ , v ] ) => v.ok ).map( ( [ w ] ) => Number( w ) );
		const readRefused = opener ? [ ...opener.refused, ...openerRefusals( { opener, readWidths: reads.opener?.widths || {} } ) ] : [];
		result.unmapped.push( ...refusalRows( { opener: { ...opener, refused: readRefused }, nodes, flat, refOf } ) );
		// Spec 48 §3.6: the walker walks every state the surface maps, each at the widths it holds at; a state it cannot open
		// is a gap row naming it, never a state silently left unwalked.
		const walkOpener = opener?.state ? { ...opener, openedAt: openedAt( opener, reads.opener?.widths ) } : null;
		const walk = walkerStates( { entry, record: handoffRecord, facts, rootComponent: intakeParts.rootComponent, vocab: vocab.rows, opener: walkOpener, widths: WALK_WIDTHS } );
		result.unmapped.push( ...walkRefusalRows( { walk, id: skeletonRecord?.id ?? null, nodes, flat, refOf } ) );
		log( `walker states: ${ walk.states.map( ( st ) => `${ st.name }${ st.widths ? ` at ${ st.widths.join( ',' ) }` : '' }` ).join( ', ' ) }${ walk.refused.length ? `; not walked: ${ walk.refused.map( ( r ) => `${ r.state } (${ r.reason })` ).join( '; ' ) }` : '' }` );
		// A logo whose width changes with the screen is written as its per-device size (lib/fill-logo-size.mjs).
		const logos = logoSizeWrites( { nodes, flat, refOf, reads, db, unmapped: result.unmapped } );
		result.writes.push( ...logos.writes );
		// Each row a pass wrote or settled (its `answered` list) is a settled row naming the pass (lib/fill-report.mjs::passSettled).
		( result.settled ??= [] ).push( ...passSettled( result.unmapped, logos.unmapped, 'logo-size', logos.answered ) );
		result.unmapped = logos.unmapped;
		result.notes.push( ...logos.notes );
		// A per-width difference no single setting holds, then a block's built-in size against the draft's (lib/fill-width-ladder.mjs, lib/fill-dimensions.mjs); their divergence-ledger entries are added to the client's ledger.
		const ladder = widthLadderWrites( { nodes, flat, refOf, reads, db, unmapped: result.unmapped, calFor, snapshot, scope: o.surface, entries: loadLedger( ledgerFile ) } );
		addEntries( ledgerFile, ladder.ledger );
		const dims = dimensionWrites( { nodes, flat, refOf, reads, db, unmapped: ladder.unmapped, calFor, snapshot, scope: o.surface, entries: loadLedger( ledgerFile ) } );
		addEntries( ledgerFile, dims.ledger );
		result.writes.push( ...ladder.writes, ...dims.writes );
		result.settled.push( ...passSettled( result.unmapped, ladder.unmapped, 'width-ladder', ladder.answered ), ...passSettled( ladder.unmapped, dims.unmapped, 'dimension', dims.answered ) );
		result.unmapped = dims.unmapped;
		result.notes.push( ...ladder.notes, ...dims.notes );
		// A step between the read widths that a written per-device setting cannot hold, as a scoped @media rule at the draft's threshold (lib/fill-step-rungs.mjs).
		const stepRungs = stepRungWrites( { nodes, flat, refOf, reads, writes: result.writes, scope: o.surface, entries: loadLedger( ledgerFile ) } );
		addEntries( ledgerFile, stepRungs.ledger );
		result.writes.push( ...stepRungs.writes );
		result.notes.push( ...stepRungs.notes );
		// FR-48-86: each custom-CSS rule's gaps row (the native control it could become), carried in fill-report.json.
		result.customCssGaps = stepRungs.gaps;
		// FR-48-50: content the draft's logic shows or hides by width, written as hiding settings (lib/fill-width-gate.mjs); a snapped
		// threshold's `breakpoint-snap` entry is added to the client's divergence ledger (the file Fill reads), once.
		const gates = widthGateWrites( { nodes, flat, refOf, facts, db, scope: o.surface, entries: loadLedger( ledgerFile ), rootComponent: intakeParts.rootComponent } );
		addEntries( ledgerFile, gates.ledger );
		result.writes.push( ...gates.writes );
		result.unmapped.push( ...gates.unmapped );
		result.notes.push( ...gates.notes );
		// FR-48-51: a button whose looks equal a theme button preset is written as that variant and nothing per instance.
		const presets = presetWrites( { nodes, flat, refOf, reads, rawSnapshot, snapshot, writes: result.writes, db } );
		result.writes = presets.writes;
		result.notes.push( ...presets.notes );
		// FR-48-57: each form field's settings from the draft's control and logic (lib/fill-form.mjs).
		const forms = formWrites( { nodes, flat, refOf, reads, facts, flags: intakeParts.flags, db, component: intakeParts.rootComponent, sources: formSources( o.draftDir, facts, intakeParts.rootComponent ) } );
		result.writes.push( ...forms.writes );
		result.unmapped.push( ...forms.unmapped );
		result.settled.push( ...forms.settled );
		result.notes.push( ...forms.notes );
		// FR-48-82: a block holding a list (an array setting, or one kind of child block) takes the items the draft draws,
		// read from the surface's skeleton inventory and the draft's logic (lib/fill-list-content.mjs); the logic is read from
		// the draft folder (--draft-dir, else the surface's `draftDir`, else the client's handoff folder), also when the draft is served by URL.
		const listed = listContentWrites( { nodes, flat, refOf, facts, inventory, idxFor: logicReader( o.draftDir || path.join( repo, entry.draftDir || path.join( 'sites', o.client, 'handoff' ) ) ), db, schemaOf: blockSchema, media: { map: readMediaMap( path.join( buildDir, 'media-map.json' ) ), site: entry.site, origin: reads.origin }, pages: fs.existsSync( path.join( buildDir, 'page-map.json' ) ) ? JSON.parse( fs.readFileSync( path.join( buildDir, 'page-map.json' ), 'utf8' ) ) : null, rootComponent: intakeParts.rootComponent, picturesOf: ( id ) => [ 1440, 768, 375 ].map( ( w ) => reads.widths[ w ]?.[ id ]?.pictures ).find( Boolean ) ?? null } );
		result.writes.push( ...listed.writes );
		result.unmapped.push( ...listed.unmapped );
		result.handover.push( ...listed.handover );
		result.notes.push( ...listed.notes );
		// FR-48-60 to FR-48-62: the draft's own values of the shop parts (build/shop-parts.json) on the blocks that hold them.
		const shop = shopPartWrites( { record: shopRecord, nodes, flat, refOf, attrExists: ( b, a ) => Object.hasOwn( blockSchema( b ) || {}, a ), writes: result.writes } );
		result.writes.push( ...shop.writes );
		result.unmapped.push( ...shop.unmapped );
		result.notes.push( ...shop.notes, ...shopTargets.notes );
		// FR-48-8: the draft's scrollbar colours, written to the theme's scrollbar tokens (the same snapshot patch).
		const bars = scrollbarPatch( { nodes, flat, refOf, reads, snapshot, site: rawSnapshot?.settings?.custom?.scrollbar } );
		states.patch = mergePatch( states.patch, bars.patch );
		states.patchEntries.push( ...bars.entries );
		result.unmapped.push( ...bars.unmapped );
		result.notes.push( ...bars.notes );
		const patchFile = states.patchEntries.length ? 'theme-snapshot.patch.json' : null;
		result.notes.push( ...states.held.map( ( h ) => `${ h.node } (${ h.slot }) ${ h.prop } ${ h.state }: ${ h.reason }` ) );
		// Motion (Spec 48 FR-48-78): the draft's motion records from intake's re-derived inventory, written as each
		// node's sgsMotion, with every target's entrance and endless animations sampled at 375, 768 and 1440 as the render
		// check (and the source of the values the code computes at run time).
		const jobs = nodes.flatMap( ( n ) => n.targets.map( ( t ) => ( { id: t.id, finder: t.finder } ) ) );
		const { entrances: sampled, loops, opened: motionOpened } = await sampleMotion( { url: readUrl, jobs, open: o.open || null, opener, headless: o.headless ?? true, external: !! o.external, mirror: o.mirror || {} } );
		// A state the motion sampler could not open at a width sampled nothing there: a row naming the state and the widths.
		const motionRefused = opener ? openerRefusals( { opener, motionWidths: motionOpened } ) : [];
		result.unmapped.push( ...refusalRows( { opener: { ...opener, refused: motionRefused }, nodes, flat, refOf } ) );
		const refused = [ ...readRefused, ...motionRefused ];
		const entrances = nodes.filter( ( x ) => x.targets.length ).map( ( n ) => ( { node: refOf( flat[ n.index ] ), block: n.name, measured: sampled[ n.targets[ 0 ].id ]?.[ 1440 ] ?? null } ) );
		const motion = motionWrites( { nodes, flat, refOf, records: intakeParts.records, rootComponent: intakeParts.rootComponent, sampled, loops, mdb: motionDb( db ), db, schema: loadMotionSchema(), rawSnapshot, template: templateOf( facts ), draftCss: draftCssOf( o.draftDir, o.draftIndex ), reads, calFor } );
		result.writes.push( ...motion.writes );
		result.unmapped.push( ...motion.unmapped );
		// The resting timing and rest-length rows a motion part's written hover state holds (lib/fill-motion-settle.mjs).
		const moved = motionSettled( { unmapped: result.unmapped, writes: motion.writes, nodes, flat, refOf, mdb: motionDb( db ), db, calFor, reads, rawSnapshot } );
		result.settled.push( ...passSettled( result.unmapped, moved.unmapped, 'motion', moved.answered ) );
		result.unmapped = moved.unmapped;
		// A resting timing the stylesheet shows (settled equal) on an element the written layer times is judged by the layer.
		const rejudged = motionRejudged( { settled: result.settled, writes: motion.writes, nodes, flat, refOf, mdb: motionDb( db ), db, calFor, rawSnapshot } );
		result.settled = rejudged.settled;
		result.unmapped.push( ...rejudged.unmapped );
		result.handover.push( ...motion.handover );
		// R2: where a button's painted preset holds the draft's hover transform, the instance motion leaves its transform channels.
		const lift = dropPresetMotion( { lifted: presets.lifted, flat, writes: result.writes } );
		result.writes = lift.writes;
		result.notes.push( ...lift.notes );
		// The resting transition-property and transition-behavior reads: settled where live transitions the draft's properties, else raised.
		const lists = transitionListOutcomes( { nodes, flat, refOf, reads, writes: result.writes, mdb: motionDb( db ), db, calFor } );
		result.settled.push( ...lists.settled );
		result.unmapped.push( ...lists.unmapped );
		result.notes.push( ...motion.notes.map( ( x ) => `${ x.node } ${ x.block }${ x.slot ? ` (${ x.slot })` : '' }: ${ x.text }` ) );
		// The site-wide options the draft's behaviours set (the route fade): `sgs_motion_settings` keys, merged over what the site holds when site-build applies them.
		const siteOptions = motion.site.length ? { option: 'sgs_motion_settings', records: motion.site.map( ( s ) => s.record ), value: Object.assign( {}, ...motion.site.map( ( s ) => s.settings ) ) } : null;
		// FR-48-41: the written settings that one {{ }} style binding feeds on two or more elements, grouped (binding-groups.json);
		// the bindings are read from the fact record's holes; none when intake has not run.
		const bound = groupBindings( { facts, nodes, writes: result.writes, rootComponent: intakeParts.rootComponent } );
		bound.skipped && console.warn( noFactsWarning( path.relative( repo, factsFile( repo, o.client ) ).split( path.sep ).join( '/' ) ) );
		result.notes.push( ...bound.groups.map( ( g ) => `binding ${ g.binding } sets ${ g.attr } to ${ JSON.stringify( g.value ) } on ${ g.members.length } elements in ${ g.sections } sections: one shared setting` ), ...bound.split.map( ( x ) => `binding ${ x.binding } sets ${ x.attr } to ${ x.values.length } different values: not grouped` ) );
		// Rows the element already renders (lib/fill-held.mjs) leave UNMAPPED and are listed under their reason in the report.
		Object.assign( result, result.settleHeld( result ) );
		// R7: a declared read that failed is an UNMAPPED row with its reason, never only a log line.
		result.unmapped.push( ...readFailureRows( { reads, nodes, flat, refOf } ) );
		// FR-48-8: every written style value against what the draft's code declares, at each read width.
		// A state write is judged by the state check (lib/state-check.mjs), never against the resting read.
		result.confirm = confirmRecords( { writes: result.writes.filter( ( w ) => ! [ 'motion', 'width-gate', 'preset', 'width-ladder', 'dimension' ].includes( w.how ) && ! w.state ), nodes, reads, defects: defectIndex( intakeParts.draftDefects ), rootComponent: intakeParts.rootComponent, calFor } );
		// FR-48-8: a declaration that asks the device safe-area inset is named once per element and property.
		result.notes.push( ...[ ...new Set( result.confirm.filter( ( r ) => r.safeArea ).map( ( r ) => `${ r.node } ${ r.block } ${ r.property }: ${ r.safeArea.note }` ) ) ] );
		result.confirm.push( ...imageRecords( { images: result.images } ) );
		const steps = sweepSteps( reads.sweep, ( id ) => ( { node: refOf( flat[ Number( id.split( ':' )[ 0 ] ) ] ), slot: id.slice( id.indexOf( ':' ) + 1 ) } ) );
		const report = fillReport( { client: o.client, surface: o.surface, draft: o.draftDir ? `${ o.draftDir } (served locally)` : url, nodes: nodes.length, targets: nodes.reduce( ( t, n ) => t + n.targets.length, 0 ), ...result, steps, entrances, snapshotPatch: { file: patchFile, entries: states.patchEntries }, sweepSkipped: false === o.sweep } );
		const divergences = fs.existsSync( ledgerFile ) ? path.relative( outDir, ledgerFile ).split( path.sep ).join( '/' ) : null;
		const cfg = walkerConfigs( { surface: o.surface, nodes, tree, inventory, draftUrl: readUrl, liveUrl: o.liveUrl, open: o.open || null, opener: walkOpener, divergences, state: Object.keys( entry.states || {} )[ 0 ] || 'opening', walk } );
		const put = ( name, text ) => fs.writeFileSync( path.join( outDir, name ), text );
		writeOrigin();
		// A list host's new children join the tree last: every pass above reads the tree by its skeleton's node indices.
		applyChildren( flat, listed.children );
		put( 'filled.tree.json', `${ JSON.stringify( tree, null, 2 ) }\n` );
		siteOptions && put( 'site-options.json', `${ JSON.stringify( siteOptions, null, 2 ) }\n` );
		put( 'fill-report.md', report.markdown );
		put( 'fill-report.json', JSON.stringify( report.json, null, 1 ) );
		if ( patchFile ) {
			put( patchFile, `${ JSON.stringify( states.patch, null, 2 ) }
` );
		}
		put( 'unmapped.json', JSON.stringify( unmappedList( result.unmapped ), null, 1 ) );
		opener && put( 'opener.json', `${ JSON.stringify( { surface: o.surface, id: opener.id, component: opener.component, route: opener.route, state: opener.state, keys: opener.keys, dropped: opener.dropped, expect: opener.expect, ways: opener.ways, widths: reads.opener?.widths || {}, widthsOpen, refused }, null, 1 ) }
` );
		put( 'binding-groups.json', JSON.stringify( bound, null, 1 ) );
		put( 'handover.json', JSON.stringify( result.handover, null, 1 ) );
		put( 'breakpoints.json', JSON.stringify( steps, null, 1 ) );
		// FR-48-8 (R7): the run's read set, bound to the skeleton and draft it read, so `census.mjs <run> --check` can prove
		// every declared value on a paired part ended written, held or unwritten (lib/census-reads.mjs::readSetFile).
		if ( o.draftDir ) {
			const rel = ( file ) => path.relative( repo, path.resolve( file ) );
			const inputs = inputHashes( { root: repo, skeleton: rel( o.skeleton ), draft: rel( path.join( o.draftDir, o.draftIndex || 'index.html' ) ) } );
			put( 'reads.json', JSON.stringify( readSetFile( { client: o.client, surface: o.surface, run: path.basename( outDir ), inputs, reads, nodes, refs: flat.map( ( n ) => refOf( n ) ) } ), null, 1 ) );
		}
		put( cfg.baseFile, cfg.baseText );
		put( cfg.fullFile, cfg.fullText );
		return { ...report.json, outDir, tree };
	} finally {
		await served?.close();
	}
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	try {
		if ( flag( '--serve' ) ) {
			const s = await serveDraft( flag( '--serve' ), { index: flag( '--draft-index' ) } );
			console.log( `serving ${ flag( '--serve' ) } at ${ s.url } (Ctrl-C to stop)` );
			const pageProblem = draftPageProblem( flag( '--serve' ), flag( '--draft-index' ) );
			pageProblem && console.log( `warning: ${ pageProblem }; a reader opening ${ s.url } (SGS_DRAFT_URL) matches nothing` );
			process.on( 'SIGINT', () => s.close().then( () => process.exit( 0 ) ) );
		} else {
			const r = await fillSurface( {
				client: flag( '--client' ), surface: flag( '--surface' ), skeleton: flag( '--skeleton' ), draftUrl: flag( '--draft-url' ), draftDir: flag( '--draft-dir' ), draftIndex: flag( '--draft-index' ),
				liveUrl: flag( '--live-url' ), out: flag( '--out' ), open: flag( '--open' ), cache: flag( '--cache' ), sweep: ! argv.includes( '--no-sweep' ), headless: ! argv.includes( '--headed' ), external: argv.includes( '--allow-external' ), mirror: parseMirrors( argv ),
				log: ( m ) => console.log( m ),
			} );
			console.log( `fill ${ r.surface }: ${ r.counts.writes } settings written, ${ r.counts.unmapped } UNMAPPED, ${ r.counts.handover } handover, ${ r.counts.fluid } fluid, ${ r.counts.breakpointSteps } breakpoint steps. Report: ${ path.join( r.outDir, 'fill-report.md' ) }` );
		}
	} catch ( e ) {
		// The stack goes to the log; the message stays the last line, which site-run reports.
		console.error( e.stack || e );
		console.error( e.message );
		process.exit( 2 );
	}
}
