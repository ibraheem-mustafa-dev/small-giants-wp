/**
 * BooleanResponsiveControl — a single ToggleControl on Desktop, a 3-way
 * Inherit/On/Off switch on Tablet/Mobile, driven by the shared device-tab
 * switcher (`ResponsiveControl`).
 *
 * Promoted to the shared `src/components/` barrel (2026-09-01) once a THIRD
 * consumer (`sgs/media`'s `video-behaviour` atom) needed it — the two
 * block-local copies this replaces (`src/blocks/before-after/
 * BooleanResponsiveControl.js`, `src/blocks/media/BooleanResponsiveControl.js`)
 * were byte-identical, and their own docblocks named this exact promotion
 * as the next step once a third need arrived. `sgs/before-after` and the
 * media block's own remaining direct import both now point here.
 *
 * Built for the FLAT base + `{base}Tablet` + `{base}Mobile` attribute
 * convention (the framework standard — the unsuffixed base IS the desktop
 * value, there is deliberately no `{base}Desktop` attr), NOT the
 * `{desktop,tablet,mobile}` object shape `ResponsiveTriStateControl` uses.
 *
 * Storage: Tablet/Mobile attrs are boolean|null — null means "inherit the
 * tier above" (Tablet inherits Desktop; Mobile inherits the resolved Tablet
 * value), matching the framework's null-means-inherit convention already
 * used for `maxWidthTablet` etc. Desktop is always a concrete boolean.
 *
 * `disabled` (added 2026-09-01 for the `video-behaviour` atom's Autoplay ->
 * Muted/PlaysInline lock, registry.js `requires`) disables the control at
 * EVERY tier when true, rather than only the desktop toggle — a client
 * changing device tabs must not find the "locked" control suddenly editable
 * on Tablet/Mobile while its desktop sibling is disabled.
 *
 * Usage:
 *   <BooleanResponsiveControl
 *     label={ __( 'Autoplay videos', 'sgs-blocks' ) }
 *     attrBase="videoAutoplay"
 *     attrTablet="videoAutoplayTablet"
 *     attrMobile="videoAutoplayMobile"
 *     attributes={ attributes }
 *     setAttributes={ setAttributes }
 *   />
 *
 * The `attr*` props are read by `scripts/check-dead-controls.js`'s
 * `attrPropRe` (the same JSX string-literal-prop resolution `sgs/media`'s
 * `RUnitControl` pattern already relies on) so a computed
 * `setAttributes({ [key]: val })` write still registers as a controlled
 * attribute for the dead-control guard.
 */
import {
	ToggleControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import ResponsiveControl from './ResponsiveControl';
import { ToggleGroupControl, ToggleGroupControlOption } from './primitives';

/**
 * Resolve the EFFECTIVE boolean for a tier, falling back upward through
 * null/undefined overrides (tablet -> desktop; mobile -> resolved tablet).
 *
 * @param {boolean}                     base   Desktop value.
 * @param {boolean|null|undefined}      tablet Tablet override (null/undefined = inherit).
 * @param {boolean|null|undefined}      mobile Mobile override (null/undefined = inherit).
 * @param {'desktop'|'tablet'|'mobile'} tier   Tier to resolve.
 * @return {boolean} Effective value at that tier.
 */
function resolveEffective( base, tablet, mobile, tier ) {
	if ( 'desktop' === tier ) {
		return base;
	}
	const tabletEffective =
		tablet === null || tablet === undefined ? base : !! tablet;
	if ( 'tablet' === tier ) {
		return tabletEffective;
	}
	return mobile === null || mobile === undefined
		? tabletEffective
		: !! mobile;
}

export default function BooleanResponsiveControl( {
	label,
	help,
	attrBase,
	attrTablet,
	attrMobile,
	attributes,
	setAttributes,
	disabled = false,
} ) {
	const base = !! attributes[ attrBase ];
	const tablet = attributes[ attrTablet ] ?? null;
	const mobile = attributes[ attrMobile ] ?? null;

	return (
		<ResponsiveControl label={ label }>
			{ ( breakpoint ) => {
				if ( 'desktop' === breakpoint ) {
					return (
						<ToggleControl
							__nextHasNoMarginBottom
							label={ label }
							hideLabelFromVision
							help={ help }
							checked={ base }
							disabled={ disabled }
							onChange={ ( value ) =>
								setAttributes( { [ attrBase ]: value } )
							}
						/>
					);
				}

				const isTablet = 'tablet' === breakpoint;
				const attrKey = isTablet ? attrTablet : attrMobile;
				const own = isTablet ? tablet : mobile;
				let ownState = 'off';
				if ( own === null || own === undefined ) {
					ownState = 'inherit';
				} else if ( own ) {
					ownState = 'on';
				}
				const parentLabel = isTablet
					? __( 'Desktop', 'sgs-blocks' )
					: __( 'Tablet', 'sgs-blocks' );
				const parentResolved = resolveEffective(
					base,
					tablet,
					mobile,
					isTablet ? 'desktop' : 'tablet'
				);

				return (
					<>
						<ToggleGroupControl
							__nextHasNoMarginBottom
							isBlock
							label={ label }
							hideLabelFromVision
							value={ ownState }
							onChange={ ( next ) => {
								// `ToggleGroupControl` itself has no `disabled`
								// prop in the stable Gutenberg API
								// (WordPress/gutenberg#57862, still open) —
								// disabling it there is a silent no-op, so the
								// group-level `isDisabled` this used to carry
								// never actually blocked a click. Per-option
								// `disabled` below IS supported
								// (WordPress/gutenberg#63450) and does the real
								// DOM-level blocking; this `onChange` guard is
								// the second line of defence so the stored
								// value genuinely cannot change while locked
								// even if the DOM-level block has a gap.
								if ( disabled ) {
									return;
								}
								setAttributes( {
									[ attrKey ]:
										'inherit' === next
											? null
											: 'on' === next,
								} );
							} }
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption
								value="inherit"
								label={ sprintf(
									/* translators: 1: parent tier name, 2: resolved On/Off state. */
									__( 'Inherit (%1$s: %2$s)', 'sgs-blocks' ),
									parentLabel,
									parentResolved
										? __( 'On', 'sgs-blocks' )
										: __( 'Off', 'sgs-blocks' )
								) }
								disabled={ disabled }
							/>
							<ToggleGroupControlOption
								value="on"
								label={ __( 'On', 'sgs-blocks' ) }
								disabled={ disabled }
							/>
							<ToggleGroupControlOption
								value="off"
								label={ __( 'Off', 'sgs-blocks' ) }
								disabled={ disabled }
							/>
						</ToggleGroupControl>
						{ help && (
							<p className="components-base-control__help">
								{ help }
							</p>
						) }
					</>
				);
			} }
		</ResponsiveControl>
	);
}
