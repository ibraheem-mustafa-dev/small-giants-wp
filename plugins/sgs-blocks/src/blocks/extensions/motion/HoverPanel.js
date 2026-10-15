/**
 * The Hover panel (Spec 38A §5, §5.1; FR-38A-7, 12, 42): the simple layer (Hover state, Driven by, Intensity), Fine-tune
 * (the hover state's values, per-device values, one timing for the state change) and the hover effects list, for the
 * chosen target. It edits layers only through the shell's layer operations and re-stamps only through its confirmation,
 * so a preset or Intensity change names the customised fields it would replace before it replaces them.
 *
 * Colour and shadow values stay in the element colour panels; the state's one duration, delay and easing drive their
 * transition as well (`Sgs_Motion_Emitter::HOVER_PAINT` and `emit-scoped-css.js::HOVER_PAINT`).
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button, Notice, PanelBody } from '@wordpress/components';
import ChoiceAtom from '../../../components/motion/ChoiceAtom';
import IntensityPicker from '../../../components/motion/IntensityPicker';
import { ROOT_TARGET } from '../../../components/motion/TargetPicker';
import { registerMotionPanel } from './panel-slots';
import TargetRow from './layers/TargetRow';
import { RestampConfirm, useRestamp } from './layers/restamp';
import { hoverActions } from './hover/hover-actions';
import useDrivenBy, { hoverLayerRefs } from './hover/use-driven-by';
import { HOVER_GROUPS } from './hover/hover-fields';
import {
	SOURCE_OPTIONS,
	choiceFor,
	familyOf,
	hoverPresetChoices,
	intensityOf,
} from './hover/hover-write';
import HoverEffects from './hover/HoverEffects';
import HoverFineTune from './hover/HoverFineTune';
import FocusState, { focusAvailable } from './hover/FocusState';

const NONE = 'hover-none';

/**
 * @param {Object}           props
 * @param {string}           props.blockName The block's name.
 * @param {Object|null}      props.elements  The block's `supports.sgs.elements`.
 * @param {Object|undefined} props.motion    The block's motion value.
 * @param {Object}           props.layers    The `useMotionLayers` result.
 * @return {Element} The panel.
 */
export default function HoverPanel( { blockName, elements, motion, layers } ) {
	const [ target, setTarget ] = useState( ROOT_TARGET );
	const [ notice, setNotice ] = useState( null );
	const flow = useRestamp( layers );
	const drive = useDrivenBy( layers, target, setNotice );
	const actions = hoverActions( {
		layers,
		flow,
		target,
		report: setNotice,
		drive,
	} );
	const layer = actions.stateLayer();
	const choice = choiceFor( layer );
	const hoverRefs = hoverLayerRefs( layers, target );

	return (
		<PanelBody
			title={ __( 'Hover', 'sgs-blocks' ) }
			initialOpen={ false }
			className="sgs-motion-panel sgs-motion-panel--hover"
		>
			<TargetRow
				blockName={ blockName }
				elements={ elements }
				motion={ motion }
				panel="hover"
				value={ target }
				onChange={ ( next ) => {
					flow.cancel();
					setNotice( null );
					setTarget( next );
				} }
			/>
			<ChoiceAtom
				label={ __( 'Hover state', 'sgs-blocks' ) }
				help={ __(
					'Plays on devices that can hover, and for keyboard focus.',
					'sgs-blocks'
				) }
				options={ hoverPresetChoices().filter(
					( option ) => option.value !== NONE
				) }
				value={ choice === NONE ? '' : choice }
				emptyLabel={
					layer && ! layer.preset
						? __( 'Custom', 'sgs-blocks' )
						: __( 'None', 'sgs-blocks' )
				}
				onChange={ ( slug ) => actions.choosePreset( slug || NONE ) }
			/>
			{ hoverRefs.length > 0 && (
				<ChoiceAtom
					label={ __( 'Driven by', 'sgs-blocks' ) }
					options={ SOURCE_OPTIONS }
					value={ hoverRefs[ 0 ].layer.source ?? 'self' }
					onChange={ ( source ) =>
						actions.chooseSource( source || 'self' )
					}
				/>
			) }
			{ layer && (
				<IntensityPicker
					label={ __( 'Hover state intensity', 'sgs-blocks' ) }
					family={ familyOf( layer ) }
					value={ intensityOf( layer ) }
					values={ layer.values }
					customised={ layer.customised }
					onChange={ ( { intensity } ) =>
						actions.chooseIntensity( intensity )
					}
				/>
			) }
			<RestampConfirm
				pending={ flow.pending }
				confirm={ flow.confirm }
				cancel={ flow.cancel }
			/>
			{ notice && (
				<Notice
					status="warning"
					isDismissible
					onRemove={ () => setNotice( null ) }
				>
					{ notice }
				</Notice>
			) }
			<PanelBody
				title={ __( 'Fine-tune', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				{ layer ? (
					<>
						<HoverFineTune
							layer={ layer }
							defName="HoverStateValues"
							groups={ HOVER_GROUPS }
							onLayer={ actions.editState }
						/>
						<Button
							variant="tertiary"
							isDestructive
							onClick={ actions.removeState }
							__next40pxDefaultSize
						>
							{ __( 'Remove hover state', 'sgs-blocks' ) }
						</Button>
					</>
				) : (
					<p className="sgs-motion-atom__help">
						{ __(
							'Choose a Hover state to fine-tune its values.',
							'sgs-blocks'
						) }
					</p>
				) }
				<HoverEffects
					target={ target }
					layers={ layers }
					actions={ actions }
				/>
				{ focusAvailable( blockName ) && (
					<FocusState actions={ actions } />
				) }
			</PanelBody>
		</PanelBody>
	);
}

registerMotionPanel( 'hover', HoverPanel, 10 );
