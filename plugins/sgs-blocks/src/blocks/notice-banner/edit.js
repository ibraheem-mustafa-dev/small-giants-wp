import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

const VARIANT_OPTIONS = [
	{ label: __( 'Info', 'sgs-blocks' ), value: 'info' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Warning', 'sgs-blocks' ), value: 'warning' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
];

const ICON_OPTIONS = [
	{ label: __( 'Info circle', 'sgs-blocks' ), value: 'info' },
	{ label: __( 'Tick', 'sgs-blocks' ), value: 'check' },
	{ label: __( 'Delivery truck', 'sgs-blocks' ), value: 'truck' },
	{ label: __( 'Star', 'sgs-blocks' ), value: 'star' },
	{ label: __( 'Warning', 'sgs-blocks' ), value: 'warning' },
	{ label: __( 'Gift', 'sgs-blocks' ), value: 'gift' },
	{ label: __( 'Clock', 'sgs-blocks' ), value: 'clock' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

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

export default function Edit( { attributes, setAttributes } ) {
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

	const blockProps = useBlockProps( { className } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Banner Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Icon', 'sgs-blocks' ) }
						value={ icon }
						options={ ICON_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { icon: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) =>
							setAttributes( { textColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Text font size', 'sgs-blocks' ) }
						value={ textFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps } role="note">
				{ icon !== 'none' && ICON_EMOJI_MAP[ icon ] && (
					<span
						className="sgs-notice-banner__icon"
						aria-hidden="true"
					>
						{ ICON_EMOJI_MAP[ icon ] }
					</span>
				) }
				<RichText
					tagName="p"
					className="sgs-notice-banner__text"
					value={ text }
					onChange={ ( val ) =>
						setAttributes( { text: val } )
					}
					placeholder={ __(
						'Write your notice message\u2026',
						'sgs-blocks'
					) }
					style={ {
						color: colourVar( textColour ) || undefined,
						fontSize: fontSizeVar( textFontSize ) || undefined,
					} }
				/>
			</div>
		</>
	);
}
