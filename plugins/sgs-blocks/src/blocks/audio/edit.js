import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
	Button,
	ButtonGroup,
	Notice,
} from '@wordpress/components';
import { SgsColourPanel, ResponsiveBoxControl, resolveColourToken, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl, SgsBorderControl } from '../../components';
import { boxShorthand } from '../../utils/spacing-preview';

/** Editor-canvas mirror of render.php's border block — width/style/colour(+gradient)/radius. */
function buildBorderPreviewStyle( { borderStyle, borderWidth, borderColour, borderColourGradient, borderRadius } ) {
	const preview = {};
	if ( borderStyle && borderStyle !== 'none' ) {
		const borderWidthPreview = boxShorthand( borderWidth );
		if ( borderWidthPreview ) preview.borderWidth = borderWidthPreview;
		preview.borderStyle = borderStyle;
		if ( borderColour ) {
			preview.borderColor = /^#|^rgb|^hsl/.test( borderColour ) ? borderColour : `var(--wp--preset--color--${ borderColour })`;
		}
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			preview.borderImage = `${ borderColourGradient } 1`;
		}
	}
	const radiusBox = borderRadius?.desktop;
	if ( radiusBox && ( radiusBox.topLeft || radiusBox.topRight || radiusBox.bottomRight || radiusBox.bottomLeft ) ) {
		preview.borderRadius = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ]
			.map( ( k ) => radiusBox[ k ] || '0' ).join( ' ' );
	}
	return preview;
}

// Shared with isReactive below so the two can't drift apart.
const REACTIVE_STYLES = [ 'spectrum', 'radial', 'oscilloscope', 'gradient-pulse' ];

const STYLE_OPTIONS = [
	{ value: 'minimal', label: __( 'Minimal Pill', 'sgs-blocks' ), hint: __( 'Quiet: play + progress + timecode', 'sgs-blocks' ) },
	{ value: 'waveform', label: __( 'Waveform', 'sgs-blocks' ), hint: __( 'Peaks that fill with playback', 'sgs-blocks' ) },
	{ value: 'spectrum', label: __( 'Live Spectrum', 'sgs-blocks' ), hint: __( 'Frequency bars react to the sound', 'sgs-blocks' ) },
	{ value: 'radial', label: __( 'Radial + Glow', 'sgs-blocks' ), hint: __( 'Ring + glow pulses with volume', 'sgs-blocks' ) },
	{ value: 'oscilloscope', label: __( 'Oscilloscope', 'sgs-blocks' ), hint: __( 'Live waveform line on a scope', 'sgs-blocks' ) },
	{ value: 'gradient-pulse', label: __( 'Gradient Pulse', 'sgs-blocks' ), hint: __( 'Background shifts colour to the sound', 'sgs-blocks' ) },
	{ value: 'hidden', label: __( 'Hidden', 'sgs-blocks' ), hint: __( 'Plays with no visible player', 'sgs-blocks' ) },
];
const STATIC_STYLES = STYLE_OPTIONS.filter( ( opt ) => ! REACTIVE_STYLES.includes( opt.value ) );
const REACTIVE_STYLE_OPTIONS = STYLE_OPTIONS.filter( ( opt ) => REACTIVE_STYLES.includes( opt.value ) );

// Quick-pick presets snap the same 0-100 slider value used for fine-tuning —
// one attribute, two ways to set it. 50 is the pre-control default (matches
// view.js's SENSITIVITY 'medium' band exactly).
const SENSITIVITY_PRESETS = [
	{ value: 20, label: __( 'Calm', 'sgs-blocks' ) },
	{ value: 50, label: __( 'Balanced', 'sgs-blocks' ) },
	{ value: 80, label: __( 'Punchy', 'sgs-blocks' ) },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		audioUrl,
		audioSource,
		audioId,
		playerStyle,
		reactiveSensitivity,
		audioControls,
		audioLoop,
		audioAutoplay,
		audioPreload,
		accentColour,
		accentColourGradient,
		spectrumColour,
		title,
		borderColour,
		borderColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		borderStyle,
		borderWidth,
	} = attributes;

	// --sgs-audio-accent mirrors render.php's brand-accent custom property
	// (the player-brand colour driving the play button / seek thumb / progress
	// arc via style.css) — empty falls back to the theme primary token, same
	// default render.php uses. accentColour's DesignTokenPicker has no
	// `linked` prop, so it always stores a raw CSS value, never a slug —
	// resolveColourToken() (not colourVar(), which is slug-only) is the
	// correct resolver here.
	const [ palette ] = useSettings( 'color.palette' );
	const blockProps = useBlockProps( {
		className: `sgs-audio sgs-audio--${ playerStyle }`,
		style: {
			'--sgs-audio-accent': accentColour
				? resolveColourToken( accentColour, palette )
				: 'var(--wp--preset--color--primary, #c9821f)',
			// Gradient sibling (2026-09-06) — a SEPARATE custom property,
			// mirroring render.php's --sgs-audio-accent-gradient. Only the 3
			// genuine solid-fill background-image rules in style.css consume
			// it; --sgs-audio-accent above is untouched.
			...( accentColourGradient ? { '--sgs-audio-accent-gradient': accentColourGradient } : {} ),
			...buildBorderPreviewStyle( attributes ),
		},
	} );
	const hasAudio = audioUrl || audioId;
	const isReactive = REACTIVE_STYLES.includes( playerStyle );

	const onSelectAudio = ( media ) => {
		setAttributes( {
			audioId: media.id || null,
			audioUrl: media.url || '',
			audioMimeType: media.mime || '',
			audioSource: 'internal',
		} );
	};

	return (
		<>
			{ /* D609/D618 uniformity rollout — ONE grouped, SGS-owned colour
			   panel, rendered FIRST. Replaces the old scattered "Colours"
			   PanelBody below. No hover siblings exist for these two attrs. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'accent',
						label: __( 'Accent colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: accentColour,
								onChange: ( value ) => setAttributes( { accentColour: value } ),
								gradientValue: accentColourGradient,
								onGradientChange: ( value ) =>
									setAttributes( { accentColourGradient: value ?? '' } ),
							},
						],
					},
					{
						key: 'spectrum',
						label: __( 'Spectrum colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: spectrumColour,
								onChange: ( value ) => setAttributes( { spectrumColour: value } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Player style', 'sgs-blocks' ) } initialOpen={ true }>
					<p className="sgs-audio-style-group-label">{ __( 'Static styles', 'sgs-blocks' ) }</p>
					<div className="sgs-audio-style-grid">
						{ STATIC_STYLES.map( ( opt ) => (
							<button
								key={ opt.value }
								type="button"
								className={ `sgs-audio-style-btn${ playerStyle === opt.value ? ' is-selected' : '' }` }
								aria-pressed={ playerStyle === opt.value }
								onClick={ () => setAttributes( { playerStyle: opt.value } ) }
							>
								<span className="sgs-audio-style-btn__name">{ opt.label }</span>
								<span className="sgs-audio-style-btn__hint">{ opt.hint }</span>
							</button>
						) ) }
					</div>

					<p className="sgs-audio-style-group-label">{ __( 'Audio-reactive styles', 'sgs-blocks' ) }</p>
					<p className="sgs-audio-style-group-hint">
						{ __( 'These react live to the real audio via the Web Audio API.', 'sgs-blocks' ) }
					</p>
					<div className="sgs-audio-style-grid">
						{ REACTIVE_STYLE_OPTIONS.map( ( opt ) => (
							<button
								key={ opt.value }
								type="button"
								className={ `sgs-audio-style-btn${ playerStyle === opt.value ? ' is-selected' : '' }` }
								aria-pressed={ playerStyle === opt.value }
								onClick={ () => setAttributes( { playerStyle: opt.value } ) }
							>
								<span className="sgs-audio-style-btn__name">{ opt.label }</span>
								<span className="sgs-audio-style-btn__hint">{ opt.hint }</span>
							</button>
						) ) }
					</div>

					{ isReactive && (
						<div className="sgs-audio-sensitivity">
							<ButtonGroup className="sgs-audio-sensitivity__presets">
								{ SENSITIVITY_PRESETS.map( ( preset ) => (
									<Button
										key={ preset.value }
										variant={ ( reactiveSensitivity ?? 50 ) === preset.value ? 'primary' : 'secondary' }
										size="small"
										onClick={ () => setAttributes( { reactiveSensitivity: preset.value } ) }
									>
										{ preset.label }
									</Button>
								) ) }
							</ButtonGroup>
							<RangeControl
								label={ __( 'Reactivity', 'sgs-blocks' ) }
								help={ __( 'How snappy the visualiser feels — low is calmer, high is punchier.', 'sgs-blocks' ) }
								value={ reactiveSensitivity ?? 50 }
								onChange={ ( value ) => setAttributes( { reactiveSensitivity: value } ) }
								min={ 0 }
								max={ 100 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</div>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Audio source', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Source', 'sgs-blocks' ) }
						value={ audioSource || 'external' }
						options={ [
							{ label: __( 'Media Library', 'sgs-blocks' ), value: 'internal' },
							{ label: __( 'External URL', 'sgs-blocks' ), value: 'external' },
						] }
						onChange={ ( value ) => setAttributes( { audioSource: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'internal' === ( audioSource || 'external' ) ? (
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectAudio }
								allowedTypes={ [ 'audio' ] }
								value={ audioId }
								render={ ( { open } ) => (
									<Button variant="secondary" onClick={ open }>
										{ audioUrl ? __( 'Replace audio', 'sgs-blocks' ) : __( 'Select audio', 'sgs-blocks' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					) : (
						<TextControl
							label={ __( 'Audio URL', 'sgs-blocks' ) }
							value={ audioUrl || '' }
							onChange={ ( value ) => setAttributes( { audioUrl: value, audioSource: 'external', audioId: undefined } ) }
							placeholder="https://example.com/audio.mp3"
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					<TextControl
						label={ __( 'Title / label (optional)', 'sgs-blocks' ) }
						value={ title || '' }
						onChange={ ( value ) => setAttributes( { title: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Playback', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Show controls', 'sgs-blocks' ) }
						checked={ audioControls ?? true }
						onChange={ ( value ) => setAttributes( { audioControls: value } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Loop', 'sgs-blocks' ) }
						checked={ !! audioLoop }
						onChange={ ( value ) => setAttributes( { audioLoop: value } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Autoplay (may be blocked by browsers)', 'sgs-blocks' ) }
						checked={ !! audioAutoplay }
						onChange={ ( value ) => setAttributes( { audioAutoplay: value } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Preload', 'sgs-blocks' ) }
						value={ audioPreload || 'metadata' }
						options={ [
							{ label: __( 'Metadata', 'sgs-blocks' ), value: 'metadata' },
							{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
							{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
						] }
						onChange={ ( value ) => setAttributes( { audioPreload: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{ key: 'normal', label: __( 'Normal', 'sgs-blocks' ), value: borderColour,
							  onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							  gradientValue: borderColourGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) },
							{ key: 'hover', label: __( 'Hover', 'sgs-blocks' ), value: borderColourHover,
							  onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
							  gradientValue: borderColourHoverGradient,
							  onGradientChange: ( val ) => setAttributes( { borderColourHoverGradient: val ?? '' } ) },
						] }
						radiusValues={ {
							base: attributes.borderRadius?.desktop ?? {},
							tablet: attributes.borderRadius?.tablet ?? {},
							mobile: attributes.borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! hasAudio ? (
					'internal' === ( audioSource || 'external' ) ? (
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectAudio }
								allowedTypes={ [ 'audio' ] }
								render={ ( { open } ) => (
									<div className="components-placeholder">
										<div className="components-placeholder__label">{ __( 'SGS Audio', 'sgs-blocks' ) }</div>
										<div className="components-placeholder__instructions">
											{ __( 'Select an audio file, then choose a player style in the sidebar.', 'sgs-blocks' ) }
										</div>
										<Button variant="primary" onClick={ open }>{ __( 'Select audio', 'sgs-blocks' ) }</Button>
									</div>
								) }
							/>
						</MediaUploadCheck>
					) : (
						<div className="components-placeholder">
							<div className="components-placeholder__label">{ __( 'SGS Audio', 'sgs-blocks' ) }</div>
							<div className="components-placeholder__instructions">
								{ __( 'Enter an audio URL in the block settings, then choose a player style.', 'sgs-blocks' ) }
							</div>
						</div>
					)
				) : (
					<div className="sgs-audio-editor-preview">
						{ title && <p className="sgs-audio__title">{ title }</p> }
						<audio className="sgs-audio__native" controls src={ audioUrl } style={ { width: '100%' } } />
						<Notice status="info" isDismissible={ false }>
							{ __( 'Style:', 'sgs-blocks' ) } <strong>{ STYLE_OPTIONS.find( ( o ) => o.value === playerStyle )?.label }</strong>
							{ isReactive && ' — ' + __( 'the reactive visualiser renders on the published page.', 'sgs-blocks' ) }
							{ 'hidden' === playerStyle && ' — ' + __( 'no visible player on the published page.', 'sgs-blocks' ) }
						</Notice>
					</div>
				) }
			</div>
		</>
	);
}
