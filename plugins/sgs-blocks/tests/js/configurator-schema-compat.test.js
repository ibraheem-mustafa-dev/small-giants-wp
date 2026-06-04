/**
 * U12 — Cloning / Typed schema-compatibility (Spec 27 FR-27-I-MVP).
 *
 * The cloning converter emits Typed option-pickers and Typed product-cards. The
 * shape it emits — and the attribute TYPES those emitted blocks rely on — is a
 * contract. Adding configurator attrs (sourceMode, future swatch attrs) must keep
 * the Typed shape a DEPRECATION-FREE SUBSET: the converter's output must keep
 * resolving against the block schema unchanged.
 *
 * These tests gate on attribute TYPE, not mere presence (the `inheritStyle`
 * lesson: a shared attr name can change type and silently break consumers). A
 * frozen snapshot of each block's attribute name→type map is the baseline future
 * schema changes diff against — a deliberate change must update the snapshot,
 * which forces a deprecation/compat review.
 *
 * Pure JSON assertions — no React/mocks needed.
 */

const optionPicker = require( '../../src/blocks/option-picker/block.json' );
const productCard = require( '../../src/blocks/product-card/block.json' );

/**
 * Build a stable { attrName: type } map for snapshotting.
 *
 * @param {Object} blockJson A parsed block.json.
 * @return {Object} Sorted attribute-name → declared-type map.
 */
function attrTypeMap( blockJson ) {
	const out = {};
	const attrs = blockJson.attributes || {};
	Object.keys( attrs )
		.sort()
		.forEach( ( name ) => {
			out[ name ] = attrs[ name ].type;
		} );
	return out;
}

// ─── option-picker: the converter's emit contract ──────────────────────────────

describe( 'sgs/option-picker — converter/Typed schema-compat', () => {
	const attrs = optionPicker.attributes;

	// The converter emits: wp:sgs/option-picker {optionItems, defaultSelected,
	// typeKey, contentImpact, label, showLabel}. Each TYPE is load-bearing.
	test( 'optionItems is an array', () => {
		expect( attrs.optionItems.type ).toBe( 'array' );
	} );
	test( 'defaultSelected is a string', () => {
		expect( attrs.defaultSelected.type ).toBe( 'string' );
	} );
	test( 'typeKey is a string', () => {
		expect( attrs.typeKey.type ).toBe( 'string' );
	} );
	test( 'contentImpact is an array', () => {
		expect( attrs.contentImpact.type ).toBe( 'array' );
	} );
	test( 'label is a string', () => {
		expect( attrs.label.type ).toBe( 'string' );
	} );
	test( 'showLabel is a boolean', () => {
		expect( attrs.showLabel.type ).toBe( 'boolean' );
	} );

	// Dynamic block (render.php) → no serialised save output, so the converter's
	// emitted markup + existing Typed posts never need a deprecation when attrs
	// are added. This is what keeps the Typed shape a deprecation-free subset.
	test( 'is a dynamic block rendered via render.php', () => {
		expect( optionPicker.render ).toBe( 'file:./render.php' );
	} );

	// Baseline snapshot — any schema change must update this deliberately.
	test( 'attribute type map matches the frozen baseline', () => {
		expect( attrTypeMap( optionPicker ) ).toMatchSnapshot();
	} );
} );

// ─── product-card: Typed shape stays a deprecation-free subset ─────────────────

describe( 'sgs/product-card — Typed shape is a deprecation-free subset', () => {
	const attrs = productCard.attributes;

	// sourceMode is the mode discriminator. It MUST default to 'typed' so every
	// existing Typed post + every converter-emitted card renders in Typed mode
	// with no migration. Adding 'wc-product'/'sgs-cpt' is additive.
	test( 'sourceMode is a string defaulting to "typed"', () => {
		expect( attrs.sourceMode.type ).toBe( 'string' );
		expect( attrs.sourceMode.default ).toBe( 'typed' );
		expect( attrs.sourceMode.enum ).toContain( 'typed' );
	} );

	// The Bound additions are additive + inert in Typed mode (productId 0 → the
	// Typed branch never resolves a product), so they cannot change Typed render.
	test( 'productId defaults to 0 (inert in Typed mode)', () => {
		expect( attrs.productId.type ).toBe( 'number' );
		expect( attrs.productId.default ).toBe( 0 );
	} );

	// Typed-mode content attrs the converter emits — types are load-bearing.
	test( 'packSizes is an array', () => {
		expect( attrs.packSizes.type ).toBe( 'array' );
	} );
	test( 'variantStyle is a string', () => {
		expect( attrs.variantStyle.type ).toBe( 'string' );
	} );

	// Dynamic block (render.php) — adding attrs never breaks stored Typed posts.
	test( 'is a dynamic block rendered via render.php', () => {
		expect( productCard.render ).toBe( 'file:./render.php' );
	} );

	// Baseline snapshot of the full attribute type map.
	test( 'attribute type map matches the frozen baseline', () => {
		expect( attrTypeMap( productCard ) ).toMatchSnapshot();
	} );
} );
