/**
 * Registers the SGS Modal block.
 */

import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import './style.css';
import './editor.css';
import Edit from './edit';
import metadata from './block.json';

// Deprecation for old attribute names (modalSize -> maxWidth, closeOnBackdrop -> closeOnOverlay).
const deprecated = [
	// v2: save was null (dynamic block with no serialised inner blocks).
	// Inner blocks were not saved to post content, so modal content was always empty.
	// This deprecation allows existing self-closing modal blocks to be parsed without error.
	{
		attributes: {
			triggerText: { type: 'string', default: 'Open Modal' },
			triggerStyle: { type: 'string', default: 'primary' },
			maxWidth: { type: 'string', default: 'medium' },
			closeOnOverlay: { type: 'boolean', default: true },
			modalBackground: { type: 'string', default: 'white' },
			overlayColour: { type: 'string', default: 'text' },
			overlayOpacity: { type: 'number', default: 50 },
		},
		save: () => null,
		migrate( attributes, innerBlocks ) {
			return [ attributes, innerBlocks ];
		},
	},
	// v1: old attribute names (modalSize / closeOnBackdrop).
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
		save: () => null,
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
	save: () => <InnerBlocks.Content />,
	deprecated,
} );
