import { __ } from '@wordpress/i18n';
import { Button, PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { IconPicker, SgsLengthControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import OrnamentFramesControls from './OrnamentFramesControls';
import ExpanderCaretControls from './ExpanderCaretControls';
import {
	ORNAMENT_OPTIONS,
	ORNAMENT_REVEAL_MODE_OPTIONS,
	REVEAL_OPTIONS,
	TierLength,
	TierToggle,
	tierObject,
} from './row-extras-tier-controls';

/**
 * sgs/nav-drawer-menu — Settings: "Row extras" PanelBody (Wave 3C U-7; design
 * `.claude/reports/2026-09-25-u6-u7-design.md` 3e, 3f). The leading ornament
 * (a number or an icon, per device), the accordion expander glyph, its
 * open rotation and its caret styling, and per-item media (each linked page's featured image).
 * Ornament and media colours live in the Colour panel.
 *
 * @param {Object}   root0               Props.
 * @param {Object}   root0.attributes    Block attributes.
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function RowExtrasPanel( { attributes, setAttributes } ) {
	const {
		itemOrnament,
		itemOrnamentIcon,
		itemOrnamentIconHover,
		itemOrnamentSize,
		itemOrnamentGap,
		itemExpanderIcon,
		itemExpanderRotate,
		itemMedia,
		itemMediaReveal,
		itemMediaWidth,
		itemMediaHeight,
		itemMediaRadius,
		itemOrnamentRevealMode,
		itemOrnamentReserveSpace,
	} = attributes;
	const ornamentTiers = Object.values( tierObject( itemOrnament ) );
	const usesOrnament = ornamentTiers.some( ( v ) => 'index' === v || 'icon' === v );
	const usesIcon = ornamentTiers.includes( 'icon' );
	const usesHoverDraw = Object.values( tierObject( itemOrnamentRevealMode ) ).includes( 'hover-draw' );
	const mediaOn = 'featured-image' === itemMedia;

	return (
		<PanelBody title={ __( 'Row extras', 'sgs-blocks' ) } initialOpen={ false }>
			<TierToggle
				label={ __( 'Leading ornament', 'sgs-blocks' ) }
				help={ __( 'A number (01, 02 …) or an icon before each top-level item.', 'sgs-blocks' ) }
				value={ itemOrnament }
				options={ ORNAMENT_OPTIONS }
				onChange={ ( obj ) => setAttributes( { itemOrnament: obj } ) }
			/>
			{ usesIcon && (
				<>
					<IconPicker
						label={ __( 'Ornament icon', 'sgs-blocks' ) }
						value={ itemOrnamentIcon || { source: 'lucide', name: 'arrow-right' } }
						onChange={ ( next ) => setAttributes( { itemOrnamentIcon: next } ) }
					/>
					<IconPicker
						label={ __( 'Ornament icon on hover (optional)', 'sgs-blocks' ) }
						value={ itemOrnamentIconHover || {} }
						onChange={ ( next ) => setAttributes( { itemOrnamentIconHover: next || {} } ) }
					/>
					{ !! itemOrnamentIconHover?.name && (
						<Button
							variant="link"
							isDestructive
							onClick={ () => setAttributes( { itemOrnamentIconHover: {} } ) }
						>
							{ __( 'Remove hover icon', 'sgs-blocks' ) }
						</Button>
					) }
				</>
			) }
			{ usesOrnament && (
				<>
					<TierLength
						label={ __( 'Ornament size', 'sgs-blocks' ) }
						help={ __( 'The icon box, or the number’s text size.', 'sgs-blocks' ) }
						value={ itemOrnamentSize }
						onChange={ ( obj ) => setAttributes( { itemOrnamentSize: obj } ) }
					/>
					<SgsLengthControl
						label={ __( 'Space after ornament', 'sgs-blocks' ) }
						value={ itemOrnamentGap || '' }
						onChange={ ( val ) => setAttributes( { itemOrnamentGap: val || '' } ) }
						presets={ false }
					/>
					{ /* G-6 (2026-09-28) — icon-only; an index counter has no strokes. */ }
					{ usesIcon && (
						<TierToggle
							label={ __( 'Ornament reveal', 'sgs-blocks' ) }
							help={ __( '"Draw in on hover" hides the icon at rest and draws it stroke-by-stroke on hover or focus.', 'sgs-blocks' ) }
							value={ itemOrnamentRevealMode }
							options={ ORNAMENT_REVEAL_MODE_OPTIONS }
							onChange={ ( obj ) => setAttributes( { itemOrnamentRevealMode: obj } ) }
						/>
					) }
					{ usesIcon && <OrnamentFramesControls attributes={ attributes } setAttributes={ setAttributes } /> }
					{ usesIcon && usesHoverDraw && (
						<ToggleControl
							label={ __( 'Reserve ornament space at rest', 'sgs-blocks' ) }
							help={ __( 'Keeps the label’s indent even while the ornament is hidden, instead of the row shifting when it draws in.', 'sgs-blocks' ) }
							checked={ !! itemOrnamentReserveSpace }
							onChange={ ( val ) => setAttributes( { itemOrnamentReserveSpace: !! val } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</>
			) }

			<IconPicker
				label={ __( 'Expander icon', 'sgs-blocks' ) }
				value={ itemExpanderIcon || { source: 'lucide', name: 'chevron-down' } }
				onChange={ ( next ) => setAttributes( { itemExpanderIcon: next } ) }
			/>
			<RangeControl
				label={ __( 'Expander turn when open (degrees)', 'sgs-blocks' ) }
				help={ __( '180 flips a chevron; 45 turns a plus into a cross.', 'sgs-blocks' ) }
				value={ typeof itemExpanderRotate === 'number' ? itemExpanderRotate : 180 }
				min={ -360 }
				max={ 360 }
				step={ 5 }
				onChange={ ( val ) => setAttributes( { itemExpanderRotate: typeof val === 'number' ? val : 180 } ) }
				allowReset
				resetFallbackValue={ 180 }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ /* The expander's size, gap, opacity and turn timing: the bar's arrow controls, on the same glyph. */ }
			<ExpanderCaretControls attributes={ attributes } setAttributes={ setAttributes } />

			<ToggleGroupControl
				label={ __( 'Item image', 'sgs-blocks' ) }
				help={ __(
					'Shows each linked page’s featured image beside its label. Animated GIFs keep animating. Custom links show none.',
					'sgs-blocks'
				) }
				value={ mediaOn ? 'featured-image' : 'off' }
				onChange={ ( val ) => setAttributes( { itemMedia: 'featured-image' === val ? 'featured-image' : '' } ) }
				isBlock
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				<ToggleGroupControlOption value="off" label={ __( 'Off', 'sgs-blocks' ) } />
				<ToggleGroupControlOption value="featured-image" label={ __( 'Featured image', 'sgs-blocks' ) } />
			</ToggleGroupControl>
			{ mediaOn && (
				<>
					<TierToggle
						label={ __( 'Image shows', 'sgs-blocks' ) }
						value={ itemMediaReveal }
						options={ REVEAL_OPTIONS }
						onChange={ ( obj ) => setAttributes( { itemMediaReveal: obj } ) }
					/>
					<TierLength
						label={ __( 'Image width', 'sgs-blocks' ) }
						value={ itemMediaWidth }
						onChange={ ( obj ) => setAttributes( { itemMediaWidth: obj } ) }
					/>
					<TierLength
						label={ __( 'Image height', 'sgs-blocks' ) }
						value={ itemMediaHeight }
						onChange={ ( obj ) => setAttributes( { itemMediaHeight: obj } ) }
					/>
					<SgsLengthControl
						label={ __( 'Image corner radius', 'sgs-blocks' ) }
						value={ itemMediaRadius || '' }
						onChange={ ( val ) => setAttributes( { itemMediaRadius: val || '' } ) }
						presets={ false }
					/>
				</>
			) }
		</PanelBody>
	);
}
