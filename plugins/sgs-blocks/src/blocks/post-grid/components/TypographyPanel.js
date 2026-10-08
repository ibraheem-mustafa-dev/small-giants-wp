/**
 * Post Grid — Typography inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { TypographyControls } from '../../../components';

export default function TypographyPanel( { attributes, setAttributes } ) {
	return (
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* One switcher: every text element of a card, the numbered page
					     buttons and the Load more button. The page buttons and Load more
					     are built outside the editor canvas (PHP pagination, view.js), so
					     only the card text elements have a canvas preview. */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						targets={ [
							{
								key: 'title',
								label: __( 'Title', 'sgs-blocks' ),
								prefix: 'title',
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
							},
							{
								key: 'loadMore',
								label: __( 'Load more button', 'sgs-blocks' ),
								prefix: 'loadMore',
								fontSizePresets: true,
								showFontFamily: true,
								showDecoration: true,
								showTransform: true,
								showLetterSpacing: true,
								showTextWrap: true,
								showTextColumns: true,
								showWritingMode: true,
							},
							{
								key: 'meta',
								label: __( 'Date and author', 'sgs-blocks' ),
								prefix: 'meta',
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
								label: __( 'Category badge on image', 'sgs-blocks' ),
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
							{
								key: 'category',
								label: __( 'Category label', 'sgs-blocks' ),
								prefix: 'category',
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
								key: 'excerpt',
								label: __( 'Excerpt', 'sgs-blocks' ),
								prefix: 'excerpt',
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
								key: 'readMore',
								label: __( 'Read more link', 'sgs-blocks' ),
								prefix: 'readMore',
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
						] }
					/>
				</PanelBody>
	);
}
