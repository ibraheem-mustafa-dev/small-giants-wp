/**
 * The glyph inside the sgs/icon editor canvas: the same element and classes render.php prints, so style.css
 * (loaded into the canvas) sizes and colours it exactly as on the page. Unlike the picker's IconPreview, the SVG
 * keeps no inline fill/stroke, so the Fill setting's stylesheet rule shows here too.
 *
 * @package SGS\Blocks
 */

import { useState, useEffect } from '@wordpress/element';
import { useInstanceId } from '@wordpress/compose';
import { loadLucide, loadWpIcons } from '../../components/IconPicker/icon-data';
import { sanitiseSvg, withSvgStrokeGradient } from '../../utils';
import { brandGlyph } from '../../utils/brand-registry';

/**
 * Which SVG the canvas draws, and from where.
 *
 * @param {Object}      attributes Block attributes.
 * @param {Object|null} glyphBrand Registry entry the glyph draws.
 * @param {boolean}     drawFixed  Draw the brand's fixed-colour mark.
 * @return {{svg?:string, lucide?:string, wpIcon?:string, stroke:boolean}} The glyph source.
 */
export function glyphSource( attributes, glyphBrand, drawFixed ) {
	const { iconSource, iconName, wpIconName, iconSvg } = attributes;
	if ( 'brand' === iconSource && glyphBrand ) {
		const mark = brandGlyph( glyphBrand, drawFixed );
		return mark.svg ? { svg: mark.svg, stroke: false } : { lucide: mark.lucide, stroke: true };
	}
	if ( 'wp-icon' === iconSource ) {
		return { wpIcon: wpIconName, stroke: true };
	}
	if ( 'custom' === iconSource ) {
		return { svg: iconSvg || '', stroke: true };
	}
	return { lucide: iconName || 'star', stroke: true };
}

/**
 * @param {Object}      props
 * @param {Object}      props.attributes Block attributes.
 * @param {Object|null} props.glyphBrand Registry entry the glyph draws.
 * @param {boolean}     props.drawFixed  Draw the brand's fixed-colour mark.
 * @param {string}      props.logoGradient A gradient logo's own gradient (colour mode logo only), '' for none.
 * @return {JSX.Element} The glyph element.
 */
export default function CanvasGlyph( { attributes, glyphBrand, drawFixed, logoGradient = '' } ) {
	const { iconSource, emojiChar, dashiconName, iconColourGradient } = attributes;
	const source = glyphSource( attributes, glyphBrand, drawFixed );
	const gradientId = useInstanceId( CanvasGlyph, 'sgs-icon-canvas-grad' );
	const [ loaded, setLoaded ] = useState( '' );

	useEffect( () => {
		let active = true;
		setLoaded( '' );
		if ( source.lucide ) {
			loadLucide()
				.then( ( { map } ) => active && setLoaded( map[ source.lucide ] || '' ) )
				.catch( () => {} );
		} else if ( source.wpIcon ) {
			loadWpIcons()
				.then( ( map ) => active && setLoaded( map[ source.wpIcon ] || '' ) )
				.catch( () => {} );
		}
		return () => {
			active = false;
		};
	}, [ source.lucide, source.wpIcon ] );

	if ( 'emoji' === iconSource ) {
		return (
			<span className="sgs-icon__emoji" aria-hidden="true">
				{ emojiChar || '⭐' }
			</span>
		);
	}
	if ( 'dashicon' === iconSource ) {
		return <span className={ `sgs-icon__dashicon dashicons dashicons-${ dashiconName || 'star-filled' }` } aria-hidden="true" />;
	}

	const raw = source.svg ?? loaded;
	const paintGradient = iconColourGradient || logoGradient;
	const svg = paintGradient && source.stroke && raw ? withSvgStrokeGradient( raw, paintGradient, `${ gradientId }` ) : raw;
	return (
		<span
			className="sgs-icon__svg"
			aria-hidden="true"
			// eslint-disable-next-line react/no-danger
			dangerouslySetInnerHTML={ { __html: sanitiseSvg( svg || '' ) } }
		/>
	);
}
