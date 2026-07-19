/**
 * SGS Nav Drawer — block editor UI.
 *
 * The drawer is shown as an OPEN, styled preview shell so its InnerBlocks
 * content (menu / logo / CTA) stays editable in place. A native `<dialog>`
 * cannot host an editable InnerBlocks region while closed, and ServerSideRender
 * cannot host editable InnerBlocks at all, so the canvas uses a styled shell
 * (the standard InnerBlocks-container pattern — core/group, core/cover). The
 * shell's live styling reads the SAME attributes render.php reads, so SETTINGS
 * are reflected without the hand-built-preview drift the SSR rule warns about;
 * the interactive open/close animation is frontend-only.
 *
 * Inspector (Spec 35): two native tabs — Settings + Styles — via the `group`
 * prop; element-first panels grouped by PART (Drawer container / Close button /
 * Content). The WP-native Border panel (from the __experimentalBorder support)
 * appears in the Styles tab automatically and is not duplicated here.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalUnitControl as UnitControl,
	Icon,
} from '@wordpress/components';
import { close } from '@wordpress/icons';
import { DesignTokenPicker, ResponsiveControl, ResponsiveBoxControl } from '../../components';
import { colourVar } from '../../utils';

/** Content template: menu + (optional) logo + (optional) CTA. templateLock:false. */
const TEMPLATE = [
	[ 'sgs/nav-menu' ],
	[ 'sgs/responsive-logo' ],
	[ 'sgs/button' ],
];

/** drawerAlign → align-items (mirrors render.php). */
const ALIGN_ITEMS = {
	left: 'flex-start',
	center: 'center',
	right: 'flex-end',
};

/**
 * Build a CSS padding shorthand from a { top, right, bottom, left } box object,
 * or undefined when nothing is set (editor preview only).
 *
 * @param {Object} box Box object.
 * @return {string|undefined} CSS padding value or undefined.
 */
function paddingFromBox( box ) {
	if ( ! box || typeof box !== 'object' ) {
		return undefined;
	}
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) {
		return undefined;
	}
	return `${ top || '0' } ${ right || '0' } ${ bottom || '0' } ${ left || '0' }`;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		drawerRef,
		edge,
		width,
		drawerBg,
		toggleCloseColour,
		drawerAlign,
		drawerGap,
		drawerPadding,
		submenuModel,
	} = attributes;

	const isPartial = edge !== 'full-screen';

	// Editor-only preview styling (reflects the same attrs render.php reads;
	// inline style here is editor canvas only — the no-inline contract governs
	// the FRONTEND render.php output, not the editor).
	const shellStyle = {
		backgroundColor: colourVar( drawerBg ),
	};
	const bodyStyle = {
		alignItems: ALIGN_ITEMS[ drawerAlign ] || 'flex-start',
		gap: drawerGap?.desktop || undefined,
		padding: paddingFromBox( drawerPadding?.desktop ),
	};

	const blockProps = useBlockProps( {
		className: 'sgs-nav-drawer sgs-nav-drawer__editor',
		style: shellStyle,
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-nav-drawer__body', style: bodyStyle },
		{
			template: TEMPLATE,
			templateLock: false,
		}
	);

	return (
		<>
			{ /* ── Settings tab ─────────────────────────────────────────── */ }
			<InspectorControls>
				<PanelBody title={ __( 'Drawer', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Drawer ID', 'sgs-blocks' ) }
						help={ __(
							'The ID the burger opens (its “Drawer ref”). Leave as the default for a single drawer; give each drawer a unique ID when a site has more than one.',
							'sgs-blocks'
						) }
						value={ drawerRef || '' }
						onChange={ ( value ) => setAttributes( { drawerRef: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					<SelectControl
						label={ __( 'Edge', 'sgs-blocks' ) }
						help={ __(
							'Full-screen is the default. Left / right / top partial panels are a later-phase option.',
							'sgs-blocks'
						) }
						value={ edge }
						options={ [
							{ label: __( 'Full screen', 'sgs-blocks' ), value: 'full-screen' },
							{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
							{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
							{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
						] }
						onChange={ ( value ) => setAttributes( { edge: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>

					{ isPartial && (
						<UnitControl
							label={ __( 'Panel width / height', 'sgs-blocks' ) }
							help={ __( 'Applies to partial (non-full-screen) edges.', 'sgs-blocks' ) }
							value={ width || '' }
							onChange={ ( value ) => setAttributes( { width: value || '' } ) }
							__next40pxDefaultSize
						/>
					) }

					<ToggleGroupControl
						label={ __( 'Submenu behaviour', 'sgs-blocks' ) }
						help={ __(
							'How nested menu items expand. Accordion opens items in place; drill-down slides to a sub-panel.',
							'sgs-blocks'
						) }
						value={ submenuModel }
						onChange={ ( value ) => setAttributes( { submenuModel: value || 'accordion' } ) }
						isBlock
						__nextHasNoMarginBottom
					>
						<ToggleGroupControlOption value="accordion" label={ __( 'Accordion', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="drill-down" label={ __( 'Drill-down', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ──────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Drawer container', 'sgs-blocks' ) }>
					{ /* Fill. Deliberately preset-slug-only (no enableAlpha) — the
					     WCAG auto-contrast foreground (sgs_resolve_palette_hex) needs
					     a resolvable slug; a custom/alpha value would break the
					     zero-config contrast pairing. */ }
					<DesignTokenPicker
						label={ __( 'Background', 'sgs-blocks' ) }
						value={ drawerBg }
						onChange={ ( value ) => setAttributes( { drawerBg: value || '' } ) }
						linked
						clearable
					/>

					{ /* Layout */ }
					<ToggleGroupControl
						label={ __( 'Content alignment', 'sgs-blocks' ) }
						value={ drawerAlign }
						onChange={ ( value ) => setAttributes( { drawerAlign: value || 'left' } ) }
						isBlock
						__nextHasNoMarginBottom
					>
						<ToggleGroupControlOption value="left" label={ __( 'Left', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="center" label={ __( 'Centre', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="right" label={ __( 'Right', 'sgs-blocks' ) } />
					</ToggleGroupControl>

					<ResponsiveControl label={ __( 'Inner element spacing', 'sgs-blocks' ) }>
						{ ( breakpoint ) => (
							<UnitControl
								label={ __( 'Gap', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ drawerGap?.[ breakpoint ] || '' }
								onChange={ ( value ) =>
									setAttributes( {
										drawerGap: { ...drawerGap, [ breakpoint ]: value || undefined },
									} )
								}
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveControl>

					<ResponsiveBoxControl
						label={ __( 'Popup padding', 'sgs-blocks' ) }
						values={ {
							base: drawerPadding?.desktop ?? {},
							tablet: drawerPadding?.tablet ?? {},
							mobile: drawerPadding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								drawerPadding: { ...drawerPadding, [ key ]: next },
							} );
						} }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Close button', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Close icon colour', 'sgs-blocks' ) }
						value={ toggleCloseColour }
						onChange={ ( value ) => setAttributes( { toggleCloseColour: value || '' } ) }
						linked
						enableAlpha
						clearable
					/>
					<p style={ { fontSize: '12px', color: '#757575', margin: '4px 0 0' } }>
						{ __(
							'Leave empty to match the drawer’s text colour automatically. The × is always present — it cannot be deleted.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>

				<PanelBody title={ __( 'Content', 'sgs-blocks' ) } initialOpen={ false }>
					<p style={ { fontSize: '12px', color: '#757575', margin: 0 } }>
						{ __(
							'Edit the drawer’s menu, logo and call-to-action directly on the canvas. Each is an optional block you can remove or reorder.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<span className="sgs-nav-drawer__close-preview" aria-hidden="true">
					<Icon icon={ close } />
				</span>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
