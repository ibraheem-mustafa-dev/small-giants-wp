// The re-derived surfaces inventory (Spec 48 FR-48-25, METHOD.md §7, §8): one record per component, one per route,
// and one per group of interactive `sc-if`s that share their state keys. Every `sc-if` is classified by what its
// condition reads (lib/intake-defects-keys.mjs::conditionKeys, the same reading FR-48-34's forcing uses): interactive
// state (a toggling surface), route, breakpoint (viewport keys the harness widths set), prop variant or content
// variant. Each state carries the patches the draft-defect forcing sets (patchesOf) and reaches through
// lib/intake-state.mjs::setDraftState, and the template handlers whose methods write those keys. FR-48-29's prop
// variants become states of the component's own surface.
import { conditionKeys, patchesOf, logicModel } from './intake-defects-keys.mjs';
import { walkAst } from './intake-census-logic.mjs';
import { stateWriters, routeKeys, viewportKeys, timeReads } from './intake-inventory-keys.mjs';
import { declaratorsOf } from './intake-inventory-code.mjs';

const KIND_BY_NAME = [ [ /drawer|mobile|burger|hamburger|offcanvas/i, 'drawer' ], [ /mega|menu|nav|dropdown/i, 'menu' ], [ /modal|dialog|popup|lightbox|overlay/i, 'modal' ],
	[ /step|stage|wizard/i, 'form-step' ], [ /sent|submitted|success|done|thanks|result|error|invalid/i, 'result' ], [ /faq|acc|expand|collapse|open/i, 'accordion' ],
	[ /backdrop|scrim/i, 'backdrop' ], [ /header/i, 'header' ], [ /footer/i, 'footer' ], [ /form|apply|enquir|checkout|signin|login|register/i, 'form' ] ];
const kindOfName = ( name, fallback ) => KIND_BY_NAME.find( ( [ re ] ) => re.test( name ) )?.[ 1 ] ?? fallback;
const pad = ( i ) => `S-${ String( i ).padStart( 2, '0' ) }`;
const nOf = ( id ) => id.slice( id.lastIndexOf( ':' ) + 1 );
const routeName = ( r ) => String( r ).replace( /\.dc\.html$/, '' );
const rootOf = ( value ) => /^\s*\{\{\s*!*\s*([A-Za-z_$][\w$]*)/.exec( value || '' )?.[ 1 ] ?? null;

// The state keys (the viewport's excluded) a renderVals key reads, followed through renderVals locals, variables
// declared inside the code it reads, and this.<member> bodies (depth 3): the state an sc-if condition depends on when
// conditionKeys finds no forceable key. With `field` (a loop item's field, `b.open` → `open`), only the values written
// to that field inside the list's code are read: a field no state reaches is a content variant of the list.
function readsState( source, root, field = null, viewport = new Set() ) {
	const m = logicModel( source );
	const declarators = declaratorsOf( m );
	const alias = new Set( [ ...m.locals ].filter( ( [ , l ] ) => 'MemberExpression' === l.node?.type && ! l.node.computed && 'ThisExpression' === l.node.object.type && 'state' === l.node.property.name ).map( ( [ k ] ) => k ) );
	const reads = ( start, onlyField ) => {
		const seen = new Set();
		const hit = new Set();
		const fieldValues = [];
		const visit = ( node, depth ) => {
			if ( ! node || depth > 3 || seen.has( node ) ) {
				return;
			}
			seen.add( node );
			walkAst( node, ( n ) => {
				if ( onlyField && 'ObjectProperty' === n.type && ! n.computed && onlyField === ( n.key.name ?? n.key.value ) ) {
					fieldValues.push( n.value );
				} else if ( 'MemberExpression' === n.type && ! n.computed && 'MemberExpression' === n.object?.type && 'ThisExpression' === n.object.object?.type && 'state' === n.object.property?.name ) {
					hit.add( n.property.name );
				} else if ( 'MemberExpression' === n.type && ! n.computed && alias.has( n.object?.name ) ) {
					hit.add( n.property.name );
				} else if ( 'Identifier' === n.type && m.locals.has( n.name ) ) {
					const l = m.locals.get( n.name );
					if ( l.state ) {
						hit.add( l.state );
					} else {
						visit( l.node, depth + 1 );
					}
				} else if ( 'Identifier' === n.type ) {
					const d = declarators.get( n.name )?.find( ( x ) => x.init !== node && start.start <= x.start && x.end <= start.end );
					if ( d ) {
						visit( d.init, depth + 1 );
					}
				} else if ( 'MemberExpression' === n.type && ! n.computed && 'ThisExpression' === n.object?.type && m.members.has( n.property.name ) && ! [ 'state', 'props' ].includes( n.property.name ) ) {
					const mem = m.members.get( n.property.name );
					visit( mem.body ?? mem.value, depth + 1 );
				}
			} );
		};
		visit( start, 0 );
		return { hit, fieldValues };
	};
	const node = m.vals.get( root );
	if ( ! node ) {
		return [];
	}
	let keys = reads( node, field ).hit;
	if ( field ) {
		const r = reads( node, field );
		keys = new Set( r.fieldValues.flatMap( ( v ) => [ ...reads( v, null ).hit ] ) );
		if ( ! r.fieldValues.length ) {
			const scope = m.members.get( 'renderVals' );
			const all = scope ? reads( scope.body ?? scope, field ).fieldValues : [];
			keys = new Set( all.flatMap( ( v ) => [ ...reads( v, null ).hit ] ) );
		}
	}
	return [ ...keys ].filter( ( k ) => ! m.viewport.has( k ) && ! viewport.has( k ) );
}

// The surfaces records of a census. `model` is lib/intake-inventory-code.mjs::codeModel's; `anim` the animations
// result (records and meta, for each state's animation IDs); `routing` the adapter's result (or null); `props` the
// FR-48-29 list (lib/intake-props.mjs). Returns { records, counts, unresolved, scIf: Map(sc-if row id → S id),
// componentSurface: Map(component → S id), keySurfaces: Map(`<component>:<state key>` → [S id]) }.
export function surfaceRecords( census, { model, anim = { records: [] }, routing = null, props = [] } ) {
	const list = [];
	const unresolved = [];
	const scIf = new Map();
	const componentSurface = new Map();
	const keySurfaces = new Map();
	const add = ( rec ) => {
		rec.id = pad( list.length + 1 );
		list.push( rec );
		return rec;
	};
	const rowsOf = ( comp ) => model.rowsByComp.get( comp ) || [];
	const timeOf = ( comp ) => {
		const t = timeReads( model.progs.get( comp ) );
		return { value: t.length > 0, reason: t.length ? `${ comp } reads ${ t.join( ', ' ) }` : `${ comp } reads no clock, random, storage or timer` };
	};
	const entries = census.sources.filter( ( s ) => 'entry' === s.via ).map( ( s ) => s.component );
	const files = 'files' === routing?.adapter;
	const routeByFile = new Map( files ? routing.routes.map( ( r ) => [ r.key, r ] ) : [] );

	// One record per component: the entry's app shell (or, for one file per page, the page), an import its parent mounts.
	for ( const s of census.sources ) {
		const entry = entries.includes( s.component );
		const route = files ? routeByFile.get( s.file ) : null;
		const mounts = census.rows.filter( ( r ) => 'dc-import' === r.kind && r.detail.name === s.component );
		const formy = s.stamped.elements.some( ( e ) => 'form' === e.tag ) || s.stamped.elements.filter( ( e ) => /^(input|textarea|sc-raw-select|select)$/.test( e.tag ) ).length > 1;
		const rec = add( {
			kind: route ? 'page' : entry ? 'global' : kindOfName( s.component, formy ? 'form' : 'panel' ), name: s.component, dc: s.component,
			template_tpl_id: mounts.length ? null : '0', route: route ? route.key : entry ? '*' : null, page_key: route ? routeName( route.key ) : null,
			parent: null, opened_by: entry ? 'page load' : `mounted by ${ mounts.map( ( r ) => r.draftId ).join( ', ' ) || 'no parent' }`, closed_by: entry ? 'never (always rendered)' : 'unmounted with its parent',
			states: [ { name: 'default', state_keys: {}, how_to_reach: entry ? 'load the page' : 'the parent mounts it with its default props' } ], time_dependent: timeOf( s.component ),
			source: `${ s.file } (${ s.via })`,
		} );
		componentSurface.set( s.component, rec.id );
	}
	for ( const s of census.sources ) {
		const parent = census.rows.find( ( r ) => 'dc-import' === r.kind && r.detail.name === s.component )?.component;
		list.find( ( x ) => x.id === componentSurface.get( s.component ) ).parent = parent ? componentSurface.get( parent ) : null;
	}

	// FR-48-29: a variant a parent mounts is a state of the component's surface.
	for ( const p of props ) {
		const rec = list.find( ( x ) => x.id === componentSurface.get( p.component ) );
		for ( const v of p.variants ) {
			const by = p.mounted.find( ( m ) => m.value === v )?.by ?? [];
			rec?.states.push( { name: `prop ${ p.prop }=${ v }`, state_keys: { [ `props.${ p.prop }` ]: v }, sc_if_tpl_ids: p.gates.map( nOf ), how_to_reach: `mounted by ${ by.join( ', ' ) } with ${ p.prop }="${ v }" (FR-48-29 prop variant)` } );
		}
	}

	// One record per route (hash and state routers: a page of the entry draft).
	const routeCover = {};
	if ( routing?.routes && ! files ) {
		const entry = entries[ 0 ];
		for ( const r of routing.routes ) {
			const href = routing.links?.find( ( l ) => l.route === r.key && /^#/.test( l.href || '' ) )?.href ?? `#/${ r.key }`;
			const rec = add( {
				kind: 'page', name: `route ${ r.key }`, dc: entry, template_tpl_id: null, route: href, page_key: r.key, parent: componentSurface.get( entry ) ?? null,
				opened_by: `${ routing.links?.filter( ( l ) => l.route === r.key ).length ?? 0 } link(s) to ${ href } (${ routing.adapter } adapter)`, closed_by: 'navigating to another route',
				states: [ { name: 'default', state_keys: {}, how_to_reach: `open ${ href }` } ], time_dependent: timeOf( entry ), source: r.source,
			} );
			routeCover[ r.key ] = rec.id;
		}
	} else if ( files ) {
		for ( const r of routing.routes ) {
			const s = census.sources.find( ( x ) => x.file === r.key );
			if ( s ) {
				routeCover[ r.key ] = componentSurface.get( s.component );
			} else {
				unresolved.push( { item: `route ${ r.key }`, reason: 'the page file is not in the census sources' } );
			}
		}
	}

	// Every sc-if, classified; interactive ones grouped by component and state keys.
	const groups = new Map();
	const other = { route: {}, breakpoint: {}, 'prop-variant': {}, 'content-variant': {} };
	const keyReads = new Map();
	const keyReadsOf = ( comp ) => {
		if ( ! keyReads.has( comp ) ) {
			keyReads.set( comp, { router: routeKeys( model.progs.get( comp ) ), sized: viewportKeys( model.progs.get( comp ) ) } );
		}
		return keyReads.get( comp );
	};
	for ( const r of census.rows.filter( ( x ) => 'sc-if' === x.kind ) ) {
		const src = model.sourceOf.get( r.component );
		const loopVars = rowsOf( r.component ).filter( ( x ) => 'sc-for' === x.kind ).map( ( x ) => x.detail.as );
		const ck = conditionKeys( src, r.detail.value, { loopVars } );
		const { router, sized } = keyReadsOf( r.component );
		const keys = [ ...ck.keys.keys() ].filter( ( k ) => ! sized.has( k ) );
		const root = rootOf( r.detail.value );
		const loop = rowsOf( r.component ).filter( ( x ) => 'sc-for' === x.kind && x.detail.as === root ).map( ( x ) => rootOf( x.detail.list ) );
		const field = loop.length ? /^\s*\{\{\s*!*\s*[A-Za-z_$][\w$]*\.([A-Za-z_$][\w$]*)/.exec( r.detail.value )?.[ 1 ] ?? null : null;
		const from = ( loop.length ? loop : [ root ] ).filter( Boolean );
		const read = keys.length ? [] : [ ...new Set( from.flatMap( ( k ) => readsState( src, k, field, sized ) ) ) ];
		const sizedRead = ! keys.length && ! read.length && from.some( ( k ) => readsState( src, k, field ).some( ( x ) => sized.has( x ) ) );
		const own = keys.filter( ( k ) => ! router.has( k ) );
		const stateful = ! own.length && read.some( ( k ) => ! router.has( k ) );
		const all = [ ...keys, ...read ];
		const cls = all.length && all.every( ( k ) => router.has( k ) ) ? 'route' : own.length || stateful ? 'interactive' : ck.props.length ? 'prop-variant' : ck.viewport.length || sizedRead || ck.keys.size ? 'breakpoint' : 'content-variant';
		if ( 'interactive' !== cls ) {
			other[ cls ][ r.draftId ] = componentSurface.get( r.component );
			scIf.set( r.id, componentSurface.get( r.component ) );
			continue;
		}
		ck.gaps.forEach( ( g ) => unresolved.push( { item: r.draftId, reason: g } ) );
		if ( stateful ) {
			unresolved.push( { item: r.draftId, reason: `${ r.detail.value } reads draft state through ${ loop.length ? `the loop list ${ loop.join( ', ' ) }` : root }, but no state key to force was found (conditionKeys)` } );
		}
		const names = stateful ? read.filter( ( k ) => ! router.has( k ) ).sort() : own.sort();
		const gk = `${ r.component }|${ names.join( ',' ) }`;
		const g = groups.get( gk ) || { comp: r.component, keys: new Map(), names, rows: [], via: stateful ? loop[ 0 ] ?? root : null };
		ck.keys.forEach( ( vs, k ) => router.has( k ) || sized.has( k ) || g.keys.set( k, [ ...new Set( [ ...( g.keys.get( k ) || [] ), ...vs ] ) ] ) );
		g.rows.push( r );
		groups.set( gk, g );
	}
	for ( const g of groups.values() ) {
		const keys = g.names;
		const writers = [ ...stateWriters( model.progs.get( g.comp ) ) ].filter( ( [ , ks ] ) => keys.some( ( k ) => ks.has( k ) ) ).map( ( [ m ] ) => m );
		const handlers = rowsOf( g.comp ).filter( ( x ) => 'handler' === x.kind && writers.includes( x.detail.method ) );
		const opened = handlers.length ? handlers.map( ( h ) => `${ h.detail.event } on ${ h.detail.wiring === 'template' ? h.draftId : h.detail.target } (${ h.detail.method })` ).join( '; ' )
			: writers.length ? `set by ${ writers.join( ', ' ) } (no template handler wires them)` : 'no code writes these keys';
		const anims = anim.records.filter( ( a ) => a.trigger.state_keys?.some( ( k ) => keys.includes( k ) ) || writers.some( ( w ) => anim.meta?.get( a.id )?.members?.includes( `${ g.comp }:${ w }` ) ) ).map( ( a ) => a.id );
		const patches = patchesOf( g.keys );
		const states = ( patches.length ? patches : [ {} ] ).map( ( patch ) => ( {
			name: Object.keys( patch ).length ? Object.entries( patch ).map( ( [ k, v ] ) => `${ k }=${ JSON.stringify( v ) }` ).join( ', ' ) : 'unforceable',
			state_keys: patch, sc_if_tpl_ids: g.rows.map( ( r ) => nOf( r.draftId ) ),
			how_to_reach: Object.keys( patch ).length ? `${ opened }; or lib/intake-state.mjs::setDraftState({ component: ${ JSON.stringify( g.comp ) }, keys: ${ JSON.stringify( patch ) } })` : 'no type-safe value forces these keys (see unresolved)',
			...( anims.length ? { animation_ids: anims } : {} ),
		} ) );
		const rec = add( {
			kind: kindOfName( keys.join( ' ' ), 'panel' ), name: `${ g.comp }: ${ keys.join( ', ' ) }${ g.via ? ` (read through ${ g.via })` : '' }`, dc: g.comp,
			template_tpl_id: 1 === g.rows.length ? nOf( g.rows[ 0 ].draftId ) : g.rows.map( ( r ) => nOf( r.draftId ) ), route: null, parent: componentSurface.get( g.comp ) ?? null,
			opened_by: opened, closed_by: handlers.length ? 'the same handlers set the keys back (toggle), or another state' : opened,
			states, time_dependent: timeOf( g.comp ), source: writers.join( ', ' ) || 'state',
		} );
		g.rows.forEach( ( r ) => scIf.set( r.id, rec.id ) );
		keys.forEach( ( k ) => keySurfaces.set( `${ g.comp }:${ k }`, [ ...( keySurfaces.get( `${ g.comp }:${ k }` ) || [] ), rec.id ] ) );
	}

	const scIfs = census.rows.filter( ( x ) => 'sc-if' === x.kind );
	const toggling = scIfs.filter( ( r ) => ! Object.values( other ).some( ( o ) => r.draftId in o ) );
	const byDc = ( rows ) => rows.reduce( ( o, r ) => ( { ...o, [ r.component ]: ( o[ r.component ] || 0 ) + 1 } ), {} );
	const counts = {
		routes: { by_dc: Object.fromEntries( entries.map( ( e ) => [ e, files ? 1 : Object.keys( routeCover ).length ] ) ), total: Object.keys( routeCover ).length, covered_by: routeCover, note: `routes from the ${ routing?.adapter ?? 'missing' } routing adapter` },
		toggling_sc_ifs: { by_dc: byDc( toggling ), total: toggling.length, covered_by: Object.fromEntries( toggling.map( ( r ) => [ r.draftId, scIf.get( r.id ) ] ) ) },
		other_sc_ifs: Object.fromEntries( Object.entries( other ).map( ( [ k, v ] ) => [ k, { total: Object.keys( v ).length, covered_by: v } ] ) ),
	};
	return { records: list, counts, unresolved, scIf, componentSurface, keySurfaces };
}
