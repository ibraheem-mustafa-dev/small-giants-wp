// Construct census, runtime pass (Spec 48 FR-48-24, FR-48-34, R-48-3). Each visit (the entry page and each route the
// caller lists) is rendered in the intake sandbox (FR-48-23) under the determinism harness in rest mode (FR-48-28) at
// each width, and the trace records which census constructs executed, with their draft IDs. A hash-route draft is one
// prepared page per width and file: the first visit opens it, each later route is reached by setting location.hash
// inside the page and settling again, so the run stays bounded. The width-and-file units run side by side in the
// browser-unit pool (lib/intake-pool.mjs) and their evidence is applied in width-then-file order, so the result is that
// of a one-at-a-time run.
//
// How each kind is traced (decided by a spike on the census fixture, 2026-10-12):
//   - Code that runs (getters, class methods wired as handlers, renderVals() keys, addEventListener listeners, motion
//     written from code): V8 precise coverage (CDP Profiler.startPreciseCoverage, callCount + detailed block counts),
//     taken after every visit. support.js evaluates the logic verbatim with `new Function` (no Babel step), so the
//     compiled script holds the logic text unchanged: its offset in the script (Debugger.getScriptSource) maps every
//     coverage range straight onto the @babel/parser tree of the static pass. Function names survive too ("get links",
//     "neverCalled"), but positions are exact, so mapping is by position (lib/intake-census-map.mjs). A construct is
//     reached when the innermost coverage range around its position (for a function: its body) has a count above zero.
//   - Call sites of timers, observers and Web Animations: page wrappers (lib/intake-census-trace.mjs) record the
//     script hash and position of the calling frame (V8's CallSite.getScriptHash equals CDP scriptParsed's hash), mapped
//     to the call expression in the tree. A call the static pass never listed (an aliased setTimeout) is a `runtime`
//     row, which coverage alone could not name.
//   - Template constructs: a live element carrying the stamp (`data-dc-tpl`) under its component's host. An sc-if or
//     sc-for is reached when any stamp inside it rendered, a binding on a control element when the element around the
//     control rendered; helmet children (moved to <head>) are matched to their component by stamp, tag and source.
//   - CSS transitions and keyframes from the template: a `transitionrun` / `animationstart` event on the stamped
//     element, on an element matching the stylesheet rule's selector, or (for @keyframes) with that animation name.
//   - Helmet scripts: the script's top level executed (coverage); fonts: the face loaded, the stylesheet or @import
//     loaded.
// Rest mode fires no user event, so a click handler is reached only when something in the render calls it; FR-48-34's
// forced states (a later step) decide whether an unreached construct is a draft defect. A construct the trace cannot
// decide (a handler wired to no function the tree can name, a control with no stamped element inside, a mounted
// component whose logic never reached a script) is a trace gap row (R-48-3), never a silent `unreached`; a visit that
// fails is a gap row too.
import { openSandbox } from './intake-sandbox.mjs';
import { preparePage, gotoDraft, settleRest } from './intake-harness.mjs';
import { CALL_KINDS, isCode, splitId, buildModel, positionOf, codeTarget, callAt, countAt } from './intake-census-map.mjs';
import { traceInit, collect } from './intake-census-trace.mjs';
import { collectUsage, mergeRuntimeUsage } from './intake-usage.mjs';
import { mapPool, poolSize } from './intake-pool.mjs';

// Every census kind the runtime pass decides `unreached` for (all registry kinds; `unknown` and `x-import` are not).
export const TRACED_KINDS = [ 'template-element', 'sc-if', 'sc-for', 'dc-import', 'binding', 'style-hover', 'link', 'ref', 'data-hook',
	'helmet-script', 'helmet-font', 'getter', 'renderVals-key', 'handler', 'timer', 'observer', 'waapi', 'transition', 'keyframes' ];
const unquote = ( s ) => String( s || '' ).trim().replace( /^["']|["']$/g, '' );

// The visit list as page groups: [ { file, visits: [ { label, hash } ] } ] in first-seen order. A visit is a page file,
// `file#hash`, or { file, hash }.
export function groupVisits( visits, entry ) {
	const groups = new Map();
	for ( const v of visits.length ? visits : [ entry ] ) {
		const [ file, hash = '' ] = 'string' === typeof v ? v.split( /#(.*)/s ) : [ v.file, v.hash || '' ];
		const label = hash ? `${ file }#${ hash }` : file;
		const g = groups.get( file ) || { file, visits: [] };
		if ( ! g.visits.some( ( x ) => x.label === label ) ) {
			g.visits.push( { label, hash } );
		}
		groups.set( file, g );
	}
	return [ ...groups.values() ];
}

// Reached (true/false) or { gap } for one row on one visit's evidence.
function decide( row, ev, ctx ) {
	if ( isCode( row ) && CALL_KINDS.has( row.kind ) ) {
		return ev.calls.has( `${ row.kind }@${ row.draftId }` );
	}
	if ( isCode( row ) || 'handler' === row.kind ) {
		const t = ctx.targets.get( row.id );
		if ( t.gap ) {
			return t;
		}
		if ( ! ctx.compiled.has( t.comp ) && ctx.mountedEver.has( t.comp ) ) {
			return { gap: `${ t.comp } mounted but its logic never reached a compiled script` };
		}
		return ( countAt( ev.cov, t.comp, t.off ) || 0 ) > 0;
	}
	const [ comp, n ] = splitId( row.draftId );
	const ctl = ctx.trees.get( comp )?.[ n ];
	const rendered = ( x ) => ev.rendered.has( `${ comp }:${ x }` );
	const anchor = () => ( 'top' === n ? ev.mounted.has( comp ) : ctl ? ( null === ctl.parent ? ev.mounted.has( comp ) : rendered( ctl.parent ) ) : rendered( n ) );
	const control = () => {
		if ( ! ctl ) {
			return ctx.trees.has( comp ) ? { gap: `${ row.draftId }: not a control element of the stamped template` } : false;
		}
		return ctl.desc.length ? ctl.desc.some( rendered ) : { gap: `${ row.draftId } <${ ctl.tag }>: no stamped element inside, so its reach cannot be traced` };
	};
	const motion = ( type ) => ev.motion.some( ( e ) => e.type === type && (
		'stylesheet' === row.detail.via ? e.sel.includes( ctx.selectors.indexOf( row.detail.selector ) )
			: '@keyframes' === row.detail.via ? e.name === row.detail.name : e.key === `${ comp }:${ n }` ) );
	switch ( row.kind ) {
		case 'sc-if':
		case 'sc-for':
			return control();
		case 'template-element':
			return ctl ? control() : rendered( n );
		case 'dc-import':
			return rendered( n );
		case 'helmet-script':
			return ev.ran.has( row.detail.src ? ctx.scriptFile.get( `${ comp }|${ row.detail.src }` ) ?? `?${ row.detail.src }` : `${ comp }:${ n }` );
		case 'helmet-font':
			return '@font-face' === row.detail.via ? ev.fonts.has( unquote( row.detail.family ) ) : '@import' === row.detail.via ? ev.imports.has( row.detail.href ) : rendered( n ) && ev.sheets.has( row.detail.href );
		case 'transition':
			return motion( 'transitionrun' );
		case 'keyframes':
			return motion( 'animationstart' );
		default:
			return anchor();
	}
}

// The runtime pass. `census` is a staticCensus result (rows and sources); `visits` the caller's page and route list.
// Returns { sightings: [ { id?, kind, draftId, component, detail, source: 'runtime', visit, width } ], perVisit,
// gaps: [ { construct, draftId, error } ], traceGaps: [ { id, error } ], runtimeOnly, kinds, wallMs, blocked, usage } where
// `blocked` holds every sandbox's aborted requests (lib/intake-sandbox.mjs::openSandbox rows), for the intake notices,
// and `usage` what every visit's page used (lib/intake-usage.mjs::collectUsage, merged): the check on the file read.
export async function runtimeCensus( { folder, entry, harPath, visits = [ entry ], widths = [ 375, 768, 1440 ], census = null, timeout = 60000, harness = {} } ) {
	const t0 = Date.now();
	const base = census || await ( await import( './intake-census.mjs' ) ).staticCensus( { folder, entry, harPath, timeout } );
	const model = buildModel( base.sources );
	const rows = base.rows.filter( ( r ) => TRACED_KINDS.includes( r.kind ) );
	const rowsByComp = new Map();
	base.rows.forEach( ( r ) => rowsByComp.set( r.component, [ ...( rowsByComp.get( r.component ) || [] ), r ] ) );
	const ctx = {
		targets: new Map( rows.filter( ( r ) => ( isCode( r ) && ! CALL_KINDS.has( r.kind ) ) || 'handler' === r.kind ).map( ( r ) => [ r.id, codeTarget( r, model, rowsByComp ) ] ) ),
		selectors: [ ...new Set( rows.filter( ( r ) => 'stylesheet' === r.detail.via && r.detail.selector ).map( ( r ) => r.detail.selector ) ) ],
		scriptFile: new Map( base.sources.flatMap( ( s ) => s.scripts.filter( ( x ) => x.file ).map( ( x ) => [ `${ s.component }|${ x.src }`, x.file ] ) ) ),
		trees: new Map(), compiled: new Set(), mountedEver: new Set(),
	};
	const staticCall = new Map( rows.filter( ( r ) => isCode( r ) && CALL_KINDS.has( r.kind ) ).map( ( r ) => [ `${ r.kind }@${ r.draftId }`, r ] ) );
	const helmetEls = base.sources.flatMap( ( s ) => s.stamped.elements.filter( ( e ) => e.inHelmet ).map( ( e ) => ( { comp: s.component, e } ) ) );
	const inline = helmetEls.filter( ( { e } ) => 'script' === e.tag && ! e.attrs.some( ( [ a ] ) => 'src' === a ) ).map( ( { comp, e } ) => ( { key: `${ comp }:${ e.n }`, body: ( e.body || '' ).trim() } ) );
	const sightings = [];
	const perVisit = [];
	const gaps = [];
	const reached = new Set();
	const traceGap = new Map();
	const runtimeOnly = new Map();
	const blocked = [];
	const usage = { css: new Set(), inline: new Set(), elements: new Map(), blockedSheets: 0, foreignSheets: 0, foreignElements: 0 };
	const sight = ( r, visit, width ) => sightings.push( { ...( r.id ? { id: r.id } : {} ), kind: r.kind, draftId: r.draftId, component: r.component, detail: r.detail, source: 'runtime', visit, width } );
	// One unit per width and page group, each in its own sandbox and harness run, run side by side (lib/intake-pool.mjs).
	// A unit never touches the shared state: it records every change it would make, in order, as an operation, and the
	// operations are applied after every unit has ended, unit by unit in width-then-group order, so `decide` sees the
	// template trees, compiled scripts and mounted components of every earlier unit exactly as a one-at-a-time run does
	// (a unit's own `known` list starts empty; a template tree is the same on every visit, and the first one kept wins).
	const runUnit = async ( { width, group } ) => {
		const ops = [];
		const unitTrees = new Map();
		const unitVisits = [];
		let sb = null;
		let failed = null;
		try {
			sb = await openSandbox( { folder, index: entry, harPath, mode: 'replay', widths: [ width ], timeout } );
			const page = await sb.newPage();
			await page.setViewportSize( { width, height: 900 } );
			const cdp = await page.context().newCDPSession( page );
			const scripts = new Map();
			cdp.on( 'Debugger.scriptParsed', ( e ) => scripts.set( e.scriptId, e ) );
			await cdp.send( 'Debugger.enable' );
			await cdp.send( 'Debugger.setSkipAllPauses', { skip: true } );
			await cdp.send( 'Profiler.enable' );
			await cdp.send( 'Profiler.startPreciseCoverage', { callCount: true, detailed: true } );
			const opts = await preparePage( page, harness );
			await page.addInitScript( traceInit );
			const mapped = new Map();
			const byHash = new Map();
			// A script's place in the model: [ { comp, base } | { inline: [ key ] } ], cached by script id and hash.
			const mapScript = async ( id ) => {
				if ( mapped.has( id ) ) {
					return mapped.get( id );
				}
				const s = scripts.get( id );
				let out = [];
				// A script of a document already navigated away from has no source any more: it maps to nothing.
				const source = async () => ( await cdp.send( 'Debugger.getScriptSource', { scriptId: id } ).catch( () => ( { scriptSource: '' } ) ) ).scriptSource;
				if ( s && ! s.url && ! s.hasSourceURL ) {
					const src = await source();
					out = [ ...model.entries() ].filter( ( [ , m ] ) => ! m.file && src.includes( m.text ) ).map( ( [ comp, m ] ) => ( { comp, base: src.indexOf( m.text ) } ) );
				} else if ( s?.url?.startsWith( `${ sb.origin }/` ) ) {
					const file = decodeURIComponent( new URL( s.url ).pathname.slice( 1 ) );
					if ( model.get( file )?.file ) {
						out = [ { comp: file, base: 0, file: true } ];
					} else if ( file.endsWith( '.dc.html' ) && inline.length ) {
						const src = ( await source() ).trim();
						const keys = inline.filter( ( x ) => x.body === src ).map( ( x ) => x.key );
						out = keys.length ? [ { inline: keys } ] : [];
					}
				}
				mapped.set( id, out );
				if ( s?.hash ) {
					byHash.set( s.hash, out );
				}
				return out;
			};
			for ( const [ i, v ] of group.visits.entries() ) {
				const t = Date.now();
				if ( 0 === i ) {
					await gotoDraft( page, sb.origin, group.file, { hash: v.hash, timeout } );
				} else {
					await page.evaluate( ( h ) => {
						window.location.hash = h;
					}, v.hash );
				}
				const ts = Date.now();
				const settle = await settleRest( page, opts );
				const settleMs = Date.now() - ts;
				const raw = await page.evaluate( collect, { selectors: ctx.selectors, known: [ ...unitTrees.keys() ] } );
				const used = await page.evaluate( collectUsage );
				ops.push( () => mergeRuntimeUsage( usage, used, `${ v.label }@${ width }` ) );
				Object.entries( raw.trees ).forEach( ( [ k, tree ] ) => unitTrees.set( k, tree ) );
				ops.push( () => Object.entries( raw.trees ).forEach( ( [ k, tree ] ) => ctx.trees.has( k ) || ctx.trees.set( k, tree ) ) );
				const cov = new Map();
				const ran = new Set();
				for ( const s of ( await cdp.send( 'Profiler.takePreciseCoverage' ) ).result ) {
					const where = await mapScript( s.scriptId );
					const ranges = s.functions.flatMap( ( f ) => f.ranges.map( ( r ) => [ r.startOffset, r.endOffset, r.count ] ) );
					const topRan = s.functions.some( ( f ) => 0 === f.ranges[ 0 ].startOffset && f.ranges[ 0 ].count > 0 );
					for ( const w of where ) {
						if ( w.inline ) {
							w.inline.forEach( ( k ) => topRan && ran.add( k ) );
							continue;
						}
						ops.push( () => ctx.compiled.add( w.comp ) );
						if ( w.file && topRan ) {
							ran.add( w.comp );
						}
						cov.set( w.comp, [ ...( cov.get( w.comp ) || [] ), ranges.map( ( [ a, b, c ] ) => [ a - w.base, b - w.base, c ] ) ] );
					}
				}
				const calls = new Set();
				for ( const c of raw.calls ) {
					if ( ! byHash.has( c.hash ) ) {
						const id = [ ...scripts.values() ].find( ( s ) => s.hash === c.hash )?.scriptId;
						byHash.set( c.hash, id ? await mapScript( id ) : [] );
					}
					for ( const w of byHash.get( c.hash ).filter( ( x ) => x.comp ) ) {
						const m = model.get( w.comp );
						const off = c.pos - w.base;
						if ( off < 0 || off >= m.text.length ) {
							continue;
						}
						const node = m.parsed ? callAt( m, off ) : null;
						const [ line, col ] = node ? [ node.loc.start.line, node.loc.start.column ] : positionOf( m, off );
						const draftId = `${ w.comp }:js:${ line }:${ col }`;
						calls.add( `${ c.kind }@${ draftId }` );
						if ( ! staticCall.has( `${ c.kind }@${ draftId }` ) ) {
							const detail = 'timer' === c.kind ? { fn: c.fn, delay: null } : 'observer' === c.kind ? { type: c.fn } : { target: node && 'MemberExpression' === node.callee.type ? m.text.slice( node.callee.object.start, node.callee.object.end ) : null };
							const r = { kind: c.kind, draftId, component: w.comp, detail };
							ops.push( () => {
								runtimeOnly.set( `${ c.kind }@${ draftId }`, r );
								sight( r, v.label, width );
							} );
						}
					}
				}
				const renderedSet = new Set( raw.rendered.map( ( x ) => x.split( '|' )[ 0 ] ) );
				for ( const l of raw.loose ) {
					const owners = helmetEls.filter( ( { e } ) => e.n === l.n && e.tag === l.tag && ( null === l.text || ( e.body || '' ) === l.text )
						&& [ 'src', 'href' ].every( ( a ) => ( e.attrs.find( ( [ x ] ) => x === a )?.[ 1 ] ?? null ) === l[ a ] ) );
					owners.forEach( ( { comp } ) => renderedSet.add( `${ comp }:${ l.n }` ) );
					if ( ! owners.length ) {
						ops.push( () => traceGap.set( `loose:${ l.n }:${ l.tag }`, `stamped <${ l.tag }> data-dc-tpl ${ l.n } outside every import host matches no helmet element` ) );
					}
				}
				ops.push( () => raw.mounted.forEach( ( c ) => ctx.mountedEver.add( c ) ) );
				const ev = { rendered: renderedSet, mounted: new Set( raw.mounted ), motion: raw.motion, calls, cov, ran, fonts: new Set( raw.fonts ), sheets: new Set( raw.sheets ), imports: new Set( raw.imports ) };
				const known = new Set( base.rows.filter( ( r ) => 'template-element' === r.kind ).map( ( r ) => r.draftId ) );
				const pv = { visit: v.label, width, ms: Date.now() - t, settleMs, virtualMs: Math.round( settle.virtualMs ), mounted: raw.mounted, rendered: raw.rendered.length, calls: raw.calls.length };
				ops.push( () => {
					let n = 0;
					for ( const r of rows ) {
						const d = decide( r, ev, ctx );
						if ( true === d ) {
							reached.add( r.id );
							sight( r, v.label, width );
							n++;
						} else if ( d?.gap ) {
							traceGap.set( r.id, d.gap );
						}
					}
					for ( const x of raw.rendered ) {
						const [ key, tag ] = x.split( '|' );
						if ( ! known.has( key ) ) {
							const r = { kind: 'template-element', draftId: key, component: splitId( key )[ 0 ], detail: { tag, inFor: null } };
							runtimeOnly.set( `template-element@${ key }`, r );
							sight( r, v.label, width );
						}
					}
					perVisit.push( { visit: pv.visit, width, ms: pv.ms, settleMs, virtualMs: pv.virtualMs, mounted: pv.mounted, rendered: pv.rendered, reached: n, calls: pv.calls } );
				} );
				unitVisits.push( v.label );
			}
		} catch ( e ) {
			failed = e;
		} finally {
			if ( sb ) {
				await sb.close();
				const unitBlocked = [ ...sb.blocked ];
				ops.push( () => blocked.push( ...unitBlocked ) );
			}
		}
		if ( failed ) {
			const done = new Set( unitVisits );
			ops.push( () => group.visits.filter( ( v ) => ! done.has( v.label ) ).forEach( ( v, i ) => gaps.push( { construct: 'runtime-visit', draftId: `${ v.label }@${ width }`, error: 0 === i ? failed.message.split( '\n' ).slice( 0, 3 ).join( ' ' ) : 'not visited: an earlier visit on this page failed' } ) ) );
		}
		return ops;
	};
	const units = widths.flatMap( ( width ) => groupVisits( visits, entry ).map( ( group ) => ( { width, group } ) ) );
	for ( const ops of await mapPool( units, poolSize(), runUnit ) ) {
		ops.forEach( ( op ) => op() );
	}
	if ( gaps.length ) {
		rows.filter( ( r ) => ! reached.has( r.id ) ).forEach( ( r ) => traceGap.set( r.id, `not decided: ${ gaps.length } visit(s) failed` ) );
	}
	const traceGaps = [ ...traceGap ].filter( ( [ id ] ) => ! reached.has( id ) ).map( ( [ id, error ] ) => ( { id, error } ) ).sort( ( a, b ) => ( a.id < b.id ? -1 : a.id > b.id ? 1 : 0 ) );
	traceGaps.forEach( ( g ) => gaps.push( { construct: 'runtime-trace', draftId: g.id, error: g.error } ) );
	return { sightings, perVisit, gaps, traceGaps, runtimeOnly: [ ...runtimeOnly.values() ], kinds: TRACED_KINDS, wallMs: Date.now() - t0, blocked, usage: { css: [ ...usage.css ], inline: [ ...usage.inline ], elements: [ ...usage.elements.values() ], blockedSheets: usage.blockedSheets, foreignSheets: usage.foreignSheets, foreignElements: usage.foreignElements } };
}
