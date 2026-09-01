/**
 * ProductCardImagePanelLayout — media-atom panel assembly for `sgs/product-card`.
 *
 * Sibling to `MediaPanelLayout.js` (sgs/media's own panel assembly), NOT a copy
 * of it — product-card's image is one element among many (title/price/CTA/…),
 * not the whole block, so this panel is much smaller and mounts into the
 * block's EXISTING "Card layout" inspector section rather than opening its own
 * top-level panel.
 *
 * ── Why `prefix: "image"`, not the unprefixed `""` a first read of the task
 * would suggest ────────────────────────────────────────────────────────────
 *
 * `box-shape.reads['sgs/product-card'].imageHeight` (registry.js) documents
 * that this block's own `imageHeight` (a plain "180px" STRING) is the
 * legacy shape the `box-shape` atom's `Height` base should read for this
 * block. That `reads` field is PROSE ONLY — the actual attribute-name
 * resolution the atom controls/CSS use is `mediaStoredAttrName()`
 * (`MediaElementControls.js`), which is driven by the `STORED_AS` map in
 * that same file. `STORED_AS` has NO entry for `sgs/product-card`, and that
 * file lives outside this block's own directory (out of scope for this
 * migration — editing a file nine other surfaces depend on is a separate,
 * design-gated change).
 *
 * `mediaStoredAttrName( blockSlug, prefix, base )` falls back to
 * `mediaAttrName( prefix, base )` when no override exists —
 * PascalCase-concatenated onto the prefix. Working the algebra backwards:
 * `mediaAttrName( 'image', 'Height' )` = `'image' + 'Height'` = `'imageHeight'`
 * — an EXACT match for the block's own existing attribute, with ZERO edits
 * to the shared naming file and ZERO renames. `prefix: ''` does NOT produce
 * this match (it lowercases to `'height'`, a brand-new attribute unrelated
 * to `imageHeight`), which is why the literal empty-string prefix the task
 * describes is not used here. It is also a more accurate name than an
 * unprefixed one: this entry governs product-card's ONE product image, not
 * the whole block (unlike sgs/media, which is nothing BUT a media element).
 *
 * ── `box-shape` is deliberately NOT declared, not merely unmounted ─────────
 *
 * `box-shape` is NOT in this block's `supports.sgs.mediaElements.atoms` —
 * this was corrected from an earlier draft that declared it "for the
 * schema" while leaving its control unmounted. That shape is a real defect:
 * `imageHeight` (this block's own pre-existing attribute) already exists in
 * block.json's own `attributes`, so the injection filter's "the block's own
 * declaration always wins" rule leaves it untouched either way — but every
 * OTHER base `box-shape` owns (Shape/BorderRadius/BorderWidth/MaxWidth/
 * MinHeight/Width/…) would have been freshly injected into this block's
 * registered schema, with NO editor control and NO render.php consumption —
 * dead-attribute debt for zero client benefit, and exactly the
 * declared-without-control shape this framework's own quality gates exist
 * to catch.
 *
 * The underlying reason box-shape's CONTROL isn't adopted this pass still
 * stands and is worth keeping: `box-shape.control.js` is one monolithic
 * composite (`<MediaBoxShapeControls>`), so there is no way to adopt just
 * its Height row without also adopting Shape/Border/MaxWidth/MinHeight/
 * Width. Those write custom properties (`--sgs-media-*`) that only paint
 * once the element also carries the shared `.sgs-media-el` marker class —
 * and `assets/css/media-element.css` declares `.sgs-media-el{ height:
 * var(--sgs-media-height,auto); … }` UNCONDITIONALLY, at the same (0,1,0)
 * specificity as this block's own `.product-card-img`/
 * `.sgs-product-card__image{ height:var(--sgs-product-card-image-height,
 * 220px) }` rules (style.css). The two FALLBACK VALUES genuinely disagree
 * (`auto` vs `220px`) — so merely adding the marker class risks visibly
 * shrinking every unstyled product image to its natural aspect the moment
 * either stylesheet happens to load after the other, independent of
 * whether a client ever touches the new box-shape control. (object-fit's
 * own fallback, `cover`, happens to already match this block's hardcoded
 * value, which is why that one specific property would be comparatively
 * low-risk — but this atom bundles height/width/border/etc alongside it in
 * one non-severable control, so the whole composite is withheld together.)
 * This is a cascade outcome this worktree cannot verify without a live
 * canary deploy. `imageHeight` therefore continues to be edited via
 * product-card's own existing "Card layout" panel control — unchanged by
 * this migration — while still being read, unchanged in shape, by the SAME
 * render.php mechanism it always used. box-shape adoption is deferred to a
 * future pass once the cascade risk is verified live.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import MediaElementPanel from '../MediaElementPanel.js';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   [props.previewUrl]  The product image URL, for the focal-point preview.
 * @return {JSX.Element} A single "Image styling" panel section.
 */
export default function ProductCardImagePanelLayout( {
	attributes,
	setAttributes,
	previewUrl = '',
} ) {
	const commonProps = {
		attributes,
		setAttributes,
		blockSlug: 'sgs/product-card',
		prefix: 'image',
		insertion: 'element',
		mediaType: 'image',
		scope: 'element',
	};

	return (
		<PanelBody title={ __( 'Image styling', 'sgs-blocks' ) } initialOpen={ false }>
			<MediaElementPanel
				{ ...commonProps }
				atoms={ [ 'object-fit' ] }
			/>
			{ /* format="xy" — NOT this atom's own default ('css-string'). This
			     block's server-side render still calls the pre-existing
			     `sgs_media_position_css()` helper (helpers-media-position.php),
			     which only ever understood the FocalPointPicker {x,y} shape (the
			     shape the retired `sgsObjectPosition` extension attribute used
			     to store) — never a free-text CSS string. Storing the new
			     `imageObjectPosition` attribute as {x,y} keeps that helper
			     working unchanged; storing it as a string would make the value
			     invisible to the renderer. */ }
			<MediaElementPanel
				{ ...commonProps }
				atoms={ [ 'focal-point' ] }
				format="xy"
				previewUrl={ previewUrl }
			/>
		</PanelBody>
	);
}
