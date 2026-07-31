import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
	Notice,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import MediaPicker from '../../components/MediaPicker';

const ASPECT_RATIO_OPTIONS = [
	{ label: __( 'Widescreen (16:9)', 'sgs-blocks' ), value: '16 / 9' },
	{ label: __( 'Ultra-wide (21:9)', 'sgs-blocks' ), value: '21 / 9' },
	{ label: __( 'Standard (4:3)', 'sgs-blocks' ), value: '4 / 3' },
	{ label: __( 'Square (1:1)', 'sgs-blocks' ), value: '1 / 1' },
	{ label: __( 'Portrait (3:4)', 'sgs-blocks' ), value: '3 / 4' },
	{ label: __( 'Tall (9:16)', 'sgs-blocks' ), value: '9 / 16' },
];

const EXTENSION_OPTIONS = [
	{ label: 'WebP', value: 'webp' },
	{ label: 'AVIF', value: 'avif' },
	{ label: 'JPG', value: 'jpg' },
	{ label: 'PNG', value: 'png' },
];

/**
 * One tier's "Frame source" fields, reused for desktop (always shown) and
 * tablet/mobile (behind the responsive-overrides ToolsPanel below).
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.label    Field label.
 * @param {string}   props.help     Help text.
 * @param {string}   props.url      Current frames-folder URL.
 * @param {number}   props.count    Current frame count.
 * @param {number}   props.pad      Current zero-pad digit count.
 * @param {string}   props.ext      Current file extension.
 * @param {Function} props.onChange Called with a partial `{ url, count, pad, ext }` patch.
 */
function FrameSourceFields( { label, help, url, count, pad, ext, onChange } ) {
	return (
		<>
			<TextControl
				label={ label }
				help={ help }
				value={ url }
				placeholder="https://example.com/wp-content/uploads/sequence/desktop"
				onChange={ ( value ) => onChange( { url: value } ) }
				__nextHasNoMarginBottom
			/>
			{ url && (
				<>
					<RangeControl
						label={ __( 'Frame count', 'sgs-blocks' ) }
						value={ count }
						onChange={ ( value ) => onChange( { count: value } ) }
						min={ 0 }
						max={ 600 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'File type', 'sgs-blocks' ) }
						value={ ext }
						options={ EXTENSION_OPTIONS }
						onChange={ ( value ) => onChange( { ext: value } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Filename zero-padding', 'sgs-blocks' ) }
						help={ __(
							'Must match the prep tool output — e.g. 4 for frame_0001.webp.',
							'sgs-blocks'
						) }
						value={ pad }
						onChange={ ( value ) => onChange( { pad: value } ) }
						min={ 1 }
						max={ 8 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		posterMedia,
		posterAlt,
		aspectRatio,
		desktopFramesUrl,
		desktopFrameCount,
		desktopFramePad,
		desktopFrameExt,
		tabletFramesUrl,
		tabletFrameCount,
		tabletFramePad,
		tabletFrameExt,
		mobileFramesUrl,
		mobileFrameCount,
		mobileFramePad,
		mobileFrameExt,
		fxStart,
		fxEnd,
		fxScrub,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-image-sequence-editor',
	} );

	const onSelectPoster = ( media ) => {
		setAttributes( {
			posterMedia: media
				? { id: media.id, url: media.url, alt: media.alt || '' }
				: null,
		} );
	};

	const onRemovePoster = () => setAttributes( { posterMedia: null } );

	const desktopConfigured = Boolean(
		desktopFramesUrl && desktopFrameCount > 0
	);
	const maxFrameCount = Math.max(
		desktopFrameCount || 0,
		tabletFrameCount || 0,
		mobileFrameCount || 0
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Poster frame', 'sgs-blocks' ) }>
					<p>
						{ __(
							'Always shown to visitors without JavaScript, and to anyone with reduced-motion enabled. Choose the same image as your sequence’s first frame for a seamless handoff.',
							'sgs-blocks'
						) }
					</p>
					<MediaPicker
						value={ posterMedia }
						onChange={ onSelectPoster }
						onRemove={ onRemovePoster }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Select poster image', 'sgs-blocks' ) }
					/>
					<TextControl
						label={ __( 'Poster alt text', 'sgs-blocks' ) }
						help={ __(
							'Describes the sequence for screen readers and no-JS visitors.',
							'sgs-blocks'
						) }
						value={ posterAlt }
						onChange={ ( value ) =>
							setAttributes( { posterAlt: value } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ ( value ) =>
							setAttributes( { aspectRatio: value } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Frame source', 'sgs-blocks' ) }
					initialOpen={ desktopConfigured }
				>
					<p>
						{ __(
							'Produce numbered frames with the Image Sequence Prep tool (scripts/image-sequence-prep.py), upload the output folder, and paste its URL below.',
							'sgs-blocks'
						) }
					</p>
					<FrameSourceFields
						label={ __(
							'Desktop frames folder URL',
							'sgs-blocks'
						) }
						help={ __(
							'Required. Folder containing frame_0001.… through the last frame.',
							'sgs-blocks'
						) }
						url={ desktopFramesUrl }
						count={ desktopFrameCount }
						pad={ desktopFramePad }
						ext={ desktopFrameExt }
						onChange={ ( changed ) => {
							const next = {};
							if ( undefined !== changed.url ) {
								next.desktopFramesUrl = changed.url;
							}
							if ( undefined !== changed.count ) {
								next.desktopFrameCount = changed.count;
							}
							if ( undefined !== changed.ext ) {
								next.desktopFrameExt = changed.ext;
							}
							if ( undefined !== changed.pad ) {
								next.desktopFramePad = changed.pad;
							}
							setAttributes( next );
						} }
					/>

					{ maxFrameCount > 0 && (
						<Notice status="warning" isDismissible={ false }>
							{ frameCountWarning( maxFrameCount ) }
						</Notice>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Responsive frame sources', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p>
						{ __(
							'Optional. Leave blank to reuse the desktop frames on that device — the runtime falls back automatically.',
							'sgs-blocks'
						) }
					</p>
					<ToolsPanel
						label={ __( 'Responsive frame sources', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								tabletFramesUrl: '',
								tabletFrameCount: 0,
								tabletFramePad: 4,
								tabletFrameExt: 'webp',
								mobileFramesUrl: '',
								mobileFrameCount: 0,
								mobileFramePad: 4,
								mobileFrameExt: 'webp',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Tablet frames', 'sgs-blocks' ) }
							hasValue={ () => Boolean( tabletFramesUrl ) }
							onDeselect={ () =>
								setAttributes( {
									tabletFramesUrl: '',
									tabletFrameCount: 0,
								} )
							}
							isShownByDefault
						>
							<FrameSourceFields
								label={ __(
									'Tablet frames folder URL',
									'sgs-blocks'
								) }
								help={ __(
									'Optional — falls back to desktop when empty.',
									'sgs-blocks'
								) }
								url={ tabletFramesUrl }
								count={ tabletFrameCount }
								pad={ tabletFramePad }
								ext={ tabletFrameExt }
								onChange={ ( changed ) => {
									const next = {};
									if ( undefined !== changed.url ) {
										next.tabletFramesUrl = changed.url;
									}
									if ( undefined !== changed.count ) {
										next.tabletFrameCount = changed.count;
									}
									if ( undefined !== changed.ext ) {
										next.tabletFrameExt = changed.ext;
									}
									if ( undefined !== changed.pad ) {
										next.tabletFramePad = changed.pad;
									}
									setAttributes( next );
								} }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Mobile frames', 'sgs-blocks' ) }
							hasValue={ () => Boolean( mobileFramesUrl ) }
							onDeselect={ () =>
								setAttributes( {
									mobileFramesUrl: '',
									mobileFrameCount: 0,
								} )
							}
							isShownByDefault
						>
							<FrameSourceFields
								label={ __(
									'Mobile frames folder URL',
									'sgs-blocks'
								) }
								help={ __(
									'Optional — falls back to tablet, then desktop, when empty.',
									'sgs-blocks'
								) }
								url={ mobileFramesUrl }
								count={ mobileFrameCount }
								pad={ mobileFramePad }
								ext={ mobileFrameExt }
								onChange={ ( changed ) => {
									const next = {};
									if ( undefined !== changed.url ) {
										next.mobileFramesUrl = changed.url;
									}
									if ( undefined !== changed.count ) {
										next.mobileFrameCount = changed.count;
									}
									if ( undefined !== changed.ext ) {
										next.mobileFrameExt = changed.ext;
									}
									if ( undefined !== changed.pad ) {
										next.mobileFramePad = changed.pad;
									}
									setAttributes( next );
								} }
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>

				<PanelBody
					title={ __( 'Scroll effect', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Start position', 'sgs-blocks' ) }
						help={ __(
							'Viewport-relative, e.g. "top 80%". Leave blank for the default.',
							'sgs-blocks'
						) }
						value={ fxStart }
						onChange={ ( value ) =>
							setAttributes( { fxStart: value } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'End position', 'sgs-blocks' ) }
						help={ __(
							'Viewport-relative, e.g. "bottom 20%". Leave blank for the default.',
							'sgs-blocks'
						) }
						value={ fxEnd }
						onChange={ ( value ) =>
							setAttributes( { fxEnd: value } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __(
							'Scrub smoothing (seconds)',
							'sgs-blocks'
						) }
						help={ __(
							'0 ties frames directly to the scrollbar with no lag.',
							'sgs-blocks'
						) }
						value={ fxScrub }
						onChange={ ( value ) =>
							setAttributes( { fxScrub: value } )
						}
						min={ 0 }
						max={ 3 }
						step={ 0.1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! posterMedia ? (
					<div className="sgs-image-sequence-editor__placeholder">
						<MediaPicker
							value={ null }
							onChange={ onSelectPoster }
							onRemove={ onRemovePoster }
							allowedTypes={ [ 'image' ] }
							label={ __( 'Select Poster Image', 'sgs-blocks' ) }
							instructionsImage={ __(
								'An image sequence needs a poster frame. Add one to get started, then configure the frame source in the sidebar.',
								'sgs-blocks'
							) }
						/>
					</div>
				) : (
					<div
						className="sgs-image-sequence-editor__preview-wrapper"
						style={ { aspectRatio } }
					>
						<img
							src={ posterMedia.url }
							alt={
								posterMedia.alt ||
								__(
									'Image sequence poster preview',
									'sgs-blocks'
								)
							}
							className="sgs-image-sequence-editor__preview"
						/>
					</div>
				) }

				<Notice status="info" isDismissible={ false }>
					{ __(
						'Scroll effects preview on the live site. The editor always shows the poster frame.',
						'sgs-blocks'
					) }
				</Notice>

				{ ! desktopConfigured && (
					<p className="sgs-image-sequence-editor__frame-count">
						{ __(
							'No frame source configured yet — this block will render as a static poster image until you add one.',
							'sgs-blocks'
						) }
					</p>
				) }
			</div>
		</>
	);
}

/**
 * Plain-English heavy-asset warning (§2 taxonomy: "heavy-asset warning in
 * UI"). Kept as a real function rather than inline JSX so the wording is one
 * place to review/translate.
 *
 * @param {number} count Highest configured frame count across tiers.
 * @return {string} Warning copy.
 */
function frameCountWarning( count ) {
	return sprintf(
		/* translators: %d: number of frames the sequence loads. */
		__(
			'This sequence loads up to %d images as a visitor scrolls through it. Keep individual frames small (a few tens of KB each, via the prep tool’s compression) — a large, uncompressed sequence will slow this page down noticeably.',
			'sgs-blocks'
		),
		count
	);
}
