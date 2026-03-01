import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import deprecated from './deprecated';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
	deprecated,

	/**
	 * Block transforms.
	 *
	 * Allows the block editor to offer a one-click conversion from the
	 * retired sgs/icon-block to the canonical sgs/icon block. The transform
	 * maps the different attribute names between the two schemas.
	 */
	transforms: {
		from: [
			{
				type:   'block',
				blocks: [ 'sgs/icon-block' ],

				/**
				 * Map sgs/icon-block attributes to sgs/icon attributes.
				 *
				 * @param {Object} attrs Attributes from the old block.
				 * @return {Object} Attributes for the new block.
				 */
				transform( attrs ) {
					return {
						icon:             attrs.icon             ?? 'star',
						size:             attrs.iconSize          ?? 48,
						iconColour:       attrs.iconColour        ?? 'primary',
						backgroundColour: attrs.backgroundColour  ?? '',
						backgroundShape:  attrs.shape             ?? 'none',
						link:             attrs.link              ?? '',
						linkOpensNewTab:  attrs.linkOpensNewTab   ?? false,
					};
				},
			},
		],
	},
} );
