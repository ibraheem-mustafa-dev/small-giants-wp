/**
 * Shared editor-canvas mirror of the grid/flex/stack layout branch — extracted
 * 2026-09-05 from `sgs/container`'s `edit.js` (the ONLY block that had built this
 * mirror, embedded directly in the component body rather than a standalone function,
 * at lines ~287-367) into ONE shared module so every other block routed through
 * `SGS_Container_Wrapper::render()` can show the same live layout preview instead of a
 * flat canvas for `justifyItems`/`alignContent`/`alignItems`/`gridAutoRows` that ARE
 * painting on the published page.
 *
 * Copied VERBATIM in logic from `sgs/container`'s edit.js — same behaviour, same
 * invariants — so this extraction cannot itself introduce a behavioural drift for
 * container's own regression baseline.
 *
 * ⛔ Keep this in step with the PHP path (`class-sgs-container-wrapper.php`'s grid/
 * flex/stack branches). If they disagree, the editor lies about what the page will
 * look like — which is the failure this mirror exists to prevent.
 */

import { resolveResponsiveTier } from './responsive';

/**
 * Applies the active layout mode's (grid/flex/stack) preview declarations onto a
 * MUTABLE style object, mirroring class-sgs-container-wrapper.php's grid/flex/stack
 * branches exactly (including the flex/stack column+wrap invariant — a column-axis
 * flex container with wrap sizes each line from its items rather than being handed the
 * parent's own cross size, per CSS Flexbox L1 9.4, so it is coerced to `nowrap`
 * regardless of how the value arrived).
 *
 * @param {Object} style Mutable style object to write layout declarations onto.
 * @param {Object} params
 * @param {string} params.layout               'grid'|'flex'|'stack'|other.
 * @param {string} [params.alignItems]         Cross-axis alignment (grid/flex/stack).
 * @param {string} [params.justifyItems='stretch']  Grid-only; applied only when not the default.
 * @param {string} [params.alignContent='stretch']  Grid-only; applied only when not the default.
 * @param {string} [params.gridAutoRows='']    Grid-only; applied unconditionally when set.
 * @param {*}      [params.gridTemplateColumns=''] Grid-only; a TIER OBJECT (or legacy string) —
 *                                              resolved via `resolveResponsiveTier()`, desktop tier.
 * @param {*}      [params.columns]            Grid-only fallback column count; a TIER OBJECT
 *                                              (or legacy number) — resolved via
 *                                              `resolveResponsiveTier()`, desktop tier.
 * @param {string} [params.flexDirection='']   Flex-only.
 * @param {string} [params.flexWrap='wrap']    Flex-only.
 * @param {string} [params.justifyContent='']  Flex/stack.
 * @return {Object} The same `style` object, mutated, for convenient chaining.
 */
export function applyGridLayoutPreview( style, {
	layout,
	alignItems,
	justifyItems = 'stretch',
	alignContent = 'stretch',
	gridAutoRows = '',
	gridTemplateColumns = '',
	columns,
	flexDirection = '',
	flexWrap = 'wrap',
	justifyContent = '',
} ) {
	if ( layout === 'grid' ) {
		style.display = 'grid';
		// gridTemplateColumns is a TIER OBJECT — calling .trim() on it bare throws
		// `p?.trim is not a function` and CRASHES the editor canvas. The canvas
		// preview represents the DESKTOP tier, so resolve that tier.
		const gtcDesktop = resolveResponsiveTier( gridTemplateColumns, 'desktop' )?.value;
		// columns is also a TIER OBJECT — resolve the desktop tier the same way, or
		// this renders "repeat([object Object], 1fr)" and silently breaks the grid preview.
		const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value;
		style.gridTemplateColumns = String( gtcDesktop ?? '' ).trim()
			? String( gtcDesktop ).trim()
			: `repeat(${ columnsDesktop || 2 }, 1fr)`;
		// gridAutoRows previews unconditionally for the grid layout when set.
		if ( gridAutoRows ) {
			style.gridAutoRows = gridAutoRows;
		}
		style.alignItems = alignItems;
		if ( justifyItems && justifyItems !== 'stretch' ) {
			style.justifyItems = justifyItems;
		}
		if ( alignContent && alignContent !== 'stretch' ) {
			style.alignContent = alignContent;
		}
	} else if ( layout === 'flex' ) {
		style.display = 'flex';
		style.alignItems = alignItems;
		const isColumnAxis = flexDirection.indexOf( 'column' ) === 0;
		const effectiveFlexWrap =
			isColumnAxis && ( flexWrap === 'wrap' || flexWrap === 'wrap-reverse' )
				? 'nowrap'
				: flexWrap;
		if ( '' !== effectiveFlexWrap ) {
			style.flexWrap = effectiveFlexWrap;
		}
		if ( '' !== flexDirection ) {
			style.flexDirection = flexDirection;
		}
		if ( '' !== justifyContent ) {
			style.justifyContent = justifyContent;
		}
	} else if ( layout === 'stack' ) {
		// Stack is display:flex with the column axis FORCED, never read from
		// flexDirection — an operator who set flexDirection:"row" on a previous
		// layout and then picks Stack still gets a column.
		style.display = 'flex';
		style.alignItems = alignItems;
		const stackEffectiveFlexWrap =
			flexWrap === 'wrap' || flexWrap === 'wrap-reverse' ? 'nowrap' : flexWrap;
		if ( '' !== stackEffectiveFlexWrap ) {
			style.flexWrap = stackEffectiveFlexWrap;
		}
		style.flexDirection = 'column';
		if ( '' !== justifyContent ) {
			style.justifyContent = justifyContent;
		}
	}

	return style;
}
