import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit.js';
import Save from './save.js';

registerBlockType(metadata.name, { edit: Edit, save: Save });
