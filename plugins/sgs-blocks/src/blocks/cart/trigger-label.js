/**
 * The cart trigger's accessible name for a count, from the singular and plural templates render.php prints on the widget
 * (`data-label-one`, `data-label-other`, translated there with `_n`, each holding a {count} placeholder), so the words
 * live in one place. Returns null for a widget without them (an icon-only trigger keeps its own name).
 *
 * @param {Object} dataset The widget's `dataset`.
 * @param {number} count   The item count.
 * @return {string|null} The label, or null.
 */
export function pillTriggerLabel( dataset, count ) {
	const template = 1 === count ? dataset.labelOne : dataset.labelOther;
	return template ? template.replace( '{count}', String( count ) ) : null;
}
