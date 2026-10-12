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
// surface and are listed as `parts`, never read on their own. A page surface is read from its route's <main>.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openHarness, settleRest } from './intake-harness.mjs';
import { readInventory, INVENTORY_WIDTHS } from './skeleton-inventory.mjs';
import { proposeSkeleton } from './skeleton-propose.mjs';
import { loadFacts, decisionsProblems, REPO } from './skeleton-facts.mjs';
import { readDecisions, skeletonDir } from './skeleton-finalise.mjs';
import { readRouting } from './intake-routing.mjs';
import { loadCalibration } from './cache.mjs';
import { openDb } from './db.mjs';

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

// Surface roots from `folder/surfaces.json` (or `records`), checked against the census. Returns { surfaces, parts, gaps }:
// surfaces [{ id, name, kind, component, rootTpl, tpls, route, slug, selector }], parts [{ id, name, kind, parent, why }].
export function surfaceRoots( { folder, census, records = null } ) {
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
	for ( const r of recs ) {
		const tpls = tplsOf( r );
		const where = `${ r.id ?? '?' } ${ r.kind } "${ r.name }"`;
		if ( ! tpls.length ) {
			gaps.push( gap( 'surface-root', `${ r.dc }:${ r.id }`, `${ where } has no template_tpl_id` ) );
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
		if ( ! SURFACE_KINDS.includes( r.kind ) ) {
			parts.push( { id: r.id, name: r.name, kind: r.kind, parent: r.parent ?? null, why: `a ${ r.kind } is a state or part of ${ r.parent ? `surface ${ r.parent }` : 'the page it shows on' }, read with it` } );
			continue;
		}
		let s = 'page' === r.kind ? `page-${ slug( '/' === r.route ? 'home' : r.route ) }` : slug( r.name );
		for ( let i = 2; slugs.has( s ); i++ ) {
			s = `${ s.replace( /-\d+$/, '' ) }-${ i }`;
		}
		slugs.add( s );
		const rootTpl = tpls.at( -1 );
		surfaces.push( { id: r.id, name: r.name, kind: r.kind, component: r.dc, rootTpl, tpls, route: r.route ?? null, slug: s, rootTag: elements.get( `${ r.dc }:${ rootTpl }` ).detail.tag, selector: `[${ ROOT_MARK }="${ s }"]` } );
	}
	// A census CPT element (by tag) in a component that no record of a claiming kind names.
	const claimed = ( component, kinds ) => recs.some( ( r ) => r.dc === component && kinds.includes( r.kind ) );
	for ( const e of elements.values() ) {
		const kinds = CENSUS_CPT[ e.detail.tag ];
		if ( kinds && ! claimed( e.component, kinds ) ) {
			gaps.push( gap( 'surface-root', e.draftId, `the census holds a <${ e.detail.tag }> in ${ e.component } and surfaces.json has no ${ kinds.join( ' or ' ) } record for that component` ) );
		}
	}
	return { surfaces, parts, gaps };
}

// In-page: finds a surface's root element and marks it with ROOT_MARK. A rendered template element is its own root (the
// first copy whose nearest import host is the component); a non-rendering one (sc-if, sc-for, sc-else) is the nearest
// element holding every outermost element it stamps. A page surface's root is then the route's main content root: the
// nearest enclosing <main> (a page record may name only the page's first block, such as its hero). Returns
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
		const ids = new Set( [ ...src.querySelectorAll( '[data-dc-tpl]' ) ].map( ( x ) => x.dataset.dcTpl ) );
		const els = [ ...document.querySelectorAll( '[data-dc-tpl]' ) ].filter( ( e ) => ids.has( e.dataset.dcTpl ) && hostName( e ) === component );
		const top = els.filter( ( e ) => ! els.some( ( o ) => o !== e && o.contains( e ) ) );
		if ( ! top.length ) {
			return { error: `<${ src.localName }> ${ component }:${ tpl } renders nothing at this route and state` };
		}
		root = top[ 0 ];
		while ( top.length > 1 && ! top.every( ( e ) => root.contains( e ) ) ) {
			root = root.parentElement;
		}
	}
	const main = isPage ? root.closest( 'main' ) : null;
	const viaMain = !! main && main !== root;
	root = main || root;
	document.querySelectorAll( `[${ attr }="${ mark }"]` ).forEach( ( e ) => e.removeAttribute( attr ) );
	root.setAttribute( attr, mark );
	return { copies: live.length, tag: root.tagName.toLowerCase(), viaCondition: ! live.length, viaMain };
}

// Where a surface is opened: { file, hash } or { error }. A '*' or '/' route is the entry at its default route; a hash
// export opens `#<route>`; a page-file export opens the file a route names.
function visitOf( route, { entry, routing } ) {
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
		const [ file, frag = '' ] = route.replace( /^\//, '' ).split( '#' );
		return r.routes.some( ( x ) => x.key === file ) ? { file, hash: frag } : { error: `route ${ route } is not a page file of the export` };
	}
	return { error: `route ${ route } is reached by the ${ r.adapter } adapter's state, which a URL cannot open` };
}

const summaryOf = ( inv ) => ( {
	elements: inv.elements.length,
	checks: {
		rootName: inv.checks.rootName, rootKey: inv.checks.rootKey, duplicateKeys: inv.checks.duplicateKeys, perWidthCounts: inv.checks.perWidthCounts,
		tagDisagree: inv.checks.tagDisagree.length, unstamped: inv.checks.unstamped.length,
		keysMissingAt: Object.fromEntries( Object.entries( inv.checks.keysMissingAt ).map( ( [ w, k ] ) => [ w, k.length ] ) ), screenshotSkips: inv.checks.screenshotSkips.length,
	},
} );

const rowsOf = ( surface, proposal ) => proposal.rows.map( ( r ) => ( {
	rowId: `skeleton:${ surface }:${ r.key }`, key: r.key, tag: r.tag, words: r.words, block: r.block, confidence: r.confidence, low: r.low, reason: r.reason,
	candidates: r.candidates.slice( 0, 3 ).map( ( c ) => ( { block: c.block, score: c.score, share: c.share } ) ), action: r.action, snippet: r.snippet, screenshots: r.screenshots,
} ) );

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

// The inventory and proposal of every surface (surfaceRoots' list). Surfaces sharing a page and route share one fresh
// sandbox and harness run: settled in rest mode at open, then each surface's root is marked and read at 1440, 375 and
// 768, settleRest after each resize. o: { folder, harPath, surfaces, client, db?, facts?, entry?, routing?, site?,
// shotsDir?, widths, repo?, harness? (harness options), log? }. Returns { skeletons: [{ surface, id, kind, name, route,
// inventory, rows, counts, problems, gap? }], gaps, runs: [{ file, hash, surfaces, requests, unlisted, blocked,
// proxyAttempts, ms }] }. A surface whose inventory or proposal throws keeps its entry with `gap` and adds a gap row.
export async function proposeSkeletons( { folder, harPath, surfaces, client, db = null, facts = null, entry = null, routing = null, site = null, shotsDir = null, widths = INVENTORY_WIDTHS, repo = REPO, harness = {}, log = () => {} } ) {
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
	const ownDb = ! db && ! facts;
	const theDb = db || ( facts ? null : openDb() );
	const f = factsFor( { db: theDb, client, repo, facts } );
	const calKeys = site ? ( s ) => Object.keys( loadCalibration( path.join( HERE, '..', 'cache' ), s, site )?.elements || {} ) : () => [];
	const out = [];
	const gaps = [];
	const runs = [];
	const fail = ( s, error ) => {
		gaps.push( gap( 'skeleton', `${ s.component }:${ s.rootTpl }`, `${ s.slug }: ${ error }` ) );
		out.push( { surface: s.slug, id: s.id, kind: s.kind, name: s.name, route: s.route, inventory: null, rows: [], counts: null, problems: [], gap: error } );
	};
	const groups = new Map();
	for ( const s of surfaces ) {
		const v = visitOf( s.route, { entry: index, routing: routeInfo } );
		if ( v.error ) {
			fail( s, v.error );
			continue;
		}
		const k = `${ v.file }#${ v.hash }`;
		groups.has( k ) || groups.set( k, { ...v, list: [] } );
		groups.get( k ).list.push( s );
	}
	try {
		for ( const g of groups.values() ) {
			const t0 = Date.now();
			let h;
			try {
				h = await openHarness( { folder, index, harPath, file: g.file, hash: g.hash, width: 1440, ...harness } );
				await settleRest( h.page, h.options );
			} catch ( e ) {
				h && await h.close();
				g.list.forEach( ( s ) => fail( s, `the harness run for ${ g.file }${ g.hash ? `#${ g.hash }` : '' } failed: ${ e.message.split( '\n' )[ 0 ] }` ) );
				continue;
			}
			try {
				const settle = ( page ) => settleRest( page, h.options );
				for ( const s of g.list ) {
					try {
						await h.page.setViewportSize( { width: 1440, height: 900 } );
						await settle( h.page );
						const m = await h.page.evaluate( markRoot, [ s.component, s.rootTpl, s.slug, ROOT_MARK, 'page' === s.kind ] );
						if ( m.error ) {
							throw new Error( m.error );
						}
						const inventory = await readInventory( { page: h.page, root: s.selector, settle, shotsDir: shotsDir ? path.join( shotsDir, s.slug ) : null, url: h.page.url() } );
						if ( f.error ) {
							throw new Error( f.error );
						}
						const r = proposeSkeleton( { inventory, facts: f.facts, surface: s.slug, clientDecisions: f.clientDecisions, calKeys, db: theDb } );
						out.push( { surface: s.slug, id: s.id, kind: s.kind, name: s.name, route: s.route, root: { tpl: s.rootTpl, ...m }, inventory: summaryOf( inventory ), rows: rowsOf( s.slug, r.proposal ), counts: r.proposal.counts, problems: r.problems } );
						log( `${ s.slug }: ${ inventory.elements.length } elements, ${ r.proposal.rows.length } rows` );
					} catch ( e ) {
						fail( s, e.message.split( '\n' )[ 0 ] );
					}
				}
			} finally {
				const unlisted = h.sb.requests.filter( ( r ) => 'unlisted' === r.kind ).map( ( r ) => r.url );
				runs.push( { file: g.file, hash: g.hash, surfaces: g.list.map( ( s ) => s.slug ), requests: h.sb.requests.length, unlisted, blocked: [ ...h.sb.blocked ], proxyAttempts: [ ...h.sb.proxyAttempts ], ms: Date.now() - t0 } );
				await h.close();
			}
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
