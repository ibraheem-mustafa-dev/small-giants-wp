/**
 * OVERMATCH GUARD for the extension-ownership exclusion — the positive twin of
 * `extension-owned-attr`.
 *
 * Both attributes here are shaped exactly like extension attributes and are
 * registered by NO extension: neither appears in src/blocks/extensions/*.js,
 * and therefore neither appears in includes/extension-attributes.generated.php.
 * They are this block's OWN attributes, rendered with no control, so both must
 * FLAG.
 *
 * WHAT EACH ONE LOCKS DOWN, and they are different failures:
 *
 *   · `fxNotARegisteredAttr` — proves the exclusion reads the real registry
 *     rather than reverting to a PREFIX test. The moment someone "simplifies"
 *     the ownership lookup back to `/^fx/`, this stops flagging.
 *
 *   · `sgsNotARegisteredAttr` — matches the OLD `/^sgs[A-Z_]/` regex exactly.
 *     Under the previous implementation it was excluded, silently, despite no
 *     extension owning it — i.e. the old test was over-broad in the `sgs`
 *     direction at the same time as it was blind in the `fx` direction. This
 *     fixture is the standing proof that the over-broad half is closed too.
 *
 * Without this twin the exclusion would be untestable in the way this rule's
 * header warns about: a lookup that excluded every `fx`-prefixed or
 * `sgs`-prefixed name unconditionally would satisfy `extension-owned-attr`
 * just as happily as the correct registry read does.
 */
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Nothing here on purpose" />
		</InspectorControls>
	);
}
