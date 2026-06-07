/**
 * Post Grid block deprecations — newest first.
 *
 * v1 — Gap-consolidation deprecation (2026-06-07).
 *      gap/gapTablet/gapMobile were stored as bare digit strings (e.g. "30")
 *      and render.php appended "px" directly (absint + 'px'). Consolidated
 *      so the shared ContainerWrapperControls SpacingControl owns the Gap
 *      panel and sgs_container_gap_value() resolves the CSS value.
 *      New format: full CSS string e.g. "30px".
 *      migrate() appends "px" to any all-digit gap value so existing posts
 *      continue to render identically (sgs_container_gap_value("30px") → "30px").
 */

/**
 * Normalise a gap attribute value stored as a bare digit string to "Npx".
 *
 * @param {string|number|null|undefined} val Stored gap value.
 * @param {string} fallback                  Fallback string when val is empty.
 * @return {string} Normalised CSS gap string.
 */
function normGap( val, fallback ) {
	if ( null == val || '' === val ) {
		return fallback;
	}
	const str = String( val );
	// Bare digits only → append px so sgs_container_gap_value treats it as raw CSS.
	if ( /^\d+$/.test( str ) ) {
		return str + 'px';
	}
	// Already has a unit (e.g. "30px", "1rem") — leave as-is.
	return str;
}

const v1 = {
	isEligible( attributes ) {
		// Only trigger migration for posts storing gap as a bare digit string
		// (the old format). Already-migrated values like "30px" skip this.
		return /^\d+$/.test( String( attributes.gap ?? '' ) );
	},
	attributes: {
		postType:             { type: 'string',  default: 'post' },
		postsPerPage:         { type: 'number',  default: 6 },
		orderBy:              { type: 'string',  default: 'date' },
		order:                { type: 'string',  default: 'desc' },
		categories:           { type: 'array',   default: [] },
		tags:                 { type: 'array',   default: [] },
		excludeCurrent:       { type: 'boolean', default: true },
		offset:               { type: 'number',  default: 0 },
		layout:               { type: 'string',  default: 'grid' },
		cardStyle:            { type: 'string',  default: 'card' },
		columns:              { type: 'number',  default: 3 },
		columnsTablet:        { type: 'number',  default: 2 },
		columnsMobile:        { type: 'number',  default: 1 },
		gap:                  { type: 'string',  default: '30' },
		gapTablet:            { type: 'string',  default: '' },
		gapMobile:            { type: 'string',  default: '' },
		aspectRatio:          { type: 'string',  default: '16/10' },
		imageSize:            { type: 'string',  default: 'medium_large' },
		showImage:            { type: 'boolean', default: true },
		showTitle:            { type: 'boolean', default: true },
		showExcerpt:          { type: 'boolean', default: true },
		excerptLength:        { type: 'number',  default: 20 },
		showDate:             { type: 'boolean', default: true },
		showAuthor:           { type: 'boolean', default: false },
		showCategory:         { type: 'boolean', default: true },
		showReadMore:         { type: 'boolean', default: true },
		readMoreText:         { type: 'string',  default: 'Read more' },
		pagination:           { type: 'string',  default: 'none' },
		showFilters:          { type: 'boolean', default: false },
		filterTaxonomy:       { type: 'string',  default: 'category' },
		titleColour:          { type: 'string',  default: 'primary' },
		excerptColour:        { type: 'string',  default: 'text' },
		metaColour:           { type: 'string',  default: 'text-muted' },
		categoryBadgeColour:  { type: 'string',  default: 'text-inverse' },
		categoryBadgeBgColour: { type: 'string', default: 'primary' },
		readMoreColour:       { type: 'string',  default: 'primary' },
		cardBgColour:         { type: 'string',  default: 'surface' },
		hoverScale:           { type: 'string',  default: '' },
		hoverShadow:          { type: 'string',  default: '' },
		hoverImageZoom:       { type: 'boolean', default: true },
		transitionDuration:   { type: 'string',  default: '300' },
		transitionEasing:     { type: 'string',  default: 'ease' },
		carouselAutoplay:     { type: 'boolean', default: false },
		carouselSpeed:        { type: 'number',  default: 5000 },
		carouselShowDots:     { type: 'boolean', default: true },
		carouselShowArrows:   { type: 'boolean', default: true },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: true, color: true, style: true },
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return {
			...attributes,
			gap:       normGap( attributes.gap,       '30px' ),
			gapTablet: normGap( attributes.gapTablet, '' ),
			gapMobile: normGap( attributes.gapMobile, '' ),
		};
	},
};

export default [ v1 ];
