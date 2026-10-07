/**
 * Measured diagram — the editor canvas's mirror of render.php's scoped CSS.
 *
 * The canvas renders the same markup and class names as the page, so the two
 * stylesheets do the painting; this module adds only what render.php adds per
 * instance (ratio, max width, label mode, line/extension paint and width,
 * label colours, typography and gap), scoped to the block's own canvas node.
 *
 * @package SGS\Blocks
 */
import { colourVar, parseSvgGradient, resolveTier, typographyPreviewCss } from '../../utils';
import { fmt } from '../../utils/diagram-geometry';

/** A value that could break out of a declaration never reaches the canvas CSS. */
const BREAKOUT = /[{};<>]|\/\*/;

/**
 * Read a length the way sgs_measured_diagram_length() does: a bare number is px.
 *
 * @param {*} raw Stored value.
 * @return {string} CSS length or ''.
 */
function length( raw ) {
	if ( raw === null || raw === undefined || raw === '' || 'object' === typeof raw ) {
		return '';
	}
	if ( Number.isFinite( Number( raw ) ) ) {
		return `${ Number( raw ) }px`;
	}
	const value = String( raw ).trim();
	return BREAKOUT.test( value ) ? '' : value;
}

/**
 * A palette slug or raw colour as a CSS value, or '' when unsafe.
 *
 * @param {string} raw Stored colour.
 * @return {string} CSS colour or ''.
 */
function colour( raw ) {
	const value = raw ? colourVar( raw ) : '';
	return value && ! BREAKOUT.test( value ) ? value : '';
}

/**
 * Text paint for one label part: a flat colour, or a clipped gradient.
 *
 * @param {string} flat     Flat colour attribute.
 * @param {string} gradient Gradient attribute.
 * @return {string} Declarations without braces.
 */
function textPaint( flat, gradient ) {
	if ( gradient && /^(linear|radial)-gradient\(/i.test( gradient ) && ! BREAKOUT.test( gradient ) ) {
		return `background-image:${ gradient };-webkit-background-clip:text;background-clip:text;color:transparent;`;
	}
	const value = colour( flat );
	return value ? `color:${ value };` : '';
}

/**
 * Dash declarations for the guide lines (twin of sgs_measured_diagram_dash_decls()).
 *
 * @param {string} style 'solid' | 'dashed' | 'dotted'.
 * @param {string} width A CSS length.
 * @return {string} Declarations without braces.
 */
function dash( style, width ) {
	if ( 'dashed' === style ) {
		return `stroke-dasharray:calc(${ width } * 4) calc(${ width } * 3);stroke-linecap:butt;`;
	}
	if ( 'dotted' === style ) {
		return `stroke-dasharray:0 calc(${ width } * 2.5);stroke-linecap:round;`;
	}
	return 'stroke-dasharray:none;';
}

const MODE_VARS = {
	numbered:
		'--sgs-measured-diagram-label-position:static;--sgs-measured-diagram-label-transform:none;--sgs-measured-diagram-marker-display:flex;--sgs-measured-diagram-number-display:inline-flex;--sgs-measured-diagram-numbered:1;',
	onDrawing:
		'--sgs-measured-diagram-label-position:absolute;--sgs-measured-diagram-label-transform:initial;--sgs-measured-diagram-marker-display:none;--sgs-measured-diagram-number-display:none;--sgs-measured-diagram-numbered:0;',
};

/**
 * A gradient id unique to this canvas node.
 *
 * @param {string} clientId Block client id.
 * @param {string} role     'line' | 'extension'.
 * @return {string} DOM id.
 */
export function gradientId( clientId, role ) {
	return `sgs-md-${ String( clientId ).replace( /[^a-zA-Z0-9-]/g, '' ) }-${ role }`;
}

/**
 * A stroke gradient re-anchored to the drawing's user space (twin of
 * sgs_measured_diagram_user_space_gradient()): a horizontal or vertical line
 * has a zero-height or zero-width bounding box, which ignores a bounding-box
 * gradient, so the def is expressed in viewBox units instead.
 *
 * @param {string} gradientCss Gradient attribute.
 * @param {number} width       Drawing width.
 * @param {number} height      Drawing height.
 * @return {?Object} Parsed gradient with user-space coordinates, or null.
 */
export function userSpaceGradient( gradientCss, width, height ) {
	const parsed = parseSvgGradient( gradientCss );
	if ( ! parsed ) {
		return null;
	}
	if ( 'linear' === parsed.type ) {
		return {
			...parsed,
			x1: fmt( parsed.x1 * width ),
			y1: fmt( parsed.y1 * height ),
			x2: fmt( parsed.x2 * width ),
			y2: fmt( parsed.y2 * height ),
		};
	}
	return parsed;
}

/**
 * The canvas twin of the frontend's user-space gradient def.
 *
 * @param {Object}  props
 * @param {string}  props.id       DOM id.
 * @param {?Object} props.gradient userSpaceGradient() result.
 * @return {?Element} The gradient element, or null.
 */
export function UserSpaceGradientDef( { id, gradient } ) {
	if ( ! gradient ) {
		return null;
	}
	const stops = gradient.stops.map( ( stop, i ) => (
		<stop key={ i } offset={ `${ stop.offset }%` } stopColor={ stop.colour } />
	) );
	if ( 'radial' === gradient.type ) {
		return (
			<radialGradient id={ id } gradientUnits="userSpaceOnUse" cx={ `${ gradient.cx }%` } cy={ `${ gradient.cy }%` } r={ `${ gradient.r }%` }>
				{ stops }
			</radialGradient>
		);
	}
	return (
		<linearGradient id={ id } gradientUnits="userSpaceOnUse" x1={ gradient.x1 } y1={ gradient.y1 } x2={ gradient.x2 } y2={ gradient.y2 }>
			{ stops }
		</linearGradient>
	);
}

/**
 * Build the canvas CSS for one diagram.
 *
 * @param {Object} args
 * @param {Object} args.attributes Parent attributes.
 * @param {string} args.clientId   Block client id.
 * @param {string} args.tier       Preview tier.
 * @param {number} args.width      Drawing width.
 * @param {number} args.height     Drawing height.
 * @return {string} CSS text.
 */
export function diagramPreviewCss( { attributes, clientId, tier, width, height } ) {
	const scope = `#block-${ clientId }`;
	const rules = [ `${ scope }{--sgs-measured-diagram-ratio:${ fmt( width ) } / ${ fmt( height ) };}` ];

	const maxWidth = length( resolveTier( attributes.maxWidth, tier, '' ).value );
	if ( maxWidth ) {
		rules.push( `${ scope }{max-width:${ maxWidth };}` );
	}

	const mode = resolveTier( attributes.labelMode, tier, 'onDrawing' ).value;
	if ( MODE_VARS[ mode ] ) {
		rules.push( `${ scope }{${ MODE_VARS[ mode ] }}` );
	}

	const lineSel = `${ scope } .sgs-diagram-dimension__line,${ scope } .sgs-diagram-dimension__ends`;
	if ( parseSvgGradient( attributes.lineColourGradient ) ) {
		const id = gradientId( clientId, 'line' );
		rules.push( `${ lineSel }{stroke:url(#${ id });}${ scope } .sgs-diagram-dimension__dot{fill:url(#${ id });}` );
	} else if ( colour( attributes.lineColour ) ) {
		const value = colour( attributes.lineColour );
		rules.push( `${ lineSel }{stroke:${ value };}${ scope } .sgs-diagram-dimension__dot{fill:${ value };}` );
	}
	const lineWidth = length( attributes.lineWidth );
	if ( lineWidth ) {
		rules.push( `${ lineSel }{stroke-width:${ lineWidth };}` );
	}

	const guideSel = `${ scope } .sgs-diagram-dimension__guides`;
	if ( parseSvgGradient( attributes.extensionColourGradient ) ) {
		rules.push( `${ guideSel }{stroke:url(#${ gradientId( clientId, 'extension' ) });}` );
	} else if ( colour( attributes.extensionColour ) ) {
		rules.push( `${ guideSel }{stroke:${ colour( attributes.extensionColour ) };}` );
	}
	const extensionWidth = length( attributes.extensionWidth );
	if ( extensionWidth ) {
		rules.push( `${ guideSel }{stroke-width:${ extensionWidth };${ dash( attributes.extensionStyle, extensionWidth ) }}` );
	}

	const valuePaint = textPaint( attributes.valueColour, attributes.valueColourGradient );
	if ( valuePaint ) {
		rules.push( `${ scope } .sgs-diagram-dimension__value{${ valuePaint }}` );
		if ( 0 === valuePaint.indexOf( 'color:' ) ) {
			rules.push( `${ scope } .sgs-diagram-dimension__marker,${ scope } .sgs-diagram-dimension__number{${ valuePaint }}` );
		}
	}
	const captionPaint = textPaint( attributes.captionColour, attributes.captionColourGradient );
	if ( captionPaint ) {
		rules.push( `${ scope } .sgs-diagram-dimension__caption{${ captionPaint }}` );
	}

	rules.push( typographyPreviewCss( attributes, 'value', `${ scope } .sgs-diagram-dimension__value`, tier ) );
	rules.push( typographyPreviewCss( attributes, 'caption', `${ scope } .sgs-diagram-dimension__caption`, tier ) );

	const gap = length( resolveTier( attributes.labelGap, tier, '' ).value );
	if ( gap ) {
		rules.push( `${ scope } .sgs-diagram-dimension__label{gap:${ gap };}` );
	}

	return rules.filter( Boolean ).join( '' );
}
