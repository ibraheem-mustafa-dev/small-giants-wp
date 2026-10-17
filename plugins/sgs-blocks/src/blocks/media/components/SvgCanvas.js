/**
 * Media block canvas: SVG mode (placeholder when empty, otherwise the sanitised inline SVG).
 */
import { __ } from '@wordpress/i18n';
import { sanitiseSvg } from '../../../utils';

export default function SvgCanvas( { blockProps, inspectorControls, svgContent, mediaBoxClassName, mediaBoxStyle, mediaScopeClass, mediaElementStyle, alignMargins } ) {
	if ( ! svgContent ) {
		return (
			<div { ...blockProps }>
				{ inspectorControls }
				<div className="components-placeholder">
					<div className="components-placeholder__label">
						{ __(
							'SGS Media — SVG / Animation',
							'sgs-blocks'
						) }
					</div>
					<div className="components-placeholder__instructions">
						{ __(
							'Paste your SVG markup in the block settings panel.',
							'sgs-blocks'
						) }
					</div>
				</div>
			</div>
		);
	}

	// Editor preview: render SVG inline via dangerouslySetInnerHTML.
	// This is editor-only — the frontend uses the PHP-sanitised path (render.php).
	return (
		<figure
			{ ...blockProps }
			className={ [ blockProps.className, mediaBoxClassName ].filter( Boolean ).join( ' ' ) }
			style={ { ...blockProps.style, ...mediaBoxStyle } }
		>
			{ inspectorControls }
			{ /* eslint-disable-next-line react/no-danger */ }
			<div
				className={ [ 'sgs-media__svg', 'sgs-media-el', mediaScopeClass ].filter( Boolean ).join( ' ' ) }
				style={ { ...mediaElementStyle, ...alignMargins } }
				aria-hidden="true"
				dangerouslySetInnerHTML={ { __html: sanitiseSvg( svgContent ) } }
			/>
		</figure>
	);
}
