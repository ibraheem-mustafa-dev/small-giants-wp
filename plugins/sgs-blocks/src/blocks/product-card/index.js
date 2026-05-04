import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';
import metadata from './block.json';
import Edit from './edit';
import deprecated from './deprecated';
import './style.css';

/**
 * Dynamic block — render.php handles frontend output.
 * Save returns <InnerBlocks.Content /> so WordPress persists the
 * sgs/multi-button + sgs/button InnerBlocks slot to post_content.
 */
registerBlockType( metadata.name, {
	edit: Edit,
	save: () => <InnerBlocks.Content />,
	deprecated,
} );
