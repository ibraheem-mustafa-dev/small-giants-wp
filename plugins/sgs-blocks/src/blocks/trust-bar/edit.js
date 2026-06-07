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
import { DesignTokenPicker, IconPicker, IconPreview } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar, fontSizeVar } from '../../utils';
// WS-4: shared container-wrapper editor controls (section kind = full surface).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

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

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ),   value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ),  value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ),   value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ),      value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ),     value: 'xx-large' },
];

const AUTO_SCROLL_SPEED_OPTIONS = [
	{ label: __( 'Slow (40s)', 'sgs-blocks' ),   value: 'slow' },
	{ label: __( 'Medium (25s)', 'sgs-blocks' ),  value: 'medium' },
	{ label: __( 'Fast (15s)', 'sgs-blocks' ),    value: 'fast' },
];

// ─── Editor sub-components ────────────────────────────────────────────────────

/** Circle wrapper with the actual selected icon for editor preview. */
function EditorIconCircle( { size, circleBg, iconColour, iconSlug } ) {
	return (
		<span
			className="sgs-trust-bar__circle"
			aria-hidden="true"
			style={ {
				width: size,
				height: size,
				borderRadius: '50%',
				backgroundColor: circleBg || '#ffffff',
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
				color: iconColour || 'currentColor',
			} }
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
		titleFontSize,
		labelColour,
		labelFontSize,
		badgeSize,
		iconCircleSize,
		iconCircleBackground,
		iconColour,
		textColour,
		columns,
		gap,
		showPendingInEditor,
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

	const blockProps = useBlockProps( {
		className: blockClassName,
		style: badgeStyle === 'icon-circle' ? {
			'--sgs-trust-bar-gap': gapCssValue( gap ),
			'--sgs-trust-badge-circle-size': iconCircleSize !== 44 ? `${ iconCircleSize }px` : undefined,
			'--sgs-trust-badge-circle-bg': circleBgValue,
			'--sgs-trust-badge-icon-colour': iconColorValue,
			'--sgs-trust-badge-text-colour': textColorValue,
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

				{ /* ── WS-4: mirrored sgs/container wrapper controls ─────────── */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="section"
				/>

				{ /* ── Variant + size ────────────────────────────────────────── */ }
				<PanelBody title={ __( 'Style', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Badge style', 'sgs-blocks' ) }
						value={ badgeStyle }
						options={ BADGE_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { badgeStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Badge size', 'sgs-blocks' ) }
						value={ badgeSize }
						options={ BADGE_SIZE_OPTIONS }
						onChange={ ( val ) => setAttributes( { badgeSize: val } ) }
						__nextHasNoMarginBottom
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
						<SelectControl
							label={ __( 'Title font size', 'sgs-blocks' ) }
							value={ titleFontSize || '' }
							options={ FONT_SIZE_OPTIONS }
							onChange={ ( val ) => setAttributes( { titleFontSize: val } ) }
							__nextHasNoMarginBottom
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
						<DesignTokenPicker
							label={ __( 'Icon colour', 'sgs-blocks' ) }
							value={ iconColour }
							onChange={ ( val ) => setAttributes( { iconColour: val } ) }
						/>
						<DesignTokenPicker
							label={ __( 'Label colour', 'sgs-blocks' ) }
							value={ textColour }
							onChange={ ( val ) => setAttributes( { textColour: val } ) }
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
						/>
						<SelectControl
							label={ __( 'Label font size', 'sgs-blocks' ) }
							value={ labelFontSize || '' }
							options={ FONT_SIZE_OPTIONS }
							onChange={ ( val ) => setAttributes( { labelFontSize: val } ) }
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
							fontSize: fontSizeVar( titleFontSize ) || undefined,
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
												fontSize: fontSizeVar( labelFontSize ) || undefined,
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
										/>
									) }
									{ item.label && (
										<span
											className="sgs-trust-bar__badge-label"
											style={ {
												color: colourVar( labelColour ) || undefined,
												fontSize: fontSizeVar( labelFontSize ) || undefined,
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
