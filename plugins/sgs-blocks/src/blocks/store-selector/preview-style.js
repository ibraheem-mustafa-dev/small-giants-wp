/**
 * SGS Store Selector — editor canvas preview styles.
 *
 * Mirrors render.php's scoped rules at the previewed device tier: typography on
 * the root, text colour on the trigger and items, background, padding, border,
 * radius and gap on the panel list, flag size on every flag image. Pure data in,
 * React style objects out.
 *
 * @package SGS\Blocks
 */
import {
	typographyPreviewStyle,
	textPaintPreview,
	backgroundPaintPreview,
	sgsBorderPreview,
	resolveTier,
	tierBoxLonghands,
	gapVar,
} from '../../utils';

const DEFAULT_FLAG = { w: 16, h: 12 };
const TIER_ORDER = [ 'desktop', 'tablet', 'mobile' ];

/**
 * Flag size painting at a tier: the nearest tier at or above it that carries a
 * width or height, as helpers.php::sgs_store_selector_flag_size() resolves it.
 *
 * @param {Object} flagSize `{ desktop, tablet, mobile }`, each `{ w, h }`.
 * @param {string} tier     'desktop' | 'tablet' | 'mobile'.
 * @return {{w: number, h: number}} Flag size in pixels.
 */
export function flagSizeAtTier( flagSize, tier ) {
	const start = Math.max( 0, TIER_ORDER.indexOf( tier ) );
	for ( let i = start; i >= 0; i-- ) {
		const candidate = flagSize?.[ TIER_ORDER[ i ] ];
		if ( candidate && 'object' === typeof candidate && ( candidate.w || candidate.h ) ) {
			const w = parseInt( candidate.w, 10 );
			const h = parseInt( candidate.h, 10 );
			return {
				w: w > 0 ? w : DEFAULT_FLAG.w,
				h: h > 0 ? h : DEFAULT_FLAG.h,
			};
		}
	}
	return DEFAULT_FLAG;
}

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @return {{root: Object, trigger: Object, item: Object, list: Object}} Style objects per canvas element.
 */
export function storeSelectorPreviewStyles( attributes, tier ) {
	const gap = gapVar( resolveTier( attributes.gap, tier ).value );
	const gapStyle = gap ? { gap } : {};

	return {
		root: typographyPreviewStyle( attributes, '', tier ),
		trigger: { ...gapStyle, ...textPaintPreview( attributes.triggerColour, '' ) },
		item: textPaintPreview( attributes.itemColour, '' ),
		list: {
			...gapStyle,
			...backgroundPaintPreview( attributes.panelBackground, '' ),
			...tierBoxLonghands( attributes.panelPadding, tier, 'padding' ),
			...sgsBorderPreview( { widthValues: attributes.borderWidth, styleValue: attributes.borderStyle, colourValue: attributes.borderColour, colourGradientValue: attributes.borderColourGradient, radiusValues: attributes.borderRadius }, tier, undefined ),
		},
	};
}
