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
	TextareaControl,
	Button,
	ToggleControl,
	RangeControl,
	RadioControl,
} from '@wordpress/components';
import {
	IconPicker,
	ResponsiveBoxControl,
	SgsColourPanel,
	SgsBorderControl,
} from '../../components';
import { colourVar } from '../../utils';

// ── Select options ──────────────────────────────────────────────────────────

// D649 — no JSON `enum` reliance in the UI list order; mirrors sgs/icon-list's
// allow-list exactly (render.php validates the same set independently).
const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

const ORIENTATION_OPTIONS = [
	{ label: __( 'Vertical', 'sgs-blocks' ), value: 'vertical' },
	{ label: __( 'Horizontal', 'sgs-blocks' ), value: 'horizontal' },
];

/**
 * Does this entry carry renderable media? Mirrors render.php's own test so the
 * canvas and the page agree on which entries get the media grid rows.
 *
 * @param {Object} entry One item from the `entries` array.
 * @return {boolean} True when a source exists for the selected type.
 */
function entryHasMedia( entry ) {
	const type = entry.mediaType || 'image';
	if ( 'svg' === type ) {
		return !! ( entry.svg && entry.svg.trim() );
	}
	if ( 'video' === type ) {
		return !! entry.video?.url;
	}
	return !! entry.image;
}

/**
 * Canvas preview for an image or video milestone.
 *
 * ⛔ Reads `entry.imageUrl`, a companion to the stored attachment `image` ID —
 * the SAME id+url pair `sgs/media` and `sgs/responsive-logo` use, where the ID
 * is authoritative and the URL exists so the EDITOR can paint without a REST
 * round-trip. render.php ignores the URL entirely and resolves from the ID, so a
 * re-uploaded attachment still renders correctly on the page.
 *
 * ⚠ The reason this is safe here and was a data-loss bug on sgs/responsive-logo
 * (D496): that block read an UNDECLARED `_desktopLogoUrl`, which WP silently
 * discarded on save, so every preview went `undefined` on reload. `entries` is a
 * bare array with no `items` schema, so nothing strips a companion key from it.
 *
 * @param {Object} props       Component props.
 * @param {Object} props.entry The entry to preview.
 * @return {JSX.Element|null} The preview element.
 */
function MediaPreview( { entry } ) {
	const type = entry.mediaType || 'image';
	if ( 'video' === type ) {
		return (
			<video
				className="sgs-timeline__media sgs-timeline__media--video"
				src={ entry.video?.url }
				muted
				playsInline
			/>
		);
	}
	if ( ! entry.imageUrl ) {
		// The ID is stored but no companion URL is — an entry authored before
		// this feature existed. Say so rather than rendering a broken image.
		return (
			<span className="sgs-timeline__media sgs-timeline__media--placeholder">
				{ __( 'Image set — re-select it to preview here', 'sgs-blocks' ) }
			</span>
		);
	}
	return (
		<img
			className="sgs-timeline__media sgs-timeline__media--image"
			src={ entry.imageUrl }
			alt=""
		/>
	);
}

const MEDIA_TYPE_OPTIONS = [
	{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'SVG / Animation', 'sgs-blocks' ), value: 'svg' },
];

const REVEAL_TRIGGER_OPTIONS = [
	{ label: __( 'When it scrolls into view', 'sgs-blocks' ), value: 'viewport' },
	{
		label: __( 'When the connector reaches it', 'sgs-blocks' ),
		value: 'connector',
	},
];

// Task 3a — replaces the old ALIGNMENT_OPTIONS ('alternating' / 'left' /
// 'centre'). 'centre' is retired: it folded into 'single-column' losing only
// an 8px rail-offset bug (Task 3a brief). 'same-side' (Task 3b) is two-sided
// like 'alternating' but does not flip per row — see CONTENT_SIDE_OPTIONS
// below for which side it uses.
const CONTENT_LAYOUT_OPTIONS = [
	{ label: __( 'Alternating sides', 'sgs-blocks' ), value: 'alternating' },
	{ label: __( 'Same side', 'sgs-blocks' ), value: 'same-side' },
	{ label: __( 'Single column', 'sgs-blocks' ), value: 'single-column' },
];

// Task 3b — only meaningful (and only shown) when contentLayout is
// 'same-side'. Client-facing strings name the CONTENT's side directly, per
// the brief, rather than the more abstract 'start'/'end' the value stores.
const CONTENT_SIDE_OPTIONS = [
	{ label: __( 'Content on the right', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Content on the left', 'sgs-blocks' ), value: 'start' },
];

// Task 3a — replaces the old boolean `showDateColumn`. Only takes effect when
// contentLayout is 'single-column' (mirrors render.php's date_gutter guard).
const DATE_POSITION_OPTIONS = [
	{ label: __( 'In its own column', 'sgs-blocks' ), value: 'own-column' },
	{ label: __( 'Next to the title', 'sgs-blocks' ), value: 'inline' },
];

// Mobile layout is an axis of its own (Task 2) — independent of orientation
// and alignment, and inert above 767px in either. 'stacked' is today's
// collapse, unchanged; 'carousel' is a native scroll-snap card row.
const MOBILE_LAYOUT_OPTIONS = [
	{ label: __( 'Stacked', 'sgs-blocks' ), value: 'stacked' },
	{ label: __( 'Swipeable cards', 'sgs-blocks' ), value: 'carousel' },
];

const CONNECTOR_OPTIONS = [
	{ label: __( 'Solid line', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
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
	const { style, borderWidth, borderStyle, borderColour, borderColourGradient } = attributes;
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
		// A gradient border renders frontend as a masked ::before ring, which cannot
		// be reproduced in a plain inline style — approximate it with the gradient as
		// a border-image so the canvas at least shows that a gradient is applied.
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			previewStyle.borderImage = `${ borderColourGradient } 1`;
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
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ entry.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
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
			{ /* ── Milestone media ──────────────────────────────────────────
			     Type picker follows sgs/hero's SelectControl shape rather than
			     sgs/media's ButtonGroup, so the two blocks that switch media
			     type read the same way. Hero labels the third option "SVG"
			     while sgs/media and sgs/info-box label it "SVG / Animation" —
			     the fuller label is used here because it tells a non-technical
			     client what the option is FOR. */ }
			<SelectControl
				label={ __( 'Media type', 'sgs-blocks' ) }
				value={ entry.mediaType || 'image' }
				options={ MEDIA_TYPE_OPTIONS }
				onChange={ ( value ) => update( 'mediaType', value ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ 'image' === ( entry.mediaType || 'image' ) && (
				<>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								// Both keys in ONE change: `update` replaces a
								// single key, so two calls would make the second
								// overwrite the first's entry object.
								onChange( {
									...entry,
									image: media.id,
									imageUrl: media.url,
								} )
							}
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
							onClick={ () =>
								onChange( { ...entry, image: 0, imageUrl: '' } )
							}
							size="small"
							style={ { display: 'block', marginBottom: '8px' } }
						>
							{ __( 'Remove image', 'sgs-blocks' ) }
						</Button>
					) }
				</>
			) }
			{ 'video' === entry.mediaType && (
				<>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								update( 'video', { id: media.id, url: media.url } )
							}
							allowedTypes={ [ 'video' ] }
							value={ entry.video?.id || 0 }
							render={ ( { open } ) => (
								<Button
									variant="secondary"
									onClick={ open }
									style={ { marginTop: '8px', marginBottom: '8px' } }
								>
									{ entry.video?.url
										? __( 'Change video', 'sgs-blocks' )
										: __( 'Select video', 'sgs-blocks' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
					{ entry.video?.url && (
						<Button
							variant="tertiary"
							isDestructive
							onClick={ () => update( 'video', {} ) }
							size="small"
							style={ { display: 'block', marginBottom: '8px' } }
						>
							{ __( 'Remove video', 'sgs-blocks' ) }
						</Button>
					) }
				</>
			) }
			{ 'svg' === entry.mediaType && (
				<TextareaControl
					label={ __( 'SVG code', 'sgs-blocks' ) }
					help={ __(
						'Paste the SVG markup. Scripts and event handlers are stripped when it renders.',
						'sgs-blocks'
					) }
					value={ entry.svg || '' }
					onChange={ ( value ) => update( 'svg', value ) }
					__nextHasNoMarginBottom
				/>
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
		contentLayout,
		contentSide,
		mobileLayout,
		entries,
		headingLevel,
		connectorStyle,
		connectorColour,
		connectorProgressFill,
		connectorFillColour,
		dateColour,
		revealOnScroll,
		revealTrigger,
		revealStagger,
		milestoneMediaWidth,
		milestoneMediaDecorative,
		datePosition,
		rowStripes,
		rowStripeColourA,
		rowStripeColourB,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		borderRadiusTablet,
		borderRadiusMobile,
		borderWidth,
		borderColour,
		borderColourGradient,
		borderStyle,
	} = attributes;

	// Build preview class list mirroring render.php. The class name IS the
	// contentLayout value (Task 3b — 'same-side' has its own CSS shape and no
	// longer folds into 'content-alternating').
	const previewClasses = [
		'sgs-timeline',
		`sgs-timeline--${ orientation }`,
		orientation === 'vertical' ? `sgs-timeline--content-${ contentLayout }` : '',
		orientation === 'vertical' && contentLayout === 'same-side' && contentSide === 'start'
			? 'sgs-timeline--side-start'
			: '',
		`sgs-timeline--connector-${ connectorStyle }`,
		connectorProgressFill ? 'sgs-timeline--connector-progress' : '',
		'sgs-timeline--media-under',
		rowStripes ? 'sgs-timeline--row-stripes' : '',
		'carousel' === mobileLayout ? 'sgs-timeline--mobile-carousel' : '',
		orientation === 'vertical' && contentLayout === 'single-column' && datePosition === 'own-column'
			? 'sgs-timeline--date-gutter'
			: '',
		// ⛔ `--reveal-connector` is mirrored but `is-js` is NOT. The hidden
		// state is gated on both, so omitting `is-js` here keeps every entry
		// VISIBLE on the canvas — an editor that hides milestones until a
		// scroll position is reached is unusable for the person authoring them.
		connectorProgressFill && 'connector' === revealTrigger
			? 'sgs-timeline--reveal-connector'
			: '',
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
			'--sgs-timeline-media-width': milestoneMediaWidth || undefined,
			// Mirrors render.php: an EMPTY stripe A resolves to `transparent`,
			// so odd rows keep the page/section background and only even rows
			// band. Emitted only when the feature is on, so a timeline without
			// stripes carries no stray custom properties on the canvas either.
			'--sgs-timeline-stripe-a': rowStripes
				? ( rowStripeColourA
						? `var(--wp--preset--color--${ rowStripeColourA })`
						: 'transparent' )
				: undefined,
			'--sgs-timeline-stripe-b': rowStripes
				? ( rowStripeColourB
						? `var(--wp--preset--color--${ rowStripeColourB })`
						: 'transparent' )
				: undefined,
			'--sgs-date-colour': dateColour
				? `var(--wp--preset--color--${ dateColour })`
				: undefined,
			'--sgs-timeline-fill-colour': connectorFillColour
				? `var(--wp--preset--color--${ connectorFillColour })`
				: undefined,
			...buildRootPreviewStyle( attributes ),
		},
	} );

	// D649 — heading level is an identity control (document-outline
	// placement), not a style control; mirrors render.php's own fallback.
	const HeadingTag = headingLevel || 'h3';

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
					// `entries` is a bare `"type": "array"` with no `items`
					// schema, so these round-trip without a block.json change.
					// Seeded explicitly anyway: an entry whose mediaType is
					// absent falls back to 'image', but a seeded default is what
					// the next reader sees when they open the stored content.
					mediaType: 'image',
					video: {},
					svg: '',
				},
			],
		} );
	};

	return (
		<>
			<SgsColourPanel
				rows={ [
					{
						/* Wrapper text/background colour — previously WP-native
						   `supports.color` (text/background), now disabled
						   (block.json) so this SGS panel is the only surface.
						   Still stored at `style.color.text`/`style.color.background`
						   (render.php:78-80, 245-253 reads + applies these to the
						   root `.sgs-timeline` element via the style engine) — not
						   a new attr, just moved off the native auto-generated UI. */
						key: 'wrapperText',
						label: __( 'Text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: style?.color?.text,
								onChange: ( val ) =>
									setAttributes( { style: { ...style, color: { ...style?.color, text: val ?? undefined } } } ),
								linked: true,
							},
						],
					},
					{
						key: 'wrapperBackground',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: style?.color?.background,
								onChange: ( val ) =>
									setAttributes( { style: { ...style, color: { ...style?.color, background: val ?? undefined } } } ),
								linked: true,
							},
						],
					},
					/* Row bands — CONDITIONALLY SPREAD, not passed with a `hidden`
					   flag. SgsColourPanel has no `hidden` row prop (checked:
					   it forwards key/label/states/gradient/border only), so a
					   flag would have been silently ignored and both rows would
					   have shown for a feature that is switched off. Filtering
					   the array is the mechanism the component actually has.

					   `linked: true` is load-bearing on every row: without it a
					   picked colour is stored as a baked hex rather than the
					   palette token slug, and freezes against a future re-skin
					   (D881, where both a hand migration and a codemod dropped
					   it and 14 green assertions missed it). */
					...( rowStripes
						? [
								{
									key: 'rowStripeA',
									label: __( 'Row colour A (odd rows)', 'sgs-blocks' ),
									states: [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: rowStripeColourA,
											onChange: ( val ) =>
												setAttributes( { rowStripeColourA: val ?? '' } ),
											linked: true,
										},
									],
								},
								{
									key: 'rowStripeB',
									label: __( 'Row colour B (even rows)', 'sgs-blocks' ),
									states: [
										{
											key: 'normal',
											label: __( 'Normal', 'sgs-blocks' ),
											value: rowStripeColourB,
											onChange: ( val ) =>
												setAttributes( { rowStripeColourB: val ?? '' } ),
											linked: true,
										},
									],
								},
						  ]
						: [] ),
					{
						key: 'connector',
						label: __( 'Connector colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: connectorColour,
								onChange: ( val ) => setAttributes( { connectorColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'connectorFill',
						label: __( 'Connector fill colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: connectorFillColour,
								onChange: ( val ) =>
									setAttributes( { connectorFillColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'date',
						label: __( 'Date colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: dateColour,
								onChange: ( val ) => setAttributes( { dateColour: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Timeline Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel || 'h3' }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) => setAttributes( { headingLevel: val } ) }
						help={ __(
							'Pick the level that fits your page outline — usually H3 under a page-level H2.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
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
						__next40pxDefaultSize
					/>
					{ orientation === 'vertical' && (
						<SelectControl
							label={ __( 'How entries line up', 'sgs-blocks' ) }
							value={ contentLayout }
							options={ CONTENT_LAYOUT_OPTIONS }
							onChange={ ( val ) => setAttributes( { contentLayout: val } ) }
							help={ __( 'Alternating flips content left/right on each entry.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					{ /* Which side of the line — meaningless outside 'same-side'
					     (alternating flips by definition; single-column is
					     one-sided), so it is hidden rather than disabled for the
					     other two layouts, per the brief. */ }
					{ orientation === 'vertical' && contentLayout === 'same-side' && (
						<SelectControl
							label={ __( 'Which side of the line', 'sgs-blocks' ) }
							value={ contentSide }
							options={ CONTENT_SIDE_OPTIONS }
							onChange={ ( val ) => setAttributes( { contentSide: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					{ /* Date position is an AXIS OF ITS OWN, not a content-layout
					     value. MUI, Ant Design, PrimeReact and Vuetify all model it
					     as a separate slot/prop — none forces a gutter when you pick
					     "Single column". Shown only for Single column, because
					     Alternating/Same side are inherently two-sided. */ }
					{ orientation === 'vertical' && contentLayout === 'single-column' && (
						<SelectControl
							label={ __( 'Date position', 'sgs-blocks' ) }
							value={ datePosition }
							options={ DATE_POSITION_OPTIONS }
							onChange={ ( val ) => setAttributes( { datePosition: val } ) }
							help={ __(
								"On phones the date always sits above the title, so there's room for it.",
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					<ToggleControl
						label={ __( 'Alternating row colours', 'sgs-blocks' ) }
						checked={ rowStripes }
						onChange={ ( val ) => setAttributes( { rowStripes: val } ) }
						help={ __(
							'Bands each milestone row in one of two colours, so the rows read as distinct blocks.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ /* Mobile layout is an axis of its own (Task 2) — it does not
					     touch orientation/alignment above 767px in either
					     direction, so it is shown regardless of which of those is
					     picked. */ }
					<RadioControl
						label={ __( 'Mobile layout', 'sgs-blocks' ) }
						selected={ mobileLayout || 'stacked' }
						options={ MOBILE_LAYOUT_OPTIONS }
						onChange={ ( val ) => setAttributes( { mobileLayout: val } ) }
						help={ __(
							'Stacked: today’s single-column layout. Swipeable cards: a horizontal scroll-snap row of cards, phones only (767px and below) — layout above that width is unaffected.',
							'sgs-blocks'
						) }
					/>
				</PanelBody>

				{ /* ── Milestone media ──
				     Its own panel rather than three more rows in Layout. Beyond
				     ~6 always-visible controls a PanelBody reads as a wall
				     (inspector-scan rule 03, Spec 35) — and grouping the media
				     settings together is what a client would look for anyway. */ }
				<PanelBody
					title={ __( 'Milestone media', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Milestone media width', 'sgs-blocks' ) }
						value={ milestoneMediaWidth }
						onChange={ ( val ) =>
							setAttributes( { milestoneMediaWidth: val } )
						}
						help={ __(
							'Any CSS width, e.g. 180px or 14rem. On phones the media goes full width regardless.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Milestone media is decorative', 'sgs-blocks' ) }
						checked={ milestoneMediaDecorative }
						onChange={ ( val ) =>
							setAttributes( { milestoneMediaDecorative: val } )
						}
						help={ __(
							'Turn on when the pictures are decoration rather than information — screen readers will skip them instead of reading the image description.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── Connector ── */}
				<PanelBody title={ __( 'Connector', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Connector style', 'sgs-blocks' ) }
						value={ connectorStyle }
						options={ CONNECTOR_OPTIONS }
						onChange={ ( val ) => setAttributes( { connectorStyle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Fill connector on scroll', 'sgs-blocks' ) }
						help={ __(
							'The connector line fills in progressively as the timeline scrolls into view. Previews on the live site only.',
							'sgs-blocks'
						) }
						checked={ !! connectorProgressFill }
						onChange={ ( val ) =>
							setAttributes( { connectorProgressFill: !! val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── Spacing ── Box-object interface contract §B/§E: padding/margin
				   base routes to WP-native style.spacing.* (skip-serialised → scoped,
				   not inline); tiers are the paddingTablet/paddingMobile +
				   marginTablet/marginMobile object attrs. */}
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
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
						presets
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
										{ /* Task 0 codemod (migrate-border-control.js) -- one composite row
					   (width/style/colour) mirroring native's BorderBoxControl layout,
					   matching sgs/product-card + sgs/quote. Border-radius is unchanged
					   (stays WP-native). */ }
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ borderColourGradient }
						onColourGradientChange={ ( val ) =>
									setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: borderRadiusTablet ?? {},
							mobile: borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
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
						<SelectControl
							label={ __( 'Reveal each milestone', 'sgs-blocks' ) }
							value={ revealTrigger }
							options={ REVEAL_TRIGGER_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { revealTrigger: val } )
							}
							help={
								connectorProgressFill
									? __(
											'“When the connector reaches it” makes each milestone appear as the filling line arrives at its dot.',
											'sgs-blocks'
									  )
									: __(
											'“When the connector reaches it” needs the progress fill switched on in the Connector panel — without it, this falls back to scrolling into view.',
											'sgs-blocks'
									  )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					{ revealOnScroll && 'connector' !== revealTrigger && (
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
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* ── Editor preview ── */ }
			<ol { ...blockProps }>
				{ entries.map( ( entry, index ) => (
					<li
						key={ index }
						className={ [
							'sgs-timeline__entry',
							'is-revealed',
							entryHasMedia( entry ) ? 'sgs-timeline__entry--has-media' : '',
						]
							.filter( Boolean )
							.join( ' ' ) }
					>
						<time className="sgs-timeline__date">
							{ entry.date || __( 'Date', 'sgs-blocks' ) }
						</time>
						{ /* The canvas has NEVER rendered milestone media — not
						     even the image, which has been a stored attribute all
						     along. A client could pick a picture and see nothing
						     until they previewed the page. Rendered here so the
						     editor matches the page, which is the whole point of
						     the block editor for a non-technical client. */ }
						{ entryHasMedia( entry ) && (
							<div
								className="sgs-timeline__media-slot"
								/* Mirrors render.php: a decorative milestone
								   picture is hidden from assistive tech rather
								   than announced. Reflected on the canvas too so
								   the editor is not quietly different from the
								   page — an inspector control the preview
								   ignores is exactly the desync CHECK A exists
								   to catch, and it caught this one. */
								aria-hidden={ milestoneMediaDecorative || undefined }
							>
								{ 'svg' === entry.mediaType ? (
									<div
										className="sgs-timeline__media sgs-timeline__media--svg"
										/* Editor-only preview of operator-pasted
										   markup. The FRONTEND path is the one that
										   matters for safety and it runs the same
										   wp_kses() allowlist as every other SGS
										   SVG surface (helpers-tier-media.php). */
										dangerouslySetInnerHTML={ { __html: entry.svg } }
									/>
								) : (
									<MediaPreview entry={ entry } />
								) }
							</div>
						) }
						<div className="sgs-timeline__node" aria-hidden="true" />
						<div className="sgs-timeline__content">
							<RichText.Content
								tagName={ HeadingTag }
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
