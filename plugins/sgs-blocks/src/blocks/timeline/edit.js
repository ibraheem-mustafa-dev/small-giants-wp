import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	IconPicker,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
} from '../../components';
import { colourVar } from '../../utils';

// ── Select options ──────────────────────────────────────────────────────────

const ORIENTATION_OPTIONS = [
	{ label: __( 'Vertical', 'sgs-blocks' ), value: 'vertical' },
	{ label: __( 'Horizontal', 'sgs-blocks' ), value: 'horizontal' },
];

const ALIGNMENT_OPTIONS = [
	{ label: __( 'Alternating', 'sgs-blocks' ), value: 'alternating' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
];

const CONNECTOR_OPTIONS = [
	{ label: __( 'Solid line', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
];

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
	{ label: __( 'Groove', 'sgs-blocks' ), value: 'groove' },
	{ label: __( 'Ridge', 'sgs-blocks' ), value: 'ridge' },
	{ label: __( 'Inset', 'sgs-blocks' ), value: 'inset' },
	{ label: __( 'Outset', 'sgs-blocks' ), value: 'outset' },
];

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/**
 * Build the editor-canvas preview style for the root `<ol>` — mirrors
 * render.php's scoped output (base tier only; responsive tiers are PHP-only,
 * per the other no-inline-migrated blocks). Native WP supports
 * (color/typography/spacing/border-radius/shadow) declare
 * `__experimentalSkipSerialization`, which ALSO suppresses useBlockProps()'s
 * own inline-style generation in the editor — so the canvas needs this
 * manual reconstruction for visual parity, exactly like sgs/quote.
 */
function buildRootPreviewStyle( attributes ) {
	const { style, borderWidth, borderStyle, borderColour } = attributes;
	const previewStyle = {};

	const colourText = style?.color?.text;
	if ( colourText ) {
		previewStyle.color = colourText;
	}
	const colourBg = style?.color?.background;
	if ( colourBg ) {
		previewStyle.backgroundColor = colourBg;
	}

	if ( style?.shadow ) {
		previewStyle.boxShadow = style.shadow;
	}

	const radiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		previewStyle.borderRadius = radiusPreview;
	} else if ( typeof style?.border?.radius === 'string' && style.border.radius ) {
		previewStyle.borderRadius = style.border.radius;
	}

	if ( borderStyle && borderStyle !== 'none' ) {
		const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
		if ( borderWidthPreview ) {
			previewStyle.borderWidth = borderWidthPreview;
		}
		previewStyle.borderStyle = borderStyle;
		if ( borderColour ) {
			previewStyle.borderColor = /^#|^rgb|^hsl/.test( borderColour )
				? borderColour
				: colourVar( borderColour );
		}
	}

	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		previewStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		previewStyle.margin = marginPreview;
	}

	const typography = style?.typography ?? {};
	if ( typography.fontSize ) previewStyle.fontSize = typography.fontSize;
	if ( typography.lineHeight ) previewStyle.lineHeight = typography.lineHeight;
	if ( typography.textAlign ) previewStyle.textAlign = typography.textAlign;
	if ( typography.letterSpacing ) previewStyle.letterSpacing = typography.letterSpacing;
	if ( typography.textTransform ) previewStyle.textTransform = typography.textTransform;
	if ( typography.fontWeight ) previewStyle.fontWeight = typography.fontWeight;
	if ( typography.fontStyle ) previewStyle.fontStyle = typography.fontStyle;

	return previewStyle;
}

// ── Entry editor sub-component ──────────────────────────────────────────────

function EntryEditor( { entry, index, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...entry, [ key ]: value } );

	return (
		<div
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<TextControl
				label={ __( 'Date', 'sgs-blocks' ) }
				value={ entry.date || '' }
				onChange={ ( val ) => update( 'date', val ) }
				placeholder="YYYY-MM-DD or e.g. January 2024"
				help={ __( 'Used as the visible label and the datetime attribute.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ entry.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
			/>
			<div style={ { marginTop: '8px', marginBottom: '8px' } }>
				<label
					style={ {
						display: 'block',
						marginBottom: '4px',
						fontSize: '11px',
						fontWeight: '500',
						textTransform: 'uppercase',
					} }
				>
					{ __( 'Description', 'sgs-blocks' ) }
				</label>
				<RichText
					tagName="div"
					value={ entry.description || '' }
					onChange={ ( val ) => update( 'description', val ) }
					placeholder={ __( 'Entry description…', 'sgs-blocks' ) }
					allowedFormats={ [
						'core/bold',
						'core/italic',
						'core/link',
						'core/text-color',
					] }
					style={ {
						border: '1px solid #ddd',
						borderRadius: '2px',
						padding: '8px',
						minHeight: '60px',
					} }
				/>
			</div>
			<IconPicker
				label={ __( 'Icon (optional)', 'sgs-blocks' ) }
				value={ { source: 'lucide', name: entry.icon || '' } }
				onChange={ ( { name } ) => update( 'icon', name ) }
				sources={ [ 'lucide' ] }
			/>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={ ( media ) => update( 'image', media.id ) }
					allowedTypes={ [ 'image' ] }
					value={ entry.image || 0 }
					render={ ( { open } ) => (
						<Button
							variant="secondary"
							onClick={ open }
							style={ { marginTop: '8px', marginBottom: '8px' } }
						>
							{ entry.image
								? __( 'Change image', 'sgs-blocks' )
								: __( 'Add image (optional)', 'sgs-blocks' ) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ entry.image > 0 && (
				<Button
					variant="tertiary"
					isDestructive
					onClick={ () => update( 'image', 0 ) }
					size="small"
					style={ { display: 'block', marginBottom: '8px' } }
				>
					{ __( 'Remove image', 'sgs-blocks' ) }
				</Button>
			) }
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '4px' } }
			>
				{ __( 'Remove entry', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

// ── Main Edit component ─────────────────────────────────────────────────────

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		orientation,
		alignment,
		entries,
		connectorStyle,
		connectorColour,
		dateColour,
		revealOnScroll,
		revealStagger,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		borderRadiusTablet,
		borderRadiusMobile,
		borderWidth,
		borderColour,
		borderStyle,
	} = attributes;

	// Build preview class list mirroring render.php.
	const previewClasses = [
		'sgs-timeline',
		`sgs-timeline--${ orientation }`,
		orientation === 'vertical' ? `sgs-timeline--align-${ alignment }` : '',
		`sgs-timeline--connector-${ connectorStyle }`,
	].filter( Boolean ).join( ' ' );

	// Contract §A: the pre-existing --sgs-connector-colour / --sgs-date-colour
	// custom-property VALUES stay inline (a `--var:value` is not a property
	// declaration). Everything else (colour/typography/spacing/border/shadow)
	// is reconstructed from the skip-serialised style object for editor-canvas
	// parity with render.php's scoped output (contract §5).
	const blockProps = useBlockProps( {
		className: previewClasses,
		style: {
			'--sgs-connector-colour': connectorColour
				? `var(--wp--preset--color--${ connectorColour })`
				: undefined,
			'--sgs-date-colour': dateColour
				? `var(--wp--preset--color--${ dateColour })`
				: undefined,
			...buildRootPreviewStyle( attributes ),
		},
	} );

	const updateEntry = ( index, updated ) => {
		const next = [ ...entries ];
		next[ index ] = updated;
		setAttributes( { entries: next } );
	};

	const removeEntry = ( index ) => {
		setAttributes( { entries: entries.filter( ( _, i ) => i !== index ) } );
	};

	const addEntry = () => {
		setAttributes( {
			entries: [
				...entries,
				{
					date: '',
					title: '',
					description: '',
					icon: '',
					image: 0,
				},
			],
		} );
	};

	return (
		<>
			<InspectorControls>
				{/* ── Entries ── */}
				<PanelBody title={ __( 'Timeline entries', 'sgs-blocks' ) }>
					{ entries.map( ( entry, index ) => (
						<EntryEditor
							key={ index }
							entry={ entry }
							index={ index }
							onChange={ ( updated ) => updateEntry( index, updated ) }
							onRemove={ () => removeEntry( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addEntry }>
						{ __( 'Add entry', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				{/* ── Layout ── */}
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Orientation', 'sgs-blocks' ) }
						value={ orientation }
						options={ ORIENTATION_OPTIONS }
						onChange={ ( val ) => setAttributes( { orientation: val } ) }
						__nextHasNoMarginBottom
					/>
					{ orientation === 'vertical' && (
						<SelectControl
							label={ __( 'Alignment', 'sgs-blocks' ) }
							value={ alignment }
							options={ ALIGNMENT_OPTIONS }
							onChange={ ( val ) => setAttributes( { alignment: val } ) }
							help={ __( 'Alternating flips content left/right on each entry.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{/* ── Connector ── */}
				<PanelBody title={ __( 'Connector', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Connector style', 'sgs-blocks' ) }
						value={ connectorStyle }
						options={ CONNECTOR_OPTIONS }
						onChange={ ( val ) => setAttributes( { connectorStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Connector colour', 'sgs-blocks' ) }
						value={ connectorColour }
						onChange={ ( val ) => setAttributes( { connectorColour: val } ) }
					/>
				</PanelBody>

				{/* ── Spacing ── Box-object interface contract §B/§E: padding/margin
				   base routes to WP-native style.spacing.* (skip-serialised → scoped,
				   not inline); tiers are the paddingTablet/paddingMobile +
				   marginTablet/marginMobile object attrs. */}
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
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

				{/* ── Border ── Box-object interface contract §1/§5: borderWidth is
				   an SGS custom object attr (base only, no tiers — no WP-native
				   per-side width support); border-radius routes to WP-native
				   style.border.radius (base) + borderRadiusTablet/Mobile tiers. */}
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Border style', 'sgs-blocks' ) }
						value={ borderStyle }
						options={ BORDER_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					{ borderStyle !== 'none' && (
						<>
							<DesignTokenPicker
								label={ __( 'Border colour', 'sgs-blocks' ) }
								value={ borderColour }
								onChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
							/>
							<ResponsiveBoxControl
								label={ __( 'Border width', 'sgs-blocks' ) }
								values={ { base: borderWidth ?? {} } }
								showResponsive={ false }
								onChange={ ( tier, next ) => setAttributes( { borderWidth: next } ) }
							/>
						</>
					) }
					<ResponsiveBorderRadiusControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						values={ {
							base: style?.border?.radius ?? {},
							tablet: borderRadiusTablet ?? {},
							mobile: borderRadiusMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } );
							} else {
								setAttributes( { [ `borderRadius${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>

				{/* ── Colours ── */}
				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Date colour', 'sgs-blocks' ) }
						value={ dateColour }
						onChange={ ( val ) => setAttributes( { dateColour: val } ) }
					/>
				</PanelBody>

				{/* ── Animation ── */}
				<PanelBody title={ __( 'Scroll reveal', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Reveal on scroll', 'sgs-blocks' ) }
						checked={ revealOnScroll }
						onChange={ ( val ) => setAttributes( { revealOnScroll: val } ) }
						help={ __(
							'Entries animate in as they enter the viewport. Disable to show all entries immediately.',
							'sgs-blocks'
						) }
					/>
					{ revealOnScroll && (
						<RangeControl
							label={ __( 'Stagger delay (ms)', 'sgs-blocks' ) }
							value={ revealStagger }
							onChange={ ( val ) => setAttributes( { revealStagger: val } ) }
							min={ 0 }
							max={ 500 }
							step={ 25 }
							help={ __(
								'Delay between each entry animating in.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* ── Editor preview ── */ }
			<ol { ...blockProps }>
				{ entries.map( ( entry, index ) => (
					<li key={ index } className="sgs-timeline__entry is-revealed">
						<time className="sgs-timeline__date">
							{ entry.date || __( 'Date', 'sgs-blocks' ) }
						</time>
						<div className="sgs-timeline__node" aria-hidden="true" />
						<div className="sgs-timeline__content">
							<RichText.Content
								tagName="h3"
								className="sgs-timeline__title"
								value={ entry.title || __( 'Entry title', 'sgs-blocks' ) }
							/>
							{ entry.description && (
								<RichText.Content
									tagName="div"
									className="sgs-timeline__description"
									value={ entry.description }
								/>
							) }
						</div>
					</li>
				) ) }
			</ol>
		</>
	);
}
