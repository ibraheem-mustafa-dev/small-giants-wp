#!/usr/bin/env node
// The clone difference ledger: every difference between a cloned surface and its draft at each width, element by element
// (boxes and the full painted look), each put down to exactly one pipeline stage with the record row that shows it.
//   node scripts/computed-route/tools/clone-ledger.mjs <client> --surface <slug> --site <scratch copy | http address>
//        [--records <build dir>] [--fill <fill run dir>] [--out <dir>] [--widths 375,768,1440]
//        [--draft-url <url>] [--live-url <url>] [--build-diff <wp-build-page diff file>]
// --records: the client's build folder holding skeleton/, qa/fill/, qa/apply/ and surfaces.json (default
// sites/<client>/build of this checkout); the draft is served from that checkout's handoff folder unless --draft-url names
// it. --fill: the Fill run whose report and Filled tree were built (default the newest run holding fill-report.json).
// --build-diff: the build's read-back (wp-build-page.js writes <tmp>/wp-build-page-<post id>-diff.json when the editor
// changed what it saved); without it the default file is used when it is newer than the Fill run, else the Filled tree is
// taken as built. --site: a scratch copy (local-mediatest*) named in calibration-targets, or an http address; the ledger
// only views pages there (no editor, no write).
// Pairing (lib/ledger-pairs.mjs): skeleton node i is the live block printing cr-ref-<surface>-<i>; its draftRef and draftSlots
// are its draft elements. Comparison (lib/ledger-diff.mjs): the parity walker's collector and comparePair. Stage
// (lib/ledger-stage.mjs): from the inventory, proposal, Fill report, built tree and apply plan.
// Writes <out>/ledger.json and <out>/LEDGER.md (default out: <records>/qa/ledger/<surface>/). Exit 0 (a report), 2 usage.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ledgerTargets, unpairedDraft, builtAttributes, refsOfContent, applyIndex } from '../lib/ledger-pairs.mjs';
import { readPage } from '../lib/ledger-page.mjs';
import { pairDiffs, paintsOf, TOLERANCE } from '../lib/ledger-diff.mjs';
import { stageOf, fillIndex, unpairedStage } from '../lib/ledger-stage.mjs';
import { mergeWidths, innermostText, summarise, ledgerMarkdown } from '../lib/ledger-report.mjs';
import { markFollows } from '../lib/ledger-follow.mjs';
import { PROPS as FILL_PROPS, loadChromium } from '../lib/fill-read.mjs';
import { serveDraft } from '../lib/draft.mjs';
import { routeHash } from '../lib/fill-open.mjs';
import { readTargets, targetOf, siteUrl, SCRATCH_NAME } from '../lib/site-targets.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '../../..' );
const argv = process.argv.slice( 2 );
const flag = ( name, dflt = null ) => {
	const i = argv.indexOf( name );
	return -1 === i ? dflt : argv[ i + 1 ];
};
const client = argv[ 0 ] && ! argv[ 0 ].startsWith( '--' ) ? argv[ 0 ] : null;
const surface = flag( '--surface' );
const site = flag( '--site' );
if ( ! client || ! surface || ! site ) {
	console.error( 'usage: clone-ledger.mjs <client> --surface <slug> --site <scratch copy | url> [--records <dir>] [--fill <dir>] [--out <dir>] [--widths 375,768,1440] [--draft-url <url>] [--live-url <url>] [--build-diff <file>]' );
	process.exit( 2 );
}
const records = path.resolve( flag( '--records', path.join( REPO, 'sites', client, 'build' ) ) );
const recordsRepo = path.resolve( records, '../../..' );
const widths = flag( '--widths', '375,768,1440' ).split( ',' ).map( Number );
const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );
const maybe = ( f ) => ( fs.existsSync( f ) ? readJson( f ) : null );

const started = Date.now();
const entry = readJson( path.join( records, 'surfaces.json' ) )[ surface ];
if ( ! entry ) {
	console.error( `${ surface } is not in ${ path.join( records, 'surfaces.json' ) }` );
	process.exit( 2 );
}
const skel = ( ext ) => path.join( records, 'skeleton', `${ surface }.${ ext }.json` );
const inventory = readJson( skel( 'inventory' ) );
const proposal = maybe( skel( 'proposal' ) );
const skeleton = readJson( skel( 'skeleton' ) );
const fillRoot = path.join( records, 'qa', 'fill', surface );
const fillDir = flag( '--fill' ) ? path.resolve( flag( '--fill' ) ) : fs.readdirSync( fillRoot ).sort().reverse().map( ( d ) => path.join( fillRoot, d ) ).find( ( d ) => fs.existsSync( path.join( d, 'fill-report.json' ) ) );
const report = readJson( path.join( fillDir, 'fill-report.json' ) );
const filled = readJson( path.join( fillDir, 'filled.tree.json' ) );
const applyPlan = maybe( path.join( records, 'qa', 'apply', `${ surface }.plan.json` ) );
const notes = [ `records ${ records }; Fill run ${ path.basename( fillDir ) }; apply plan ${ applyPlan ? 'read' : 'none' }` ];

// The build's read-back, when it is newer than the Fill run.
const postId = entry.target?.postId;
const diffFile = flag( '--build-diff' ) || ( postId ? path.join( process.env.TMP || process.env.TEMP || '/tmp', `wp-build-page-${ postId }-diff.json` ) : null );
let lastLoad = null;
if ( diffFile && fs.existsSync( diffFile ) && ( flag( '--build-diff' ) || fs.statSync( diffFile ).mtimeMs > fs.statSync( path.join( fillDir, 'fill-report.json' ) ).mtimeMs ) ) {
	lastLoad = refsOfContent( readJson( diffFile ).lastLoad, surface );
	notes.push( `built tree: the build's read-back ${ diffFile } (${ lastLoad.size } refs) over the Filled tree` );
} else {
	notes.push( 'built tree: the Filled tree (the build saved no read-back newer than this Fill run), with the apply plan\'s written operations laid over it' );
}

// The live address.
let base = site;
if ( ! /^https?:\/\//.test( site ) ) {
	if ( ! SCRATCH_NAME.test( site ) ) {
		console.error( `${ site } is not a scratch copy (local-mediatest*): the ledger reads only scratch copies or an address you name` );
		process.exit( 2 );
	}
	base = siteUrl( targetOf( site, readTargets() ), REPO );
}
base = base.replace( /\/+$/, '' );
const pageMap = maybe( path.join( records, 'page-map.json' ) ) || [];
// The page the surface is: its page-map row by post id (a header, footer or drawer is no page and is read on the home page).
const pageRow = entry.target?.postId ? pageMap.find( ( r ) => r.id === entry.target.postId && [ 'page', 'post' ].includes( r.postType ) ) : null;
const liveUrl = flag( '--live-url' ) || ( pageRow && 'home' !== pageRow.route ? `${ base }/${ pageRow.slug }/` : `${ base }/` );

// The draft address.
let served = null;
let draftUrl = flag( '--draft-url' );
if ( ! draftUrl ) {
	served = await serveDraft( path.join( recordsRepo, entry.draftDir ), { index: entry.draftIndex } );
	const hash = pageRow && 'home' !== pageRow.route ? routeHash( pageRow.route ) : null;
	draftUrl = `${ served.url }${ hash || '' }`;
}
notes.push( `draft ${ draftUrl }; live ${ liveUrl }` );

// Targets and read items.
const targets = ledgerTargets( skeleton, surface );
const unpaired = unpairedDraft( inventory, proposal, targets );
const draftItems = [];
const rootN = new Map();
targets.forEach( ( t, n ) => {
	if ( ! t.draftFinder ) {
		return;
	}
	if ( '' === t.slot ) {
		rootN.set( t.index, n );
	}
	draftItems.push( { n, finder: t.draftFinder, ...( null !== t.scope ? { scopeN: rootN.get( t.index ), scope: t.scope } : {} ) } );
} );
unpaired.forEach( ( u, i ) => draftItems.push( { n: `u${ i }`, finder: { tpl: u.key } } ) );
const liveItems = targets.map( ( t, n ) => ( { n, liveRoot: t.liveRoot, liveSlot: t.slot } ) );

const { chromium } = await loadChromium();
const browser = await chromium.launch();
const reads = {};
try {
	for ( const w of widths ) {
		const t0 = Date.now();
		reads[ w ] = { draft: await readPage( browser, draftUrl, w, draftItems ), live: await readPage( browser, liveUrl, w, liveItems ) };
		console.error( `read ${ w }: ${ Math.round( ( Date.now() - t0 ) / 1000 ) }s` );
	}
} finally {
	await browser.close();
	await served?.close();
}

// Differences and stages.
const ctx = {
	fill: fillIndex( report ),
	built: builtAttributes( filled, surface, applyPlan, lastLoad ),
	apply: applyIndex( applyPlan ),
	inventory: new Map( ( inventory.elements || [] ).map( ( e ) => [ e.key, e ] ) ),
	fillProps: new Set( FILL_PROPS ),
};
const rootOf = new Map( targets.map( ( t, n ) => [ t, n ] ).filter( ( [ t ] ) => '' === t.slot ).map( ( [ t, n ] ) => [ t.index, n ] ) );
const parentOf = ( index ) => targets.find( ( t ) => t.index === index && '' === t.slot )?.parent ?? null;
const liveSel = ( t ) => `${ t.liveRoot }${ t.slot ? ` > ${ t.slot }` : '' }`;
let raw = [];
const lacks = new Map();
for ( const w of widths ) {
	const { draft, live } = reads[ w ];
	targets.forEach( ( t, n ) => {
		const pn = null === t.parent ? null : ( t.slot ? rootOf.get( t.index ) : rootOf.get( t.parent ) );
		const d = t.draftFinder ? draft[ n ] : undefined;
		const l = live[ n ];
		if ( ! t.draftFinder ) {
			if ( l?.found && l.shown ) {
				raw.push( { id: t.id, index: t.index, ref: t.ref, block: t.block, slot: t.slot, draftKey: null, kind: 'presence', key: 'element', width: w, draft: 'no draft element', live: 'present', stage: 'no-node', proof: { record: 'skeleton', why: `skeleton node ${ t.index } (${ t.block }) carries no draftRef: the route added it with no draft element`, live: { selector: liveSel( t ), box: l.snap?.box || l.box || null } } } );
			}
			return;
		}
		const diffs = pairDiffs( d, l, null === pn ? null : draft[ pn ], null === pn ? null : live[ pn ] );
		const inv = t.draftKey ? ctx.inventory.get( t.draftKey ) : null;
		for ( const df of diffs ) {
			if ( inv && 'style' === df.kind && ! df.pseudo && undefined === inv.resolved?.[ w ]?.[ df.key ] ) {
				lacks.set( df.key, ( lacks.get( df.key ) || 0 ) + 1 );
			}
			const liveAt = { selector: liveSel( t ), box: l?.snap?.box || l?.box || null, value: df.live, ...( t.top ? { parent: l?.parent || null } : {} ) };
			const { stage, proof } = stageOf( { ...df, width: w }, t, { ...ctx, live: liveAt } );
			raw.push( { id: t.id, index: t.index, ref: t.ref, block: t.block, slot: t.slot, draftKey: t.draftKey, kind: df.kind, key: df.key, ...( df.pseudo ? { pseudo: df.pseudo } : {} ), ...( l?.byPart ? { byPart: true } : {} ), width: w, draft: df.draft, live: df.live, stage, proof } );
		}
	} );
}
const inner = innermostText( raw, parentOf );
raw = markFollows( inner.rows, targets );
if ( inner.dropped ) {
	notes.push( `${ inner.dropped } words rows of an element whose inner paired element has its own words row were folded into the inner row` );
}
const rows = mergeWidths( raw );
const byPart = [ ...new Set( raw.filter( ( r ) => r.byPart ).map( ( r ) => `${ r.ref } ${ r.slot }` ) ) ];
if ( byPart.length ) {
	notes.push( `paired by part (the slot path's sibling position is not on the live block, so its first element of the same part is read): ${ byPart.join( '; ' ) }` );
}

// Unpaired draft elements.
const unpairedRows = unpaired.map( ( u, i ) => {
	const shownAt = widths.filter( ( w ) => reads[ w ].draft[ `u${ i }` ]?.shown );
	const paints = [ ...new Set( shownAt.flatMap( ( w ) => paintsOf( reads[ w ].draft[ `u${ i }` ] ) ) ) ];
	const { stage, proof } = unpairedStage( u.row, u.owner, u.problems );
	return { draftKey: u.key, snippet: String( u.element.snippet || '' ).slice( 0, 120 ), widths: shownAt, paints, stage, proof, box: Object.fromEntries( shownAt.map( ( w ) => [ w, reads[ w ].draft[ `u${ i }` ]?.snap?.box || reads[ w ].draft[ `u${ i }` ]?.box || null ] ) ) };
} ).filter( ( u ) => u.widths.length );
const painted = unpairedRows.filter( ( u ) => u.paints.length );
for ( const u of painted ) {
	const live = u.proof.drawnBy ? `not paired: drawn, if at all, inside ${ u.proof.drawnBy.block } ${ u.proof.drawnBy.ref }, which has no part for it` : 'no live element';
	rows.push( { id: `draft:${ u.draftKey }`, ref: null, block: u.proof.drawnBy?.block || u.proof.block || null, slot: '', draftKey: u.draftKey, kind: 'presence', key: 'element', widths: u.widths, draft: `paints ${ u.paints.join( ', ' ) }`, live, stage: u.stage, proof: u.proof } );
}
notes.push( `${ unpairedRows.length } draft elements shown at some width are read by no target; ${ painted.length } of them paint something (a row each), ${ unpairedRows.length - painted.length } are layout-only wrappers (listed below, no row)` );
if ( lacks.size ) {
	notes.push( `the inventory lacks (no \`resolved\` value at that width) the property of ${ [ ...lacks.values() ].reduce( ( s, n ) => s + n, 0 ) } style differences, read from the served draft instead: ${ [ ...lacks ].sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).map( ( [ k, n ] ) => `${ k } ${ n }` ).join( ', ' ) }` );
}
notes.push( `tolerances: a colour per channel within 2/255 and alpha 0.02, a length within ${ TOLERANCE.px }px, a box within ${ TOLERANCE.box }px (the parity walker's sameValue and comparePair); x and y are the element's place inside its enclosing pair` );

const summary = summarise( rows );
const seconds = Math.round( ( Date.now() - started ) / 1000 );
const out = path.resolve( flag( '--out', path.join( records, 'qa', 'ledger', surface ) ) );
fs.mkdirSync( out, { recursive: true } );
fs.writeFileSync( path.join( out, 'ledger.json' ), JSON.stringify( { client, surface, site: base, liveUrl, draftUrl, widths, seconds, fillRun: fillDir, summary, rows, unpaired: unpairedRows, notes }, null, 1 ) );
fs.writeFileSync( path.join( out, 'LEDGER.md' ), ledgerMarkdown( { client, surface, site: base, widths, seconds, summary, rows, unpaired: unpairedRows, notes } ) );
console.log( `${ surface }: ${ rows.length } rows (${ Object.entries( summary.byStage ).map( ( [ s, n ] ) => `${ s } ${ n }` ).join( ', ' ) }); ${ seconds }s; ${ path.join( out, 'LEDGER.md' ) }` );
