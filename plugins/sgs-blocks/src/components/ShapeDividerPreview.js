/**
 * Editor-canvas twin of sgs_render_shape_divider(): the top or bottom shape
 * divider of any block routed through SGS_Container_Wrapper, from the block's
 * `shapeDivider{Top|Bottom}*` attributes. Same markup and classes as the front
 * end (`.sgs-shape-divider.sgs-shape-divider--{position}`, painted by
 * container/style.css), with the scoped height and colour the front end emits
 * applied inline (editor only).
 *
 * Usage, as a direct child of the block root:
 *   <ShapeDividerPreview attributes={ attributes } position="top" prefix="shapeDividerTop" />
 * `prefix` names the attribute family (`{prefix}`, `{prefix}Colour`,
 * `{prefix}ColourGradient`, `{prefix}Flip`, `{prefix}Invert`, `{prefix}Scale`);
 * it defaults to `shapeDividerTop` / `shapeDividerBottom` for the position.
 *
 * @package SGS\Blocks
 */

import { useSettings } from '@wordpress/block-editor';
import { useInstanceId } from '@wordpress/compose';
import {
	SHAPE_DIVIDER_PATHS,
	shapeDividerAxis,
	shapeDividerTile,
	shapeDividerHeight,
	shapeDividerGradient,
} from '../utils/shape-dividers';
import { SvgGradientDefs } from '../utils/svg-gradient-preview';
import { resolveColourToken } from './DesignTokenPicker';

/**
 * @param {Object} props
 * @param {Object} props.attributes Block attributes.
 * @param {string} props.position   'top' | 'bottom'.
 * @param {string} [props.prefix]   Attribute family prefix.
 * @return {?JSX.Element} The divider, or null when no shape is set.
 */
export default function ShapeDividerPreview( { attributes, position, prefix: givenPrefix = '' } ) {
	const [ palette ] = useSettings( 'color.palette' );
	const instanceId = useInstanceId( ShapeDividerPreview, 'sgs-sd-ed' );
	const prefix = givenPrefix || ( 'top' === position ? 'shapeDividerTop' : 'shapeDividerBottom' );
	const shape = attributes[ prefix ];
	const path = shape ? SHAPE_DIVIDER_PATHS[ shape ] : undefined;
	if ( ! path ) {
		return null;
	}

	const scale = attributes[ `${ prefix }Scale` ];
	const tile = shapeDividerTile( shapeDividerAxis( scale, 'x' ) );
	const gradient = shapeDividerGradient( attributes[ `${ prefix }ColourGradient` ] );
	const gradientId = `${ instanceId }-${ position }-grad`;
	const patternId = `${ instanceId }-${ position }-tile`;
	const fill = gradient ? `url(#${ gradientId })` : 'currentColor';

	const transforms = [];
	if ( attributes[ `${ prefix }Flip` ] ) {
		transforms.push( 'scaleX(-1)' );
	}
	if ( attributes[ `${ prefix }Invert` ] ) {
		transforms.push( 'scaleY(-1)' );
	}
	const pathProps = transforms.length ? { transform: transforms.join( ' ' ), transformOrigin: 'center' } : {};

	const style = { height: `${ shapeDividerHeight( shapeDividerAxis( scale, 'y' ) ) }px` };
	if ( ! gradient ) {
		const colour = resolveColourToken( attributes[ `${ prefix }Colour` ] ?? 'surface', palette );
		if ( colour ) {
			style.color = colour;
		}
	}

	return (
		<div className={ `sgs-shape-divider sgs-shape-divider--${ position }` } aria-hidden="true" style={ style }>
			<svg viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
				{ ( gradient || tile ) && (
					<defs>
						{ gradient && <SvgGradientDefs id={ gradientId } gradient={ gradient } /> }
						{ tile && (
							<pattern id={ patternId } x={ tile.originX } y="0" width={ tile.tileW } height="120" patternUnits="userSpaceOnUse">
								<g transform={ `scale(${ tile.tileScale } 1)` }>
									<path d={ path } fill={ fill } { ...pathProps } />
								</g>
							</pattern>
						) }
					</defs>
				) }
				{ tile ? (
					<rect x="0" y="0" width="1200" height="120" fill={ `url(#${ patternId })` } />
				) : (
					<path d={ path } fill={ fill } { ...pathProps } />
				) }
			</svg>
		</div>
	);
}
