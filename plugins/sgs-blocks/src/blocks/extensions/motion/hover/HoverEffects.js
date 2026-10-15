/**
 * The hover effects of one target (Spec 38A §5.1): the ordered list with Add effect (only the effects valid for this
 * target), each effect's Intensity, Move and Remove. What drives the effects is the panel's one "Driven by". An
 * effect's own Fine-tune controls are the generic layer-controls renderer's (M3.6), so none is drawn here.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import IntensityPicker from '../../../../components/motion/IntensityPicker';
import LayerList from '../layers/LayerList';
import { LAYER_LISTS } from '../layers/layer-lists';
import { effectLabel } from '../layers/refusals';
import { EFFECTS_LIST } from './hover-actions';
import { familyOf, intensityOf } from './hover-write';

/**
 * @param {Object} props
 * @param {string} props.target  The chosen target.
 * @param {Object} props.layers  The `useMotionLayers` result.
 * @param {Object} props.actions The `hover-actions.js::hoverActions` result.
 * @return {Element} The list.
 */
export default function HoverEffects( { target, layers, actions } ) {
	const items = layers.layersOf( target, EFFECTS_LIST );
	const limit = LAYER_LISTS[ EFFECTS_LIST ].maxItems;
	return (
		<LayerList
			label={ __( 'Hover effects (in order)', 'sgs-blocks' ) }
			layers={ items }
			effects={ layers.effectsFor( target, EFFECTS_LIST ) }
			refusalFor={ ( effect ) =>
				layers.refusalFor( target, EFFECTS_LIST, effect )
			}
			onAdd={ actions.addEffect }
			onMove={ actions.moveEffect }
			onRemove={ actions.removeEffect }
			full={ limit !== null && items.length >= limit }
			renderControls={ ( layer ) => (
				<IntensityPicker
					label={ sprintf(
						/* translators: %s: the effect's name. */
						__( '%s intensity', 'sgs-blocks' ),
						effectLabel( layer.effect )
					) }
					family={ familyOf( layer ) }
					value={ intensityOf( layer ) }
					values={ layer.values }
					customised={ layer.customised }
					onChange={ ( { intensity } ) =>
						actions.chooseEffectIntensity( layer.id, intensity )
					}
				/>
			) }
		/>
	);
}
