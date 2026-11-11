/**
 * Media block inspector: the Typography fields (caption and video time read-out), mounted into the media panels'
 * Typography panel as caller content. The caption target shows when a caption exists and the video-time target when
 * the player shows (Spec 49 §9.3).
 */
import { __ } from '@wordpress/i18n';
import { TypographyControls } from '../../../components';

export default function TypographyPanel( { attributes, setAttributes, showCaption = true, showVideoTime = true } ) {
	if ( ! showCaption && ! showVideoTime ) {
		return null;
	}
	return (
		<>
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
						showTextStroke: true,
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
						showTextStroke: true,
						showTextColumns: true,
						showWritingMode: true,
					},
				].filter( ( target ) => ( 'caption' === target.key ? showCaption : showVideoTime ) ) }
			/>
		</>
	);
}
