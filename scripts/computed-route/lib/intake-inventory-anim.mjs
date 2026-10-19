// The re-derived animations inventory (Spec 48 FR-48-25, METHOD.md §4, §5, §8): one record per effect, built from the
// census rows (lib/intake-census.mjs) and the census's own parse of the logic: an A record per Web Animations call in
// a draft's logic (L in a helmet script), a J record per JS style, text, scroll or playback writer, and the template
// and stylesheet records of lib/intake-inventory-tpl.mjs. Every record keeps the census rows it covers, so each
// counted occurrence maps to record IDs (`occurrences`), and the five METHOD.md §4 counts are taken from the census.
import { codeModel, offsetOf, nodeAt, lineOf, textOf, functionName, triggerOf, reducedMotionOf } from './intake-inventory-code.mjs';
import { targetOf, waapiEffect, writerSites } from './intake-inventory-target.mjs';
import { templateRecords, animationRecord, applyReducedMotion, traceOf } from './intake-inventory-tpl.mjs';
import { parseTransition } from './intake-inventory-css.mjs';

const isCode = ( r ) => r.draftId.includes( ':js:' );
const compOf = ( r ) => ( isCode( r ) ? r.draftId.split( ':js:' )[ 0 ] : r.component );
const pad = ( prefix, i ) => `${ prefix }-${ String( i ).padStart( /^(TR|PS)$/.test( prefix ) ? 3 : 2, '0' ) }`;

// The METHOD.md §4 categories (the master schema's `counts`) and the census rows each counts.
export const CATEGORIES = {
	animate_calls: ( r ) => 'waapi' === r.kind,
	inline_transitions: ( r ) => 'transition' === r.kind && ! isCode( r ) && 'transition' === r.detail.property,
	pseudo_rules: ( r ) => 'style-hover' === r.kind,
	css_animations: ( r ) => 'keyframes' === r.kind,
};

// The animations records of a census ({ rows, sources }; rows with the runtime pass applied when it ran).
// `notDefects` (the draft-defect stage's list, optional) marks a construct proved dead code. Returns { records (with
// IDs, no internal fields), census: Map(census row id → [record id]), sites: [{ key, comp, recordId }] (one per JS
// writer), counts, unresolved, meta: Map(record id → { comp, tpl, via, members }) }.
export function animationRecords( census, { notDefects = [] } = {} ) {
	const model = codeModel( census );
	const dead = new Map( notDefects.filter( ( d ) => 'dead-code' === d.why ).map( ( d ) => [ d.censusId, d.note ] ) );
	const list = [];
	const metaOf = new Map();
	const covers = new Map();
	const add = ( prefix, rec, rows = [], meta = {} ) => {
		rec._prefix = prefix;
		list.push( rec );
		metaOf.set( rec, { tpl: [], via: [], members: [], ...meta } );
		add.map( rec, rows );
		const d = rows.map( ( r ) => dead.get( r.id ) ).find( Boolean );
		if ( d && 'active' === rec.status ) {
			rec.status = 'dead-code';
			rec.notes = [ rec.notes, `dead code: ${ d }` ].filter( Boolean ).join( '; ' );
		}
		return rec;
	};
	add.map = ( rec, rows ) => rows.forEach( ( r ) => covers.set( r.id, [ ...( covers.get( r.id ) || [] ), rec ] ) );
	const unresolved = [];
	const code = ( comp ) => {
		const p = model.progs.get( comp );
		const owner = p?.file ? model.scriptOwner.get( comp ) : comp;
		return { p, owner, file: p?.file ? comp : model.sourceOf.get( comp )?.file ?? comp };
	};
	const element = ( comp, owner, t, describe ) => ( {
		dc: owner, template_tpl_id: t.tpl.length ? ( 1 === t.tpl.length ? t.tpl[ 0 ] : t.tpl ) : null,
		...( t.near?.length ? { nearest_tpl_id: 1 === t.near.length ? t.near[ 0 ] : t.near } : {} ),
		selector: t.selector, ...( t.rule ? { selection_rule: t.rule } : {} ), description: describe,
	} );
	const triggerField = ( tr ) => ( { type: tr.type, detail: tr.detail, ...( tr.state_keys?.length ? { state_keys: tr.state_keys } : {} ) } );
	const statusOf = ( tr ) => ( false === tr.called ? 'dead-code' : 'active' );

	// A and L: one record per Web Animations call site.
	for ( const r of census.rows.filter( ( x ) => 'waapi' === x.kind ) ) {
		const comp = compOf( r );
		const { p, owner, file } = code( comp );
		const call = p && nodeAt( p, offsetOf( p, r.draftId ), /^CallExpression$/ );
		if ( ! call || 'animate' !== ( call.callee.property?.name ) ) {
			unresolved.push( { item: r.id, reason: 'the census row names no .animate() call in the parsed program' } );
			add( p?.file ? 'L' : 'A', fallback( owner, file, r, 'waapi' ), [ r ] );
			continue;
		}
		const fx = waapiEffect( p, call );
		const tr = triggerOf( model, comp, call );
		const t = p.file ? { tpl: [], selector: textOf( p, call.callee.object ), rule: `inside ${ comp }: ${ textOf( p, call.callee.object ) }` } : targetOf( model, comp, call.callee.object );
		const fn = functionName( p, call );
		const owners = p.file ? census.rows.filter( ( x ) => 'helmet-script' === x.kind && x.detail.src && x.detail.src.endsWith( comp ) ).map( ( x ) => x.draftId.split( ':' ).pop() ) : [];
		add( p.file ? 'L' : 'A', {
			name: `Web Animation in ${ fn } on ${ t.selector }`, mechanism: 'waapi',
			element: element( comp, owner, p.file ? { ...t, near: owners } : t, `animated element: ${ t.selector }` ),
			source: { file, function: fn, ref: /^ref /.test( t.selector ) ? t.selector.slice( 4 ) : null, line: lineOf( call ), code: textOf( p, call ) },
			trigger: triggerField( tr ), properties: fx.properties, duration_ms: fx.timing.duration, delay_ms: fx.timing.delay ?? 0, stagger: null,
			easing: fx.timing.easing, iterations: fx.timing.iterations, direction: fx.timing.direction, fill: fx.timing.fill,
			reduced_motion: reducedMotionOf( p, call ), status: statusOf( tr ), trace: traceOf( [ r ] ),
			...( null != tr.delay ? { notes: `started after setTimeout ${ tr.delay }` } : {} ),
		}, [ r ], { comp, tpl: t.tpl.map( ( n ) => `${ t.comp }:${ n }` ), via: tr.via.map( ( o ) => `${ comp }@${ o }` ), members: tr.members.map( ( m ) => `${ comp }:${ m }` ), trigger: tr } );
	}

	// J: one record per JS writer site; a census transition or keyframes row inside a writer folds into it.
	const sites = [];
	const codeMotion = census.rows.filter( ( r ) => isCode( r ) && [ 'transition', 'keyframes' ].includes( r.kind ) );
	const folded = new Set();
	for ( const [ comp, p ] of model.progs ) {
		const { owner, file } = code( comp );
		for ( const w of writerSites( p ) ) {
			const tr = triggerOf( model, comp, w.node );
			const t = ! w.target ? { tpl: [], selector: 'window', rule: 'the window scroll position' } : p.file ? { tpl: [], selector: textOf( p, w.target ), rule: `inside ${ comp }` } : targetOf( model, comp, w.target );
			const inside = codeMotion.filter( ( r ) => compOf( r ) === comp && ( ( o ) => w.node.start <= o && o < w.node.end )( offsetOf( p, r.draftId ) ) );
			inside.forEach( ( r ) => folded.add( r.id ) );
			const fn = functionName( p, w.node );
			const rec = add( 'J', {
				name: `${ w.mechanism } in ${ fn } on ${ t.selector }`, mechanism: w.mechanism,
				element: element( comp, owner, t, `written element: ${ t.selector }` ),
				source: { file, function: fn, ref: /^ref /.test( t.selector ) ? t.selector.slice( 4 ) : null, line: lineOf( w.node ), code: textOf( p, w.node ) },
				trigger: triggerField( tr ), properties: w.properties.map( ( x ) => ( { property: x.property, from: null, to: x.to ?? null, ...( x.formula ? { formula: x.formula } : {} ) } ) ),
				duration_ms: 0, delay_ms: 'number' === typeof tr.delay ? tr.delay : 0, stagger: null, easing: null, iterations: 'interval' === tr.type || 'loop' === tr.type ? 'infinite' : 1,
				direction: null, fill: null, reduced_motion: reducedMotionOf( p, w.node ), status: statusOf( tr ),
				trace: { observed: 'not-instrumented', note: 'the census does not trace style writes; timer and frame writers are sampled (inventory.samples)' },
			}, inside, { comp, tpl: t.tpl.map( ( n ) => `${ t.comp }:${ n }` ), via: tr.via.map( ( o ) => `${ comp }@${ o }` ), members: tr.members.map( ( m ) => `${ comp }:${ m }` ), trigger: tr } );
			sites.push( { key: `${ comp }:js:${ lineOf( w.node ) }:${ w.node.loc.start.column }`, comp, rec } );
		}
	}

	// Template and stylesheet records, then code-built transition and animation strings no writer holds.
	const { rmRecords, defs } = templateRecords( census, add );
	for ( const raw of codeMotion.filter( ( x ) => ! folded.has( x.id ) ) ) {
		const r = { ...raw, detail: { ...raw.detail, property: raw.detail.property?.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ), value: String( raw.detail.value ?? '' ).replace( /^(['"`])([\s\S]*)$/, '$2' ) } };
		const comp = compOf( r );
		const { p, owner, file } = code( comp );
		const node = nodeAt( p, offsetOf( p, r.draftId ), /./ ) || p.nodes[ 0 ];
		const tr = triggerOf( model, comp, node );
		const element = { dc: owner, template_tpl_id: null, selector: 'a style value built in code', selection_rule: `bound or inserted by ${ functionName( p, node ) }`, description: `code-built ${ r.detail.property ?? 'stylesheet' } string` };
		const source = { file, function: functionName( p, node ), ref: null, line: Number( r.draftId.split( ':js:' )[ 1 ].split( ':' )[ 0 ] ), code: `${ r.detail.property ? `${ r.detail.property }: ` : '' }${ r.detail.value }` };
		const meta = { comp, via: tr.via.map( ( o ) => `${ comp }@${ o }` ), members: tr.members.map( ( m ) => `${ comp }:${ m }` ), trigger: tr };
		if ( 'keyframes' === r.kind && ! r.detail.property ) {
			defs.push( { comp: owner, rows: [ r ], source: () => source, code: true } );
		} else if ( 'keyframes' === r.kind ) {
			animationRecord( add, r, element, source, { trigger: { type: tr.type, detail: tr.detail }, status: statusOf( tr ) } );
		} else {
			const items = 'transition' === r.detail.property ? parseTransition( r.detail.value ) : [ { property: r.detail.property, duration_ms: null, delay_ms: null, easing: null, raw: r.detail.value } ];
			add( 'TR', {
				name: `Code-built transition in ${ source.function }`, mechanism: 'css-transition', element, source, trigger: triggerField( tr ),
				properties: items.map( ( x ) => ( { property: x.property, from: null, to: null, duration_ms: x.duration_ms, delay_ms: x.delay_ms, easing: x.easing, ...( x.raw ? { formula: x.raw } : {} ) } ) ),
				duration_ms: 'per property', delay_ms: 'per property', stagger: null, easing: 'per property', iterations: 1, direction: null, fill: null,
				reduced_motion: reducedMotionOf( p, node ), status: statusOf( tr ), trace: traceOf( [ r ] ),
			}, [ r ], meta );
		}
	}

	// An @keyframes rule maps to the K records naming it; one nothing names is its own dead-code record.
	const named = list.filter( ( x ) => 'K' === x._prefix );
	for ( const d of defs ) {
		const r = d.rows[ 0 ];
		const name = r.detail.name ?? /@keyframes\s+([\w-]+)/.exec( r.detail.value || '' )?.[ 1 ] ?? null;
		const users = named.filter( ( k ) => metaOf.get( k ).names?.includes( name ) );
		const animated = keyframeProperties( r.detail.stops );
		if ( users.length ) {
			users.forEach( ( k ) => {
				add.map( k, [ r ] );
				k.properties = [ k.properties[ 0 ], ...animated ];
			} );
		} else {
			const element = { dc: d.comp, template_tpl_id: null, selector: `@keyframes ${ name }`, description: `keyframes ${ name }` };
			animationRecord( add, { ...r, detail: { property: 'animation-name', value: name ?? 'unnamed' } }, element, d.source( `@keyframes ${ name }` ), { status: 'dead-code' } );
			add.map( list[ list.length - 1 ], [ r ] );
			list[ list.length - 1 ].notes = `no animation declaration names @keyframes ${ name }`;
			list[ list.length - 1 ].properties.push( ...animated );
		}
	}

	// IDs per prefix in build order, then the fields that need them.
	const next = {};
	for ( const rec of list ) {
		next[ rec._prefix ] = ( next[ rec._prefix ] || 0 ) + 1;
		rec.id = pad( rec._prefix, next[ rec._prefix ] );
	}
	applyReducedMotion( list, rmRecords, ( x ) => metaOf.get( x ) );
	const ids = new Map( [ ...covers ].map( ( [ k, recs ] ) => [ k, [ ...new Set( recs.map( ( x ) => x.id ) ) ] ] ) );
	const meta = new Map( list.map( ( x ) => [ x.id, { prefix: x._prefix, ...metaOf.get( x ) } ] ) );
	const records = list.map( ( { _prefix, ...rec } ) => ( void _prefix, order( rec ) ) );
	const counts = {};
	for ( const [ cat, pick ] of Object.entries( CATEGORIES ) ) {
		const rows = census.rows.filter( pick );
		counts[ cat ] = countOf( rows.map( ( r ) => [ compOf( r ), ids.get( r.id ) || [] ] ) );
	}
	counts.js_style_writers = countOf( sites.map( ( s ) => [ s.comp, [ s.rec.id ] ] ) );
	return { records, census: ids, sites: sites.map( ( s ) => ( { key: s.key, comp: s.comp, recordId: s.rec.id } ) ), counts, unresolved, meta };
}

// The animated properties of an @keyframes rule's stops (census detail `stops`: [ { key, decls: [[property, value]] } ]):
// one { property, from, to } per CSS property in order of first appearance, from the property's first and last stop;
// a property with more than two stops also carries `keyframes`: [ { offset (0 to 1), value } ] in offset order. `from`
// and `to` are offsets 0 and 1, a percentage is percent / 100, and a comma list (`0%, 100%`) gives every offset the
// block. A stop that sets the property twice at one offset keeps the later value. A property with a single stop is
// `from` at offset 0 and `to` at offset 1 (the other end is the element's own value, so null); a single stop between
// them keeps `keyframes` so the offset is not lost. `animation-*` declarations inside a stop are not animated values.
export function keyframeProperties( stops = [] ) {
	const offsetOf = ( key ) => ( 'from' === key ? 0 : 'to' === key ? 1 : parseFloat( key ) / 100 );
	const by = new Map();
	for ( const stop of stops ) {
		const offsets = String( stop.key ).split( ',' ).map( ( k ) => k.trim().toLowerCase() ).filter( Boolean ).map( offsetOf ).filter( Number.isFinite );
		for ( const [ property, value ] of stop.decls ) {
			if ( /^-?(?:webkit-)?animation/.test( property ) ) {
				continue;
			}
			const seen = by.get( property ) || new Map();
			offsets.forEach( ( o ) => seen.set( Math.round( o * 10000 ) / 10000, value ) );
			by.set( property, seen );
		}
	}
	return [ ...by ].filter( ( [ , seen ] ) => seen.size ).map( ( [ property, seen ] ) => {
		const frames = [ ...seen ].sort( ( a, b ) => a[ 0 ] - b[ 0 ] ).map( ( [ offset, value ] ) => ( { offset, value } ) );
		if ( 1 === frames.length ) {
			const [ f ] = frames;
			return { property, from: 0 === f.offset ? f.value : null, to: 1 === f.offset ? f.value : null, ...( 0 === f.offset || 1 === f.offset ? {} : { keyframes: frames } ) };
		}
		return { property, from: frames[ 0 ].value, to: frames[ frames.length - 1 ].value, ...( frames.length > 2 ? { keyframes: frames } : {} ) };
	} );
}

// A count object of the master schema from [component, record IDs] per occurrence.
function countOf( pairs ) {
	const by = {};
	pairs.forEach( ( [ c ] ) => ( by[ c ] = ( by[ c ] || 0 ) + 1 ) );
	return { by_dc: by, total: pairs.length, record_ids: [ ...new Set( pairs.flatMap( ( [ , ids ] ) => ids ) ) ] };
}

const ORDER = [ 'id', 'name', 'group', 'mechanism', 'element', 'source', 'trigger', 'properties', 'duration_ms', 'delay_ms', 'stagger', 'easing', 'iterations', 'direction', 'fill', 'reduced_motion', 'breakpoints', 'routes', 'status', 'trace', 'notes' ];
const order = ( rec ) => Object.fromEntries( ORDER.filter( ( k ) => k in rec ).map( ( k ) => [ k, rec[ k ] ] ) );

// A record for a census row the parsed program could not place.
function fallback( owner, file, r, mechanism ) {
	return {
		name: `Unplaced ${ r.kind } ${ r.draftId }`, mechanism, element: { dc: owner, template_tpl_id: null, selector: r.detail.target ?? r.draftId, description: 'not placed in the parsed program' },
		source: { file, function: 'unknown', ref: null, line: Number( r.draftId.split( ':js:' )[ 1 ]?.split( ':' )[ 0 ] ) || null }, trigger: { type: 'state', detail: 'unknown' },
		properties: [ { property: 'unknown', from: null, to: null } ], duration_ms: null, delay_ms: null, stagger: null, easing: null, iterations: 1, direction: null, fill: null,
		reduced_motion: { behaviour: 'unchanged', detail: 'not read' }, status: 'active', trace: traceOf( [ r ] ),
	};
}
