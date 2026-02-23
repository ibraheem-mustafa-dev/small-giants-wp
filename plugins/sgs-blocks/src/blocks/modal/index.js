/**
 * Registers the SGS Modal block.
 */

import { registerBlockType } from '@wordpress/blocks';
import './style.css';
import './editor.css';
import Edit from './edit';
import metadata from './block.json';

// Deprecation for old attribute names (modalSize -> maxWidth, closeOnBackdrop -> closeOnOverlay).
const deprecated = [
	{
		attributes: {
			triggerText: {
				type: 'string',
				default: 'Open Modal',
			},
			triggerStyle: {
				type: 'string',
				default: 'primary',
			},
			triggerColour: {
				type: 'string',
			},
			triggerBackground: {
				type: 'string',
			},
			modalSize: {
				type: 'string',
				default: 'medium',
			},
			closeOnBackdrop: {
				type: 'boolean',
				default: true,
			},
			modalBackground: {
				type: 'string',
				default: 'white',
			},
			overlayColour: {
				type: 'string',
				default: '#000000',
			},
			overlayOpacity: {
				type: 'number',
				default: 50,
			},
		},
		migrate( attributes ) {
			return {
				triggerText: attributes.triggerText,
				triggerStyle: attributes.triggerStyle,
				triggerColour: attributes.triggerColour,
				triggerBackground: attributes.triggerBackground,
				maxWidth: attributes.modalSize,
				closeOnOverlay: attributes.closeOnBackdrop,
				modalBackground: attributes.modalBackground,
				overlayColour: attributes.overlayColour,
				overlayOpacity: attributes.overlayOpacity,
			};
		},
		isEligible( attributes ) {
			return (
				attributes.hasOwnProperty( 'modalSize' ) ||
				attributes.hasOwnProperty( 'closeOnBackdrop' )
			);
		},
	},
];

registerBlockType( metadata.name, {
	edit: Edit,
	deprecated,
} );
