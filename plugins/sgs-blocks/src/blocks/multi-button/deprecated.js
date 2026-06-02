import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Multi-Button block deprecations — newest first.
 *
 * v2 — Null save shape (2026-05-21 → 2026-06-02).
 *      save.js was incorrectly returning null after the dynamic-render
 *      conversion. WordPress serialised no InnerBlocks content into
 *      post_content, causing render.php to receive an empty $content on
 *      re-save. Any posts saved while this shape was active are matched
 *      here so WordPress can upgrade them to the current InnerBlocks.Content
 *      shape without a block-validation error.
 *      migrate() is an identity pass-through — no attribute shape change.
 *
 * v1 — Static save shape from before the dynamic conversion (pre 2026-05-21).
 *      save.js produced a plain wrapper div with InnerBlocks.Content inside.
 *      Attribute snapshot matches block.json v1.0.0.
 *      migrate() is an identity pass-through — no attribute shape change.
 */

const v2 = {
	attributes: {
		direction:              { type: 'string', default: 'row' },
		directionTablet:        { type: 'string', default: '' },
		directionMobile:        { type: 'string', default: 'column' },
		gap:                    { type: 'number', default: 12 },
		gapTablet:              { type: 'number', default: null },
		gapMobile:              { type: 'number', default: 8 },
		gapUnit:                { type: 'string', default: 'px' },
		justifyContent:         { type: 'string', default: 'flex-start' },
		justifyContentTablet:   { type: 'string', default: '' },
		justifyContentMobile:   { type: 'string', default: '' },
		wrap:                   { type: 'string', default: 'wrap' },
		wrapTablet:             { type: 'string', default: '' },
		wrapMobile:             { type: 'string', default: 'wrap' },
		alignItems:             { type: 'string', default: 'center' },
	},
	supports: {
		anchor: true,
		customClassName: true,
		html: false,
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
		direction:              { type: 'string', default: 'row' },
		directionTablet:        { type: 'string', default: '' },
		directionMobile:        { type: 'string', default: 'column' },
		gap:                    { type: 'number', default: 12 },
		gapTablet:              { type: 'number', default: null },
		gapMobile:              { type: 'number', default: 8 },
		gapUnit:                { type: 'string', default: 'px' },
		justifyContent:         { type: 'string', default: 'flex-start' },
		justifyContentTablet:   { type: 'string', default: '' },
		justifyContentMobile:   { type: 'string', default: '' },
		wrap:                   { type: 'string', default: 'wrap' },
		wrapTablet:             { type: 'string', default: '' },
		wrapMobile:             { type: 'string', default: 'wrap' },
		alignItems:             { type: 'string', default: 'center' },
	},
	supports: {
		anchor: true,
		customClassName: true,
		html: false,
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
