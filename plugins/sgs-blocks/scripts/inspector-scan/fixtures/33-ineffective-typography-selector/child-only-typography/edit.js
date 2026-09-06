import { InnerBlocks } from '@wordpress/block-editor';

// GROUND-TRUTH: fixture reproduces the real sgs/hero shape (hero/edit.js:156,
// live-read 2026-08-18) — the typography class is set ONLY as a template
// child's className, never on any element this block itself renders.
const TEMPLATE = [
	[ 'sgs/heading', { level: 'h1', className: 'sgs-child-only-typography__headline', content: 'Headline' } ],
];

export default function Edit() {
	return <InnerBlocks template={ TEMPLATE } />;
}
