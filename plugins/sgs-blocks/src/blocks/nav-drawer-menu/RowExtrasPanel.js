import { __ } from '@wordpress/i18n';
import { Button, PanelBody, RangeControl } from '@wordpress/components';
import { IconPicker, ResponsiveOverride, SgsLengthControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

const ORNAMENT_OPTIONS = [
	{ value: 'none', label: __( 'None', 'sgs-blocks' ) },
	{ value: 'index', label: __( 'Number', 'sgs-blocks' ) },
	{ value: 'icon', label: __( 'Icon', 'sgs-blocks' ) },
];

const REVEAL_OPTIONS = [
	{ value: 'none', label: __( 'Hidden', 'sgs-blocks' ) },
	{ value: 'always', label: __( 'Always', 'sgs-blocks' ) },
	{ value: 'hover', label: __( 'On hover', 'sgs-blocks' ) },
];

const tierObject = ( value ) => ( value && typeof value === 'object' ? value : {} );

/**
 * A per-device enum as a toggle group under the global device toggle.
 *
 * @param {Object}   root0          Props.
 * @param {string}   root0.label    Control label.
 * @param {string}   root0.help     Help text.
 * @param {Object}   root0.value    The tier object.
 * @param {Array}    root0.options  `{value,label}` options.
 * @param {Function} root0.onChange Receives the next tier object.
 */
function TierToggle( { label, help, value, options, onChange } ) {
	return (
		<ResponsiveOverride label={ label } value={ tierObject( value ) } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, setOwnValue } ) => (
				<ToggleGroupControl
					label={ label }
					hideLabelFromVision
					help={ help }
					value={ ownValue || effectiveValue || options[ 0 ].value }
					onChange={ ( val ) => setOwnValue( val || undefined ) }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ options.map( ( option ) => (
						<ToggleGroupControlOption key={ option.value } value={ option.value } label={ option.label } />
					) ) }
				</ToggleGroupControl>
			) }
		</ResponsiveOverride>
	);
}

/**
 * A per-device length under the global device toggle.
 *
 * @param {Object}   root0          Props.
 * @param {string}   root0.label    Control label.
 * @param {string}   root0.help     Help text.
 * @param {Object}   root0.value    The tier object.
 * @param {Function} root0.onChange Receives the next tier object.
 */
function TierLength( { label, help, value, onChange } ) {
	return (
		<ResponsiveOverride label={ label } value={ tierObject( value ) } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					label={ label }
					hideLabelFromVision
					help={ help }
					value={ ownValue || '' }
					placeholder={ inherited ? effectiveValue : '' }
					onChange={ ( val ) => setOwnValue( val || undefined ) }
					presets={ false }
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * sgs/nav-drawer-menu — Settings: "Row extras" PanelBody (Wave 3C U-7; design
 * `.claude/reports/2026-09-25-u6-u7-design.md` 3e, 3f). The leading ornament
 * (a number or an icon, per device), the accordion expander glyph and its
 * open rotation, and per-item media (each linked page's featured image).
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
	} = attributes;
	const ornamentTiers = Object.values( tierObject( itemOrnament ) );
	const usesOrnament = ornamentTiers.some( ( v ) => 'index' === v || 'icon' === v );
	const usesIcon = ornamentTiers.includes( 'icon' );
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
