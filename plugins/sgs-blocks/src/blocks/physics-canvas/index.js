import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';

// Global block extensions (animation, responsive-visibility, etc.) load
// unconditionally via enqueue_block_editor_assets — not imported here, same
// reasoning as every other SGS block (see container/index.js).

registerBlockType( metadata.name, {
	edit: Edit,
	save: Save,
} );
