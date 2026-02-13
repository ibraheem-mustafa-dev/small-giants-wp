import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Icon,
} from '@wordpress/components';
import {
	starFilled,
	check,
	shipping,
	payment,
	globe,
	people,
	shield,
	inbox,
	mapMarker,
	calendar,
	comment,
	megaphone,
} from '@wordpress/icons';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const ICON_OPTIONS = [
	{ label: __( 'Star', 'sgs-blocks' ), value: 'star-filled', icon: starFilled },
	{ label: __( 'Tick', 'sgs-blocks' ), value: 'check', icon: check },
	{ label: __( 'Delivery', 'sgs-blocks' ), value: 'shipping', icon: shipping },
	{ label: __( 'Payment', 'sgs-blocks' ), value: 'payment', icon: payment },
	{ label: __( 'Globe', 'sgs-blocks' ), value: 'globe', icon: globe },
	{ label: __( 'People', 'sgs-blocks' ), value: 'people', icon: people },
	{ label: __( 'Shield', 'sgs-blocks' ), value: 'shield', icon: shield },
	{ label: __( 'Inbox', 'sgs-blocks' ), value: 'inbox', icon: inbox },
	{ label: __( 'Location', 'sgs-blocks' ), value: 'map-marker', icon: mapMarker },
	{ label: __( 'Calendar', 'sgs-blocks' ), value: 'calendar', icon: calendar },
	{ label: __( 'Chat', 'sgs-blocks' ), value: 'comment', icon: comment },
	{ label: __( 'Announce', 'sgs-blocks' ), value: 'megaphone', icon: megaphone },
];

const ICON_MAP = Object.fromEntries(
	ICON_OPTIONS.map( ( opt ) => [ opt.value, opt.icon ] )
);

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Border accent', 'sgs-blocks' ), value: 'border-accent' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const ICON_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		icon,
		heading,
		description,
		link,
		linkOpensNewTab,
		iconColour,
		iconBackgroundColour,
		iconSize,
		headingColour,
		headingFontSize,
		descriptionColour,
		cardStyle,
		hoverEffect,
	} = attributes;

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ hoverEffect }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const iconStyle = {
		color: colourVar( iconColour ),
		backgroundColor: colourVar( iconBackgroundColour ),
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { cardStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { hoverEffect: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Heading colour', 'sgs-blocks' ) }
						value={ headingColour }
						onChange={ ( val ) =>
							setAttributes( { headingColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Heading font size', 'sgs-blocks' ) }
						value={ headingFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { headingFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __(
							'Description colour',
							'sgs-blocks'
						) }
						value={ descriptionColour }
						onChange={ ( val ) =>
							setAttributes( {
								descriptionColour: val,
							} )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Icon', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Icon', 'sgs-blocks' ) }
						value={ icon }
						options={ ICON_OPTIONS.map( ( opt ) => ( {
							label: opt.label,
							value: opt.value,
						} ) ) }
						onChange={ ( val ) =>
							setAttributes( { icon: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Icon size', 'sgs-blocks' ) }
						value={ iconSize }
						options={ ICON_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { iconSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) =>
							setAttributes( { iconColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Icon background colour',
							'sgs-blocks'
						) }
						value={ iconBackgroundColour }
						onChange={ ( val ) =>
							setAttributes( {
								iconBackgroundColour: val,
							} )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Link', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ link || '' }
						onChange={ ( val ) =>
							setAttributes( { link: val } )
						}
						type="url"
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Open in new tab', 'sgs-blocks' ) }
						checked={ linkOpensNewTab }
						onChange={ ( val ) =>
							setAttributes( { linkOpensNewTab: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div
					className={ `sgs-info-box__icon sgs-info-box__icon--${ iconSize }` }
					style={ iconStyle }
				>
					{ ICON_MAP[ icon ] && (
						<Icon icon={ ICON_MAP[ icon ] } size={ 24 } />
					) }
				</div>
				<RichText
					tagName="h3"
					className="sgs-info-box__heading"
					value={ heading }
					onChange={ ( val ) =>
						setAttributes( { heading: val } )
					}
					placeholder={ __( 'Feature heading…', 'sgs-blocks' ) }
					style={ {
						color: colourVar( headingColour ) || undefined,
						fontSize:
							fontSizeVar( headingFontSize ) || undefined,
					} }
				/>
				<RichText
					tagName="p"
					className="sgs-info-box__description"
					value={ description }
					onChange={ ( val ) =>
						setAttributes( { description: val } )
					}
					placeholder={ __( 'Description…', 'sgs-blocks' ) }
					style={ {
						color:
							colourVar( descriptionColour ) || undefined,
					} }
				/>
			</div>
		</>
	);
}
