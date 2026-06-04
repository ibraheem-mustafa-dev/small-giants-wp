/**
 * SGS Content Collection — block editor component.
 *
 * Fully dynamic block: save returns null, all output comes from render.php.
 * The editor shows a <ServerSideRender> live preview so operators see the
 * real query result as they adjust inspector controls.
 *
 * Inspector controls (FR-24-4 / FR-24-5):
 *   - Content type  — SelectControl (sgs_product default; extensible)
 *   - Selection rule — SelectControl (newest / featured / most-expensive /
 *                      cheapest / most-popular / handpicked / category)
 *   - Count         — RangeControl (1–24, default 12)
 *   - Columns       — RangeControl (1–6, default 3)
 *   - Empty message — TextControl
 *   - Handpicked IDs — ComboboxControl (multi, shown only when rule = handpicked)
 *   - Category term  — SelectControl (shown only when rule = category)
 *
 * Sub-panels extracted to ./components/ for file-length compliance (B3).
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	Spinner,
	Notice,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import HandpickedPanel from './components/handpicked-panel';
import CategoryPanel from './components/category-panel';

/** Maximum result count enforced server-side (performance budget). */
const MAX_COUNT = 24;

/** Available selection rules. */
const SELECTION_RULE_OPTIONS = [
	{ value: 'newest', label: __( 'Newest', 'sgs-blocks' ) },
	{ value: 'featured', label: __( 'Featured / Starred', 'sgs-blocks' ) },
	{
		value: 'most-expensive',
		label: __( 'Most expensive (price ↓)', 'sgs-blocks' ),
	},
	{
		value: 'cheapest',
		label: __( 'Cheapest (price ↑)', 'sgs-blocks' ),
	},
	{
		value: 'most-popular',
		label: __( 'Most popular (views ↓)', 'sgs-blocks' ),
	},
	{ value: 'handpicked', label: __( 'Hand-picked', 'sgs-blocks' ) },
	{
		value: 'category',
		label: __( 'By category', 'sgs-blocks' ),
	},
];

/**
 * Main Edit component.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		contentType,
		selectionRule,
		count,
		columns,
		emptyMessage,
		handpickedIds,
		categoryTerm,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-content-collection-editor',
	} );

	return (
		<>
			<InspectorControls>
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" />
				{ /* ── Query settings ─────────────────────────────── */ }
				<PanelBody
					title={ __( 'Query settings', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Content type', 'sgs-blocks' ) }
						help={ __(
							'The post type to query. Default: SGS Products.',
							'sgs-blocks'
						) }
						value={ contentType }
						options={ [
							{
								value: 'sgs_product',
								label: __( 'Products (sgs_product)', 'sgs-blocks' ),
							},
						] }
						onChange={ ( v ) => setAttributes( { contentType: v } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Selection rule', 'sgs-blocks' ) }
						help={ __(
							'How items are chosen and ordered.',
							'sgs-blocks'
						) }
						value={ selectionRule }
						options={ SELECTION_RULE_OPTIONS }
						onChange={ ( v ) =>
							setAttributes( { selectionRule: v } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Number of items', 'sgs-blocks' ) }
						help={ __( 'Maximum 24 items (server-side cap).', 'sgs-blocks' ) }
						value={ count }
						min={ 1 }
						max={ MAX_COUNT }
						onChange={ ( v ) => setAttributes( { count: v } ) }
						__nextHasNoMarginBottom
					/>

					{ /* Handpicked: only shown when rule = handpicked */ }
					{ 'handpicked' === selectionRule && (
						<HandpickedPanel
							contentType={ contentType }
							handpickedIds={ handpickedIds }
							setAttributes={ setAttributes }
						/>
					) }

					{ /* Category: only shown when rule = category */ }
					{ 'category' === selectionRule && (
						<CategoryPanel
							contentType={ contentType }
							categoryTerm={ categoryTerm }
							setAttributes={ setAttributes }
						/>
					) }
				</PanelBody>

				{ /* ── Display settings ────────────────────────────── */ }
				<PanelBody
					title={ __( 'Display settings', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<RangeControl
						label={ __( 'Columns (desktop)', 'sgs-blocks' ) }
						help={ __(
							'Number of columns at desktop width (≥1024px). Mobile always shows 1 column; tablet shows 2.',
							'sgs-blocks'
						) }
						value={ columns }
						min={ 1 }
						max={ 6 }
						onChange={ ( v ) => setAttributes( { columns: v } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Empty state message', 'sgs-blocks' ) }
						help={ __(
							'Shown when no items match the query — never a blank region (FR-24-6).',
							'sgs-blocks'
						) }
						value={ emptyMessage }
						onChange={ ( v ) =>
							setAttributes( { emptyMessage: v } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /* Live server-side preview */ }
			<div { ...blockProps }>
				<ServerSideRender
					block="sgs/content-collection"
					attributes={ attributes }
					LoadingResponsePlaceholder={ () => (
						<div
							style={ {
								padding: '2rem',
								textAlign: 'center',
							} }
						>
							<Spinner />
							<p style={ { marginTop: 8, color: '#6b7280' } }>
								{ __( 'Loading collection…', 'sgs-blocks' ) }
							</p>
						</div>
					) }
					ErrorResponsePlaceholder={ ( { response } ) => (
						<Notice status="error" isDismissible={ false }>
							{ __(
								'Collection preview unavailable.',
								'sgs-blocks'
							) }
						</Notice>
					) }
				/>
			</div>
		</>
	);
}
