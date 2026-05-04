import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import deprecated from './deprecated';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
	deprecated,
} );
