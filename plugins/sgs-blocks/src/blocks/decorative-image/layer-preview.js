/**
 * Floating layer — canvas twin of the positioned root rule render.php emits.
 *
 * Position, size, opacity, stacking and transform are read for the previewed tier (a narrower tier inherits from the
 * wider one, as the frontend's @media overrides do). `widthUnit` follows render.php: Fit the content ("auto") is
 * max-content capped at the parent (or at the max width) and ignores the tiers; Percentage and Fixed take the max width
 * for the previewed tier when one is set, none otherwise. An axis with an edge offset set is placed by its edges instead of its centre (`layerEdges`).
 */

import { resolveTier } from '../../utils/responsive';
import { cssLengthValue } from '../../utils/css-length';
import { sgsBorderPreview } from '../../utils/border-preview';
import { backgroundPaintPreview } from '../../utils/background-preview';
import { composeShadow } from '../../utils/shadow-layers';
import { css as boxShapeCss } from '../../components/media/atoms/box-shape';

const EDGES = {
	top: 'positionTop',
	right: 'positionRight',
	bottom: 'positionBottom',
	left: 'positionLeft',
};
const TIERS = [ 'desktop', 'tablet', 'mobile' ];

/**
 * The layer's edge anchoring, the canvas twin of includes/helpers-layer-edges.php::sgs_layer_edges: an axis whose edge
 * holds a value at any tier is anchored to its edges at every tier; `offsets` are the edges the previewed tier sets (a
 * narrower tier inheriting from the wider one, as the frontend's @media rules do).
 *
 * @param {Object} attributes Block attributes (positionTop, positionRight, positionBottom, positionLeft).
 * @param {string} tier       Previewed tier.
 * @return {{x: boolean, y: boolean, offsets: Object}} Anchoring per axis and the React style offsets.
 */
export function layerEdges( attributes, tier ) {
	const out = { x: false, y: false, offsets: {} };
	for ( const [ property, attr ] of Object.entries( EDGES ) ) {
		const tiers = attributes[ attr ] || {};
		if (
			TIERS.some( ( t ) => '' !== cssLengthValue( tiers[ t ] ?? '' ) )
		) {
			out[
				'left' === property || 'right' === property ? 'x' : 'y'
			] = true;
		}
		const value = cssLengthValue(
			resolveTier( tiers, tier, '' ).value ?? ''
		);
		if ( '' !== value ) {
			out.offsets[ property ] = value;
		}
	}
	return out;
}

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
		maxWidth,
		rotation,
		opacity,
		zIndex,
		flipX,
		overflow,
	} = attributes;

	const edges = layerEdges( attributes, tier );
	let centring = 'translate(-50%, -50%)';
	if ( edges.x && edges.y ) {
		centring = '';
	} else if ( edges.x ) {
		centring = 'translateY(-50%)';
	} else if ( edges.y ) {
		centring = 'translateX(-50%)';
	}
	const x = resolveTier( positionX, tier, 50 ).value;
	const y = resolveTier( positionY, tier, 50 ).value;
	const degrees = resolveTier( rotation, tier, 0 ).value;
	const tierWidth = resolveTier( width, tier, 200 ).value;

	const cap = cssLengthValue( resolveTier( maxWidth, tier, '' ).value ?? '' );
	const size = {};
	if ( 'auto' === widthUnit ) {
		size.width = 'max-content';
		size.maxWidth = cap || '100%';
	} else {
		size.width = `${ tierWidth }${ '%' === widthUnit ? '%' : 'px' }`;
		if ( cap ) {
			size.maxWidth = cap;
		}
	}

	return {
		position: 'absolute',
		...( edges.x ? {} : { left: `${ x }%` } ),
		...( edges.y ? {} : { top: `${ y }%` } ),
		...edges.offsets,
		...size,
		opacity: ( opacity ?? 100 ) / 100,
		zIndex: zIndex ?? 1,
		overflow: overflow ?? 'visible',
		pointerEvents: 'auto',
		transform:
			[
				centring,
				Number( degrees ) !== 0 && `rotate(${ degrees }deg)`,
				flipX && 'scaleX(-1)',
			]
				.filter( Boolean )
				.join( ' ' ) || 'none',
	};
}

const BORDER_SIDES = [ 'top', 'right', 'bottom', 'left' ];
const BORDER_TIERS = [ 'desktop', 'tablet', 'mobile' ];

/**
 * Whether a border width attribute sets any side at any tier (a flat box or a tier object of boxes).
 *
 * @param {*} widthValues The `borderWidth` attribute.
 * @return {boolean} True when a side holds a value.
 */
function hasBorderWidth( widthValues ) {
	if ( ! widthValues || 'object' !== typeof widthValues ) {
		return false;
	}
	const tiered = BORDER_TIERS.some( ( t ) => null != widthValues[ t ] );
	const boxes = tiered
		? BORDER_TIERS.map( ( t ) => widthValues[ t ] )
		: [ widthValues ];
	return boxes.some(
		( box ) =>
			box &&
			'object' === typeof box &&
			BORDER_SIDES.some(
				( side ) =>
					[ 'string', 'number' ].includes( typeof box[ side ] ) &&
					'' !== String( box[ side ] ).trim()
			)
	);
}

/**
 * Whether an empty layer (no media, no inner blocks) draws anything: a border width at any tier, a gradient ring, a
 * resting shadow or a fill. A height, radius, shape or hover shadow alone draws nothing, and a border style of none
 * draws no border or ring. The twin of render.php's `$sgs_di_paints_box`; tests/fixtures/decorative-image-paints-box.json
 * is the table both are tested against.
 *
 * @param {Object} attributes Block attributes.
 * @param {Array}  [palette]  Theme colour palette.
 * @return {boolean} True when render.php would print the layer.
 */
export function layerPaintsBox( attributes, palette ) {
	const {
		borderWidth,
		borderStyle,
		borderColourGradient,
		backgroundColour,
		backgroundColourGradient,
		boxShadow,
		boxShadowColour,
	} = attributes;
	const bordered =
		'none' !==
			String( borderStyle || '' )
				.trim()
				.toLowerCase() &&
		( hasBorderWidth( borderWidth ) ||
			'' !== String( borderColourGradient || '' ).trim() );
	const shadow = composeShadow( boxShadow || '', boxShadowColour || '' );
	const filled =
		Object.keys(
			backgroundPaintPreview(
				backgroundColour,
				backgroundColourGradient,
				palette
			)
		).length > 0;
	return bordered || ( '' !== shadow && 'none' !== shadow ) || filled;
}

/**
 * The box the layer paints itself, as the canvas twin of what render.php adds to the root rule: border
 * (width, style, colour, radius), fill, shadow and height, each for the previewed tier. A value left
 * unset adds nothing. A layer with no media and no content (`shapeOnly`) previews a box only when
 * `layerPaintsBox()` says render.php would draw one, so the canvas never shows a layer the page omits.
 *
 * @param {Object}  attributes        Block attributes.
 * @param {string}  tier              Previewed tier: 'desktop' | 'tablet' | 'mobile'.
 * @param {Array}   [palette]         Theme colour palette.
 * @param {boolean} [shapeOnly=false] The layer holds no media and no inner blocks.
 * @return {Object} React style fragment; {} when nothing is set.
 */
export function layerBoxPreview(
	attributes,
	tier,
	palette,
	shapeOnly = false
) {
	if ( shapeOnly && ! layerPaintsBox( attributes, palette ) ) {
		return {};
	}
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
		...backgroundPaintPreview(
			backgroundColour,
			backgroundColourGradient,
			palette
		),
	};

	const shadow = composeShadow( boxShadow || '', boxShadowColour || '' );
	if ( shadow ) {
		style.boxShadow = shadow;
	}

	// The shape's clip-path comes from the box-shape atom's own emitter, the way the hero canvas reads it.
	const clip = boxShapeCss( {
		attributes,
		prefix: '',
		blockSlug: 'sgs/decorative-image',
	} ).find( ( decl ) => decl.startsWith( '--sgs-media-clip-path:' ) );
	if ( clip ) {
		style.clipPath = clip.slice( clip.indexOf( ':' ) + 1 );
	}

	const tierHeight = resolveTier( height, tier, '' ).value;
	if ( tierHeight ) {
		style.height = tierHeight;
	}

	return style;
}
