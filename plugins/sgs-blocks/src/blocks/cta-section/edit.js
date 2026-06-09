import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
	RangeControl,
} from '@wordpress/components';
import MediaPicker from '../../components/MediaPicker';
// WS-4: shared sgs/container wrapper editor controls (section kind = full surface).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

// FR-22-6: the content column is now InnerBlocks — heading + body text + buttons.
// Headline/body are no longer scalar attrs read by render.php; they are authored
// directly as child sgs/heading + sgs/text blocks. The body sgs/text carries the
// .sgs-cta-section__body class so the responsive font-size <style> still targets it.
const CTA_TEMPLATE = [
	[ 'sgs/heading', { level: 'h2', className: 'sgs-cta-section__headline' } ],
	[ 'sgs/text', { className: 'sgs-cta-section__body' } ],
	[
		'sgs/multi-button',
		{},
		[
			[
				'sgs/button',
				{ inheritStyle: 'primary', label: 'Primary Action' },
			],
			[
				'sgs/button',
				{ inheritStyle: 'secondary', label: 'Secondary Action' },
			],
		],
	],
];

const CTA_ALLOWED_BLOCKS = [ 'sgs/heading', 'sgs/text', 'sgs/multi-button' ];

const LAYOUT_OPTIONS = [
	{ label: __( 'Centred', 'sgs-blocks' ), value: 'centred' },
	{ label: __( 'Left-aligned', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		ribbon,
		layout, // legacy (pre-WS-4) — now the container grid/flex attr; read for old-post fallback only
		contentLayout,
		backgroundImage,
		backgroundMedia,
		backgroundImageOpacity,
		gradientPreset,
		stats,
	} = attributes;

	// WS-4: cta-section's own layout (centred/left/split) renamed to `contentLayout`
	// (the container owns `layout` = grid/flex). Fall back to the legacy value so
	// old posts render correctly in the editor before they round-trip.
	const ctaLayout = contentLayout || layout || 'centred';

	// Hydrate the active media from the new unified slot first, falling back to
	// the legacy backgroundImage object for posts that have not yet round-tripped
	// through the editor.
	const resolveActiveMedia = () => {
		if ( backgroundMedia && backgroundMedia.url ) {
			return backgroundMedia;
		}
		if ( backgroundImage && backgroundImage.url ) {
			return {
				url: backgroundImage.url,
				type: 'image',
				id: backgroundImage.id || 0,
				alt: backgroundImage.alt || '',
				mime: 'image/jpeg',
			};
		}
		return null;
	};
	const activeMedia = resolveActiveMedia();

	const className = [
		'sgs-cta-section',
		`sgs-cta-section--${ ctaLayout }`,
		gradientPreset ? `sgs-cta-section--gradient-${ gradientPreset }` : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const wrapperStyle = {};
	if ( activeMedia && activeMedia.type === 'image' && activeMedia.url ) {
		wrapperStyle.backgroundImage = `url(${ activeMedia.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}

	const blockProps = useBlockProps( {
		className,
		style: wrapperStyle,
	} );

	// The content column hosts the InnerBlocks (heading + body + buttons),
	// mirroring the render.php <div class="sgs-cta-section__content"> wrapper.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-cta-section__content' },
		{
			template: CTA_TEMPLATE,
			templateLock: false,
			allowedBlocks: CTA_ALLOWED_BLOCKS,
		}
	);

	const addStat = () => {
		setAttributes( {
			stats: [ ...stats, { text: '' } ],
		} );
	};

	const updateStat = ( index, text ) => {
		const updated = [ ...stats ];
		updated[ index ] = { text };
		setAttributes( { stats: updated } );
	};

	const removeStat = ( index ) => {
		setAttributes( {
			stats: stats.filter( ( _, i ) => i !== index ),
		} );
	};

	return (
		<>
			<InspectorControls>
				{ /* WS-4: mirrored sgs/container wrapper controls (section kind). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="section"
				/>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Content layout', 'sgs-blocks' ) }
						value={ ctaLayout }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) => setAttributes( { contentLayout: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Ribbon label', 'sgs-blocks' ) }
						help={ __(
							'Optional floating badge shown top-right of the CTA box. Leave blank to hide.',
							'sgs-blocks'
						) }
						value={ ribbon || '' }
						onChange={ ( val ) => setAttributes( { ribbon: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Background', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Gradient preset', 'sgs-blocks' ) }
						value={ gradientPreset || '' }
						options={ [
							{ label: __( 'None', 'sgs-blocks' ), value: '' },
							{
								label: __( 'Primary fade', 'sgs-blocks' ),
								value: 'primary-fade',
							},
							{
								label: __( 'Accent glow', 'sgs-blocks' ),
								value: 'accent-glow',
							},
							{
								label: __( 'Dark radial', 'sgs-blocks' ),
								value: 'dark-radial',
							},
							{
								label: __( 'Mesh soft', 'sgs-blocks' ),
								value: 'mesh-soft',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { gradientPreset: val } )
						}
						help={ __(
							'Gradient overrides the solid background colour when set.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<MediaPicker
						value={ activeMedia }
						onChange={ ( media ) => {
							// Write the unified slot. Mirror image-only selections into the
							// legacy attribute so older render paths (and any back-compat
							// consumer) still see the same URL until they migrate.
							if ( media && media.type === 'image' ) {
								setAttributes( {
									backgroundMedia: media,
									backgroundImage: {
										id: media.id,
										url: media.url,
										alt: media.alt,
									},
								} );
							} else {
								// Video (or null) — clear the legacy image attribute so the
								// legacy <img>/CSS background path does not double-render.
								setAttributes( {
									backgroundMedia: media,
									backgroundImage: null,
								} );
							}
						} }
						onRemove={ () =>
							setAttributes( {
								backgroundMedia: null,
								backgroundImage: null,
							} )
						}
						label={ __( 'Select background media', 'sgs-blocks' ) }
						instructionsImage={ __(
							'Choose an image or video for the CTA background',
							'sgs-blocks'
						) }
					/>
					<RangeControl
						label={ __( 'Image opacity (%)', 'sgs-blocks' ) }
						value={ backgroundImageOpacity }
						onChange={ ( val ) =>
							setAttributes( {
								backgroundImageOpacity: val,
							} )
						}
						min={ 0 }
						max={ 100 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Stats / Social Proof', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ stats.map( ( stat, index ) => (
						<div
							key={ index }
							style={ {
								display: 'flex',
								gap: '8px',
								marginBottom: '8px',
							} }
						>
							<TextControl
								value={ stat.text || '' }
								onChange={ ( val ) => updateStat( index, val ) }
								placeholder={ __(
									'e.g., Trusted by 5,000+ businesses',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
							<Button
								icon="trash"
								isDestructive
								onClick={ () => removeStat( index ) }
								size="small"
							/>
						</div>
					) ) }
					<Button variant="secondary" onClick={ addStat }>
						{ __( 'Add stat', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ activeMedia &&
					activeMedia.type === 'video' &&
					activeMedia.url && (
						<video
							className="sgs-cta-section__bg-video"
							src={ activeMedia.url }
							autoPlay
							muted
							loop
							playsInline
							aria-hidden="true"
						/>
					) }
				{ activeMedia && activeMedia.url && (
					<span
						className="sgs-cta-section__overlay"
						style={ {
							opacity: backgroundImageOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ ribbon && (
					<span
						className="sgs-cta-section__ribbon"
						aria-hidden="true"
					>
						{ ribbon }
					</span>
				) }

				<div { ...innerBlocksProps } />

				{ stats.length > 0 && (
					<div className="sgs-cta-section__stats">
						{ stats.map( ( stat, index ) =>
							stat.text ? (
								<span
									key={ index }
									className="sgs-cta-section__stat"
								>
									{ stat.text }
								</span>
							) : null
						) }
					</div>
				) }
			</div>
		</>
	);
}
