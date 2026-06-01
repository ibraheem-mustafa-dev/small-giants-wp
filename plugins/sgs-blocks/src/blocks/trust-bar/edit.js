import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText, useInnerBlocksProps } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
	RangeControl,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar, fontSizeVar } from '../../utils';

// ─── Icon options (icon-circle variant) ───────────────────────────────────────
const ICON_OPTIONS = [
	{ label: __( 'Home', 'sgs-blocks' ),              value: 'home' },
	{ label: __( 'Tick / Check', 'sgs-blocks' ),       value: 'check' },
	{ label: __( 'Truck / Delivery', 'sgs-blocks' ),   value: 'truck' },
	{ label: __( 'Star', 'sgs-blocks' ),               value: 'star' },
	{ label: __( 'Moon / Halal', 'sgs-blocks' ),       value: 'moon' },
	{ label: __( 'Shield Check', 'sgs-blocks' ),       value: 'shield-check' },
	{ label: __( 'Award', 'sgs-blocks' ),              value: 'award' },
	{ label: __( 'Heart', 'sgs-blocks' ),              value: 'heart' },
	{ label: __( 'Leaf', 'sgs-blocks' ),               value: 'leaf' },
	{ label: __( 'Zap / Energy', 'sgs-blocks' ),       value: 'zap' },
	{ label: __( 'Clock', 'sgs-blocks' ),              value: 'clock' },
	{ label: __( 'Package', 'sgs-blocks' ),            value: 'package' },
	{ label: __( 'Users / People', 'sgs-blocks' ),     value: 'users' },
	{ label: __( 'Globe', 'sgs-blocks' ),              value: 'globe' },
	{ label: __( 'Badge Check', 'sgs-blocks' ),        value: 'badge-check' },
	{ label: __( 'Thumbs Up', 'sgs-blocks' ),          value: 'thumbs-up' },
	{ label: __( 'Flame', 'sgs-blocks' ),              value: 'flame' },
	{ label: __( 'Gift', 'sgs-blocks' ),               value: 'gift' },
	{ label: __( 'Baby', 'sgs-blocks' ),               value: 'baby' },
	{ label: __( 'Milk', 'sgs-blocks' ),               value: 'milk' },
];

const GAP_OPTIONS = [
	{ label: __( 'Tight (8px)', 'sgs-blocks' ),    value: '10' },
	{ label: __( 'Normal (16px)', 'sgs-blocks' ),   value: '20' },
	{ label: __( 'Relaxed (24px)', 'sgs-blocks' ),  value: '30' },
	{ label: __( 'Spacious (32px)', 'sgs-blocks' ), value: '40' },
];

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

/**
 * Source mode options for the Content Source inspector panel.
 * Mirrors the FR-24-2 / FR-24-10 Typed-vs-Bound pattern.
 */
const SOURCE_MODE_OPTIONS = [
	{
		label: __( 'Typed — curated repeater (default)', 'sgs-blocks' ),
		value: 'typed',
	},
	{
		label: __( 'Bound — block children (converter / advanced)', 'sgs-blocks' ),
		value: 'bound',
	},
];

/**
 * Default template for the InnerBlocks slot in Bound mode.
 * Provides one sgs/container (the __inner row) with a placeholder sgs/container
 * for a single badge child, matching the converter's emitted shape:
 *   sgs/trust-bar
 *     └─ sgs/container.sgs-trust-bar__inner
 *          └─ sgs/container.sgs-trust-bar__badge
 *               ├─ sgs/icon
 *               └─ sgs/text
 *
 * The template is only shown when the InnerBlocks slot is empty. Once the
 * converter fills it with real badge children, the template is ignored.
 */
const BOUND_TEMPLATE = [
	[
		'sgs/container',
		{ className: 'sgs-trust-bar__inner' },
		[
			[
				'sgs/container',
				{ className: 'sgs-trust-bar__badge' },
				[],
			],
		],
	],
];

// ─── Editor sub-components ────────────────────────────────────────────────────

/** Simple circle placeholder for icon-circle variant preview in editor. */
function EditorIconCircle( { size, circleBg, iconColour } ) {
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
			} }
		>
			<svg
				width={ Math.round( size * 0.45 ) }
				height={ Math.round( size * 0.45 ) }
				viewBox="0 0 24 24"
				fill="none"
				stroke={ iconColour || 'currentColor' }
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="8" />
			</svg>
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
			<SelectControl
				label={ __( 'Icon', 'sgs-blocks' ) }
				value={ item.icon || 'check' }
				options={ ICON_OPTIONS }
				onChange={ ( val ) => update( 'icon', val ) }
				__nextHasNoMarginBottom
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
		sourceMode,
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

	const isTyped = sourceMode !== 'bound';

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
			'--sgs-trust-bar-gap': gap ? `var(--wp--preset--spacing--${ gap })` : undefined,
			'--sgs-trust-badge-circle-size': iconCircleSize !== 44 ? `${ iconCircleSize }px` : undefined,
			'--sgs-trust-badge-circle-bg': circleBgValue,
			'--sgs-trust-badge-icon-colour': iconColorValue,
			'--sgs-trust-badge-text-colour': textColorValue,
		} : {},
	} );

	/**
	 * InnerBlocks slot for Bound mode.
	 * useInnerBlocksProps wires proper block-editor integration (drag-and-drop,
	 * selection, inserter). The template renders when the slot is empty.
	 */
	const innerBlocksProps = useInnerBlocksProps(
		{},
		{
			template: BOUND_TEMPLATE,
			templateLock: false,
			renderAppender: false,
		}
	);

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

				{ /* ── Content source (Typed vs Bound) ──────────────────────── */ }
				<PanelBody title={ __( 'Content source', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Source mode', 'sgs-blocks' ) }
						help={
							isTyped
								? __( 'Typed: manage badges via the curated repeater below. All variant controls are active.', 'sgs-blocks' )
								: __( 'Bound: badges are block children (e.g. converter-emitted). Edit them directly on the canvas.', 'sgs-blocks' )
						}
						value={ sourceMode }
						options={ SOURCE_MODE_OPTIONS }
						onChange={ ( val ) => setAttributes( { sourceMode: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Variant + size (both modes — affects wrapper classes) ── */ }
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

				{ /* ── Optional title (text-only + image-badge — both modes) ── */ }
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

				{ /* ── icon-circle appearance controls (Typed mode only) ─────── */ }
				{ isTyped && badgeStyle === 'icon-circle' && (
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

				{ /* ── text-only / image-badge label styling (Typed mode only) ── */ }
				{ isTyped && ( badgeStyle === 'text-only' || badgeStyle === 'image-badge' ) && (
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

				{ /* ── Layout (icon-circle only, Typed mode only) ─────────────── */ }
				{ isTyped && badgeStyle === 'icon-circle' && (
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
						<SelectControl
							label={ __( 'Gap between badges', 'sgs-blocks' ) }
							value={ gap }
							options={ GAP_OPTIONS }
							onChange={ ( val ) => setAttributes( { gap: val } ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ── Auto-scroll (both modes — view.js works the same way) ──── */ }
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

				{ /* ── Badge items repeater (Typed mode only) ──────────────────── */ }
				{ isTyped && (
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
				) }

			</InspectorControls>

			{ /* ── Editor canvas ───────────────────────────────────────────── */ }
			<div { ...blockProps }>

				{ /* Optional title (text-only + image-badge variants) — both modes */ }
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

				{ /* ── BOUND MODE — InnerBlocks slot ──────────────────────── */ }
				{ ! isTyped && (
					<div { ...innerBlocksProps } />
				) }

				{ /* ── TYPED MODE — curated items preview ─────────────────── */ }
				{ isTyped && (
					items.length === 0 ? (
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
				) }
			</div>
		</>
	);
}
