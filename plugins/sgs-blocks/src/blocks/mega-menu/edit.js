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
	Icon,
} from '@wordpress/components';
import { chevronDown, chevronRight } from '@wordpress/icons';
import { useSelect } from '@wordpress/data';
import { DesignTokenPicker } from '../../components';

const PANEL_WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Content width', 'sgs-blocks' ), value: 'content' },
	{ label: __( 'Custom width', 'sgs-blocks' ), value: 'custom' },
];

const PANEL_ALIGNMENT_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const OPEN_ON_OPTIONS = [
	{ label: __( 'Hover', 'sgs-blocks' ), value: 'hover' },
	{ label: __( 'Click', 'sgs-blocks' ), value: 'click' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Before', 'sgs-blocks' ), value: 'before' },
	{ label: __( 'After', 'sgs-blocks' ), value: 'after' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		label,
		url,
		opensInNewTab,
		menuTemplatePart,
		panelWidth,
		panelMaxWidth,
		panelAlignment,
		openOn,
		icon,
		iconPosition,
		highlight,
		badge,
		badgeColour,
	} = attributes;

	// Fetch available template parts with area='mega-menu'.
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

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Menu Item Settings', 'sgs-blocks' ) }
				>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ url || '' }
						onChange={ ( val ) => setAttributes( { url: val } ) }
						type="url"
						help={ __(
							'Optional: make the menu item itself a link.',
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
						label={ __( 'Highlight', 'sgs-blocks' ) }
						checked={ highlight }
						onChange={ ( val ) =>
							setAttributes( { highlight: val } )
						}
						help={ __(
							'Accent colour label for featured items.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

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
							'Choose a mega menu template part from the Site Editor.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ ! templateParts.length && (
						<p className="components-base-control__help">
							{ __(
								'No mega menu template parts found. Create one in the Site Editor (Appearance → Editor → Patterns → Template Parts).',
								'sgs-blocks'
							) }
						</p>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Panel Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Panel width', 'sgs-blocks' ) }
						value={ panelWidth }
						options={ PANEL_WIDTH_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { panelWidth: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ panelWidth === 'custom' && (
						<TextControl
							label={ __( 'Max width', 'sgs-blocks' ) }
							value={ panelMaxWidth }
							onChange={ ( val ) =>
								setAttributes( { panelMaxWidth: val } )
							}
							help={ __(
								'CSS value, e.g., 800px or 60vw',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
					<SelectControl
						label={ __( 'Panel alignment', 'sgs-blocks' ) }
						value={ panelAlignment }
						options={ PANEL_ALIGNMENT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { panelAlignment: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Open on', 'sgs-blocks' ) }
						value={ openOn }
						options={ OPEN_ON_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { openOn: val } )
						}
						help={ __(
							'Mobile always uses click/tap.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

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
							'Optional small badge like "New" or "Sale".',
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
				{ menuTemplatePart && (
					<div className="sgs-mega-menu__preview-note">
						{ __(
							'Mega menu panel content will render on the frontend.',
							'sgs-blocks'
						) }
					</div>
				) }
			</div>
		</>
	);
}
