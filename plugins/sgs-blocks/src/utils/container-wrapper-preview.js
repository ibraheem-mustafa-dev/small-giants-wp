/**
 * Editor-canvas mirror of what `SGS_Container_Wrapper::render()` paints on the
 * outer element of any block routed through it: gap, border (style, width,
 * colour or gradient, per-tier corner radius), max-width, the grid/flex/stack
 * layout switch with its layout class, grid rows, and the content band
 * (`.sgs-container__inner`: contentWidth + contentBandPadding, with the layout
 * moved onto the band when one exists, as the wrapper's `$grid_on_inner` does).
 *
 * Every tiered value resolves at the previewed device tier, so the canvas shows
 * what the published page paints at that width.
 *
 * Built from the logic in `sgs/container`'s own canvas mirror; keep the three in
 * step (this file, that mirror, `class-sgs-container-wrapper.php`).
 *
 * @package SGS\Blocks
 */

import { applyGridLayoutPreview } from './grid-layout-preview';
import { contentBandPreview, resolveContentWidthPreview } from './content-band-preview';
import { tierLengthPreview } from './cssLength';
import { tierValueOf } from './responsive';
import { separatorsFlowPreview } from './separators';
import { resolveBoxTierPreview } from './spacing-preview';
import { wrapperBorderPreview } from './wrapper-border-preview';

const LAYOUTS = [ 'grid', 'flex', 'stack' ];

/**
 * @param {Object} attributes Block attributes (the wrapper family: layout, columns,
 *                            gap, grid*, justify*, align*, flex*, maxWidth, contentWidth,
 *                            contentBandPadding, border*).
 * @param {string} [tier]     Previewed device tier from `usePreviewTier()`.
 * @param {Array}  [palette]  Theme colour palette, to resolve a border colour slug.
 * @param {Object} [extraStyle] Block-own outer declarations (a bespoke grid, say) that
 *                            win over the generic layout and move onto the band with it.
 * @return {{ style: Object, className: string, bandStyle: Object, hasBandProps: boolean }}
 *   `style` for the outer element, `className` the layout class the wrapper adds,
 *   `bandStyle` for the `.sgs-container__inner` band, rendered only when `hasBandProps`.
 */
export function containerWrapperPreview( attributes, tier = 'desktop', palette = [], extraStyle = {} ) {
	const attrs = attributes || {};
	const layout = LAYOUTS.includes( attrs.layout ) ? attrs.layout : '';
	const style = {};

	const gap = tierLengthPreview( attrs.gap, tier );
	if ( gap ) {
		style.gap = gap;
	}

	const maxWidth = tierValueOf( attrs.maxWidth, tier );
	if ( maxWidth ) {
		style.maxWidth = maxWidth;
	}

	Object.assign( style, wrapperBorderPreview( attrs, tier, palette ) );

	applyGridLayoutPreview( style, {
		layout,
		alignItems: attrs.alignItems,
		justifyItems: attrs.justifyItems,
		alignContent: attrs.alignContent,
		gridAutoRows: attrs.gridAutoRows,
		gridTemplateColumns: { desktop: tierValueOf( attrs.gridTemplateColumns, tier ) },
		columns: { desktop: tierValueOf( attrs.columns, tier ) },
		flexDirection: attrs.flexDirection,
		flexWrap: attrs.flexWrap,
		justifyContent: attrs.justifyContent,
	} );
	Object.assign( style, extraStyle );
	// Lines between the items, in an editor without CSS gap decorations.
	if ( layout ) {
		Object.assign( style, separatorsFlowPreview( attrs.separators, tier ) );
	}

	const band = attrs.contentBandPadding && 'object' === typeof attrs.contentBandPadding ? attrs.contentBandPadding : {};
	const { hasBandProps, bandStyle } = contentBandPreview( {
		contentWidth: resolveContentWidthPreview( tierValueOf( attrs.contentWidth, tier ) || '' ),
		bandPadding: resolveBoxTierPreview( band.desktop, band.tablet, band.mobile, tier ),
		style,
		layout,
	} );

	// Grid rows sit with the rest of the grid: on the band when the layout moved there.
	const gridTemplateRows = tierValueOf( attrs.gridTemplateRows, tier );
	if ( 'grid' === layout && gridTemplateRows ) {
		( hasBandProps ? bandStyle : style ).gridTemplateRows = gridTemplateRows;
	}

	return {
		style,
		className: layout ? `sgs-container--${ layout }` : '',
		bandStyle,
		hasBandProps,
	};
}

/** Alias kept for blocks generated from the wrapper-preview codemod template. */
export const wrapperPreview = containerWrapperPreview;

/**
 * The content band (`.sgs-container__inner`) the wrapper puts around the
 * block's content when a contentWidth cap or band padding exists; a fragment
 * otherwise, exactly as the wrapper emits it.
 *
 * @param {Object}  props
 * @param {boolean} props.hasBandProps `containerWrapperPreview().hasBandProps`.
 * @param {Object}  props.bandStyle    `containerWrapperPreview().bandStyle`.
 * @param {*}       props.children     The block's canvas content.
 * @return {JSX.Element} The band element or a fragment.
 */
export function BandWrap( { hasBandProps, bandStyle, children } ) {
	return hasBandProps ? (
		<div className="sgs-container__inner" style={ bandStyle }>
			{ children }
		</div>
	) : (
		<>{ children }</>
	);
}
