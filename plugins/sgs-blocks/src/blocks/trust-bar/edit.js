import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
	RangeControl,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker, IconPicker, IconPreview, TypographyControls, ResponsiveBoxControl, ResponsiveControl } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar } from '../../utils';
// No-inline migration (2026-07-10): trust-bar no longer uses the default
// <ContainerWrapperControls> aggregator — its unconditional "Content band" /
// "Responsive spacing" panels write to LEGACY FLAT attrs (contentBandPaddingTop,
// paddingTopTablet, …), which are now REMOVED box-object attrs on this block
// (paddingTablet/paddingMobile/marginTablet/marginMobile/contentBandPadding+
// Tablet+Mobile). Import the individual panels still needed instead (mirrors
// sgs/container's + sgs/hero's own edit.js) and roll trust-bar's own "Padding &
// margin" / "Content band" panels below using ResponsiveBoxControl bound to the
// object attrs.
import {
	WidthPanel,
	LayoutPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	GridItemDefaultsPanel,
	MIN_HEIGHT_OPTIONS,
	SHADOW_OPTIONS,
} from '../container/components/ContainerWrapperControls';

/**
 * Resolve a gap attribute value to a valid CSS string for editor preview.
 *
 * Mirrors PHP sgs_container_gap_value() and container/edit.js gapCssValue():
 *  - Bare digit slug (e.g. "40") → var(--wp--preset--spacing--40)
 *  - Raw CSS length (e.g. "16px", "1.5rem") → pass through as-is
 *  - Empty / nullish → undefined (style key omitted)
 *
 * @param {string|null|undefined} gap Gap attribute value.
 * @returns {string|undefined}
 */
function gapCssValue( gap ) {
	if ( ! gap ) {
		return undefined;
	}
	if ( /^\d+$/.test( String( gap ) ) ) {
		return `var(--wp--preset--spacing--${ gap })`;
	}
	return String( gap );
}

const BADGE_STYLE_OPTIONS = [
	{ label: __( 'Icon circle (default)', 'sgs-blocks' ), value: 'icon-circle' },
	{ label: __( 'Text only (pill badge)', 'sgs-blocks' ), value: 'text-only' },
	{ label: __( 'Image badge (logo / cert)', 'sgs-blocks' ), value: 'image-badge' },
];

const BADGE_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ),  value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ),  value: 'large' },
];

const AUTO_SCROLL_SPEED_OPTIONS = [
	{ label: __( 'Slow (40s)', 'sgs-blocks' ),   value: 'slow' },
	{ label: __( 'Medium (25s)', 'sgs-blocks' ),  value: 'medium' },
	{ label: __( 'Fast (15s)', 'sgs-blocks' ),    value: 'fast' },
];

// ─── Editor sub-components ────────────────────────────────────────────────────

/** Circle wrapper with the actual selected icon for editor preview. */
function EditorIconCircle( { size, circleBg, iconColour, iconSlug, borderRadius, boxShadow, filled, fillColour } ) {
	// The filled class picks up the fill exemption from style.css (loaded in the
	// editor iframe), so the preview matches the frontend. fillColour drives the
	// same custom-fill var render.php sets.
	const style = {
		width: size,
		height: size,
		borderRadius: borderRadius || '50%',
		backgroundColor: circleBg || '#ffffff',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		boxShadow: boxShadow || '0 1px 2px rgba(0,0,0,0.06)',
		color: iconColour || 'currentColor',
	};
	if ( filled && fillColour ) {
		style[ '--sgs-trust-badge-icon-fill' ] = colourVar( fillColour );
	}
	return (
		<span
			className={ 'sgs-trust-bar__circle' + ( filled ? ' sgs-trust-bar__circle--filled' : '' ) }
			aria-hidden="true"
			style={ style }
		>
			<IconPreview
				source="lucide"
				name={ iconSlug || 'check' }
				size={ Math.round( size * 0.45 ) }
			/>
		</span>
	);
}

/** Inspector item editor for icon-circle variant. */
function IconCircleItemEditor( { item, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div
			style={ {
				padding: '12px',
				marginBottom: '12px',
				background: item.pending ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)',
				borderRadius: '4px',
				border: item.pending ? '1px dashed #ccc' : '1px solid transparent',
				opacity: item.pending ? 0.75 : 1,
			} }
		>
			{ item.pending && (
				<Notice status="warning" isDismissible={ false } style={ { marginBottom: '8px' } }>
					{ __( 'Pending — hidden on the frontend until you uncheck "Pending".', 'sgs-blocks' ) }
				</Notice>
			) }
			<IconPicker
				label={ __( 'Icon', 'sgs-blocks' ) }
				value={ { source: 'lucide', name: item.icon || 'check' } }
				onChange={ ( { name } ) => update( 'icon', name ) }
				sources={ [ 'lucide' ] }
			/>
			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				placeholder={ __( 'Badge label…', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={ __( 'Filled icon', 'sgs-blocks' ) }
				help={ __( 'Render the icon as a solid filled shape (e.g. a filled star) instead of a line outline.', 'sgs-blocks' ) }
				checked={ item.fillStyle === 'filled' }
				onChange={ ( val ) => update( 'fillStyle', val ? 'filled' : 'outline' ) }
				__nextHasNoMarginBottom
			/>
			{ item.fillStyle === 'filled' && (
				<DesignTokenPicker
					label={ __( 'Fill colour', 'sgs-blocks' ) }
					value={ item.fillColour || '' }
					onChange={ ( val ) => update( 'fillColour', val ) }
				/>
			) }
			<ToggleControl
				label={ __( 'Pending (hidden on frontend)', 'sgs-blocks' ) }
				help={ __( 'Keep the slot in the editor but hide it from visitors until the credential is confirmed.', 'sgs-blocks' ) }
				checked={ !! item.pending }
				onChange={ ( val ) => update( 'pending', val ) }
				__nextHasNoMarginBottom
			/>
			<Button variant="secondary" isDestructive onClick={ onRemove } size="small" style={ { marginTop: '8px' } }>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

/** Inspector item editor for text-only and image-badge variants. */
function GenericBadgeItemEditor( { item, index, badgeStyle, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div style={ { borderBottom: '1px solid #ddd', paddingBottom: '12px', marginBottom: '12px' } }>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }{ item.label ? ` — ${ item.label }` : '' }
			</p>

			{ 'image-badge' === badgeStyle && (
				<MediaPicker
					value={ item.media || null }
					onChange={ ( media ) => {
						const next = { ...item, media };
						if ( next.image ) {
							next.image = undefined;
						}
						onChange( next );
					} }
					onRemove={ () => onChange( { ...item, media: null, image: undefined } ) }
					allowedTypes={ [ 'image' ] }
					label={ __( 'Badge image', 'sgs-blocks' ) }
					instructionsImage={ __( 'Choose a certification badge or logo image', 'sgs-blocks' ) }
				/>
			) }

			<TextControl
				label={ __( 'Label', 'sgs-blocks' ) }
				value={ item.label || '' }
				onChange={ ( val ) => update( 'label', val ) }
				placeholder={ __( 'BRC Certified', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Link URL (optional)', 'sgs-blocks' ) }
				value={ item.url || '' }
				onChange={ ( val ) => update( 'url', val ) }
				type="url"
				__nextHasNoMarginBottom
			/>
			<Button variant="secondary" isDestructive onClick={ onRemove } size="small" style={ { marginTop: '8px' } }>
				{ __( 'Remove badge', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

// ─── Main Edit component ──────────────────────────────────────────────────────
export default function Edit( { attributes, setAttributes } ) {
	const {
		badgeStyle,
		items,
		title,
		titleColour,
		labelColour,
		badgeSize,
		iconCircleSize,
		iconCircleBackground,
		iconColour,
		iconCircleBorderRadius,
		iconCircleShadow,
		badgeImageBorderRadius,
		badgeImageSize,
		badgeImageShadow,
		badgeImageObjectFit,
		textColour,
		columns,
		gap,
		autoScroll,
		autoScrollSpeed,
		autoScrollPauseOnHover,
	} = attributes;

	const circleBgValue  = colourVar( iconCircleBackground ) || '#ffffff';
	const iconColorValue = colourVar( iconColour ) || 'currentColor';
	const textColorValue = colourVar( textColour ) || undefined;

	// Build className based on active variant.
	const blockClassName = [
		'sgs-trust-bar',
		`sgs-trust-bar--${ badgeStyle }`,
		`sgs-trust-bar--${ badgeSize }`,
	].join( ' ' );

	const circleRadiusValue = ( iconCircleBorderRadius && iconCircleBorderRadius !== '50%' )
		? iconCircleBorderRadius
		: undefined;
	const circleShadowValue = iconCircleShadow
		? `var(--wp--preset--shadow--${ iconCircleShadow })`
		: undefined;

	const blockProps = useBlockProps( {
		className: blockClassName,
		style: badgeStyle === 'icon-circle' ? {
			'--sgs-trust-bar-gap': gapCssValue( gap ),
			'--sgs-trust-badge-circle-size': iconCircleSize !== 44 ? `${ iconCircleSize }px` : undefined,
			'--sgs-trust-badge-circle-bg': circleBgValue,
			'--sgs-trust-badge-icon-colour': iconColorValue,
			'--sgs-trust-badge-text-colour': textColorValue,
			'--sgs-trust-badge-circle-radius': circleRadiusValue,
			'--sgs-trust-badge-circle-shadow': circleShadowValue,
		} : {},
	} );

	const updateItem = ( index, updated ) => {
		const next = [ ...items ];
		next[ index ] = updated;
		setAttributes( { items: next } );
	};

	const removeItem = ( index ) => {
		setAttributes( { items: items.filter( ( _, i ) => i !== index ) } );
	};

	const addItem = () => {
		const newItem = badgeStyle === 'icon-circle'
			? { icon: 'check', label: '', pending: false }
			: { label: '', url: '' };
		setAttributes( { items: [ ...items, newItem ] } );
	};

	return (
		<>
			<InspectorControls>

				{ /* ── Section (outer): width + min-height ──────────────────── */ }
				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
					<ResponsiveControl label={ __( 'Min height', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'minHeight',
								tablet: 'minHeightTablet',
								mobile: 'minHeightMobile',
							};
							return (
								<SelectControl
									value={ attributes[ attrMap[ breakpoint ] ] || '' }
									options={ MIN_HEIGHT_OPTIONS }
									onChange={ ( val ) => setAttributes( { [ attrMap[ breakpoint ] ]: val } ) }
									help={ breakpoint === 'desktop'
										? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
										: undefined }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				{ /* ── Padding & margin (box-object tiers) ───────────────────── */ }
				{ /* Box-object interface contract (.claude/plans/2026-07-09-box-object-interface-contract.md
				     §5): base tier writes to the WP-native style.spacing object (also visible
				     in the Styles > Dimensions panel); tablet/mobile write to the
				     paddingTablet/paddingMobile + marginTablet/marginMobile object attrs
				     read by the shared wrapper's @media tiers. Mirrors sgs/container's edit.js. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, padding: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'paddingTablet' : 'paddingMobile' ]: next,
								} );
							}
						} }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, margin: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'marginTablet' : 'marginMobile' ]: next,
								} );
							}
						} }
					/>
				</PanelBody>

				{ /* ── Content band (Layer 2 __inner) — object attrs ─────────── */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.', 'sgs-blocks' ) }
					</p>
					<DesignTokenPicker
						label={ __( 'Band background colour', 'sgs-blocks' ) }
						value={ attributes.contentBandBackground || '' }
						onChange={ ( val ) => setAttributes( { contentBandBackground: val } ) }
					/>
					<ResponsiveBoxControl
						label={ __( 'Band padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.contentBandPadding ?? {},
							tablet: attributes.contentBandPaddingTablet ?? {},
							mobile: attributes.contentBandPaddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const attrMap = {
								base: 'contentBandPadding',
								tablet: 'contentBandPaddingTablet',
								mobile: 'contentBandPaddingMobile',
							};
							setAttributes( { [ attrMap[ tier ] ]: next } );
						} }
					/>
				</PanelBody>

				{ /* ── Layout (grid/flex, columns, gap) ──────────────────────── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>

				{ /* ── Grid item defaults ─────────────────────────────────────── */ }
				<GridItemDefaultsPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Background (image/video/svg/overlay) ──────────────────── */ }
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Shadow ─────────────────────────────────────────────────── */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ attributes.shadow || '' }
						options={ SHADOW_OPTIONS }
						onChange={ ( val ) => setAttributes( { shadow: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Shape dividers ─────────────────────────────────────────── */ }
				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Variant + size ────────────────────────────────────────── */ }
				<PanelBody title={ __( 'Style', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Badge style', 'sgs-blocks' ) }
						value={ badgeStyle }
						options={ BADGE_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { badgeStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					{ /* Badge size only applies to text-only and image-badge variants.
					     In icon-circle mode, sizing is controlled by the Icon circle size
					     range control in the Appearance panel — showing this control there
					     would create a dead second size control with no visible effect. */ }
					{ badgeStyle !== 'icon-circle' && (
						<SelectControl
							label={ __( 'Badge size', 'sgs-blocks' ) }
							value={ badgeSize }
							options={ BADGE_SIZE_OPTIONS }
							onChange={ ( val ) => setAttributes( { badgeSize: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
					<p style={ { fontSize: '12px', fontWeight: 600, marginBottom: '4px' } }>
						{ __( 'Label typography', 'sgs-blocks' ) }
					</p>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="label"
						showLineHeight={ false }
					/>
				</PanelBody>

				{ /* ── Optional title (text-only + image-badge) ─────────────── */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<PanelBody title={ __( 'Title', 'sgs-blocks' ) } initialOpen={ false }>
						<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
							{ __( 'Optional heading above the badge row.', 'sgs-blocks' ) }
						</p>
						<DesignTokenPicker
							label={ __( 'Title colour', 'sgs-blocks' ) }
							value={ titleColour }
							onChange={ ( val ) => setAttributes( { titleColour: val } ) }
						/>
						<TypographyControls
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="title"
						/>
					</PanelBody>
				) }

				{ /* ── icon-circle appearance controls ──────────────────────── */ }
				{ badgeStyle === 'icon-circle' && (
					<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
						<RangeControl
							label={ __( 'Icon circle size (px)', 'sgs-blocks' ) }
							value={ iconCircleSize }
							onChange={ ( val ) => setAttributes( { iconCircleSize: val } ) }
							min={ 36 }
							max={ 64 }
							step={ 2 }
							__nextHasNoMarginBottom
						/>
						<DesignTokenPicker
							label={ __( 'Icon circle background', 'sgs-blocks' ) }
							value={ iconCircleBackground }
							onChange={ ( val ) => setAttributes( { iconCircleBackground: val } ) }
						/>
						<TextControl
							label={ __( 'Icon circle border radius', 'sgs-blocks' ) }
							value={ iconCircleBorderRadius }
							onChange={ ( val ) => setAttributes( { iconCircleBorderRadius: val } ) }
							help={ __( "CSS border-radius, e.g. '50%' (circle), '8px' (rounded square).", 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Icon circle shadow', 'sgs-blocks' ) }
							value={ iconCircleShadow }
							options={ [
								{ label: __( 'None', 'sgs-blocks' ),   value: '' },
								{ label: __( 'Small', 'sgs-blocks' ),  value: 'sm' },
								{ label: __( 'Medium', 'sgs-blocks' ), value: 'md' },
								{ label: __( 'Large', 'sgs-blocks' ),  value: 'lg' },
							] }
							onChange={ ( val ) => setAttributes( { iconCircleShadow: val } ) }
							__nextHasNoMarginBottom
						/>
						<DesignTokenPicker
							label={ __( 'Icon colour', 'sgs-blocks' ) }
							value={ iconColour }
							onChange={ ( val ) => setAttributes( { iconColour: val } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Label colour', 'sgs-blocks' ) }
							value={ textColour }
							onChange={ ( val ) => setAttributes( { textColour: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── image-badge appearance controls ──────────────────────── */ }
				{ badgeStyle === 'image-badge' && (
					<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
						<RangeControl
							label={ __( 'Badge image size (px)', 'sgs-blocks' ) }
							value={ badgeImageSize }
							onChange={ ( val ) => setAttributes( { badgeImageSize: val } ) }
							min={ 24 }
							max={ 160 }
							step={ 4 }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Image fit', 'sgs-blocks' ) }
							value={ badgeImageObjectFit }
							options={ [
								{ label: __( 'Contain (show whole logo)', 'sgs-blocks' ), value: 'contain' },
								{ label: __( 'Cover (fill the box)', 'sgs-blocks' ), value: 'cover' },
							] }
							onChange={ ( val ) => setAttributes( { badgeImageObjectFit: val } ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Badge image border radius', 'sgs-blocks' ) }
							value={ badgeImageBorderRadius }
							onChange={ ( val ) => setAttributes( { badgeImageBorderRadius: val } ) }
							help={ __( "CSS border-radius, e.g. '8px' (rounded), '50%' (circle). Leave blank for square corners.", 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Badge image shadow', 'sgs-blocks' ) }
							value={ badgeImageShadow }
							options={ [
								{ label: __( 'None', 'sgs-blocks' ),   value: '' },
								{ label: __( 'Small', 'sgs-blocks' ),  value: 'sm' },
								{ label: __( 'Medium', 'sgs-blocks' ), value: 'md' },
								{ label: __( 'Large', 'sgs-blocks' ),  value: 'lg' },
							] }
							onChange={ ( val ) => setAttributes( { badgeImageShadow: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── text-only / image-badge label styling ─────────────────── */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<PanelBody title={ __( 'Label styling', 'sgs-blocks' ) } initialOpen={ false }>
						<DesignTokenPicker
							label={ __( 'Label colour', 'sgs-blocks' ) }
							value={ labelColour }
							onChange={ ( val ) => setAttributes( { labelColour: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── Layout (icon-circle only) ─────────────────────────────── */ }
				{ badgeStyle === 'icon-circle' && (
					<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
						<RangeControl
							label={ __( 'Columns (at 600px+)', 'sgs-blocks' ) }
							value={ columns }
							onChange={ ( val ) => setAttributes( { columns: val } ) }
							min={ 2 }
							max={ 6 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						{ /* Gap between badges is provided by the shared ContainerWrapperControls
						     "Gap" responsive control (writes the same `gap` attr via the wrapper
						     helper). Removed here to eliminate UI duplication. */ }
					</PanelBody>
				) }

				{ /* ── Auto-scroll ───────────────────────────────────────────── */ }
				<PanelBody title={ __( 'Auto-scroll', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Enable auto-scroll', 'sgs-blocks' ) }
						help={ __( 'When the number of badges exceeds what fits on screen, the row scrolls automatically like a marquee.', 'sgs-blocks' ) }
						checked={ !! autoScroll }
						onChange={ ( val ) => setAttributes( { autoScroll: val } ) }
						__nextHasNoMarginBottom
					/>
					{ autoScroll && (
						<>
							<SelectControl
								label={ __( 'Scroll speed', 'sgs-blocks' ) }
								value={ autoScrollSpeed }
								options={ AUTO_SCROLL_SPEED_OPTIONS }
								onChange={ ( val ) => setAttributes( { autoScrollSpeed: val } ) }
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Pause on hover', 'sgs-blocks' ) }
								checked={ !! autoScrollPauseOnHover }
								onChange={ ( val ) => setAttributes( { autoScrollPauseOnHover: val } ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{ /* ── Badge items repeater ───────────────────────────────────── */ }
				<PanelBody title={ __( 'Badges', 'sgs-blocks' ) }>
					{ badgeStyle === 'icon-circle' && (
						<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
							{ __( 'Badges marked "Pending" are hidden on the frontend but remain editable.', 'sgs-blocks' ) }
						</p>
					) }
					{ items.map( ( item, index ) => (
						badgeStyle === 'icon-circle' ? (
							<IconCircleItemEditor
								key={ index }
								item={ item }
								onChange={ ( updated ) => updateItem( index, updated ) }
								onRemove={ () => removeItem( index ) }
							/>
						) : (
							<GenericBadgeItemEditor
								key={ index }
								item={ item }
								index={ index }
								badgeStyle={ badgeStyle }
								onChange={ ( updated ) => updateItem( index, updated ) }
								onRemove={ () => removeItem( index ) }
							/>
						)
					) ) }
					<Button
						variant="secondary"
						onClick={ addItem }
						style={ { width: '100%', justifyContent: 'center' } }
					>
						{ __( 'Add badge', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

			</InspectorControls>

			{ /* ── Editor canvas ───────────────────────────────────────────── */ }
			<div { ...blockProps }>

				{ /* Optional title (text-only + image-badge variants) */ }
				{ ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
					<RichText
						tagName="p"
						className="sgs-trust-bar__title"
						value={ title }
						onChange={ ( val ) => setAttributes( { title: val } ) }
						placeholder={ __( 'Trusted certifications & memberships', 'sgs-blocks' ) }
						style={ {
							color: colourVar( titleColour ) || undefined,
						} }
					/>
				) }

				{ /* ── Curated items preview ───────────────────────────────── */ }
				{ items.length === 0 ? (
						<p style={ { color: '#757575', fontStyle: 'italic' } }>
							{ __( 'Add badges in the sidebar panel.', 'sgs-blocks' ) }
						</p>
					) : (
						items.map( ( item, index ) => {
							if ( badgeStyle === 'icon-circle' ) {
								const isPending = !! item.pending;
								return (
									<div
										key={ index }
										className="sgs-trust-bar__badge"
										style={ { opacity: isPending ? 0.45 : 1 } }
										title={ isPending ? __( 'Pending — hidden on frontend', 'sgs-blocks' ) : undefined }
									>
										<EditorIconCircle
											size={ iconCircleSize }
											circleBg={ circleBgValue }
											iconColour={ iconColorValue }
											iconSlug={ item.icon || 'check' }
											borderRadius={ iconCircleBorderRadius !== '50%' ? iconCircleBorderRadius : undefined }
											boxShadow={ circleShadowValue }
											filled={ item.fillStyle === 'filled' }
											fillColour={ item.fillColour }
										/>
										<span className="sgs-trust-bar__label" style={ { color: textColorValue } }>
											{ item.label || <em>{ __( '(no label)', 'sgs-blocks' ) }</em> }
											{ isPending && (
												<span style={ {
													marginLeft: '6px', fontSize: '10px', fontWeight: 600,
													textTransform: 'uppercase', background: '#f0ad4e',
													color: '#fff', padding: '1px 5px', borderRadius: '3px',
													letterSpacing: '0.05em',
												} }>
													{ __( 'Pending', 'sgs-blocks' ) }
												</span>
											) }
										</span>
									</div>
								);
							}

							if ( badgeStyle === 'text-only' ) {
								return (
									<div key={ index } className="sgs-trust-bar__badge">
										<span
											className="sgs-trust-bar__badge-label"
											style={ {
												color: colourVar( labelColour ) || undefined,
											} }
										>
											{ item.label || <em>{ __( '(no label)', 'sgs-blocks' ) }</em> }
										</span>
									</div>
								);
							}

							// image-badge
							const mediaUrl = item.media?.url || item.image?.url || '';
							const mediaAlt = item.media?.alt || item.label || '';
							return (
								<div key={ index } className="sgs-trust-bar__badge">
									{ mediaUrl && (
										<img
											src={ mediaUrl }
											alt={ mediaAlt }
											className="sgs-trust-bar__badge-img"
											style={ {
												width: `${ badgeImageSize }px`,
												height: `${ badgeImageSize }px`,
												objectFit: badgeImageObjectFit === 'cover' ? 'cover' : 'contain',
												borderRadius: badgeImageBorderRadius || undefined,
												boxShadow: badgeImageShadow
													? `var(--wp--preset--shadow--${ badgeImageShadow })`
													: undefined,
											} }
										/>
									) }
									{ item.label && (
										<span
											className="sgs-trust-bar__badge-label"
											style={ {
												color: colourVar( labelColour ) || undefined,
											} }
										>
											{ item.label }
										</span>
									) }
								</div>
							);
						} )
					)
				}
			</div>
		</>
	);
}
