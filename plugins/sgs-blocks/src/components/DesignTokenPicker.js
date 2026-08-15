/**
 * Colour picker that reads the active theme.json palette.
 *
 * Uses useSettings() so it always reflects the current style variation.
 * Blocks never need to know the actual hex values — they get the
 * palette from the theme automatically.
 *
 * Two storage modes:
 *  - default (hex): ColorPalette's picked CSS value is stored verbatim.
 *  - `linked` (D288): when a global-palette SWATCH is picked, the theme token
 *    SLUG is stored (e.g. `primary`) so a palette/brand change recolours the
 *    element automatically; a CUSTOM colour is stored as its hex. This matches
 *    Spectra's "global default" behaviour and keeps the button consistent with
 *    the cloning converter (which also writes slugs). `render.php`'s
 *    sgs_colour_value() resolves both a slug and a raw hex.
 *
 * Alpha (Spec 35 Part I action item): `enableAlpha` (default true — "almost
 * always" per the standard) lets the operator pick a translucent colour.
 * ColorPalette's custom picker returns hex8 (#RRGGBBAA) or a functional
 * `rgba()` string depending on the copy format in use — either way,
 * `sgs_colour_value()` in `includes/helpers-tokens.php` already normalises
 * functional notation to hex8 before it reaches a `style`/scoped-CSS
 * declaration (WordPress's `safecss_filter_attr()` silently strips raw
 * `rgba()`/`hsla()` values — D302 / `safecss-strips-inline-functional-colours`
 * — hex survives), so no extra JS-side conversion is needed here.
 *
 * ── D609 (2026-08-13) — THE STATE + SHAPE RULE ─────────────────────────────
 * Contract: `.claude/plans/spec-35-control-type-contract.md` §1 field 9.
 * Bean, from a manual inspector review: "any element specific colour that
 * ends up staying in its element … should still use the same thin
 * rectangular control that shows the number of states pickable per setting
 * that has its colour picker pop out" — and states are reached by "a tab
 * toggle in pop up colour picker between states", never a sibling control,
 * never a second panel, and NEVER behind an optional "+" disclosure.
 *
 * This file now serves TWO shapes from ONE default export, chosen by whether
 * the caller passes `states`:
 *
 *  - No `states` prop → THE LEGACY SHAPE, byte-identical rendering to every
 *    existing call site (43 blocks / 214 instances, contract §1 field 6) —
 *    a labelled `ColorPalette` inline in the sidebar. Only change: the
 *    long-standing missing-`id` defect (field 2) is fixed here, for every
 *    caller, via `useInstanceId` + a verified-honoured `aria-label` on
 *    `ColorPalette` (see the comment on that prop below for why `id` alone
 *    does not fix this).
 *  - `states={[{ key, label, value, onChange, linked? }, …]}` → THE NEW
 *    D609 ROW SHAPE (`SgsColourStateControl` below): a thin swatch row that
 *    opens a popover; a single state renders the palette directly, 2+ states
 *    add an in-popover tab toggle. This is the shape every colour control
 *    should eventually carry (9a) — today only the pilot block
 *    (`sgs/icon`) opts in, per the build brief's "pilot ONE block, do not
 *    roll out" instruction. Converting the other 42 call sites is a
 *    separate, deliberate decision, not a side effect of this file.
 */
import { useSettings } from '@wordpress/block-editor';
import { useInstanceId } from '@wordpress/compose';
import { __, sprintf } from '@wordpress/i18n';
import {
	BaseControl,
	Button,
	ColorIndicator,
	Dropdown,
	Flex,
	FlexItem,
	TabPanel,
} from '@wordpress/components';
import { HStack, Item, ItemGroup, ZStack } from './primitives';
import { ColorPalette } from './colour-picker';

/**
 * Resolve a stored colour VALUE to a displayable CSS colour.
 *  - a hex / rgb / hsl / var() passes through unchanged.
 *  - a theme token SLUG (e.g. 'primary') resolves to its palette hex, or falls
 *    back to the WP preset CSS var so it still renders inside the editor iframe.
 *
 * @param {string} value   Stored colour value (slug or CSS colour).
 * @param {Array}  palette Active theme colour palette ([{ slug, color }]).
 * @return {string|undefined} A CSS colour, or undefined when empty.
 */
export function resolveColourToken( value, palette ) {
	if ( ! value ) {
		return undefined;
	}
	if ( /^(#|rgb|hsl|var\()/i.test( value ) ) {
		return value;
	}
	const match = ( palette || [] ).find( ( c ) => c.slug === value );
	return match ? match.color : `var(--wp--preset--color--${ value })`;
}

/**
 * Build the onChange handler for one colour slot, sharing the exact
 * slug-vs-hex storage logic the single-value control has always used
 * (D288 `linked` mode) — extracted so both the legacy branch and every
 * state tab in the new row shape apply it identically.
 *
 * @param {Object}   args
 * @param {boolean}  args.linked   Whether picking a palette swatch stores its slug.
 * @param {Array}    args.colours  Active theme colour palette.
 * @param {Function} args.onChange Attribute setter for this one colour slot.
 * @return {Function} A ColorPalette-compatible onChange handler.
 */
function makeChangeHandler( { linked, colours, onChange } ) {
	return ( picked ) => {
		// ColorPalette calls onChange(undefined) when the operator clicks its
		// built-in "Clear" affordance. Alpha-0 (a fully transparent colour the
		// operator deliberately picked) is NOT the same as "unset" — normalise
		// only the genuine clear gesture to '' so the attribute is actually
		// removed rather than left holding a stale value.
		if ( ! linked ) {
			onChange( picked ?? '' );
			return;
		}
		if ( ! picked ) {
			onChange( '' );
			return;
		}
		// Store the SLUG when the picked colour matches a palette entry (stays
		// linked to the theme), otherwise store the raw custom hex/hex8.
		const match = ( colours || [] ).find( ( c ) => c.color === picked );
		onChange( match ? match.slug : picked );
	};
}

/**
 * THE D609 ROW SHAPE — reshaped to match WordPress core's native colour row
 * (2026-08-13 rebuild), one swatch-and-label row inside an `ItemGroup`, one
 * popover, an in-popover tab toggle when there is more than one pickable
 * state.
 *
 * GROUND TRUTH — read at the WP 7.0.4-pinned Gutenberg SHA
 * `28c0dedc4eaf001a24237a1fbba4b0887698b000` (never `trunk` — it is provably
 * different from what ships):
 *  - `colors-gradients/dropdown.js:65-77` `LabeledColorIndicator` — the exact
 *    row this is modelled on: `HStack justify="flex-start"` > one
 *    `ColorIndicator` swatch + ONE `FlexItem` label. THE label prints once,
 *    inside the button, full stop — there is no sibling/outer label anywhere
 *    in core's markup. The previous build here printed the label a second
 *    time in a `<span id={labelId}>` OUTSIDE the `Dropdown` — that was the
 *    doubled-label defect Bean flagged; deleted below, not hidden.
 *  - `colors-gradients/dropdown.js:80-130` mounts that row as the
 *    `renderToggle` of a `Dropdown`, inside a `Button __next40pxDefaultSize`.
 *  - `global-styles/color-panel.js:158-172` `LabeledColorIndicators` (plural)
 *    is core's own answer to "more than one colour on this row": a `ZStack`
 *    of overlapping `ColorIndicator`s (`isLayered={false} offset={-8}`), NOT
 *    a second text label and not a numeric badge — copied here for the
 *    2+-state case instead of the previous `sgs-colour-control__count` pill.
 *  - `colors-gradients/style.scss` `.block-editor-tools-panel-color-gradient-
 *    settings__item` — the bordered/rounded box a colour row sits in
 *    ($gray-300 border, $radius-small corners). That styling normally comes
 *    from being a `ToolsPanelItem`; since 9c bans `ToolsPanel` for colour
 *    outright, the public `ItemGroup`/`Item` pair (`item-group/styles.ts`
 *    `bordered`/`separated`/`rounded`) reproduces the identical box from
 *    stable public API — core's own comment at dropdown.js:29-31 says a
 *    color dropdown's toggle renders as an `Item` "if it is within an
 *    `ItemGroup`", which is exactly this shape.
 *  - core's `ColorPanel`/`Tabs`/`ColorGradientDropdownItem` are `lock()`ed
 *    behind `unlock( componentsPrivateApis )` (`color-panel.js:162`) and
 *    cannot be mounted outside core; this rebuilds the shape from the public
 *    parts (`Button`, `ColorIndicator`, `Dropdown`, `FlexItem`, `HStack`,
 *    `ItemGroup`/`Item`, `ZStack`), same as before. `TabPanel` (stable,
 *    public, already used at
 *    `blocks/container/components/ContainerWrapperControls.js:800`) still
 *    delivers the in-popover Normal/Hover tab toggle — that half was already
 *    correct (D609 9b) and is unchanged here.
 *  - Deliberately never a `ToolsPanel`/`ToolsPanelItem` — 9c bans the "+"
 *    disclosure for a colour outright, and this shape is a plain `Dropdown`
 *    inside an `ItemGroup`, so there is no disclosure to fall behind.
 *
 * @param {Object}  props
 * @param {string}  props.id          Stable id for this control instance (label/description association).
 * @param {string}  props.label       The control's own label (e.g. "Icon colour").
 * @param {Array}   props.states      `[{ key, label, value, onChange, linked? }]` — one entry per pickable state.
 * @param {boolean} props.clearable   Forwarded to `ColorPalette`.
 * @param {boolean} props.enableAlpha Forwarded to `ColorPalette`.
 * @param {Array}   props.colours     Active theme colour palette (from `useSettings( 'color.palette' )`).
 */
function SgsColourStateControl( {
	id,
	label,
	states,
	clearable,
	enableAlpha,
	colours,
} ) {
	const descId = `${ id }-desc`;
	const hasStates = states.length > 1;

	const resolved = states.map( ( s ) => ( {
		...s,
		display: s.linked ? resolveColourToken( s.value, colours ) : s.value,
	} ) );

	const renderPalette = ( s ) => (
		<ColorPalette
			key={ s.key }
			colors={ colours }
			value={ s.display }
			onChange={ makeChangeHandler( {
				linked: s.linked,
				colours,
				onChange: s.onChange,
			} ) }
			clearable={ clearable }
			disableCustomColors={ false }
			enableAlpha={ enableAlpha }
			// Verified honoured, NOT assumed: @wordpress/components
			// color-palette/index.tsx destructures `aria-label` at line 190
			// and applies it to the swatch grid's own accessible name. This is
			// the actual fix for field 2's defect — `BaseControl`'s `id` prop
			// only produces a working `<label htmlFor>` when some CHILD
			// element carries that same id on a focusable node
			// (`base-control/index.tsx:44-57`), and `ColorPalette` has no
			// single focusable element to receive one; it is a grid of
			// swatch buttons. `id`/`aria-labelledby` are still set on the
			// trigger `Button` below (which IS one focusable element) so the
			// row itself is correctly named too.
			aria-label={
				hasStates
					? sprintf(
							/* translators: 1: control label (e.g. "Icon colour"), 2: state label (e.g. "Hover") */
							__( '%1$s — %2$s', 'sgs-blocks' ),
							label,
							s.label
					  )
					: label
			}
		/>
	);

	// The swatch cluster — a single ColorIndicator for one state, or core's
	// own ZStack-of-overlapping-swatches for 2+ states (global-styles/
	// color-panel.js:158-172 `LabeledColorIndicators`). Never a numeric
	// pill — the state count is conveyed visually, the way core does it.
	const swatches = hasStates ? (
		<ZStack isLayered={ false } offset={ -8 }>
			{ resolved.map( ( s ) => (
				<Flex key={ s.key } expanded={ false }>
					<ColorIndicator colorValue={ s.display } />
				</Flex>
			) ) }
		</ZStack>
	) : (
		<ColorIndicator colorValue={ resolved[ 0 ].display } />
	);

	return (
		<ItemGroup
			isBordered
			isSeparated
			className="sgs-colour-control-group"
		>
			<Item as="div" className="sgs-colour-control-group__item">
				<Dropdown
					className="sgs-colour-control__dropdown"
					contentClassName="sgs-colour-control__popover"
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
							{ /* ONE label, printed once, inside the button —
							   matches core's LabeledColorIndicator exactly
							   (dropdown.js:65-77). No sibling/outer label. */ }
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
								tabs={ resolved.map( ( s ) => ( {
									name: s.key,
									title: s.label,
								} ) ) }
							>
								{ ( tab ) => (
									<div className="sgs-colour-control__content">
										{ renderPalette(
											resolved.find(
												( s ) => s.key === tab.name
											) ?? resolved[ 0 ]
										) }
									</div>
								) }
							</TabPanel>
						) : (
							<div className="sgs-colour-control__content">
								{ renderPalette( resolved[ 0 ] ) }
							</div>
						)
					}
				/>
			</Item>
			{ hasStates && (
				<span id={ descId } className="screen-reader-text">
					{ sprintf(
						/* translators: 1: number of pickable states, 2: comma-separated state labels (e.g. "Normal, Hover") */
						__(
							'%1$d colour states available: %2$s',
							'sgs-blocks'
						),
						states.length,
						states.map( ( s ) => s.label ).join( ', ' )
					) }
				</span>
			) }
		</ItemGroup>
	);
}

export default function DesignTokenPicker( {
	label,
	value,
	onChange,
	clearable = true,
	linked = false,
	enableAlpha = true,
	states,
} ) {
	const [ colours ] = useSettings( 'color.palette' );
	// Hook order must stay unconditional (both branches below return from the
	// same component), so this is computed once regardless of which shape
	// renders — fixes contract §1 field 2 (missing id) for every one of the
	// 43 existing call sites, not only the new row shape.
	const instanceId = useInstanceId(
		DesignTokenPicker,
		'sgs-design-token-picker'
	);
	const id = `sgs-design-token-picker-${ instanceId }`;

	if ( states && states.length > 0 ) {
		return (
			<SgsColourStateControl
				id={ id }
				label={ label }
				states={ states }
				clearable={ clearable }
				enableAlpha={ enableAlpha }
				colours={ colours }
			/>
		);
	}

	// In linked mode the stored value may be a token slug — resolve it to a CSS
	// colour so ColorPalette highlights the matching swatch.
	const displayValue = linked ? resolveColourToken( value, colours ) : value;

	const handleChange = makeChangeHandler( { linked, colours, onChange } );

	return (
		<BaseControl id={ id } label={ label } __nextHasNoMarginBottom>
			<ColorPalette
				colors={ colours }
				value={ displayValue }
				onChange={ handleChange }
				clearable={ clearable }
				disableCustomColors={ false }
				enableAlpha={ enableAlpha }
				// See the comment on the identical prop in SgsColourStateControl
				// above — verified honoured at color-palette/index.tsx:190.
				aria-label={ label }
			/>
		</BaseControl>
	);
}
