'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/01-enforcer-truth-matrix.md row 18
// source=file evidence=row 18 verdict "ABSENT (claim CORRECT)" — no script in
// the tree checks a decorative-image toggle or an ARIA-label control. Genuinely
// NEW detector.
//
// REVISED 2026-08-03 — cross-checked per the coordinator's "apply the same
// scrutiny to 18 and 20" instruction. An independent re-implementation
// confirmed the raw COUNT (12) was right for the literal-<img>-in-edit.js
// condition, but a further check ("could an <img> live in a shared component
// this rule can't see, the same class of bug as rule 01?") found a REAL gap:
// `MediaPicker.js` genuinely renders `<img>` (confirmed :125) and is used by
// 9 blocks via a direct path import, not the index.js barrel. Two of those —
// brand-strip, team-member — have ZERO literal `<img>` of their own and were
// completely invisible to the original version of this rule. Fixed by
// resolving image-rendering shared components from core/components.js
// (widened 2026-08-03 to scan the whole components/ directory, not only
// barrel exports) the same way rule 01 resolves panel-wrapping components —
// never by import-path string matching (the block is credited with using
// MediaPicker because its JSX contains `<MediaPicker`, cross-referenced
// against a component whose OWN source was read and found to render <img>).

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

const IMG_TAG_RE = /<img\b/;
const DECORATIVE_ATTR_RE = /decorative|arialabel|alttext/i;

// S1 fix (2026-09-02): an attribute literally named `ariaLabel` (exact
// case-sensitive name) is the D647 LANDMARK-LABEL convention — confirmed by
// reading render.php in hero/cta-section/trust-bar/container/site-header/
// site-footer: it is applied ONLY to the section root, gated on
// `tag === 'nav' || 'aside'`, never to any <img>. It coincidentally matched
// the /arialabel/i branch of DECORATIVE_ATTR_RE, false-clearing 3 blocks that
// genuinely render an <img> with no real decorative/alt mechanism of their
// own (hero, cta-section, trust-bar — each confirmed via a literal `<img` or
// `<MediaPicker` in edit.js). `container` also carries this exact attr but
// renders no <img> in edit.js at all, so excluding it here is a no-op for
// container specifically (moot, not a 4th real case). A DIFFERENTLY-NAMED
// attribute (e.g. `imageAriaLabel`) still satisfies the rule as before —
// only this one exact landmark name is excluded.
const LANDMARK_LABEL_ATTR = 'ariaLabel';

function imageWrappingComponentNames( ctx ) {
	const names = [];
	if ( ctx.components && ctx.components.ok ) {
		for ( const [ name, info ] of Object.entries( ctx.components.exportsMap ) ) {
			if ( info.wrapsImage ) names.push( name );
		}
	}
	return names;
}

function rendersAnImage( text, componentNames ) {
	if ( IMG_TAG_RE.test( text ) ) return true;
	for ( const name of componentNames ) {
		if ( new RegExp( `<${ name }\\b` ).test( text ) ) return true;
	}
	return false;
}

module.exports = {
	id: '18-decorative-image-aria',
	checklistItem: 18,
	title: 'Decorative-image toggle + ARIA-label control present where an <img> is rendered',
	scope: 'per-block',
	needs: [ 'stripped:edit.js', 'json:block.json', 'components' ],
	run( ctx, block ) {
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const blockJsonFile = path.join( ctx.blocksDir, block.tail, 'block.json' );

		// Comment-stripped text, not raw text — an <img> mentioned only inside a
		// comment (e.g. "no <img> anywhere in this block") must not count as a
		// render. Caught live by this rule's own negative-control fixture during
		// self-test (2026-08-03): the fixture's own explanatory comment contained
		// the literal substring "<img" and false-positived on raw text.
		const text = ctx.stripped( editFile );
		if ( text == null ) return [];

		const componentNames = imageWrappingComponentNames( ctx );
		if ( ! rendersAnImage( text, componentNames ) ) return []; // no <img>, direct or via a shared component

		const blockJson = ctx.json( blockJsonFile );
		if ( ! blockJson.ok ) return []; // malformed/absent block.json is a different rule's concern

		const attributes = blockJson.data.attributes || {};
		const attrNames = Object.keys( attributes );
		const hasDecorativeAttr = attrNames.some(
			( a ) => a !== LANDMARK_LABEL_ATTR && DECORATIVE_ATTR_RE.test( a )
		);
		if ( hasDecorativeAttr ) return [];

		// A repeater block (an array-typed attribute whose items are objects,
		// e.g. `logos`/`items`/`images`) stores its image PER-ITEM, so the
		// decorative flag legitimately lives at `items.properties.decorative`
		// rather than as a top-level attribute — the correct shape (D918/S8's
		// {element}Decorative convention scoped to the item, not the block),
		// confirmed live across sgs/brand-strip, sgs/card-grid, sgs/gallery and
		// sgs/trust-bar (2026-09-03 batch) all independently reporting this
		// exact false-positive. Recurse one level into each array attribute's
		// item schema before concluding no decorative mechanism exists.
		const hasNestedDecorativeAttr = attrNames.some( ( a ) => {
			const attr = attributes[ a ];
			if ( ! attr || attr.type !== 'array' ) return false;
			const itemProps = attr.items && attr.items.properties;
			if ( ! itemProps || typeof itemProps !== 'object' ) return false;
			return Object.keys( itemProps ).some( ( p ) => DECORATIVE_ATTR_RE.test( p ) );
		} );
		if ( hasNestedDecorativeAttr ) return [];

		return [
			makeFinding( {
				rule: this.id,
				block: block.slug,
				file: editFile,
				severity: 'warn',
				detail:
					'edit.js renders an <img> (directly or via a shared image-rendering component) but block.json declares no attribute matching /decorative|ariaLabel|altText/i — no decorative-image toggle or general ARIA-label control is exposed.',
				fix: 'Add a boolean attribute such as "isDecorative" (renders empty alt + aria-hidden when true) and/or an "ariaLabel" text attribute with an inspector control, per Spec 35 item 18.',
				keyParts: [ 'no-decorative-toggle' ],
			} ),
		];
	},
	selfTest: {
		fixture: 'fixtures/18-decorative-image-aria',
		mustFlag: [
			'image-no-decorative-toggle',
			'image-via-shared-component',
			'image-via-repeater-without-decorative',
		],
		mustNotFlag: [
			'image-with-decorative-toggle',
			'no-image-at-all',
			'image-via-repeater-with-decorative',
		],
	},
};
