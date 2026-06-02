import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Feature Grid block deprecations — newest first.
 *
 * v2 — save: () => null shape (post-dynamic-conversion, pre-B4 fix).
 *      After the block was made dynamic (2026-05-21), save() was incorrectly
 *      set to return null. WordPress cannot serialise InnerBlocks children
 *      when save returns null, so any post saved during this period has only
 *      the parent block comment in post_content with no child markup.
 *      migrate() is an identity pass-through — no attribute shape changed,
 *      and on the next editor save the corrected save() (<InnerBlocks.Content />)
 *      will re-serialise any children still live in the editor state.
 *
 *      Attribute snapshot matches block.json v0.1.0.
 *
 * v1 — Static save shape from before the dynamic conversion (2026-05-21).
 *      save.js used to produce a plain wrapper div with InnerBlocks.Content
 *      inside.
 *
 *      Attribute snapshot matches block.json v0.1.0.
 *      migrate() is an identity pass-through — no attribute shape change.
 */

const v2 = {
	attributes: {
		layoutMode:       { type: 'string', default: 'auto-flex' },
		columnsDesktop:   { type: 'number', default: 4 },
		columnsTablet:    { type: 'number', default: 2 },
		columnsMobile:    { type: 'number', default: 1 },
		minItemWidth:     { type: 'number', default: 240 },
		minItemWidthUnit: { type: 'string', default: 'px' },
		gap:              { type: 'number', default: 24 },
		gapTablet:        { type: 'number', default: null },
		gapMobile:        { type: 'number', default: 16 },
		gapUnit:          { type: 'string', default: 'px' },
		alignItems:       { type: 'string', default: 'stretch' },
		justifyItems:     { type: 'string', default: 'stretch' },
	},
	supports: {
		anchor: true,
		customClassName: true,
		html: false,
		align: [ 'wide', 'full' ],
		color: { background: true, text: false },
		spacing: { margin: true, padding: true },
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return attributes;
	},
};

const v1 = {
	attributes: {
		layoutMode:       { type: 'string', default: 'auto-flex' },
		columnsDesktop:   { type: 'number', default: 4 },
		columnsTablet:    { type: 'number', default: 2 },
		columnsMobile:    { type: 'number', default: 1 },
		minItemWidth:     { type: 'number', default: 240 },
		minItemWidthUnit: { type: 'string', default: 'px' },
		gap:              { type: 'number', default: 24 },
		gapTablet:        { type: 'number', default: null },
		gapMobile:        { type: 'number', default: 16 },
		gapUnit:          { type: 'string', default: 'px' },
		alignItems:       { type: 'string', default: 'stretch' },
		justifyItems:     { type: 'string', default: 'stretch' },
	},
	supports: {
		anchor: true,
		customClassName: true,
		html: false,
		align: [ 'wide', 'full' ],
		color: { background: true, text: false },
		spacing: { margin: true, padding: true },
	},
	save() {
		return (
			<div { ...useBlockProps.save() }>
				<InnerBlocks.Content />
			</div>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v2, v1 ];
