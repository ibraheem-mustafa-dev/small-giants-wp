import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * V3 deprecation — pre media-slot migration.
 *
 * Before the migration, each badge item's image lived under `item.image`
 * ({ id, url, alt }). After the migration, MediaPicker writes a unified
 * media object to `item.media` instead. The current save.js reads
 * `item.media?.url || item.image?.url` so legacy posts still render
 * byte-identical HTML — but we keep this deprecation as a safety net so
 * WordPress can validate posts saved against the prior save() exactly.
 */
const v3 = {
	attributes: {
		title: {
			type:     'string',
			source:   'html',
			selector: '.sgs-certification-bar__title',
		},
		items: {
			type:    'array',
			default: [],
		},
		badgeStyle:    { type: 'string', default: 'text-only' },
		badgeSize:     { type: 'string', default: 'medium' },
		titleColour:   { type: 'string', default: 'text' },
		titleFontSize: { type: 'string' },
		labelColour:   { type: 'string', default: 'text-muted' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align:  [ 'wide', 'full' ],
		anchor: true,
		html:   false,
		color:  { background: true, text: true },
		typography: {
			fontSize:   true,
			lineHeight: true,
			textAlign:  true,
		},
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save( { attributes } ) {
		const {
			title,
			items,
			badgeStyle,
			badgeSize,
			titleColour,
			titleFontSize,
			labelColour,
			labelFontSize,
		} = attributes;

		const className = [
			'sgs-certification-bar',
			`sgs-certification-bar--${ badgeStyle }`,
			`sgs-certification-bar--${ badgeSize }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const titleStyle = {
			color:    colourVar( titleColour )     || undefined,
			fontSize: fontSizeVar( titleFontSize ) || undefined,
		};

		const labelStyle = {
			color:    colourVar( labelColour )     || undefined,
			fontSize: fontSizeVar( labelFontSize ) || undefined,
		};

		const renderBadge = ( item, i ) => {
			const badgeContent = (
				<>
					{ badgeStyle !== 'text-only' && item.image?.url && (
						<img
							src={ item.image.url }
							alt={ item.label || '' }
							className="sgs-certification-bar__badge-img"
							loading="lazy"
						/>
					) }
					{ badgeStyle !== 'image-only' && item.label && (
						<span
							className="sgs-certification-bar__badge-label"
							style={ labelStyle }
						>
							{ item.label }
						</span>
					) }
				</>
			);

			if ( item.url ) {
				return (
					<a
						key={ i }
						href={ item.url }
						className="sgs-certification-bar__badge"
						target="_blank"
						rel="noopener noreferrer"
					>
						{ badgeContent }
					</a>
				);
			}

			return (
				<div key={ i } className="sgs-certification-bar__badge">
					{ badgeContent }
				</div>
			);
		};

		return (
			<div { ...blockProps }>
				{ title && (
					<RichText.Content
						tagName="p"
						className="sgs-certification-bar__title"
						value={ title }
						style={ titleStyle }
					/>
				) }

				{ items.length > 0 && (
					<div className="sgs-certification-bar__badges">
						{ items.map( ( item, i ) => renderBadge( item, i ) ) }
					</div>
				) }
			</div>
		);
	},
	migrate( attrs ) {
		// Legacy `image` keys are read by the new save() as a fallback,
		// so no destructive transform is required. We optionally lift any
		// existing `item.image` into `item.media` (image type) so editors
		// see the unified shape the next time the block opens.
		const next = { ...attrs };
		if ( Array.isArray( attrs.items ) ) {
			next.items = attrs.items.map( ( item ) => {
				if ( item && item.image && item.image.url && ! item.media ) {
					return {
						...item,
						media: {
							url:  item.image.url,
							type: 'image',
							id:   item.image.id || 0,
							alt:  item.image.alt || item.label || '',
							mime: '',
						},
					};
				}
				return item;
			} );
		}
		return next;
	},
};

/**
 * V2 deprecation — pre Wave 1 (colour defaults).
 *
 * Wave 1 added `default: "text"` to `titleColour` and `default: "text-muted"`
 * to `labelColour` in block.json. The updated save.js now always emits inline
 * colour styles on the title <p> and badge label <span> (via colourVar()).
 *
 * Posts saved before Wave 1 have no inline colour styles on those elements.
 * This entry reproduces the pre-Wave-1 save shape so WordPress can validate
 * and migrate them. No migrate() needed — existing attributes carry over as-is.
 */
const v2 = {
	attributes: {
		title: {
			type:     'string',
			source:   'html',
			selector: '.sgs-certification-bar__title',
		},
		items: {
			type:    'array',
			default: [],
		},
		badgeStyle: {
			type:    'string',
			default: 'text-only',
		},
		badgeSize: {
			type:    'string',
			default: 'medium',
		},
		// No default — matches pre-Wave-1 block.json state.
		// colourVar(undefined) is falsy, so no inline colour style is emitted.
		titleColour:   { type: 'string' },
		titleFontSize: { type: 'string' },
		labelColour:   { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align:  [ 'wide', 'full' ],
		anchor: true,
		html:   false,
		color:  { background: true, text: true },
		typography: {
			fontSize:   true,
			lineHeight: true,
			textAlign:  true,
		},
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save( { attributes } ) {
		const {
			title,
			items,
			badgeStyle,
			badgeSize,
			titleColour,
			titleFontSize,
			labelColour,
			labelFontSize,
		} = attributes;

		const className = [
			'sgs-certification-bar',
			`sgs-certification-bar--${ badgeStyle }`,
			`sgs-certification-bar--${ badgeSize }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		// Without defaults, colourVar() returns falsy when the attribute was
		// never set — reproducing the stored HTML which has no inline colour styles.
		const titleStyle = {
			color:    colourVar( titleColour )     || undefined,
			fontSize: fontSizeVar( titleFontSize ) || undefined,
		};

		const labelStyle = {
			color:    colourVar( labelColour )     || undefined,
			fontSize: fontSizeVar( labelFontSize ) || undefined,
		};

		const renderBadge = ( item, i ) => {
			const badgeContent = (
				<>
					{ badgeStyle !== 'text-only' && item.image?.url && (
						<img
							src={ item.image.url }
							alt={ item.label || '' }
							className="sgs-certification-bar__badge-img"
							loading="lazy"
						/>
					) }
					{ badgeStyle !== 'image-only' && item.label && (
						<span
							className="sgs-certification-bar__badge-label"
							style={ labelStyle }
						>
							{ item.label }
						</span>
					) }
				</>
			);

			if ( item.url ) {
				return (
					<a
						key={ i }
						href={ item.url }
						className="sgs-certification-bar__badge"
						target="_blank"
						rel="noopener noreferrer"
					>
						{ badgeContent }
					</a>
				);
			}

			return (
				<div key={ i } className="sgs-certification-bar__badge">
					{ badgeContent }
				</div>
			);
		};

		return (
			<div { ...blockProps }>
				{ title && (
					<RichText.Content
						tagName="p"
						className="sgs-certification-bar__title"
						value={ title }
						style={ titleStyle }
					/>
				) }

				{ items.length > 0 && (
					<div className="sgs-certification-bar__badges">
						{ items.map( ( item, i ) => renderBadge( item, i ) ) }
					</div>
				) }
			</div>
		);
	},
};

/**
 * V1 deprecation: originally stored certifications as a flat string array
 * under the `certifications` attribute key. Stored innerHTML is empty.
 * The migrate() function converts the old string array to the current
 * `items` object array format expected by save.js.
 */
const v1 = {
	attributes: {
		// Old attribute — flat string array.
		certifications: { type: 'array', default: [] },
		// Current attributes (also present so WordPress can round-trip them).
		title: {
			type: 'string',
			source: 'html',
			selector: '.sgs-certification-bar__title',
		},
		items: { type: 'array', default: [] },
		badgeStyle: { type: 'string', default: 'text-only' },
		badgeSize: { type: 'string', default: 'medium' },
		titleColour: { type: 'string' },
		titleFontSize: { type: 'string' },
		labelColour: { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save() {
		return null;
	},
	migrate( { certifications, ...rest } ) {
		const items = ( certifications || [] ).map( ( cert ) => ( {
			label: cert,
			url: '',
			image: null,
		} ) );
		return { ...rest, items };
	},
};

export default [ v3, v2, v1 ];
