'use strict';
// Mock for @wordpress/blocks
module.exports = {
	__esModule: true,
	registerBlockType: jest.fn(),
	unregisterBlockType: jest.fn(),
	getBlockType: jest.fn( () => null ),
	getBlockTypes: jest.fn( () => [] ),
	getBlockSupport: jest.fn( () => false ),
	hasBlockSupport: jest.fn( () => false ),
	getBlockAttributes: jest.fn( () => ( {} ) ),
	createBlock: jest.fn( ( name, attrs ) => ( { name, attributes: attrs || {}, innerBlocks: [] } ) ),
	cloneBlock: jest.fn( ( block ) => ( { ...block } ) ),
	isReusableBlock: jest.fn( () => false ),
	isTemplatePart: jest.fn( () => false ),
	serialize: jest.fn( () => '' ),
	parse: jest.fn( () => [] ),
	rawHandler: jest.fn( () => [] ),
	getDefaultBlockName: jest.fn( () => 'core/paragraph' ),
	setDefaultBlockName: jest.fn(),
	getFreeformContentHandlerName: jest.fn( () => 'core/freeform' ),
	pasteHandler: jest.fn( () => [] ),
	store: { name: 'core/blocks' },
};
