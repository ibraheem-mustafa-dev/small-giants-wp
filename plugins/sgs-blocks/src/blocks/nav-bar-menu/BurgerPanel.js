import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { SgsLengthControl, IconPicker, MotionEasingControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * Wave 3C U-9 (§4.4) — burger morph pose options.
 *
 * Spec 35 §3 threshold table (2026-09-24 audit item 1): a 4-option enum
 * whose longest rendered LABEL is ≤12 chars ("X (default)" = 11) belongs on
 * a `ToggleGroupControl`, not a `SelectControl` — every option visible at
 * once, one tap, no menu. The block.json enum + stored VALUES are unchanged
 * ('x' | 'x-rotate' | 'line' | 'none'); this array still doubles as the
 * options list for the ToggleGroupControlOption render below.
 */
const BURGER_MORPH_OPTIONS = [
	{ label: __( 'X (default)', 'sgs-blocks' ), value: 'x' },
	{ label: __( 'X + rotate', 'sgs-blocks' ), value: 'x-rotate' },
	{ label: __( 'Line', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — General tab: the "Menu Button" panel (Spec 41
 * §9.3 / FR-41-12 / FR-41-30a / FR-41-31).
 *
 * ⚠ RENAMED FROM "Burger" — a LABEL change only. ⛔ No attribute is renamed:
 * `burgerSize`, `burgerColour`, `burgerBg` and the rest keep their stored names,
 * and the eligibility predicate in block.json keys on them.
 *
 * Icon colour + button background (Normal + Hover, plus their hover-treatment
 * selectors) live in the top-level `SgsColourPanel` (§9.6), not here.
 *
 * @param {Object}   root0                       Props.
 * @param {string}   root0.burgerSize            `burgerSize`.
 * @param {string}   root0.triggerMode           `triggerMode` — icon | text | icon-and-text.
 * @param {string}   root0.triggerLabel          `triggerLabel`.
 * @param {Object}   root0.triggerIcon           `triggerIcon` — `{ source, name }`.
 * @param {boolean}  root0.triggerMagnetEnabled  `triggerMagnetEnabled`.
 * @param {number}   root0.triggerMagnetRadius   `triggerMagnetRadius`.
 * @param {number}   root0.triggerMagnetStrength `triggerMagnetStrength`.
 * @param {string}   root0.burgerMorph            `burgerMorph` — x | x-rotate | line | none.
 * @param {number}   root0.burgerMorphDuration     `burgerMorphDuration`, ms, 0–1200.
 * @param {string}   root0.burgerMorphEasing       `burgerMorphEasing`.
 * @param {string}   root0.burgerMorphEasingCustom `burgerMorphEasingCustom` — read only
 *                                                  when `burgerMorphEasing` is 'custom'.
 * @param {Function} root0.setAttributes         The block's attribute setter.
 */
export default function BurgerPanel( {
	burgerSize,
	triggerMode,
	triggerLabel,
	triggerIcon,
	triggerMagnetEnabled,
	triggerMagnetRadius,
	triggerMagnetStrength,
	burgerMorph,
	burgerMorphDuration,
	burgerMorphEasing,
	burgerMorphEasingCustom,
	setAttributes,
} ) {
	const mode = triggerMode || 'icon';
	const showsIcon = 'icon' === mode || 'icon-and-text' === mode;
	const showsText = 'icon' !== mode;
	const morph = burgerMorph || 'x';

	return (
		<PanelBody title={ __( 'Menu Button', 'sgs-blocks' ) } initialOpen={ false }>
			<p style={ { marginTop: 0 } }>
				{ __(
					'Controls the button that opens the mobile menu (the ‘burger’).',
					'sgs-blocks'
				) }
			</p>

			{ /* ⛔ OMIT, never disable — a text-only button has no
			   icon to pick, so the picker is absent rather than greyed out. */ }
			{ showsIcon && (
				<IconPicker
					label={ __( 'Icon', 'sgs-blocks' ) }
					value={ triggerIcon || { source: 'lucide', name: 'menu' } }
					onChange={ ( next ) => setAttributes( { triggerIcon: next } ) }
				/>
			) }

			<ToggleGroupControl
				label={ __( 'Show as', 'sgs-blocks' ) }
				value={ mode }
				isBlock
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				onChange={ ( val ) => setAttributes( { triggerMode: val || 'icon' } ) }
			>
				<ToggleGroupControlOption value="icon" label={ __( 'Icon', 'sgs-blocks' ) } />
				<ToggleGroupControlOption value="text" label={ __( 'Text', 'sgs-blocks' ) } />
				<ToggleGroupControlOption
					value="icon-and-text"
					label={ __( 'Both', 'sgs-blocks' ) }
				/>
			</ToggleGroupControl>

			{ showsText && (
				<TextControl
					label={ __( 'Label', 'sgs-blocks' ) }
					value={ triggerLabel ?? 'Menu' }
					onChange={ ( val ) => setAttributes( { triggerLabel: val } ) }
					help={ __(
						'The word shown on the button. It is also what a screen reader announces.',
						'sgs-blocks'
					) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			<SgsLengthControl
				label={ __( 'Size', 'sgs-blocks' ) }
				value={ burgerSize }
				units={ [ { value: 'px', label: 'px', default: 44 } ] }
				onChange={ ( val ) => setAttributes( { burgerSize: val || '44px' } ) }
				help={ __(
					'44px minimum for a comfortable touch target (WCAG 2.2 AA).',
					'sgs-blocks'
				) }
				presets={ false }
			/>

			<ToggleControl
				label={ __( 'Magnetic pull', 'sgs-blocks' ) }
				checked={ !! triggerMagnetEnabled }
				onChange={ ( val ) => setAttributes( { triggerMagnetEnabled: val } ) }
				help={ __(
					'Makes the menu button lean toward the visitor’s cursor as they approach it. Off automatically on touch devices and when reduced motion is requested.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>

			{ /* ⛔ min/max match `fx-magnet.js`'s own clamp EXACTLY. A wider slider
			   has dead ends at both ends and reads to a client as a broken control. */ }
			{ !! triggerMagnetEnabled && (
				<>
					<RangeControl
						label={ __( 'Pull distance', 'sgs-blocks' ) }
						value={
							typeof triggerMagnetRadius === 'number' ? triggerMagnetRadius : 120
						}
						min={ 20 }
						max={ 400 }
						onChange={ ( val ) =>
							setAttributes( {
								triggerMagnetRadius: typeof val === 'number' ? val : 120,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Pull strength', 'sgs-blocks' ) }
						value={
							typeof triggerMagnetStrength === 'number' ? triggerMagnetStrength : 24
						}
						min={ 2 }
						max={ 80 }
						onChange={ ( val ) =>
							setAttributes( {
								triggerMagnetStrength: typeof val === 'number' ? val : 24,
							} )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }

			{ /* Wave 3C U-9 (§4.4) — the default burger's morph, matching
			   `sgs_nav_bar_menu_burger_toggle_markup()`'s own gate: only the
			   restructured 3-bar default glyph has a well-defined morph shape.
			   Spec 35 §3 threshold table (2026-09-24 audit item 1) — a
			   4-option, ≤12-char enum is a `ToggleGroupControl`, not a
			   `SelectControl`. */ }
			{ showsIcon && (
				<ToggleGroupControl
					label={ __( 'Morph', 'sgs-blocks' ) }
					help={ __(
						'How the button reshapes when the menu opens. Only affects the default icon — a custom icon keeps its own shape.',
						'sgs-blocks'
					) }
					value={ morph }
					onChange={ ( val ) => setAttributes( { burgerMorph: val || 'x' } ) }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ BURGER_MORPH_OPTIONS.map( ( option ) => (
						<ToggleGroupControlOption
							key={ option.value }
							value={ option.value }
							label={ option.label }
						/>
					) ) }
				</ToggleGroupControl>
			) }

			{ showsIcon && 'none' !== morph && (
				<>
					<RangeControl
						label={ __( 'Morph speed', 'sgs-blocks' ) }
						value={
							typeof burgerMorphDuration === 'number' ? burgerMorphDuration : 200
						}
						min={ 0 }
						max={ 1200 }
						onChange={ ( val ) =>
							setAttributes( {
								burgerMorphDuration: typeof val === 'number' ? val : 200,
							} )
						}
						help={ __( 'Milliseconds. 200 matches the original speed.', 'sgs-blocks' ) }
						allowReset
						resetFallbackValue={ 200 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					<MotionEasingControl
						label={ __( 'Morph easing', 'sgs-blocks' ) }
						value={ burgerMorphEasing }
						custom={ burgerMorphEasingCustom }
						onChange={ ( val ) => setAttributes( { burgerMorphEasing: val } ) }
						onCustomChange={ ( val ) => setAttributes( { burgerMorphEasingCustom: val } ) }
					/>
				</>
			) }
		</PanelBody>
	);
}
