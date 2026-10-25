/**
 * Floating layer — canvas twin of the positioned root rule render.php emits.
 *
 * Position, size, opacity, stacking and transform are read for the previewed tier (a narrower tier inherits from the
 * wider one, as the frontend's @media overrides do). `widthUnit` follows render.php: Fit the content ("auto") is
 * max-content capped at the parent and ignores the tiers; Percentage drops the cap; Fixed keeps the pixel width with
 * the percentage cap.
 */

import { resolveTier } from '../../utils/responsive';
import { sgsBorderPreview } from '../../utils/border-preview';
import { backgroundPaintPreview } from '../../utils/background-preview';
import { composeShadow } from '../../utils/shadow-layers';
import { css as boxShapeCss } from '../../components/media/atoms/box-shape';

/**
 * @param {Object}  attributes Block attributes.
 * @param {string}  tier       Previewed tier: 'desktop' | 'tablet' | 'mobile'.
 * @param {boolean} hasContent Whether the layer holds inner blocks; the canvas layer is always interactive so the empty layer's appender stays clickable.
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
		pointerEvents: 'auto',
		transform: [
			'translate(-50%, -50%)',
			Number( degrees ) !== 0 && `rotate(${ degrees }deg)`,
			flipX && 'scaleX(-1)',
		]
			.filter( Boolean )
			.join( ' ' ),
	};
}

/**
 * The box the layer paints itself, as the canvas twin of what render.php adds to the root rule: border
 * (width, style, colour, radius), fill, shadow and height, each for the previewed tier. A value left
 * unset adds nothing.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier: 'desktop' | 'tablet' | 'mobile'.
 * @param {Array}  [palette]  Theme colour palette.
 * @return {Object} React style fragment; {} when nothing is set.
 */
export function layerBoxPreview( attributes, tier, palette ) {
	const {
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		borderRadius,
		backgroundColour,
		backgroundColourGradient,
		boxShadow,
		boxShadowColour,
		height,
	} = attributes;

	const style = {
		...sgsBorderPreview(
			{
				widthValues: borderWidth,
				styleValue: borderStyle,
				colourValue: borderColour,
				colourGradientValue: borderColourGradient,
				radiusValues: borderRadius,
			},
			tier,
			palette
		),
		...backgroundPaintPreview( backgroundColour, backgroundColourGradient, palette ),
	};

	const shadow = composeShadow( boxShadow || '', boxShadowColour || '' );
	if ( shadow ) {
		style.boxShadow = shadow;
	}

	// The shape's clip-path comes from the box-shape atom's own emitter, the way the hero canvas reads it.
	const clip = boxShapeCss( { attributes, prefix: '', blockSlug: 'sgs/decorative-image' } )
		.find( ( decl ) => decl.startsWith( '--sgs-media-clip-path:' ) );
	if ( clip ) {
		style.clipPath = clip.slice( clip.indexOf( ':' ) + 1 );
	}

	const tierHeight = resolveTier( height, tier, '' ).value;
	if ( tierHeight ) {
		style.height = tierHeight;
	}

	return style;
}
