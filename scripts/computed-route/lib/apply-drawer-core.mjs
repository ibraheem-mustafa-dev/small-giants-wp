// Shared pieces of the applier's drawer family (lib/apply-family-drawer.mjs): which draft records are open-triggered
// entrances, how one becomes an entrance layer (lib/fill-motion-element.mjs::elementMotion, the writer's own path), a
// stagger delay by position, and the one sgsMotion write that merges parts into the saved document and must pass
// lib/motion-validate.mjs::validateMotionWrite.
import { elementMotion } from './fill-motion-element.mjs';
import { openWords } from './motion-states.mjs';
import { staggerOf } from './fill-motion-stagger.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';
import { stateRows } from './state-vocab.mjs';
import { draftId, recordsFor } from './apply-records.mjs';
import { sameEntrance } from './apply-motion-entrance.mjs';
import { motionTools } from './apply-family-statemotion.mjs';

export { motionTools, sameEntrance, staggerOf };

const DISCLOSURE = /\bchanges? to (?:a )?non-null\b|\bbecomes? non-null\b|\bfalse\s*(?:→|->|â†’)\s*true\b/i;
const words = new Map();
export const openWordsOf = ( db ) => {
	words.has( db ) || words.set( db, openWords( stateRows( db ) ) );
	return words.get( db );
};

const WORDS = ( t ) => String( t ?? '' ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );

// A one-shot animation the draft starts when a disclosure opens (a drawer, a menu panel, an accordion section).
// A record whose trigger reads "Same as <id>" starts on that record's trigger (`all`, the handoff's records).
export function isOpenRecord( r, open, all = [], depth = 0 ) {
	if ( 'active' !== ( r.status ?? 'active' ) || ! /^(?:waapi|css-animation)$/.test( r.mechanism ) || 'state' !== r.trigger?.type || ( r.iterations && 1 !== Number( r.iterations ) ) ) {
		return false;
	}
	const same = /^same as ([\w-]+)/i.exec( String( r.trigger.detail ?? '' ).trim() )?.[ 1 ];
	const twin = same && depth < 3 ? all.find( ( x ) => x.id === same ) : null;
	if ( twin ) {
		return isOpenRecord( twin, open, all, depth + 1 );
	}
	return DISCLOSURE.test( String( r.trigger.detail ?? '' ) ) || ( r.trigger.state_keys || [] ).flatMap( WORDS ).some( ( w ) => open.has( w ) );
}

// The panel a floating menu opens (not a drawer's): its entrance belongs to the menu block's `panel` part.
export const isPanelRecord = ( r ) => ! r.stagger && /\bpanel\b/i.test( String( r.element?.description ?? '' ) ) && ! /drawer/i.test( String( r.element?.description ?? '' ) );

// The draft template ids of the elements inside a target that the draft's calls animate, as numbers (`inner` calls of lib/apply-motion-calls.mjs::callsAt).
export const innerIdsOf = ( calls ) => new Set( Object.values( calls || {} ).flatMap( ( c ) => ( c.inner || [] ).map( ( x ) => Number( x.tpl ) ) ).filter( Number.isFinite ) );

// The draft template ids a record names, as numbers, and the position of an id among a record's ids.
export const idsOfRecord = ( r ) => [].concat( r.element?.template_tpl_id ?? [] ).map( Number ).filter( Number.isFinite );

// Every record naming a draft id of `ids` (numbers) on the page's main draft.
export function recordsIn( recordsIndex, ids ) {
	const seen = new Set();
	const out = [];
	for ( const id of ids ) {
		for ( const r of recordsFor( recordsIndex, `Root/${ id }#0` ) ) {
			seen.has( r ) || ( seen.add( r ), out.push( r ) );
		}
	}
	return out;
}

// The open entrance layer a record makes on `part` of a block: { layer } or { reason }. The record's own start delay is the
// layer's; a stagger the record states is written by the caller.
export function openLayer( rec, { part, mdb, ctx, open } ) {
	const m = elementMotion( [ rec ], { mdb, ctx, sampled: null, target: part, offers: { names: [], opens: [ part ], openWords: new Set( [ ...open, ...( rec.trigger?.state_keys || [] ) ] ) } } );
	const layer = m.element.entrance?.base;
	if ( ! layer || 'open' !== layer.trigger ) {
		return { reason: m.unmapped.map( ( u ) => u.reason ).join( '; ' ) || `${ rec.id } gave no open entrance layer` };
	}
	return { layer };
}

// The delay of item `index` of a stagger { offset, step, cap } (the cap is the largest total delay).
export const delayAt = ( s, index ) => Math.min( s.offset + s.step * index, null == s.cap ? Infinity : s.cap );

// The position of a draft element among the elements a record names, in document order: instances of the record's earlier
// templates (counted from `aux`, { 'Root/124#3': { width: facts } }) plus its own instance number. Null when it is not one.
export function positionOf( rec, tpl, aux = {} ) {
	const id = draftId( tpl );
	const ids = idsOfRecord( rec );
	const at = ids.indexOf( Number( id?.id ) );
	if ( ! id || at < 0 ) {
		return null;
	}
	const before = ids.slice( 0, at ).reduce( ( n, e ) => n + Object.keys( aux ).filter( ( k ) => k.startsWith( `Root/${ e }#` ) && Object.values( aux[ k ] || {} ).some( Boolean ) ).length, 0 );
	return before + id.instance;
}

// The aux reads a record's position needs: every instance of the templates before the target's own (up to 12 each).
export function auxFor( rec, tpl ) {
	const id = draftId( tpl );
	const ids = idsOfRecord( rec );
	const at = ids.indexOf( Number( id?.id ) );
	return at > 0 ? ids.slice( 0, at ).flatMap( ( e ) => Array.from( { length: 12 }, ( _, i ) => ( { tpl: `Root/${ e }#${ i }`, key: `${ tpl }~${ e }#${ i }` } ) ) ) : [];
}

// Keys a saved layer holds that the wanted layer lacks are written back as the identity pose, so a deep merge of the wanted
// layer over the saved one leaves exactly the wanted pose.
export function neutralise( held, want ) {
	if ( ! held ) {
		return want;
	}
	const out = structuredClone( want );
	const identity = { opacity: 1, scale: 1, scaleX: 1, scaleY: 1 };
	for ( const side of [ 'from', 'to' ] ) {
		for ( const k of Object.keys( held.values?.[ side ] || {} ) ) {
			if ( ! ( k in ( out.values[ side ] || {} ) ) ) {
				out.values[ side ] = { ...( out.values[ side ] || {} ), [ k ]: identity[ k ] ?? 0 };
			}
		}
	}
	for ( const k of [ 'delay' ] ) {
		k in ( held.values || {} ) && ! ( k in out.values ) && ( out.values[ k ] = 0 );
	}
	return out;
}

const merged = ( saved, parts, stagger ) => {
	const doc = structuredClone( saved.sgsMotion ?? { v: 1, elements: {} } );
	doc.elements ??= {};
	for ( const [ part, panels ] of Object.entries( parts ) ) {
		const el = ( doc.elements[ part ] ??= {} );
		for ( const [ panel, value ] of Object.entries( panels ) ) {
			el[ panel ] = Array.isArray( value ) ? value : { ...( el[ panel ] || {} ), ...value };
		}
	}
	stagger && ( doc.stagger = { ...( doc.stagger || {} ), ...stagger } );
	return doc;
};

// One op item: `parts` = { part: { entrance: { base }, hover: { state }, effects: [...] } } merged into the saved document
// (deep, so another family's write to the same block survives), `stagger` the document's, `settings` plain attributes.
export function motionItem( { saved, parts, stagger = null, settings = [], schema, prop, why, record = null, checks = [] } ) {
	const doc = merged( saved, parts, stagger );
	const verdict = validateMotionWrite( doc, schema );
	if ( ! verdict.valid ) {
		return { status: 'no-setting', prop, why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` };
	}
	const value = { v: 1, elements: Object.fromEntries( Object.entries( parts ).map( ( [ part, panels ] ) => [ part, panels ] ) ), ...( stagger ? { stagger } : {} ) };
	return { status: 'op', prop, why, writes: [ { attr: 'sgsMotion', value, merge: 'deep' }, ...settings ], checks, ...( record ? { record } : {} ) };
}
