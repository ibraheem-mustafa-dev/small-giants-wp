/**
 * Generic block.json mock for Jest.
 *
 * Block index.js files import their block.json with:
 *   import metadata from './block.json';
 *   registerBlockType( metadata, { edit, save } );
 *
 * In tests we return a minimal valid block metadata object so registerBlockType
 * gets called with something plausible rather than throwing on an undefined name.
 *
 * The moduleNameMapper in jest.config.js routes '*.json' imports here, but
 * you can also use the real JSON files by removing that mapping if needed.
 */

'use strict';

module.exports = {
	$schema: 'https://schemas.wp.org/trunk/block.json',
	apiVersion: 3,
	name: 'sgs/mock-block',
	version: '0.1.0',
	title: 'SGS Mock Block',
	category: 'sgs-content',
	textdomain: 'sgs-blocks',
	attributes: {},
	supports: {
		html: false,
	},
	editorScript: 'file:./index.js',
};
