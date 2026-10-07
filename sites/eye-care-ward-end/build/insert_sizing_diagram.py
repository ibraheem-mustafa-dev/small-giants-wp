"""Inserts (or replaces) the Sizing tab's measured diagrams in single-product.tree.json: the draft's front and
side frame drawings with their labelled measurements, between the "This pair, measured" header row and the
measurements table (register N36S, decision D1).

single-product.tree.json is edited in place because it is the source of truth for this page: later commits
(f5aef9f07, a49e09cb6) changed it directly, so gen_single_product.py no longer reproduces it. The card is found
by its marker class and replaced, so a rerun never adds a second copy.

Inputs, all measured or uploaded, never typed:
  qa/sizing-diagram-measure.json  each dimension's line, guides, ticks and label anchor, measured from the hosted
                                  draft by scripts/computed-route/lib/fill-diagram.mjs::diagramGeometry
  sizing-diagrams.json            the uploaded drawings' attachment ids, URLs and sizes (upload_sizing_diagrams.py)

Usage: python insert_sizing_diagram.py"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TREE = os.path.join(HERE, 'single-product.tree.json')
MARKER = 'eye-care-sizing-diagram'

# Caption, product field and how the draft lays the label out (its value above or below the caption, and which
# edge the label hangs from). The temple caption is the draft's own wording.
DIMENSIONS = {
    'eye': ('Lens width', 'meta._sgs_frame_eye', 'valueFirst', 'center'),
    'bridge': ('Bridge', 'meta._sgs_frame_bridge', 'captionFirst', 'center'),
    'height': ('Lens height', 'meta._sgs_frame_height', 'valueFirst', 'start'),
    'temple': ('Temple length, ear bend included', 'meta._sgs_frame_temple', 'valueFirst', 'center'),
}
VIEWS = (('front', 'Front', ('bridge', 'eye', 'height')), ('side', 'Side', ('temple',)))

# The draft's label type: value clamp(12px, 2vw, 17px), caption clamp(8px, 1.25vw, 11.5px) at .14em in capitals,
# 3px apart. Phones use numbered markers with the labels listed under the drawing, where 8px text would be too
# small to read, so the phone sizes are the readable ones a list needs.
DIAGRAM_STYLE = dict(
    labelMode={'desktop': 'onDrawing', 'mobile': 'numbered'},
    labelGap={'desktop': '3px'},
    # The draft's guide lines are dashed (stroke-dasharray 4 4 at a 1px stroke).
    extensionStyle='dashed',
    valueFontSize={'desktop': 17, 'tablet': 15, 'mobile': 15}, valueFontSizeUnit='px', valueLineHeight={'desktop': 1.1},
    valueLineHeightUnit='',
    captionFontSize={'desktop': 11.5, 'tablet': 10, 'mobile': 11}, captionFontSizeUnit='px',
    captionLetterSpacing={'desktop': 0.14}, captionLetterSpacingUnit='em', captionTextTransform='uppercase',
)
SUBHEAD = dict(fontSize={'desktop': 11}, fontSizeUnit='px', letterSpacing={'desktop': 0.18}, letterSpacingUnit='em',
               textTransform='uppercase', textColour='text-muted', margin={'desktop': {'bottom': '6px'}})


def diagram(view, drawing, measured):
    children = []
    for key in VIEWS[[v[0] for v in VIEWS].index(view)][2]:
        caption, field, order, align = DIMENSIONS[key]
        m = measured[key]
        attrs = {
            'caption': caption, 'value': '', 'kind': 'dimension', 'endStyle': 'tick',
            'orientation': 'vertical' if m['startX'] == m['endX'] else 'horizontal',
            'startX': m['startX'], 'startY': m['startY'], 'endX': m['endX'], 'endY': m['endY'],
            'extReach': m['extReach'], 'extOvershoot': m['extOvershoot'],
            'labelX': {'desktop': m['labelX']}, 'labelY': {'desktop': m['labelY']},
            'labelAlign': align, 'labelOrder': order,
            'metadata': {'bindings': {'value': {'source': 'sgs-product/field', 'args': {'key': field, 'after': ' mm'}}}},
        }
        if m.get('extReachEnd') is not None:
            attrs['extReachEnd'] = m['extReachEnd']
        children.append({'name': 'sgs/diagram-dimension', 'attributes': attrs})
    tick = measured[VIEWS[[v[0] for v in VIEWS].index(view)][2][0]]['tickLength']
    attrs = dict(DIAGRAM_STYLE, drawingImageId=drawing['id'], drawingImageUrl=drawing['url'],
                 drawingImageWidth=drawing['width'], drawingImageHeight=drawing['height'],
                 drawingImageAlt='Front view of the frame' if 'front' == view else 'Side view of the frame',
                 tickLength=tick)
    return {'name': 'sgs/measured-diagram', 'attributes': attrs, 'innerBlocks': children}


def card(drawings, measured):
    front = [{'name': 'sgs/text', 'attributes': dict(SUBHEAD, text='Front')}, diagram('front', drawings['front'], measured)]
    side = {'name': 'sgs/container', 'attributes': {
        'layout': 'stack', 'borderWidth': {'top': '1px'}, 'borderColour': 'accent-light',
        'padding': {'desktop': {'top': '20px'}}}, 'innerBlocks': [
        {'name': 'sgs/text', 'attributes': dict(SUBHEAD, text='Side')}, diagram('side', drawings['side'], measured)]}
    return {'name': 'sgs/container', 'attributes': {
        'className': MARKER, 'layout': 'stack', 'gap': {'desktop': '22px'}, 'backgroundColour': 'surface-alt',
        'borderWidth': {'top': '1px', 'right': '1px', 'bottom': '1px', 'left': '1px'}, 'borderColour': 'border',
        'padding': {'desktop': {'top': '22px', 'right': '20px', 'bottom': '22px', 'left': '20px'}},
        'margin': {'desktop': {'bottom': '16px'}}}, 'innerBlocks': [
        {'name': 'sgs/container', 'attributes': {'layout': 'stack'}, 'innerBlocks': front}, side]}


def find_sizing_tab(nodes):
    for node in nodes:
        if 'sgs/tab' == node.get('name') and 'Sizing' == node.get('attributes', {}).get('label'):
            return node
        found = find_sizing_tab(node.get('innerBlocks', []))
        if found:
            return found
    return None


def main():
    with open(os.path.join(HERE, 'qa', 'sizing-diagram-measure.json'), encoding='utf-8') as fh:
        measured = json.load(fh)['dimensions']
    with open(os.path.join(HERE, 'sizing-diagrams.json'), encoding='utf-8') as fh:
        drawings = json.load(fh)
    with open(TREE, encoding='utf-8') as fh:
        tree = json.load(fh)
    tab = find_sizing_tab(tree)
    if not tab:
        sys.exit('No Sizing tab in the tree.')
    inner = tab['innerBlocks']
    inner[:] = [n for n in inner if MARKER not in n.get('attributes', {}).get('className', '')]
    # Directly under the "This pair, measured" header row, so the drawing sits above the table as in the draft.
    inner.insert(1, card(drawings, measured))
    with open(TREE, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(tree, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    print(f'Sizing diagrams inserted into {TREE}')


if __name__ == '__main__':
    main()
