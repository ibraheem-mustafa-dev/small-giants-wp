import { registerBlockType } from '@wordpress/blocks';
import edit from './edit';
import deprecated from './deprecated';
import metadata from './block.json';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit,
	save: () => null,
	deprecated,
} );
