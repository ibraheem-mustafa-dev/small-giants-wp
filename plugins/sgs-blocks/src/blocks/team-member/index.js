import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import deprecated from './deprecated';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit: Edit,
	// Pure dynamic leaf block — render.php owns all frontend output.
	// social links now live in the socialLinks scalar attribute, not InnerBlocks.
	save: () => null,
	deprecated,
} );