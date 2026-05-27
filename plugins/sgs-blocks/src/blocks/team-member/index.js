import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import metadata from './block.json';
import Edit from './edit';
import deprecated from './deprecated';
import './style.css';
import './editor.css';

registerBlockType( metadata.name, {
	edit: Edit,
	// Dynamic block: render.php owns frontend output.
	// save must emit InnerBlocks.Content so WordPress serialises the
	// sgs/social-icons child block into post_content on save.
	// save: () => null would silently drop InnerBlocks — see CLAUDE.md gotcha.
	save: () => <InnerBlocks.Content />,
	deprecated,
} );
