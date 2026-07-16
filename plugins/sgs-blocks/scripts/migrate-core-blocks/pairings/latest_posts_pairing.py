#!/usr/bin/env python3
"""core/latest-posts → sgs/post-grid transformer (Track C pairing module).

VERDICT: transformer-written. core/latest-posts is the ONE core member of the
"query family" that is genuinely self-contained — no InnerBlocks, no `inherit`
main-query concept, no post-template child. It queries + renders its own list
of posts from typed attributes, exactly like sgs/post-grid does. This is the
only clean 1:1 candidate of the three pairings in this batch; core/query +
core/post-template are refused separately (query_pairing.py / post_template_
pairing.py) because they structurally cannot express `"inherit":true`.

Ground truth (verified 2026-07-16):
  - core/latest-posts attributes + defaults: WordPress/gutenberg trunk
    packages/block-library/src/latest-posts/block.json (fetched live).
  - core/latest-posts supports: same file, `supports` key (fetched live).
  - sgs/post-grid attributes + render behaviour: block.json + render.php
    (plugins/sgs-blocks/src/blocks/post-grid/), read in full.
  - sgs/post-grid card markup: plugins/sgs-blocks/includes/class-post-grid-
    rest.php `render_card()` — the single source of card HTML (used by both
    render.php and the REST pagination endpoint).
  - Real instance: theme/sgs-theme/parts/sidebar.html —
    `{"postsToShow":5,"displayPostDate":true,"displayFeaturedImage":true,
      "featuredImageSizeSlug":"thumbnail","addLinkToFeaturedImage":true}`.
    (This part is currently NOT referenced by any template/pattern in the
    theme — grepped `"slug":"sidebar"` and `get_template_part` for "sidebar",
    zero hits. Transform correctness does not depend on that, but it means
    the swap is currently inert on the live site. Flagged for the register.)

THE STRUCTURAL-DEFAULT TRAP (the reason this module emits several attrs that
have NO corresponding source key): core/latest-posts and sgs/post-grid are
unrelated block families with DIFFERENT own-defaults for capabilities core/
latest-posts doesn't have at all. A source attr being ABSENT from attrs_in
does not mean "leave the target attribute at its own default" — core/latest-
posts's ABSENT-key defaults (displayPostContent:false, i.e. no excerpt; no
category-badge concept at all; no read-more link concept at all; always a
flat list, never a grid) must be reproduced explicitly, because sgs/post-
grid's OWN defaults for those same attrs (showExcerpt:true, showCategory:
true, showReadMore:true, layout:"grid") would silently ADD content and
restructure the layout that the source never rendered. This is the same
class of bug as the D328/D291 coercion traps, just in the opposite
direction (a differing DEFAULT, not a bad TYPE) — so every one of these is
still logged in `accounting` even though it isn't a literal source key,
tagged 'mapped' with the reasoning spelled out, so the register shows WHY.

Known capability gaps (raise GapError — never guessed past):
  - selectedAuthor        — sgs/post-grid has no post-author filter.
  - featuredImageAlign    — sgs/post-grid image always fills a fixed
                             aspect-ratio box inside the card; no float/align.
  - featuredImageSizeWidth/Height — sgs/post-grid only accepts an imageSize
                             SLUG (`imageSize`), never custom pixel dims.
  - displayPostContentRadio:"full_post" — sgs/post-grid only ever renders a
                             trimmed excerpt (`excerptLength`), never the
                             full post content.
  - addLinkToFeaturedImage:false — sgs/post-grid's card ALWAYS wraps the
                             image in a permalink `<a>` when shown (verified:
                             class-post-grid-rest.php render_card(), line
                             ~356, unconditional `<a href="%s" ...>` around
                             the image markup — no toggle exists). true
                             already matches this unconditional behaviour and
                             is dropped; false is a real capability gap.
  - top-level textColor / backgroundColor / gradient (WP auto-injects these
    onto ANY block declaring `color` support, even though sgs/post-grid's
    block.json does not list them under "attributes" — WP merges support-
    derived attrs into the runtime block type, not into the static JSON) —
    refused here rather than emitted, because THIS DRIVER's
    `load_target_schema()` reads the block.json file literally and would
    reject them at the anti-silent-discard gate as "not declared". None of
    the 7 real query-family instances hit this path; flagged for whoever
    reads the register as a driver-level limitation, not a per-instance one.
  - style.color.link / style.elements, style.typography.* beyond
    fontSize/lineHeight (fontFamily/fontWeight/fontStyle/textTransform/
    textDecoration/letterSpacing) — sgs/post-grid's typography support only
    declares fontSize+lineHeight (skip-serialised, read straight off
    style.typography in render.php); the rest have no equivalent.

VISUAL-APPROXIMATION FLAG (not a gap, but not a mechanical fact either):
core/latest-posts renders NO card chrome at all — no border, no shadow, no
background box, just `<li><a><img></a><a>Title</a><time></time></li>`.
sgs/post-grid's `cardStyle` enum (card / flat / overlay / minimal) has no
"no chrome" option: `card` adds a shadow, `overlay` needs a filled image,
`minimal` FORCIBLY HIDES the image (`.sgs-post-grid__card--minimal
.sgs-post-grid__image{display:none}` — style.css line ~214), which would
contradict `displayFeaturedImage:true`. `flat` (border, no shadow) is the
closest available option and is what this module emits — logged as a
'mapped' entry with the compromise spelled out, plus a `notes` entry so it
surfaces in the swap log for a visual check. This is a genuine design gap
(sgs/post-grid has no "unstyled list item" card style) — worth adding as a
capability to sgs/post-grid, not something to keep silently working around.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment  # noqa: E402
from contract import GapError, TransformResult  # noqa: E402

# style groups sgs/post-grid declares as skip-serialised native supports.
PASSTHROUGH_STYLE_GROUPS = ('spacing', 'border')
KNOWN_ORDERBY = {'date', 'title', 'author', 'modified', 'rand', 'menu_order',
                  'comment_count', 'id', 'name', 'ID', 'slug'}


def transform(node, text):
    attrs_in = node.attrs or {}
    if attrs_in is None:
        raise GapError('attrs JSON failed to parse — cannot transform safely')

    out = {}
    accounting = {}
    notes = []

    # -- postsToShow -> postsPerPage (source default 5, target default 6;
    #    ABSENT must still be corrected, so always emit).
    posts_to_show = attrs_in.get('postsToShow', 5)
    if not isinstance(posts_to_show, int) or isinstance(posts_to_show, bool) or posts_to_show < 1:
        raise GapError(f'postsToShow {posts_to_show!r} is not a positive int — refusing to guess')
    out['postsPerPage'] = posts_to_show
    if 'postsToShow' in attrs_in:
        accounting['postsToShow'] = ('mapped', 'postsPerPage')

    # -- displayPostContent / displayPostContentRadio / excerptLength -> showExcerpt (+excerptLength).
    display_content = attrs_in.get('displayPostContent', False)
    if 'displayPostContentRadio' in attrs_in and attrs_in['displayPostContentRadio'] == 'full_post':
        raise GapError(
            'displayPostContentRadio:"full_post" has no sgs/post-grid equivalent — the card '
            'only ever renders a trimmed excerpt (excerptLength), never full post content')
    out['showExcerpt'] = bool(display_content)
    detail = ('showExcerpt=True (displayPostContent present)' if 'displayPostContent' in attrs_in
              else 'showExcerpt=False (core default; target default is True and would silently '
                   'add excerpt text the source never rendered)')
    if 'displayPostContent' in attrs_in:
        accounting['displayPostContent'] = ('mapped', detail)
    if display_content:
        excerpt_len = attrs_in.get('excerptLength', 55)
        if not isinstance(excerpt_len, int) or isinstance(excerpt_len, bool) or excerpt_len < 1:
            raise GapError(f'excerptLength {excerpt_len!r} is not a positive int')
        out['excerptLength'] = excerpt_len
        if 'excerptLength' in attrs_in:
            accounting['excerptLength'] = ('mapped', 'excerptLength (both wp_trim_words word-count based)')
    if 'displayPostContentRadio' in attrs_in:
        accounting['displayPostContentRadio'] = ('mapped', 'consulted to gate showExcerpt/GapError above')

    # -- displayAuthor -> showAuthor (direct; both booleans, both default false).
    out['showAuthor'] = bool(attrs_in.get('displayAuthor', False))
    if 'displayAuthor' in attrs_in:
        accounting['displayAuthor'] = ('mapped', 'showAuthor')

    # -- displayPostDate -> showDate.
    out['showDate'] = bool(attrs_in.get('displayPostDate', False))
    if 'displayPostDate' in attrs_in:
        accounting['displayPostDate'] = ('mapped', 'showDate')

    # -- order / orderBy -> WP_Query keyword params, same names, same values.
    if 'order' in attrs_in:
        if attrs_in['order'] not in ('asc', 'desc'):
            raise GapError(f'order {attrs_in["order"]!r} outside asc/desc — refusing to guess')
        out['order'] = attrs_in['order']
        accounting['order'] = ('mapped', 'order (WP_Query orderby keyword, 1:1)')
    if 'orderBy' in attrs_in:
        if attrs_in['orderBy'] not in KNOWN_ORDERBY:
            raise GapError(f'orderBy {attrs_in["orderBy"]!r} not in the verified-safe WP_Query orderby set')
        out['orderBy'] = attrs_in['orderBy']
        accounting['orderBy'] = ('mapped', 'orderBy (WP_Query orderby keyword, 1:1)')

    # -- displayFeaturedImage -> showImage.
    show_image = bool(attrs_in.get('displayFeaturedImage', False))
    out['showImage'] = show_image
    if 'displayFeaturedImage' in attrs_in:
        accounting['displayFeaturedImage'] = ('mapped', 'showImage')

    if attrs_in.get('featuredImageAlign'):
        raise GapError(
            f'featuredImageAlign {attrs_in["featuredImageAlign"]!r} has no sgs/post-grid equivalent — '
            f'the card image always fills a fixed aspect-ratio box (aspectRatio attr), no float/align')

    if 'featuredImageSizeSlug' in attrs_in:
        out['imageSize'] = attrs_in['featuredImageSizeSlug']
        accounting['featuredImageSizeSlug'] = ('mapped', 'imageSize (both sanitize_key()\'d WP image size slugs)')

    for key in ('featuredImageSizeWidth', 'featuredImageSizeHeight'):
        if attrs_in.get(key) is not None:
            raise GapError(
                f'{key} is set ({attrs_in[key]!r}) — sgs/post-grid only accepts an imageSize SLUG '
                f'(imageSize) or an aspectRatio string, never a custom pixel dimension')

    if 'addLinkToFeaturedImage' in attrs_in:
        if attrs_in['addLinkToFeaturedImage']:
            accounting['addLinkToFeaturedImage'] = (
                'dropped',
                'sgs/post-grid card ALWAYS links the image when shown (render_card(), unconditional '
                '<a> wrap, no toggle) — true already matches the unconditional target behaviour')
        else:
            raise GapError(
                'addLinkToFeaturedImage:false — sgs/post-grid has no way to show the image WITHOUT '
                'linking it (render_card() always wraps it in an <a>); this is a real capability gap, '
                'not a silent drop')

    # -- categories: core stores [{"id":N,...}] or [N,...] depending on editor
    #    version; sgs/post-grid stores a flat array of ints. Extract defensively,
    #    never guess at an unrecognised shape.
    if 'categories' in attrs_in:
        cats_in = attrs_in['categories']
        cats_out = []
        ok = isinstance(cats_in, list)
        if ok:
            for c in cats_in:
                if isinstance(c, int) and not isinstance(c, bool):
                    cats_out.append(c)
                elif isinstance(c, dict) and isinstance(c.get('id'), int):
                    cats_out.append(c['id'])
                else:
                    ok = False
                    break
        if not ok:
            raise GapError(f'categories shape {cats_in!r} not recognised — refusing to guess at term IDs')
        out['categories'] = cats_out
        accounting['categories'] = ('mapped', 'categories (extracted term IDs -> flat int array)')

    if attrs_in.get('selectedAuthor') is not None:
        raise GapError('selectedAuthor is set — sgs/post-grid has no post-author filter attribute')

    # -- className / anchor / metadata passthrough.
    for key in ('className', 'anchor', 'metadata'):
        if key in attrs_in:
            out[key] = attrs_in[key]
            accounting[key] = ('mapped', f'{key} passthrough')

    # -- style: spacing/border 1:1 (both skip-serialised native supports on
    #    both blocks); typography restricted to fontSize/lineHeight (the only
    #    two sgs/post-grid's typography support declares — read straight off
    #    style.typography by render.php, no typed-attr conversion here);
    #    color restricted to text/background/gradient sub-keys (link/duotone
    #    have no sgs/post-grid equivalent).
    if 'style' in attrs_in:
        style_in = attrs_in['style'] or {}
        style_out = {}
        style_detail = []
        for group, group_value in style_in.items():
            if group in PASSTHROUGH_STYLE_GROUPS:
                style_out[group] = group_value
                style_detail.append(f'style.{group} 1:1 (skip-serialised native support)')
            elif group == 'typography':
                unmapped = [k for k in (group_value or {}) if k not in ('fontSize', 'lineHeight')]
                if unmapped:
                    raise GapError(
                        f'style.typography keys {unmapped} have no sgs/post-grid mapping — the block '
                        f'only declares fontSize + lineHeight')
                style_out['typography'] = group_value
                style_detail.append('style.typography.{fontSize,lineHeight} 1:1 (skip-serialised)')
            elif group == 'color':
                unmapped = [k for k in (group_value or {}) if k not in ('text', 'background', 'gradient')]
                if unmapped:
                    raise GapError(
                        f'style.color keys {unmapped} (e.g. link/duotone) have no sgs/post-grid mapping')
                style_out['color'] = group_value
                style_detail.append('style.color.{text,background,gradient} 1:1 (skip-serialised)')
            elif group == 'elements':
                raise GapError('style.elements (link/heading colour overrides) has no sgs/post-grid mapping')
            else:
                raise GapError(f'style.{group} has no sgs/post-grid mapping — extend before swapping')
        if style_out:
            out['style'] = style_out
        accounting['style'] = ('mapped', '; '.join(style_detail) or 'empty style')

    for key in ('textColor', 'backgroundColor', 'gradient'):
        if key in attrs_in:
            raise GapError(
                f'{key} is set — WP auto-injects this attribute for any block declaring `color` support, '
                f'but sgs/post-grid\'s block.json does not list it under "attributes" (only under the '
                f'runtime-merged supports), so this driver\'s load_target_schema() would reject it at the '
                f'anti-silent-discard gate. Driver-level limitation, not a content gap — flag for a fix to '
                f'load_target_schema() (merge supports-derived attrs) before this key can be migrated.')

    for key in attrs_in:
        if key not in accounting:
            raise GapError(f'source attr "{key}" not handled by this module — extend the mapping')

    # -- Structural corrections with NO corresponding source key (see module
    #    docstring "THE STRUCTURAL-DEFAULT TRAP"). Always emitted, never
    #    guessed — every one is a documented fact about what core/latest-posts
    #    can or cannot render, not a stylistic preference.
    out['layout'] = 'list'  # core/latest-posts has no grid concept in current core; always a flat list.
    notes.append('layout forced to "list" — core/latest-posts has no grid rendering mode at all '
                 '(verified against the current core block.json attribute set: no postLayout/columns key)')

    out['showCategory'] = False
    notes.append('showCategory forced to False — core/latest-posts has no category-badge display '
                 'capability at all (not a togglable feature); target default is True')

    out['showReadMore'] = False
    notes.append('showReadMore forced to False — core/latest-posts has no "read more" link capability '
                 'at all; target default is True')

    out['showTitle'] = True  # core/latest-posts always shows the title (no toggle); matches target default.

    out['excludeCurrent'] = False
    notes.append('excludeCurrent forced to False — core/latest-posts has no self-exclusion concept, it '
                 'queries ALL published posts; target default is True and would silently drop the '
                 'current post on a singular template. NOTE: sidebar.html (the only instance) is '
                 'currently unreferenced by any template/pattern in the theme, so this is inert today '
                 'but load-bearing the moment the part gets wired in.')

    out['cardStyle'] = 'flat'
    notes.append('VISUAL APPROXIMATION: cardStyle set to "flat" (border, no shadow) — the closest '
                 'available option to core/latest-posts\' zero-chrome list rendering. sgs/post-grid has '
                 'no "unstyled list item" cardStyle; "minimal" was rejected because it forcibly hides '
                 'the image (style.css .sgs-post-grid__card--minimal .sgs-post-grid__image{display:none}), '
                 'contradicting displayFeaturedImage:true. Recommend visual sign-off before shipping wide, '
                 'and consider adding a true chrome-less cardStyle to sgs/post-grid as a capability gap.')

    replacement = serialize_comment('sgs/post-grid', out, void=True)
    return TransformResult(replacement, out, 'sgs/post-grid', accounting, notes)
