import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Multi-Button block deprecations.
 *
 * v1 — Static save shape from before the dynamic conversion (2026-05-21).
 *      save.js used to produce a plain wrapper div with InnerBlocks.Content
 *      inside. After the dynamic conversion, save() returns null and all
 *      frontend rendering (flex layout, responsive CSS, scoped UID) is
 *      delegated to render.php.
 *
 *      Attribute snapshot matches block.json v1.0.0.
 *      migrate() is an identity pass-through — no attribute shape change.
 */

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

export default [ v1 ];
