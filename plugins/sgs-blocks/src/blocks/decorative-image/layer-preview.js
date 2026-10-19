/**
 * Floating layer — canvas twin of the positioned root rule render.php emits.
 *
 * Position, size, opacity, stacking and transform are read for the previewed tier (a narrower tier inherits from the
 * wider one, as the frontend's @media overrides do). `widthUnit` follows render.php: Fit the content ("auto") is
 * max-content capped at the parent and ignores the tiers; Percentage drops the cap; Fixed keeps the pixel width with
 * the percentage cap.
 */

import { resolveTier } from '../../utils/responsive';

/**
 * @param {Object}  attributes Block attributes.
 * @param {string}  tier       Previewed tier: 'desktop' | 'tablet' | 'mobile'.
 * @param {boolean} hasContent Whether the layer holds inner blocks (they need pointer events in the canvas).
 * @return {Object} React style object for the positioned element.
 */
export function layerPreviewStyle( attributes, tier, hasContent ) {
	const {
		positionX,
		positionY,
		width,
		widthUnit,
		maxWidthPercent,
		rotation,
		opacity,
		zIndex,
		flipX,
		overflow,
	} = attributes;

	const x = resolveTier( positionX, tier, 50 ).value;
	const y = resolveTier( positionY, tier, 50 ).value;
	const degrees = resolveTier( rotation, tier, 0 ).value;
	const tierWidth = resolveTier( width, tier, 200 ).value;

	const size = {};
	if ( 'auto' === widthUnit ) {
		size.width = 'max-content';
		size.maxWidth = '100%';
	} else if ( '%' === widthUnit ) {
		size.width = `${ tierWidth }%`;
	} else {
		size.width = `${ tierWidth }px`;
		size.maxWidth = `${ maxWidthPercent ?? 20 }%`;
	}

	return {
		position: 'absolute',
		left: `${ x }%`,
		top: `${ y }%`,
		...size,
		opacity: ( opacity ?? 100 ) / 100,
		zIndex: zIndex ?? 1,
		overflow: overflow ?? 'visible',
		pointerEvents: hasContent ? 'auto' : 'none',
		transform: [
			'translate(-50%, -50%)',
			Number( degrees ) !== 0 && `rotate(${ degrees }deg)`,
			flipX && 'scaleX(-1)',
		]
			.filter( Boolean )
			.join( ' ' ),
	};
}
