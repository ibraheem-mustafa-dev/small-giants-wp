import { registerBlockType } from '@wordpress/blocks';
import { tableOfContentsIcon } from '../../utils/icons';
import metadata from './block.json';
import Edit from './edit';

registerBlockType( metadata.name, {
	icon: tableOfContentsIcon,
	edit: Edit,
	save: () => null,
} );
