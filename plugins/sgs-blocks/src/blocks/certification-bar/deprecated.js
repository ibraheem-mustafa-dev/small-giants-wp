/**
 * Certification Bar block — deprecations.
 *
 * v2: Captures the static save output (badge images + labels) before the block
 *     was converted to server-side rendering via render.php.
 * v1: Pre-static-save era — empty innerHTML, migrates old `certifications` string
 *     array to the current `items` object array.
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

// v2 — static save function that existed before render.php conversion.
const v2 = {
	attributes: {
		title: {
			type:     'string',
			source:   'html',
			selector: '.sgs-certification-bar__title',
		},
		items:          { type: 'array', default: [] },
		badgeStyle:     { type: 'string', default: 'text-only' },
		badgeSize:      { type: 'string', default: 'medium' },
		titleColour:    { type: 'string' },
		titleFontSize:  { type: 'string' },
		labelColour:    { type: 'string' },
		labelFontSize:  { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
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
			color:    colourVar( titleColour ) || undefined,
			fontSize: fontSizeVar( titleFontSize ) || undefined,
		};

		const labelStyle = {
			color:    colourVar( labelColour ) || undefined,
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
						<span className="sgs-certification-bar__badge-label" style={ labelStyle }>
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
	migrate( attributes ) {
		return attributes;
	},
};

// v1 — block inserted with empty innerHTML before static save existed.
// Also migrates old `certifications` string array → current `items` object array.
const v1 = {
	attributes: {
		certifications: { type: 'array', default: [] },
		title: {
			type:     'string',
			source:   'html',
			selector: '.sgs-certification-bar__title',
		},
		items:         { type: 'array', default: [] },
		badgeStyle:    { type: 'string', default: 'text-only' },
		badgeSize:     { type: 'string', default: 'medium' },
		titleColour:   { type: 'string' },
		titleFontSize: { type: 'string' },
		labelColour:   { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save() {
		return null;
	},
	migrate( { certifications, ...rest } ) {
		const items = ( certifications || [] ).map( ( cert ) => ( {
			label: cert,
			url:   '',
			image: null,
		} ) );
		return { ...rest, items };
	},
};

export default [ v2, v1 ];
