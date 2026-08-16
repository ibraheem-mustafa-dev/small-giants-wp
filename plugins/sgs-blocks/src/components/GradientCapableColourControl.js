/**
 * GradientCapableColourControl — the text-colour gradient rollout's shared
 * control (D636 Task 1b, "text" builder).
 *
 * Same row/popover/tabs shape as `DesignTokenPicker`'s D609 state-row
 * (`SgsColourStateControl`) — swatch + label toggle, in-popover Normal/Hover
 * tabs when there is more than one state — so a block adding gradient
 * capability to one colour row does not visually diverge from every other
 * row in the same `SgsColourPanel`. The one addition: each state's popover
 * content carries a Solid/Gradient `ToggleGroupControl` (mirrors
 * `GradientOverlayControl`'s UX), but — unlike `GradientOverlayControl` —
 * writes ONE attribute per state, never a `{solid, gradient}` pair. Mode is
 * DERIVED from the stored value (does it parse as a `*-gradient(` function?),
 * matching the storage-collapse rule the whole rollout uses (D636): a single
 * CSS-value string, flat colour or gradient, resolved by shape not by a
 * boolean discriminator.
 *
 * `DesignTokenPicker` itself needs no changes for this (LEDGER Task 1b
 * correction 1) — this is a sibling control, not an edit to that file.
 * `SgsColourPanel` gained one additive prop (`gradientCapable` per row) that
 * chooses between the two controls; every existing row is unaffected.
 */
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	ColorIndicator,
	Dropdown,
	Flex,
	FlexItem,
	TabPanel,
} from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';
import { useInstanceId } from '@wordpress/compose';
import { HStack, Item, ItemGroup, ZStack, ToggleGroupControl, ToggleGroupControlOption } from './primitives';
import { ColorPalette } from './colour-picker';
import SgsGradientPicker from './gradient-picker';
import { resolveColourToken } from './DesignTokenPicker';

/**
 * A stored value is treated as a gradient when it parses as one of the three
 * CSS gradient functions (optionally `repeating-`). Mirrors the PHP-side
 * detection in `sgs_text_colour_decls()` (`includes/helpers-tokens.php`) —
 * keep both in sync; the PHP copy is the one that actually gates emission,
 * this one only decides which editor control renders.
 *
 * @param {string} value Stored attribute value.
 * @return {boolean} Whether the value is a gradient function.
 */
export function isGradientValue( value ) {
	return /^(repeating-)?(linear|radial|conic)-gradient\(/i.test(
		( value || '' ).trim()
	);
}

/**
 * One state's Solid/Gradient content — a toggle plus whichever picker is
 * active. Local-only "just switched mode, haven't picked a value yet" state
 * is per-STATE (keyed by the state's own key), matching
 * `GradientOverlayControl`'s local-mode pattern.
 */
function StateContent( { state, colours, enableAlpha, clearable, ariaLabel } ) {
	const [ localMode, setLocalMode ] = useState( null );
	const gradientEnabled =
		localMode !== null ? localMode : isGradientValue( state.value );

	const displayValue = state.linked
		? resolveColourToken( state.value, colours )
		: state.value;

	return (
		<div className="sgs-gradient-capable-colour-control__state">
			<ToggleGroupControl
				label={ __( 'Colour type', 'sgs-blocks' ) }
				value={ gradientEnabled ? 'gradient' : 'solid' }
				onChange={ ( val ) => setLocalMode( val === 'gradient' ) }
				isBlock
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				<ToggleGroupControlOption value="solid" label={ __( 'Solid', 'sgs-blocks' ) } />
				<ToggleGroupControlOption value="gradient" label={ __( 'Gradient', 'sgs-blocks' ) } />
			</ToggleGroupControl>

			{ gradientEnabled ? (
				<SgsGradientPicker
					value={ isGradientValue( state.value ) ? state.value : '' }
					onChange={ ( newGradient ) => {
						setLocalMode( true );
						state.onChange( newGradient ?? '' );
					} }
					enableAlpha={ enableAlpha }
					__experimentalIsRenderedInSidebar
				/>
			) : (
				<ColorPalette
					colors={ colours }
					value={ isGradientValue( state.value ) ? undefined : displayValue }
					onChange={ ( picked ) => {
						setLocalMode( false );
						if ( ! state.linked ) {
							state.onChange( picked ?? '' );
							return;
						}
						if ( ! picked ) {
							state.onChange( '' );
							return;
						}
						const match = ( colours || [] ).find(
							( c ) => c.color === picked
						);
						state.onChange( match ? match.slug : picked );
					} }
					clearable={ clearable }
					disableCustomColors={ false }
					enableAlpha={ enableAlpha }
					aria-label={ ariaLabel }
				/>
			) }
		</div>
	);
}

/**
 * @param {Object}  props
 * @param {string}  props.label       Row label (e.g. "Heading colour").
 * @param {Array}   [props.states]    `[{ key, label, value, onChange, linked? }]` — same shape as `DesignTokenPicker`'s `states`.
 * @param {string}  [props.value]     Single-state convenience form (no tabs) — used with `onChange` instead of `states`.
 * @param {Function} [props.onChange] Paired with `value` for the single-state form.
 * @param {boolean} [props.clearable=true]
 * @param {boolean} [props.enableAlpha=true]
 */
export default function GradientCapableColourControl( {
	label,
	states,
	value,
	onChange,
	clearable = true,
	enableAlpha = true,
} ) {
	const [ colours ] = useSettings( 'color.palette' );
	const instanceId = useInstanceId(
		GradientCapableColourControl,
		'sgs-gradient-capable-colour-control'
	);
	const id = `sgs-gradient-capable-colour-control-${ instanceId }`;

	const resolvedStates =
		states && states.length > 0
			? states
			: [ { key: 'normal', label, value, onChange } ];

	const hasStates = resolvedStates.length > 1;
	const descId = `${ id }-desc`;

	const swatchDisplay = ( s ) =>
		isGradientValue( s.value )
			? s.value
			: s.linked
			? resolveColourToken( s.value, colours )
			: s.value;

	const swatches = hasStates ? (
		<ZStack isLayered={ false } offset={ -8 }>
			{ resolvedStates.map( ( s ) => (
				<Flex key={ s.key } expanded={ false }>
					<ColorIndicator colorValue={ swatchDisplay( s ) } />
				</Flex>
			) ) }
		</ZStack>
	) : (
		<ColorIndicator colorValue={ swatchDisplay( resolvedStates[ 0 ] ) } />
	);

	return (
		<ItemGroup
			isBordered
			isSeparated
			className="sgs-colour-control-group sgs-gradient-capable-colour-control"
		>
			<Item as="div" className="sgs-colour-control-group__item">
				<Dropdown
					className="sgs-colour-control__dropdown"
					contentClassName="sgs-colour-control__popover sgs-gradient-capable-colour-control__popover"
					popoverProps={ {
						placement: 'left-start',
						offset: 36,
						shift: true,
					} }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							__next40pxDefaultSize
							onClick={ onToggle }
							aria-expanded={ isOpen }
							aria-describedby={ hasStates ? descId : undefined }
							className="sgs-colour-control__toggle"
							style={ {
								display: 'block',
								width: '100%',
								height: 'auto',
								padding: '8px 12px',
								textAlign: 'left',
							} }
						>
							<HStack justify="flex-start">
								{ swatches }
								<FlexItem
									className="sgs-colour-control__label"
									title={ label }
								>
									{ label }
								</FlexItem>
							</HStack>
						</Button>
					) }
					renderContent={ () =>
						hasStates ? (
							<TabPanel
								className="sgs-colour-control__tabs"
								tabs={ resolvedStates.map( ( s ) => ( {
									name: s.key,
									title: s.label,
								} ) ) }
							>
								{ ( tab ) => {
									const s =
										resolvedStates.find(
											( st ) => st.key === tab.name
										) ?? resolvedStates[ 0 ];
									return (
										<div className="sgs-colour-control__content">
											<StateContent
												state={ s }
												colours={ colours }
												enableAlpha={ enableAlpha }
												clearable={ clearable }
												ariaLabel={ sprintf(
													/* translators: 1: control label, 2: state label */
													__( '%1$s — %2$s', 'sgs-blocks' ),
													label,
													s.label
												) }
											/>
										</div>
									);
								} }
							</TabPanel>
						) : (
							<div className="sgs-colour-control__content">
								<StateContent
									state={ resolvedStates[ 0 ] }
									colours={ colours }
									enableAlpha={ enableAlpha }
									clearable={ clearable }
									ariaLabel={ label }
								/>
							</div>
						)
					}
				/>
			</Item>
			{ hasStates && (
				<span id={ descId } className="screen-reader-text">
					{ sprintf(
						/* translators: 1: number of pickable states, 2: comma-separated state labels */
						__(
							'%1$d colour states available: %2$s',
							'sgs-blocks'
						),
						resolvedStates.length,
						resolvedStates.map( ( s ) => s.label ).join( ', ' )
					) }
				</span>
			) }
		</ItemGroup>
	);
}

