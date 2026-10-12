// Draft defects (Spec 48 FR-48-34, R-47-4, DESIGN decision 3). A draft defect is a closed list with an operational
// test; every other code-render disagreement is `render-wins`, never a defect:
//   1. unresolved-binding: a `style-*` value holds a `{{ }}` binding still unresolved in the compiled rule at read time
//      (lib/intake-defects-binding.mjs).
//   2. unreached: a code-declared state, motion or behaviour (an `unreached` census row of STATE_KINDS) still unreached
//      at every tested width with its state forced (lib/intake-defects-force.mjs), reduced motion, pointer gestures
//      with coordinates (lib/intake-defects-gesture.mjs) and two-step states (lib/intake-defects-chain.mjs) included. Reached at
//      some widths only is a breakpoint; reached when forced is not a defect; forcing that is impossible is a gap row
//      (R-48-3). Unreached but not a defect: `prop-variant` (gated by a prop no parent mounts, FR-48-29), `dead-code` and
//      `prototype-only` (FR-48-33), both proved statically (lib/intake-defects-static.mjs; a construct whose guard needs a
//      field only dead code writes is dead code too, lib/intake-defects-deadfield.mjs, and so is one inside an sc-if
//      false for every item of the draft's own data, lib/intake-defects-datagate.mjs). A dead-code entry carries its
//      `deadKind` (lib/intake-defects-static.mjs::DEAD_KINDS).
import { boundStyleRows, readPageBindings, bindingVerdicts } from './intake-defects-binding.mjs';
import { groupVisits } from './intake-census-runtime.mjs';
import { openForcedPage } from './intake-defects-force.mjs';
import { conditionKeys, patchesOf, propsGating, defectGroups, mountedProps } from './intake-defects-keys.mjs';
import { buildModel, codeTarget, countAt } from './intake-census-map.mjs';
import { deadCodeVerdict, prototypeOnlyWhy, dataGatedWhy } from './intake-defects-static.mjs';
import { deadFieldVerdict } from './intake-defects-deadfield.mjs';
import { chainPass } from './intake-defects-chain.mjs';

export { boundStyleRows, classifyCompiled, readPageBindings, bindingVerdicts, unresolvedBindingDefects } from './intake-defects-binding.mjs';

export const WIDTHS = [ 375, 768, 1440 ];
// The census kinds that are a state, motion or behaviour (FR-48-34 test 2). Any other unreached kind is render-wins.
export const STATE_KINDS = [ 'sc-if', 'style-hover', 'handler', 'timer', 'observer', 'waapi', 'transition', 'keyframes' ];
const isCode = ( r ) => r.draftId.includes( ':js:' );
const nOf = ( r ) => r.draftId.slice( r.draftId.lastIndexOf( ':' ) + 1 );
// The motion properties that declare motion; any other (a duration, a delay, an iteration count, as in a reduced-motion
// override) only modifies motion declared elsewhere, so it is no construct to reach.
const DECLARES_MOTION = new Set( [ 'transition', 'transition-property', 'animation', 'animation-name' ] );
const kebab = ( p ) => p.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );
export const motionModifier = ( r ) => [ 'transition', 'keyframes' ].includes( r.kind ) && Boolean( r.detail?.property ) && ! DECLARES_MOTION.has( kebab( r.detail.property ) );

// FR-48-34 test 2. `census`: { rows, sources } with the runtime pass applied (rows carry `unreached`). Opens one forced
// page per width and page file (hash visits are reached inside it), forces every candidate's state, and decides.
// `onPage(session, { width, visit })` runs on each visit after the rest settle, before any forcing. `force` switches a
// forcing off ({ pseudo, state, events, props, deadCode, deadField, dataGate, reducedMotion, drag, coords, chain }: false); it
// exists only for the tests' negative
// controls. `only` (a Set of census row IDs) limits the candidates, for a second pass over more visits. `flags`
// (lib/intake-flags.mjs::proposeFlags rows, optional) lets a construct be prototype-only (FR-48-33). Returns { rows,
// notDefects, gaps, blocked } (`blocked`: every forced page's aborted requests).
export async function unreachedDefects( { folder, entry, harPath, census, visits = [ entry ], widths = WIDTHS, harness = {}, timeout = 60000, onPage = null, force = {}, only = null, flags = null } ) {
	const out = { rows: [], notDefects: [], gaps: [], blocked: [] };
	const unreached = census.rows.filter( ( r ) => true === r.unreached );
	census.rows.filter( ( r ) => null === r.unreached && r.traceGap ).forEach( ( r ) => out.gaps.push( { construct: r.kind, draftId: r.draftId, error: `the census could not decide reach (${ r.traceGap }); not tested as a draft defect` } ) );
	unreached.filter( ( r ) => ! STATE_KINDS.includes( r.kind ) ).forEach( ( r ) => out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'render-wins', note: `${ r.kind } is not a state, motion or behaviour` } ) );
	const modifier = motionModifier;
	unreached.filter( ( r ) => STATE_KINDS.includes( r.kind ) && modifier( r ) ).forEach( ( r ) => out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'render-wins', note: `${ r.detail.property } modifies motion and declares none` } ) );
	const cands = unreached.filter( ( r ) => STATE_KINDS.includes( r.kind ) && ! modifier( r ) && ( ! only || only.has( r.id ) ) );
	const triggers = census.rows.filter( ( r ) => 'handler' === r.kind && 'template' === r.detail.wiring && r.detail.event );
	const source = new Map( [ ...census.sources.map( ( s ) => [ s.component, s ] ),
		...census.sources.flatMap( ( s ) => s.scripts.filter( ( x ) => x.file ).map( ( x ) => [ x.file, { component: x.file, logic: x.text, logicLine: 1, logicColumn: 0 } ] ) ) ] );
	const texts = new Map( census.sources.map( ( s ) => [ s.component, s.logic ] ) );
	const files = new Set( census.sources.flatMap( ( s ) => s.scripts.filter( ( x ) => x.file ).map( ( x ) => x.file ) ) );
	const model = buildModel( census.sources );
	const rowsByComp = new Map();
	census.rows.forEach( ( r ) => rowsByComp.set( r.component, [ ...( rowsByComp.get( r.component ) || [] ), r ] ) );
	const plan = new Map( cands.map( ( r ) => {
		const target = isCode( r ) || 'handler' === r.kind ? codeTarget( r, model, rowsByComp ) : null;
		const props = new Set( target && ! target.gap && source.get( target.comp ) ? propsGating( source.get( target.comp ), target.off ) : [] );
		const ok = target && ! target.gap;
		const src = ok && false !== force.deadCode && ! files.has( target.comp ) ? source.get( target.comp ) : null;
		const gated = false !== force.deadCode && false !== force.dataGate ? dataGatedWhy( census, { row: r, target: ok ? target : null } ) : null;
		const dead = ( src ? deadCodeVerdict( src, target.off, census ) || ( false !== force.deadField ? deadFieldVerdict( src, target.off, census ) : null ) : null ) || gated;
		const proto = ok ? prototypeOnlyWhy( { target, flags, census, files, model, sources: source } ) : null;
		return [ r.id, { row: r, patches: [], gaps: [], props, dead, proto, at: new Map(), ready: false, target } ];
	} ) );
	// The props each component is mounted with by a parent draft (dc-import attributes), for FR-48-29.
	const mountedWith = mountedProps( census.rows );
	const selectors = [ ...new Set( cands.filter( ( r ) => 'stylesheet' === r.detail.via && r.detail.selector ).map( ( r ) => r.detail.selector ) ) ];
	const failed = new Set();
	for ( const width of widths ) {
		for ( const group of groupVisits( visits, entry ) ) {
			let s = null;
			try {
				s = await openForcedPage( { folder, entry, harPath, file: group.file, hash: group.visits[ 0 ].hash, width, harness, timeout, forcePseudoState: false !== force.pseudo, drag: false !== force.drag, coords: false !== force.coords } );
				for ( const [ i, v ] of group.visits.entries() ) {
					if ( i ) {
						await s.page.evaluate( ( h ) => {
							window.location.hash = h;
						}, v.hash );
						await s.settle();
					}
					if ( onPage ) {
						await onPage( s, { width, visit: v.label } );
					}
					await forceVisit( s, { plan, source, texts, files, selectors, triggers, width, force, last: i === group.visits.length - 1 } );
				}
			} catch ( e ) {
				failed.add( width );
				out.blocked.push( ...( e.blocked || [] ) );
				out.gaps.push( { construct: 'defect-visit', draftId: `${ group.file }@${ width }`, error: e.message.split( '\n' ).slice( 0, 3 ).join( ' ' ) } );
			} finally {
				if ( s ) {
					await s.close();
					out.blocked.push( ...s.blocked );
				}
			}
		}
	}
	for ( const p of plan.values() ) {
		decideRow( p, widths, out, failed, false === force.props ? null : mountedWith );
	}
	return out;
}

// Reach checks after each forcing step on one visit; marks p.at(width) true once reached. Order: rest; each state
// patch (the state is put back after it); each pseudo rule forced; each element's hover chain for its transitions;
// each template handler's event dispatched (`triggers`: every census template handler, reached or not), after which
// the rows whose element only now renders get their pseudo and hover forcing too and the state is put back; code-wired
// listeners, then their pointer gestures; the two-step chain (lib/intake-defects-chain.mjs); a last settle with the
// scroll pass.
async function forceVisit( s, { plan, source, texts, files, selectors, triggers, width, force, last } ) {
	const pending = () => [ ...plan.values() ].filter( ( p ) => ! p.at.get( width ) );
	// Once every candidate is reached at this width, the remaining steps can record nothing decideRow reads (p.at only
	// turns true, and p.gaps or p.patches matter only for a row reached nowhere), so they are skipped. Only on the
	// visit's last hash: a later hash on the same page starts from the state these steps leave (its test-1 reads and
	// its enclosingIfs see it). Rows proven dead or prototype-only stay counted: decideRow checks reach first, so their
	// reach can still change their verdict.
	const done = () => last && ! pending().length;
	const trees = new Map();
	let rendered = new Set();
	const mark = ( p ) => p.at.set( width, true );
	const check = async () => {
		const ev = await s.collect( { selectors, known: [ ...trees.keys() ] } );
		Object.entries( ev.trees ).forEach( ( [ k, t ] ) => trees.set( k, t ) );
		rendered = new Set( ev.rendered.map( ( x ) => x.split( '|' )[ 0 ] ) );
		const cov = new Map();
		( await s.coverage( texts, files ) ).forEach( ( c ) => cov.set( c.comp, [ ...( cov.get( c.comp ) || [] ), c.ranges ] ) );
		for ( const p of pending() ) {
			const r = p.row;
			if ( p.target ) {
				if ( ! p.target.gap && ( countAt( cov, p.target.comp, p.target.off ) || 0 ) > 0 ) {
					mark( p );
				}
			} else if ( 'sc-if' === r.kind ) {
				if ( trees.get( r.component )?.[ nOf( r ) ]?.desc.some( ( d ) => rendered.has( `${ r.component }:${ d }` ) ) ) {
					mark( p );
				}
			} else if ( 'transition' === r.kind || 'keyframes' === r.kind ) {
				const type = 'transition' === r.kind ? 'transitionrun' : 'animationstart';
				if ( ev.motion.some( ( m ) => m.type === type && ( 'stylesheet' === r.detail.via ? m.sel.includes( selectors.indexOf( r.detail.selector ) )
					: '@keyframes' === r.detail.via ? m.name === r.detail.name : m.key === r.draftId ) ) ) {
					mark( p );
				}
			}
		}
	};
	const onElement = ( p ) => ! p.target && [ 'transition', 'keyframes' ].includes( p.row.kind ) && ! [ 'stylesheet', '@keyframes' ].includes( p.row.detail.via );
	// Pseudo rules forced and hover chains run, for every pending row or only those on the draft IDs in `only`.
	const pseudoPass = async ( only = null ) => {
		if ( false === force.pseudo ) {
			return;
		}
		for ( const p of pending().filter( ( q ) => 'style-hover' === q.row.kind && ( ! only || only.has( q.row.draftId ) ) ) ) {
			const hit = await s.forcePseudo( p.row );
			if ( true === hit ) {
				mark( p );
			} else if ( hit?.gap ) {
				p.gaps.push( hit.gap );
			}
		}
		for ( const p of pending().filter( ( q ) => onElement( q ) && ( ! only || only.has( q.row.draftId ) ) ) ) {
			if ( await s.hoverChain( p.row ) ) {
				await check();
			}
		}
		// A handler whose element only renders under a forced state gets its event there (rest-state handlers get it
		// in the trigger pass).
		for ( const p of only && false !== force.events ? pending().filter( ( q ) => 'handler' === q.row.kind && ! isCode( q.row ) && only.has( q.row.draftId ) ) : [] ) {
			if ( await s.dispatch( p.row ) ) {
				await s.nudge();
				await check();
			}
		}
	};
	for ( const p of plan.values() ) {
		if ( p.ready || ( p.target && isCode( p.row ) ) ) {
			continue;
		}
		const around = await s.enclosingIfs( p.row );
		if ( null === around ) {
			continue;
		}
		p.ready = true;
		for ( const f of around.ifs ) {
			const k = conditionKeys( source.get( p.row.component ) || {}, f.value, { loopVars: around.loopVars } );
			k.props.forEach( ( x ) => p.props.add( x ) );
			p.gaps.push( ...k.gaps.map( ( g ) => `sc-if ${ p.row.component }:${ f.n }: ${ g }` ) );
			p.patches.push( ...patchesOf( k.keys ).map( ( patch ) => ( { comp: p.row.component, patch } ) ) );
		}
	}
	await check();
	await s.snapshot();
	if ( false !== force.state ) {
		const seen = new Set();
		for ( const p of pending() ) {
			for ( const x of p.patches ) {
				const key = JSON.stringify( x );
				if ( done() ) {
					break;
				}
				if ( seen.has( key ) ) {
					continue;
				}
				seen.add( key );
				const owners = [ ...plan.values() ].filter( ( q ) => q.patches.some( ( y ) => JSON.stringify( y ) === key ) );
				if ( ! await s.setState( x.comp, x.patch ) ) {
					owners.forEach( ( q ) => q.gaps.push( `${ x.comp } is not mounted: its state cannot be set` ) );
					continue;
				}
				await s.settle();
				await check();
				await pseudoPass( new Set( owners.map( ( q ) => q.row.draftId ) ) );
				await s.restore();
			}
		}
	}
	await pseudoPass();
	if ( done() ) {
		return;
	}
	const triggerPass = async () => {
		for ( const h of triggers ) {
			if ( done() ) {
				return;
			}
			const before = rendered;
			if ( ! await s.dispatch( h ) ) {
				continue;
			}
			await s.nudge();
			await check();
			const fresh = new Set( [ ...rendered ].filter( ( k ) => ! before.has( k ) ) );
			if ( fresh.size ) {
				await pseudoPass( fresh );
			}
			if ( await s.restore() ) {
				await check();
			}
		}
		await s.listeners();
		await check();
		if ( false !== force.drag || false !== force.coords ) {
			await s.gestures();
			await check();
		}
		await s.restore();
	};
	if ( false !== force.events ) {
		await triggerPass();
		if ( done() ) {
			return;
		}
		await s.wiggle();
		await check();
	}
	if ( done() ) {
		return;
	}
	if ( false !== force.chain && false !== force.events ) {
		const keys = new Set();
		const patches = pending().flatMap( ( p ) => p.patches ).filter( ( x ) => ! keys.has( JSON.stringify( x ) ) && keys.add( JSON.stringify( x ) ) );
		const chain = await chainPass( s, { triggers, patches: false !== force.state ? patches : [], pending, check, rendered: () => rendered, pseudoPass } );
		const why = chain.lost ? 'a route change inside the two-step chain could not be undone, so the rest of the chain was not run'
			: chain.exhausted ? `the two-step chain stopped at its budget of ${ chain.attempts } attempts with openers untried` : null;
		if ( why ) {
			pending().forEach( ( p ) => p.gaps.push( `${ why } at ${ width }` ) );
		}
		await s.restore();
		await check();
	}
	if ( done() ) {
		return;
	}
	await s.settle();
	await check();
	// Reduced motion is a forced state too: code that branches on prefers-reduced-motion runs only under `reduce`.
	if ( false !== force.reducedMotion && pending().length ) {
		await s.page.emulateMedia( { reducedMotion: 'reduce' } );
		await s.settle();
		await check();
		await pseudoPass();
		if ( false !== force.events ) {
			await triggerPass();
		}
		await s.page.emulateMedia( { reducedMotion: 'no-preference' } );
		await s.settle();
		await check();
	}
}

// One candidate's verdict across the widths: a defect row, a not-defect, or a gap when forcing was impossible. A
// construct unreached everywhere whose gating condition reads props that no parent draft mounts the component with is
// a prop variant (FR-48-29: the design is the default-prop render; another variant is a state only when a parent mounts
// it), never a defect; when a parent does mount one of those props, it stays a candidate.
function decideRow( p, widths, out, failed = new Set(), mountedWith = new Map() ) {
	const r = p.row;
	const reached = widths.filter( ( w ) => p.at.get( w ) );
	const gaps = [ ...new Set( [ ...( p.target?.gap ? [ p.target.gap ] : [] ), ...p.gaps, ...[ ...failed ].map( ( w ) => `the forced visit at ${ w } failed, so ${ w } is undecided` ) ] ) ];
	if ( reached.length === widths.length ) {
		out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'reached-when-forced', widths: reached } );
	} else if ( reached.length ) {
		out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'breakpoint', widths: reached, note: `reached at ${ reached.join( ', ' ) } only` } );
	} else if ( p.dead ) {
		out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'dead-code', deadKind: p.dead.kind, note: p.dead.note } );
	} else if ( p.proto ) {
		out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'prototype-only', note: `${ p.proto } (FR-48-33)` } );
	} else if ( mountedWith && p.props.size && ! [ ...p.props ].some( ( x ) => mountedWith.get( r.component )?.has( x ) ) ) {
		out.notDefects.push( { draftId: r.draftId, censusId: r.id, why: 'prop-variant', props: [ ...p.props ], note: `gated by prop ${ [ ...p.props ].join( ', ' ) }, which no parent draft mounts ${ r.component } with (FR-48-29)` } );
	} else if ( gaps.length ) {
		out.gaps.push( { construct: r.kind, draftId: r.draftId, error: `unreached at ${ widths.join( ', ' ) } and forcing was incomplete: ${ gaps.join( '; ' ) }` } );
	} else {
		const forced = { state: p.patches.map( ( x ) => x.patch ), pseudo: 'style-hover' === r.kind ? r.detail.pseudo : null, event: 'handler' === r.kind ? r.detail.event : null };
		const mounted = mountedWith ? [ ...p.props ].filter( ( x ) => mountedWith.get( r.component )?.has( x ) ) : [];
		out.rows.push( { draftId: r.draftId, censusId: r.id, component: r.component, test: 'unreached', kind: r.kind, evidence: { forced, scrollPass: true, reachedAt: [], ...( mounted.length ? { mountedProps: mounted } : {} ), ...( p.target?.off !== undefined ? { at: { comp: p.target.comp, off: p.target.off } } : {} ) }, widths } );
	}
}

// Numbers rows `defect:<draftId>`, then `:2`, `:3` for a draft ID seen again.
function numberRows( rows ) {
	const n = new Map();
	return rows.map( ( r ) => {
		const k = ( n.get( r.draftId ) || 0 ) + 1;
		n.set( r.draftId, k );
		return { rowId: `defect:${ r.draftId }${ 1 === k ? '' : `:${ k }` }`, ...r };
	} );
}

// Both tests: { rows: [ { rowId, draftId, test, kind, evidence, widths } ], groups, notDefects, gaps, blocked }. `groups` holds
// the rows by enclosing class member or script file (defectGroups), so a function is reviewed once. Test 1 reads the
// compiled rules on every forced page right after its rest settle; test 2 runs only when the census carries the
// runtime pass's `unreached` marks (otherwise a gap row says it was not run).
export async function proposeDraftDefects( { folder, entry, harPath, census, visits = [ entry ], widths = WIDTHS, harness = {}, timeout = 60000, flags = null } ) {
	const bound = boundStyleRows( census );
	const reads = new Map();
	const onPage = ( s, at ) => readPageBindings( s.page, bound, at, reads );
	const marked = census.rows.some( ( r ) => 'boolean' === typeof r.unreached );
	const u = marked
		? await unreachedDefects( { folder, entry, harPath, census, visits, widths, harness, timeout, onPage, flags } )
		: await unreachedDefects( { folder, entry, harPath, census: { ...census, rows: [] }, visits, widths, harness, timeout, onPage } );
	const b = bindingVerdicts( bound, reads );
	const gaps = [ ...b.gaps, ...u.gaps, ...( marked ? [] : [ { construct: 'draft-defect', draftId: entry, error: 'the census carries no runtime `unreached` marks: FR-48-34 test 2 was not run' } ] ) ];
	const rows = numberRows( [ ...b.rows, ...u.rows ] );
	return { rows, groups: defectGroups( rows, census ), notDefects: [ ...b.notDefects, ...u.notDefects ], gaps, blocked: u.blocked };
}
