/**
 * SGS Nav Menu (sgs/nav-menu) — the hover-treatment selector and the Colour
 * panel's cross-reference notes (Spec 41 §9.6 / FR-41-23 / FR-41-24).
 *
 * ⛔ BLOCK-PRIVATE, DELIBERATELY — not a new `src/components/` export.
 * FR-41-24 checked the whole plugin tree and found no second adopter of this
 * pairing, so a shared `<HoverTreatmentControl>` would be an abstraction drawn
 * from a sample size of one. If a SECOND block wants it, promoting it then is
 * the right call; building it speculatively is not.
 *
 * ⛔ WHY THIS LIVES BESIDE `edit.js` RATHER THAN INSIDE IT, and why that does NOT
 * breach owner ruling 3. Ruling 3 keeps the `colourRows` ARRAY and every row's
 * `states` array inside `edit.js`, because
 * `scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a row's
 * state count only from a literal (or a `fillRow`/`textRow` call) it can see in
 * THIS block's own `edit.js` or in `src/components/` — a states array moved to a
 * block-folder sibling resolves to nothing (D738). Nothing in this file is a row
 * or a state: it is the presentational node each row hands to `SgsColourPanel`'s
 * `after` slot. `colourRows`, every `states` array and every `fillRow`/`textRow`
 * call stay in `edit.js`, untouched by this split.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * Is the `Sweep` segment offered on this row?
 *
 * ⛔ THE PREDICATE IS DATA, NOT LOGIC (Spec 41 FR-41-26, "ONE DECLARED SOURCE,
 * TWO EVALUATORS"). The rule lives in `block.json::supports.sgs.sweepEligibility`
 * and is read by BOTH surfaces — this one decides whether to OFFER Sweep,
 * `render.php` decides whether to EMIT Sweep CSS — with neither re-deriving it.
 * Exactly three mechanical checks are applied here and no fourth: a builder who
 * inlines "and also check X" has recreated the two-copies problem the declared
 * source exists to end. A newly discovered blocking input is added to the
 * DECLARED ROW — one edit, both surfaces.
 *
 * ⛔ FAIL CLOSED on a missing row (PD-8). An absent entry means eligibility
 * UNKNOWN, which must never read as "no blockers, therefore eligible": failing
 * open offers a Sweep whose CSS paints
 * `-webkit-text-fill-color: transparent` over a background that was never
 * painted — invisible text, total content loss.
 *
 * @param {Object} eligibility The whole `supports.sgs.sweepEligibility` map.
 * @param {string} treatment   The treatment attribute name keying this row's entry.
 * @param {Object} attributes  The block's attributes object.
 * @return {boolean} True when all three declared conditions pass.
 */
export function sweepEligible( eligibility, treatment, attributes ) {
	const rule = eligibility ? eligibility[ treatment ] : null;
	if ( ! rule ) {
		return false;
	}

	const isEmpty = ( name ) => ! attributes[ name ];

	// Condition 1 — the element paints no background of its own, in ANY state.
	if ( ! ( rule.blockingBackgroundAttrs || [] ).every( isEmpty ) ) {
		return false;
	}

	// Condition 2 — the row carries no gradient of its own on the same property.
	if ( ! ( rule.blockingGradientAttrs || [] ).every( isEmpty ) ) {
		return false;
	}

	// Condition 3 — the element actually has glyphs for `background-clip: text`
	// to grip. `null` always passes, per the declared shape.
	const guard = rule.glyphGuard;
	if ( guard && ( guard.disallowedValues || [] ).includes( attributes[ guard.attr ] ) ) {
		return false;
	}

	return true;
}

/**
 * The hover-treatment selector rendered directly beneath a row's Hover swatch.
 *
 * ⛔ OMIT, NEVER DISABLE (D609 field 9c). An unavailable third option is dropped
 * from `options` by the caller rather than rendered greyed-out — a control a
 * client can find and click to no effect is the failure the rule prevents.
 *
 * Shape copied from `src/components/SurfaceTreatmentPanel.js` — the shipped
 * precedent for a `ToggleGroupControl` choosing a visual treatment with a
 * conditional sub-control beneath it.
 *
 * ⚠ Control-shape authority is Spec 35 Part O's D810 table (2–4 options with a
 * longest label ≤ 12 characters → `ToggleGroupControl`), gate-backed by
 * `scripts/check-enum-control-shape.py` — NOT
 * `TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED`, which governs
 * the typography target switcher's own shape and nothing else. Every selector
 * here is 2–3 segments with a longest label of 9 characters ("Highlight").
 *
 * @param {Object}   root0          Props.
 * @param {string}   root0.label    Already-translated control label.
 * @param {string}   root0.value    Current stored treatment value.
 * @param {Function} root0.onChange Receives the next treatment value.
 * @param {Array}    root0.options  `[ { value, label } ]`, already filtered.
 * @param {string}   [root0.help]   Already-translated help text.
 * @return {Object} The control.
 */
export function TreatmentSelect( { label, value, onChange, options, help } ) {
	return (
		<>
			<ToggleGroupControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				isBlock
				label={ label }
				value={ value || 'swap' }
				onChange={ ( next ) => onChange( next || 'swap' ) }
			>
				{ options.map( ( option ) => (
					<ToggleGroupControlOption
						key={ option.value }
						value={ option.value }
						label={ option.label }
					/>
				) ) }
			</ToggleGroupControl>
			{ help && <p className="components-base-control__help">{ help }</p> }
		</>
	);
}

/**
 * A rendered ⓘ cross-reference note.
 *
 * ⛔ These RENDER in the inspector; they are not merely stated in the spec
 * (§9.6, §9.10). An operator meets a control in the editor, not in a document,
 * and a distinction that lives only in prose is left implicit at the exact place
 * it matters. The border-vs-decoration note has a TWIN in the Typography panel
 * and **neither ships without the other**, or one control points at a partner
 * that never points back.
 *
 * @param {Object} root0          Props.
 * @param {string} root0.children Already-translated note text.
 * @return {Object} The note.
 */
export function CrossRefNote( { children } ) {
	return (
		<p className="components-base-control__help sgs-nav-menu__colour-note">
			{ children }
		</p>
	);
}
