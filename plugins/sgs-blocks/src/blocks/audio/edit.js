import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
	Notice,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';

const STYLE_OPTIONS = [
	{ value: 'minimal', label: __( 'Minimal Pill', 'sgs-blocks' ), hint: __( 'Quiet: play + progress + timecode', 'sgs-blocks' ) },
	{ value: 'waveform', label: __( 'Waveform', 'sgs-blocks' ), hint: __( 'Peaks that fill with playback', 'sgs-blocks' ) },
	{ value: 'spectrum', label: __( 'Live Spectrum', 'sgs-blocks' ), hint: __( 'Frequency bars react to the sound', 'sgs-blocks' ) },
	{ value: 'radial', label: __( 'Radial + Glow', 'sgs-blocks' ), hint: __( 'Ring + glow pulses with volume', 'sgs-blocks' ) },
	{ value: 'oscilloscope', label: __( 'Oscilloscope', 'sgs-blocks' ), hint: __( 'Live waveform line on a scope', 'sgs-blocks' ) },
	{ value: 'gradient-pulse', label: __( 'Gradient Pulse', 'sgs-blocks' ), hint: __( 'Background shifts colour to the sound', 'sgs-blocks' ) },
	{ value: 'hidden', label: __( 'Hidden', 'sgs-blocks' ), hint: __( 'Plays with no visible player', 'sgs-blocks' ) },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		audioUrl,
		audioSource,
		audioId,
		playerStyle,
		audioControls,
		audioLoop,
		audioAutoplay,
		audioPreload,
		accentColour,
		spectrumColour,
		title,
	} = attributes;

	const blockProps = useBlockProps( { className: `sgs-audio sgs-audio--${ playerStyle }` } );
	const hasAudio = audioUrl || audioId;
	const isReactive = [ 'spectrum', 'radial', 'oscilloscope', 'gradient-pulse' ].includes( playerStyle );

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
			<InspectorControls>
				<PanelBody title={ __( 'Player style', 'sgs-blocks' ) } initialOpen={ true }>
					<div className="sgs-audio-style-grid">
						{ STYLE_OPTIONS.map( ( opt ) => (
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
							onChange={ ( value ) => setAttributes( { audioUrl: value, audioSource: 'external', audioId: null } ) }
							placeholder="https://example.com/audio.mp3"
							__nextHasNoMarginBottom
						/>
					) }
					<TextControl
						label={ __( 'Title / label (optional)', 'sgs-blocks' ) }
						value={ title || '' }
						onChange={ ( value ) => setAttributes( { title: value } ) }
						__nextHasNoMarginBottom
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
					/>
				</PanelBody>

				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Accent (signal)', 'sgs-blocks' ) }
						value={ accentColour }
						onChange={ ( value ) => setAttributes( { accentColour: value } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Spectrum (reactive)', 'sgs-blocks' ) }
						value={ spectrumColour }
						onChange={ ( value ) => setAttributes( { spectrumColour: value } ) }
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
