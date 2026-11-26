// The hover and state transitions no motion recogniser took (the detector of that mechanism): Fill's never-silent check
// (lib/fill-motion-account.mjs::silentRows) names a record of the surface that no layer, row or note holds with the reason
// "nothing recognised it". This reads those rows from a saved Fill report, sets each against the draft's record (its
// mechanism, trigger and properties), where its element sits in the skeleton (a node of its own, or folded into a node
// above it), and what the node's block can hold for that state change: a setting Fill wrote, a setting calibration knows
// for that state and property, a motion channel, or nothing. Reads saved files only (tools/state-transitions.mjs).
import { templateKey, templateKeyOf } from './fact-key.mjs';
import { paintedProps } from './css-families.mjs';

// The never-silent row of a record nothing placed: `<id> (<mechanism>, <trigger>) belongs to this surface ... nothing
// recognised it ...`.
const SILENT = /nothing recognised it/;
const HEAD = /^(\S+) \(([^,]+), ([^)]+)\)/;

// The UNMAPPED rows of one report that name a record nothing recognised: [ { id, mechanism, trigger, node, block, slot } ].
export function silentRecordRows( unmapped ) {
	return ( unmapped || [] ).filter( ( u ) => 'motion' === u.property && SILENT.test( String( u.reason ?? '' ) ) ).map( ( u ) => {
		const m = HEAD.exec( String( u.reason ) );
		return { id: String( u.value ), mechanism: m?.[ 2 ] ?? null, trigger: m?.[ 3 ] ?? null, node: u.node || '', block: u.block || '', slot: u.slot || '' };
	} );
}

// A stylesheet transition or pseudo-class rule: what this mechanism is about. Animations, Web Animations and script
// writes are other mechanisms and are listed apart.
export const isTransition = ( mechanism ) => 'css-transition' === mechanism || 'css-pseudo' === mechanism;

// The property family a CSS property (a record's or a calibrated setting's) belongs to, so a record's `background` meets
// a setting's `background-color` and a record's `border-color` a setting's `border-top-color`.
export function familyOf( property ) {
	const p = String( property ?? '' ).split( ':' )[ 0 ].trim().toLowerCase();
	if ( /^background(?:-color|-image)?$/.test( p ) ) {
		return 'background';
	}
	if ( /^border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?-colou?r$/.test( p ) ) {
		return 'border-color';
	}
	if ( /^(?:transform|translate|scale|rotate)$/.test( p ) ) {
		return 'transform';
	}
	if ( /^padding(?:-.+)?$/.test( p ) ) {
		return 'padding';
	}
	return p;
}

// The motion channels the hover layer (sgsMotion hover.state) moves: a transition of one is a motion layer's, not a setting's.
const MOTION = new Set( [ 'transform', 'opacity', 'filter' ] );

// The calibrated states a record's trigger can mean: hover is hover, focus is focus, a press is active, and a `state`
// trigger (a class or attribute the draft's script sets) is any named state a block publishes other than hover and focus.
export function statesFor( trigger ) {
	if ( 'hover' === trigger ) {
		return [ 'hover' ];
	}
	if ( 'focus' === trigger ) {
		return [ 'focus' ];
	}
	if ( 'press' === trigger ) {
		return [ 'active' ];
	}
	return 'state' === trigger ? null : [];
}
const stateMatches = ( trigger, state ) => {
	if ( ! state ) {
		return false;
	}
	const s = statesFor( trigger );
	return null === s ? ! [ 'hover', 'focus' ].includes( state ) : s.includes( state );
};

// Where a record's element sits: `no-element` (the record names no template element), `own-node` (its element is a
// target of a skeleton node), else `folded` with `depth` (template steps up to the nearest element that is a target) and
// the element's tag and words. targetKeys: the template keys of every target; template: facts elements by key ({ parentChain,
// tag, words }).
export function relationOf( record, targetKeys, template ) {
	const tpl = record?.element?.template_tpl_id;
	const tpls = null === tpl || undefined === tpl ? [] : [ tpl ].flat();
	if ( ! tpls.length || ! record.element?.dc ) {
		return { kind: 'no-element' };
	}
	const keys = tpls.map( ( t ) => templateKey( { dc: record.element.dc, tpl: t } ) );
	if ( keys.some( ( k ) => targetKeys.has( k ) ) ) {
		return { kind: 'own-node' };
	}
	const el = template?.[ keys[ 0 ] ] || {};
	const chain = el.parentChain || [];
	const at = chain.findIndex( ( k ) => targetKeys.has( k ) );
	return { kind: 'folded', depth: at < 0 ? null : at + 1, tag: el.tag ?? null, words: String( el.words ?? '' ).slice( 0, 40 ) };
}

// What the node's block holds for one property of the record: `written-at-home` (Fill wrote a setting of the node in that
// state and family at the slot the record's element sits under: the home element's own look, which a folded element
// inside it may or may not share), `setting` (calibration knows a setting of the block in that state and family at some
// slot, unwritten at the home), `motion` (a motion channel, the hover layer's), or `none`. writes: the report's writes
// of this node; slot: the home's slot ('' for the node's own element); settings: the block's calibrated settings by
// attribute name ({ property, state }).
export function holderOf( { trigger, property, writes, settings, slot = '' } ) {
	const family = familyOf( property );
	const written = ( writes || [] ).filter( ( w ) => ( w.slot || '' ) === slot && stateMatches( trigger, w.state ) && familyOf( w.prop ) === family ).map( ( w ) => w.attr );
	if ( written.length ) {
		return { family, verdict: 'written-at-home', attrs: [ ...new Set( written ) ] };
	}
	const known = Object.entries( settings || {} ).filter( ( [ , s ] ) => s && stateMatches( trigger, s.state ) && paintedProps( s ).some( ( q ) => familyOf( q ) === family ) ).map( ( [ a ] ) => a );
	if ( known.length ) {
		return { family, verdict: 'setting', attrs: known };
	}
	return { family, verdict: MOTION.has( family ) ? 'motion' : 'none', attrs: [] };
}

// One surface's rows: every silent record row set against its record, its element's place and its block's holders.
// records: the inventory's animation records; targetKeys, template: as relationOf; writes: the report's writes;
// settingsOf( block ): the block's calibrated settings (null when not calibrated).
export function surfaceRows( { unmapped, records, targetKeys, template, writes, settingsOf } ) {
	const byId = new Map( ( records || [] ).map( ( r ) => [ r.id, r ] ) );
	return silentRecordRows( unmapped ).map( ( row ) => {
		const r = byId.get( row.id ) || null;
		const mechanism = r?.mechanism ?? row.mechanism;
		const trigger = r?.trigger?.type ?? row.trigger;
		const relation = r ? relationOf( r, targetKeys, template ) : { kind: 'no-record' };
		const own = ( writes || [] ).filter( ( w ) => w.node === row.node );
		const settings = settingsOf( row.block );
		const properties = ( r?.properties || [] ).map( ( p ) => ( {
			property: p.property, from: p.from ?? null, to: p.to ?? null, formula: p.formula ?? null,
			changes: null !== ( p.to ?? null ) ? String( p.from ?? '' ) !== String( p.to ) : !! p.formula,
			...holderOf( { trigger, property: p.property, writes: own, settings, slot: row.slot } ),
		} ) );
		return { ...row, mechanism, trigger, transition: isTransition( mechanism ), relation, calibrated: !! settings, properties };
	} );
}

// The rows grouped by (block, part, property family, trigger, why): why is the element's place and what the block holds.
// Returns [ { key, block, part, family, trigger, why, rows, records: [ids] } ] largest first.
export function groupRows( rows ) {
	const groups = new Map();
	for ( const row of rows ) {
		const place = 'folded' === row.relation.kind ? 'folded into the node' : row.relation.kind;
		const props = row.properties.length ? row.properties : [ { family: '(none)', verdict: 'no-properties' } ];
		for ( const p of props ) {
			const why = `${ place }; ${ p.verdict }${ false === p.changes ? ' (no change stated)' : '' }`;
			const key = [ row.block, row.slot || 'root', p.family, row.trigger, why ].join( ' | ' );
			const g = groups.get( key ) || { key, block: row.block, part: row.slot || 'root', family: p.family, trigger: row.trigger, why, rows: 0, records: [] };
			g.rows += 1;
			g.records.push( `${ row.surface ?? '' }:${ row.id }` );
			groups.set( key, g );
		}
	}
	return [ ...groups.values() ].sort( ( a, b ) => b.rows - a.rows || a.key.localeCompare( b.key ) );
}

// The template keys of every target of a skeleton tree (a node's draftRef and its draftSlots), with the served root host
// named rootComponent (lib/fact-key.mjs::templateKeyOf).
export function skeletonTargetKeys( tree, rootComponent ) {
	const keys = new Set();
	const go = ( list ) => ( list || [] ).forEach( ( n ) => {
		for ( const f of [ n.draftRef, ...Object.values( n.draftSlots || {} ) ] ) {
			const k = f && 'object' === typeof f ? templateKeyOf( f.tpl, rootComponent ) : null;
			k && keys.add( k );
		}
		go( n.innerBlocks );
	} );
	go( Array.isArray( tree ) ? tree : [ tree ] );
	return keys;
}
