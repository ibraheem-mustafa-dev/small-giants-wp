/**
 * Media block inspector: the Typography panel (caption and video time read-out).
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { TypographyControls } from '../../../components';

export default function TypographyPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
			{ /* One switcher: the caption and the video player's time read-out.
			     The read-out is built by view.js; the canvas shows a static sample. */ }
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				targets={ [
					{
						key: 'caption',
						label: __( 'Caption', 'sgs-blocks' ),
						prefix: 'caption',
						showSize: true,
						fontSizePresets: true,
						showFontFamily: true,
						showWeight: true,
						showStyle: true,
						showLineHeight: true,
						showResponsive: true,
						showDecoration: true,
						showTransform: true,
						showLetterSpacing: true,
						showTextAlign: true,
						showTextWrap: true,
						showTextColumns: true,
						showWritingMode: true,
					},
					{
						key: 'videoTime',
						label: __( 'Video time', 'sgs-blocks' ),
						prefix: 'videoTime',
						showSize: true,
						fontSizePresets: true,
						showFontFamily: true,
						showWeight: true,
						showStyle: true,
						showLineHeight: true,
						showResponsive: true,
						showDecoration: true,
						showTransform: true,
						showLetterSpacing: true,
						showTextWrap: true,
						showTextColumns: true,
						showWritingMode: true,
					},
				] }
			/>
		</PanelBody>
	);
}
