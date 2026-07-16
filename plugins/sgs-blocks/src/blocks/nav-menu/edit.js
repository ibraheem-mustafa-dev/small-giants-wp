/**
 * SGS Menu (sgs/nav-menu) — editor.
 *
 * The menu is fully server-rendered by render.php (it resolves the wp_navigation
 * menu via SGS_Nav_Menu_Source — the same source the desktop bar reads). The
 * editor uses ServerSideRender for a live preview and exposes the menu source +
 * styling controls in the inspector.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	DesignTokenPicker,
	TypographyControls,
	ResponsiveOverride,
} from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const {
		ref,
		linkColour,
		linkHoverColour,
		linkFontSize,
		showDividers,
		dividerColour,
	} = attributes;

	const { records: menus, isResolving } = useEntityRecords(
		'postType',
		'wp_navigation',
		{
			per_page: -1,
			status: [ 'publish' ],
		}
	);

	const menuOptions = [
		{
			label: __(
				'Inherit from navigation block / site menu',
				'sgs-blocks'
			),
			value: 0,
		},
		...( menus || [] ).map( ( menu ) => ( {
			label:
				menu.title?.rendered || __( '(untitled menu)', 'sgs-blocks' ),
			value: menu.id,
		} ) ),
	];

	const blockProps = useBlockProps();

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Menu source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Menu', 'sgs-blocks' ) }
						value={ ref || 0 }
						options={ menuOptions }
						onChange={ ( val ) =>
							setAttributes( { ref: Number( val ) || undefined } )
						}
						disabled={ isResolving }
						help={ __(
							'Leave on "Inherit" to use the same menu as the navigation block in this drawer. Choose a specific menu to render an independent one. Manage menus in Appearance → Editor → Navigation.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Link colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Link colour', 'sgs-blocks' ) }
						value={ linkColour }
						onChange={ ( val ) =>
							setAttributes( { linkColour: val } )
						}
						linked
					/>
					<DesignTokenPicker
						label={ __( 'Link hover colour', 'sgs-blocks' ) }
						value={ linkHoverColour }
						onChange={ ( val ) =>
							setAttributes( { linkHoverColour: val } )
						}
						linked
					/>
					<p className="sgs-nav-menu__inspector-note">
						{ __(
							'Leave the link colour empty to inherit the surrounding text colour — useful inside a coloured drawer where the readable colour is chosen for you.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>

				<PanelBody
					title={ __( 'Link typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TypographyControls
						prefix="link"
						attributes={ attributes }
						setAttributes={ setAttributes }
						showSize={ false }
					/>
					<ResponsiveOverride
						label={ __( 'Link font size', 'sgs-blocks' ) }
						value={ linkFontSize }
						onChange={ ( obj ) =>
							setAttributes( { linkFontSize: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<UnitControl
								label={ __( 'Link font size', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ ownValue || '' }
								placeholder={
									inherited && effectiveValue
										? String( effectiveValue )
										: ''
								}
								units={ [
									{ value: 'px', label: 'px', default: 16 },
									{ value: 'rem', label: 'rem', default: 1 },
									{ value: 'em', label: 'em', default: 1 },
								] }
								onChange={ ( v ) => setOwnValue( v || '' ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<PanelBody
					title={ __( 'Dividers', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show dividers between items', 'sgs-blocks' ) }
						checked={ !! showDividers }
						onChange={ ( val ) =>
							setAttributes( { showDividers: val } )
						}
						help={ __(
							'A thin line under each menu item. Turn off for a plain list.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ !! showDividers && (
						<DesignTokenPicker
							label={ __( 'Divider colour', 'sgs-blocks' ) }
							value={ dividerColour }
							onChange={ ( val ) =>
								setAttributes( { dividerColour: val } )
							}
							linked
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<ServerSideRender
					block="sgs/nav-menu"
					attributes={ attributes }
				/>
			</div>
		</>
	);
}
