// The skeleton writer's intake steps (Spec 48 §3.4 steps 1 and 2, FR-48-17, Appendix C `skeletons`): for every surface
// of one Claude Design export, the inventory (lib/skeleton-inventory.mjs) read inside the sandbox and determinism
// harness (lib/intake-harness.mjs, rest mode), then the block proposal per element (lib/skeleton-propose.mjs) from the
// framework database (read-only) and the client's saved decisions. The rows are the block-choice table of Bean's one
// review; finalising (§3.4 step 3) and the review page itself are later pieces. Nothing is written except screenshots
// into a caller-given folder.
//
// Surface roots come from handoff/surfaces.json records (`template_tpl_id`, `kind`, `name`, `dc`, `route`): an allowed
// hint that is checked against the construct census's template elements (lib/intake-census.mjs::staticCensus). A root
// the census does not hold, a record with no root, and a census header, footer, form or dialog element of a component no
// record of that kind names, are each a `surface-root` gap row (R-48-3). Skeleton surfaces are the CPT kinds (header,
// footer, drawer, each mega menu panel, each form, modal), the always-rendered globals, and each page route's main
// content root; the other kinds (backdrop, accordion, panel, form step, result) are states or parts of a parent
// surface and are listed as `parts`, never read on their own. A page surface is read from its route's <main>. A record whose
// root is the draft's <helmet> (the document head's styles and scripts, which render nothing on the page) and a record of a
// component the export carries no draft file for (a build report the handoff names but does not ship) are no site surface:
// each is listed in `parts` with its reason. A census <header> or <footer> of a component that a page record names, that no
// record of its kind claims while another component's record of that kind is the site's own, is that page's own header or
// footer (a checkout's own slim header in place of the site header): a surface of that kind on the page's route. With no
// record of the kind anywhere it is the site's own one left unrecorded, a gap row.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openHarness, settleRest } from './intake-harness.mjs';
import { mapPool, poolSize } from './intake-pool.mjs';
import { readInventory, INVENTORY_WIDTHS } from './skeleton-inventory.mjs';
import { proposeSkeleton } from './skeleton-propose.mjs';
import { formLinksFor } from './skeleton-form-link.mjs';
import { draftLinksFor } from './draft-link.mjs';
import { detectReferences } from './references.mjs';
import { loadFacts, decisionsProblems, REPO } from './skeleton-facts.mjs';
import { readDecisions, skeletonDir } from './skeleton-finalise.mjs';
import { readRouting } from './intake-routing.mjs';
import { stateRouteHash } from './state-route.mjs';
import { loadCalibration } from './cache.mjs';
import { openDb } from './db.mjs';
import { reachCalls } from './intake-reach-calls.mjs';
import { preconditionWays } from './intake-store-calls.mjs';
import { setDraftState, reachDraftState, fireTrigger, snapshotDraftState, restoreDraftState } from './intake-state.mjs';
import { widthStateKeys, waysHeldAt } from './state-reach.mjs';
import { openers, wayAt } from './intake-openers.mjs';
import { describeWay } from './state-openers.mjs';
import { readBreakpoints } from './intake-breakpoints.mjs';
import { templateOf } from './intake-run-collapse.mjs';
import { sourcesOf } from './freshness.mjs';
import { fingerprintsOf } from './identity.mjs';
import { carriedIds } from './skeleton-carried.mjs';
import { siteOf } from './skeleton-context.mjs';
import { componentScript } from './fill-form-success.mjs';
import { pageLandmark } from './intake-page-landmark.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const SURFACE_KINDS = [ 'header', 'footer', 'drawer', 'menu', 'form', 'modal', 'global', 'page' ];
// The census tags that are a CPT surface on their own, and the record kinds that may claim each.
const CENSUS_CPT = { header: [ 'header' ], footer: [ 'footer' ], form: [ 'form' ], dialog: [ 'modal', 'drawer' ] };
const ROOT_MARK = 'data-sgs-skeleton-root';
const gap = ( construct, draftId, error ) => ( { construct, draftId, error } );
const slug = ( s ) => String( s ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' ) || 'surface';

// The record's template ids as strings; the root is the last (the most specific: a mega panel's own branch inside the
// shared panel condition).
const tplsOf = ( r ) => ( null == r.template_tpl_id ? [] : [].concat( r.template_tpl_id ).map( String ) );

// The tab panels of a menu record that holds several panels as states of one record: every state that opens it (not
// "closed" or "default", setting a value) sets the same state keys, each to its own values (`{ mega: "sun" }`,
// `{ mega: "brands" }`), so each state shows its own panel. Returns those states, or [] for a menu with one open state
// (a hover state with no keys is no panel), states over different keys, or any other kind of record (a drawer's "open,
// empty" and "open, with items" are one surface's variants).
export function tabPanels( r ) {
	const open = 'menu' === r.kind ? ( r.states || [] ).filter( ( st ) => ! /^(closed|default)$/i.test( st.name || '' ) && Object.values( st.state_keys || {} ).some( ( v ) => null != v ) ) : [];
	const keysOf = ( st ) => Object.keys( st.state_keys ).sort().join( ',' );
	const same = open.every( ( st ) => keysOf( st ) === keysOf( open[ 0 ] ) );
	const own = new Set( open.map( ( st ) => JSON.stringify( Object.keys( st.state_keys ).sort().map( ( k ) => st.state_keys[ k ] ) ) ) ).size === open.length;
	return open.length > 1 && same && own ? open : [];
}

// The draft files an export ships (its MANIFEST.json `files`), or null when the folder has no manifest.
function exportFiles( folder ) {
	const file = folder ? path.join( folder, 'MANIFEST.json' ) : null;
	return file && fs.existsSync( file ) ? new Set( ( JSON.parse( fs.readFileSync( file, 'utf8' ) ).files || [] ).map( ( f ) => f.path ) ) : null;
}

// Surface roots from `folder/surfaces.json` (or `records`), checked against the census. Returns { surfaces, parts, gaps }:
// surfaces [{ id, name, kind, component, rootTpl, tpls, route, slug, selector, panel? (the tab state a panel surface of a
// several-panel menu record opens, tabPanels), pageOwn? (the page record whose own header or footer it is) }], parts [{ id,
// name, kind, parent, why }]. `files` (default: the folder's MANIFEST.json files) are the draft files the export ships;
// `siteName` (optional) is the name a page's own header may hold in place of a logo or navigation.
export function surfaceRoots( { folder, census, records = null, files = exportFiles( folder ), siteName = null } ) {
	const gaps = [];
	let recs = records;
	if ( ! recs ) {
		const file = path.join( folder, 'surfaces.json' );
		if ( ! fs.existsSync( file ) ) {
			return { surfaces: [], parts: [], gaps: [ gap( 'surface-root', 'surfaces.json', 'the export has no surfaces.json, so no surface root is known' ) ] };
		}
		recs = JSON.parse( fs.readFileSync( file, 'utf8' ) ).records || [];
	}
	const elements = new Map( census.rows.filter( ( r ) => 'template-element' === r.kind ).map( ( r ) => [ r.draftId, r ] ) );
	const components = new Set( census.rows.map( ( r ) => r.component ) );
	const surfaces = [];
	const parts = [];
	const slugs = new Set();
	const byId = new Map( recs.map( ( r ) => [ r.id, r ] ) );
	// The records a surface shows inside, root-most first (its `parent` chain): each one's root renders before the surface's
	// own can (a signed-in account page before its tabs' panels). A record with no root the census holds, or whose root is
	// the <helmet>, has nothing to open and is left out.
	const ancestorsOf = ( r ) => {
		const out = [];
		for ( let p = byId.get( r.parent ), seen = new Set(); p && ! seen.has( p.id ); seen.add( p.id ), p = byId.get( p.parent ) ) {
			const root = tplsOf( p ).at( -1 );
			const el = elements.get( `${ p.dc }:${ root }` );
			el && 'helmet' !== el.detail?.tag && out.unshift( { id: p.id, kind: p.kind, component: p.dc, rootTpl: root, states: p.states || [], openedBy: p.opened_by ?? null } );
		}
		return out;
	};
	for ( const r of recs ) {
		const tpls = tplsOf( r );
		const where = `${ r.id ?? '?' } ${ r.kind } "${ r.name }"`;
		if ( ! tpls.length ) {
			gaps.push( gap( 'surface-root', `${ r.dc }:${ r.id }`, `${ where } has no template_tpl_id` ) );
			continue;
		}
		if ( ! components.has( r.dc ) && files && ! files.has( `${ r.dc }.dc.html` ) ) {
			parts.push( { id: r.id, name: r.name, kind: r.kind, parent: r.parent ?? null, why: `the export ships no draft file for component "${ r.dc }" (MANIFEST.json files), so the record names nothing on the site` } );
			continue;
		}
		if ( ! components.has( r.dc ) ) {
			gaps.push( gap( 'surface-root', `${ r.dc }:${ tpls.at( -1 ) }`, `${ where } names component "${ r.dc }", which the census does not hold` ) );
			continue;
		}
		const missing = tpls.filter( ( n ) => ! elements.has( `${ r.dc }:${ n }` ) );
		if ( missing.length ) {
			gaps.push( gap( 'surface-root', `${ r.dc }:${ missing[ 0 ] }`, `${ where } names template id(s) ${ missing.join( ', ' ) }, which the census does not hold` ) );
			continue;
		}
		if ( 'helmet' === elements.get( `${ r.dc }:${ tpls.at( -1 ) }` ).detail?.tag ) {
			parts.push( { id: r.id, name: r.name, kind: r.kind, parent: r.parent ?? null, why: `its root ${ r.dc }:${ tpls.at( -1 ) } is the draft's <helmet> (the document head's styles and scripts), which renders nothing on the page` } );
			continue;
		}
		if ( ! SURFACE_KINDS.includes( r.kind ) ) {
			parts.push( { id: r.id, name: r.name, kind: r.kind, parent: r.parent ?? null, why: `a ${ r.kind } is a state or part of ${ r.parent ? `surface ${ r.parent }` : 'the page it shows on' }, read with it` } );
			continue;
		}
		// A menu record holding several tab panels is one surface per panel, each opened by its own tab's state.
		const panels = tabPanels( r );
		for ( const panel of panels.length ? panels : [ null ] ) {
			const base = 'page' === r.kind ? `page-${ slug( '/' === r.route ? 'home' : r.route ) }` : slug( panel ? `${ r.name } ${ panel.name }` : r.name );
			let s = base;
			for ( let i = 2; slugs.has( s ); i++ ) {
				s = `${ s.replace( /-\d+$/, '' ) }-${ i }`;
			}
			slugs.add( s );
			const rootTpl = tpls.at( -1 );
			surfaces.push( { id: r.id, name: panel ? `${ r.name }: ${ panel.name }` : r.name, kind: r.kind, component: r.dc, rootTpl, tpls, route: r.route ?? null, slug: s, rootTag: elements.get( `${ r.dc }:${ rootTpl }` ).detail.tag, selector: `[${ ROOT_MARK }="${ s }"]`, states: panel ? [ panel ] : r.states || [], openedBy: r.opened_by ?? null, ancestors: ancestorsOf( r ), ...( panel ? { panel: panel.name } : {} ) } );
		}
	}
	// A census CPT element (by tag) in a component that no record of a claiming kind names. A header or footer that is a real
	// landmark of one page (pageLandmark), while a record of that kind is the site's own, is that page's own header or footer:
	// a surface of its kind on the page's route.
	const claimed = ( component, kinds ) => recs.some( ( r ) => r.dc === component && kinds.includes( r.kind ) );
	for ( const e of elements.values() ) {
		const kinds = CENSUS_CPT[ e.detail.tag ];
		const tpl = e.draftId.slice( e.component.length + 1 );
		const site = [ 'header', 'footer' ].includes( e.detail.tag ) && recs.some( ( r ) => r.kind === e.detail.tag && ! ( r.dc === e.component && tplsOf( r ).at( -1 ) === tpl ) );
		const landmark = site ? pageLandmark( { tag: e.detail.tag, component: e.component, tpl, census, records: recs, tplsOf, siteName } ) : null;
		const page = landmark?.page ?? null;
		if ( kinds && page ) {
			let s = slug( `${ page.name } ${ e.detail.tag }` );
			for ( let i = 2; slugs.has( s ); i++ ) {
				s = `${ s.replace( /-\d+$/, '' ) }-${ i }`;
			}
			slugs.add( s );
			surfaces.push( { id: `${ page.id }:${ e.detail.tag }`, name: `${ page.name }: its own ${ e.detail.tag }`, kind: e.detail.tag, component: e.component, rootTpl: tpl, tpls: [ tpl ], route: page.route ?? null, slug: s, rootTag: e.detail.tag, selector: `[${ ROOT_MARK }="${ s }"]`, states: [], openedBy: null, ancestors: [], pageOwn: page.id } );
		} else if ( kinds && ! claimed( e.component, kinds ) && ! landmark?.heading ) {
			gaps.push( gap( 'surface-root', e.draftId, `the census holds a <${ e.detail.tag }> in ${ e.component } and surfaces.json has no ${ kinds.join( ' or ' ) } record for that component` ) );
		}
	}
	return { surfaces, parts, gaps };
}

// In-page: finds a surface's root element and marks it with ROOT_MARK. A rendered template element is its own root (the
// first copy whose nearest import host is the component); a non-rendering one (sc-if, sc-for, sc-else) is the nearest
// element holding every outermost element it stamps. A page surface's root is then the route's main content root: the
// nearest enclosing <main> (a page record may name only the page's first block, such as its hero), else the one <main>
// the named element holds (a page-file draft's record may name the file's outer wrapper, which also holds the site
// header and footer imports; those are surfaces of their own, so the page's tree never repeats them). Returns
// { copies, tag, viaCondition, viaMain } or { error }.
function markRoot( [ component, tpl, mark, attr, isPage ] ) {
	const hostName = ( e ) => e.parentElement?.closest( '.sc-host' )?.dataset.scName;
	const live = [ ...document.querySelectorAll( `[data-dc-tpl="${ tpl }"]` ) ].filter( ( e ) => hostName( e ) === component );
	let root = live[ 0 ];
	if ( ! root ) {
		const t = document.createElement( 'template' );
		t.innerHTML = window.__dcAnnotatedTemplate( component ) || '';
		const src = t.content.querySelector( `[data-dc-tpl="${ tpl }"]` );
		if ( ! src ) {
			return { error: `template id ${ tpl } is not in ${ component }'s stamped template` };
		}
		if ( ! /^sc-(if|for|else)$/.test( src.localName ) ) {
			return { error: `<${ src.localName }> ${ component }:${ tpl } is not rendered at this route and state` };
		}
		// The bare bindings the surface's own condition and every condition around it test (`{{ signed }}`, `{{ gift.on }}`).
		const needs = [];
		for ( let p = src; p; p = p.parentElement ) {
			const b = /^sc-(?:if|else)$/.test( p.localName ) ? /^\{\{\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\}\}$/.exec( p.getAttribute( 'value' ) || '' ) : null;
			b && needs.push( b[ 1 ] );
		}
		const ids = new Set( [ ...src.querySelectorAll( '[data-dc-tpl]' ) ].map( ( x ) => x.dataset.dcTpl ) );
		const els = [ ...document.querySelectorAll( '[data-dc-tpl]' ) ].filter( ( e ) => ids.has( e.dataset.dcTpl ) && hostName( e ) === component );
		const top = els.filter( ( e ) => ! els.some( ( o ) => o !== e && o.contains( e ) ) );
		if ( ! top.length ) {
			return { error: `<${ src.localName }> ${ component }:${ tpl } renders nothing at this route and state`, needs };
		}
		root = top[ 0 ];
		while ( top.length > 1 && ! top.every( ( e ) => root.contains( e ) ) ) {
			root = root.parentElement;
		}
	}
	const held = isPage ? root.querySelectorAll( 'main' ) : [];
	const main = isPage ? root.closest( 'main' ) || ( 1 === held.length ? held[ 0 ] : null ) : null;
	const viaMain = !! main && main !== root;
	root = main || root;
	document.querySelectorAll( `[${ attr }="${ mark }"]` ).forEach( ( e ) => e.removeAttribute( attr ) );
	root.setAttribute( attr, mark );
	return { copies: live.length, tag: root.tagName.toLowerCase(), viaCondition: ! live.length, viaMain };
}

// Where a surface is opened: { file, hash, query? } or { error }. A '*' or '/' route is the entry at its default route; a
// hash export opens `#<route>`; a page-file export opens the file a route names, with the route's query string (`query`,
// as a template page reads its item from `?id=…`); a state-page export sets the route's state.
export function visitOf( route, { entry, routing } ) {
	if ( null == route || '*' === route || '/' === route || '' === route ) {
		return { file: entry, hash: '' };
	}
	const r = routing();
	if ( r.error ) {
		return { error: r.error };
	}
	if ( 'hash' === r.adapter ) {
		return { file: entry, hash: route };
	}
	if ( 'files' === r.adapter ) {
		const [ place, frag = '' ] = route.replace( /^\//, '' ).split( '#' );
		const [ file, query = '' ] = place.split( '?' );
		return r.routes.some( ( x ) => x.key === file ) ? { file, hash: frag, ...( query ? { query } : {} ) } : { error: `route ${ route } is not a page file of the export` };
	}
	// A state-page route opens the entry and sets the route's state (lib/state-route.mjs); a route the export does not have is a named gap.
	const key = String( route ).replace( /^#?\/?/, '' );
	return r.routes.some( ( x ) => x.key === key ) ? { file: entry, hash: stateRouteHash( key ) } : { error: `route ${ route } is not a route of the ${ r.adapter } export` };
}

export const summaryOf = ( inv ) => ( {
	elements: inv.elements.length,
	checks: {
		rootName: inv.checks.rootName, rootKey: inv.checks.rootKey, duplicateKeys: inv.checks.duplicateKeys, perWidthCounts: inv.checks.perWidthCounts,
		tagDisagree: inv.checks.tagDisagree.length, unstamped: inv.checks.unstamped.length,
		keysMissingAt: Object.fromEntries( Object.entries( inv.checks.keysMissingAt ).map( ( [ w, k ] ) => [ w, k.length ] ) ), screenshotSkips: inv.checks.screenshotSkips.length,
	},
} );

// At most this many siblings travel with a row (the ones nearest it in document order); `siblingCount` is the full count,
// so a long list reads as long without making every row of a 60-item list carry 60 neighbours.
export const SIBLING_CAP = 12;

// The context the finaliser (Spec 48 §3.4 step 3) judges an element by, from the inventory the row was proposed from:
// { parent: { draftId, tag, block } | null, siblings: [ { draftId, tag, block } ], siblingCount, boxes: [ { width, x, y, w, h } ]
// | null }. `block` is the proposal's block for that element (null when it has no row or none fits). A value the
// inventory does not hold is null, never a guess: a root element has no parent, an element with no measured box at any
// width has no boxes.
export function contextOf( inventory, proposal, key ) {
	const els = inventory.elements;
	const at = els.findIndex( ( e ) => e.key === key );
	const e = els[ at ];
	const blockOf = new Map( proposal.rows.map( ( r ) => [ r.key, r.block ?? null ] ) );
	const ref = ( x ) => ( { draftId: templateOf( x.key )?.draftId ?? x.key, tag: x.tag, block: blockOf.get( x.key ) ?? null } );
	if ( ! e ) {
		return { parent: null, siblings: [], siblingCount: 0, boxes: null };
	}
	const parent = els.find( ( x ) => x.key === e.parentKey );
	const sibs = els.map( ( x, i ) => ( { x, i } ) ).filter( ( { x } ) => x.parentKey === e.parentKey && x.key !== e.key );
	const near = sibs.length > SIBLING_CAP ? [ ...sibs ].sort( ( a, b ) => Math.abs( a.i - at ) - Math.abs( b.i - at ) ).slice( 0, SIBLING_CAP ).sort( ( a, b ) => a.i - b.i ) : sibs;
	const boxes = INVENTORY_WIDTHS.filter( ( w ) => e.box?.[ w ] ).sort( ( a, b ) => b - a ).map( ( w ) => ( { width: w, x: e.box[ w ].x, y: e.box[ w ].y, w: e.box[ w ].w, h: e.box[ w ].h } ) );
	return { parent: parent ? ref( parent ) : null, siblings: near.map( ( { x } ) => ref( x ) ), siblingCount: sibs.length, boxes: boxes.length ? boxes : null };
}

// A proposal's rows as intake.json holds them (row id, the finaliser's context, the rule that settled each, and the site
// options a row sets in place of a block, which the site build applies: lib/site-build-options.mjs::skeletonSiteOptions).
export const rowsOf = ( surface, proposal, inventory ) => rowsWith( surface, proposal, inventory, fingerprintsOf( inventory ) );

const rowsWith = ( surface, proposal, inventory, fingerprints ) => proposal.rows.map( ( r ) => ( {
	rowId: `skeleton:${ surface }:${ r.key }`, key: r.key, ...( fingerprints[ r.key ] ? { fingerprint: fingerprints[ r.key ] } : {} ), tag: r.tag, words: r.words, block: r.block, confidence: r.confidence, low: r.low, reason: r.reason, rule: r.rule ?? null,
	...( r.into ? { into: r.into } : {} ), ...( r.handover ? { handover: r.handover } : {} ), ...( r.builtPost ? { builtPost: r.builtPost } : {} ), ...( r.siteOptions ? { siteOptions: r.siteOptions } : {} ),
	candidates: r.candidates.slice( 0, 3 ).map( ( c ) => ( { block: c.block, score: c.score, share: c.share } ) ), action: r.action, snippet: r.snippet, screenshots: r.screenshots,
	...contextOf( inventory, proposal, r.key ),
} ) );

// The `<ident>.setState(<args>)` calls of a surfaces.json state's how_to_reach, in order (lib/intake-reach-calls.mjs).
export { reachCalls };

// The ways to open a state-driven surface (lib/intake-openers.mjs).
export { openers, describeWay };

// Marks the surface root at the current width. When it does not render and `opener` is given, applies it (a state is
// set, a reach's setState calls run; a trigger is fired only while the root is absent, so a toggle never closes it) and
// settles, then marks again. An opener whose state bounds the width (`bounds`, lib/intake-openers.mjs) is applied at every
// width `width` names, rendered or not, and its bound keys are then set to that width: the page is read at one width after
// another, so the key holds the viewport's value at each, as a fresh page per width holds it in Fill.
async function markAt( page, s, settle, opener = null, width = null ) {
	const args = [ s.component, s.rootTpl, s.slug, ROOT_MARK, 'page' === s.kind ];
	const m = await page.evaluate( markRoot, args );
	const bounded = !! opener?.bounds?.length && null != width;
	if ( ( ! m.error && ! bounded ) || ! opener ) {
		return m;
	}
	// The draft's store calls the way needs first (a signed-in account behind the surface's condition, preconditionWays).
	opener.before && await reachDraftState( page, { component: s.component, calls: opener.before.calls } );
	const reached = 'state' === opener.via ? await setDraftState( page, { component: s.component, keys: opener.keys } )
		: 'reach' === opener.via ? await reachDraftState( page, { component: s.component, calls: opener.calls } )
			: await fireTrigger( page, { component: s.component, draftId: opener.draftId }, opener.event );
	bounded && reached && await setDraftState( page, { component: s.component, keys: Object.fromEntries( opener.bounds.map( ( b ) => [ b.key, width ] ) ) } );
	if ( ! reached ) {
		return { error: `${ describeWay( opener ) } reached nothing (component not mounted, trigger not rendered or setState call threw)` };
	}
	await settle( page );
	return page.evaluate( markRoot, args );
}

// Back at 1440 with the draft's own state put back (every key changed since the snapshot).
async function closeAgain( page, settle ) {
	await page.setViewportSize( { width: 1440, height: 900 } );
	await settle( page );
	await restoreDraftState( page );
	await settle( page );
}

// In-page: whether the marked root of a page's own header or footer is a landmark of the rendered page: as wide as the page
// (95% of the document's width or more) and above (a header) or below (a footer) the page's <main>. Returns { ok, why }.
export function landmarkBox( [ selector, tag ] ) {
	const el = document.querySelector( selector );
	if ( ! el ) {
		return { ok: false, why: 'its root is not on the page' };
	}
	const r = el.getBoundingClientRect();
	const width = document.documentElement.clientWidth;
	if ( r.width < width * 0.95 ) {
		return { ok: false, why: `it is ${ Math.round( r.width ) }px wide on a ${ width }px page, so it does not span the page` };
	}
	const main = document.querySelector( 'main' );
	const m = main && ! el.contains( main ) && ! main.contains( el ) ? main.getBoundingClientRect() : null;
	if ( m && ( 'header' === tag ? r.bottom > m.top + 1 : r.top < m.bottom - 1 ) ) {
		return { ok: false, why: `it is not ${ 'header' === tag ? 'above' : 'below' } the page's <main>` };
	}
	return { ok: true, why: '' };
}

// Whether a surface that renders at rest at 1440 stops rendering at a narrower inventory width where one of its width-bound
// ways (lib/intake-openers.mjs) holds: a rail beside a listing that is a drawer on a phone. Such a surface is read through
// its ways (openSurface), a width at a time, as a surface that never renders at rest is. The draft's state is put back.
export async function restFailsAt( page, s, settle, list ) {
	const bound = list.filter( ( o ) => o.bounds?.length );
	if ( ! bound.length ) {
		return false;
	}
	await snapshotDraftState( page );
	try {
		for ( const w of INVENTORY_WIDTHS.filter( ( x ) => x < 1440 ) ) {
			await page.setViewportSize( { width: w, height: 900 } );
			await settle( page );
			if ( ( await markAt( page, s, settle ) ).error && waysHeldAt( bound, w ).length ) {
				return true;
			}
		}
		return false;
	} finally {
		await closeAgain( page, settle );
	}
}

// Opens the records a surface shows inside (`s.ancestors`, root-most first): an ancestor whose root does not render is opened
// by the first of its own openers that renders it, and its state stays for the surface's own opener. The marks are removed
// again, so no read sees them.
export async function openAncestors( page, s, settle, census, widthKeys ) {
	for ( const a of s.ancestors || [] ) {
		const up = { ...a, slug: `${ s.slug }--within-${ slug( a.id ) }` };
		// markAt applies a way only while the root is absent, so a parent that renders is left as it is.
		for ( const o of openers( up, census, widthKeys ) ) {
			if ( ! ( await markAt( page, { ...up, kind: 'ancestor' }, settle, o ) ).error ) {
				break;
			}
		}
		await page.evaluate( ( [ attr, mark ] ) => document.querySelectorAll( `[${ attr }="${ mark }"]` ).forEach( ( e ) => e.removeAttribute( attr ) ), [ ROOT_MARK, up.slug ] );
	}
}

// Tries each opener: at every inventory width the root is marked, opened when absent, and marked again; a width the
// opener's state does not hold at is opened by the way that holds there (lib/intake-openers.mjs::wayAt). The first opener
// under which the root renders at one width or more wins. Returns { opener, at (widths it renders at), readAt ({ width: the
// nearest rendering width read in its place }), ways ({ width: the way applied there }), tried } or { error, tried }. The
// state stays open on success; the caller closes it. `within` (optional) opens the records the surface shows inside before
// each opener is tried (openAncestors).
async function openSurface( page, s, settle, list, within = null, preWays = null ) {
	const tried = [];
	const needs = new Set();
	await snapshotDraftState( page );
	// The queue grows once, when every own way has failed and the root's enclosing conditions name store calls the draft's
	// surfaces.json gives (preconditionWays): each own way is then tried again after one of them.
	const queue = [ ...list ];
	let grown = ! preWays;
	for ( let k = 0; k < queue.length; k++ ) {
		const o = queue[ k ];
		within && await within();
		const errors = [];
		const at = [];
		const ways = {};
		for ( const w of INVENTORY_WIDTHS ) {
			await page.setViewportSize( { width: w, height: 900 } );
			await settle( page );
			const way = wayAt( list, o, w );
			const m = way ? await markAt( page, s, settle, way.before || ! o.before ? way : { ...way, before: o.before }, w ) : { error: `no state of the surface holds at ${ w }px` };
			( m.needs || [] ).forEach( ( n ) => needs.add( n ) );
			m.error ? errors.push( `${ w }px: ${ m.error }` ) : ( at.push( w ), ways[ w ] = o.before && ! way.before ? { ...way, before: o.before } : way );
		}
		if ( at.length ) {
			const nearest = ( w ) => at.reduce( ( b, x ) => ( Math.abs( x - w ) < Math.abs( b - w ) ? x : b ), at[ 0 ] );
			return { opener: o, at, readAt: Object.fromEntries( INVENTORY_WIDTHS.filter( ( w ) => ! at.includes( w ) ).map( ( w ) => [ w, nearest( w ) ] ) ), ways, tried };
		}
		tried.push( `${ o.before ? `after ${ describeWay( o.before ) }, ` : '' }${ describeWay( o ) } (${ errors.join( '; ' ) })` );
		await closeAgain( page, settle );
		if ( ! grown && k === list.length - 1 ) {
			grown = true;
			queue.push( ...preWays( [ ...needs ] ).flatMap( ( before ) => list.map( ( own ) => ( { ...own, before } ) ) ) );
		}
	}
	return { error: list.length ? `still not rendered after ${ tried.join( '; then ' ) }` : 'no opener: no surfaces.json state gives a settable state key or a setState call, and opened_by names no template handler of the component', tried };
}

// The inventory of an opened surface: a width the surface never renders at is read at the nearest width it does
// (recorded as `readAt`), and every settle re-opens it, so a resize that closes it opens it again.
async function readOpened( h, s, settle, open, shotsDir ) {
	const view = ( w ) => open.readAt[ w ] ?? w;
	const page = new Proxy( h.page, { get: ( t, k ) => ( 'setViewportSize' === k ? ( v ) => t.setViewportSize( { ...v, width: view( v.width ) } ) : 'function' === typeof t[ k ] ? t[ k ].bind( t ) : t[ k ] ) } );
	const settleOpen = async ( _p, w ) => {
		await settle( h.page );
		const m = await markAt( h.page, s, settle, open.ways?.[ view( w ) ] ?? open.opener, view( w ) );
		if ( m.error ) {
			throw new Error( `${ s.slug } did not stay open at ${ view( w ) }px: ${ m.error }` );
		}
	};
	return readInventory( { page, root: s.selector, settle: settleOpen, shotsDir: shotsDir ? path.join( shotsDir, s.slug ) : null, url: h.page.url() } );
}

// The reading of a header surface's siblings (lib/skeleton-header-slots.mjs, rules.headerSlots): the roots of the other
// surfaces that are not global (a page, footer, drawer, panel, menu, form: each by its own root), which a sibling may not
// be or hold at any depth. null for any other kind of surface.
export function stripOptions( s, all ) {
	const exclude = all.filter( ( x ) => x.id !== s.id && 'global' !== x.kind ).map( ( x ) => [ x.component, x.rootTpl ] );
	// A footer reads only the floating siblings beside it (rules.footerSlots, lib/skeleton-footer-slots.mjs).
	return 'header' === s.kind ? { exclude } : 'footer' === s.kind ? { exclude, floating: true } : null;
}

// The facts and client decisions, once per run. Returns { facts, clientDecisions } or { error }.
function factsFor( { db, client, repo, facts } ) {
	const file = path.join( skeletonDir( repo, client ), 'decisions.json' );
	const clientDecisions = fs.existsSync( file ) ? readDecisions( file ) : {};
	if ( facts ) {
		return { facts, clientDecisions };
	}
	try {
		const f = loadFacts( { db, client, repo, siteName: clientDecisions.siteName || null } );
		const bad = decisionsProblems( f );
		return bad.length ? { error: `the decisions data is not sound: ${ bad.join( '; ' ) }` } : { facts: f, clientDecisions };
	} catch ( e ) {
		return { error: `the skeleton facts could not be loaded: ${ e.message }` };
	}
}

// The `opened` entry of a surface that was opened to be read: how it opened, where it renders and which widths were read at a
// neighbour. A width another state opened (the same state at its other breakpoint) is named in `statesAt`.
function openedOf( open ) {
	const other = Object.entries( open.ways ).filter( ( [ , x ] ) => x !== open.opener ).map( ( [ w, x ] ) => [ w, x.state ] );
	return { ...open.opener, at: open.at, readAt: open.readAt, ...( other.length ? { statesAt: Object.fromEntries( other ) } : {} ), tried: open.tried };
}

// The inventory and proposal of every surface (surfaceRoots' list). Surfaces sharing a page and route share one fresh
// sandbox and harness run (the runs go side by side in the browser-unit pool, lib/intake-pool.mjs, kept in page order):
// settled in rest mode at open, then each surface's root is marked and read at 1440, 375 and 768, settleRest after each
// resize. A root that does not render at rest is opened first (openers: its surfaces.json state keys, else a trigger
// `census`'s template handlers link to it through `opened_by`), read, then closed again; the entry's `opened` says how,
// where it renders and which widths were read at a neighbour (`readAt`). `openStates: false` switches opening off (the
// tests' negative control). o: { folder, harPath, surfaces, client, db?, facts?, entry?, routing?, site?, shotsDir?,
// widths, repo?, harness? (harness options), log?, census?, openStates?, inventoriesDir? (each surface's full inventory is
// written there as <surface>.json, so lib/skeleton-rerun.mjs can propose again offline), propose? (the proposer; proposeSkeleton by default, called with the client's saved
// form links and its draft-link context), pageMap? (this run's proposed page map rows, the draft-link context's rows until a
// confirmed page-map.json exists) }. Returns { skeletons: [{ surface, id, kind,
// name, route, opened?, inventory, rows, counts, problems, gap? }], gaps, runs: [{ file, hash, surfaces, requests,
// unlisted, blocked, proxyAttempts, ms }] }. A surface whose inventory or proposal throws, or that no opener renders,
// keeps its entry with `gap` and adds a gap row naming what was tried. `propose: null` reads and saves the inventories only
// (requires `inventoriesDir`): no facts are loaded and nothing is proposed, so each entry has no rows and carries its
// inventory summary; the proposals are made afterwards from the saved files (lib/skeleton-rerun.mjs::refreshIntakeSkeletons),
// once the fact record they read has been rewritten for the export.
export async function proposeSkeletons( { folder, harPath, surfaces, client, db = null, facts = null, entry = null, routing = null, site = null, shotsDir = null, widths = INVENTORY_WIDTHS, repo = REPO, harness = {}, log = () => {}, census = null, openStates = true, inventoriesDir = null, propose = proposeSkeleton, pageMap = null } ) {
	if ( [ ...widths ].sort().join() !== [ ...INVENTORY_WIDTHS ].sort().join() ) {
		throw new Error( `the skeleton inventory reads at ${ INVENTORY_WIDTHS.join( ', ' ) } (Spec 48 §3.4), not ${ widths.join( ', ' ) }` );
	}
	const index = entry || JSON.parse( fs.readFileSync( path.join( folder, 'MANIFEST.json' ), 'utf8' ) ).entry_drafts?.[ 0 ];
	let routed = null;
	const routeInfo = () => ( routed ||= routing || ( () => {
		try {
			return readRouting( { folder } );
		} catch ( e ) {
			return { error: `the export's routing could not be read: ${ e.message }` };
		}
	} )() );
	const readOnly = null === propose;
	if ( readOnly && ! inventoriesDir ) {
		throw new Error( 'a read-only skeleton run (propose: null) saves the inventories, so it needs inventoriesDir' );
	}
	const ownDb = ! readOnly && ! db && ! facts;
	const theDb = readOnly ? null : db || ( facts ? null : openDb() );
	const f = readOnly ? null : factsFor( { db: theDb, client, repo, facts } );
	const calKeys = site ? ( s ) => Object.keys( loadCalibration( path.join( HERE, '..', 'cache' ), s, site )?.elements || {} ) : () => [];
	const sources = inventoriesDir ? sourcesOf( folder ) : null;
	// The state keys each component writes from the viewport width: a state bounding one opens only at the widths inside it.
	const widthKeys = widthStateKeys( readBreakpoints( { folder } ) );
	// The saved forms a page may link, the same links `skeleton.mjs propose` passes (lib/skeleton-context.mjs::proposalContext): read once.
	const refs = detectReferences();
	let links = null;
	const formLinks = () => ( links ||= formLinksFor( { repo, client, refs } ) );
	// The page map and routing that turn a draft link into a site address (lib/draft-link.mjs): this run's own, read once.
	let linkCtx;
	const draftLinks = () => ( undefined !== linkCtx ? linkCtx : ( linkCtx = draftLinksFor( { repo, client, routing: routeInfo().error ? null : routeInfo(), proposedRows: pageMap } ) ) );
	// Every surface root of the export (the run may read a subset): the roots a header's sibling strip may not hold.
	let every = null;
	const everySurface = () => ( every ||= census ? surfaceRoots( { folder, census } ).surfaces : surfaces );
	const out = [];
	const gaps = [];
	const runs = [];
	const fail = ( s, error, into = { out, gaps } ) => {
		into.gaps.push( gap( 'skeleton', `${ s.component }:${ s.rootTpl }`, `${ s.slug }: ${ error }` ) );
		into.out.push( { surface: s.slug, id: s.id, kind: s.kind, name: s.name, route: s.route, ...( s.panel ? { panel: s.panel } : {} ), inventory: null, rows: [], counts: null, problems: [], gap: error } );
	};
	// The client's own built posts (a header, drawer or mega menu it already built), keyed by surfaces.json id or slug.
	const builtFile = path.join( repo, 'sites', client, 'build', 'skeleton', 'built-surfaces.json' );
	const builtMap = fs.existsSync( builtFile ) ? JSON.parse( fs.readFileSync( builtFile, 'utf8' ) ).surfaces || {} : {};
	const builtFor = ( s ) => builtMap[ s.id ] || builtMap[ s.slug ] || null;
	const groups = new Map();
	for ( const s of surfaces ) {
		const v = visitOf( s.route, { entry: index, routing: routeInfo } );
		if ( v.error ) {
			fail( s, v.error );
			continue;
		}
		const k = `${ v.file }?${ v.query || '' }#${ v.hash }`;
		groups.has( k ) || groups.set( k, { ...v, list: [] } );
		groups.get( k ).list.push( s );
	}
	try {
		// One unit per page group (each its own sandbox and harness run, its surfaces read one after another), side by
		// side in the browser-unit pool; each unit's entries, gap rows and run record are kept in groups order.
		const runGroup = async ( g ) => {
			const u = { out: [], gaps: [], runs: [] };
			const t0 = Date.now();
			let h;
			try {
				h = await openHarness( { folder, index, harPath, file: g.file, query: g.query, hash: g.hash, width: 1440, ...harness } );
				await settleRest( h.page, h.options );
			} catch ( e ) {
				h && await h.close();
				g.list.forEach( ( s ) => fail( s, `the harness run for ${ g.file }${ g.query ? `?${ g.query }` : '' }${ g.hash ? `#${ g.hash }` : '' } failed: ${ e.message.split( '\n' )[ 0 ] }`, u ) );
				return u;
			}
			try {
				const settle = ( page ) => settleRest( page, h.options );
				const absorbed = new Map();
				for ( const s of [ ...g.list ].sort( ( a, b ) => Number( ! [ 'header', 'footer' ].includes( a.kind ) ) - Number( ! [ 'header', 'footer' ].includes( b.kind ) ) ) ) {
					try {
						await h.page.setViewportSize( { width: 1440, height: 900 } );
						await settle( h.page );
						let m = await markAt( h.page, s, settle );
						const ways = openStates ? openers( s, census, widthKeys ) : [];
						let open = null;
						let inventory;
						if ( s.pageOwn && ! m.error ) {
							const box = await h.page.evaluate( landmarkBox, [ s.selector, s.kind ] );
							if ( ! box.ok ) {
								log( `${ s.slug }: not a landmark of the page (${ box.why }), so it is no surface` );
								continue;
							}
						}
						if ( openStates && ( m.error || await restFailsAt( h.page, s, settle, ways ) ) ) {
							open = await openSurface( h.page, s, settle, ways, s.ancestors?.length ? () => openAncestors( h.page, s, settle, census, widthKeys ) : null, ( needs ) => preconditionWays( needs, everySurface() ) );
							if ( open.error ) {
								throw new Error( m.error ? `${ m.error }; ${ open.error }` : open.error );
							}
							try {
								inventory = await readOpened( h, s, settle, open, shotsDir );
								m = { ...( await markAt( h.page, s, settle ) ), viaState: true };
							} finally {
								await closeAgain( h.page, settle );
							}
						} else if ( m.error ) {
							throw new Error( m.error );
						} else {
							inventory = await readInventory( { page: h.page, root: s.selector, settle, shotsDir: shotsDir ? path.join( shotsDir, s.slug ) : null, url: h.page.url(), strips: stripOptions( s, everySurface() ) } );
						}
						// A global surface that is a strip the header surface read beside itself is that header's row, never a surface of its own.
						if ( ! readOnly && 'global' === s.kind && absorbed.has( inventory.checks.rootKey ) ) {
							log( `${ s.slug }: a strip of the ${ absorbed.get( inventory.checks.rootKey ) } surface; proposed there` );
							continue;
						}
						inventoriesDir && fs.writeFileSync( path.join( inventoriesDir, `${ s.slug }.json` ), `${ JSON.stringify( { ...inventory, sources } ) }
` );
						if ( readOnly ) {
							u.out.push( { surface: s.slug, id: s.id, kind: s.kind, name: s.name, route: s.route, root: { tpl: s.rootTpl, ...m }, ...( s.panel ? { panel: s.panel } : {} ), ...( open ? { opened: openedOf( open ) } : {} ), inventory: summaryOf( inventory ), rows: [], counts: null, problems: [] } );
							log( `${ s.slug }: ${ inventory.elements.length } elements read` );
							continue;
						}
						if ( f.error ) {
							throw new Error( f.error );
						}
						const r = propose( { inventory, facts: f.facts, surface: s.slug, surfaceKind: s.kind, surfaceName: s.name, built: builtFor( s ), clientDecisions: f.clientDecisions, carried: carriedIds( { repo, client, site: siteOf( { repo, client, slug: s.slug } ) } ), calKeys, formLinks: formLinks(), refs, draftLinks: draftLinks(), scriptOf: ( component ) => componentScript( folder, component ), db: theDb } );
						// A width another state opened (the same state at its other breakpoint) is named in `statesAt`.
						const opened = open && openedOf( open );
						r.proposal.stripRoots?.forEach( ( k ) => absorbed.set( k, s.slug ) );
						u.out.push( { surface: s.slug, id: s.id, kind: s.kind, name: s.name, route: s.route, ...( s.panel ? { panel: s.panel } : {} ), root: { tpl: s.rootTpl, ...m }, ...( opened ? { opened } : {} ), inventory: summaryOf( inventory ), rows: rowsOf( s.slug, r.proposal, inventory ), counts: r.proposal.counts, problems: r.problems } );
						log( `${ s.slug }: ${ inventory.elements.length } elements, ${ r.proposal.rows.length } rows` );
					} catch ( e ) {
						fail( s, e.message.split( '\n' )[ 0 ], u );
					}
				}
			} finally {
				const unlisted = h.sb.requests.filter( ( r ) => 'unlisted' === r.kind ).map( ( r ) => r.url );
				u.runs.push( { file: g.query ? `${ g.file }?${ g.query }` : g.file, hash: g.hash, surfaces: g.list.map( ( s ) => s.slug ), requests: h.sb.requests.length, unlisted, blocked: [ ...h.sb.blocked ], proxyAttempts: [ ...h.sb.proxyAttempts ], ms: Date.now() - t0 } );
				await h.close();
			}
			return u;
		};
		for ( const u of await mapPool( [ ...groups.values() ], poolSize(), runGroup ) ) {
			out.push( ...u.out );
			gaps.push( ...u.gaps );
			runs.push( ...u.runs );
		}
	} finally {
		ownDb && theDb?.close?.();
	}
	const order = new Map( surfaces.map( ( s, i ) => [ s.slug, i ] ) );
	out.sort( ( a, b ) => order.get( a.surface ) - order.get( b.surface ) );
	return { skeletons: out, gaps, runs };
}

// The rows the missing-features list consumes: no block fits (action 'unresolved'), or a kept row with no candidate.
export const unresolvedRows = ( skeletons ) => skeletons.flatMap( ( s ) => s.rows.filter( ( r ) => 'unresolved' === r.action || ( ! r.action && ! r.candidates.length ) ).map( ( r ) => ( { surface: s.surface, ...r } ) ) );
