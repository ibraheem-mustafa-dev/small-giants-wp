/**
 * MUST NOT FLAG — independent per-device flags, not a responsive cascade.
 *
 * Mirrors conditional-visibility.js (`sgsHideOnDesktop/Tablet/Mobile`) and
 * fx.js:1303 (`fxDisableTablet/Mobile`). Both were flagged by this rule's first
 * live run and both are CORRECT AS WRITTEN:
 *
 *   A cascade resolves ONE tier at a time and falls back up the chain, so it
 *   never needs to see two of its own tiers at once. These are conjunctive —
 *   "hide on mobile" AND "hide on tablet" are simultaneously meaningful, and
 *   the operator must see every tier's state together. Folding them behind the
 *   single global device toggle would DESTROY the control.
 *
 * The discriminator is mechanism, not naming: a single expression referencing
 * two tier siblings of one base (`hideOnTablet || hideOnMobile` below, and the
 * reset object writing both at once). Fixed in the detector rather than
 * baselined — a baseline records accepted debt, and a false positive is a
 * detector bug.
 */
export default function IndependentPerTierFlags( { attributes, setAttributes } ) {
	const anyHidden = attributes.hideOnTablet || attributes.hideOnMobile;

	return (
		<ToolsPanelItem
			hasValue={ () => anyHidden }
			label="Hide on smaller screens"
			onDeselect={ () => setAttributes( { hideOnTablet: false, hideOnMobile: false } ) }
		>
			<ToggleControl
				label="Hide on tablet"
				checked={ !! attributes.hideOnTablet }
				onChange={ ( val ) => setAttributes( { hideOnTablet: val } ) }
			/>
			<ToggleControl
				label="Hide on mobile"
				checked={ !! attributes.hideOnMobile }
				onChange={ ( val ) => setAttributes( { hideOnMobile: val } ) }
			/>
		</ToolsPanelItem>
	);
}
