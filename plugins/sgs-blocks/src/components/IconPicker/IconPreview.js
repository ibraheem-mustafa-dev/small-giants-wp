/**
 * Renders a single icon by { source, name } — used for the picker trigger chip,
 * grid cells, and block editor canvas previews. Lucide / wp-icon SVGs are pulled
 * from the lazily-loaded JSON maps; emoji + dashicons need no async load.
 *
 * @package SGS\Blocks
 */

import { useState, useEffect } from '@wordpress/element';
import { loadLucide, loadWpIcons } from './icon-data';

/**
 * @param {Object} props
 * @param {string} props.source One of lucide | emoji | wp-icon | dashicon.
 * @param {string} props.name   Icon identifier (lucide/wp slug, dashicon slug, or emoji char).
 * @param {number} [props.size] Pixel size of the preview box. Default 24.
 */
export default function IconPreview( { source, name, size = 24 } ) {
	const [ svg, setSvg ] = useState( '' );

	useEffect( () => {
		let active = true;
		setSvg( '' );
		if ( 'lucide' === source && name ) {
			loadLucide()
				.then( ( { map } ) => active && setSvg( map[ name ] || '' ) )
				.catch( () => {} );
		} else if ( 'wp-icon' === source && name ) {
			loadWpIcons()
				.then( ( map ) => active && setSvg( map[ name ] || '' ) )
				.catch( () => {} );
		}
		return () => {
			active = false;
		};
	}, [ source, name ] );

	const box = {
		width: size,
		height: size,
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flex: '0 0 auto',
	};

	if ( 'emoji' === source ) {
		return (
			<span
				style={ { ...box, fontSize: Math.round( size * 0.9 ), lineHeight: 1 } }
				aria-hidden="true"
			>
				{ name || '⭐' }
			</span>
		);
	}

	if ( 'dashicon' === source ) {
		return (
			<span
				className={ `dashicons dashicons-${ name || 'star-filled' }` }
				style={ { ...box, fontSize: size, width: size, height: size } }
				aria-hidden="true"
			/>
		);
	}

	// lucide + wp-icon → inline SVG string.
	if ( svg ) {
		return (
			<span
				className="sgs-icon-preview__svg"
				style={ box }
				aria-hidden="true"
				// eslint-disable-next-line react/no-danger
				dangerouslySetInnerHTML={ { __html: svg } }
			/>
		);
	}

	// Loading / unknown — neutral placeholder dot.
	return (
		<span style={ box } aria-hidden="true">
			▢
		</span>
	);
}
