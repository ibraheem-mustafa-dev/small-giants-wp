/**
 * What the Hover panel does when the client acts (Spec 38A §5.1), kept apart from the markup so each action can be
 * tested alone: choosing a Hover state, an Intensity or a "Driven by" source, editing a layer, and adding, moving and
 * removing hover effects. Every write goes through the layer operations (`layers/use-motion-layers.js`) and every
 * preset or Intensity change through the re-stamp flow (`layers/restamp.js::useRestamp`), which asks before it replaces
 * a customised field.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { presetBySlug } from '../layers/stamp';
import { EFFECTS_LIST, FOCUS_LIST, STATE_LIST } from './hover-write';
import './on-add-source';

export { EFFECTS_LIST, FOCUS_LIST, STATE_LIST };

/**
 * The sentence that tells the client why a write was not made. A schema refusal is already worded for the client; a
 * value the layer rules reject (`invalid`) is a developer's message, so the client gets a plain sentence and the detail
 * goes to the console.
 *
 * @param {Object|undefined} result A layer operation's result.
 * @return {string|null} The message, or null when the write went through (or waits for a confirmation).
 */
export function messageFor( result ) {
	if ( result?.refusal ) {
		return result.refusal;
	}
	if ( result?.invalid ) {
		// eslint-disable-next-line no-console -- the detail is for whoever debugs a refused write.
		console.warn( `SGS motion: write refused (${ result.invalid })` );
		return __(
			'That change could not be saved for this element. Try a different value.',
			'sgs-blocks'
		);
	}
	if ( result?.full ) {
		return __(
			'This list is full. Remove an effect to add another.',
			'sgs-blocks'
		);
	}
	return null;
}

/**
 * The actions for one target.
 *
 * @param {Object}   args
 * @param {Object}   args.layers The `useMotionLayers` result.
 * @param {Object}   args.flow   The `useRestamp` result.
 * @param {string}   args.target The chosen target.
 * @param {Function} args.report Receives the message of a write that was not made (or null).
 * @param {Function} args.drive  `use-driven-by.js::useDrivenBy`'s function: one source for every hover layer.
 * @return {Object} The actions.
 */
export function hoverActions( { layers, flow, target, report, drive } ) {
	const done = ( result ) => {
		report( messageFor( result ) );
		return result;
	};
	const stateLayer = () => layers.layersOf( target, STATE_LIST )[ 0 ];

	return {
		stateLayer,

		// None removes the state; any other choice stamps a new layer or re-stamps the existing one after asking.
		choosePreset: ( slug ) => {
			const row = presetBySlug( slug );
			if ( ! row ) {
				return done( { invalid: `no preset ${ slug }` } );
			}
			if ( ! stateLayer() ) {
				return row.slug === 'hover-none'
					? done( {} )
					: done(
							layers.add( target, STATE_LIST, { preset: slug } )
					  );
			}
			if ( row.slug === 'hover-none' ) {
				return done( layers.remove( target, STATE_LIST ) );
			}
			return done( flow.request( target, STATE_LIST, undefined, row ) );
		},

		chooseIntensity: ( intensity ) =>
			done(
				flow.requestIntensity(
					target,
					STATE_LIST,
					undefined,
					intensity
				)
			),

		// One source drives the state and every hover effect of the target.
		chooseSource: ( source ) => drive( source || 'self' ),

		editState: ( next ) =>
			done( layers.update( target, STATE_LIST, undefined, next ) ),

		removeState: () => layers.remove( target, STATE_LIST ),

		addEffect: ( effect ) =>
			done( layers.add( target, EFFECTS_LIST, { effect } ) ),

		moveEffect: ( id, delta ) =>
			layers.move( target, EFFECTS_LIST, id, delta ),

		removeEffect: ( id ) => layers.remove( target, EFFECTS_LIST, id ),

		chooseEffectIntensity: ( id, intensity ) =>
			done(
				flow.requestIntensity( target, EFFECTS_LIST, id, intensity )
			),

		addFocus: () => done( layers.add( target, FOCUS_LIST, {} ) ),

		focusLayer: () => layers.layersOf( target, FOCUS_LIST )[ 0 ],

		editFocus: ( next ) =>
			done( layers.update( target, FOCUS_LIST, undefined, next ) ),

		removeFocus: () => layers.remove( target, FOCUS_LIST ),
	};
}
