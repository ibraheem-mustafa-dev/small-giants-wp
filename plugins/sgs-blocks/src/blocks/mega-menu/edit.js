/**
 * SGS Mega Menu — Block Editor (edit.js)
 *
 * Inspector controls for layout variants, animation, close delay,
 * panel content, and icon/badge options.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
	Icon,
	Notice,
} from '@wordpress/components';
import { chevronDown, chevronRight } from '@wordpress/icons';
import { useSelect } from '@wordpress/data';
import { DesignTokenPicker } from '../../components';

// ─── Layout variant options ────────────────────────────────────────────────
const LAYOUT_VARIANT_OPTIONS = [
	{
		label: __( 'Full width — spans viewport', 'sgs-blocks' ),
		value: 'full-width',
	},
	{
		label: __( 'Contained — content width (1200 px)', 'sgs-blocks' ),
		value: 'contained',
	},
	{
		label: __( 'Columns — auto-column grid', 'sgs-blocks' ),
		value: 'columns',
	},
	{
		label: __( 'Flyout — slides in from the right', 'sgs-blocks' ),
		value: 'flyout',
	},
];

// ─── Panel alignment options (not shown for flyout) ────────────────────────
const PANEL_ALIGNMENT_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

// ─── Open trigger options ──────────────────────────────────────────────────
const OPEN_ON_OPTIONS = [
	{ label: __( 'Hover (desktop)', 'sgs-blocks' ), value: 'hover' },
	{ label: __( 'Click / tap', 'sgs-blocks' ), value: 'click' },
];

// ─── Animation options ─────────────────────────────────────────────────────
const OPEN_ANIMATION_OPTIONS = [
	{ label: __( 'Fade', 'sgs-blocks' ), value: 'fade' },
	{ label: __( 'Slide down', 'sgs-blocks' ), value: 'slide-down' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
];

// ─── Icon position options ─────────────────────────────────────────────────
const ICON_POSITION_OPTIONS = [
	{ label: __( 'Before label', 'sgs-blocks' ), value: 'before' },
	{ label: __( 'After label', 'sgs-blocks' ), value: 'after' },
];

// ─── Edit component ────────────────────────────────────────────────────────
export default function Edit( { attributes, setAttributes } ) {
	const {
		label,
		url,
		opensInNewTab,
		menuTemplatePart,
		layoutVariant,
		panelAlignment,
		openOn,
		openAnimation,
		closeDelay,
		icon,
		iconPosition,
		highlight,
		badge,
		badgeColour,
	} = attributes;

	// Fetch available template parts with area='mega-menu' from the API.
	const templateParts = useSelect( ( select ) => {
		const { getEntityRecords } = select( 'core' );
		const parts = getEntityRecords( 'postType', 'wp_template_part', {
			per_page: -1,
		} );
		if ( ! parts ) {
			return [];
		}
		return parts
			.filter( ( part ) => part.area === 'mega-menu' )
			.map( ( part ) => ( {
				label: part.title?.rendered || part.slug,
				value: part.slug,
			} ) );
	}, [] );

	const blockProps = useBlockProps( {
		className: 'sgs-mega-menu-editor',
	} );

	const iconElement =
		icon === 'chevron-down' ? chevronDown : chevronRight;

	const isFlyout = layoutVariant === 'flyout';

	return (
		<>
			<InspectorControls>

				{/* ── Menu Item ──────────────────────────────────────── */}
				<PanelBody
					title={ __( 'Menu Item', 'sgs-blocks' ) }
				>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ url || '' }
						onChange={ ( val ) => setAttributes( { url: val } ) }
						type="url"
						help={ __(
							'Optional — makes the trigger itself a link.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Open in new tab', 'sgs-blocks' ) }
						checked={ opensInNewTab }
						onChange={ ( val ) =>
							setAttributes( { opensInNewTab: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Highlight item', 'sgs-blocks' ) }
						checked={ highlight }
						onChange={ ( val ) =>
							setAttributes( { highlight: val } )
						}
						help={ __(
							'Renders the label in the accent colour.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── Panel Content ──────────────────────────────────── */}
				<PanelBody
					title={ __( 'Panel Content', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Template Part', 'sgs-blocks' ) }
						value={ menuTemplatePart }
						options={ [
							{
								label: __(
									'— Select template part —',
									'sgs-blocks'
								),
								value: '',
							},
							...templateParts,
						] }
						onChange={ ( val ) =>
							setAttributes( { menuTemplatePart: val } )
						}
						help={ __(
							'Choose a mega-menu template part from the Site Editor.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ ! templateParts.length && (
						<Notice isDismissible={ false } status="info">
							{ __(
								'No mega-menu template parts found. Create one in Appearance → Editor → Patterns → Template Parts and set its area to "mega-menu".',
								'sgs-blocks'
							) }
						</Notice>
					) }
				</PanelBody>

				{/* ── Panel Layout ───────────────────────────────────── */}
				<PanelBody
					title={ __( 'Panel Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Layout variant', 'sgs-blocks' ) }
						value={ layoutVariant }
						options={ LAYOUT_VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { layoutVariant: val } )
						}
						help={ __(
							'Controls how the dropdown panel appears.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>

					{ ! isFlyout && (
						<SelectControl
							label={ __( 'Panel alignment', 'sgs-blocks' ) }
							value={ panelAlignment }
							options={ PANEL_ALIGNMENT_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { panelAlignment: val } )
							}
							__nextHasNoMarginBottom
						/>
					) }

					<SelectControl
						label={ __( 'Open on', 'sgs-blocks' ) }
						value={ openOn }
						options={ OPEN_ON_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { openOn: val } )
						}
						help={ __(
							'Mobile always uses tap regardless of this setting.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── Animation ──────────────────────────────────────── */}
				<PanelBody
					title={ __( 'Animation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Opening animation', 'sgs-blocks' ) }
						value={ openAnimation }
						options={ OPEN_ANIMATION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { openAnimation: val } )
						}
						__nextHasNoMarginBottom
					/>

					{ openOn === 'hover' && (
						<RangeControl
							label={ __(
								'Close delay on mouse-out (ms)',
								'sgs-blocks'
							) }
							value={ closeDelay }
							onChange={ ( val ) =>
								setAttributes( { closeDelay: val } )
							}
							min={ 0 }
							max={ 1000 }
							step={ 50 }
							help={ __(
								'Milliseconds to wait before closing after the cursor leaves. Prevents accidental closure.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{/* ── Icon & Badge ───────────────────────────────────── */}
				<PanelBody
					title={ __( 'Icon & Badge', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Icon position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { iconPosition: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Badge text', 'sgs-blocks' ) }
						value={ badge || '' }
						onChange={ ( val ) =>
							setAttributes( { badge: val } )
						}
						help={ __(
							'Short text badge e.g. "New" or "Sale".',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ badge && (
						<DesignTokenPicker
							label={ __( 'Badge colour', 'sgs-blocks' ) }
							value={ badgeColour }
							onChange={ ( val ) =>
								setAttributes( { badgeColour: val } )
							}
						/>
					) }
				</PanelBody>

			</InspectorControls>

			{/* ── Editor preview ──────────────────────────────────────── */}
			<div { ...blockProps }>
				{ iconPosition === 'before' && (
					<Icon icon={ iconElement } size={ 16 } />
				) }
				<RichText
					tagName="span"
					className="sgs-mega-menu__label"
					value={ label }
					onChange={ ( val ) => setAttributes( { label: val } ) }
					placeholder={ __( 'Menu item…', 'sgs-blocks' ) }
					withoutInteractiveFormatting
					allowedFormats={ [] }
				/>
				{ iconPosition === 'after' && (
					<Icon icon={ iconElement } size={ 16 } />
				) }
				{ badge && (
					<span className="sgs-mega-menu__badge">{ badge }</span>
				) }
				{ menuTemplatePart ? (
					<p className="sgs-mega-menu__preview-note">
						{ __(
							'Mega-menu panel will render on the frontend.',
							'sgs-blocks'
						) }
					</p>
				) : (
					<p className="sgs-mega-menu__preview-note sgs-mega-menu__preview-note--empty">
						{ __(
							'← Select a template part in the sidebar.',
							'sgs-blocks'
						) }
					</p>
				) }
			</div>
		</>
	);
}
