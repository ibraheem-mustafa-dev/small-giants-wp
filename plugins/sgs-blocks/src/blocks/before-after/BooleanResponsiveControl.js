/**
 * BooleanResponsiveControl — a single ToggleControl on Desktop, a 3-way
 * Inherit/On/Off switch on Tablet/Mobile, driven by the shared device-tab
 * switcher (`ResponsiveControl`).
 *
 * Block-local copy (D-pending, video playback-behaviour tiers task): the
 * cloning/tier work for this session was scoped to exactly two block
 * directories (`sgs/media` and `sgs/before-after`) on a shared worktree with
 * other sessions active, so this small control is duplicated in each block's
 * own directory (identical sibling at `src/blocks/media/BooleanResponsiveControl.js`)
 * rather than added to the shared `src/components/` barrel — avoids touching
 * a file other concurrent sessions may also be editing. If a THIRD block
 * needs this pattern, promote the (then-duplicated-3x) component to
 * `src/components/` in its own follow-up change.
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
import { ResponsiveControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * Resolve the EFFECTIVE boolean for a tier, falling back upward through
 * null/undefined overrides (tablet -> desktop; mobile -> resolved tablet).
 *
 * @param {boolean}                     base   Desktop value.
 * @param {boolean|null}                tablet Tablet override (null/undefined = inherit).
 * @param {boolean|null}                mobile Mobile override (null/undefined = inherit).
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
							help={ help }
							checked={ base }
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
							onChange={ ( next ) =>
								setAttributes( {
									[ attrKey ]:
										'inherit' === next
											? null
											: 'on' === next,
								} )
							}
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
							/>
							<ToggleGroupControlOption
								value="on"
								label={ __( 'On', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="off"
								label={ __( 'Off', 'sgs-blocks' ) }
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
