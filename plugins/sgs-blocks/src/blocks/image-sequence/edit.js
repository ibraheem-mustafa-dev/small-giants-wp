import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
	ToggleControl,
	Notice,
	Button,
	Spinner,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import MediaPicker from '../../components/MediaPicker';
import { ResponsiveControl, MEDIA_SIZING_RATIO_OPTIONS } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

/**
 * Hard cap on frames per tier (Step 16, Motion Wave D, Route B). Must stay
 * in sync with $sgs_max_frame_count in render.php — THAT is the
 * authoritative enforcement point (every render path goes through
 * render.php; this block has no static save output). This constant only
 * drives the editor-side slider limit + the over-cap warning below, so an
 * operator sees the cap coming rather than discovering it as a silent
 * frontend truncation.
 */
const MAX_FRAME_COUNT = 200;

// C19 ratio-mode adoption (2026-08-27) — this list used to be a hand-rolled
// duplicate of the exact six values render.php:54-57 whitelists (same
// values, different labels). It is now imported from MediaSizingPanel's
// exported RATIO_OPTIONS — the JS-side single source of truth — leaving
// only ONE remaining copy of the value set in the codebase: render.php's
// PHP whitelist (PHP cannot import a JS constant, so it stays a
// byte-identical array there; see render.php's own comment on that array).
const ASPECT_RATIO_OPTIONS = MEDIA_SIZING_RATIO_OPTIONS;

// Must stay in sync with `$allowed_ext` in render.php AND the `enum` on the three
// *FrameExt attrs in block.json — all three now list the same five values. They did
// not: render.php accepted `jpeg` while this list offered four, so a sequence prepped
// as .jpeg rendered correctly but its file type was uneditable in the inspector, and
// declaring the enum as the editor's four would have made WP silently coerce that
// stored `jpeg` to the `webp` default on the next save.
const EXTENSION_OPTIONS = [
	{ label: 'WebP', value: 'webp' },
	{ label: 'AVIF', value: 'avif' },
	{ label: 'JPG', value: 'jpg' },
	{ label: 'JPEG', value: 'jpeg' },
	{ label: 'PNG', value: 'png' },
];

/**
 * "Verify frames" button — HEAD-checks the first and last expected frame
 * file over REST (server-side, so no CORS issue and no client-side SSRF
 * surface) and reports back by exact filename. Catches the four free-text
 * fields (url/count/pad/ext) being wrong in a way that otherwise fails
 * silently to thumbnail-only with no explanation.
 *
 * @param {Object} props       Component props.
 * @param {string} props.url   Frames-folder URL to check.
 * @param {number} props.count Frame count to check.
 * @param {number} props.pad   Zero-pad digit count.
 * @param {string} props.ext   File extension.
 */
function VerifyFramesButton( { url, count, pad, ext } ) {
	const [ status, setStatus ] = useState( 'idle' ); // idle | checking | ok | error
	const [ result, setResult ] = useState( null );

	const canVerify = Boolean( url ) && count > 0;

	const onVerify = () => {
		setStatus( 'checking' );
		setResult( null );
		apiFetch( {
			path: '/sgs/v1/image-sequence/verify-frames',
			method: 'POST',
			data: { url, count, pad, ext },
		} )
			.then( ( response ) => {
				setStatus( response.ok ? 'ok' : 'error' );
				setResult( response );
			} )
			.catch( ( error ) => {
				setStatus( 'error' );
				setResult( {
					message:
						error?.message ||
						__(
							'The verification request failed unexpectedly.',
							'sgs-blocks'
						),
				} );
			} );
	};

	return (
		<div className="sgs-image-sequence-editor__verify">
			<Button
				variant="secondary"
				onClick={ onVerify }
				disabled={ ! canVerify || 'checking' === status }
				__next40pxDefaultSize
			>
				{ __( 'Verify frames', 'sgs-blocks' ) }
			</Button>
			{ 'checking' === status && <Spinner /> }
			{ 'ok' === status && result && (
				<Notice status="success" isDismissible={ false }>
					{ result.message }
				</Notice>
			) }
			{ 'error' === status && result && (
				<Notice status="error" isDismissible={ false }>
					{ result.message }
				</Notice>
			) }
		</div>
	);
}

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
	const overCap = count > MAX_FRAME_COUNT;

	return (
		<>
			<TextControl
				label={ label }
				help={ help }
				value={ url }
				placeholder="https://example.com/wp-content/uploads/sequence/desktop"
				onChange={ ( value ) => onChange( { url: value } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ url && (
				<>
					<RangeControl
						label={ __( 'Frame count', 'sgs-blocks' ) }
						value={ count }
						onChange={ ( value ) => onChange( { count: value } ) }
						min={ 0 }
						max={ MAX_FRAME_COUNT }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ overCap && (
						<Notice status="warning" isDismissible={ false }>
							{ sprintf(
								/* translators: 1: stored frame count, 2: enforced maximum */
								__(
									'This tier is set to %1$d frames, above the %2$d-frame maximum. The site will only ever load the first %2$d — reduce the count above so the editor matches what visitors actually see.',
									'sgs-blocks'
								),
								count,
								MAX_FRAME_COUNT
							) }
						</Notice>
					) }
					<SelectControl
						label={ __( 'File type', 'sgs-blocks' ) }
						value={ ext }
						options={ EXTENSION_OPTIONS }
						onChange={ ( value ) => onChange( { ext: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
						__next40pxDefaultSize
					/>
					<VerifyFramesButton
						url={ url }
						count={ count }
						pad={ pad }
						ext={ ext }
					/>
				</>
			) }
		</>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		thumbnail,
		thumbnailAlt,
		thumbnailDecorative,
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
		fxPin,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-image-sequence-editor',
	} );

	const onSelectPoster = ( media ) => {
		setAttributes( {
			thumbnail: media
				? { id: media.id, url: media.url, alt: media.alt || '' }
				: null,
		} );
	};

	const onRemovePoster = () => setAttributes( { thumbnail: null } );

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
				<PanelBody title={ __( 'Thumbnail', 'sgs-blocks' ) }>
					<p>
						{ __(
							'Always shown to visitors without JavaScript, and to anyone with reduced-motion enabled. Choose the same image as your sequence’s first frame for a seamless handoff.',
							'sgs-blocks'
						) }
					</p>
					<MediaPicker
						value={ thumbnail }
						onChange={ onSelectPoster }
						onRemove={ onRemovePoster }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Select thumbnail image', 'sgs-blocks' ) }
					/>
					<ToggleControl
						label={ __(
							'Decorative — hide from screen readers',
							'sgs-blocks'
						) }
						checked={ Boolean( thumbnailDecorative ) }
						onChange={ ( value ) =>
							setAttributes( { thumbnailDecorative: value } )
						}
						help={
							thumbnailDecorative
								? __(
										'Screen readers will skip this thumbnail entirely — use only when it carries no information the sequence itself doesn’t already convey.',
										'sgs-blocks'
								  )
								: __(
										'Turn on when the thumbnail is decoration rather than information.',
										'sgs-blocks'
								  )
						}
						__nextHasNoMarginBottom
					/>
					{ /* Art direction (2026-08-07). The canvas sequence already
					     art-directs itself per device (the three frame pipelines
					     below); this gives the SAME per-device choice to the
					     fail-open thumbnail, which is what a no-JS or
					     reduced-motion visitor actually sees. Same
					     device-switched shape as sgs/media and sgs/hero. */ }
					<ResponsiveControl
						label={ __( 'Thumbnail for this screen size', 'sgs-blocks' ) }
					>
						{ ( bp ) => {
							if ( 'desktop' === bp ) {
								return (
									<p style={ { margin: 0, fontStyle: 'italic' } }>
										{ __(
											'The thumbnail above is used on desktop. Switch to tablet or mobile to set a different crop.',
											'sgs-blocks'
										) }
									</p>
								);
							}
							const key =
								'tablet' === bp
									? 'thumbnailTablet'
									: 'thumbnailMobile';
							return (
								<MediaPicker
									value={ attributes[ key ] }
									allowedTypes={ [ 'image' ] }
									onChange={ ( media ) =>
										setAttributes( {
											[ key ]: media
												? {
														id: media.id,
														url: media.url,
														alt: media.alt || '',
												  }
												: null,
										} )
									}
									onRemove={ () =>
										setAttributes( { [ key ]: null } )
									}
									label={ __( 'Set thumbnail', 'sgs-blocks' ) }
									instructionsImage={ __(
										'Optional. Leave empty to reuse the desktop thumbnail at this width.',
										'sgs-blocks'
									) }
								/>
							);
						} }
					</ResponsiveControl>
					<TextControl
						label={ __( 'Thumbnail alt text', 'sgs-blocks' ) }
						help={
							thumbnailDecorative
								? __(
										'Disabled — the thumbnail is set to decorative above, so no alt text is rendered.',
										'sgs-blocks'
								  )
								: __(
										'Describes the sequence for screen readers and no-JS visitors.',
										'sgs-blocks'
								  )
						}
						value={ thumbnailAlt }
						onChange={ ( value ) =>
							setAttributes( { thumbnailAlt: value } )
						}
						disabled={ thumbnailDecorative }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Aspect ratio', 'sgs-blocks' ) }
						value={ aspectRatio }
						options={ ASPECT_RATIO_OPTIONS }
						onChange={ ( value ) =>
							setAttributes( { aspectRatio: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
						className="sgs-nested-tools-panel"
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
					<ToggleControl
						label={ __( 'Pin while scrubbing', 'sgs-blocks' ) }
						help={
							fxPin
								? __(
										'The sequence holds still on screen the moment it comes fully into view, and scrolling plays through the frames while it stays put — it is released once the frames finish.',
										'sgs-blocks'
								  )
								: __(
										'Off: the sequence scrolls normally and only plays while it is fully on screen. Turn on to hold it in place while it plays, instead of it also scrolling past.',
										'sgs-blocks'
								  )
						}
						checked={ Boolean( fxPin ) }
						onChange={ ( value ) =>
							setAttributes( { fxPin: value } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Start position', 'sgs-blocks' ) }
						help={ __(
							'Advanced — overrides the automatic "fully visible" start. Viewport-relative, e.g. "top 80%". Leave blank for the default.',
							'sgs-blocks'
						) }
						value={ fxStart }
						onChange={ ( value ) =>
							setAttributes( { fxStart: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'End position', 'sgs-blocks' ) }
						help={ __(
							'Advanced — overrides the automatic "fully visible" end. Viewport-relative, e.g. "bottom 20%", or a distance like "+=150%". Leave blank for the default.',
							'sgs-blocks'
						) }
						value={ fxEnd }
						onChange={ ( value ) =>
							setAttributes( { fxEnd: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! thumbnail ? (
					<div className="sgs-image-sequence-editor__placeholder">
						<MediaPicker
							value={ null }
							onChange={ onSelectPoster }
							onRemove={ onRemovePoster }
							allowedTypes={ [ 'image' ] }
							label={ __( 'Select Thumbnail Image', 'sgs-blocks' ) }
							instructionsImage={ __(
								'An image sequence needs a thumbnail frame. Add one to get started, then configure the frame source in the sidebar.',
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
							src={ thumbnail.url }
							alt={
								thumbnail.alt ||
								__(
									'Image sequence thumbnail preview',
									'sgs-blocks'
								)
							}
							className="sgs-image-sequence-editor__preview"
						/>
					</div>
				) }

				<Notice status="info" isDismissible={ false }>
					{ __(
						'Scroll effects preview on the live site. The editor always shows the thumbnail frame.',
						'sgs-blocks'
					) }
				</Notice>

				{ ! desktopConfigured && (
					<p className="sgs-image-sequence-editor__frame-count">
						{ __(
							'No frame source configured yet — this block will render as a static thumbnail image until you add one.',
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
