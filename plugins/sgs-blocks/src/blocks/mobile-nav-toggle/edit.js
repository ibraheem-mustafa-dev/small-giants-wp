/**
 * SGS Mobile Nav Toggle — editor component.
 *
 * @since 1.0.0
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, RangeControl } from '@wordpress/components';
import { IconPicker } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { icon, iconSize, ariaLabel } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-mobile-nav-toggle',
		style: {
			display: 'inline-flex',
			alignItems: 'center',
			justifyContent: 'center',
			cursor: 'pointer',
			padding: '8px',
		},
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Toggle Button', 'sgs-blocks' ) }>
					<IconPicker
						label={ __( 'Menu icon', 'sgs-blocks' ) }
						value={ icon }
						onChange={ ( val ) => setAttributes( { icon: val } ) }
					/>
					<RangeControl
						label={ __( 'Icon size (px)', 'sgs-blocks' ) }
						value={ iconSize }
						onChange={ ( val ) => setAttributes( { iconSize: val } ) }
						min={ 16 }
						max={ 48 }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Aria label', 'sgs-blocks' ) }
						value={ ariaLabel }
						onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<button { ...blockProps } aria-label={ ariaLabel } type="button">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={ iconSize }
					height={ iconSize }
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M3 6h18M3 12h18M3 18h18" />
				</svg>
			</button>
		</>
	);
}
