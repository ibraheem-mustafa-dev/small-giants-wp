/**
 * Notice Banner block — v1 deprecation.
 *
 * Captures the original static save output (emoji icons) before the block was
 * converted to server-side rendering via render.php (which uses Lucide SVG icons).
 * WordPress will validate existing content against this save function and silently
 * migrate it to the dynamic render.php output on the next editor save.
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

const ICON_EMOJI_MAP = {
	info:    '\u2139\uFE0F',
	check:   '\u2705',
	truck:   '\uD83D\uDE9A',
	star:    '\u2B50',
	warning: '\u26A0\uFE0F',
	gift:    '\uD83C\uDF81',
	clock:   '\u23F0',
	none:    '',
};

const v1 = {
	attributes: {
		icon:         { type: 'string', default: 'info' },
		text:         { type: 'string', source: 'html', selector: '.sgs-notice-banner__text' },
		variant:      { type: 'string', default: 'info' },
		textColour:   { type: 'string' },
		textFontSize: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: false, text: false },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save( { attributes } ) {
		const { icon, text, variant, textColour, textFontSize } = attributes;

		const className = [
			'sgs-notice-banner',
			`sgs-notice-banner--${ variant }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const textStyle = {
			color:    colourVar( textColour ) || undefined,
			fontSize: fontSizeVar( textFontSize ) || undefined,
		};

		return (
			<div { ...blockProps } role="note">
				{ icon !== 'none' && ICON_EMOJI_MAP[ icon ] && (
					<span className="sgs-notice-banner__icon" aria-hidden="true">
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
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v1 ];
