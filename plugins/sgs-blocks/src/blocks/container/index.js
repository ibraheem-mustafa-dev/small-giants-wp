import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';

// Note: global block extensions (animation, responsive-visibility, etc.)
// are loaded unconditionally via enqueue_block_editor_assets → sgs-block-extensions.
// No need to import them here — importing from this bundle AND the extensions
// bundle caused both addFilter('editor.BlockEdit', ...) calls to execute, producing
// duplicate inspector panels on every sgs/* block in the editor.
import { containerIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: containerIcon,
	edit: Edit,
	save: Save,
} );
