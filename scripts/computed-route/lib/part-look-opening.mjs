// How part-look opens a surface no client file describes (Fill's read, lib/fill-part-look-modes.mjs: a new clone has no
// `sites/<client>/build/part-look.json`). Two facts the draft itself gives replace the hand-written opening steps:
// - The page a one-file draft shows a surface on is the route intake read for that surface (`intake.json` skeletons[...].route):
//   it becomes the surface's `route` (part-look.mjs::logicRouteOf; part-look.mjs::refusalOf refuses a one-file read without one).
// - A group that must locate one part every other part is read from (the basket drawer's panel, `mustLocate`) is opened through
//   the draft's own documented states: the handoff record (`sites/<client>/handoff/surfaces.json`, written by the Claude Design
//   hand-off for every draft) gives each state of a site-wide overlay a `how_to_reach`. Each one that is code (it compiles and
//   calls or sets something) is tried on the draft at 1440, as is the page with no step: the read that locates the must-locate
//   part with the most parts is the drawer filled (`init`). The other steps are then tried again with the group's `emptyPins`
//   anchors pinned to the filled read's elements (their template stamps), as part-look-run.mjs::readParts' second read pins them,
//   so only the same drawer counts (never another overlay with prices, such as a product configurator): the one locating the most
//   parts the filled read lacks is the drawer emptied (`empty`). Prose steps ("Add an item, then open") are skipped.
// - A visitor's own way in is tried too: on the product page, the add-to-basket control the shop parts record locates
//   (`buybox-add-to-basket`) is clicked twice (a basket of more than one), then the basket button the page shows at load (the drawer group's `trigger` part)
//   (visitorOpening; a documented step that sets a bag with half a record shows the empty drawer, a real add fills it).
// Nothing here is per client: a draft that documents no such state, or whose drawer no state opens, gets a refusal naming why.
import fs from 'node:fs';
import path from 'node:path';
import { serveDraft } from './draft.mjs';
import { loadChromium } from './fill-read.mjs';
import { READ_PROPS, findPartsInPage } from './fill-part-look.mjs';
import { openPage } from './part-look-run.mjs';

// The kinds of handoff record that draw over the page (the basket drawer, a bag panel, a modal), on every route.
const OVERLAY_KINDS = new Set( [ 'drawer', 'panel', 'modal' ] );

// Whether a `how_to_reach` is code the opening steps can run (part-look-run.mjs::runOpeningSteps gives it `L` and `dcLogic`).
export function isScript( text ) {
	const s = String( text ?? '' ).trim();
	if ( ! s || ! /[\w)\]]\s*\(|[^=!<>]=[^=]/.test( s ) ) {
		return false;
	}
	try {
		new Function( 'L', 'dcLogic', s ); // eslint-disable-line no-new, no-new-func
		return true;
	} catch {
		return false;
	}
}

// The opening steps a draft documents for its site-wide overlays: [ { record, state, script } ], one per distinct script.
export function documentedOpenings( records ) {
	const out = [];
	for ( const r of records || [] ) {
		if ( ! OVERLAY_KINDS.has( r.kind ) || ( r.route && '*' !== r.route ) ) {
			continue;
		}
		for ( const st of r.states || [] ) {
			isScript( st.how_to_reach ) && ! out.some( ( o ) => o.script === st.how_to_reach.trim() ) && out.push( { record: r.id ?? r.name ?? null, state: st.name ?? null, script: st.how_to_reach.trim() } );
		}
	}
	return out;
}

// The filled opening among the tried ones (probes: [ { script, label, located: [part], stamps: { part: { tpl, host } }, error } ], the
// page with no step first): the read locating every must-locate part, and every part that shows the drawer filled (`filledShows`,
// the group's `filledShows`: an item line) where any read does, with the most parts. Returns { init, filled, evidence } or { why }.
export function chooseOpenings( probes, mustLocate, filledShows = [] ) {
	const shown = probes.filter( ( p ) => ! p.error && mustLocate.every( ( m ) => p.located.includes( m ) ) );
	if ( ! shown.length ) {
		return { why: `no documented state of the draft shows its ${ mustLocate.join( ', ' ) } (tried ${ probes.length }: ${ probes.map( ( p ) => p.label ).join( '; ' ) })` };
	}
	const withItems = shown.filter( ( p ) => filledShows.every( ( m ) => p.located.includes( m ) ) );
	const ok = withItems.length ? withItems : shown;
	const filled = ok.reduce( ( best, p ) => ( p.located.length > best.located.length ? p : best ) );
	return { init: filled.script, filled, evidence: `filled: ${ filled.label } (${ filled.located.length } parts)` };
}

// The pins of the emptied tries: each `emptyPins` anchor ({ anchor: part }) pinned to the filled read's element for that part, or
// null when the filled read stamped none of them (then no emptied read is tried: another overlay could be read as the drawer).
export function pinsOf( emptyPins, filled ) {
	const pins = Object.fromEntries( Object.entries( emptyPins || {} ).flatMap( ( [ anchor, part ] ) => ( filled?.stamps?.[ part ]?.tpl ? [ [ anchor, filled.stamps[ part ] ] ] : [] ) ) );
	return Object.keys( pins ).length ? pins : null;
}

// The emptied opening among the pinned tries (the same drawer): of those locating a part the filled read lacks and none of its
// filled parts (`filledShows`: an item line), the barest one (the fewest parts: a drawer showing recommendations or a half-drawn
// record holds more than an empty basket), the most added parts breaking a tie; or null.
export function chooseEmptied( pinned, filled, filledShows = [] ) {
	const extra = ( p ) => p.located.filter( ( x ) => ! filled.located.includes( x ) ).length;
	const better = ( p, b ) => p.located.length < b.located.length || ( p.located.length === b.located.length && extra( p ) > extra( b ) );
	const best = pinned.filter( ( p ) => ! p.error && p.script !== filled.script && extra( p ) > 0 && ! filledShows.some( ( m ) => p.located.includes( m ) ) ).reduce( ( b, p ) => ( ! b || better( p, b ) ? p : b ), null );
	return best ? { empty: best.script, evidence: `emptied: ${ best.label } (${ extra( best ) } more parts)` } : null;
}

// The visitor's way in: { label, script: null, file, route, clicks } when the shop parts record locates the add-to-basket control
// (`adds`: [ { dc, tpl } ]) and the page as it loads shows the basket button (`load`: its probe), else null. product: { file, route },
// the product page the control is drawn on.
export function visitorOpening( { adds, load, product } ) {
	const trigger = load?.stamps?.trigger;
	const add = ( adds || [] )[ 0 ];
	if ( ! add?.tpl || ! trigger?.tpl || ! product?.file ) {
		return null;
	}
	return { label: 'add to the basket on the product page, then the basket button', script: null, file: product.file, route: product.route ?? null, clicks: [ { tpl: add.tpl, host: add.dc }, { tpl: add.tpl, host: add.dc }, trigger ] };
}

// Reads the handoff records of a client's draft (an empty list when there are none).
export function handoffRecords( repo, client ) {
	const file = path.join( repo, 'sites', client, 'handoff', 'surfaces.json' );
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ).records || [] : [];
}

// Tries each opening on the draft at one width and says which parts each locates. Each try opens its own page.
// withLoad: also try the page with no step (the filled tries; the emptied ones try steps only).
export async function probeOpenings( { draftDir, file, spec, names, pages, route = null, openings, withLoad = true, width = 1440 } ) {
	const { chromium } = await loadChromium();
	const served = await serveDraft( draftDir, { index: file } );
	const browser = await chromium.launch( { headless: true, args: [ '--hide-scrollbars' ] } );
	const out = [];
	try {
		for ( const o of [ ...( withLoad ? [ { script: null, label: 'the page as it loads' } ] : [] ), ...openings.map( ( x ) => ( x.clicks ? x : { script: x.script, label: `${ x.record } "${ x.state }"` } ) ) ] ) {
			let opened = null;
			const url = `${ served.url }${ encodeURIComponent( o.file ?? file ) }`;
			const at = o.file ? o.route : route;
			try {
				opened = await openPage( browser, { url, width, config: at || o.script || o.clicks ? { route: at ?? null, init: o.script, clicks: o.clicks } : null } );
				const found = await opened.page.evaluate( findPartsInPage, { spec, names, props: READ_PROPS, pages } );
				const stamps = Object.fromEntries( Object.entries( found ).filter( ( [ , l ] ) => l[ 0 ]?.tpl ).map( ( [ p, l ] ) => [ p, { tpl: l[ 0 ].tpl, host: l[ 0 ].host ?? null } ] ) );
				out.push( { ...o, located: Object.entries( found ).filter( ( [ , l ] ) => l.length ).map( ( [ p ] ) => p ), stamps } );
			} catch ( e ) {
				out.push( { ...o, located: [], error: String( e.message || e ).split( '\n' )[ 0 ] } );
			} finally {
				await opened?.ctx.close();
			}
		}
	} finally {
		await browser.close();
		await served.close();
	}
	return out;
}
