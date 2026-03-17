import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const SPEED_OPTIONS = [
	{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
];

function LogoEditor( { logo, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...logo, [ key ]: value } );
	};

	return (
		<div
			style={ {
				borderBottom: '1px solid #ddd',
				paddingBottom: '12px',
				marginBottom: '12px',
			} }
		>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }
				{ logo.alt ? ` — ${ logo.alt }` : '' }
			</p>

			<MediaUploadCheck>
				<MediaUpload
					onSelect={ ( media ) => {
						update( 'image', {
							id: media.id,
							url: media.url,
							alt: media.alt,
						} );
						if ( ! logo.alt && media.alt ) {
							update( 'alt', media.alt );
						}
					} }
					allowedTypes={ [ 'image' ] }
					value={ logo.image?.id }
					render={ ( { open } ) => (
						<div style={ { marginBottom: '8px' } }>
							{ logo.image?.url ? (
								<>
									<img
										src={ logo.image.url }
										alt=""
										style={ {
											maxWidth: '100px',
											maxHeight: '48px',
											objectFit: 'contain',
											display: 'block',
											marginBottom: '4px',
										} }
									/>
									<Button
										variant="link"
										isDestructive
										onClick={ () =>
											update( 'image', undefined )
										}
										size="small"
									>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								</>
							) : (
								<Button
									variant="secondary"
									onClick={ open }
									size="small"
								>
									{ __(
										'Select logo',
										'sgs-blocks'
									) }
								</Button>
							) }
						</div>
					) }
				/>
			</MediaUploadCheck>

			<TextControl
				label={ __( 'Alt text', 'sgs-blocks' ) }
				value={ logo.alt || '' }
				onChange={ ( val ) => update( 'alt', val ) }
				__nextHasNoMarginBottom
			/>

			<TextControl
				label={ __( 'Link URL (optional)', 'sgs-blocks' ) }
				value={ logo.url || '' }
				onChange={ ( val ) => update( 'url', val ) }
				type="url"
				__nextHasNoMarginBottom
			/>

			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove logo', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		logos,
		scrolling,
		scrollSpeed,
		greyscale,
		maxHeight,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverEffect,
		transitionDuration,
		transitionEasing,
	} = attributes;

	const updateLogo = ( index, updated ) => {
		const next = [ ...logos ];
		next[ index ] = updated;
		setAttributes( { logos: next } );
	};

	const removeLogo = ( index ) => {
		setAttributes( {
			logos: logos.filter( ( _, i ) => i !== index ),
		} );
	};

	const addLogo = () => {
		setAttributes( {
			logos: [
				...logos,
				{ image: undefined, alt: '', url: '' },
			],
		} );
	};

	const className = [
		'sgs-brand-strip',
		greyscale ? 'sgs-brand-strip--greyscale' : '',
		scrolling ? 'sgs-brand-strip--scrolling' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: {
			'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
			'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
			'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
			'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		},
	} );

	const trackStyle = {
		'--sgs-logo-max-height': `${ maxHeight }px`,
		'--sgs-scroll-speed': scrolling ? SPEED_MAP[ scrollSpeed ] : undefined,
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Logo max height (px)', 'sgs-blocks' ) }
						value={ maxHeight }
						onChange={ ( val ) =>
							setAttributes( { maxHeight: val } )
						}
						min={ 24 }
						max={ 120 }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) =>
							setAttributes( { transitionDuration: val } )
						}
						help={ __( 'Duration of the greyscale-to-colour hover transition in milliseconds. Default: 300.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ [
							{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
							{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
							{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
							{ label: __( 'Ease in–out', 'sgs-blocks' ), value: 'ease-in-out' },
							{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
						] }
						onChange={ ( val ) =>
							setAttributes( { transitionEasing: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Greyscale', 'sgs-blocks' ) }
						help={ __(
							'Display logos in greyscale, colour on hover.',
							'sgs-blocks'
						) }
						checked={ greyscale }
						onChange={ ( val ) =>
							setAttributes( { greyscale: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __(
							'Infinite scroll animation',
							'sgs-blocks'
						) }
						checked={ scrolling }
						onChange={ ( val ) =>
							setAttributes( { scrolling: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ scrolling && (
						<SelectControl
							label={ __( 'Scroll speed', 'sgs-blocks' ) }
							value={ scrollSpeed }
							options={ SPEED_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { scrollSpeed: val } )
							}
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Hover States', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { hoverEffect: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Hover background colour', 'sgs-blocks' ) }
						value={ hoverBackgroundColour }
						onChange={ ( val ) =>
							setAttributes( { hoverBackgroundColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover text colour', 'sgs-blocks' ) }
						value={ hoverTextColour }
						onChange={ ( val ) =>
							setAttributes( { hoverTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover border colour', 'sgs-blocks' ) }
						value={ hoverBorderColour }
						onChange={ ( val ) =>
							setAttributes( { hoverBorderColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Logos', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					{ logos.map( ( logo, index ) => (
						<LogoEditor
							key={ index }
							logo={ logo }
							index={ index }
							onChange={ ( updated ) =>
								updateLogo( index, updated )
							}
							onRemove={ () => removeLogo( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addLogo }>
						{ __( 'Add logo', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ logos.length === 0 ? (
					<p className="sgs-brand-strip__empty">
						{ __(
							'Add logos in the sidebar panel.',
							'sgs-blocks'
						) }
					</p>
				) : (
					<div
						className="sgs-brand-strip__track"
						style={ trackStyle }
					>
						{ logos.map( ( logo, i ) =>
							logo.image?.url ? (
								<div
									key={ i }
									className="sgs-brand-strip__item"
								>
									<img
										src={ logo.image.url }
										alt={ logo.alt || '' }
										className="sgs-brand-strip__logo"
										style={ {
											maxHeight: `${ maxHeight }px`,
										} }
									/>
								</div>
							) : null
						) }
					</div>
				) }
			</div>
		</>
	);
}

const SPEED_MAP = {
	slow: '40s',
	medium: '25s',
	fast: '15s',
};
