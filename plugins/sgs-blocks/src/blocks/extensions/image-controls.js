/**
 * Universal Image Controls extension.
 *
 * Adds focal-point object-position, object-fit, maxWidth, and per-breakpoint
 * height controls to any block that declares `supports.sgs.imageControls: true`
 * in its block.json.
 *
 * Class and CSS custom property injection is handled server-side by
 * includes/image-controls.php via the render_block filter. PHP-side injection
 * is the correct path for both static and dynamic blocks — it avoids baking
 * classes into save() output which would cause block validation failures.
 *
 * T3.5 (Spec 35) note on image-size selection: this extension only injects
 * CSS custom properties + a utility class via the render_block filter — it
 * has no reliable access to an attachment ID (different opted-in blocks store
 * their media reference under different attribute names, e.g. sgs/media's
 * `imageId` vs sgs/gallery's per-item `mediaItems[].id`). An image-size
 * dropdown that calls `wp_get_attachment_image_src( $id, $size )` cannot be
 * built universally here — it is a per-block pattern (each block already
 * resolving its own attachment ID is best placed to add its own size
 * control). Not built in this extension; see T3.5 report.
 *
 * @package
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { getBlockType } from '@wordpress/blocks';
import { FocalPointPicker, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Return true if the given block supports image controls.
 *
 * @param {string|Object} blockNameOrSettings Block name string or settings object.
 * @return {boolean}
 */
function supportsImageControls( blockNameOrSettings ) {
	// Called from addFilter('blocks.registerBlockType') — receives settings object.
	if ( blockNameOrSettings && typeof blockNameOrSettings === 'object' ) {
		return !! blockNameOrSettings?.supports?.sgs?.imageControls;
	}
	// Called from editor HOC — receives name string.
	const type = getBlockType( blockNameOrSettings );
	return !! type?.supports?.sgs?.imageControls;
}

const HEIGHT_UNIT_OPTIONS = [
	{ label: __( 'px', 'sgs-blocks' ), value: 'px' },
	{ label: __( 'vh', 'sgs-blocks' ), value: 'vh' },
	{ label: __( 'em', 'sgs-blocks' ), value: 'em' },
	{ label: __( '%', 'sgs-blocks' ), value: '%' },
];

const OBJECT_FIT_OPTIONS = [
	{ label: __( 'Inherit (no override)', 'sgs-blocks' ), value: '' },
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Fill', 'sgs-blocks' ), value: 'fill' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Scale down', 'sgs-blocks' ), value: 'scale-down' },
];

/**
 * Inject image-control attributes into opted-in blocks.
 */
addFilter(
	'blocks.registerBlockType',
	'sgs/image-controls/attributes',
	( settings ) => {
		if ( ! supportsImageControls( settings ) ) {
			return settings;
		}

		return {
			...settings,
			attributes: {
				...settings.attributes,
				// Focal point as { x, y } floats 0-1 (FocalPointPicker's native
				// shape) — resolved server-side to an object-position percentage
				// pair. CLEAN RESHAPE (T3.5, Spec 35 Part G): this attribute was a
				// free-text CSS string (e.g. "center 20%") pre-T3.5; no seeded
				// pattern/site content carried a value (verified via grep across
				// theme/sgs-theme/patterns + sites/ — zero matches), so no runtime
				// migration is needed. Default {} = no override (inherit CSS default).
				sgsObjectPosition: { type: 'object', default: {} },
				// object-fit override — '' = no override (block/CSS default wins).
				sgsObjectFit: { type: 'string', default: '' },
				// CSS max-width value, e.g. "640px" or "100%".
				sgsMaxWidth: { type: 'string', default: '' },
				// Per-breakpoint height (0 = auto).
				sgsHeightDesktop: { type: 'number', default: 0 },
				sgsHeightTablet: { type: 'number', default: 0 },
				sgsHeightMobile: { type: 'number', default: 0 },
				// Unit applied to all three height values.
				sgsHeightUnit: { type: 'string', default: 'px' },
			},
		};
	}
);

/**
 * Add Image Controls panel to the block inspector for opted-in blocks.
 */
const withImageControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, name } = props;

		if ( ! supportsImageControls( name ) ) {
			return <BlockEdit { ...props } />;
		}

		const {
			sgsObjectPosition,
			sgsObjectFit,
			sgsMaxWidth,
			sgsHeightDesktop,
			sgsHeightTablet,
			sgsHeightMobile,
			sgsHeightUnit,
		} = attributes;

		// Heuristic image-url lookup for the FocalPointPicker preview. The
		// extension has no per-block schema knowledge of which attribute holds
		// the image URL (sgs/media uses `imageUrl`, other blocks vary) — this
		// tries the common names opted-in blocks use and falls back to no
		// preview image (the picker still works as an x/y control, just
		// without a background thumbnail).
		const focalPointUrl =
			attributes.imageUrl ||
			attributes.mediaUrl ||
			attributes.url ||
			attributes.backgroundImage ||
			attributes.src ||
			'';

		const focalPointValue = {
			x:
				typeof sgsObjectPosition?.x === 'number'
					? sgsObjectPosition.x
					: 0.5,
			y:
				typeof sgsObjectPosition?.y === 'number'
					? sgsObjectPosition.y
					: 0.5,
		};

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'Image Controls', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<FocalPointPicker
							label={ __( 'Object position', 'sgs-blocks' ) }
							help={ __(
								'Drag the crosshair to control which part of the image stays visible when it is cropped.',
								'sgs-blocks'
							) }
							url={ focalPointUrl }
							value={ focalPointValue }
							onChange={ ( val ) =>
								setAttributes( {
									sgsObjectPosition: val || {},
								} )
							}
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Object fit', 'sgs-blocks' ) }
							help={ __(
								'How the image/video fills its box. Inherit leaves the block/CSS default untouched.',
								'sgs-blocks'
							) }
							value={ sgsObjectFit }
							options={ OBJECT_FIT_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { sgsObjectFit: val || '' } )
							}
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Max width', 'sgs-blocks' ) }
							help={ __(
								'Constrain the image width — CSS value like 640px or 80%.',
								'sgs-blocks'
							) }
							value={ sgsMaxWidth }
							onChange={ ( val ) =>
								setAttributes( { sgsMaxWidth: val || '' } )
							}
							placeholder="100%"
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Height unit', 'sgs-blocks' ) }
							help={ __(
								'Applied to all three breakpoint heights below.',
								'sgs-blocks'
							) }
							value={ sgsHeightUnit }
							options={ HEIGHT_UNIT_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Height — desktop', 'sgs-blocks' ) }
							help={ __(
								'0 = auto (natural image height).',
								'sgs-blocks'
							) }
							value={ sgsHeightDesktop }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightDesktop: val ?? 0 } )
							}
							min={ 0 }
							max={ 800 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Height — tablet', 'sgs-blocks' ) }
							help={ __(
								'0 = inherit from desktop.',
								'sgs-blocks'
							) }
							value={ sgsHeightTablet }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightTablet: val ?? 0 } )
							}
							min={ 0 }
							max={ 800 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Height — mobile', 'sgs-blocks' ) }
							help={ __(
								'0 = inherit from desktop.',
								'sgs-blocks'
							) }
							value={ sgsHeightMobile }
							onChange={ ( val ) =>
								setAttributes( { sgsHeightMobile: val ?? 0 } )
							}
							min={ 0 }
							max={ 800 }
							step={ 1 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withImageControls' );

addFilter(
	'editor.BlockEdit',
	'sgs/image-controls/controls',
	withImageControls
);
