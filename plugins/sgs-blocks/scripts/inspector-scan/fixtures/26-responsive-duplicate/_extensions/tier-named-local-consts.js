/**
 * MUST NOT FLAG — the exact false positive produced on 2026-08-10.
 *
 * A source-identifier scan for a tier word in any position returned 8 names, of
 * which four (`cwLiteral`, `cwPreset`, `cwTabletPreset`, `cwMobileLiteral`)
 * are derived local `const`s, NOT attributes — ContainerWrapperControls.js:264-271.
 * They were briefly reported as duplicate attributes.
 *
 * The discriminator this rule uses is mechanism, not naming: it collects only
 * keys actually written through `setAttributes({ ... })`. A local const can
 * carry any tier word it likes and remain invisible. This fixture is the
 * regression guard for that — if someone re-implements the check by scanning
 * identifier text, --self-test goes red here.
 */
export default function TierNamedLocalConsts( { attributes, setAttributes } ) {
	const { contentWidth } = attributes;

	const cwPreset = contentWidthPreset( contentWidth );
	const cwLiteral = ! isToken( contentWidth ) ? contentWidth : '';
	const cwTabletPreset = contentWidthPreset( attributes.contentWidthTablet );
	const cwMobileLiteral = attributes.contentWidthMobile || '';
	const desktopFallback = cwTabletPreset || cwMobileLiteral || cwPreset;

	return (
		<UnitControl
			label="Content band width"
			value={ cwLiteral || desktopFallback }
			onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
		/>
	);
}
