import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

const ICON_EMOJI_MAP = {
	info: '\u2139\uFE0F',
	check: '\u2705',
	truck: '\uD83D\uDE9A',
	star: '\u2B50',
	warning: '\u26A0\uFE0F',
	gift: '\uD83C\uDF81',
	clock: '\u23F0',
	none: '',
};

export default function Save( { attributes } ) {
	const {
		icon,
		text,
		variant,
		textColour,
		textFontSize,
	} = attributes;

	const className = [
		'sgs-notice-banner',
		`sgs-notice-banner--${ variant }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( { className } );

	const textStyle = {
		color: colourVar( textColour ) || undefined,
		fontSize: fontSizeVar( textFontSize ) || undefined,
	};

	return (
		<div { ...blockProps } role="note">
			{ icon !== 'none' && ICON_EMOJI_MAP[ icon ] && (
				<span
					className="sgs-notice-banner__icon"
					aria-hidden="true"
				>
					{ ICON_EMOJI_MAP[ icon ] }
				</span>
			) }
			<RichText.Content
				tagName="p"
				className="sgs-notice-banner__text"
				value={ text }
				style={ textStyle }
			/>
		</div>
	);
}
