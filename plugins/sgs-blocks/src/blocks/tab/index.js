import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import deprecated from './deprecated';
import { tabIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: tabIcon,
	edit: Edit,
	save: () => null,
	deprecated,
} );
