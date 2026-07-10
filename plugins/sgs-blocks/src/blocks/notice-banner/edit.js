import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	Notice,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import {
	IconPicker,
	IconPreview,
	DesignTokenPicker,
	ResponsiveBoxControl,
} from '../../components';
import { colourVar } from '../../utils';

// Box-object interface contract — length units for the kept-scalar maxWidth /
// contentWidth attrs (base only, matches the pre-existing attribute set).
const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
];

const DISPLAY_MODE_OPTIONS = [
	{ label: __( 'Inline', 'sgs-blocks' ), value: 'inline' },
	{ label: __( 'Announcement bar', 'sgs-blocks' ), value: 'announcement' },
];

const STICKY_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
];

const DISMISS_BEHAVIOUR_OPTIONS = [
	{
		label: __( 'Session (resets when tab closes)', 'sgs-blocks' ),
		value: 'session',
	},
	{
		label: __( 'Permanent (remembered in browser)', 'sgs-blocks' ),
		value: 'permanent',
	},
];

const VARIANT_OPTIONS = [
	{ label: __( 'Info', 'sgs-blocks' ), value: 'info' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
	{ label: __( 'Warning', 'sgs-blocks' ), value: 'warning' },
	{ label: __( 'Error', 'sgs-blocks' ), value: 'error' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
];

// The ideal default icon for each variant (Lucide). Shown unless the operator
// picks an override. Must stay in sync with the same map in render.php.
const VARIANT_DEFAULT_ICON = {
	info: 'info',
	success: 'circle-check',
	warning: 'triangle-alert',
	error: 'circle-x',
	accent: 'sparkles',
};

/**
 * Resolve the icon to display: an explicit override, else the variant default.
 *
 * @param {Object} attrs Block attributes.
 * @return {{source:string,name:string}} Resolved icon.
 */
function resolveIcon( attrs ) {
	if ( attrs.iconSource && attrs.iconName ) {
		return { source: attrs.iconSource, name: attrs.iconName };
	}
	return {
		source: 'lucide',
		name: VARIANT_DEFAULT_ICON[ attrs.variant ] || 'info',
	};
}

/**
 * Default InnerBlocks template.
 *
 * Seeds an sgs/text body for the notice message. The slot stays OPEN (no
 * allowedBlocks lock) so an operator — or the cloning converter routing a
 * draft heading node INTO the banner rather than emitting it as a sibling —
 * can add an sgs/heading, a list, or a secondary note as additional children.
 */
const NOTICE_BANNER_TEMPLATE = [
	[
		'sgs/text',
		{ text: __( 'Write your notice message here.', 'sgs-blocks' ), tag: 'p' },
	],
];

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder (base tier only;
// tablet/mobile preview is via PHP `@media`, matches sgs/quote's pattern).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

// Editor canvas preview only (desktop styles; responsive via PHP). No-inline
// contract note: the SAVED/RENDERED frontend output is dynamic (render.php)
// and carries zero inline declarations — this inline style exists only for
// the live editor preview, same exception documented in sgs/quote's edit.js.
function buildWrapperStyle( attributes ) {
	const { style, maxWidth, contentWidth } = attributes;
	const wrapperStyle = {};

	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}
	if ( maxWidth ) {
		wrapperStyle.maxWidth = maxWidth;
	}
	if ( contentWidth ) {
		wrapperStyle.width = contentWidth;
	}

	return wrapperStyle;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		variant,
		showIcon,
		iconSource,
		iconColour,
		displayMode,
		stickyPosition,
		dismissible,
		dismissBehaviour,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		maxWidth,
		contentWidth,
	} = attributes;

	const isAnnouncement = 'announcement' === displayMode;

	const className = [
		'sgs-notice-banner',
		`sgs-notice-banner--${ variant }`,
		isAnnouncement ? 'sgs-notice-banner--announcement' : '',
		isAnnouncement ? `sgs-notice-banner--sticky-${ stickyPosition }` : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: isAnnouncement ? undefined : buildWrapperStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps( {}, {
		template: NOTICE_BANNER_TEMPLATE,
	} );
	const resolved = resolveIcon( attributes );
	const usingDefault = ! ( iconSource && attributes.iconName );

	return (
		<>
			<InspectorControls>
				{ /* NO-INLINE + NO-WRAPPER (2026-07-10): content-KIND, box+width only —
				     dropped SGS_Container_Wrapper (D294) in favour of block-private
				     scoped output (matches sgs/quote). Padding/margin route to the
				     WP-native style.spacing.* object (base) + custom Tablet/Mobile
				     box-object tiers; only shown in inline mode — announcement mode
				     is always full-width + fixed. */ }
				{ ! isAnnouncement && (
					<PanelBody title={ __( 'Wrapper', 'sgs-blocks' ) } initialOpen={ false }>
						<UnitControl
							label={ __( 'Outer max-width', 'sgs-blocks' ) }
							value={ maxWidth || '' }
							units={ LENGTH_UNITS }
							onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
							help={ __( 'Exact CSS length, e.g. 800px. Leave blank for no cap.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<UnitControl
							label={ __( 'Content width', 'sgs-blocks' ) }
							value={ contentWidth || '' }
							units={ LENGTH_UNITS }
							onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
							help={ __( 'Exact CSS length, e.g. 900px. Leave blank for full width.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<ResponsiveBoxControl
							label={ __( 'Padding', 'sgs-blocks' ) }
							values={ {
								base: style?.spacing?.padding ?? {},
								tablet: paddingTablet ?? {},
								mobile: paddingMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
								} else {
									setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
								}
							} }
						/>
						<ResponsiveBoxControl
							label={ __( 'Margin', 'sgs-blocks' ) }
							values={ {
								base: style?.spacing?.margin ?? {},
								tablet: marginTablet ?? {},
								mobile: marginMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
								} else {
									setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
								}
							} }
						/>
					</PanelBody>
				) }
				<PanelBody title={ __( 'Banner Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Display mode', 'sgs-blocks' ) }
						help={ __(
							'Inline sits within the page flow. Announcement bar is fixed to the top or bottom of the viewport.',
							'sgs-blocks'
						) }
						value={ displayMode }
						options={ DISPLAY_MODE_OPTIONS }
						onChange={ ( val ) => setAttributes( { displayMode: val } ) }
						__nextHasNoMarginBottom
					/>
					{ isAnnouncement && (
						<>
							<SelectControl
								label={ __( 'Position', 'sgs-blocks' ) }
								value={ stickyPosition }
								options={ STICKY_POSITION_OPTIONS }
								onChange={ ( val ) => setAttributes( { stickyPosition: val } ) }
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Dismissible', 'sgs-blocks' ) }
								help={ __(
									'Shows a close button so visitors can hide the bar.',
									'sgs-blocks'
								) }
								checked={ !! dismissible }
								onChange={ ( val ) => setAttributes( { dismissible: val } ) }
								__nextHasNoMarginBottom
							/>
							{ dismissible && (
								<SelectControl
									label={ __( 'Dismiss behaviour', 'sgs-blocks' ) }
									help={ __(
										'How long the bar stays hidden after the visitor closes it.',
										'sgs-blocks'
									) }
									value={ dismissBehaviour }
									options={ DISMISS_BEHAVIOUR_OPTIONS }
									onChange={ ( val ) =>
										setAttributes( { dismissBehaviour: val } )
									}
									__nextHasNoMarginBottom
								/>
							) }
							<Notice status="info" isDismissible={ false }>
								{ __(
									'Announcement bar is fixed-position on the live site. In the editor it renders inline so you can still edit the content.',
									'sgs-blocks'
								) }
							</Notice>
						</>
					) }
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						help={ __(
							'Sets the colour and a fitting default icon.',
							'sgs-blocks'
						) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) => setAttributes( { variant: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show icon', 'sgs-blocks' ) }
						checked={ !! showIcon }
						onChange={ ( val ) => setAttributes( { showIcon: val } ) }
						__nextHasNoMarginBottom
					/>
					{ showIcon && (
						<IconPicker
							label={ __( 'Icon (overrides the variant default)', 'sgs-blocks' ) }
							value={ resolved }
							onChange={ ( { source, name } ) =>
								setAttributes( { iconSource: source, iconName: name } )
							}
						/>
					) }
					{ showIcon && ! usingDefault && (
						<ToggleControl
							label={ __( "Use the variant's default icon", 'sgs-blocks' ) }
							checked={ false }
							onChange={ () =>
								setAttributes( { iconSource: '', iconName: '' } )
							}
							help={ __(
								'Reset to the icon that matches the chosen variant.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					{ showIcon && (
						<DesignTokenPicker
							label={ __( 'Icon colour', 'sgs-blocks' ) }
							value={ iconColour || '' }
							onChange={ ( val ) => setAttributes( { iconColour: val ?? '' } ) }
							clearable={ true }
						/>
					) }
				</PanelBody>
			</InspectorControls>

			{ /* FR-22-6: the notice text is now an InnerBlocks child (sgs/text).
			     The wrapper div carries the variant class + role="note".
			     In announcement mode we use role="banner" (a landmark, one per page);
			     the editor renders it inline — fixed-position only on the frontend. */ }
			<div { ...blockProps } role={ isAnnouncement ? 'banner' : 'note' }>
				{ showIcon && (
					<span
						className="sgs-notice-banner__icon"
						aria-hidden="true"
						style={ iconColour ? { color: colourVar( iconColour ) } : undefined }
					>
						<IconPreview source={ resolved.source } name={ resolved.name } size={ 20 } />
					</span>
				) }
				<div { ...innerBlocksProps } />
				{ isAnnouncement && dismissible && (
					<button
						className="sgs-notice-banner__close"
						aria-label={ __( 'Dismiss announcement', 'sgs-blocks' ) }
						type="button"
					>
						{ /* × character — decorative; the aria-label carries the accessible name. */ }
						<span aria-hidden="true">{ '×' }</span>
					</button>
				) }
			</div>
		</>
	);
}
