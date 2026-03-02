/**
 * SGS Mobile Nav Drawer — editor component.
 *
 * @since 1.0.0
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InnerBlocks,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	RangeControl,
	SelectControl,
} from '@wordpress/components';
import { IconPicker } from '../../components';

const POSITION_OPTIONS = [
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
];

const STYLE_OPTIONS = [
	{ label: __( 'Slide (side panel)', 'sgs-blocks' ), value: 'slide' },
	{ label: __( 'Full-width (top dropdown)', 'sgs-blocks' ), value: 'fullwidth' },
	{ label: __( 'Overlay (full screen)', 'sgs-blocks' ), value: 'overlay' },
];

const ALLOWED_BLOCKS = [
	'core/navigation',
	'core/heading',
	'core/paragraph',
	'core/image',
	'core/social-links',
	'core/buttons',
	'sgs/social-icons',
];

export default function Edit( { attributes, setAttributes } ) {
	const { closeIcon, closeIconSize, closeAriaLabel, position, drawerStyle } = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-mobile-nav-drawer-editor sgs-mobile-nav-drawer--${ position } sgs-mobile-nav-drawer--${ drawerStyle }`,
		style: {
			border: '1px dashed #ccc',
			borderRadius: '4px',
			padding: '16px',
			background: '#fafafa',
		},
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Drawer Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ drawerStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { drawerStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					{ drawerStyle === 'slide' && (
						<SelectControl
							label={ __( 'Slide from', 'sgs-blocks' ) }
							value={ position }
							options={ POSITION_OPTIONS }
							onChange={ ( val ) => setAttributes( { position: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
					<IconPicker
						label={ __( 'Close icon', 'sgs-blocks' ) }
						value={ closeIcon }
						onChange={ ( val ) => setAttributes( { closeIcon: val } ) }
					/>
					<RangeControl
						label={ __( 'Close icon size (px)', 'sgs-blocks' ) }
						value={ closeIconSize }
						onChange={ ( val ) => setAttributes( { closeIconSize: val } ) }
						min={ 16 }
						max={ 48 }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Close button aria label', 'sgs-blocks' ) }
						value={ closeAriaLabel }
						onChange={ ( val ) => setAttributes( { closeAriaLabel: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } }>
					<span style={ { fontSize: '12px', color: '#757575', textTransform: 'uppercase', letterSpacing: '0.5px' } }>
						📱 { __( 'Mobile Nav Drawer', 'sgs-blocks' ) } ({ drawerStyle }{ drawerStyle === 'slide' ? `, ${ position }` : '' })
					</span>
					<span style={ { fontSize: '11px', color: '#999' } }>
						✕ { closeIcon }
					</span>
				</div>
				<InnerBlocks
					allowedBlocks={ ALLOWED_BLOCKS }
					template={ [
						[ 'core/navigation', {
							textColor: 'surface',
							layout: { type: 'flex', orientation: 'vertical' },
							style: { spacing: { blockGap: '0' } },
							fontSize: 'medium',
						} ],
					] }
				/>
			</div>
		</>
	);
}
