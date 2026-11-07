// The applier's state reads, shared by the state, form, motion and chrome families. After a surface's resting read at 1440,
// `stateReads` puts a real pointer on each key in extras.hover and reads its computed style once the transition has run
// (parity/lib/state-passes.mjs::hoverPass does the same for the walker): facts[ key ].hover. For each key in extras.probes
// (a form) it reads the first text field and its label at rest and under keyboard focus: facts[ key ].probes. For each key in
// extras.parts ({ key: { slot: [ prop ] } }, lib/apply-part-hover.mjs) it hovers the block's calibrated part and reads it: facts[ key ].parts.
import { HOVER_PROPS, hoverPointOf, hoverStyles } from '../../parity/lib/collect.mjs';
import { PAINT_SRC } from '../../parity/lib/paint.mjs';
import { probeRead } from './apply-probes.mjs';
import { recordsFor, stateLook } from './apply-records.mjs';
import { groupHosts, groupRead } from './apply-group-read.mjs';
import { partReads } from './apply-part-hover.mjs';

export const HOVER_READ_PROPS = [ ...HOVER_PROPS, 'border-top-width', 'text-decoration-thickness', 'gap' ];
// Hover looks the motion layer holds; the state family leaves them to it.
export const MOTION_LOOKS = [ 'transform', 'scale', 'translate', 'rotate' ];
export { FIELD_FOCUS_PROPS, FIELD_REST_PROPS, LABEL_PROPS } from './apply-probes.mjs';

// Which of a surface's targets need a hover read (a record gives them a hover look) or a form probe (an sgs/form block).
export function extrasOf( { surface, saved, recordsIndex, db = null } ) {
	const hover = [];
	const probes = [];
	const blocks = {};
	const tpls = {};
	for ( const target of surface.pairs ) {
		if ( recordsFor( recordsIndex, target.tpl ).some( ( r ) => 'hover' === stateLook( r )?.state ) ) {
			hover.push( target.key ?? target.ref );
		}
		if ( [ 'sgs/form', 'sgs/form-field-tiles' ].includes( saved?.[ target.ref ]?.block ) ) {
			probes.push( target.ref );
			blocks[ target.ref ] = saved[ target.ref ].block;
			tpls[ target.ref ] = target.tpl;
		}
	}
	return { hover, probes, blocks, tpls, groups: groupHosts( { surface, saved, recordsIndex, db } ) };
}

async function hoverRead( page, { keys, finderOf, resolveSrc, wait = 700 } ) {
	const out = {};
	for ( const key of keys ) {
		const finder = finderOf( key );
		// Smooth scrolling can carry the page on after the pointer lands, so each landing is confirmed and re-aimed.
		let at = null;
		let over = false;
		for ( let tries = 0; tries < 3 && ! over; tries++ ) {
			await settled( page, finder, resolveSrc );
			at = await page.evaluate( hoverPointOf, [ finder, resolveSrc ] );
			if ( ! at || at.unreached ) {
				break;
			}
			await page.mouse.move( at.x, at.y );
			await page.waitForTimeout( 80 );
			over = await page.evaluate( ( [ f, src ] ) => {
				// eslint-disable-next-line no-new-func
				return !! new Function( `return (${ src });` )()( f )?.matches( ':hover' );
			}, [ finder, resolveSrc ] );
		}
		if ( ! over ) {
			out[ key ] = { unreached: true };
			await page.mouse.move( 1, 1 );
			continue;
		}
		await page.waitForTimeout( wait );
		out[ key ] = await page.evaluate( hoverStyles, [ finder, HOVER_READ_PROPS, resolveSrc, PAINT_SRC, { paintPart: true } ] );
		await page.mouse.move( 1, 1 );
		await page.waitForTimeout( 150 );
	}
	return out;
}

// Waits until an element has stopped moving: an entrance that plays on arrival carries it out from under the pointer, so a
// hover read before it ends lands on nothing. Bounded: a loop that never settles reads after three seconds.
export async function settled( page, finder, resolveSrc ) {
	await page.evaluate( ( [ f, src ] ) => {
		// eslint-disable-next-line no-new-func
		const el = new Function( `return (${ src });` )()( f );
		el?.scrollIntoView( { block: 'center', behavior: 'instant' } );
		const box = () => {
			const r = el?.getBoundingClientRect();
			return r ? `${ Math.round( r.left ) } ${ Math.round( r.top ) } ${ Math.round( r.width ) }` : '';
		};
		return new Promise( ( done ) => {
			let last = box();
			let calm = 0;
			let waited = 0;
			const tick = setInterval( () => {
				const now = box();
				calm = now === last ? calm + 1 : 0;
				last = now;
				waited += 100;
				if ( calm >= 4 || waited >= 3000 ) {
					clearInterval( tick );
					done();
				}
			}, 100 );
		} );
	}, [ finder, resolveSrc ] );
}

export async function stateReads( page, { extras, finderOf, resolveSrc, side } ) {
	const hover = extras?.hover?.length ? await hoverRead( page, { keys: extras.hover, finderOf, resolveSrc } ) : {};
	const probes = extras?.probes?.length ? await probeRead( page, { keys: extras.probes, finderOf, resolveSrc, tpls: extras.tpls ?? {}, blocks: extras.blocks ?? {}, side } ) : {};
	const groups = extras?.groups?.length ? await groupRead( page, { keys: extras.groups, finderOf, resolveSrc, side, settled } ) : {};
	const parts = extras?.parts && Object.keys( extras.parts ).length ? await partReads( page, { parts: extras.parts, finderOf, resolveSrc, settled } ) : {};
	return { hover, probes, groups, parts };
}

// Folds a state read into a read's facts.
export function attachStateReads( read, { hover, probes, groups = {}, parts = {} } ) {
	for ( const [ key, styles ] of Object.entries( hover ) ) {
		read.facts[ key ] && ( read.facts[ key ].hover = styles );
	}
	for ( const [ key, facts ] of Object.entries( probes ) ) {
		read.facts[ key ] && ( read.facts[ key ].probes = facts );
	}
	for ( const [ key, group ] of Object.entries( groups ) ) {
		read.facts[ key ] && ( read.facts[ key ].group = group );
	}
	for ( const [ key, part ] of Object.entries( parts ) ) {
		read.facts[ key ] && ( read.facts[ key ].parts = part );
	}
	return read;
}

// The pose a read hover style puts an element in: scale, translate (px) and rotation (deg), from transform and the individual
// transform properties together. Null for a read that has none.
export function motionOf( styles ) {
	if ( ! styles || styles.unreached ) {
		return null;
	}
	const m = /^matrix\(([^)]+)\)$/.exec( String( styles.transform ?? '' ).trim() );
	const [ a = 1, b = 0, , , e = 0, f = 0 ] = m ? m[ 1 ].split( ',' ).map( Number ) : [];
	const [ tx = 0, ty = 0 ] = String( 'none' === styles.translate ? '' : styles.translate ?? '' ).split( /\s+/ ).filter( Boolean ).map( parseFloat );
	const sc = parseFloat( 'none' === styles.scale ? 1 : styles.scale ?? 1 ) || 1;
	const rot = parseFloat( 'none' === styles.rotate ? 0 : String( styles.rotate ?? '0' ).split( ' ' ).pop() ) || 0;
	return { scale: Math.hypot( a, b ) * sc, x: e + ( tx || 0 ), y: f + ( ty || 0 ), rotate: ( Math.atan2( b, a ) * 180 ) / Math.PI + rot };
}

// Whether two poses agree to a hundredth of a scale, two pixels and a degree.
export const motionClose = ( a, b ) => Boolean( a && b ) && Math.abs( a.scale - b.scale ) <= 0.011 && Math.abs( a.x - b.x ) <= 2 && Math.abs( a.y - b.y ) <= 2 && Math.abs( a.rotate - b.rotate ) <= 1;

// The same with six pixels, for a re-read: a magnet pulls an element up to five pixels towards the pointer.
export const motionNear = ( a, b ) => Boolean( a && b ) && Math.abs( a.scale - b.scale ) <= 0.011 && Math.abs( a.x - b.x ) <= 6 && Math.abs( a.y - b.y ) <= 6 && Math.abs( a.rotate - b.rotate ) <= 1;
