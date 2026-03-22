import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import deprecated from './deprecated';
import './style.css';
import './editor.css';

// Extensions load once globally — animation + visibility controls
// for all sgs/* blocks. Bundled here because container always loads.
import '../extensions/animation';
import '../extensions/responsive-visibility';
import { containerIcon } from '../../utils';

registerBlockType( metadata.name, {
	icon: containerIcon,
	edit: Edit,
	save: Save,
	deprecated,
} );
