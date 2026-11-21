// Fill's run ledger rows (lib/run-ledger.mjs): what Fill did with each draft look of each target, written by fill.mjs after its
// outputs from the run's own records. Pure.
// From the records Fill already keeps (fill-report.json): each write (`written`, the setting and value; a pass's custom CSS as
// one `custom-css` row per declaration of its rule), each unmapped row (`dropped`, its reason), each settled and already-held
// row (`judged-equal`, the reason and detail that made it equal; a row a later pass answered is `written` by that pass, or
// `custom-css` when the residual CSS pass answered it) and
// each handover (`passed-on` to its owner).
// Rows no record held before (README "The run ledger", the drops table):
//   unread     a property the inventory records the target's draft element painting that Fill's read does not hold at any
//              width (lib/fill-read.mjs::PROPS and the declared extras leave it out);
//   state      a state look lib/fill-state.mjs::fillStates ends with no row (its `ledger`: a block or part with no
//              calibration, or a look the block already paints in that state), and a state look
//              lib/fill-state-reach.mjs::stateDrafts skips because its declaration has no rendered value;
//   box        the target's draft box (x, y, w, h) at each read width, passed on, so verify tells a box fault from a property fault;
//   content    the target's words, link and picture as read, passed on.
import { paintedProperties, runRow } from './run-ledger.mjs';
import { READ_WIDTHS } from './fill-read.mjs';

// The pass names whose settled row means the pass answered the row with a write (lib/fill-report.mjs::passSettled).
export const ANSWERING_PASSES = [ 'logo-size', 'width-ladder', 'dimension', 'part-margin', 'motion', 'layer-rotation' ];
// The record sections of the rows Fill's records did not hold before the run ledger.
export const NEW_SECTIONS = [ 'unread', 'state-ledger', 'state-unrendered', 'box', 'content' ];

const propOf = ( p ) => String( p ?? '' ).replace( /^\(([^)]+)\).*$/, '$1' );

// The targets of a run: Map( `${ ref }|${ slot }` -> { ref, slot, id, draftKey } ) and the same by target id.
export function targetIndex( { nodes, flat, refOf } ) {
	const byPart = new Map();
	const byId = new Map();
	for ( const rec of nodes || [] ) {
		const ref = refOf( flat[ rec.index ] );
		for ( const t of rec.targets || [] ) {
			const x = { ref, slot: t.slot || '', id: t.id, draftKey: 'string' === typeof t.finder?.tpl ? t.finder.tpl : null };
			byPart.set( `${ ref }|${ x.slot }`, x );
			byId.set( t.id, x );
		}
	}
	return { byPart, byId };
}

// The draft element a record row names: its node and slot's target, else (a pseudo or state slot) the target of the slot
// it extends, else the node's root target.
const keyOf = ( index, node, slot ) => ( index.byPart.get( `${ node }|${ slot || '' }` ) ?? [ ...index.byPart.values() ].find( ( t ) => t.ref === node && t.slot && String( slot || '' ).startsWith( t.slot ) ) ?? index.byPart.get( `${ node }|` ) )?.draftKey ?? null;

// The rows of one Fill run. report: fill-report.json's object; reads: lib/fill-read.mjs::readDraft's result; inventory: the
// surface's skeleton inventory (or null); stateLedger: fillStates' `ledger`; surface, run: the surface and the Fill run's folder name.
export function fillRunRows( { surface, run, nodes, flat, refOf, reads, report, inventory = null, stateLedger = [] } ) {
	const index = targetIndex( { nodes, flat, refOf } );
	const file = `qa/fill/${ surface }/${ run }/fill-report.json`;
	const rec = ( section, match ) => ( { file, section, match } );
	const out = [];
	// A record row naming no node (a state the opener refused for the whole surface) is the surface's row.
	const add = ( r, section ) => out.push( runRow( { ...r, node: r.node || '(surface)', property: r.property || 'element', draftKey: r.draftKey ?? keyOf( index, r.node, r.part ), stage: 'fill', record: rec( section, { node: r.node ?? null, slot: r.part || '', property: r.property ?? null } ) } ) );
	const widthsOf = ( x ) => x?.widths?.length ? x.widths : x?.answers?.length ? x.answers : [];
	for ( const w of report?.writes || [] ) {
		if ( 'residual-css' === w.how ) {
			continue;
		}
		add( { node: w.node, part: w.slot, property: propOf( w.prop ) || w.attr, state: w.state || 'rest', widths: widthsOf( w ), outcome: { kind: 'written', setting: w.attr, value: w.after ?? null, reason: w.how ?? null } }, 'writes' );
	}
	for ( const r of report?.residualCss?.rules || [] ) {
		for ( const d of r.declarations || [] ) {
			const [ property, ...v ] = String( d ).split( ':' );
			add( { node: r.node, part: r.part, property: property.trim(), state: r.state || 'rest', widths: [], draft: v.join( ':' ).trim(), outcome: { kind: 'custom-css', setting: 'sgsCustomCss', value: r.css ?? null, reason: `${ r.range }: ${ r.reason }` } }, 'residualCss.rules' );
		}
	}
	for ( const u of report?.unmapped || [] ) {
		add( { node: u.node, part: u.slot, property: u.property, state: u.state || 'rest', widths: u.widths || [], draft: u.value ?? null, outcome: { kind: 'dropped', reason: u.reason ?? null } }, 'unmapped' );
	}
	for ( const s of report?.settled || [] ) {
		const answered = ANSWERING_PASSES.includes( s.reason );
		add( { node: s.node, part: s.slot, property: s.property, state: s.state || 'rest', widths: s.widths || [], draft: s.value ?? null, outcome: 'residual-css' === s.reason ? { kind: 'custom-css', setting: 'sgsCustomCss', reason: 'answered by the residual-css pass' } : answered ? { kind: 'written', reason: `answered by the ${ s.reason } pass` } : { kind: 'judged-equal', baseline: s.detail ?? null, reason: s.reason ?? null } }, 'settled' );
	}
	for ( const h of report?.alreadyHeld || [] ) {
		add( { node: h.node, part: h.slot, property: h.property, state: h.state || 'rest', widths: h.widths || [], draft: h.value ?? null, outcome: { kind: 'judged-equal', baseline: h.detail ?? null, reason: h.reason ?? null } }, 'alreadyHeld' );
	}
	for ( const h of report?.handover || [] ) {
		add( { node: h.node, part: h.slot, property: h.evidence?.key || h.kind || 'content', widths: h.evidence?.width ? [ h.evidence.width ] : [], draft: h.evidence?.draft ?? null, outcome: { kind: 'passed-on', into: h.owner ?? null, reason: h.reason ?? null } }, 'handover' );
	}
	for ( const l of stateLedger || [] ) {
		add( { node: l.node, part: l.slot, property: l.property, state: l.state, widths: [], draft: l.value ?? null, outcome: 'judged-equal' === l.kind ? { kind: 'judged-equal', baseline: l.reason } : { kind: 'dropped', reason: `lib/fill-state.mjs::fillStates: ${ l.reason }` } }, 'state-ledger' );
	}
	readRows( { index, reads, inventory, add } );
	return out;
}

// The rows from the draft read itself: unread properties, unrendered state looks, the box, words, link and picture.
function readRows( { index, reads, inventory, add } ) {
	const byKey = new Map( ( inventory?.elements || [] ).map( ( e ) => [ e.key, e ] ) );
	for ( const t of index.byId.values() ) {
		const at = READ_WIDTHS.map( ( w ) => [ w, reads?.widths?.[ w ]?.[ t.id ] ] ).filter( ( [ , s ] ) => s && ! s.missing );
		if ( ! at.length ) {
			continue;
		}
		const base = { node: t.ref, part: t.slot, draftKey: t.draftKey };
		const e = byKey.get( t.draftKey );
		for ( const p of e ? paintedProperties( e ) : [] ) {
			if ( ! at.some( ( [ , s ] ) => undefined !== s.styles?.[ p ] ) ) {
				add( { ...base, property: p, widths: at.map( ( [ w ] ) => w ), draft: Object.values( e.resolved || {} ).find( ( v ) => v?.[ p ] )?.[ p ] ?? null, outcome: { kind: 'unread', reason: 'not in Fill\'s read list (lib/fill-read.mjs::PROPS) nor declared by the draft\'s rules, so no stage judges it' } }, 'unread' );
			}
		}
		for ( const k of [ 'x', 'y', 'w', 'h' ] ) {
			const vals = Object.fromEntries( at.map( ( [ w, s ] ) => [ w, boxOf( s )?.[ k ] ] ).filter( ( [ , v ] ) => undefined !== v ) );
			Object.keys( vals ).length && add( { ...base, property: k, widths: Object.keys( vals ), draft: vals, outcome: { kind: 'passed-on', reason: 'the draft box, for the verify stage' } }, 'box' );
		}
		for ( const [ property, read ] of [ [ 'text', ( s ) => s.words ], [ 'href', ( s ) => s.href ], [ 'img', ( s ) => s.img?.src ] ] ) {
			const vals = at.map( ( [ w, s ] ) => [ w, read( s ) ] ).filter( ( [ , v ] ) => null != v && '' !== v );
			vals.length && add( { ...base, property, widths: vals.map( ( [ w ] ) => w ), draft: vals[ 0 ][ 1 ], outcome: { kind: 'passed-on', value: vals[ 0 ][ 1 ], reason: 'carried by the skeleton\'s content; no stage compares it' } }, 'content' );
		}
		// A state look whose declaration has no rendered value is skipped by lib/fill-state-reach.mjs::stateDrafts.
		for ( const [ w ] of at ) {
			for ( const look of reads?.states?.[ w ]?.looks?.[ t.id ] || [] ) {
				if ( 'code' === look.read ) {
					continue;
				}
				for ( const p of Object.keys( look.declared || {} ).filter( ( x ) => ! look.rendered?.[ x ] && ! /^transition/.test( x ) ) ) {
					add( { ...base, part: `${ t.slot }${ look.pseudo || '' }`, property: p, state: [ ...( look.states || [] ) ].sort().join( '+' ), widths: [ w ], draft: look.declared[ p ], outcome: { kind: 'dropped', reason: 'lib/fill-state-reach.mjs::stateDrafts: the state look has no rendered value (an unresolved var() or currentcolor in its declaration), so it is not written' } }, 'state-unrendered' );
				}
			}
		}
	}
}

// The draft box of a read target: { x, y, w, h }.
const boxOf = ( s ) => {
	const b = s?.rect ?? s?.box ?? null;
	return b ? { x: b.x ?? b.left, y: b.y ?? b.top, w: b.w ?? b.width, h: b.h ?? b.height } : null;
};
