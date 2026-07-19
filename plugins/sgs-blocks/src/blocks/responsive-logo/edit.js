import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
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
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { ResponsiveBoxControl, ResponsiveControl } from '../../components';

// Units offered on the max-width/max-height UnitControls (mirrors the shared
// TypographyControls unit-set pattern — px is the common case for a logo cap;
// % lets an operator cap relative to the header row).
const MAX_BOX_UNITS = [
	{ value: 'px', label: 'px', default: 240 },
	{ value: '%', label: '%', default: 100 },
	{ value: 'em', label: 'em', default: 20 },
	{ value: 'rem', label: 'rem', default: 20 },
];

/**
 * Compose a UnitControl display value from a numeric attr + unit string.
 *
 * @param {number|undefined} num  Numeric attribute value.
 * @param {string}           unit Unit string.
 * @return {string} Combined value, or '' when unset.
 */
function composeMaxBoxValue( num, unit ) {
	if ( num === undefined || num === null || '' === num ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

/**
 * Parse a UnitControl onChange value ('240px', '100%', …) into its numeric
 * and unit parts. Preserves the current unit when the field is cleared.
 *
 * @param {string} raw         Raw value from UnitControl onChange.
 * @param {string} currentUnit The currently-stored unit.
 * @return {{ num: number|undefined, unit: string }}
 */
function parseMaxBoxValue( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] || currentUnit || 'px';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'px' };
}

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
		logoSwitchMode,
		logoSwitchCustomPx,
		svgAnimationSource,
		animationStyle,
		width,
		maxWidthUnit,
		maxHeightUnit,
		linkToHome,
		alt,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	const maxWidthAttrMap = {
		desktop: 'maxWidth',
		tablet: 'maxWidthTablet',
		mobile: 'maxWidthMobile',
	};
	const maxHeightAttrMap = {
		desktop: 'maxHeight',
		tablet: 'maxHeightTablet',
		mobile: 'maxHeightMobile',
	};

	const onMaxWidthChange = ( breakpoint, raw ) => {
		const { num, unit } = parseMaxBoxValue( raw, maxWidthUnit || 'px' );
		setAttributes( {
			[ maxWidthAttrMap[ breakpoint ] ]: num,
			maxWidthUnit: unit,
		} );
	};

	const onMaxHeightChange = ( breakpoint, raw ) => {
		const { num, unit } = parseMaxBoxValue( raw, maxHeightUnit || 'px' );
		setAttributes( {
			[ maxHeightAttrMap[ breakpoint ] ]: num,
			maxHeightUnit: unit,
		} );
	};

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
					<SelectControl
						label={ __( 'Switch to compact logo', 'sgs-blocks' ) }
						value={ logoSwitchMode || 'mobile' }
						options={ [
							{ label: __( 'On mobile (≤767px)', 'sgs-blocks' ), value: 'mobile' },
							{ label: __( 'On tablet & below (≤1023px)', 'sgs-blocks' ), value: 'tablet' },
							{ label: __( 'Custom breakpoint', 'sgs-blocks' ), value: 'custom' },
						] }
						onChange={ ( val ) => setAttributes( { logoSwitchMode: val } ) }
						help={ __( 'When the compact (tablet/mobile) logo replaces the desktop logo: on mobile, on tablet and below, or at a breakpoint you choose. Only applies once a tablet or mobile logo is set.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>

					{ 'custom' === logoSwitchMode && (
						<RangeControl
							label={ __( 'Custom breakpoint (px)', 'sgs-blocks' ) }
							help={ __( 'Below this width the compact logo shows.', 'sgs-blocks' ) }
							value={ logoSwitchCustomPx ?? 1024 }
							onChange={ ( val ) => setAttributes( { logoSwitchCustomPx: val } ) }
							min={ 320 }
							max={ 2000 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
					) }
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
						help={ __( 'Describes what the logo depicts for screen readers. Leave empty to use "[Business name] home" automatically — never just "logo".', 'sgs-blocks' ) }
						value={ alt }
						onChange={ ( val ) => setAttributes( { alt: val } ) }
						rows={ 2 }
					/>
				</PanelBody>

				{ /* ── Panel 3b: Maximum size per device ── */ }
				<PanelBody
					title={ __( 'Maximum size (per device)', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p className="sgs-responsive-logo-editor__panel-hint">
						{ __( 'Cap the logo box independently per breakpoint. Leave a tier blank for no maximum at that size.', 'sgs-blocks' ) }
					</p>
					<ResponsiveControl label={ __( 'Max width', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								label={ __( 'Max width', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ composeMaxBoxValue(
									attributes[ maxWidthAttrMap[ breakpoint ] ],
									maxWidthUnit || 'px'
								) }
								units={ MAX_BOX_UNITS }
								onChange={ ( val ) => onMaxWidthChange( breakpoint, val ) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveControl>
					<ResponsiveControl label={ __( 'Max height', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								label={ __( 'Max height', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ composeMaxBoxValue(
									attributes[ maxHeightAttrMap[ breakpoint ] ],
									maxHeightUnit || 'px'
								) }
								units={ MAX_BOX_UNITS }
								onChange={ ( val ) => onMaxHeightChange( breakpoint, val ) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveControl>
				</PanelBody>

				{ /* ── Panel 4: Spacing ── */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Editor canvas preview ──────────────────────────────────────
			   Rendered via ServerSideRender (render.php) so the canvas NEVER
			   drifts from the frontend — animation, the theme-customiser
			   fallback logo, the functional alt default, left-align, and the
			   new per-tier max-box all render exactly as they will on the
			   live site (ssr-fixes-hand-built-preview-drift lesson,
			   2026-07-18). Tradeoff: the SVG view.js animation itself doesn't
			   run inside the static SSR preview — only its markup/CSS does.
			   Gated on desktopLogoId (not the transient preview URL) so the
			   placeholder is correct on reload before a logo is chosen; a
			   theme-customiser fallback logo (when set) still renders once a
			   logo is picked here, matching render.php's own fallback. ── */ }
			<div { ...blockProps }>
				{ desktopLogoId || desktopUrl ? (
					<ServerSideRender
						block="sgs/responsive-logo"
						attributes={ attributes }
					/>
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
