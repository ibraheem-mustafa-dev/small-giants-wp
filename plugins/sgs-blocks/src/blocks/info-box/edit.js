import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	MediaUpload,
	MediaUploadCheck,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Icon,
	Button,
	Flex,
	FlexItem,
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
import { DesignTokenPicker, ResponsiveControl } from '../../components';
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

const MEDIA_TYPE_OPTIONS = [
	{ label: __( 'Icon', 'sgs-blocks' ), value: 'icon' },
	{ label: __( 'Emoji', 'sgs-blocks' ), value: 'emoji' },
	{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

// Human-readable labels for the element order UI.
const ELEMENT_LABELS = {
	media:    __( 'Media (icon / emoji / image)', 'sgs-blocks' ),
	title:    __( 'Title', 'sgs-blocks' ),
	subtitle: __( 'Subtitle', 'sgs-blocks' ),
	text:     __( 'Text body', 'sgs-blocks' ),
	button:   __( 'Button', 'sgs-blocks' ),
};

// InnerBlocks template for the button slot.
const BUTTON_TEMPLATE = [
	[
		'sgs/multi-button',
		{},
		[ [ 'sgs/button', { inheritStyle: 'primary', label: 'Learn More' } ] ],
	],
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		showMedia,
		showTitle,
		showSubtitle,
		showText,
		showButton,
		elementOrder,
		mediaType,
		mediaEmoji,
		image,
		iconPosition,
		icon,
		heading,
		subtitle,
		subtitleColour,
		subtitleFontSize,
		subtitleFontSizeTablet,
		subtitleFontSizeMobile,
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

	// Ensure elementOrder always contains all 5 IDs (defensive).
	const defaultOrder = [ 'media', 'title', 'subtitle', 'text', 'button' ];
	const safeOrder = Array.isArray( elementOrder )
		? [
				...elementOrder,
				...defaultOrder.filter( ( id ) => ! elementOrder.includes( id ) ),
		  ]
		: defaultOrder;

	const moveElement = ( from, to ) => {
		const next = [ ...safeOrder ];
		const [ moved ] = next.splice( from, 1 );
		next.splice( to, 0, moved );
		setAttributes( { elementOrder: next } );
	};

	const showMap = {
		media:    showMedia,
		title:    showTitle,
		subtitle: showSubtitle,
		text:     showText,
		button:   showButton,
	};

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ hoverEffect }`,
		`sgs-info-box--media-${ iconPosition }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	// InnerBlocks for the button slot.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-info-box__button' },
		{
			template:      BUTTON_TEMPLATE,
			allowedBlocks: [ 'sgs/multi-button' ],
		}
	);

	const iconStyle = {
		color:           colourVar( iconColour ),
		backgroundColor: colourVar( iconBackgroundColour ),
	};

	// Render each element in order for the editor preview.
	const renderElement = ( id ) => {
		if ( ! showMap[ id ] ) {
			return null;
		}

		switch ( id ) {
			case 'media':
				if ( 'image' === mediaType && image?.url ) {
					return (
						<img
							key="media"
							src={ image.url }
							alt={ image.alt || '' }
							className="sgs-info-box__image"
						/>
					);
				}
				if ( 'emoji' === mediaType ) {
					return (
						<div
							key="media"
							className="sgs-info-box__media sgs-info-box__media--emoji"
							aria-hidden="true"
						>
							{ mediaEmoji || '✨' }
						</div>
					);
				}
				// Icon (default).
				return (
					<div
						key="media"
						className={ `sgs-info-box__icon sgs-info-box__icon--${ iconSize }` }
						style={ iconStyle }
					>
						{ ICON_MAP[ icon ] && (
							<Icon icon={ ICON_MAP[ icon ] } size={ 24 } />
						) }
					</div>
				);

			case 'title':
				return (
					<RichText
						key="title"
						tagName="h3"
						className="sgs-info-box__heading"
						value={ heading }
						onChange={ ( val ) => setAttributes( { heading: val } ) }
						placeholder={ __( 'Feature heading…', 'sgs-blocks' ) }
						style={ {
							color:     colourVar( headingColour ) || undefined,
							fontSize:  fontSizeVar( headingFontSize ) || undefined,
						} }
					/>
				);

			case 'subtitle':
				return (
					<RichText
						key="subtitle"
						tagName="p"
						className="sgs-info-box__subtitle"
						value={ subtitle }
						onChange={ ( val ) => setAttributes( { subtitle: val } ) }
						placeholder={ __( 'Subtitle…', 'sgs-blocks' ) }
						style={ {
							color:    colourVar( subtitleColour ) || undefined,
							fontSize: fontSizeVar( subtitleFontSize ) || undefined,
						} }
					/>
				);

			case 'text':
				return (
					<RichText
						key="text"
						tagName="p"
						className="sgs-info-box__description"
						value={ description }
						onChange={ ( val ) =>
							setAttributes( { description: val } )
						}
						placeholder={ __( 'Description…', 'sgs-blocks' ) }
						style={ {
							color: colourVar( descriptionColour ) || undefined,
						} }
					/>
				);

			case 'button':
				return <div key="button" { ...innerBlocksProps } />;

			default:
				return null;
		}
	};

	return (
		<>
			<InspectorControls>
				{ /* ===== Element Visibility ===== */ }
				<PanelBody
					title={ __( 'Element Visibility', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<ToggleControl
						label={ __( 'Show media (icon / emoji / image)', 'sgs-blocks' ) }
						checked={ showMedia }
						onChange={ ( val ) => setAttributes( { showMedia: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show title', 'sgs-blocks' ) }
						checked={ showTitle }
						onChange={ ( val ) => setAttributes( { showTitle: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show subtitle', 'sgs-blocks' ) }
						checked={ showSubtitle }
						onChange={ ( val ) =>
							setAttributes( { showSubtitle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show text body', 'sgs-blocks' ) }
						checked={ showText }
						onChange={ ( val ) => setAttributes( { showText: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show button', 'sgs-blocks' ) }
						checked={ showButton }
						onChange={ ( val ) =>
							setAttributes( { showButton: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Element Order ===== */ }
				<PanelBody
					title={ __( 'Element Order', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { marginTop: 0, fontSize: '12px', color: '#757575' } }>
						{ __( 'Drag to reorder using the arrows below.', 'sgs-blocks' ) }
					</p>
					{ safeOrder.map( ( id, idx ) => (
						<Flex
							key={ id }
							align="center"
							gap={ 1 }
							style={ {
								marginBottom: '4px',
								padding: '4px 8px',
								background: '#f0f0f0',
								borderRadius: '4px',
								opacity: showMap[ id ] ? 1 : 0.45,
							} }
						>
							<FlexItem isBlock>
								<span style={ { fontSize: '13px' } }>
									{ ELEMENT_LABELS[ id ] }
								</span>
							</FlexItem>
							<Button
								icon="arrow-up-alt2"
								label={ __( 'Move up', 'sgs-blocks' ) }
								size="small"
								disabled={ idx === 0 }
								onClick={ () => moveElement( idx, idx - 1 ) }
							/>
							<Button
								icon="arrow-down-alt2"
								label={ __( 'Move down', 'sgs-blocks' ) }
								size="small"
								disabled={ idx === safeOrder.length - 1 }
								onClick={ () => moveElement( idx, idx + 1 ) }
							/>
						</Flex>
					) ) }
				</PanelBody>

				{ /* ===== Card Style ===== */ }
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) => setAttributes( { hoverEffect: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Media ===== */ }
				{ showMedia && (
					<PanelBody
						title={ __( 'Media', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<SelectControl
							label={ __( 'Media type', 'sgs-blocks' ) }
							value={ mediaType }
							options={ MEDIA_TYPE_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { mediaType: val } )
							}
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Position', 'sgs-blocks' ) }
							value={ iconPosition }
							options={ ICON_POSITION_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { iconPosition: val } )
							}
							__nextHasNoMarginBottom
						/>
						{ 'image' === mediaType && (
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) =>
										setAttributes( {
											image: {
												id:     media.id,
												url:    media.url,
												alt:    media.alt,
												width:  media.width,
												height: media.height,
											},
										} )
									}
									allowedTypes={ [ 'image' ] }
									value={ image?.id }
									render={ ( { open } ) => (
										<>
											{ image?.url && (
												<img
													src={ image.url }
													alt={ image.alt || '' }
													style={ {
														display:       'block',
														maxWidth:      '100%',
														marginBottom:  '8px',
														borderRadius:  '4px',
													} }
												/>
											) }
											<Button
												variant="secondary"
												onClick={ open }
												style={ { marginBottom: '4px' } }
											>
												{ image?.url
													? __(
														'Replace image',
														'sgs-blocks'
													)
													: __(
														'Select image',
														'sgs-blocks'
													) }
											</Button>
											{ image?.url && (
												<Button
													variant="link"
													isDestructive
													onClick={ () =>
														setAttributes( {
															image: undefined,
														} )
													}
													style={ { display: 'block' } }
												>
													{ __(
														'Remove image',
														'sgs-blocks'
													) }
												</Button>
											) }
										</>
									) }
								/>
							</MediaUploadCheck>
						) }
						{ 'emoji' === mediaType && (
							<TextControl
								label={ __( 'Emoji', 'sgs-blocks' ) }
								help={ __(
									'Paste a single emoji character, e.g. 🚀',
									'sgs-blocks'
								) }
								value={ mediaEmoji }
								onChange={ ( val ) =>
									setAttributes( { mediaEmoji: val } )
								}
								__nextHasNoMarginBottom
							/>
						) }
						{ 'icon' === mediaType && (
							<>
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
								<ResponsiveControl
									label={ __( 'Icon size', 'sgs-blocks' ) }
								>
									{ ( breakpoint ) => {
										const attrMap = {
											desktop: 'iconSize',
											tablet:  'iconSizeTablet',
											mobile:  'iconSizeMobile',
										};
										return (
											<SelectControl
												value={
													attributes[
														attrMap[ breakpoint ]
													] || ''
												}
												options={
													breakpoint === 'desktop'
														? ICON_SIZE_OPTIONS
														: [
																{
																	label: __(
																		'Same as desktop',
																		'sgs-blocks'
																	),
																	value: '',
																},
																...ICON_SIZE_OPTIONS,
															]
												}
												onChange={ ( val ) =>
													setAttributes( {
														[ attrMap[ breakpoint ] ]: val,
													} )
												}
												__nextHasNoMarginBottom
											/>
										);
									} }
								</ResponsiveControl>
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
							</>
						) }
					</PanelBody>
				) }

				{ /* ===== Title Styling ===== */ }
				{ showTitle && (
					<PanelBody
						title={ __( 'Title Styling', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<DesignTokenPicker
							label={ __( 'Title colour', 'sgs-blocks' ) }
							value={ headingColour }
							onChange={ ( val ) =>
								setAttributes( { headingColour: val } )
							}
						/>
						<ResponsiveControl
							label={ __( 'Title font size', 'sgs-blocks' ) }
						>
							{ ( breakpoint ) => {
								const attrMap = {
									desktop: 'headingFontSize',
									tablet:  'headingFontSizeTablet',
									mobile:  'headingFontSizeMobile',
								};
								return (
									<SelectControl
										value={
											attributes[ attrMap[ breakpoint ] ] || ''
										}
										options={
											breakpoint === 'desktop'
												? FONT_SIZE_OPTIONS
												: [
														{
															label: __(
																'Same as desktop',
																'sgs-blocks'
															),
															value: '',
														},
														...FONT_SIZE_OPTIONS.filter(
															( opt ) => opt.value !== ''
														),
													]
										}
										onChange={ ( val ) =>
											setAttributes( {
												[ attrMap[ breakpoint ] ]: val,
											} )
										}
										__nextHasNoMarginBottom
									/>
								);
							} }
						</ResponsiveControl>
					</PanelBody>
				) }

				{ /* ===== Subtitle Styling ===== */ }
				{ showSubtitle && (
					<PanelBody
						title={ __( 'Subtitle Styling', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<DesignTokenPicker
							label={ __( 'Subtitle colour', 'sgs-blocks' ) }
							value={ subtitleColour }
							onChange={ ( val ) =>
								setAttributes( { subtitleColour: val } )
							}
						/>
						<ResponsiveControl
							label={ __( 'Subtitle font size', 'sgs-blocks' ) }
						>
							{ ( breakpoint ) => {
								const attrMap = {
									desktop: 'subtitleFontSize',
									tablet:  'subtitleFontSizeTablet',
									mobile:  'subtitleFontSizeMobile',
								};
								return (
									<SelectControl
										value={
											attributes[ attrMap[ breakpoint ] ] || ''
										}
										options={
											breakpoint === 'desktop'
												? FONT_SIZE_OPTIONS
												: [
														{
															label: __(
																'Same as desktop',
																'sgs-blocks'
															),
															value: '',
														},
														...FONT_SIZE_OPTIONS.filter(
															( opt ) => opt.value !== ''
														),
													]
										}
										onChange={ ( val ) =>
											setAttributes( {
												[ attrMap[ breakpoint ] ]: val,
											} )
										}
										__nextHasNoMarginBottom
									/>
								);
							} }
						</ResponsiveControl>
					</PanelBody>
				) }

				{ /* ===== Text Body Styling ===== */ }
				{ showText && (
					<PanelBody
						title={ __( 'Text Body Styling', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<DesignTokenPicker
							label={ __( 'Text colour', 'sgs-blocks' ) }
							value={ descriptionColour }
							onChange={ ( val ) =>
								setAttributes( { descriptionColour: val } )
							}
						/>
					</PanelBody>
				) }

				{ /* ===== Legacy link (kept for existing content) ===== */ }
				<PanelBody
					title={ __( 'Legacy Link', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
						{ __(
							'Use "Show button" for new links. This field is kept for backwards compatibility with existing info boxes.',
							'sgs-blocks'
						) }
					</p>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ link || '' }
						onChange={ ( val ) => setAttributes( { link: val } ) }
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
				{ safeOrder.map( ( id ) => renderElement( id ) ) }
			</div>
		</>
	);
}
