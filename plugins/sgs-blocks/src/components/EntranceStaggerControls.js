/**
 * EntranceStaggerControls — when an entrance starts and how blocks cascade.
 *
 * Rendered by src/blocks/extensions/animation.js under AnimationControl in
 * every block's Animation panel. Five string attributes, each empty for the
 * default and written to the page as data attributes that
 * assets/js/animation-entrance-timing.js reads:
 *
 *   sgsAnimationStart           "Start when": '' = the block scrolls into view,
 *                               'load' = the page loads (whatever the position).
 *   sgsAnimationTrigger         Scroll start line (% of screen height above its
 *                               bottom edge, 0-50; empty = 6).
 *   sgsAnimationStagger         This block's own stagger step (ms) against
 *                               matching animated blocks beside it — reaches
 *                               cards in a repeated list (a product template).
 *   sgsAnimationStaggerChildren A parent's stagger step (ms) for the animated
 *                               blocks inside it; shown on blocks with inner
 *                               blocks, whether or not they animate themselves.
 *   sgsAnimationStaggerMax      Where the stagger stops growing (items, 1-50;
 *                               empty = 7).
 *
 * Bounds mirror includes/animation-stagger.php, which clamps again at render.
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { SelectControl } from '@wordpress/components';
import { NumberControl } from './primitives';

/**
 * Store a number field's value as a clamped whole-number string, or '' when cleared.
 *
 * @param {string|number} value Raw input.
 * @param {number}        min   Lowest value.
 * @param {number}        max   Highest value.
 * @return {string} '' or a clamped integer string.
 */
function toAttr( value, min, max ) {
	if ( '' === value || null === value || undefined === value ) {
		return '';
	}
	const num = Number( value );
	if ( ! Number.isFinite( num ) ) {
		return '';
	}
	return String( Math.max( min, Math.min( max, Math.round( num ) ) ) );
}

export default function EntranceStaggerControls( {
	attributes,
	setAttributes,
	clientId,
	hasAnimation,
} ) {
	const hasInnerBlocks = useSelect(
		( select ) => select( blockEditorStore ).getBlockCount( clientId ) > 0,
		[ clientId ]
	);
	const {
		sgsAnimationStart,
		sgsAnimationTrigger,
		sgsAnimationStagger,
		sgsAnimationStaggerChildren,
		sgsAnimationStaggerMax,
	} = attributes;

	const staggers = !! sgsAnimationStagger || !! sgsAnimationStaggerChildren;

	return (
		<>
			{ hasAnimation && (
				<>
					<SelectControl
						label={ __( 'Start when', 'sgs-blocks' ) }
						help={ __( 'Page loads plays the entrance as the page opens, even for a block below the first screen. Block scrolls into view waits until the visitor reaches it.', 'sgs-blocks' ) }
						value={ 'load' === sgsAnimationStart ? 'load' : '' }
						options={ [
							{ label: __( 'Block scrolls into view', 'sgs-blocks' ), value: '' },
							{ label: __( 'Page loads', 'sgs-blocks' ), value: 'load' },
						] }
						onChange={ ( val ) => setAttributes( { sgsAnimationStart: 'load' === val ? 'load' : '' } ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					{ 'load' !== sgsAnimationStart && (
					<NumberControl
						label={ __( 'Scroll line (% up from the screen bottom)', 'sgs-blocks' ) }
						help={ __( 'The entrance starts once the block passes a line this far above the bottom of the screen. Empty uses 6%.', 'sgs-blocks' ) }
						value={ sgsAnimationTrigger || '' }
						placeholder="6"
						min={ 0 }
						max={ 50 }
						onChange={ ( val ) => setAttributes( { sgsAnimationTrigger: toAttr( val, 0, 50 ) } ) }
						__next40pxDefaultSize
					/>
					) }
					<NumberControl
						label={ __( 'Stagger with matching blocks beside it (ms)', 'sgs-blocks' ) }
						help={ __( 'Each matching animated block beside this one starts this much later than the one before. Set it on the card of a repeated list (a product or post template). Overrides the parent’s “Stagger the blocks inside”.', 'sgs-blocks' ) }
						value={ sgsAnimationStagger || '' }
						min={ 0 }
						max={ 1000 }
						onChange={ ( val ) => setAttributes( { sgsAnimationStagger: toAttr( val, 0, 1000 ) } ) }
						__next40pxDefaultSize
					/>
				</>
			) }
			{ hasInnerBlocks && (
				<NumberControl
					label={ __( 'Stagger the blocks inside (ms)', 'sgs-blocks' ) }
					help={ __( 'Each animated block inside starts this much later than the one before, in page order.', 'sgs-blocks' ) }
					value={ sgsAnimationStaggerChildren || '' }
					min={ 0 }
					max={ 1000 }
					onChange={ ( val ) => setAttributes( { sgsAnimationStaggerChildren: toAttr( val, 0, 1000 ) } ) }
					__next40pxDefaultSize
				/>
			) }
			{ staggers && (
				<NumberControl
					label={ __( 'Stop staggering after (items)', 'sgs-blocks' ) }
					help={ __( 'Blocks past this position start with the last one’s delay. Empty uses 7.', 'sgs-blocks' ) }
					value={ sgsAnimationStaggerMax || '' }
					placeholder="7"
					min={ 1 }
					max={ 50 }
					onChange={ ( val ) => setAttributes( { sgsAnimationStaggerMax: toAttr( val, 1, 50 ) } ) }
					__next40pxDefaultSize
				/>
			) }
		</>
	);
}
