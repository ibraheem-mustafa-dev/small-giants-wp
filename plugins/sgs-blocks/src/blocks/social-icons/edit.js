import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
	Button,
	Flex,
	FlexItem,
	FlexBlock,
} from '@wordpress/components';
import { DesignTokenPicker, SpacingControl } from '../../components';

const PLATFORMS = [
	'facebook', 'twitter', 'linkedin', 'instagram', 'youtube',
	'tiktok', 'github', 'whatsapp', 'email', 'website',
	'pinterest', 'snapchat', 'telegram', 'discord',
];

const STYLE_OPTIONS = [
	{ label: __( 'Plain', 'sgs-blocks' ), value: 'plain' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
	{ label: __( 'Outlined', 'sgs-blocks' ), value: 'outlined' },
	{ label: __( 'Pill', 'sgs-blocks' ), value: 'pill' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { icons, iconSize, iconColour, hoverColour, style, gap } = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-social-icons sgs-social-icons--${ style }`,
	} );

	const updateIcon = ( index, field, value ) => {
		const updated = [ ...icons ];
		updated[ index ] = { ...updated[ index ], [ field ]: value };
		setAttributes( { icons: updated } );
	};

	const addIcon = () => {
		setAttributes( { icons: [ ...icons, { platform: 'website', url: '' } ] } );
	};

	const removeIcon = ( index ) => {
		setAttributes( { icons: icons.filter( ( _, i ) => i !== index ) } );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) }>
					{ icons.map( ( icon, index ) => (
						<Flex key={ index } style={ { marginBottom: '8px' } }>
							<FlexItem>
								<SelectControl
									value={ icon.platform }
									options={ PLATFORMS.map( ( p ) => ( { label: p, value: p } ) ) }
									onChange={ ( val ) => updateIcon( index, 'platform', val ) }
									__nextHasNoMarginBottom
								/>
							</FlexItem>
							<FlexBlock>
								<TextControl
									value={ icon.url }
									onChange={ ( val ) => updateIcon( index, 'url', val ) }
									placeholder="https://…"
									__nextHasNoMarginBottom
								/>
							</FlexBlock>
							<FlexItem>
								<Button icon="trash" isDestructive onClick={ () => removeIcon( index ) } label={ __( 'Remove', 'sgs-blocks' ) } />
							</FlexItem>
						</Flex>
					) ) }
					<Button variant="secondary" onClick={ addIcon }>
						{ __( 'Add social link', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				<PanelBody title={ __( 'Appearance', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ style }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { style: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Icon size (px)', 'sgs-blocks' ) }
						value={ iconSize }
						onChange={ ( val ) => setAttributes( { iconSize: val } ) }
						min={ 16 }
						max={ 64 }
						__nextHasNoMarginBottom
					/>
					<SpacingControl
						label={ __( 'Gap', 'sgs-blocks' ) }
						value={ gap }
						onChange={ ( val ) => setAttributes( { gap: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) => setAttributes( { iconColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Hover colour', 'sgs-blocks' ) }
						value={ hoverColour }
						onChange={ ( val ) => setAttributes( { hoverColour: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ icons.length === 0 ? (
					<p style={ { opacity: 0.5 } }>{ __( 'Add social links in the sidebar…', 'sgs-blocks' ) }</p>
				) : (
					icons.map( ( icon, i ) => (
						<span key={ i } className="sgs-social-icons__item" style={ { width: iconSize, height: iconSize } }>
							{ icon.platform }
						</span>
					) )
				) }
			</div>
		</>
	);
}
