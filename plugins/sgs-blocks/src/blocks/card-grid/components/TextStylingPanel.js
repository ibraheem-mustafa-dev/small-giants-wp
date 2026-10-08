/**
 * Card Grid — Text Styling panel: the typography targets for title, subtitle, page buttons, fallback initial, badge and no-photo label.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { TypographyControls } from '../../../components';

export default function TextStylingPanel( { attributes, setAttributes, isCptCollectionMode } ) {
	const {
		imageFallback,
		noImageLabel,
	} = attributes;

	return (
				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
					 * Multi-target switcher (2026-09-05) — title + subtitle share
					 * ONE full control set at a time instead of stacking two,
					 * proving the shared TypographyControls `targets` API against
					 * a real 2-target block. `card-grid` was picked over
					 * `sgs/testimonial` because testimonial's quote/summary are
					 * NOT actually on this shared component yet (flat legacy
					 * string attrs + hand-rolled controls) — migrating them was
					 * out of scope for this task; title/subtitle here are
					 * genuinely object-typed + already rendered via
					 * sgs_typography_css_rule(), so this is a real, clean case.
					 */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{
								key: 'title',
								label: __( 'Title', 'sgs-blocks' ),
								prefix: 'title',
								showWeight: true,
								showStyle: true,
								showLineHeight: true,
								showFontFamily: true,
								showLetterSpacing: true,
								showTransform: true,
							},
							{
								key: 'subtitle',
								label: __( 'Subtitle', 'sgs-blocks' ),
								prefix: 'subtitle',
								showWeight: true,
								showStyle: true,
								showLineHeight: true,
								showFontFamily: true,
								showLetterSpacing: true,
								showTransform: true,
							},
							// Page buttons exist only in collection mode, where the
							// canvas is render.php's own output (ServerSideRender).
							...( isCptCollectionMode ? [ {
								key: 'pageButton',
								label: __( 'Page buttons', 'sgs-blocks' ),
								prefix: 'pageButton',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							} ] : [] ),
							{
								key: 'glyphInitial',
								label: __( 'Fallback initial letter', 'sgs-blocks' ),
								prefix: 'glyphInitial',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
							{
								key: 'badge',
								label: __( 'Badge', 'sgs-blocks' ),
								prefix: 'badge',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextAlign: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
							imageFallback && noImageLabel && {
								key: 'noImageLabel',
								label: __( 'No-photo label', 'sgs-blocks' ),
								prefix: 'noImageLabel',
								showStyle: false,
								showLineHeight: false,
								showLetterSpacing: true,
								showTransform: true,
							},
						].filter( Boolean ) }
					/>
				</PanelBody>
	);
}
