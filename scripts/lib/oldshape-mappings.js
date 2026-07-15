/**
 * oldshape-mappings.js — old-scalar-shape → InnerBlocks-shape mapping tables for
 * wp-migrate-oldshape-blocks.js (Track B content restore, 2026-07-15).
 *
 * Every target attr name/type/enum here was verified against the CURRENT
 * block.json schemas this session; the driver re-validates the whole plan
 * against the LIVE runtime schema (wp.blocks.getBlockType) before any write,
 * because the deployed build (main) may differ from the working tree.
 *
 * Design rules (adversarial-council adopted, see
 * .claude/scratch/track-b-decisions-pending.md TB-3):
 *  - New attrs are built from an explicit KEEP allowlist rule — never
 *    Object.assign(oldBlock.attributes) (strands stale scalars).
 *  - The raw stored markup is the SOLE value source (the editor discards
 *    undeclared attrs at parse — they are invisible in wp.data).
 *  - Fail closed: a populated content-bearing attr with no mapping ABORTS the
 *    plan with a named error; nothing is ever silently dropped (Rule 4).
 *  - Every consumed content value is recorded as a token the driver must find
 *    again in the migrated result (content-preservation inventory).
 */

'use strict';

/** Brace-depth-balanced parse of every `<!-- wp:ns/name {...} -->` comment.
 * Returns flat document-order list: {name, attrs, selfClosing, index}.
 * Unlike wp.blocks.parse this PRESERVES undeclared attrs — that is the point. */
function parseBlockComments(raw, nsFilter) {
	const out = [];
	const re = /<!--\s+?wp:([a-z][\w/-]*)(\s+\{)?/g;
	let m;
	while ((m = re.exec(raw)) !== null) {
		const name = m[1].includes('/') ? m[1] : `core/${m[1]}`;
		if (nsFilter && !name.startsWith(nsFilter)) continue;
		let attrs = {};
		let end = m.index + m[0].length;
		if (m[2]) {
			const bs = raw.indexOf('{', m.index);
			let depth = 0;
			for (let i = bs; i < raw.length; i++) {
				if (raw[i] === '{') depth++;
				else if (raw[i] === '}') {
					depth--;
					if (depth === 0) {
						try { attrs = JSON.parse(raw.slice(bs, i + 1)); } catch (e) { attrs = {}; }
						end = i + 1;
						break;
					}
				}
			}
		}
		const selfClosing = raw.slice(end, end + 16).trimStart().startsWith('/-->');
		out.push({ name, attrs, selfClosing, index: m.index });
	}
	return out;
}

/** Push token {source, value} for every non-empty content value consumed. */
function tok(tokens, source, value) {
	if (value !== undefined && value !== null && value !== '') tokens.push({ source, value });
	return value;
}

/** Keep every raw attr except the consumed/content set. Runtime-schema pruning
 * of anything undeclared happens in-browser (driver pre-flight, logged). */
function keepAttrs(attrs, consumed) {
	const keep = {};
	for (const [k, v] of Object.entries(attrs)) {
		if (!consumed.has(k)) keep[k] = v;
	}
	return keep;
}

function buildButton(text, url, colour, background, preset, tokens, label) {
	const hasCustomColours = Boolean(colour || background);
	const attrs = {
		inheritStyle: hasCustomColours ? 'custom' : preset,
		label: tok(tokens, `${label}.text`, text),
		url: tok(tokens, `${label}.url`, url) || '',
	};
	if (colour) attrs.colourText = tok(tokens, `${label}.colourText`, colour);
	if (background) attrs.colourBackground = tok(tokens, `${label}.colourBackground`, background);
	return { name: 'sgs/button', attrs };
}

const CONSUMED = {
	'sgs/hero': new Set([
		'headline', 'headlineColour', 'subHeadline', 'subHeadlineColour', 'label',
		'ctaPrimaryText', 'ctaPrimaryUrl', 'ctaPrimaryColour', 'ctaPrimaryBackground', 'ctaPrimaryStyle',
		'ctaSecondaryText', 'ctaSecondaryUrl', 'ctaSecondaryColour', 'ctaSecondaryBackground', 'ctaSecondaryStyle',
	]),
	'sgs/info-box': new Set([
		'icon', 'iconColour', 'iconBackgroundColour', 'iconSize',
		'heading', 'headingColour', 'subtitle', 'description', 'descriptionColour',
	]),
	'sgs/testimonial-slider': new Set([
		'testimonials', 'quoteColour', 'nameColour', 'roleColour', 'ratingColour',
	]),
	'sgs/brand-strip': new Set(['logos']),
};

/** Content-bearing keys we have NO mapping for — populated ⇒ fail closed. */
const FAIL_CLOSED = {
	'sgs/hero': [], // badges/splitImage/backgroundImage etc. are declared + still render-read → keeps
	'sgs/info-box': ['image', 'boxMedia', 'mediaEmoji'],
	'sgs/testimonial-slider': ['sideImage'],
	'sgs/brand-strip': [],
};

const BUILDERS = {
	'sgs/hero'(attrs, tokens, errors) {
		const children = [];
		if (attrs.label) {
			children.push({ name: 'sgs/label', attrs: { className: 'sgs-hero__label', text: tok(tokens, 'hero.label', attrs.label) } });
		}
		if (attrs.headline) {
			const h = { level: 'h1', className: 'sgs-hero__headline', content: tok(tokens, 'hero.headline', attrs.headline) };
			if (attrs.headlineColour) h.textColour = tok(tokens, 'hero.headlineColour', attrs.headlineColour);
			children.push({ name: 'sgs/heading', attrs: h });
		}
		if (attrs.subHeadline) {
			const t = { className: 'sgs-hero__subheadline', text: tok(tokens, 'hero.subHeadline', attrs.subHeadline) };
			if (attrs.subHeadlineColour) t.textColour = tok(tokens, 'hero.subHeadlineColour', attrs.subHeadlineColour);
			children.push({ name: 'sgs/text', attrs: t });
		}
		const buttons = [];
		if (attrs.ctaPrimaryText) {
			buttons.push(buildButton(attrs.ctaPrimaryText, attrs.ctaPrimaryUrl,
				attrs.ctaPrimaryColour, attrs.ctaPrimaryBackground, 'primary', tokens, 'hero.ctaPrimary'));
		}
		if (attrs.ctaSecondaryText) {
			buttons.push(buildButton(attrs.ctaSecondaryText, attrs.ctaSecondaryUrl,
				attrs.ctaSecondaryColour, attrs.ctaSecondaryBackground, 'secondary', tokens, 'hero.ctaSecondary'));
		}
		if (buttons.length) children.push({ name: 'sgs/multi-button', attrs: {}, children: buttons });
		if (attrs.splitImage && attrs.splitImage.url) tok(tokens, 'hero.splitImage.url', attrs.splitImage.url);
		if (!children.length) errors.push('sgs/hero instance had no mappable content');
		return { newAttrs: keepAttrs(attrs, CONSUMED['sgs/hero']), children };
	},

	'sgs/info-box'(attrs, tokens, errors) {
		const children = [];
		if (attrs.icon) {
			const transparent = !attrs.iconBackgroundColour || attrs.iconBackgroundColour === 'transparent';
			const icon = {
				className: 'sgs-info-box__icon',
				iconSource: 'lucide',
				iconName: tok(tokens, 'infoBox.icon', attrs.icon),
				backgroundShape: transparent ? 'none' : 'circle',
			};
			if (attrs.iconColour) icon.iconColour = tok(tokens, 'infoBox.iconColour', attrs.iconColour);
			if (!transparent) icon.backgroundColour = tok(tokens, 'infoBox.iconBackgroundColour', attrs.iconBackgroundColour);
			if (typeof attrs.iconSize === 'number') icon.iconSize = attrs.iconSize;
			children.push({ name: 'sgs/icon', attrs: icon });
		}
		if (attrs.heading) {
			const h = { level: 'h3', headingRole: 'heading', content: tok(tokens, 'infoBox.heading', attrs.heading) };
			if (attrs.headingColour) h.textColour = tok(tokens, 'infoBox.headingColour', attrs.headingColour);
			children.push({ name: 'sgs/heading', attrs: h });
		}
		if (attrs.subtitle) {
			children.push({ name: 'sgs/heading', attrs: { level: 'h4', headingRole: 'subheading', content: tok(tokens, 'infoBox.subtitle', attrs.subtitle) } });
		}
		if (attrs.description) {
			const t = { text: tok(tokens, 'infoBox.description', attrs.description) };
			if (attrs.descriptionColour) t.textColour = tok(tokens, 'infoBox.descriptionColour', attrs.descriptionColour);
			children.push({ name: 'sgs/text', attrs: t });
		}
		if (!children.length) errors.push('sgs/info-box instance had no mappable content');
		return { newAttrs: keepAttrs(attrs, CONSUMED['sgs/info-box']), children };
	},

	'sgs/testimonial-slider'(attrs, tokens, errors) {
		const children = [];
		const KNOWN_ITEM_KEYS = new Set(['quote', 'name', 'role', 'rating']);
		for (const [i, item] of (attrs.testimonials || []).entries()) {
			const unknown = Object.keys(item).filter((k) => !KNOWN_ITEM_KEYS.has(k));
			if (unknown.length) {
				errors.push(`testimonials[${i}] has unmapped keys: ${unknown.join(', ')}`);
				continue;
			}
			const rating = Number(item.rating) || 0;
			const t = {
				quote: tok(tokens, `testimonial[${i}].quote`, item.quote),
				reviewerName: tok(tokens, `testimonial[${i}].name`, item.name),
				reviewerRole: tok(tokens, `testimonial[${i}].role`, item.role),
				ratingStars: rating,
				ratingType: 'stars',
				showRating: rating > 0,
			};
			if (attrs.quoteColour) t.quoteColour = attrs.quoteColour;
			if (attrs.nameColour) t.nameColour = attrs.nameColour;
			if (attrs.roleColour) t.roleColour = attrs.roleColour;
			if (attrs.ratingColour) t.ratingColour = attrs.ratingColour;
			children.push({ name: 'sgs/testimonial', attrs: t });
		}
		if (attrs.quoteColour) tok(tokens, 'slider.quoteColour', attrs.quoteColour);
		if (attrs.nameColour) tok(tokens, 'slider.nameColour', attrs.nameColour);
		if (attrs.roleColour) tok(tokens, 'slider.roleColour', attrs.roleColour);
		if (!children.length) errors.push('sgs/testimonial-slider had no mappable testimonials');
		return { newAttrs: keepAttrs(attrs, CONSUMED['sgs/testimonial-slider']), children };
	},

	'sgs/brand-strip'(attrs, tokens, errors) {
		// TARGET SHAPE = legacy {image:{...}} — DELIBERATE (2026-07-15, proven live).
		// The DEPLOYED block.json declares logos.items.properties.media as type
		// "string"; WP's prepare_attributes_for_render validates recursively and a
		// media OBJECT fails it, silently resetting the WHOLE logos attr to []
		// at render (D328 class, one level deeper: items sub-schema). The legacy
		// image-shape carries no `media` key, passes the stale sub-schema, and the
		// render's documented legacy lift (render.php ~319-330, present in both the
		// deployed build AND the current tree) converts it to the media slot.
		// When the corrected block.json (media: object, fixed this session) ships,
		// a single editor round-trip normalises storage to the media shape.
		const logos = [];
		const imageOf = (logo) => {
			if (logo.image && typeof logo.image === 'object' && logo.image.url) {
				return { url: logo.image.url, id: logo.image.id || 0, alt: logo.alt || logo.image.alt || '' };
			}
			if (logo.media && typeof logo.media === 'object' && logo.media.url) {
				return { url: logo.media.url, id: logo.media.id || 0, alt: logo.alt || logo.media.alt || '' };
			}
			if (typeof logo.url === 'string' && logo.url) {
				// Spectra-era bare {url, alt}: url IS the image URL (proven vs render.php)
				return { url: logo.url, id: 0, alt: logo.alt || '' };
			}
			return null;
		};
		for (const [i, logo] of (attrs.logos || []).entries()) {
			const image = imageOf(logo);
			if (!image) {
				errors.push(`brand-strip logos[${i}] has unrecognised shape: ${JSON.stringify(Object.keys(logo))}`);
				continue;
			}
			logos.push({ image, alt: image.alt });
			tok(tokens, `brandStrip.logos[${i}].url`, image.url);
			tok(tokens, `brandStrip.logos[${i}].alt`, image.alt);
		}
		const newAttrs = keepAttrs(attrs, CONSUMED['sgs/brand-strip']);
		newAttrs.logos = logos;
		return { newAttrs, children: [] };
	},
};

/** A stored instance qualifies as a casualty needing migration. */
function needsMigration(block) {
	if (!BUILDERS[block.name]) return false;
	if (block.name === 'sgs/brand-strip') {
		// Qualifies unless every logo is already in the deployed-compatible legacy
		// image-shape (see the builder's TARGET SHAPE note).
		return (block.attrs.logos || []).some((l) => !(l.image && typeof l.image === 'object' && l.image.url));
	}
	if (!block.selfClosing) return false;
	const c = CONSUMED[block.name];
	return Object.entries(block.attrs).some(([k, v]) => c.has(k) && v !== '' && v != null && !(Array.isArray(v) && !v.length));
}

/** Build the migration plan from raw stored markup. Fail-closed. */
function buildPlan(raw) {
	const sgsBlocks = parseBlockComments(raw, 'sgs/');
	const kthCounter = {};
	const entries = [];
	const errors = [];
	for (const block of sgsBlocks) {
		kthCounter[block.name] = (kthCounter[block.name] || 0) + 1;
		if (!needsMigration(block)) continue;
		for (const key of FAIL_CLOSED[block.name]) {
			const v = block.attrs[key];
			if (v && !(Array.isArray(v) && !v.length) && !(typeof v === 'object' && !Object.keys(v).length)) {
				errors.push(`${block.name} #${kthCounter[block.name]}: populated "${key}" has no mapping — refusing to proceed`);
			}
		}
		const tokens = [];
		const { newAttrs, children } = BUILDERS[block.name](block.attrs, tokens, errors);
		entries.push({
			name: block.name,
			kth: kthCounter[block.name], // Kth occurrence of this name, document order
			sourceAttrs: block.attrs,
			newAttrs,
			children,
			tokens,
		});
	}
	return { entries, errors, sgsNameCounts: kthCounter };
}

module.exports = { parseBlockComments, buildPlan };
