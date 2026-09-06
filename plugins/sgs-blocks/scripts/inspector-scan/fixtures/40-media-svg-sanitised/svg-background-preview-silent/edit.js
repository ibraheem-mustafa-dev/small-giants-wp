// Fixture mirroring src/blocks/container/edit.js:16,213-222,472
// The svgBackgroundPreview() delegate pattern: SVG sanitisation happens
// INSIDE the helper, and the returned .markup is ALREADY SANITISED (per
// the helper's own docblock), so mounting { __html: svgPreview.markup }
// is safe and should NOT flag as unsanitised.
import { svgBackgroundPreview } from '../../utils';

export default function Edit( { attributes } ) {
	const svgPreview = svgBackgroundPreview( {
		bgSvgContent: attributes.bgSvgContent,
		bgSvgPosition: attributes.bgSvgPosition,
	} );

	return (
		<div>
			{ svgPreview.hasSvg && (
				<div
					className="sgs-container__svg-bg"
					aria-hidden="true"
					style={ { pointerEvents: 'none' } }
					dangerouslySetInnerHTML={ { __html: svgPreview.markup } }
				/>
			) }
		</div>
	);
}
