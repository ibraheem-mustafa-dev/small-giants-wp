import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';

// Extensions load once globally — animation + visibility controls
// for all sgs/* blocks. Bundled here because container always loads.
import '../extensions/animation';
import '../extensions/responsive-visibility';

registerBlockType( metadata.name, {
	edit: Edit,
	save: Save,
} );
