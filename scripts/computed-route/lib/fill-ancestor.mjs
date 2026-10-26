// A host's part-wide setting written once (Spec 48 FR-48-14b), Fill's side of the ancestor hop. A block that holds other blocks
// can own one setting that paints the same part on every instance of a child block (`sgs/form`'s `fieldBackground` paints
// each field's input). When a child's value has no setting of its own, Fill asks the enclosing blocks, nearest first, through
// the resolver's ancestor hop (lib/resolve.mjs::resolveViaAncestor) with this module's check in its injection point
// (`ctx.loopBody`): the setting is written ONCE on the host when every instance of that part on the surface asks the same
// value at every width Fill reads, and not at all when any instance asks another (that instance keeps its row; a value is
// never averaged) or an instance of the part was never measured. The write goes through Fill's own resolver for the host
// (lib/fill-prop.mjs::resolveProperty against the host's calibrated default for that part), so R-47-5, R-48-1 and the
// tier rules judge it as they judge any other write. The rows it answers are settled naming the host write; a row the hop
// could not answer records the `ancestor` check as run.
import { LOOSE, resolveViaAncestor } from './resolve.mjs';
import { samePaint } from './css-equivalence/tolerance.mjs';
import { notPainted, knownPaths, resolveProperty } from './fill-prop.mjs';
import { refOf } from './tree.mjs';
import { attrsFor } from './db.mjs';
import { makeSettle } from './fill-held.mjs';
import { partHome } from './fill-part-pairing.mjs';
import { SIZE_FAMILY } from './fill-dimensions.mjs';
import { baselineFn, mergedRadius, RADIUS_CORNERS, snapsOf, draftOf, json, valueText } from './fill-resolve-state.mjs';
import { apply, answeredWidths, clashes, recordOwner } from './fill-resolve-element.mjs';

const steps = ( path ) => LOOSE( path ).split( /\s*>\s*/ ).filter( Boolean );

// Whether the steps of `part` end the steps of `home` (a child's part path is the tail of the host's path to it).
const tailOf = ( part, home ) => {
	const a = steps( part );
	const b = steps( home );
	return a.length > 0 && a.length <= b.length && a.every( ( s, i ) => s === b[ b.length - a.length + i ] );
};

// The block's calibration seen through the settings that can paint one child PART: a setting the framework DB places on a
// part (css_element) whose calibrated home (lib/fill-part-pairing.mjs::partHome) the child's part path ends. A setting for the
// wrapper or for another part (the form's content band) is no setting for this part, however many slots calibration lists
// it at (a layout move lists the parts it shifts). Cached per calibration and part.
const VIEWS = new WeakMap();
function partView( st, block, cal, part ) {
	if ( ! cal?.settings ) {
		return cal;
	}
	const views = VIEWS.get( cal ) ?? new Map();
	VIEWS.set( cal, views );
	if ( ! views.has( part ) ) {
		const keep = new Set( attrsFor( st.db, block ).filter( ( r ) => {
			const home = r.css_element ? partHome( st.db, block, cal, r.css_element ) : null;
			return null !== home && '' !== home && tailOf( part, home );
		} ).map( ( r ) => r.attr_name ) );
		views.set( part, { ...cal, settings: Object.fromEntries( Object.entries( cal.settings ).filter( ( [ attr ] ) => keep.has( attr ) ) ) } );
	}
	return views.get( part );
}

// Every element path a block's own settings paint (their slots and reaches), the host's side of the mapping.
const hostPaths = ( cal ) => [ ...new Set( Object.values( cal?.settings || {} ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] ).filter( ( p ) => p && ! String( p ).includes( '::' ) ) ) ];

// The host paths (loose, one per distinct form) that reach a child's part: those the part's own path ends. The root ('')
// is the child's own box, never a part the host's settings name.
export const homesOf = ( cal, part ) => ( '' === part ? [] : hostPaths( cal ).filter( ( p, i, all ) => tailOf( part, p ) && all.findIndex( ( q ) => LOOSE( q ) === LOOSE( p ) ) === i ) );

// A node's descendants' indices.
function subtree( st, index ) {
	return st.nodes.filter( ( r ) => {
		for ( let i = r.parent; null !== i; i = st.nodes[ i ].parent ) {
			if ( i === index ) {
				return true;
			}
		}
		return false;
	} );
}

// What one measured instance's element asks for a property ({ width: value }), judged as Fill judges it: a value that paints
// nothing at a width is left out there, and four equal corners are the one `border-radius` they make (null when they differ).
export function instanceDraft( st, target, prop ) {
	const snaps = snapsOf( st, target.id );
	const painted = ( p ) => Object.fromEntries( Object.entries( snaps ).filter( ( [ , s ] ) => ! notPainted( p, s.styles || {}, s ) ).map( ( [ w, s ] ) => [ Number( w ), s.styles?.[ p ] ] ).filter( ( [ , v ] ) => undefined !== v && '' !== v ) );
	if ( 'border-radius' === prop ) {
		return mergedRadius( Object.fromEntries( RADIUS_CORNERS.map( ( c ) => [ c, draftOf( snaps, ( s ) => s.styles?.[ c ] ) ] ) ) );
	}
	return painted( prop );
}

// Whether two per-width drafts ask the same: the same widths, and the same paint at each.
export const sameAsk = ( prop, a, b ) => {
	const widths = Object.keys( a );
	return widths.length === Object.keys( b ).length && widths.every( ( w ) => w in b && samePaint( prop, a[ w ], b[ w ] ) );
};

// The instances of a host's part (a child block's part whose path the host reaches by `home`): the measured ones, and the
// children whose block calibrates that part where the skeleton gave no element for it (unmeasured, so the part's every
// instance cannot be known).
function instancesOf( st, host, home ) {
	const found = { measured: [], unmeasured: [] };
	for ( const rec of subtree( st, host.index ) ) {
		const cal = st.calFor( rec.name );
		const parts = [ ...new Set( knownPaths( cal ).filter( ( p ) => p && ! String( p ).includes( '::' ) ) ) ].filter( ( p ) => tailOf( p, home ) );
		if ( ! parts.length ) {
			continue;
		}
		const target = rec.targets.find( ( t ) => parts.map( LOOSE ).includes( LOOSE( t.slot ) ) );
		if ( ! target ) {
			found.unmeasured.push( { node: refOf( st.flat[ rec.index ] ), block: rec.name, part: parts[ 0 ] } );
		} else if ( Object.keys( snapsOf( st, target.id ) ).length ) {
			found.measured.push( { rec, target, ref: refOf( st.flat[ rec.index ] ) } );
		}
	}
	return found;
}

// The element a row's value was read on, as the part of its block: the target's own slot, or for a row on the block's root
// the node's other target that is the same draft element (a control the skeleton pairs to both the root and the part).
function sourceOf( rec, target ) {
	if ( '' !== target.slot ) {
		return target;
	}
	return rec.targets.find( ( t ) => '' !== t.slot && json( t.finder ) === json( target.finder ) ) ?? null;
}

// Records why the hop did not look at a row: the `ancestor` check stays under `unchecked`, with the reason on the row.
function skipped( row, why ) {
	row.skipped = { ...( row.skipped || {} ), ancestor: why };
	row.reason = `${ row.reason }; ancestor: not asked: ${ why }`;
}

// Records a row the hop looked at and did not answer: the `ancestor` check ran, so it leaves `unchecked`.
function checked( row, outcome ) {
	row.checks = [ ...new Set( [ ...( row.checks || [] ), 'ancestor' ] ) ];
	row.unchecked = ( row.unchecked || [] ).filter( ( c ) => 'ancestor' !== c );
	outcome && ( row.reason = `${ row.reason }; ancestor: ${ outcome }` );
}

// Runs the hop over every `no-setting` row Fill recorded (st.hopRows, lib/fill-resolve-element.mjs::fillElement): writes each
// host setting once and settles the rows it answers. `hop` is replaceable for the negative control. Returns the counts.
export function partWideWrites( st, { hop = resolveViaAncestor } = {} ) {
	const out = { rows: ( st.hopRows || [] ).length, settled: 0, written: 0 };
	const done = new Map();
	// A row the element already renders (lib/fill-held.mjs) is settled there, and a size (the family lib/fill-dimensions.mjs
	// judges against the rendered box, after this pass) stays for that pass: neither is answered by a host write.
	const held = makeSettle( st );
	for ( const p of st.hopRows || [] ) {
		if ( p.prop in SIZE_FAMILY ) {
			skipped( p.row, 'a size is judged against the rendered box by the dimension pass (lib/fill-dimensions.mjs), after this one' );
			continue;
		}
		if ( held( { unmapped: [ p.row ], writes: [] } ).alreadyHeld.length ) {
			skipped( p.row, 'the element already renders this value (lib/fill-held.mjs), so no host write answers it' );
			continue;
		}
		const source = sourceOf( p.rec, p.target );
		const hosts = [];
		for ( let i = p.rec.parent; source && null !== i; i = st.nodes[ i ].parent ) {
			const hostRec = st.nodes[ i ];
			const homes = homesOf( partView( st, hostRec.name, st.calFor( hostRec.name ), source.slot ), source.slot );
			homes.length && hosts.push( { hostRec, homes } );
		}
		let outcome = hosts.length ? '' : 'no enclosing block holds a setting that paints this part';
		let answer = null;
		for ( const { hostRec, homes } of hosts ) {
			for ( const home of homes ) {
				answer = tryHost( st, p, source, hostRec, home, hop, done );
				if ( answer.settled ) {
					break;
				}
				outcome = answer.outcome;
			}
			if ( answer?.settled ) {
				break;
			}
		}
		if ( answer?.settled ) {
			const at = st.out.unmapped.indexOf( p.row );
			at >= 0 && st.out.unmapped.splice( at, 1 );
			( st.out.settled ??= [] ).push( { node: p.row.node, block: p.row.block, slot: p.row.slot, property: p.prop, value: valueText( p.draft ), widths: Object.keys( p.draft ).map( Number ), reason: answer.reason, via: 'host-write', attr: answer.attr, detail: answer.detail } );
			out.settled++;
		} else {
			checked( p.row, outcome );
		}
	}
	out.written = [ ...done.values() ].filter( ( d ) => d.wrote ).length;
	return out;
}

// One host path: the hop's proof and guard, then Fill's resolver for the write. Returns { settled, reason, attr, detail } or { outcome }.
function tryHost( st, p, source, hostRec, home, hop, done ) {
	const host = st.flat[ hostRec.index ];
	const hostCal = partView( st, hostRec.name, st.calFor( hostRec.name ), source.slot );
	const hostRef = refOf( host );
	const key = `${ hostRec.index }|${ LOOSE( home ) }|${ p.prop }|${ json( p.draft ) }`;
	if ( done.has( key ) ) {
		const d = done.get( key );
		return d.settled ? { ...d, settled: true } : d;
	}
	const { measured, unmeasured } = instancesOf( st, { index: hostRec.index }, home );
	const refuse = ( outcome ) => {
		done.set( key, { outcome } );
		return { outcome };
	};
	if ( unmeasured.length ) {
		return refuse( `${ hostRec.name } paints ${ unmeasured.length } instance(s) of this part the skeleton gives no element (${ unmeasured.slice( 0, 3 ).map( ( u ) => `${ u.node } ${ u.part }` ).join( ', ' ) }), so no write is safe` );
	}
	const paths = measured.map( ( m, i ) => `${ home }:nth-of-type(${ i + 1 })` );
	const byPath = Object.fromEntries( paths.map( ( path, i ) => [ path, measured[ i ] ] ) );
	let why = '';
	const check = ( { paths: reached, prop } ) => {
		const unknown = reached.find( ( r ) => ! byPath[ r ] );
		if ( undefined !== unknown ) {
			why = `${ hostRec.name } paints \`${ unknown }\`, which is not a measured instance of this part, so no write is safe`;
			return null;
		}
		const odd = reached.map( ( r ) => byPath[ r ] ).find( ( m ) => {
			const d = instanceDraft( st, m.target, prop );
			return null === d || ! sameAsk( prop, d, p.draft );
		} );
		why = odd ? `${ odd.ref } asks another ${ prop } value than the rest of the instances` : '';
		return odd ? null : { key: `part-wide:${ hostRef }:${ LOOSE( home ) }` };
	};
	const a = { ref: hostRef, block: hostRec.name, path: home, tag: null, attributes: host.attributes || {}, calibration: hostCal, measured: paths, measuredRefs: Object.fromEntries( paths.map( ( x ) => [ x, byPath[ x ].ref ] ) ) };
	const found = hop( { block: p.rec.name, slot: source.slot, prop: p.prop, state: null, perWidth: p.draft, fontPx: {}, current: st.flat[ p.rec.index ].attributes || {}, siblings: p.siblings },
		{ db: st.db, snapshot: st.snapshot, log: [], canvas: false, ancestors: [ a ], measuredSlots: paths, loopBody: check } );
	if ( ! found?.writes ) {
		return refuse( why || ( found?.cite ? `${ hostRec.name } ${ found.cite.setting } could hold it but its paint ${ found.cite.measuredDescendants?.length > 1 ? 'reaches several instances and not all ask this value' : 'is not proved by calibration' }${ found.cite.resolverGap ? ` (resolver: ${ found.cite.resolverGap })` : '' }` : `${ hostRec.name } has no setting for ${ p.prop }` ) );
	}
	const res = resolveProperty( { node: host, block: hostRec.name, prop: p.prop, draft: p.draft, baseline: baselineFn( st, hostRec, hostCal, p.prop, () => undefined ), slots: [ a.path ], calibration: hostCal, db: st.db, snapshot: st.snapshot, log: st.snaps, fontPx: {}, siblings: p.siblings, fluid: null, declaredFluid: null, declared: {}, contextAt: () => ( {} ) } );
	if ( 'equal' === res.status ) {
		const d = { settled: true, reason: 'equal', attr: found.cite.setting, detail: `${ hostRec.name } ${ found.cite.setting } already paints this value on every instance of the part (its calibrated default)` };
		done.set( key, d );
		return d;
	}
	if ( 'written' !== res.status ) {
		return refuse( `${ hostRec.name } ${ found.cite.setting }: ${ res.gap }: ${ res.detail }` );
	}
	const clash = res.writes.flatMap( ( w ) => ( undefined === host.attributes?.[ w.attr ] ? [] : clashes( host.attributes[ w.attr ], w.value ).map( ( c ) => `${ w.attr } ${ c }` ) ) );
	if ( clash.length ) {
		return refuse( `${ hostRec.name } already holds another value for ${ clash.join( ', ' ) }` );
	}
	apply( st, hostRec, hostRef, hostRec.targets.find( ( t ) => '' === t.slot ) ?? hostRec.targets[ 0 ], p.prop, { ...res, readSlot: a.path, answers: answeredWidths( p.prop, p.draft, res ) }, res.slot );
	res.writes.forEach( ( w ) => recordOwner( st, hostRec, { slot: a.path }, p.prop, w.attr, true ) );
	const d = { settled: true, wrote: true, reason: 'already-set', attr: res.writes.map( ( w ) => w.attr ).join( ', ' ), detail: `written once on ${ hostRec.name } (${ res.writes.map( ( w ) => w.attr ).join( ', ' ) }) for every instance of the part: ${ measured.length } instance(s) ask this value` };
	done.set( key, d );
	return d;
}
