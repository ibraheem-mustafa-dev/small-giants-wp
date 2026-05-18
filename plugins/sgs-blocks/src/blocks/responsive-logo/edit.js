import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	SelectControl,
	TextareaControl,
	Notice,
} from '@wordpress/components';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';

const ANIMATION_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Draw on load', 'sgs-blocks' ), value: 'draw-on-load' },
	{ label: __( 'Hover redraw', 'sgs-blocks' ), value: 'hover-redraw' },
	{ label: __( 'Scroll trigger', 'sgs-blocks' ), value: 'scroll-trigger' },
];

/**
 * Renders a MediaUpload slot for a logo.
 *
 * @param {Object}   props
 * @param {number}   props.mediaId     Current media attachment ID (or undefined).
 * @param {string}   props.mediaUrl    Current image URL for preview (or undefined).
 * @param {Function} props.onSelect    Called with the media object on selection.
 * @param {Function} props.onRemove    Called when the remove button is clicked.
 * @param {string}   props.label       Button / panel label.
 * @param {string}   props.placeholder Fallback text when no image is selected.
 */
function LogoSlot( { mediaId, mediaUrl, onSelect, onRemove, label, placeholder } ) {
	return (
		<MediaUploadCheck>
			<div className="sgs-responsive-logo-editor__slot">
				<p className="sgs-responsive-logo-editor__slot-label">{ label }</p>
				{ mediaUrl ? (
					<div className="sgs-responsive-logo-editor__slot-preview">
						<img
							src={ mediaUrl }
							alt={ label }
							className="sgs-responsive-logo-editor__slot-img"
						/>
						<div className="sgs-responsive-logo-editor__slot-actions">
							<MediaUpload
								onSelect={ onSelect }
								allowedTypes={ [ 'image' ] }
								value={ mediaId }
								render={ ( { open } ) => (
									<Button
										variant="secondary"
										onClick={ open }
										size="small"
									>
										{ __( 'Replace', 'sgs-blocks' ) }
									</Button>
								) }
							/>
							<Button
								variant="tertiary"
								onClick={ onRemove }
								isDestructive
								size="small"
							>
								{ __( 'Remove', 'sgs-blocks' ) }
							</Button>
						</div>
					</div>
				) : (
					<MediaUpload
						onSelect={ onSelect }
						allowedTypes={ [ 'image' ] }
						value={ mediaId }
						render={ ( { open } ) => (
							<Button
								variant="secondary"
								onClick={ open }
								className="sgs-responsive-logo-editor__slot-upload"
							>
								{ __( 'Upload / Select', 'sgs-blocks' ) }
							</Button>
						) }
					/>
				) }
				{ ! mediaUrl && placeholder && (
					<p className="sgs-responsive-logo-editor__slot-placeholder">
						{ placeholder }
					</p>
				) }
			</div>
		</MediaUploadCheck>
	);
}

/**
 * Edit component for sgs/responsive-logo.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		desktopLogoId,
		tabletLogoId,
		mobileLogoId,
		svgAnimationSource,
		animationStyle,
		width,
		linkToHome,
		alt,
	} = attributes;

	// We store URLs in the editor state via onSelect but don't persist them
	// as block attributes — render.php derives them server-side from IDs.
	// For editor preview we resolve them inline.
	const blockProps = useBlockProps( {
		className: 'sgs-responsive-logo-editor',
	} );

	const onSelectDesktop = ( media ) => {
		setAttributes( {
			desktopLogoId: media.id,
			// Store URL for live editor preview only (not persisted as attribute).
			_desktopLogoUrl: media.url,
		} );
	};
	const onRemoveDesktop = () => {
		setAttributes( { desktopLogoId: undefined, _desktopLogoUrl: undefined } );
	};

	const onSelectTablet = ( media ) => {
		setAttributes( { tabletLogoId: media.id, _tabletLogoUrl: media.url } );
	};
	const onRemoveTablet = () => {
		setAttributes( { tabletLogoId: undefined, _tabletLogoUrl: undefined } );
	};

	const onSelectMobile = ( media ) => {
		setAttributes( { mobileLogoId: media.id, _mobileLogoUrl: media.url } );
	};
	const onRemoveMobile = () => {
		setAttributes( { mobileLogoId: undefined, _mobileLogoUrl: undefined } );
	};

	const onSelectSvg = ( media ) => {
		setAttributes( { svgAnimationSource: media.id } );
	};
	const onRemoveSvg = () => {
		setAttributes( { svgAnimationSource: undefined } );
	};

	// Internal preview URL attrs (not in block.json, editor-only transient state).
	const desktopUrl = attributes._desktopLogoUrl;
	const tabletUrl  = attributes._tabletLogoUrl;
	const mobileUrl  = attributes._mobileLogoUrl;

	const hasAnimation = animationStyle && 'none' !== animationStyle;

	return (
		<>
			<InspectorControls>
				{ /* ── Panel 1: Logos by device ── */ }
				<PanelBody
					title={ __( 'Logos by device', 'sgs-blocks' ) }
					initialOpen
				>
					<p className="sgs-responsive-logo-editor__panel-hint">
						{ __( 'Desktop logo is required. Tablet and mobile fall back to desktop when not set.', 'sgs-blocks' ) }
					</p>

					<LogoSlot
						mediaId={ desktopLogoId }
						mediaUrl={ desktopUrl }
						onSelect={ onSelectDesktop }
						onRemove={ onRemoveDesktop }
						label={ __( 'Desktop logo (horizontal)', 'sgs-blocks' ) }
					/>

					<LogoSlot
						mediaId={ tabletLogoId }
						mediaUrl={ tabletUrl }
						onSelect={ onSelectTablet }
						onRemove={ onRemoveTablet }
						label={ __( 'Tablet logo (square)', 'sgs-blocks' ) }
						placeholder={ __( 'Same as desktop when not set.', 'sgs-blocks' ) }
					/>

					<LogoSlot
						mediaId={ mobileLogoId }
						mediaUrl={ mobileUrl }
						onSelect={ onSelectMobile }
						onRemove={ onRemoveMobile }
						label={ __( 'Mobile logo (mark/icon)', 'sgs-blocks' ) }
						placeholder={ __( 'Same as desktop when not set.', 'sgs-blocks' ) }
					/>
				</PanelBody>

				{ /* ── Panel 2: SVG animation ── */ }
				<PanelBody
					title={ __( 'SVG animation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<Notice isDismissible={ false } status="info">
						{ __( 'Upload a .svg file via the media library — never paste SVG code directly. This prevents XSS vulnerabilities.', 'sgs-blocks' ) }
					</Notice>

					<SelectControl
						label={ __( 'Animation style', 'sgs-blocks' ) }
						value={ animationStyle }
						options={ ANIMATION_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { animationStyle: val } ) }
						__nextHasNoMarginBottom
					/>

					{ hasAnimation && (
						<MediaUploadCheck>
							<div className="sgs-responsive-logo-editor__slot">
								<p>{ __( 'SVG animation file', 'sgs-blocks' ) }</p>
								{ svgAnimationSource ? (
									<>
										<p className="sgs-responsive-logo-editor__svg-id">
											{ /* translators: %d is the attachment ID */ }
											{ sprintf( __( 'Attachment ID: %d', 'sgs-blocks' ), svgAnimationSource ) }
										</p>
										<Button
											variant="secondary"
											onClick={ onRemoveSvg }
											isDestructive
											size="small"
										>
											{ __( 'Remove SVG', 'sgs-blocks' ) }
										</Button>
									</>
								) : (
									<MediaUpload
										onSelect={ onSelectSvg }
										allowedTypes={ [ 'image/svg+xml' ] }
										value={ svgAnimationSource }
										render={ ( { open } ) => (
											<Button
												variant="secondary"
												onClick={ open }
											>
												{ __( 'Upload SVG file', 'sgs-blocks' ) }
											</Button>
										) }
									/>
								) }
							</div>
						</MediaUploadCheck>
					) }
				</PanelBody>

				{ /* ── Panel 3: Sizing + behaviour ── */ }
				<PanelBody
					title={ __( 'Sizing + behaviour', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RangeControl
						label={ __( 'Width (px)', 'sgs-blocks' ) }
						help={ __( 'Desktop logo width. Mobile/tablet scale proportionally.', 'sgs-blocks' ) }
						value={ width }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						min={ 40 }
						max={ 600 }
						step={ 10 }
						__nextHasNoMarginBottom
					/>

					<ToggleControl
						label={ __( 'Link to homepage', 'sgs-blocks' ) }
						help={ __( 'Wraps the logo in an <a> tag pointing to the site home URL.', 'sgs-blocks' ) }
						checked={ linkToHome }
						onChange={ ( val ) => setAttributes( { linkToHome: val } ) }
						__nextHasNoMarginBottom
					/>

					<TextareaControl
						label={ __( 'Alt text', 'sgs-blocks' ) }
						help={ __( 'Describes the logo for screen readers. Leave empty to use the site name.', 'sgs-blocks' ) }
						value={ alt }
						onChange={ ( val ) => setAttributes( { alt: val } ) }
						rows={ 2 }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Editor canvas preview ── */ }
			<div { ...blockProps }>
				{ desktopUrl ? (
					<div
						className="sgs-responsive-logo-editor__preview"
						style={ { width: `${ width }px`, maxWidth: '100%' } }
					>
						<img
							src={ desktopUrl }
							alt={ alt || __( 'Logo preview', 'sgs-blocks' ) }
							style={ { display: 'block', maxWidth: '100%', height: 'auto' } }
						/>
						{ ( tabletUrl || mobileUrl ) && (
							<p className="sgs-responsive-logo-editor__preview-note">
								{ __( '+ tablet/mobile variants set', 'sgs-blocks' ) }
							</p>
						) }
						{ hasAnimation && svgAnimationSource && (
							<p className="sgs-responsive-logo-editor__preview-note">
								{ /* translators: %s is the animation style label */ }
								{ sprintf(
									__( 'SVG animation: %s (ID %d)', 'sgs-blocks' ),
									animationStyle,
									svgAnimationSource
								) }
							</p>
						) }
					</div>
				) : (
					<div className="sgs-responsive-logo-editor__empty">
						<span className="dashicons dashicons-format-image" />
						<p>{ __( 'Select a logo in the sidebar to get started.', 'sgs-blocks' ) }</p>
					</div>
				) }
			</div>
		</>
	);
}
