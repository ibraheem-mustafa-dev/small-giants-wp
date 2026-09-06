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

/** Index just past the JSON object opening at `start`, or -1 if unbalanced.
 *
 * STRING-AWARE. A naive brace-depth counter miscounts any literal '{' or '}'
 * inside a string VALUE (e.g. copy reading "use the } bracket") and then yields
 * attrs={} — which made a genuine casualty report as "nothing to migrate", with
 * the fail-closed check never even reaching it (QC council 2026-07-15,
 * reproduced). Quotes + backslash escapes tracked so only structural braces count.
 */
function balancedJsonEnd(raw, start) {
	let depth = 0;
	let inStr = false;
	let esc = false;
	for (let i = start; i < raw.length; i++) {
		const ch = raw[i];
		if (inStr) {
			if (esc) esc = false;
			else if (ch === '\\') esc = true;
			else if (ch === '"') inStr = false;
			continue;
		}
		if (ch === '"') inStr = true;
		else if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return i + 1;
		}
	}
	return -1;
}

/** Brace-depth-balanced parse of every `<!-- wp:ns/name {...} -->` comment.
 * Returns flat document-order list: {name, attrs, selfClosing, index, parseError}.
 * Unlike wp.blocks.parse this PRESERVES undeclared attrs — that is the point.
 * parseError is NEVER swallowed: buildPlan turns it into a fail-closed error, so
 * an unreadable block can never masquerade as a clean one. */
function parseBlockComments(raw, nsFilter) {
	const out = [];
	const re = /<!--\s+?wp:([a-z][\w/-]*)(\s+\{)?/g;
	let m;
	while ((m = re.exec(raw)) !== null) {
		const name = m[1].includes('/') ? m[1] : `core/${m[1]}`;
		if (nsFilter && !name.startsWith(nsFilter)) continue;
		let attrs = {};
		let parseError = '';
		let end = m.index + m[0].length;
		if (m[2]) {
			const bs = raw.indexOf('{', m.index);
			const je = balancedJsonEnd(raw, bs);
			if (je < 0) {
				parseError = 'attrs JSON never closes (unbalanced braces)';
			} else {
				try {
					attrs = JSON.parse(raw.slice(bs, je));
				} catch (e) {
					parseError = `attrs JSON is unreadable: ${e.message}`;
				}
				end = je;
			}
		}
		const selfClosing = raw.slice(end, end + 16).trimStart().startsWith('/-->');
		out.push({ name, attrs, selfClosing, index: m.index, parseError });
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

/**
 * ATTRIBUTE RENAMES — a second migration SHAPE, distinct from the scalar→InnerBlocks
 * rebuild the BUILDERS above perform (added 2026-08-05).
 *
 * WHY IT IS SEPARATE. A rebuild constructs a NEW block from scratch and hands the
 * driver `children` to re-create; a rename must leave the block's existing
 * innerBlocks strictly alone. Routing a rename through the rebuild path would call
 * createBlock with no children and DESTROY them — sgs/multi-button wraps its
 * sgs/button children, so that would have deleted the buttons. The driver therefore
 * writes renames with updateBlockAttributes (attrs only, subtree untouched) rather
 * than replaceBlock.
 *
 * ⛔ ORDERING. The NEW names must already be DECLARED in the DEPLOYED block.json
 * before a rename runs. WordPress discards an undeclared attribute at parse, so
 * writing one is a silent no-op — and the driver's preflight validates every planned
 * attr against the LIVE runtime schema (wp.blocks.getBlockType), so it fails closed
 * rather than appearing to succeed. The safe sequence, used for multi-button:
 *   phase A — declare BOTH names, render new-first-legacy-fallback, deploy
 *   (migrate)
 *   phase B — delete the legacy names + the fallback, deploy
 * Declaring both first is also what keeps the deploy's own oldshape-audit green:
 * with only the new names declared it reported 3 NEW HIGH, because the stored
 * legacy values would have been deleted on the next editor save.
 */
const RENAMES = {
	'sgs/multi-button': {
		direction: 'flexDirection',
		directionTablet: 'flexDirectionTablet',
		directionMobile: 'flexDirectionMobile',
		wrap: 'flexWrap',
		wrapTablet: 'flexWrapTablet',
		wrapMobile: 'flexWrapMobile',
	},
};

/** Old keys present + populated on this block, i.e. it has something to rename. */
function renameKeysPresent(block) {
	const map = RENAMES[block.name];
	if (!map) return [];
	return Object.keys(map).filter((k) => {
		const v = block.attrs[k];
		return v !== undefined && v !== '' && v !== null;
	});
}

/**
 * ATTRIBUTE DECOMPOSITION — a third migration SHAPE (added 2026-09-02, D920 canary
 * pre-deploy audit). A rename maps ONE old key to ONE new key with the value
 * unchanged; a decompose maps ONE old OBJECT-typed key's SUB-FIELDS onto several
 * NEW scalar sibling attrs. Routed through the SAME attrs-only updateBlockAttributes
 * path as RENAMES (innerBlocks untouched) — the driver does not need to know the
 * difference, buildPlan expands a decompose into the identical {mode:'rename',
 * newAttrs, tokens} shape a rename produces.
 *
 * sgs/hero's `splitImage`/`splitImageMobile` were `{"type":"object"}` composite
 * attrs (shape `{id,url,alt}`, kept alive one extra day per D920/commit `dcd9940d2`'s
 * own docblock for the cloning pipeline's scalar-media role assignment) that
 * `b7b420df9` finished retiring in favour of the already-declared
 * splitImageId/splitImageUrl/splitImageAlt (+Tablet/Mobile) scalar trio. Six live
 * canary posts (2334/2337/2602/2742/2849/2884) still hand-author the old object
 * shape and are blocked by build-deploy.py's oldshape-audit pending this migration.
 */
const DECOMPOSE = {
	'sgs/hero': {
		splitImage: { id: 'splitImageId', url: 'splitImageUrl', alt: 'splitImageAlt' },
		splitImageMobile: { id: 'splitImageIdMobile', url: 'splitImageUrlMobile', alt: 'splitImageAltMobile' },
	},
};

/** Old object-typed keys present on this block with at least one real sub-value. */
function decomposeKeysPresent(block) {
	const map = DECOMPOSE[block.name];
	if (!map) return [];
	return Object.keys(map).filter((k) => {
		const v = block.attrs[k];
		return v && typeof v === 'object' && !Array.isArray(v)
			&& (v.id || v.url || v.alt);
	});
}

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
	// A rename/decompose qualifies on its own terms and must be tested FIRST: the
	// `!block.selfClosing` gate below is a rebuild-shape rule, and a block being
	// renamed/decomposed normally HAS children (that is precisely why it needs the
	// attrs-only path). Testing rebuild-first would return false and silently skip it.
	if (renameKeysPresent(block).length) return true;
	if (decomposeKeysPresent(block).length) return true;
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
		// Fail closed: an unreadable block might BE a casualty. Never skip silently.
		if (block.parseError) {
			errors.push(`${block.name} #${kthCounter[block.name]}: ${block.parseError} — `
				+ 'cannot determine whether this block is a casualty; refusing to proceed');
			continue;
		}
		if (!needsMigration(block)) continue;

		// RENAME/DECOMPOSE shape — attrs only, children untouched. Emitted with
		// mode:'rename' so the driver uses updateBlockAttributes instead of
		// replaceBlock (both shapes share the same safe write path).
		const renameKeys = renameKeysPresent(block);
		const decomposeKeys = decomposeKeysPresent(block);
		if (renameKeys.length || decomposeKeys.length) {
			const map = RENAMES[block.name] || {};
			const newAttrs = {};
			const tokens = [];
			for (const oldKey of renameKeys) {
				const value = block.attrs[oldKey];
				newAttrs[map[oldKey]] = value;
				// Content-preservation inventory: the driver must find each value again
				// on the migrated block, so a dropped rename cannot pass silently.
				tokens.push({ source: `${block.name}.${oldKey}`, value });
			}
			for (const oldKey of decomposeKeys) {
				const subMap = DECOMPOSE[block.name][oldKey];
				const obj = block.attrs[oldKey];
				for (const [subKey, newKey] of Object.entries(subMap)) {
					const isIdField = /Id(Mobile|Tablet)?$/.test(newKey);
					const value = obj[subKey] !== undefined ? obj[subKey] : (isIdField ? 0 : '');
					newAttrs[newKey] = value;
					// Only inventory a real (non-default) value as a content token — an
					// id:0/empty-alt is a legitimate "unset" state on the source object,
					// not lost content, and must not be demanded back by verify().
					tok(tokens, `${block.name}.${oldKey}.${subKey}`, value);
				}
			}
			// Explicitly clear the legacy keys so their eventual block.json deletion
			// cannot strand them. undefined is how the block editor removes an attribute.
			for (const oldKey of renameKeys) newAttrs[oldKey] = undefined;
			for (const oldKey of decomposeKeys) newAttrs[oldKey] = undefined;
			entries.push({
				name: block.name,
				kth: kthCounter[block.name],
				mode: 'rename',
				sourceAttrs: block.attrs,
				newAttrs,
				children: null,
				tokens,
			});
			continue;
		}

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

module.exports = { parseBlockComments, buildPlan, RENAMES };
