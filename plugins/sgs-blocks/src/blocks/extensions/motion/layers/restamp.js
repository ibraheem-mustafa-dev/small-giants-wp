/**
 * Re-stamping a layer (Spec 38A §5): choosing another preset or Intensity re-stamps the layer's values and clears its
 * Customised tags, after a confirmation that names how many customised fields will be replaced. Cancelling keeps them.
 *
 * Panels re-stamp only through `useRestamp`: `request( target, list, id, row )` for a preset choice and
 * `requestIntensity( target, list, id, intensity )` for an Intensity choice. Panels must not apply
 * `IntensityPicker`'s own `restampLayer` result, which keeps customised values instead of confirming their
 * replacement; they read the chosen intensity from `IntensityPicker`'s `onChange` and pass it to `requestIntensity`.
 *
 * The pending re-stamp stores only what was asked (target, list, layer id, preset row). The plan is worked out again
 * against the layer as it is when the confirmation is shown and when it is confirmed, so a confirmation never undoes
 * an edit made in between.
 *
 * @package
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { useInstanceId } from '@wordpress/compose';
import { intensityRowsFor } from '../../../../components/motion/IntensityPicker';
import { LAYER_LISTS } from './layer-lists';
import { planRestamp, presetBySlug, presetFits } from './stamp';

/**
 * The confirmation text naming how many customised fields a re-stamp replaces.
 *
 * @param {number} count Customised fields replaced.
 * @return {string} The text.
 */
export function restampMessage( count ) {
	return sprintf(
		/* translators: %d: number of customised fields. */
		_n(
			'This replaces %d customised field with the preset value.',
			'This replaces %d customised fields with the preset values.',
			count,
			'sgs-blocks'
		),
		count
	);
}

/**
 * The re-stamp flow over one block's layer operations.
 *
 * @param {Object} layers The `useMotionLayers` result (`layersOf`, `update`).
 * @return {{request: Function, requestIntensity: Function, pending: (Object|null), confirm: Function, cancel: Function}}
 *         `request` and `requestIntensity` return `{ pending: true }` while a confirmation waits, the update's result
 *         when nothing customised is replaced, or `{ invalid }` for a row that does not fit the layer; `pending` is
 *         `{ target, list, id, row, count }`.
 */
export function useRestamp( layers ) {
	const [ asked, setAsked ] = useState( null );

	const layerAt = ( target, list, id ) => {
		const all = layers.layersOf( target, list );
		return LAYER_LISTS[ list ].kind === 'single'
			? all[ 0 ]
			: all.find( ( layer ) => layer.id === id );
	};
	const planFor = ( { target, list, id, row } ) => {
		const layer = layerAt( target, list, id );
		return layer
			? planRestamp( layer, row, LAYER_LISTS[ list ].layerDef )
			: null;
	};
	const apply = ( request ) => {
		const plan = planFor( request );
		return plan
			? layers.update(
					request.target,
					request.list,
					request.id,
					plan.layer
			  )
			: { missing: true };
	};

	const request = ( target, list, id, row ) => {
		const layer = layerAt( target, list, id );
		if ( ! layer ) {
			return { missing: true };
		}
		if ( ! presetFits( row, LAYER_LISTS[ list ].layerDef, layer.effect ) ) {
			return { invalid: `preset ${ row?.slug } does not fit ${ list }` };
		}
		const asking = { target, list, id, row };
		if ( ! planFor( asking ).replaced.length ) {
			return apply( asking );
		}
		setAsked( asking );
		return { pending: true };
	};

	const requestIntensity = ( target, list, id, intensity ) => {
		const layer = layerAt( target, list, id );
		const family = layer?.preset
			? presetBySlug( layer.preset )?.family
			: null;
		const row = family ? intensityRowsFor( family )?.[ intensity ] : null;
		return row
			? request( target, list, id, row )
			: { invalid: `no ${ intensity } row for ${ list }` };
	};

	const plan = asked ? planFor( asked ) : null;
	const pending =
		asked && plan ? { ...asked, count: plan.replaced.length } : null;

	const confirm = () => {
		const result = asked ? apply( asked ) : null;
		setAsked( null );
		return result;
	};
	const cancel = () => setAsked( null );

	return { request, requestIntensity, pending, confirm, cancel };
}

function ConfirmBody( { count, message, confirm, cancel } ) {
	const id = useInstanceId( ConfirmBody, 'sgs-motion-restamp' );
	const keepRef = useRef( null );

	useEffect( () => {
		const previous = keepRef.current?.ownerDocument?.activeElement;
		keepRef.current?.focus();
		return () => {
			if ( previous && previous.isConnected ) {
				previous.focus();
			}
		};
	}, [] );

	return (
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape closes the dialog.
		<div
			className="sgs-motion-layer__confirm"
			role="alertdialog"
			aria-labelledby={ `${ id }-title` }
			aria-describedby={ `${ id }-text` }
			onKeyDown={ ( event ) => {
				if ( event.key === 'Escape' ) {
					event.stopPropagation();
					cancel();
				}
			} }
		>
			<p
				id={ `${ id }-title` }
				className="sgs-motion-layer__confirm-title"
			>
				{ __( 'Replace customised values?', 'sgs-blocks' ) }
			</p>
			<p id={ `${ id }-text` }>{ message || restampMessage( count ) }</p>
			<Button variant="primary" onClick={ confirm } __next40pxDefaultSize>
				{ __( 'Replace', 'sgs-blocks' ) }
			</Button>
			<Button
				ref={ keepRef }
				variant="tertiary"
				onClick={ cancel }
				__next40pxDefaultSize
			>
				{ __( 'Keep my changes', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

/**
 * The confirmation shown while a re-stamp waits: an alert dialog that takes focus on "Keep my changes" and gives
 * focus back when it closes.
 *
 * @param {Object}      props
 * @param {Object|null} props.pending The pending re-stamp from `useRestamp` (or another replacement that carries its own
 *                                    `message`, such as the Effects panel's effect swap).
 * @param {Function}    props.confirm Applies it.
 * @param {Function}    props.cancel  Keeps the customised fields.
 * @return {Element|null} The confirmation, or null when nothing waits.
 */
export function RestampConfirm( { pending, confirm, cancel } ) {
	if ( ! pending ) {
		return null;
	}
	return (
		<ConfirmBody
			count={ pending.count }
			message={ pending.message }
			confirm={ confirm }
			cancel={ cancel }
		/>
	);
}
