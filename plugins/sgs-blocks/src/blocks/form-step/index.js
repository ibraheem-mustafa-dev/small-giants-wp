import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import { formStepIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: formStepIcon,
	edit: Edit,
	save: Save,
} );
