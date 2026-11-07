// Applier family: motion. A target's draft motion against the sgsMotion saved on its block, one op per block writing the merged
// document (it must pass lib/motion-validate.mjs::validateMotionWrite) and any settings beside it:
//   - entrances and endless loops from the Element.animate calls the instrumented draft read made, per width, on the element
//     itself or, inside a hero, on the media part it draws (lib/apply-motion-parts.mjs);
//   - script behaviours (magnet, sheen, ripple, tilt, parallax, nav label magnet, the exit of an open entrance) from the
//     records, through lib/apply-motion-behaviours.mjs;
//   - a marquee's edge fade from the mask the draft paints on the track's wrapper.
// An entrance the draft starts when a disclosure opens, a ring on a target with no ambient-float and a form's states belong to the
// drawer family (lib/apply-family-drawer.mjs).
// Grid and list reveals are written per child from each child's own call: a block's `sgsMotion.stagger` replaces every child's
// own entrance and needs the parent known to the family, which the pairing does not give; per-child values are the draft's own.
import { motionDb } from './motion-db.mjs';
import { loadMotionSchema } from './motion-schema.mjs';
import { openWords } from './motion-states.mjs';
import { clientPalette, clientTokens, tokenTypes } from './motion-tokens.mjs';
import { validateMotionWrite, verdictProblems } from './motion-validate.mjs';
import { stateRows } from './state-vocab.mjs';
import { recordsFor } from './apply-records.mjs';
import { callsAt, recordsOf, triggerFor } from './apply-motion-calls.mjs';
import { behaviourWrites } from './apply-motion-behaviours.mjs';
import { draftEntrance, sameEntrance } from './apply-motion-entrance.mjs';
import { ENTRANCE_PROPS, reconcileDefault } from './apply-motion-default.mjs';
import { loopOp, ringScale } from './apply-motion-loops.mjs';
import { splitParts } from './apply-motion-parts.mjs';
import { claimedElsewhere, groupsOf, ownsGroup, placeGroup, staggerFor } from './apply-motion-items.mjs';
import { changeAnimation, heroSvgParts, svgRecordsOf } from './apply-motion-rules.mjs';
import { innerIdsOf, isOpenRecord, recordsIn } from './apply-drawer-core.mjs';

const shared = new Map();
function toolsFor( db, rawSnapshot ) {
	if ( ! shared.has( db ) ) {
		const schema = loadMotionSchema();
		let words = null;
		shared.set( db, { mdb: motionDb( db ), schema, openWords: () => ( words ??= openWords( stateRows( db ) ) ), ctx: { types: tokenTypes( schema ), tokens: clientTokens( rawSnapshot ), palette: clientPalette( rawSnapshot ), css: [] } } );
	}
	return shared.get( db );
}

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// The first stop of a mask gradient that fades from transparent: its width as a percentage, else null.
export const fadeWidth = ( mask ) => {
	const m = /linear-gradient\([^)]*?transparent[^,]*,\s*[^,]*?\s(\d+(?:\.\d+)?)%/.exec( String( mask ?? '' ).replace( /\(\s*0,\s*0,\s*0\s*\)/g, '(0 0 0)' ) );
	return m ? Number( m[ 1 ] ) : null;
};

// The marquee's edge fade: the effect's `edgeFade` and `edgeFadeWidth` where the draft masks the track's wrapper.
function marqueeFade( { doc, draft, recs, mdb, items, whys, ids } ) {
	if ( ! recs.some( ( r ) => 'infinite' === r.iterations && ( r.properties || [] ).some( ( p ) => /^transform$/.test( p.property ) && /translateX/.test( String( p.to ) ) ) ) ) {
		return;
	}
	const width = fadeWidth( draft[ 1440 ]?.fade );
	if ( null === width ) {
		return;
	}
	const at = Object.keys( doc.elements ).find( ( p ) => ( doc.elements[ p ].effects || [] ).some( ( e ) => 'marquee' === e.effect ) );
	if ( ! at || ! mdb.field( 'effects', 'values.edgeFade', 'marquee' ) ) {
		items.push( { status: 'no-setting', prop: 'marquee fade', why: at ? 'the marquee effect has no edge fade field' : 'no marquee effect is saved on this block' } );
		return;
	}
	const layer = doc.elements[ at ].effects.find( ( e ) => 'marquee' === e.effect );
	const want = { edgeFade: true, edgeFadeWidth: width };
	if ( same( { edgeFade: layer.values.edgeFade, edgeFadeWidth: layer.values.edgeFadeWidth }, want ) ) {
		items.push( { status: 'equal', prop: 'marquee fade', why: 'the saved marquee fades its edges as the draft does' } );
		return;
	}
	layer.values = { ...layer.values, ...want };
	whys.push( `marquee edge fade ${ width }%` );
	ids.push( recs.find( ( r ) => 'infinite' === r.iterations )?.id );
}

export const motion = {
	name: 'motion',
	props: [ 'opacity', ...ENTRANCE_PROPS ],
	decide( input ) {
		const { target, block, saved, draft, recordsIndex, records, db, rawSnapshot } = input;
		const { mdb, schema, ctx, openWords: words } = toolsFor( db, rawSnapshot );
		const offers = { names: mdb.statesOf( block ), opens: mdb.opensOf( block ), openWords: words };
		const names = new Set( mdb.targetsOf( block ).map( ( t ) => t.target ) );
		const key = target.key ?? target.ref;
		const doc = structuredClone( saved.sgsMotion ?? { v: 1, elements: {} } );
		doc.elements ??= {};
		const before = JSON.stringify( doc );
		// The hero's inline SVG part animation is the hero's own bgSvgParts setting (lib/apply-motion-rules.mjs), so the calls its SVG
		// parts make (descendants of the hero's own template element) are not read as a media entrance or loop.
		const rules = [ ...heroSvgParts( input ), ...changeAnimation( input ) ];
		const svgTpls = new Set( svgRecordsOf( target, records, input.animate ).map( ( r ) => String( r.element.nearest_tpl_id ) ) );
		const animate = rules.some( ( i ) => 'bgSvgParts' === i.prop ) ? Object.fromEntries( Object.entries( input.animate ).map( ( [ w, list ] ) => [ w, ( list || [] ).filter( ( c ) => c.key !== key || c.own || ! svgTpls.has( String( c.tpl ) ) ) ] ) ) : input.animate;
		const items = [ ...rules ];
		const whys = [];
		const ids = [];
		const settings = [];
		const fx = [];
		const checks = [];
		const calls = callsAt( animate, key );
		const own = recordsOf( recordsIndex, target );
		const parts = splitParts( { block, saved, mdb, calls } );
		const heroParts = Object.keys( parts ).length > 1;
		// Descendant calls the block's own parts hold: the printed items of a list, a described line; a wrapper alias of the same
		// draft ids hands its calls to the descendant block that places them, and takes theirs where it is that block.
		const placed = new Set();
		const handedOver = new Set();
		const stagger = {};
		if ( ! heroParts ) {
			const groups = groupsOf( animate, ( c ) => c.key === key || ( c.key !== key && null !== c.tpl && ownsGroup( target, { tpl: c.tpl } ) ) );
			for ( const group of groups ) {
				const place = placeGroup( { block, group, mdb, db, recordsIndex, items: draft[ 1440 ]?.items?.n ?? null } );
				const mine = group.calls[ 1440 ].concat( group.calls[ 768 ], group.calls[ 375 ] ).some( ( c ) => c.key === key );
				if ( ! place ) {
					mine && claimedElsewhere( { target, surface: input.surface, all: input.all, group, mdb, db, recordsIndex } ) && handedOver.add( group.tpl );
					continue;
				}
				const pc = { calls: Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, { one: [], loops: [], inner: [] } ] ) ), tpls: new Set( [ group.tpl ] ), recs: place.recs, entranceOnly: true };
				for ( const w of [ 1440, 768, 375 ] ) {
					const list = group.calls[ w ];
					if ( ! list.length ) {
						continue;
					}
					// A list's entrance carries no delay of its own: the block's stagger holds every item's.
					const first = 'items' === place.kind ? list.reduce( ( a, b ) => ( ( b.options?.delay ?? 0 ) < ( a.options?.delay ?? 0 ) ? b : a ) ) : list[ 0 ];
					pc.calls[ w ].one.push( 'items' === place.kind ? { ...first, options: { ...( 'object' === typeof first.options ? first.options : { duration: first.options } ), delay: 0 } } : first );
				}
				'items' === place.kind && ( stagger[ place.part ] = staggerFor( { recs: place.recs, calls: group.calls } ) );
				parts[ place.part ] = pc;
				placed.add( group.tpl );
			}
		}
		for ( const [ name, pc ] of Object.entries( parts ) ) {
			const widths = Object.values( pc.calls );
			const has = widths.some( ( c ) => c.one.length || c.loops.length );
			const recs = 'root' === name ? own : pc.recs ?? [ ...new Set( [ ...pc.tpls ].flatMap( ( tpl ) => recordsFor( recordsIndex, `Root/${ tpl }#0` ) ) ) ];
			if ( ! names.has( name ) ) {
				has && items.push( { status: 'no-setting', prop: name, why: `${ block } has no ${ name } motion target` } );
				continue;
			}
			const el = ( doc.elements[ name ] ??= {} );
			const first = widths.flatMap( ( c ) => c.one )[ 0 ];
			const opened = recs.some( ( r ) => isOpenRecord( r, words(), records ) );
			if ( first && ! opened ) {
				const t = triggerFor( { call: first, recs, draft } );
				const e = draftEntrance( { calls: pc.calls, trig: t.trigger, draft, mdb, ctx, target: name, offers, held: el.entrance?.base } );
				if ( e.reason ) {
					items.push( { status: 'no-setting', prop: `${ name } entrance`, why: e.reason } );
				} else if ( 'root' === name && reconcileDefault( { el, layer: e.layer, rawSnapshot, live: input.live, items, whys, checks } ) ) {
					t.record && ids.push( t.record );
				} else if ( sameEntrance( el.entrance?.base, e.layer ) ) {
					items.push( { status: 'equal', prop: `${ name } entrance`, why: 'the saved entrance gives the draft entrance' } );
				} else {
					el.entrance = { ...( el.entrance || {} ), base: e.layer };
					whys.push( `${ name } ${ e.why }` );
					t.record && ids.push( t.record );
				}
				// A hero's frame entrance once saved on the image element (split-media) is that element's second entrance beside the
				// image's own; it now sits on the media column.
				const old = 'media' === name ? doc.elements[ 'split-media' ]?.entrance : null;
				if ( ! e.reason && old && sameEntrance( old.base, e.layer ) ) {
					delete doc.elements[ 'split-media' ].entrance;
					whys.push( 'frame entrance moved from split-media (the image element) to media' );
				}
				if ( ! e.reason && stagger[ name ] ) {
					const want = { apply: true, ...stagger[ name ] };
					if ( ! same( doc.stagger, want ) ) {
						doc.stagger = want;
						whys.push( `${ name } stagger offset ${ want.offset }ms, step ${ want.step }ms${ want.cap ? `, at most ${ want.cap }ms` : '' }` );
					}
				}
			}
			if ( pc.entranceOnly ) {
				continue;
			}
			const loop = ( pc.calls[ 1440 ]?.loops[ 0 ] ?? widths.flatMap( ( c ) => c.loops )[ 0 ] );
			if ( loop ) {
				const ring = ringScale( { call: loop, effects: el.effects ?? [], records: recs } );
				const l = ring ?? loopOp( { call: loop, effects: el.effects ?? [], mdb, trig: { type: 'load' } } );
				if ( ring?.reason ) {
					// No ambient-float to hold the scale: the drawer family writes the effect from the record.
				} else if ( l.reason ) {
					items.push( { status: 'no-setting', prop: `${ name } effects`, why: l.reason } );
				} else if ( l.equal ) {
					items.push( { status: 'equal', prop: `${ name } effects`, why: 'the saved effect gives the draft loop' } );
				} else {
					el.effects = l.effects;
					whys.push( `${ name } ${ l.why }` );
					ids.push( recs.find( ( r ) => 'infinite' === r.iterations )?.id );
				}
			}
			const b = behaviourWrites( { recs, allRecords: records, block, part: name, doc, saved, mdb, schema, ctx, db, facts: Object.values( draft ).find( Boolean ) } );
			items.push( ...b.items );
			whys.push( ...b.whys );
			ids.push( ...b.ids );
			settings.push( ...b.settings );
			'root' === name && fx.push( ...b.fx );
		}
		const ownCalls = Object.values( calls ).some( ( c ) => c.one.length || c.loops.length );
		const reached = recordsIn( recordsIndex, [ ...( target.reach || [] ), ...innerIdsOf( calls ) ] ).some( ( r ) => isOpenRecord( r, words(), records ) );
		const left = heroParts ? [] : groupsOf( animate, ( c ) => c.key === key ).filter( ( g ) => ! placed.has( g.tpl ) && ! handedOver.has( g.tpl ) );
		if ( ! ownCalls && ! reached && ! heroParts && left.length ) {
			items.push( { status: 'no-setting', prop: 'motion', why: `the draft animates descendants of ${ target.tpl } (${ left.map( ( g ) => g.tpl ).join( ', ' ) }), which ${ block } draws with no motion part of its own to hold them` } );
		}
		marqueeFade( { doc, draft, recs: own, mdb, items, whys, ids } );
		for ( const [ k, v ] of Object.entries( doc.elements ) ) {
			Object.keys( v ).length || delete doc.elements[ k ];
		}
		const changed = JSON.stringify( doc ) !== before;
		if ( whys.length && ( changed || settings.length ) ) {
			// A document a removal leaves with no element holds nothing: the attribute goes (the schema refuses an empty document).
			const bare = Object.keys( doc ).every( ( k ) => [ 'v', 'elements' ].includes( k ) ) && ! Object.keys( doc.elements ).length;
			const verdict = changed && ! bare ? validateMotionWrite( doc, schema ) : { valid: true };
			if ( verdict.valid ) {
				const writes = [ ...( changed ? [ bare ? { attr: 'sgsMotion', unset: true } : { attr: 'sgsMotion', value: doc } ] : [] ), ...settings ];
				const record = ids.find( Boolean ) ?? null;
				items.push( { status: 'op', prop: 'motion', why: `${ target.tpl }: ${ whys.join( '; ' ) }`, writes, checks: [ ...[ ...new Set( fx ) ].map( ( f ) => ( { width: 1440, fx: f } ) ), ...checks ], ...( checks.length ? { needsProof: true } : {} ), ...( record ? { record } : {} ) } );
			} else {
				items.push( { status: 'no-setting', prop: 'motion', why: `sgsMotion write refused: ${ verdictProblems( verdict ).join( '; ' ).slice( 0, 300 ) }` } );
			}
		}
		return items;
	},
};
