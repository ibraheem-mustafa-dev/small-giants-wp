/**
 * Connector line style for the editor canvas: mirrors includes/helpers-connector-line.php
 * (sgs_connector_line_decls) so the preview draws what the frontend prints.
 */

/**
 * @param {string} lineStyle 'solid' | 'dashed' | 'dotted' ('' or unknown is solid).
 * @return {string} A valid connector line style.
 */
export const connectorLineStyleOf = ( lineStyle ) =>
	'dashed' === lineStyle || 'dotted' === lineStyle ? lineStyle : 'solid';

/**
 * @param {string} lineStyle       Stored connectorLineStyle.
 * @param {string} axis            'horizontal' (border on top) or 'vertical' (border on the left).
 * @param {Object} paint           Resolved CSS values, each '' when unset.
 * @param {string} paint.colour
 * @param {string} paint.gradient
 * @param {string} paint.thickness
 * @return {Object} React style object (camelCase properties; empty values omitted).
 */
export function connectorLineStyleProps(
	lineStyle,
	axis,
	{ colour = '', gradient = '', thickness = '' } = {}
) {
	const style = connectorLineStyleOf( lineStyle );
	const horizontal = 'vertical' !== axis;
	const sizeProp = horizontal ? 'height' : 'width';
	const side = horizontal ? 'borderTop' : 'borderLeft';
	const out = {};
	if ( 'solid' === style ) {
		if ( colour ) {
			out.backgroundColor = colour;
		}
		if ( gradient ) {
			out.backgroundImage = gradient;
		}
		if ( thickness ) {
			out[ sizeProp ] = thickness;
		}
		return out;
	}
	out[ sizeProp ] = 0;
	out.background = 'none';
	out.borderStyle = style;
	if ( colour ) {
		out.borderColor = colour;
	}
	if ( thickness ) {
		out.borderWidth = 0;
		out[ `${ side }Width` ] = thickness;
	}
	return out;
}

/**
 * The same declarations as one CSS rule body, for a <style> element (a pseudo-element cannot take inline style).
 *
 * @param {string} lineStyle Stored connectorLineStyle.
 * @param {string} axis      'horizontal' or 'vertical'.
 * @param {Object} paint     Resolved CSS values: colour, gradient, thickness.
 * @return {string} Declarations joined with semicolons.
 */
export function connectorLineCss( lineStyle, axis, paint ) {
	return Object.entries( connectorLineStyleProps( lineStyle, axis, paint ) )
		.map(
			( [ prop, value ] ) =>
				`${ prop.replace(
					/[A-Z]/g,
					( c ) => `-${ c.toLowerCase() }`
				) }:${ value }`
		)
		.join( ';' );
}
