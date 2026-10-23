// The one place that turns a finding into one of FR-48-65's classes. Three inputs reach it: a triage verdict (lib/triage.mjs:
// class W, F, T, U or L and the check that decided it), a Fill reason (a resolver gap), and the instrument gates G0, G3 and G4
// (lib/gate-chain.mjs) read on the row's block. A row whose block's fitting setting is NULL-routed, mistagged, uncalibrated or
// stale is an I-class row whatever else it looks like: it never lands in F or W. An unknown triage class or reason, and an
// unknown FR-48-65 class name, throw: nothing defaults to a class.
import { g3Db, g4Calibration } from './gate-chain.mjs';
import { OWNERS } from './gaps-file.mjs';

export const GAP_CLASSES = Object.keys( OWNERS );
export const I_CLASSES = GAP_CLASSES.filter( ( c ) => c.startsWith( 'I-' ) );
// Classes a row can carry in a report that has no triage verdict behind it.
export const UNASSESSED = 'unassessed';
export const HELD = 'held';

// The class name itself, or a throw when it is not one of FR-48-65's.
export function gapClassOf( cls ) {
	if ( ! GAP_CLASSES.includes( cls ) ) {
		throw new Error( `${ JSON.stringify( cls ) } is not one of FR-48-65's classes (${ GAP_CLASSES.join( ', ' ) })` );
	}
	return cls;
}

// W verdicts that name a measuring artefact (FR-48-65: W-walker). `transient` and `used-value` are artefacts of the walker's
// reading, triage's own checks beside the FR's list.
const WALKER_REASONS = [ 'mispaired', 'same-element', 'unmeasured-side', 'no-live-element', 'consequence', 'unmapped-state', 'content', 'transient', 'used-value' ];
// W verdicts where a setting exists that the route did not find, calibrate or write: the resolver's own gaps, the canvas
// citation, and a setting that triage's fit check listed (`attribute`, `discovered`, `extension`, `enclosing`).
const ROUTE_REASONS = [ 'resolver-blocked', 'canvas-settable', 'attribute', 'discovered', 'extension', 'enclosing' ];
// A verdict that names calibration itself as missing.
const CALIBRATION_REASONS = [ 'uncalibrated-fit', 'resolver-uncalibrated' ];
const FIXED = { T: [ 'resolver-writes', 'W-route' ], U: [ 'box-unexplained', 'W-walker' ], L: [ 'ledger-consequence', 'CLIENT' ] };
const F_REASONS = { 'no-setting': 'F-setting', hardcode: 'F-hardcode' };

const result = ( cls, candidate, reason ) => ( { class: gapClassOf( cls ), candidate, owner: OWNERS[ cls ], reason } );

// FR-48-65's mapping of one triage verdict ({ class, decidedBy }): { class, candidate, owner, reason }. An F verdict is a
// candidate only (F-setting or F-hardcode) until G0 to G7 pass.
export function mapTriage( verdict ) {
	const [ cls, reason ] = [ verdict?.class, verdict?.decidedBy ?? verdict?.reason ];
	if ( 'string' !== typeof reason || '' === reason ) {
		throw new Error( `triage verdict ${ JSON.stringify( cls ) } carries no reason` );
	}
	if ( 'W' === cls ) {
		if ( CALIBRATION_REASONS.includes( reason ) ) {
			return result( 'I-calibration', false, reason );
		}
		if ( WALKER_REASONS.includes( reason ) ) {
			return result( 'W-walker', false, reason );
		}
		if ( ROUTE_REASONS.includes( reason ) || /^resolver-.+/.test( reason ) ) {
			return result( 'W-route', false, reason );
		}
	} else if ( 'F' === cls && F_REASONS[ reason ] ) {
		return result( F_REASONS[ reason ], true, reason );
	} else if ( FIXED[ cls ]?.[ 0 ] === reason ) {
		return result( FIXED[ cls ][ 1 ], false, reason );
	}
	throw new Error( `triage class ${ JSON.stringify( cls ) } with reason ${ JSON.stringify( reason ) } is not in FR-48-65's mapping` );
}

// The class of a Fill resolver gap read as triage reads it (`resolver-<gap>`): uncalibrated is calibration debt and
// no-setting a framework candidate; every other gap is the route's own.
export const mapResolverGap = ( gap ) => mapTriage( 'no-setting' === gap ? { class: 'F', decidedBy: gap } : { class: 'W', decidedBy: `resolver-${ gap }` } );

// A db handle whose block_attributes rows leave out each NULL-css_property row that calibration discovered
// (isDiscovered( row )): an enum setting such as container.layout is routed through discovery, never unrouted.
export function withDiscovery( db, isDiscovered ) {
	return { prepare: ( sql ) => {
		const st = db.prepare( sql );
		return { all: ( ...a ) => st.all( ...a ).filter( ( r ) => ! ( null === r.css_property && undefined !== r.attr_name && isDiscovered( r ) ) ), get: ( ...a ) => st.get( ...a ) };
	} };
}

// The block's ancestors in the framework DB's parent chain, nearest first.
export function ancestorsOf( db ) {
	const parentOf = db.prepare( 'SELECT parent_block FROM blocks WHERE slug = ?' );
	return ( b ) => {
		const out = [];
		for ( let p = parentOf.get( b )?.parent_block; p && ! out.includes( p ); p = parentOf.get( p )?.parent_block ) {
			out.push( p );
		}
		return out;
	};
}

// The DB-versus-code half of G0 for one block: the DB was refreshed after the block's last commit and the block has no
// uncommitted change. i: { dbRefreshedAt, blockCommittedAt, blockChanges }. Returns { pass, class, evidence }.
export function staleCheck( i ) {
	const [ db, commit ] = [ Date.parse( i?.dbRefreshedAt ?? '' ), Date.parse( i?.blockCommittedAt ?? '' ) ];
	const fail = ( evidence ) => ( { pass: false, class: 'I-stale', evidence } );
	if ( Number.isNaN( db ) || Number.isNaN( commit ) ) {
		return fail( `DB refresh time (${ i?.dbRefreshedAt ?? 'unreadable' }) or the block's last commit (${ i?.blockCommittedAt ?? 'unreadable' }) cannot be read` );
	}
	if ( db < commit ) {
		return fail( `the DB was refreshed ${ i.dbRefreshedAt }, before the block's last commit ${ i.blockCommittedAt }` );
	}
	if ( ! Array.isArray( i.blockChanges ) ) {
		return fail( 'the block\'s uncommitted changes were not read' );
	}
	return i.blockChanges.length ? fail( `the block has uncommitted changes (${ i.blockChanges.slice( 0, 3 ).join( '; ' ) })` ) : { pass: true, class: null, evidence: `DB ${ i.dbRefreshedAt } after commit ${ i.blockCommittedAt }` };
}

// A db handle that returns, for block_attributes, only the given row (to ask G3 about one candidate at a time).
const only = ( db, row ) => ( { prepare: ( sql ) => { const st = db.prepare( sql ); return { all: ( ...a ) => ( /FROM block_attributes/.test( sql ) ? [ row ] : st.all( ...a ) ) }; } } );

// The instrument gates read on one row's block: G3 (the DB's settings, discovery-aware), G4 (the calibration cache) and,
// when `stale` is given, G0's DB-versus-code check. i: { db, block, ancestors, property, state, cache, isDiscovered, boxAgrees, stale }.
// Returns { stale, db, calibration, attribute, block }; `attribute` names the setting the failing gate found.
export function instrumentFinding( i ) {
	const seen = [];
	const rec = { prepare: ( sql ) => {
		const st = withDiscovery( i.db, i.isDiscovered ?? ( () => false ) ).prepare( sql );
		return { all: ( ...a ) => {
			const rows = st.all( ...a );
			/FROM block_attributes/.test( sql ) && seen.push( ...rows );
			return rows;
		} };
	} };
	const slice = { block: i.block, ancestors: i.ancestors, property: i.property, state: i.state };
	const g3 = g3Db( { db: rec, ...slice } );
	let [ g4, attribute ] = [ null, null ];
	if ( ! g3.pass ) {
		attribute = seen.find( ( r ) => g3Db( { db: only( rec, r ), ...slice } ).class === g3.class )?.attr_name ?? null;
	} else {
		const ask = ( settings ) => g4Calibration( { cache: i.cache, settings, state: i.state, boxAgrees: i.boxAgrees ?? null } );
		g4 = ask( g3.settings );
		attribute = g4.pass ? null : g3.settings.find( ( s ) => ! ask( [ s ] ).pass )?.attr ?? null;
	}
	return { stale: i.stale ?? null, db: g3, calibration: g4, attribute, block: i.block };
}

// The final class of a finding: its base ({ class, candidate } from mapTriage, mapResolverGap, or a gate) under the
// instrument findings. Order is the chain's: stale (G0) beats everything; a measuring artefact, a ledgered difference and a
// draft finding stand (G1 and G2 come before G3); then G3's I-unrouted or I-mistag; then G4's I-calibration; else the base.
export function classify( base, finding = null ) {
	const standing = [ 'W-walker', 'CLIENT', 'draft-defect', 'render-wins', HELD ];
	const instr = ( gate, r ) => ( { class: gapClassOf( r.class ), candidate: false, owner: OWNERS[ r.class ], via: gate, evidence: r.evidence, attribute: finding.attribute ?? null } );
	if ( finding?.stale && ! finding.stale.pass ) {
		return instr( 'G0', finding.stale );
	}
	if ( ! finding || standing.includes( base.class ) || I_CLASSES.includes( base.class ) ) {
		return { ...base, via: base.via ?? null };
	}
	if ( finding.db && ! finding.db.pass ) {
		return instr( 'G3', finding.db );
	}
	if ( finding.calibration && ! finding.calibration.pass ) {
		return instr( 'G4', finding.calibration );
	}
	return { ...base, via: base.via ?? null };
}
