/**
 * What the stagger helper writes (Spec 38A §6.2, §8; FR-38A-24): the container's `stagger` settings at the motion
 * root, and on Write delays each child's explicit entrance delay (Desktop in `values.delay`, a Tablet or Mobile delay
 * that differs from the tier above in `devices.<tier>.delay`), so nothing is computed in the browser. The arithmetic is
 * `computeStaggerDelays`; the container's columns decide which children share a visual row at each tier.
 *
 * @package
 */

import { getBlockType } from '@wordpress/blocks';
import defs from '../../../../components/motion/motion-defs';
import { computeStaggerDelays } from '../../../../components/motion/stagger-delays';
import { effectiveStagger } from '../../../../components/motion/StaggerHelper';
import { elementOf, withElement, withList } from '../layers/layer-lists';
import { layerProblem } from '../layers/stamp';
import { layersAt } from '../layers/refusals';
import { MOTION_ATTRIBUTE_NAME, hasMotionSupport } from '../register';
import { BASE_LIST, TIERS, triggerFacts } from './entrance-facts';
import { pruneLayer, withTrigger } from './layer-edit';

const SCHEMA_VERSION = defs.$defs.schemaVersion.const;

const copy = ( value ) => JSON.parse( JSON.stringify( value ) );

/**
 * The motion value with the container's stagger settings replaced; an empty settings object clears them, and a value
 * left with no element and no settings becomes undefined (the attribute is cleared).
 *
 * @param {Object|undefined} motion  The motion value.
 * @param {Object|undefined} stagger The new settings.
 * @return {Object|undefined} The new motion value.
 */
export function withStagger( motion, stagger ) {
	const next = { ...( motion || {} ), v: SCHEMA_VERSION };
	if ( stagger && Object.keys( stagger ).length ) {
		next.stagger = stagger;
	} else {
		delete next.stagger;
	}
	return next.elements || next.stagger ? next : undefined;
}

/**
 * The delays at every tier.
 *
 * @param {Object}                 args
 * @param {number}                 args.count         Children.
 * @param {Object<string,?number>} args.columnsByTier The container's stored columns per tier.
 * @param {Object}                 args.settings      The helper's settings (`effectiveStagger`).
 * @return {Object<string,number[]>} `{ desktop, tablet, mobile }`, each one delay per child.
 */
export function delaysByTier( { count, columnsByTier, settings } ) {
	const stagger = effectiveStagger( settings );
	return Object.fromEntries(
		TIERS.map( ( tier ) => [
			tier,
			computeStaggerDelays( {
				count,
				columns: columnsByTier[ tier ],
				offset: stagger.offset,
				step: stagger.step,
				order: stagger.order,
				perRow: stagger.perRow,
				cap: stagger.cap,
			} ),
		] )
	);
}

// The entrance layer to give a child that has none: the container's, without the container's own delays, and with a
// trigger the child can use. A child that does not declare the template's `open` part or `state` plays on scroll, and
// the close values and the state name go with the trigger. The template's customised paths stay, so the child's
// Customised tags match its copied values.
function inheritedBase( template, facts ) {
	let base = copy( template );
	delete base.values?.delay;
	Object.values( base.devices || {} ).forEach( ( set ) => {
		delete set.delay;
	} );
	if ( Array.isArray( base.customised ) ) {
		base.customised = base.customised.filter(
			( path ) => ! /(?:^|\.)delay$/.test( path )
		);
	}
	const usable =
		base.trigger === undefined ||
		[ 'load', 'scroll' ].includes( base.trigger ) ||
		( base.trigger === 'open' && facts.canOpen ) ||
		( base.trigger === 'state' && facts.states.includes( base.state ) );
	if ( ! usable ) {
		base = withTrigger( base, 'scroll', [] );
	}
	return base;
}

// The tiers whose delay the client set by hand: the helper leaves those alone.
const DELAY_PATHS = Object.freeze( {
	desktop: 'values.delay',
	tablet: 'devices.tablet.delay',
	mobile: 'devices.mobile.delay',
} );

/**
 * A child's motion value with its entrance delays set.
 *
 * @param {Object|undefined} childMotion The child's motion value.
 * @param {Object|undefined} template    The container's own entrance layer, given to a child with none when `apply` is on.
 * @param {Object}           delays      This child's delay at each tier (`{ desktop, tablet, mobile }`).
 * @param {boolean}          apply       Whether a child with no entrance takes the container's.
 * @param {Object}           [facts]     The child block's `entrance-facts.js::triggerFacts` (root target), which decides
 *                                       whether it can play the template's `open` or `state` trigger.
 * @return {Object|undefined} The child's new motion value, or undefined when the child is left as it is (no entrance to
 *                            carry the delay, every tier customised, or a layer the schema would refuse). A tier whose
 *                            delay is in the child's `customised` keeps its value; the other tiers are written.
 */
export function childMotionWithDelay(
	childMotion,
	template,
	delays,
	apply,
	facts = { states: [], canOpen: false }
) {
	const element = elementOf( childMotion, 'root' );
	const own = layersAt( element, BASE_LIST )[ 0 ];
	if ( ! own && ! ( apply && template ) ) {
		return undefined;
	}
	const next = copy( own || inheritedBase( template, facts ) );
	const hand = new Set(
		own
			? ( next.customised || [] ).filter( ( path ) =>
					path.endsWith( 'delay' )
			  )
			: []
	);
	if ( TIERS.every( ( tier ) => hand.has( DELAY_PATHS[ tier ] ) ) ) {
		return undefined;
	}
	next.values = next.values || {};
	const devices = { ...( next.devices || {} ) };
	// The delay each tier ends up with, so a tier is compared with the one above as it will actually play.
	const effective = {};
	if ( hand.has( DELAY_PATHS.desktop ) ) {
		effective.desktop = next.values.delay ?? 0;
	} else {
		next.values.delay = delays.desktop;
		effective.desktop = delays.desktop;
	}
	[
		[ 'tablet', 'desktop' ],
		[ 'mobile', 'tablet' ],
	].forEach( ( [ tier, above ] ) => {
		const set = { ...( devices[ tier ] || {} ) };
		if ( hand.has( DELAY_PATHS[ tier ] ) ) {
			effective[ tier ] = set.delay ?? effective[ above ];
			return;
		}
		if ( delays[ tier ] === effective[ above ] ) {
			delete set.delay;
		} else {
			set.delay = delays[ tier ];
		}
		effective[ tier ] = delays[ tier ];
		devices[ tier ] = set;
	} );
	next.devices = devices;
	const layer = pruneLayer( next );
	if ( layerProblem( layer, 'EntranceBase' ) ) {
		return undefined;
	}
	return withElement(
		childMotion,
		'root',
		withList( element, BASE_LIST, [ layer ] )
	);
}

/**
 * The attribute updates that give every child its position's delay at every tier: the helper's write, shared by the
 * Write delays button and the re-run when children change (`../stagger/use-stagger-rerun.js`).
 *
 * @param {Object}                 args
 * @param {Object[]}               args.children      The container's inner blocks, in order (`name`, `clientId`, `attributes`).
 * @param {Object<string,?number>} args.columnsByTier The container's stored columns per tier.
 * @param {Object|undefined}       args.settings      The helper's stored settings (`apply` decides whether a child with no
 *                                                    entrance takes the template).
 * @param {Object|undefined}       args.template      The container's own entrance layer.
 * @return {Object<string,Object>} `{ [childClientId]: { sgsMotion } }` for each child the helper changes; a child that
 *                                 cannot carry a delay is left out.
 */
export function staggerUpdates( {
	children,
	columnsByTier,
	settings,
	template,
} ) {
	const delays = delaysByTier( {
		count: children.length,
		columnsByTier,
		settings: effectiveStagger( settings ),
	} );
	const updates = {};
	children.forEach( ( child, index ) => {
		if ( ! hasMotionSupport( getBlockType( child.name ) ) ) {
			return;
		}
		const written = childMotionWithDelay(
			child.attributes?.[ MOTION_ATTRIBUTE_NAME ],
			template,
			Object.fromEntries(
				TIERS.map( ( tier ) => [ tier, delays[ tier ][ index ] ] )
			),
			Boolean( settings?.apply ),
			triggerFacts( child.name, 'root' )
		);
		if ( written ) {
			updates[ child.clientId ] = { [ MOTION_ATTRIBUTE_NAME ]: written };
		}
	} );
	return updates;
}
