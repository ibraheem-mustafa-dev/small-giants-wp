/**
 * ShapeField: one grid, labelled Shape, drawing the client's own photo in each shape (Spec 49 §9.2, §7.5).
 *
 * None, Circle, Ellipse and Pill are drawn with `border-radius`; every other entry of `icon-shapes.json` that lists
 * the `media` surface (or lists none) is a mask. Picking a shape that carries a ratio (Circle: 1:1) writes that
 * Ratio at the same device in the same `setAttributes` call when no Ratio resolves there, so it is one undo step.
 * Per device through `ResponsiveOverride`; an embed offers Circle, Ellipse and Pill only.
 *
 * @package
 */
import { __, sprintf } from '@wordpress/i18n';
import ResponsiveOverride from '../ResponsiveOverride.js';
import Chips from './Chips.js';
import registry from '../../../includes/data/icon-shapes.json';
import { slotAccess, slotKind } from './fieldBase.js';
import { deviceName, isUnset, resolveTierSource, useActiveDevice, writeDevice } from './deviceValues.js';
import { FILL, NATURAL } from './sizing-model.js';
import './ShapeField.css';

/** Shapes drawn as a border radius: no helper, ordinary borders and shadows. */
export const RADIUS_SHAPES = [
	{ slug: 'circle', label: __( 'Circle', 'sgs-blocks' ), ratio: '1 / 1', radius: '50%' },
	{ slug: 'ellipse', label: __( 'Ellipse', 'sgs-blocks' ), ratio: '', radius: '50%' },
	{ slug: 'pill', label: __( 'Pill', 'sgs-blocks' ), ratio: '', radius: '9999px' },
];

/**
 * The mask shapes the media slot offers, from the shared registry.
 *
 * @param {Array} [entries] Registry entries (`{ slug, label, d, proportions, ratio, surfaces }`).
 * @return {Array} Mask entries that show on the `media` surface, in registry order.
 */
export function maskShapes( entries = registry?.shapes ) {
	return ( Array.isArray( entries ) ? entries : [] ).filter(
		( entry ) =>
			'string' === typeof entry?.slug &&
			'string' === typeof entry?.d &&
			entry.d &&
			( ! Array.isArray( entry.surfaces ) || entry.surfaces.includes( 'media' ) )
	);
}

/** A CSS `mask-image` value drawing the entry's path in its 100 by 100 box. */
function maskUrl( d ) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${ d }"/></svg>`;
	return `url("data:image/svg+xml,${ encodeURIComponent( svg ) }")`;
}

/** Whether the box resolves to something other than a square at a device, by ratio or two same-unit lengths. */
function resolvesNonSquare( read, device ) {
	const pick = ( base ) => resolveTierSource( read( base ), device ).value || '';
	const ratio = pick( 'Ratio' );
	if ( ratio && NATURAL !== ratio && FILL !== pick( 'Height' ) ) {
		const [ w, h ] = ratio.split( '/' ).map( ( n ) => parseFloat( n ) );
		return !! w && !! h && w !== h;
	}
	const width = String( pick( 'Width' ) );
	const height = String( pick( 'Height' ) );
	const unit = ( v ) => v.replace( /^[\d.]+/, '' );
	return /^[\d.]+[a-z%]+$/.test( width ) && /^[\d.]+[a-z%]+$/.test( height ) && unit( width ) === unit( height ) && parseFloat( width ) !== parseFloat( height );
}

export default function ShapeField( { attributes, setAttributes, prefix, slot } ) {
	const access = slotAccess( attributes, setAttributes, prefix );
	const device = useActiveDevice();
	const kind = slotKind( slot, access );
	const photo = resolveTierSource( access.read( 'Source' ), device, ( s ) => !! s?.url ).value?.url || '';
	const masks = 'embed' === kind ? [] : maskShapes();
	const entries = [ ...RADIUS_SHAPES, ...masks.map( ( m ) => ( { ...m, mask: m.d } ) ) ];

	const options = [
		{ value: 'none', label: __( 'None', 'sgs-blocks' ), icon: <span className="sgs-shape-tile" style={ photo ? { '--sgs-shape-photo': `url("${ photo }")` } : undefined } /> },
		...entries.map( ( entry ) => ( {
			value: entry.slug,
			label: entry.label,
			icon: (
				<span
					className={ `sgs-shape-tile${ entry.mask ? ' is-mask' : '' }` }
					style={ {
						...( photo ? { '--sgs-shape-photo': `url("${ photo }")` } : {} ),
						...( entry.mask ? { '--sgs-shape-mask': maskUrl( entry.d ) } : { '--sgs-shape-radius': entry.radius } ),
					} }
				/>
			),
		} ) ),
	];

	const choose = ( slug, current ) => {
		const stored = access.read( 'Shape' );
		const parent = { tablet: 'desktop', mobile: 'tablet' }[ device ];
		const wider = parent
			? resolveTierSource( stored, parent, ( v ) => ! isUnset( v ) && 'none' !== v?.shape )
			: { from: null };
		let next;
		if ( 'none' === slug ) {
			next = wider.from ? { shape: 'none' } : '';
		} else {
			const entry = entries.find( ( e ) => e.slug === slug );
			next = { shape: slug };
			if ( entry?.mask ) {
				next.proportions = current?.shape === slug && current.proportions ? current.proportions : entry.proportions || 'stretch';
			}
		}
		const patch = { Shape: writeDevice( stored, device, next ) };
		const entry = entries.find( ( e ) => e.slug === slug );
		const ratioNow = resolveTierSource( access.read( 'Ratio' ), device ).value;
		if ( entry?.ratio && ! ratioNow ) {
			patch.Ratio = writeDevice( access.read( 'Ratio' ), device, entry.ratio );
		}
		access.write( patch );
	};

	const showSquareNote = ( shape ) => 'circle' === shape && resolvesNonSquare( access.read, device );

	return (
		<ResponsiveOverride
			label={ __( 'Shape', 'sgs-blocks' ) }
			value={ access.read( 'Shape' ) }
			onChange={ ( next ) => access.write( { Shape: next } ) }
		>
			{ ( { tier, ownValue, effectiveValue } ) => {
				const current = ownValue || effectiveValue || null;
				const slug = current?.shape || 'none';
				const entry = entries.find( ( e ) => e.slug === slug );
				return (
					<>
						<Chips
							label={ sprintf( /* translators: %s: device name. */ __( 'Shape on %s', 'sgs-blocks' ), deviceName( tier ) ) }
							options={ options }
							value={ slug }
							onChange={ ( value ) => choose( value, current ) }
						/>
						{ entry?.mask && (
							<label className="sgs-shape-keep">
								<input
									type="checkbox"
									checked={ 'keep' === current.proportions }
									onChange={ ( e ) =>
										access.write( {
											Shape: writeDevice( access.read( 'Shape' ), device, { ...current, proportions: e.target.checked ? 'keep' : 'stretch' } ),
										} )
									}
								/>
								{ __( 'Keep proportions', 'sgs-blocks' ) }
							</label>
						) }
						{ showSquareNote( slug ) && (
							<div className="sgs-shape-note" role="status">
								<p>{ __( 'This is an oval because the photo area is not square.', 'sgs-blocks' ) }</p>
								<button
									type="button"
									className="sgs-media-length__keyword"
									onClick={ () => access.write( { Ratio: writeDevice( access.read( 'Ratio' ), device, '1 / 1' ) } ) }
								>
									{ __( 'Make it square (1:1)', 'sgs-blocks' ) }
								</button>
							</div>
						) }
					</>
				);
			} }
		</ResponsiveOverride>
	);
}
