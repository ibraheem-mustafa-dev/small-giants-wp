import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	RangeControl,
	Notice,
	Button,
	Spinner,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import MediaElementPanel from '../../components/MediaElementPanel';
import SlotPicture from '../../components/media/SlotPicture';
import { AspectRatioField } from '../../components/media/SizingFields';
import { useActiveDevice } from '../../components/media/deviceValues';
import metadata from './block.json';
import FrameSummary from './frame-summary';
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

const THUMBNAIL_ENTRY = metadata.supports.sgs.mediaElements.find( ( e ) => 'thumbnail' === e.prefix );

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

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		thumbnailRatio,
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
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-image-sequence-editor',
	} );

	const device = useActiveDevice();
	const uid = 'sgs-is-' + clientId.slice( 0, 8 );
	// The stage's ratio at the device being edited: a narrower device inherits the wider one.
	const ratioTiers = thumbnailRatio || { desktop: '16 / 9' };
	let stageRatio = ratioTiers.desktop || '16 / 9';
	if ( 'tablet' === device ) {
		stageRatio = ratioTiers.tablet || stageRatio;
	} else if ( 'mobile' === device ) {
		stageRatio = ratioTiers.mobile || ratioTiers.tablet || stageRatio;
	}
	const stageAspect = 'natural' === stageRatio ? 'auto' : stageRatio;

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
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName="sgs/image-sequence"
				blockSlug="sgs/image-sequence"
				prefix="thumbnail"
				atoms={ THUMBNAIL_ENTRY.atoms }
				kinds={ THUMBNAIL_ENTRY.kinds }
				context={ THUMBNAIL_ENTRY.context }
				panelContent={ {
					'size-and-crop': (
						<AspectRatioField
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix="thumbnail"
							slot={ { prefix: 'thumbnail', kinds: THUMBNAIL_ENTRY.kinds, context: THUMBNAIL_ENTRY.context } }
						/>
					),
				} }
			/>
			<InspectorControls>
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
			</InspectorControls>

			<div { ...blockProps }>
				<div
					className="sgs-image-sequence-editor__preview-wrapper"
					style={ { aspectRatio: stageAspect } }
				>
					<SlotPicture
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="thumbnail"
						kinds={ THUMBNAIL_ENTRY.kinds }
						context={ THUMBNAIL_ENTRY.context }
						uid={ uid }
						className="sgs-image-sequence-editor__preview"
						fallbackAlt={ __( 'Image sequence thumbnail preview', 'sgs-blocks' ) }
						title={ __( 'Thumbnail image', 'sgs-blocks' ) }
						instructions={ __( 'An image sequence needs a thumbnail frame. Add one to get started, then configure the frame source in the sidebar.', 'sgs-blocks' ) }
					/>
				</div>

				<Notice status="info" isDismissible={ false }>
					{ __(
						'Scroll effects preview on the live site. The editor always shows the thumbnail frame.',
						'sgs-blocks'
					) }
				</Notice>

				<FrameSummary attributes={ attributes } />
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
