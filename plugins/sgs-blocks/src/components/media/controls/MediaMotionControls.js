/**
 * MediaMotionControls — shared bare-row control set for the `motion` atom
 * (ken-burns zoom / parallax drift for a media element, mutually exclusive).
 *
 * Mirrors `sgs/hero`'s split-media motion pair (`mediaKenBurns`/
 * `mediaParallax`/`mediaAnimationDuration`, `hero/edit.js` ~845-869) and
 * `sgs/container`'s background pair (`bgKenBurns`/`bgParallax`/
 * `bgAnimationDuration`) — same client-facing question re-expressed as a
 * generic atom, so a new block adopting `motion` gets the identical
 * capability container already proved out on both surfaces, without
 * duplicating markup. Copy re-worded to apply to "this media element" rather
 * than "the split media" specifically, since this atom is not hero-scoped.
 *
 * Bare rows only — mounts no `InspectorControls`/`PanelBody`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, ToggleControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {boolean}  props.kenBurns
 * @param {Function} props.onKenBurnsChange
 * @param {boolean}  props.parallax
 * @param {Function} props.onParallaxChange
 * @param {number}   props.duration
 * @param {Function} props.onDurationChange
 * @param {boolean}  [props.durationDisabled]  True when ken-burns is off.
 * @param {string}   [props.durationHiddenReason]
 */
export default function MediaMotionControls( {
	kenBurns,
	onKenBurnsChange,
	parallax,
	onParallaxChange,
	duration,
	onDurationChange,
	durationDisabled = false,
	durationHiddenReason = '',
} ) {
	return (
		<>
			<p className="components-base-control__help">
				{ __( 'Ken-burns and parallax are mutually exclusive — turning one on clears the other.', 'sgs-blocks' ) }
			</p>
			<ToggleControl
				label={ __( 'Ken-burns zoom', 'sgs-blocks' ) }
				help={ __( 'Slow zoom animation on this media element.', 'sgs-blocks' ) }
				checked={ !! kenBurns }
				onChange={ onKenBurnsChange }
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Parallax scroll', 'sgs-blocks' ) }
				help={ __( 'This media drifts gently as the visitor scrolls, for a subtle sense of depth.', 'sgs-blocks' ) }
				checked={ !! parallax }
				onChange={ onParallaxChange }
				__nextHasNoMarginBottom
			/>
			{ !! kenBurns && (
				<div aria-disabled={ durationDisabled }>
					<RangeControl
						label={ __( 'Animation duration (seconds)', 'sgs-blocks' ) }
						value={ 'number' === typeof duration ? duration : 20 }
						onChange={ onDurationChange }
						min={ 5 }
						max={ 60 }
						step={ 1 }
						disabled={ durationDisabled }
						help={ durationDisabled ? durationHiddenReason : undefined }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</div>
			) }
		</>
	);
}
