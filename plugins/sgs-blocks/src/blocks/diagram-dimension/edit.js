/**
 * sgs/diagram-dimension — editor.
 *
 * Draws its own line and label client-side with the geometry twin
 * (src/utils/diagram-geometry.js), so dragging is instant. When selected it
 * shows three handles — line start, line end, label — that follow the pointer
 * as a % of the drawing frame and nudge with the arrow keys (Shift = 5,
 * Alt = 0.1). The orientation lock keeps a horizontal or vertical line
 * straight while either end moves. The inspector's sliders are the keyboard
 * path for every value.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { useRef } from '@wordpress/element';
import { ResponsiveOverride } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { patchTier, resolveTier, usePreviewTier } from '../../utils';
import { dimensionPaths } from '../../utils/diagram-geometry';
import { clampPct, dotRadius, drawingBox, lockedEndpoints } from '../measured-diagram/drawing-box';
import LinePanel from './line-panel';

const round1 = ( n ) => Math.round( n * 10 ) / 10;


export default function Edit( { attributes, setAttributes, context, isSelected } ) {
	const {
		caption,
		value,
		kind,
		endStyle,
		orientation,
		startX,
		startY,
		endX,
		endY,
		extReach,
		extReachEnd,
		extOvershoot,
		labelX,
		labelY,
		labelAlign,
		labelOrder,
		hideWhenEmpty,
	} = attributes;

	const overlayRef = useRef( null );
	const previewTier = usePreviewTier();
	const [ boxW, boxH ] = drawingBox( context[ 'sgs/measuredDiagramWidth' ], context[ 'sgs/measuredDiagramHeight' ] );
	const tickLength = context[ 'sgs/measuredDiagramTickLength' ];
	const { sx, sy, ex, ey } = lockedEndpoints( { startX, startY, endX, endY, orientation } );
	const paths = dimensionPaths(
		{ startX: sx, startY: sy, endX: ex, endY: ey, kind, endStyle, extReach, extReachEnd, extOvershoot, tickLength },
		boxW,
		boxH
	);
	const midX = ( sx + ex ) / 2;
	const midY = ( sy + ey ) / 2;
	const lx = clampPct( resolveTier( labelX, previewTier, midX ).value, midX );
	const ly = clampPct( resolveTier( labelY, previewTier, midY ).value, midY );

	// A bound value resolves on the server; the canvas shows a sample in the
	// binding's own before/after text (e.g. "00 mm").
	const binding = attributes.metadata?.bindings?.value;
	const bindingArgs = binding?.args || {};
	const shownValue = value || ( binding ? `${ bindingArgs.before || '' }00${ bindingArgs.after || '' }` : '' );

	/**
	 * Move one handle to (x, y), % of the frame.
	 *
	 * @param {string} which 'start' | 'end' | 'label'.
	 * @param {number} x     % across.
	 * @param {number} y     % down.
	 */
	const moveHandle = ( which, x, y ) => {
		const nx = round1( clampPct( x, 0 ) );
		const ny = round1( clampPct( y, 0 ) );
		if ( 'label' === which ) {
			patchTier( attributes, setAttributes, 'labelX', previewTier, nx );
			patchTier( attributes, setAttributes, 'labelY', previewTier, ny );
			return;
		}
		if ( 'start' === which ) {
			const next = { startX: nx, startY: ny };
			if ( 'horizontal' === orientation ) {
				next.endY = ny;
			} else if ( 'vertical' === orientation ) {
				next.endX = nx;
			}
			setAttributes( next );
			return;
		}
		if ( 'horizontal' === orientation ) {
			setAttributes( { endX: nx, endY: sy } );
		} else if ( 'vertical' === orientation ) {
			setAttributes( { endX: sx, endY: ny } );
		} else {
			setAttributes( { endX: nx, endY: ny } );
		}
	};

	const startDrag = ( which ) => ( event ) => {
		const frame = overlayRef.current;
		if ( ! frame ) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		const rect = frame.getBoundingClientRect();
		if ( ! rect.width || ! rect.height ) {
			return;
		}
		const view = frame.ownerDocument.defaultView;
		const onMove = ( e ) =>
			moveHandle( which, ( ( e.clientX - rect.left ) / rect.width ) * 100, ( ( e.clientY - rect.top ) / rect.height ) * 100 );
		const onUp = () => {
			view.removeEventListener( 'pointermove', onMove );
			view.removeEventListener( 'pointerup', onUp );
		};
		view.addEventListener( 'pointermove', onMove );
		view.addEventListener( 'pointerup', onUp );
	};

	const nudge = ( which, x, y ) => ( event ) => {
		const steps = { ArrowLeft: [ -1, 0 ], ArrowRight: [ 1, 0 ], ArrowUp: [ 0, -1 ], ArrowDown: [ 0, 1 ] };
		const dir = steps[ event.key ];
		if ( ! dir ) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		let step = 1;
		if ( event.shiftKey ) {
			step = 5;
		} else if ( event.altKey ) {
			step = 0.1;
		}
		moveHandle( which, x + dir[ 0 ] * step, y + dir[ 1 ] * step );
	};

	const handle = ( which, x, y, label ) => (
		<button
			type="button"
			className={ `sgs-diagram-dimension__handle sgs-diagram-dimension__handle--${ which }` }
			style={ { left: `${ x }%`, top: `${ y }%` } }
			aria-label={ label }
			onPointerDown={ startDrag( which ) }
			onKeyDown={ nudge( which, x, y ) }
		/>
	);

	const setOrientation = ( val ) => {
		const next = { orientation: val };
		if ( 'horizontal' === val ) {
			next.endY = sy;
		} else if ( 'vertical' === val ) {
			next.endX = sx;
		}
		setAttributes( next );
	};

	const blockProps = useBlockProps( {
		className: [
			'sgs-diagram-dimension',
			`sgs-diagram-dimension--${ kind || 'dimension' }`,
			`sgs-diagram-dimension--align-${ labelAlign || 'center' }`,
			'valueFirst' === labelOrder ? 'sgs-diagram-dimension--value-first' : 'sgs-diagram-dimension--caption-first',
			false !== hideWhenEmpty ? 'sgs-diagram-dimension--hide-empty' : '',
		]
			.filter( Boolean )
			.join( ' ' ),
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Measurement', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Caption', 'sgs-blocks' ) }
						help={ __( 'What is measured, e.g. "Lens width".', 'sgs-blocks' ) }
						value={ caption || '' }
						onChange={ ( v ) => setAttributes( { caption: v } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Value', 'sgs-blocks' ) }
						help={
							binding
								? __( 'This value is connected to data and fills in on the page. Units come from the connection’s before/after text.', 'sgs-blocks' )
								: __( 'Type the value with its unit, e.g. "52 mm", or connect it to product data.', 'sgs-blocks' )
						}
						value={ value || '' }
						disabled={ !! binding }
						onChange={ ( v ) => setAttributes( { value: v } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Hide when there is no value', 'sgs-blocks' ) }
						help={ __( 'Hides this line and label when a connected value is empty, e.g. a size without that measurement.', 'sgs-blocks' ) }
						checked={ false !== hideWhenEmpty }
						onChange={ ( v ) => setAttributes( { hideWhenEmpty: v } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
				<LinePanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					endpoints={ { sx, sy, ex, ey } }
					onOrientation={ setOrientation }
				/>
				<PanelBody title={ __( 'Label position', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						label={ __( 'Label across (%)', 'sgs-blocks' ) }
						value={ labelX }
						onChange={ ( obj ) => setAttributes( { labelX: obj } ) }
					>
						{ ( { setOwnValue } ) => (
							<RangeControl
								help={ __( 'Unset places the label on the line’s middle.', 'sgs-blocks' ) }
								value={ lx }
								onChange={ ( v ) => setOwnValue( v ) }
								min={ 0 }
								max={ 100 }
								step={ 0.1 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						label={ __( 'Label down (%)', 'sgs-blocks' ) }
						value={ labelY }
						onChange={ ( obj ) => setAttributes( { labelY: obj } ) }
					>
						{ ( { setOwnValue } ) => (
							<RangeControl
								value={ ly }
								onChange={ ( v ) => setOwnValue( v ) }
								min={ 0 }
								max={ 100 }
								step={ 0.1 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					<ToggleGroupControl
						label={ __( 'Label anchor', 'sgs-blocks' ) }
						value={ labelAlign || 'center' }
						onChange={ ( v ) => setAttributes( { labelAlign: v } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="start" label={ __( 'Start', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="center" label={ __( 'Centre', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="end" label={ __( 'End', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					<SelectControl
						label={ __( 'Stacking', 'sgs-blocks' ) }
						help={ __( 'Visual only: screen readers always hear the caption first.', 'sgs-blocks' ) }
						value={ labelOrder || 'captionFirst' }
						options={ [
							{ value: 'captionFirst', label: __( 'Caption on top', 'sgs-blocks' ) },
							{ value: 'valueFirst', label: __( 'Value on top', 'sgs-blocks' ) },
						] }
						onChange={ ( v ) => setAttributes( { labelOrder: v } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<li { ...blockProps }>
				<span className="sgs-diagram-dimension__overlay" ref={ overlayRef }>
					<svg
						className="sgs-diagram-dimension__lines"
						viewBox={ `0 0 ${ boxW } ${ boxH }` }
						preserveAspectRatio="none"
						aria-hidden="true"
						focusable="false"
					>
						{ paths.guides && <path className="sgs-diagram-dimension__guides" d={ paths.guides } /> }
						{ paths.line && <path className="sgs-diagram-dimension__line" d={ paths.line } /> }
						{ paths.ends && <path className="sgs-diagram-dimension__ends" d={ paths.ends } /> }
						{ paths.dots.map( ( dot, i ) => (
							<circle key={ i } className="sgs-diagram-dimension__dot" cx={ dot.cx } cy={ dot.cy } r={ dotRadius( tickLength, boxW ) } />
						) ) }
					</svg>
					<span className="sgs-diagram-dimension__marker" aria-hidden="true" style={ { left: `${ midX }%`, top: `${ midY }%` } } />
					{ isSelected && handle( 'start', sx, sy, __( 'Move line start (arrow keys nudge)', 'sgs-blocks' ) ) }
					{ isSelected && handle( 'end', ex, ey, __( 'Move line end (arrow keys nudge)', 'sgs-blocks' ) ) }
					{ isSelected && handle( 'label', lx, ly, __( 'Move label (arrow keys nudge)', 'sgs-blocks' ) ) }
				</span>
				<span className="sgs-diagram-dimension__number" aria-hidden="true" />
				<span className="sgs-diagram-dimension__label" style={ { left: `${ lx }%`, top: `${ ly }%` } }>
					<span className={ caption ? 'sgs-diagram-dimension__caption' : 'sgs-diagram-dimension__caption is-placeholder' }>
						{ caption || __( 'Caption', 'sgs-blocks' ) }
					</span>{ ' ' }
					<span className={ shownValue ? 'sgs-diagram-dimension__value' : 'sgs-diagram-dimension__value is-placeholder' }>
						{ shownValue || __( 'Value', 'sgs-blocks' ) }
					</span>
				</span>
			</li>
		</>
	);
}
