import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Feature Grid block deprecations — newest first.
 *
 * v3 — gap attr type changed from number to string (2026-06-07).
 *      The block's own gap/gapUnit controls were consolidated onto the shared
 *      ContainerWrapperControls Gap control (which writes string values like
 *      "24px" or preset slugs like "40"). Existing posts stored gap as a bare
 *      number (e.g. 24) + gapUnit ("px"). migrate() combines them into the
 *      new single string value (e.g. "24px") so sgs_container_gap_value()
 *      can resolve them correctly.
 *
 *      Attribute snapshot matches block.json v0.2.0 (pre-consolidation).
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

/**
 * v3 attribute snapshot — block.json v0.2.0 before gap consolidation.
 * gap/gapTablet/gapMobile were number types; gapUnit was a separate string.
 */
const v3 = {
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
	isEligible( attributes ) {
		// Run only when gap is stored as a number (old format) rather than a
		// string (new format). typeof null === 'object', so the number check is
		// safe — null is the old gapTablet default and will not trigger this.
		return typeof attributes.gap === 'number';
	},
	migrate( attributes ) {
		const unit     = attributes.gapUnit || 'px';
		const gap      = typeof attributes.gap      === 'number' ? String( attributes.gap )      + unit : ( attributes.gap      || '24px' );
		const gapTablet  = typeof attributes.gapTablet  === 'number' ? String( attributes.gapTablet )  + unit : '';
		const gapMobile  = typeof attributes.gapMobile  === 'number' ? String( attributes.gapMobile )  + unit : '16px';
		const next = { ...attributes, gap, gapTablet, gapMobile };
		// gapUnit is no longer a recognised attribute — remove it to avoid
		// stale values persisting in the serialised block comment.
		delete next.gapUnit;
		return next;
	},
};

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

export default [ v3, v2, v1 ];
