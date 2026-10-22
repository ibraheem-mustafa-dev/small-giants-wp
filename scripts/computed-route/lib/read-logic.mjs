// The logic reader (Spec 48 FR-48-7, FR-48-24, READING-DC-FILES §1 and §4): the value every hole of every template element
// resolves to at each read width, through the live logic instance's `renderVals()` in the sandboxed page. The draft's own
// logic runs there and never in Node; Node only plans which holes to ask for and files the answers. The width is set by
// resizing the page's viewport (so a draft that measures its own container sets its own tier) and the page given a
// moment to settle. A hole resolves with the runtime's own template grammar (dotted paths, numeric segments, bracket
// lookups, literals, `!`, and the comparisons `===`, `!==`, `==`, `!=` with parentheses) over `{ ...props, ...renderVals() }`
// and, inside an `sc-for`, each item of its list. The elements a width does not render are answered too: `renderVals()`
// holds the values for all of them. A hole that cannot resolve, and every hole of a component with no live instance, is a gap row.
import { widthConditions } from './read-logic-conditions.mjs';
import { readStatics, readStateValues, stateJobsOf, holesByState } from './read-logic-statics.mjs';

export const READ_WIDTHS = [ 375, 768, 1440 ];
const MAX_LOOP = 60;
const MAX_SCOPES = 200;
const MAX_VALUES = 8;

// In-page. in: { comps: { <component>: [ { k, expr, loops: [ { list, as } ] } ] } }. Returns { <component>: { mounted,
// error?, holes: { <k>: { v: [ summary ], n (scopes read), loop, err? } } } }. A summary is { t, v? } with t one of
// string, number, boolean, null, undefined, function, element, array (n), object (keys).
function resolveInPage( { comps } ) {
	const logicOf = ( name ) => {
		const host = document.querySelector( `.sc-host[data-sc-name="${ CSS.escape( name ) }"]` );
		const key = host && Object.keys( host ).find( ( k ) => k.startsWith( '__reactFiber$' ) );
		let f = key ? host[ key ] : null;
		while ( f && ! ( f.stateNode && f.stateNode.logic && f.stateNode.__name === name ) ) {
			f = f.return;
		}
		return f ? f.stateNode.logic : null;
	};
	const matching = ( s, at ) => {
		let depth = 0;
		let quote = null;
		for ( let i = at; i < s.length; i++ ) {
			const c = s[ i ];
			if ( quote ) {
				quote = c === quote ? null : quote;
			} else if ( '"' === c || "'" === c ) {
				quote = c;
			} else if ( '(' === c || '[' === c ) {
				depth++;
			} else if ( ')' === c || ']' === c ) {
				depth--;
				if ( ! depth ) {
					return i;
				}
			}
		}
		return -1;
	};
	const topOperator = ( s ) => {
		let depth = 0;
		let quote = null;
		for ( let i = 0; i < s.length; i++ ) {
			const c = s[ i ];
			if ( quote ) {
				quote = c === quote ? null : quote;
			} else if ( '"' === c || "'" === c ) {
				quote = c;
			} else if ( '(' === c || '[' === c ) {
				depth++;
			} else if ( ')' === c || ']' === c ) {
				depth--;
			} else if ( ! depth ) {
				for ( const op of [ '===', '!==', '==', '!=' ] ) {
					if ( s.startsWith( op, i ) && i > 0 ) {
						return { op, i };
					}
				}
			}
		}
		return null;
	};
	const lookup = ( scope, vals, name ) => ( name in scope ? scope[ name ] : vals[ name ] );
	const evalExpr = ( text, scope, vals ) => {
		let s = text.trim();
		while ( '(' === s[ 0 ] && matching( s, 0 ) === s.length - 1 ) {
			s = s.slice( 1, -1 ).trim();
		}
		const top = topOperator( s );
		if ( top ) {
			const l = evalExpr( s.slice( 0, top.i ), scope, vals );
			const r = evalExpr( s.slice( top.i + top.op.length ), scope, vals );
			// eslint-disable-next-line eqeqeq
			return { '===': l === r, '!==': l !== r, '==': l == r, '!=': l != r }[ top.op ];
		}
		if ( '!' === s[ 0 ] ) {
			return ! evalExpr( s.slice( 1 ), scope, vals );
		}
		if ( /^'.*'$|^".*"$/s.test( s ) ) {
			return s.slice( 1, -1 );
		}
		if ( /^-?\d+(?:\.\d+)?$/.test( s ) ) {
			return Number( s );
		}
		if ( 'true' === s || 'false' === s ) {
			return 'true' === s;
		}
		if ( 'null' === s ) {
			return null;
		}
		if ( 'undefined' === s ) {
			return undefined;
		}
		const head = /^[A-Za-z_$][\w$]*/.exec( s );
		if ( ! head ) {
			throw new Error( `not a path: ${ s }` );
		}
		let cur = lookup( scope, vals, head[ 0 ] );
		let i = head[ 0 ].length;
		while ( i < s.length ) {
			if ( '.' === s[ i ] ) {
				const seg = /^[\w$]+/.exec( s.slice( i + 1 ) );
				if ( ! seg ) {
					throw new Error( `bad segment in ${ s }` );
				}
				cur = null == cur ? undefined : cur[ seg[ 0 ] ];
				i += 1 + seg[ 0 ].length;
			} else if ( '[' === s[ i ] ) {
				const end = matching( s, i );
				if ( end < 0 ) {
					throw new Error( `unclosed bracket in ${ s }` );
				}
				const key = evalExpr( s.slice( i + 1, end ), scope, vals );
				cur = null == cur ? undefined : cur[ key ];
				i = end + 1;
			} else {
				throw new Error( `unexpected ${ s[ i ] } in ${ s }` );
			}
		}
		return cur;
	};
	const summary = ( v ) => {
		if ( undefined === v ) {
			return { t: 'undefined' };
		}
		if ( null === v ) {
			return { t: 'null' };
		}
		const t = typeof v;
		if ( 'function' === t ) {
			return { t: 'function' };
		}
		if ( 'string' === t ) {
			return { t, v: v.length > 200 ? `${ v.slice( 0, 200 ) }…` : v };
		}
		if ( 'number' === t || 'boolean' === t ) {
			return { t, v };
		}
		if ( v.$$typeof ) {
			return { t: 'element' };
		}
		if ( Array.isArray( v ) ) {
			return { t: 'array', n: v.length };
		}
		return { t: 'object', keys: Object.keys( v ).slice( 0, 12 ) };
	};
	const out = {};
	for ( const [ comp, holes ] of Object.entries( comps ) ) {
		const logic = logicOf( comp );
		if ( ! logic ) {
			out[ comp ] = { mounted: false, holes: {} };
			continue;
		}
		let vals;
		try {
			vals = { ...logic.props, ...logic.renderVals() };
		} catch ( e ) {
			out[ comp ] = { mounted: true, error: `renderVals() threw: ${ String( e && e.message || e ).split( '\n' )[ 0 ] }`, holes: {} };
			continue;
		}
		const res = {};
		for ( const h of holes ) {
			try {
				let scopes = [ {} ];
				for ( const loop of h.loops ) {
					const next = [];
					for ( const sc of scopes ) {
						const list = evalExpr( loop.list.replace( /^\s*\{\{|\}\}\s*$/g, '' ), sc, vals );
						( Array.isArray( list ) ? list.slice( 0, h.maxLoop ) : [] ).forEach( ( item, i ) => next.push( { ...sc, [ loop.as ]: item, $index: i } ) );
					}
					scopes = next.slice( 0, h.cap );
				}
				const seen = new Map();
				for ( const sc of scopes ) {
					const s = summary( evalExpr( h.expr, sc, vals ) );
					seen.has( JSON.stringify( s ) ) || seen.set( JSON.stringify( s ), s );
				}
				res[ h.k ] = { v: [ ...seen.values() ].slice( 0, h.max ), n: scopes.length, loop: h.loops.length > 0, ...( seen.size > h.max ? { more: seen.size - h.max } : {} ) };
			} catch ( e ) {
				res[ h.k ] = { v: [], n: 0, loop: h.loops.length > 0, err: String( e && e.message || e ).split( '\n' )[ 0 ] };
			}
		}
		out[ comp ] = { mounted: true, holes: res };
	}
	return out;
}

// The holes to ask each component for: { <component>: [ { k: '<n>|<hole id>', expr, loops (outermost first), cap, maxLoop, max } ] }
// from lib/read-template.mjs's elements.
export function planHoles( template ) {
	const comps = {};
	for ( const key of template.order ) {
		const rec = template.elements[ key ];
		if ( ! rec.holes.length ) {
			continue;
		}
		const loops = [ ...rec.membership.scFor ].reverse().map( ( l ) => ( { list: l.list ?? '', as: l.as } ) );
		( comps[ rec.component ] ||= [] ).push( ...rec.holes.map( ( h ) => ( { k: `${ rec.n }|${ h.id }`, expr: h.expr, loops, cap: MAX_SCOPES, maxLoop: MAX_LOOP, max: MAX_VALUES } ) ) );
	}
	return comps;
}

// Resizes the page and waits for the draft's resize handling to settle.
export async function resizeTo( page, width ) {
	await page.setViewportSize( { width, height: 900 } );
	await page.evaluate( () => new Promise( ( done ) => requestAnimationFrame( () => requestAnimationFrame( () => setTimeout( done, 150 ) ) ) ) );
}

// Answers a plan (planHoles' shape) in the page's current state.
export const askHoles = ( page, comps ) => page.evaluate( resolveInPage, { comps } );

// The logic facts of a template read. `sandbox`: an open intake sandbox (lib/intake-sandbox.mjs::openSandbox); `sources`:
// the census sources (each `component`, `file`, `via`, `logic`, `stamped`); `template`: lib/read-template.mjs's result.
// Returns { holes: { <template key>: { <hole id>: { <width>: { v: [ summary ], n, loop, err? } } } }, conditions: { <sc-if key>:
// { value, width } }, mounted: { <component>: { <width>: boolean } }, state: { <component>: { keys, widthKeys } }, statics: { <component>:
// { entries, functions } } (lib/read-logic-statics.mjs), holesByState: { <template key>: { <surface id>:<state name>: { <hole id>:
// { <width>: { v, n, loop } } } } } (only where a state's value differs from resting), gaps }. `surfaces`: lib/read-surfaces.mjs's
// `surfaces`, whose states' keys are applied in turn.
export async function readLogic( { sandbox, entry, sources, template, widths = READ_WIDTHS, surfaces = {} } ) {
	const plan = planHoles( template );
	const gaps = [];
	const holes = {};
	const mounted = {};
	const answers = {};
	let statics = {};
	let states = {};
	const { jobs, skipped } = stateJobsOf( surfaces );
	const keep = ( comp, width, res ) => {
		mounted[ comp ] = { ...( mounted[ comp ] || {} ), [ width ]: res.mounted };
		answers[ comp ] = { ...( answers[ comp ] || {} ), [ width ]: res };
	};
	const page = await sandbox.visit( entry, { width: widths[ widths.length - 1 ] } );
	try {
		for ( const w of widths ) {
			await resizeTo( page, w );
			const got = await page.evaluate( resolveInPage, { comps: plan } );
			for ( const [ comp, res ] of Object.entries( got ) ) {
				keep( comp, w, res );
			}
		}
		statics = ( await readStatics( { page, components: [ ...new Set( [ ...sources.map( ( s ) => s.component ), ...Object.keys( plan ) ] ) ] } ) ).statics;
		states = await readStateValues( { page, plan, jobs, widths, ask: askHoles, resize: resizeTo } );
		// The state reads put every key back: the resting answers at the last width are read again and must not have moved.
		const last = widths[ widths.length - 1 ];
		const again = jobs.length ? await askHoles( page, plan ) : {};
		for ( const [ comp, res ] of Object.entries( again ) ) {
			res.mounted && answers[ comp ]?.[ last ]?.mounted && JSON.stringify( res.holes ) !== JSON.stringify( answers[ comp ][ last ].holes ) && gaps.push( { construct: 'state-values', draftId: comp, error: `the resting values of ${ comp } at ${ last } changed after the state reads: a state was not put back` } );
		}
	} finally {
		await page.close();
	}
	// A component the entry page never mounted is read in its own file (the root component there).
	for ( const src of sources ) {
		const comp = src.component;
		const need = widths.filter( ( w ) => ! answers[ comp ]?.[ w ]?.mounted );
		if ( ! plan[ comp ] || ! need.length ) {
			continue;
		}
		const alone = await sandbox.visit( src.file, { width: widths[ widths.length - 1 ] } );
		try {
			const root = await alone.evaluate( () => window.__dcRootName() );
			for ( const w of need ) {
				await resizeTo( alone, w );
				const got = root === comp ? await alone.evaluate( resolveInPage, { comps: { [ comp ]: plan[ comp ] } } ) : {};
				keep( comp, w, got[ comp ] || { mounted: false, holes: {} } );
			}
			root === comp && Object.assign( statics, ( await readStatics( { page: alone, components: [ comp ] } ) ).statics );
		} finally {
			await alone.close();
		}
	}
	for ( const key of template.order ) {
		const rec = template.elements[ key ];
		for ( const h of rec.holes ) {
			const per = {};
			const bad = [];
			for ( const w of widths ) {
				const res = answers[ rec.component ]?.[ w ];
				const r = res?.holes[ `${ rec.n }|${ h.id }` ];
				if ( r && ! r.err ) {
					per[ w ] = r;
				} else {
					per[ w ] = r || { v: [], n: 0, loop: false, err: res?.error || 'the component has no live logic instance at this width' };
					bad.push( `${ w }: ${ per[ w ].err }` );
				}
			}
			( holes[ key ] ||= {} )[ h.id ] = per;
			bad.length && gaps.push( { construct: 'hole', draftId: `${ key } ${ h.id }`, error: `{{ ${ h.expr } }} did not resolve (${ bad.join( '; ' ) })` } );
		}
	}
	const conditions = {};
	const state = {};
	for ( const src of sources ) {
		const scIfs = template.order.map( ( k ) => template.elements[ k ] ).filter( ( r ) => r.component === src.component && 'sc-if' === r.tag ).map( ( r ) => ( { key: r.key, n: r.n, value: r.own.value } ) );
		const c = widthConditions( { source: src, scIfs } );
		Object.assign( conditions, c.conditions );
		gaps.push( ...c.gaps );
		c.state && ( state[ src.component ] = c.state );
	}
	const unreached = jobs.filter( ( j ) => ! states[ j.id ]?.reached ).map( ( j ) => j.id );
	unreached.length && gaps.push( { construct: 'state-values', draftId: unreached.join( ', ' ), error: 'the state keys could not be set (the component has no live instance on the entry page, or its setState refused them), so no per-state value was read' } );
	skipped.length && gaps.push( { construct: 'state-values', draftId: skipped.join( ', ' ), error: 'the state keys are not literal state of the live instance (a prop variant, a selector, or a placeholder value), so no per-state value was read' } );
	const elements = template.order.map( ( k ) => ( { key: k, component: template.elements[ k ].component, n: template.elements[ k ].n, holes: template.elements[ k ].holes } ) );
	return { holes, conditions, mounted, state, statics, holesByState: holesByState( { elements, rest: answers, states, widths } ), gaps };
}
