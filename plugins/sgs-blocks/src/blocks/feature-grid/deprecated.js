import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Feature Grid block deprecations.
 *
 * v1 — Static save shape from before the dynamic conversion (2026-05-21).
 *      save.js used to produce a plain wrapper div with InnerBlocks.Content
 *      inside. After the dynamic conversion, save() returns null and all
 *      frontend rendering is delegated to render.php.
 *
 *      Attribute snapshot matches block.json v0.1.0.
 *      migrate() is an identity pass-through — no attribute shape change.
 */

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

export default [ v1 ];
