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
 * `GradientOverlayControl`'s UX).
 *
 * STORAGE — SIBLING ATTRIBUTES, not one shared slot (corrected 2026-08-16;
 * the original build of this file toggled the MODE of a single attribute,
 * which was wrong — see the coordinator's correction). Mirrors
 * `sgs/container`'s existing, shipped `backgroundOverlayColour` /
 * `overlayGradient` precedent exactly: each state carries a `value`/
 * `onChange` pair (the flat colour, UNCHANGED shape from `DesignTokenPicker`)
 * PLUS a `gradientValue`/`onGradientChange` pair (the sibling `{attr}Gradient`
 * attribute). The gradient sibling wins when non-empty — resolved server-side
 * by `sgs_resolve_text_colour_or_gradient()` (`includes/helpers-tokens.php`).
 * Switching the toggle to Solid clears the gradient sibling (mirrors
 * `GradientOverlayControl`'s "the two paths never disagree about which is
 * current" rule); switching to Gradient never touches the flat sibling — it
 * simply stops being read until the operator switches back.
 *
 * ⛑ PROP-NAME UNIFICATION (D5, unified-colour-panel design, 2026-08-22) —
 * this file used to read `state.gradientOnChange` while `DesignTokenPicker`'s
 * own state shape (mechanism A) reads `state.onGradientChange`. Two names
 * for the same concept on the two colour-gradient mechanisms leaks onto
 * every future detector and every maintainer, so this file now reads and
 * documents `onGradientChange` as canonical — matching mechanism A and the
 * React `on<Event>` convention. Every call site across `blocks/*\/edit.js`
 * has been migrated to `onGradientChange`; the legacy `gradientOnChange`
 * alias has been removed — `onGradientChange` is the only key read.
 *
 * `DesignTokenPicker` itself needs no changes for this (LEDGER Task 1b
 * correction 1) — this is a sibling control, not an edit to that file.
 * `SgsColourPanel` gained one additive prop (`gradientCapable` per row) that
 * chooses between the two controls; every existing row is unaffected.
 */
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	ColorIndicator,
	Dropdown,
	Flex,
	FlexItem,
	Notice,
	TabPanel,
} from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';
import { useInstanceId } from '@wordpress/compose';
import { HStack, Item, ItemGroup, ZStack, ToggleGroupControl, ToggleGroupControlOption } from './primitives';
import { ColorPalette } from './colour-picker';
import SgsGradientPicker from './gradient-picker';
import { resolveColourToken } from './DesignTokenPicker';
import BorderStyleControl from './BorderStyleControl';
import {
	calculateContrastRatio,
	calculateRelativeLuminance,
	meetsWCAG_AA,
	worstGradientContrastRatio,
} from '../utils/wcag-contrast';

/**
 * A stored value is treated as a gradient when it parses as one of the three
 * CSS gradient functions (optionally `repeating-`). Mirrors the PHP-side
 * detection in `sgs_css_gradient_value()` (`includes/helpers-tokens.php`) —
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
 * `GradientOverlayControl`'s local-mode pattern. Mode is DERIVED from
 * whether the sibling gradient value is currently set (mirrors the
 * server-side "gradient wins when non-empty" resolution).
 */
function StateContent( {
	state,
	colours,
	enableAlpha,
	clearable,
	ariaLabel,
	contrastAgainst,
	contrastLabel,
	contrastLargeText,
} ) {
	const [ localMode, setLocalMode ] = useState( null );
	const gradientEnabled =
		localMode !== null ? localMode : !! state.gradientValue;

	const displayValue = state.linked
		? resolveColourToken( state.value, colours )
		: state.value;

	// Reference element for resolving `var(--wp--preset--color--x)` stops via
	// getComputedStyle — see calculateRelativeLuminance's own docblock. Scoped
	// to this state's own wrapper so the probe never leaks outside the popover.
	const contrastRefEl = useRef( null );

	// Resolve contrastAgainst the same way every other colour value in this
	// component is resolved — it may be a raw hex/rgb/var() OR a theme
	// palette token slug, matching DesignTokenPicker's own resolveColourToken
	// convention.
	const resolvedContrastAgainst = useMemo( () => {
		if ( ! contrastAgainst ) {
			return '';
		}
		return resolveColourToken( contrastAgainst, colours ) || contrastAgainst;
	}, [ contrastAgainst, colours ] );

	// WARN ONLY — never blocks saving, never throws on an unparseable colour
	// (falls back to no notice). An EFFECT, not useMemo: calculateRelativeLuminance
	// resolves a var() stop via getComputedStyle on contrastRefEl.current, which
	// is only populated once the div below has actually mounted — useMemo runs
	// during render, before that ref commit, and would read a stale/null probe
	// element on first paint. Recomputed only when this state's own value/
	// gradientValue or the resolved background changes, not on every render.
	const [ contrastNotice, setContrastNotice ] = useState( null );

	useEffect( () => {
		if ( ! resolvedContrastAgainst ) {
			setContrastNotice( null );
			return;
		}

		try {
			if ( gradientEnabled ) {
				if ( ! state.gradientValue ) {
					setContrastNotice( null );
					return;
				}
				const ratio = worstGradientContrastRatio(
					state.gradientValue,
					resolvedContrastAgainst,
					contrastRefEl.current
				);
				if ( ! meetsWCAG_AA( ratio, contrastLargeText ) ) {
					const minRatio = contrastLargeText ? '3.0' : '4.5';
					setContrastNotice(
						contrastLabel ||
							sprintf(
								/* translators: 1: contrast ratio, e.g. "2.1:1". 2: the required minimum ratio, e.g. "4.5:1". */
								__(
									'Contrast ratio %1$s:1 is below the WCAG AA minimum of %2$s:1 for at least one gradient stop.',
									'sgs-blocks'
								),
								ratio > 0 ? ratio.toFixed( 1 ) : '?',
								minRatio
							)
					);
				} else {
					setContrastNotice( null );
				}
				return;
			}

			if ( ! state.value ) {
				setContrastNotice( null );
				return;
			}
			const resolvedColour = state.linked
				? resolveColourToken( state.value, colours )
				: state.value;
			if ( ! resolvedColour ) {
				setContrastNotice( null );
				return;
			}
			const backgroundLuminance = calculateRelativeLuminance(
				resolvedContrastAgainst,
				contrastRefEl.current
			);
			const colourLuminance = calculateRelativeLuminance(
				resolvedColour,
				contrastRefEl.current
			);
			const ratio = calculateContrastRatio( backgroundLuminance, colourLuminance );
			if ( ! meetsWCAG_AA( ratio, contrastLargeText ) ) {
				const minRatio = contrastLargeText ? '3.0' : '4.5';
				setContrastNotice(
					contrastLabel ||
						sprintf(
							/* translators: 1: contrast ratio, e.g. "2.1:1". 2: the required minimum ratio, e.g. "4.5:1". */
							__(
								'Contrast ratio %1$s:1 is below the WCAG AA minimum of %2$s:1.',
								'sgs-blocks'
							),
							ratio > 0 ? ratio.toFixed( 1 ) : '?',
							minRatio
						)
				);
			} else {
				setContrastNotice( null );
			}
		} catch ( error ) {
			// Never throw on an unparseable colour — fall back to no notice.
			setContrastNotice( null );
		}
	}, [
		gradientEnabled,
		state.value,
		state.gradientValue,
		state.linked,
		colours,
		resolvedContrastAgainst,
		contrastLabel,
		contrastLargeText,
	] );

	return (
		<div
			className="sgs-gradient-capable-colour-control__state"
			ref={ contrastRefEl }
		>
			{ contrastNotice && (
				<Notice
					status="warning"
					isDismissible={ false }
					className="sgs-contrast-notice"
				>
					{ contrastNotice }
				</Notice>
			) }
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
					value={ state.gradientValue || '' }
					onChange={ ( newGradient ) => {
						setLocalMode( true );
						state.onGradientChange( newGradient ?? '' );
					} }
					enableAlpha={ enableAlpha }
					__experimentalIsRenderedInSidebar
				/>
			) : (
				<ColorPalette
					colors={ colours }
					value={ displayValue }
					onChange={ ( picked ) => {
						setLocalMode( false );
						// Switching to Solid clears the gradient sibling so the
						// two paths never disagree about which is current —
						// mirrors GradientOverlayControl exactly.
						state.onGradientChange( '' );
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
 * @param {Object}   props
 * @param {string}   props.label              Row label (e.g. "Heading colour").
 * @param {Array}    [props.states]           `[{ key, label, value, onChange, gradientValue, onGradientChange, linked? }]`.
 *                                             `value`/`onChange`/`linked` are the SAME shape `DesignTokenPicker` uses
 *                                             for the flat colour — unchanged. `gradientValue`/`onGradientChange`
 *                                             are the sibling `{attr}Gradient` attribute's pair — CANONICAL name per
 *                                             D5 (2026-08-22); every call site has been migrated to it.
 * @param {string}   [props.value]            Single-state convenience form (no tabs) — flat colour, paired with `onChange`.
 * @param {Function} [props.onChange]         Paired with `value` for the single-state form.
 * @param {string}   [props.gradientValue]    Single-state convenience form — the sibling gradient value.
 * @param {Function} [props.onGradientChange] Paired with `gradientValue` for the single-state form (canonical name).
 * @param {boolean}  [props.clearable=true]
 * @param {boolean}  [props.enableAlpha=true]
 * @param {string}   [props.contrastAgainst]  Opt-in WCAG contrast check — a hex colour OR a
 *                                             theme palette token slug to contrast the CURRENTLY
 *                                             OPEN state's colour/gradient against. Resolved the
 *                                             same way every other colour in this component is
 *                                             (raw value or palette slug). Omit to skip the check
 *                                             entirely (the default — no behaviour change for
 *                                             existing callers).
 * @param {string}   [props.contrastLabel]    Overrides the default "Contrast ratio X:1 is below…"
 *                                             warning text when the check fails.
 * @param {boolean}  [props.contrastLargeText=false] Selects the WCAG AA threshold `contrastAgainst`
 *                                             checks against: `false` (default) is the 4.5:1 TEXT
 *                                             threshold; `true` is the lower 3.0:1 threshold shared by
 *                                             large text (18px+/14px+bold) AND UI-component / non-text
 *                                             contrast (WCAG 1.4.11 — borders, icons, focus rings).
 *                                             Pass `true` when `contrastAgainst` is checking a BORDER
 *                                             or other non-text colour, not body text.
 */
export default function GradientCapableColourControl( {
	label,
	states,
	value,
	onChange,
	gradientValue,
	onGradientChange,
	linked,
	// Border style lives INSIDE this popover, below the colour content, when the
	// caller supplies a handler — matching WP core's own BorderBoxControl, where
	// the swatch button opens colour AND style together, and matching
	// DesignTokenPicker's existing borderStyle/onBorderStyleChange pair. It sits
	// outside the state tabs deliberately: a border has ONE style across normal
	// and hover, unlike the colour, which is per-state.
	borderStyle,
	onBorderStyleChange,
	clearable = true,
	enableAlpha = true,
	contrastAgainst,
	contrastLabel,
	contrastLargeText = false,
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
			: [
					{
						key: 'normal',
						label,
						value,
						onChange,
						gradientValue,
						onGradientChange,
						// `linked` decides whether a picked colour is stored as
						// the palette token SLUG or a baked hex (see the onChange
						// handler above). The single-value form could not express
						// it until 2026-08-29, so a caller with a linked row had
						// to use the `states` array purely to reach this key.
						linked,
					},
			  ];

	const hasStates = resolvedStates.length > 1;
	const descId = `${ id }-desc`;

	const swatchDisplay = ( s ) =>
		s.gradientValue
			? s.gradientValue
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
					renderContent={ () => (
						<>
						{ hasStates ? (
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
												contrastAgainst={ contrastAgainst }
												contrastLabel={ contrastLabel }
												contrastLargeText={ contrastLargeText }
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
									contrastAgainst={ contrastAgainst }
									contrastLabel={ contrastLabel }
									contrastLargeText={ contrastLargeText }
								/>
							</div>
						) }
						{ typeof onBorderStyleChange === 'function' && (
							<div className="sgs-colour-control__border-style">
								<BorderStyleControl
									value={ borderStyle }
									onChange={ onBorderStyleChange }
								/>
							</div>
						) }
						</>
					) }
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
