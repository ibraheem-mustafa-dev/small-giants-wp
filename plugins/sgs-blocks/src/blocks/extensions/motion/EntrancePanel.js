/**
 * The Entrance and reveal panel (Spec 38A §5, §5.2; FR-38A-8): the panel's one entrance (a preset choice, its trigger,
 * its intensity and Replay), a Fine-tune section (from and to values, extra keyframes, timing, start line, close values,
 * per-device values), the ordered text and SVG effects, and on a container the stagger helper. It registers itself
 * with the panel shell at order 20 and receives `{ blockName, clientId, elements, motion, layers }`.
 *
 * Every write goes through the shell's layer operations: choosing a preset adds the entrance layer or re-stamps it after
 * a confirmation naming the customised fields it replaces (`layers/restamp.js`), so this file never reads or writes the
 * block's motion attribute itself (the stagger helper's settings and child delays are the one exception, in
 * `entrance/EntranceStagger.js`, because they live at the motion root and on other blocks).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Notice, PanelBody } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import ChoiceAtom from '../../../components/motion/ChoiceAtom';
import IntensityPicker from '../../../components/motion/IntensityPicker';
import ReplayButton from '../../../components/motion/ReplayButton';
import TriggerPicker from '../../../components/motion/TriggerPicker';
import { ROOT_TARGET } from '../../../components/motion/TargetPicker';
import { registerMotionPanel } from './panel-slots';
import { replay } from './canvas/use-canvas-motion';
import TargetRow from './layers/TargetRow';
import { presetBySlug } from './layers/stamp';
import { RestampConfirm, useRestamp } from './layers/restamp';
import EntranceFineTune from './entrance/EntranceFineTune';
import EntranceStagger from './entrance/EntranceStagger';
import './stagger/with-stagger-rerun';
import EntranceTextEffects from './entrance/EntranceTextEffects';
import PresetThumbnailGrid from './thumbnails/PresetThumbnailGrid';
import { layerEditor, problemText, withTrigger } from './entrance/layer-edit';
import {
	BASE_LIST,
	EDITOR_STORE,
	ENTRANCE_TRIGGER_LABELS,
	entrancePresetOptions,
	isContainerBlock,
	triggerFacts,
} from './entrance/entrance-facts';

const CUSTOM = '__custom__';
const DEVICE_TIERS = Object.freeze( {
	Desktop: 'desktop',
	Tablet: 'tablet',
	Mobile: 'mobile',
} );

/** Where the panel sits in the Styles tab (Hover is 10, Effects 30). */
export const ENTRANCE_PANEL_ORDER = 20;

/**
 * @param {Object}           props
 * @param {string}           props.blockName The block's name.
 * @param {string}           props.clientId  The block's client id.
 * @param {Object|null}      props.elements  The block's `supports.sgs.elements`.
 * @param {Object|undefined} props.motion    The block's motion value.
 * @param {Object}           props.layers    The layer operations (`useMotionLayers`).
 * @return {Element} The panel.
 */
export default function EntrancePanel( {
	blockName,
	clientId,
	elements,
	motion,
	layers,
} ) {
	const [ target, setTarget ] = useState( ROOT_TARGET );
	const [ problem, setProblem ] = useState( null );
	const flow = useRestamp( layers );
	const tier = useSelect(
		( select ) =>
			DEVICE_TIERS[ select( 'core/editor' )?.getDeviceType?.() ] ||
			'desktop',
		[]
	);
	const childCount = useSelect(
		( select ) =>
			( select( EDITOR_STORE )?.getBlockOrder?.( clientId ) || [] )
				.length,
		[ clientId ]
	);

	const base = layers.layersOf( target, BASE_LIST )[ 0 ];
	const facts = triggerFacts( blockName, target );
	const family = base?.preset ? presetBySlug( base.preset )?.family : null;
	const editor = base
		? layerEditor( {
				layers,
				target,
				list: BASE_LIST,
				layer: base,
				onProblem: setProblem,
		  } )
		: null;

	// The choice reads the layer's own preset: an Intensity row reads as its family's preset, and a preset the list does
	// not offer (a keyframe preset, a nav panel item) reads by its label, or "Custom" when it has none.
	const offered = entrancePresetOptions();
	const row = base?.preset ? presetBySlug( base.preset ) : null;
	let current;
	const options = [ ...offered ];
	if ( base ) {
		const known = [ base.preset, row?.family ].find( ( slug ) =>
			offered.some( ( option ) => option.value === slug )
		);
		if ( known ) {
			current = known;
		} else {
			current = base.preset || CUSTOM;
			options.push( {
				value: current,
				label: row?.label || __( 'Custom', 'sgs-blocks' ),
			} );
		}
	}
	const choose = ( slug ) => {
		if ( slug === CUSTOM || ( base && slug === current ) ) {
			return;
		}
		if ( ! slug ) {
			if ( base ) {
				layers.remove( target, BASE_LIST );
			}
			setProblem( null );
			return;
		}
		setProblem(
			problemText(
				base
					? flow.request(
							target,
							BASE_LIST,
							undefined,
							presetBySlug( slug )
					  )
					: layers.add( target, BASE_LIST, { preset: slug } )
			)
		);
	};

	return (
		<PanelBody
			title={ __( 'Entrance and reveal', 'sgs-blocks' ) }
			className="sgs-motion-panel sgs-motion-panel--entrance"
			initialOpen={ false }
		>
			<TargetRow
				blockName={ blockName }
				elements={ elements }
				motion={ motion }
				panel="entrance"
				value={ target }
				onChange={ setTarget }
			/>
			<ChoiceAtom
				label={ __( 'Entrance', 'sgs-blocks' ) }
				options={ options }
				value={ current }
				onChange={ choose }
				emptyLabel={ __( 'None', 'sgs-blocks' ) }
			/>
			<PresetThumbnailGrid
				label={ __( 'Entrance previews', 'sgs-blocks' ) }
				options={ offered }
				value={ current ?? '' }
				onChange={ choose }
			/>
			{ base && (
				<TriggerPicker
					panel="entrance"
					label={ __( 'Trigger', 'sgs-blocks' ) }
					labels={ ENTRANCE_TRIGGER_LABELS }
					value={ base.trigger }
					states={ facts.states }
					exclude={ facts.canOpen ? [] : [ 'open' ] }
					state={ base.state }
					onChange={ ( trigger ) =>
						trigger &&
						editor.replace(
							withTrigger( base, trigger, facts.states )
						)
					}
					onStateChange={ ( state ) =>
						state && editor.replace( { ...base, state } )
					}
				/>
			) }
			{ family && (
				<IntensityPicker
					family={ family }
					value={ base.intensity }
					values={ base.values }
					customised={ base.customised }
					onChange={ ( { intensity } ) =>
						setProblem(
							problemText(
								flow.requestIntensity(
									target,
									BASE_LIST,
									undefined,
									intensity
								)
							)
						)
					}
				/>
			) }
			<ReplayButton
				onReplay={ () => replay( clientId, target ) }
				disabled={ ! base }
			/>
			<p className="sgs-motion-atom__help">
				{ __(
					'Visitors who ask for reduced motion see no movement.',
					'sgs-blocks'
				) }
			</p>
			<RestampConfirm
				pending={ flow.pending }
				confirm={ flow.confirm }
				cancel={ flow.cancel }
			/>
			{ problem && (
				<Notice
					status="warning"
					isDismissible
					onRemove={ () => setProblem( null ) }
				>
					{ problem }
				</Notice>
			) }
			<PanelBody
				title={ __( 'Fine-tune', 'sgs-blocks' ) }
				className="sgs-motion-panel__fine-tune"
				initialOpen={ false }
			>
				{ base && (
					<EntranceFineTune
						layer={ base }
						tier={ tier }
						editor={ editor }
					/>
				) }
				<EntranceTextEffects
					target={ target }
					layers={ layers }
					flow={ flow }
					tier={ tier }
					setProblem={ setProblem }
				/>
				{ isContainerBlock( blockName, childCount ) && (
					<EntranceStagger
						blockName={ blockName }
						clientId={ clientId }
						motion={ motion }
						layers={ layers }
						tier={ tier }
					/>
				) }
			</PanelBody>
		</PanelBody>
	);
}

registerMotionPanel( 'entrance', EntrancePanel, ENTRANCE_PANEL_ORDER );
