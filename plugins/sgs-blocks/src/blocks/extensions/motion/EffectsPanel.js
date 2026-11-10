/**
 * The Effects panel (Spec 38A §5, §5.3; FR-38A-9, FR-38A-11): a Target row, the Effect choice (the first layer, from
 * only the effects valid for this block and target, `effect-options.js`), that layer's Trigger and Intensity, a
 * Fine-tune section built from the effect's schema entry (`EffectLayerControls.js`, per device through the editor's
 * device toggle) and the "More effects" list with Add effect, Move and Remove. It registers itself with the panel shell
 * at order 30 and receives `{ blockName, clientId, elements, motion, layers }`.
 *
 * Every write goes through the shell's layer operations. Choosing another effect for the first layer replaces it in
 * place (`layers.swap`), after the same confirmation a re-stamp uses when the layer carries customised values; an
 * Intensity change re-stamps through `useRestamp`. A second copy of an effect on one element is refused with the
 * schema's text, which the Add effect menu shows beside the disabled item.
 *
 * @package
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { speak } from '@wordpress/a11y';
import { Notice, PanelBody } from '@wordpress/components';
import { usePreviewTier } from '../../../utils/usePreviewTier';
import ChoiceAtom from '../../../components/motion/ChoiceAtom';
import { ROOT_TARGET } from '../../../components/motion/TargetPicker';
import {
	deviceNote,
	offTiersFor,
} from '../../../components/motion/kind-fit.js';
import {
	usePartKinds,
	useActiveDevice,
} from '../../../components/motion/use-part-kinds.js';
import { INSPECTOR_FOCUS_STORE } from '../../../components/media/inspector-focus-store.js';
import { registerMotionPanel } from './panel-slots';
import TargetRow from './layers/TargetRow';
import LayerList from './layers/LayerList';
import { LAYER_LISTS } from './layers/layer-lists';
import { effectLabel } from './layers/refusals';
import { RestampConfirm, useRestamp } from './layers/restamp';
import { problemText } from './entrance/layer-edit';
import { heldPaths, presetBySlug } from './layers/stamp';
import {
	EFFECTS_LIST,
	EFFECTS_PANEL,
	effectOptions,
	effectTriggers,
} from './effect-options';
import EffectLayerControls, { EffectLayerHead } from './EffectLayerControls';

/** Where the panel sits in the Styles tab (Hover is 10, Entrance and reveal 20). */
export const EFFECTS_PANEL_ORDER = 30;

/**
 * What replacing a layer with another effect removes, counted the way a re-stamp counts (`stamp.js::heldPaths`): the
 * customised values of a preset layer, every value of a layer with no preset, and a trigger that differs from the one
 * the layer was given when it was added.
 *
 * @param {Object} layer The layer being replaced.
 * @return {number} The count.
 */
export function swapCount( layer ) {
	const given =
		( layer.preset ? presetBySlug( layer.preset )?.trigger : undefined ) ??
		effectTriggers( layer.effect )[ 0 ];
	const triggerChanged =
		layer.trigger !== undefined && layer.trigger !== given;
	return heldPaths( layer ).length + ( triggerChanged ? 1 : 0 );
}

/**
 * The confirmation text for replacing one effect with another.
 *
 * @param {Object} layer  The layer being replaced.
 * @param {string} effect The effect replacing it.
 * @param {number} count  `swapCount( layer )`.
 * @return {string} The text.
 */
export function swapMessage( layer, effect, count ) {
	const text = layer.preset
		? /* translators: 1: the current effect, 2: the new effect, 3: number of customised values. */
		  _n(
				'Replacing %1$s with %2$s removes its %3$d customised value.',
				'Replacing %1$s with %2$s removes its %3$d customised values.',
				count,
				'sgs-blocks'
		  )
		: /* translators: 1: the current effect, 2: the new effect, 3: number of values. */
		  _n(
				'Replacing %1$s with %2$s removes its %3$d value.',
				'Replacing %1$s with %2$s removes its %3$d values.',
				count,
				'sgs-blocks'
		  );
	return sprintf(
		text,
		effectLabel( layer.effect ),
		effectLabel( effect ),
		count
	);
}

/**
 * The panel's state and actions for one target: the re-stamp flow, the pending effect swap and the last problem text.
 *
 * @param {Object} layers The `useMotionLayers` result.
 * @param {string} target The chosen target.
 * @param {Function} [offFor] `( effect ) => string[]|undefined`: the device tiers a new layer is switched off on
 *                            (an adopted media part whose kind differs per device, `kind-fit.js::offTiersFor`).
 * @return {Object} `{ flow, first, rest, problem, setProblem, swap, chooseEffect, confirmSwap, cancelSwap, addEffect, reset }`.
 */
export function useEffectsPanelState( layers, target, offFor = () => undefined ) {
	const flow = useRestamp( layers );
	const [ problem, setProblem ] = useState( null );
	const [ swap, setSwap ] = useState( null );
	const [ first, ...rest ] = layers.layersOf( target, EFFECTS_LIST );

	const applySwap = ( id, effect ) =>
		setProblem(
			problemText(
				layers.swap( target, EFFECTS_LIST, id, {
					effect,
					off: offFor( effect ),
				} )
			)
		);

	const chooseEffect = ( slug ) => {
		setSwap( null );
		flow.cancel();
		if ( ! slug ) {
			if ( first ) {
				layers.remove( target, EFFECTS_LIST, first.id );
			}
			setProblem( null );
			return;
		}
		if ( ! first ) {
			setProblem(
				problemText(
					layers.add( target, EFFECTS_LIST, {
						effect: slug,
						off: offFor( slug ),
					} )
				)
			);
			return;
		}
		if ( slug === first.effect ) {
			return;
		}
		const count = swapCount( first );
		if ( count ) {
			setSwap( {
				id: first.id,
				effect: slug,
				count,
				message: swapMessage( first, slug, count ),
			} );
			return;
		}
		applySwap( first.id, slug );
	};

	// A re-stamp request closes a waiting swap, so only one confirmation shows at a time.
	const closingSwap =
		( ask ) =>
		( ...args ) => {
			setSwap( null );
			return ask( ...args );
		};
	return {
		flow: {
			...flow,
			request: closingSwap( flow.request ),
			requestIntensity: closingSwap( flow.requestIntensity ),
		},
		first,
		rest,
		problem,
		setProblem,
		swap,
		chooseEffect,
		confirmSwap: () => {
			if ( swap ) {
				applySwap( swap.id, swap.effect );
			}
			setSwap( null );
		},
		cancelSwap: () => setSwap( null ),
		addEffect: ( effect ) =>
			layers.add( target, EFFECTS_LIST, {
				effect,
				off: offFor( effect ),
			} ),
		reset: () => {
			flow.cancel();
			setSwap( null );
			setProblem( null );
		},
	};
}

/**
 * Opens the panel when another panel asks for it through the `sgs/inspector-focus` store (Spec 49 C6): the panel
 * opens, `onRequest` selects the target, the panel scrolls into view, focus moves to its heading and `announce`'s text
 * goes to the live region. The request is cleared once acted on.
 *
 * @param {Object}   args
 * @param {string}   args.clientId  The block's client id.
 * @param {Function} args.onRequest Called with the request.
 * @param {Function} args.announce  `( request ) => string`.
 * @return {{ref: Object, opened: boolean, toggle: Function}} The marker's `ref` (a hidden element inside the panel body), `opened` and `toggle`.
 */
export function useFocusRequest( { clientId, onRequest, announce } ) {
	const ref = useRef( null );
	const [ opened, setOpened ] = useState( false );
	const request = useSelect(
		( select ) =>
			select( INSPECTOR_FOCUS_STORE )?.getRequest?.( clientId ) || null,
		[ clientId ]
	);
	const { clear } = useDispatch( INSPECTOR_FOCUS_STORE );
	const [ pending, setPending ] = useState( null );
	const requestId =
		request?.panel === EFFECTS_PANEL ? request.requestId : null;
	useEffect( () => {
		if ( null === requestId ) {
			return;
		}
		onRequest( request );
		setOpened( true );
		setPending( request );
		// Only a new request acts; the callbacks are read as they were when it arrived.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ requestId ] );
	// The panel is open and drawn: scroll to it, focus its heading, announce it, then clear the request.
	useEffect( () => {
		if ( ! pending || ! opened ) {
			return;
		}
		const node = ref.current?.closest( '.components-panel__body' );
		node?.scrollIntoView?.( { block: 'nearest' } );
		node?.querySelector( '.components-panel__body-title button' )?.focus();
		speak( announce( pending ), 'polite' );
		clear( clientId );
		setPending( null );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ pending, opened ] );
	return { ref, opened, toggle: () => setOpened( ( value ) => ! value ) };
}

/**
 * @param {Object}           props
 * @param {string}           props.blockName The block's name.
 * @param {string}           props.clientId  The block's client id: the key of its inspector-focus request.
 * @param {Object|null}      props.elements  The block's `supports.sgs.elements`.
 * @param {Object|undefined} props.motion    The block's motion value.
 * @param {Object}           props.layers    The layer operations (`useMotionLayers`).
 * @return {Element} The panel.
 */
export default function EffectsPanel( {
	blockName,
	clientId,
	elements,
	motion,
	layers,
} ) {
	const [ target, setTarget ] = useState( ROOT_TARGET );
	const kindsOf = usePartKinds( clientId, blockName );
	const kinds = kindsOf( elements?.[ target ] );
	const device = useActiveDevice();
	const state = useEffectsPanelState( layers, target, ( effect ) => {
		const off = kinds ? offTiersFor( effect, kinds ) : [];
		return off.length ? off : undefined;
	} );
	const tier = usePreviewTier();
	const { first, rest, flow, setProblem } = state;
	// The list follows the device the editor previews: the effects that fit the kind shown there.
	const offered = effectOptions(
		blockName,
		target,
		elements,
		kinds && { [ device ]: kinds[ device ] }
	);
	const note = first && kinds ? deviceNote( first.effect, kinds ) : '';
	const focus = useFocusRequest( {
		clientId,
		onRequest: ( request ) => {
			state.reset();
			setTarget( request.target || ROOT_TARGET );
		},
		announce: ( request ) =>
			sprintf(
				/* translators: %s: the target the Effects panel opened on, for example Background. */
				__( 'Effects opened on %s.', 'sgs-blocks' ),
				elements?.[ request.target ]?.label ||
					request.target ||
					__( 'the whole block', 'sgs-blocks' )
			),
	} );
	const options = offered.map( ( value ) => ( {
		value,
		label: effectLabel( value ),
	} ) );
	if ( first && ! offered.includes( first.effect ) ) {
		options.push( {
			value: first.effect,
			label: effectLabel( first.effect ),
		} );
	}
	const maxItems = LAYER_LISTS[ EFFECTS_LIST ].maxItems;
	const held = rest.length + ( first ? 1 : 0 );
	const layerProps = { target, layers, setProblem };

	return (
		<PanelBody
			title={ __( 'Effects', 'sgs-blocks' ) }
			className="sgs-motion-panel sgs-motion-panel--effects"
			opened={ focus.opened }
			onToggle={ focus.toggle }
		>
			<span ref={ focus.ref } hidden />
			<TargetRow
				blockName={ blockName }
				elements={ elements }
				motion={ motion }
				panel="effects"
				value={ target }
				kindsOf={ kindsOf }
				onChange={ ( next ) => {
					state.reset();
					setTarget( next );
				} }
			/>
			<ChoiceAtom
				label={ __( 'Effect', 'sgs-blocks' ) }
				help={
					options.length
						? undefined
						: __(
								'No effect fits this part of the block.',
								'sgs-blocks'
						  )
				}
				options={ options }
				value={ first?.effect ?? '' }
				onChange={ state.chooseEffect }
				emptyLabel={ __( 'None', 'sgs-blocks' ) }
			/>
			{ note && (
				<p className="sgs-motion-atom__help sgs-motion-panel__device-note">
					{ note }
				</p>
			) }
			{ first && (
				<EffectLayerHead
					layer={ first }
					flow={ flow }
					{ ...layerProps }
				/>
			) }
			<RestampConfirm
				pending={ flow.pending }
				confirm={ flow.confirm }
				cancel={ flow.cancel }
			/>
			<RestampConfirm
				pending={ state.swap }
				confirm={ state.confirmSwap }
				cancel={ state.cancelSwap }
			/>
			{ state.problem && (
				<Notice
					status="warning"
					isDismissible
					onRemove={ () => setProblem( null ) }
				>
					{ state.problem }
				</Notice>
			) }
			<p className="sgs-motion-atom__help">
				{ __(
					'Visitors who ask for reduced motion see no movement.',
					'sgs-blocks'
				) }
			</p>
			<PanelBody
				title={ __( 'Fine-tune', 'sgs-blocks' ) }
				className="sgs-motion-panel__fine-tune"
				initialOpen={ false }
			>
				{ first ? (
					<EffectLayerControls
						layer={ first }
						tier={ tier }
						blockName={ blockName }
						elements={ elements }
						{ ...layerProps }
					/>
				) : (
					<p className="sgs-motion-atom__help">
						{ __(
							'Choose an Effect to fine-tune its values.',
							'sgs-blocks'
						) }
					</p>
				) }
				<LayerList
					label={ __( 'More effects (in order)', 'sgs-blocks' ) }
					layers={ rest }
					firstNumber={ 2 }
					effects={ offered }
					refusalFor={ ( effect ) =>
						layers.refusalFor( target, EFFECTS_LIST, effect )
					}
					onAdd={ state.addEffect }
					onMove={ ( id, delta ) =>
						layers.move( target, EFFECTS_LIST, id, delta )
					}
					onRemove={ ( id ) =>
						layers.remove( target, EFFECTS_LIST, id )
					}
					full={ maxItems !== null && held >= maxItems }
					renderControls={ ( layer ) => (
						<>
							<EffectLayerHead
								layer={ layer }
								flow={ flow }
								{ ...layerProps }
							/>
							<EffectLayerControls
								layer={ layer }
								tier={ tier }
								blockName={ blockName }
								elements={ elements }
								{ ...layerProps }
							/>
						</>
					) }
				/>
			</PanelBody>
		</PanelBody>
	);
}

registerMotionPanel( 'effects', EffectsPanel, EFFECTS_PANEL_ORDER );
