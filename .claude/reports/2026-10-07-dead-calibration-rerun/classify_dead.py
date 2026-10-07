import json,collections,sys,re,glob
sys.path.insert(0,'.')
from elem import present,caches,kebab
P='C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/src/blocks/'
FX=json.load(open('C:/Users/Bean/Projects/small-giants-wp/scripts/computed-route/calibration-fixtures.json',encoding='utf8'))
def rd(f):
    try: return open(f,encoding='utf8',errors='ignore').read()
    except: return ''
layer={}
def uses_layer(short):
    if short not in layer:
        layer[short]='sgs_block_background_layer_css' in ''.join(rd(f) for f in glob.glob(P+short+'/*.php'))
    return layer[short]
PORTAL=re.compile(r'^(panel|scrim|backdrop|curtain|panel[A-Z]\w*|item(Thumb|Brand|Detail|Remove|Action)|emptyMessage|emptyCta|checkout|subtotal\w*|freeDelivery\w*|item)$')
PSEUDO={'first-letter','backdrop','field-placeholder','focus-ring'}
def classify(e):
    r=[x for x in e['rows'] if x['css_property']][0]
    prop=r['css_property'].split(',')[0]; st=r['css_state']; el=r['css_element']
    b=e['block']; short=b[4:]; m=e['measured']
    labels=[mm['label'] for x in e['markersNow'] for mm in x['markers']]
    p,_=present(b,el)
    fx=FX.get(b,{})
    if prop in('min-height','min-width') and m<'2026-10-04T12:20': return 'STALE_FLOOR'
    if prop=='border-style' and m<'2026-10-03T22:41': return 'STALE_BORDER_STYLE_NO_WIDTH'
    if prop=='border-radius' and m<'2026-10-03T20:22' and any('corners' in l for l in labels): return 'STALE_RADIUS_SIDES'
    if el in PSEUDO: return 'PSEUDO_ELEMENT'
    if prop=='background-color' and uses_layer(short) and el in(None,'wrapper') : return 'PSEUDO_BG_LAYER'
    if p in('no','loose'):
        if b=='sgs/cart' and el not in('badge','pill'): return 'PORTAL_OR_CLOSED_SURFACE'
        if el in('scrim','backdrop','curtain','panel') : return 'PORTAL_OR_CLOSED_SURFACE'
        if len(caches[b]['elements'])>=77 and b!='sgs/choice-flow': return 'READ_CAP_81'
        return 'FIXTURE_LACKS_ELEMENT'
    if prop in('border-color','border-style','border-width') : return 'NEEDS_BORDER_COMPANION'
    if re.search(r'Overlay|overlay|Scrim',e['attr']) or el=='overlay': return 'NEEDS_OVERLAY_COMPANION'
    if st=='hover' and p=='yes': return 'HOVER_POINTER_MISSES_CHILD'
    if st in('current','open','scrolled'): return 'STATE_NOT_RENDERED_BY_FIXTURE'
    if prop in('flex-direction','flex-wrap','justify-content') : return 'NEEDS_LAYOUT_MODE'
    if prop=='font-weight': return 'MARKER_EQUALS_REST'
    return 'RESIDUAL'
L=json.load(open('layer.json'))
ACC_CTX=None
def ctx_attrs():
    global ACC_CTX
    if ACC_CTX is None:
        j=json.load(open(P+'accordion-item/block.json',encoding='utf8'))
        ACC_CTX={c.split('/accordion')[1][0].lower()+c.split('/accordion')[1][1:] for c in j['usesContext'] if '/accordion' in c}
    return ACC_CTX
BTN_LAYER={('sgs/google-reviews','write-review'),('sgs/google-reviews','see-all'),('sgs/google-reviews','arrow'),('sgs/nav-bar-menu','item'),('sgs/nav-drawer-menu','item')}
def classify2(e):
    r=[x for x in e['rows'] if x['css_property']][0]
    prop=r['css_property'].split(',')[0]; st=r['css_state']; el=r['css_element']; b=e['block']; short=b[4:]; m=e['measured']; a=e['attr']
    labels=[mm['label'] for x in e['markersNow'] for mm in x['markers']]
    p,_=present(b,el)
    fx=FX.get(b,{})
    if b=='sgs/accordion' and a in ctx_attrs(): return 'UID_COLLISION_CONTEXT'
    if prop in('min-height','min-width') and m<'2026-10-04T12:20': return 'STALE_FLOOR'
    if prop=='border-style' and m<'2026-10-03T22:41': return 'STALE_BORDER_STYLE_NO_WIDTH'
    if prop=='border-radius' and m<'2026-10-03T20:22' and any('corners' in l for l in labels): return 'STALE_RADIUS_SIDES'
    if el in PSEUDO: return 'PSEUDO_ELEMENT'
    if p in('no','loose'):
        if b=='sgs/cart' and el not in('badge','pill'): return 'PORTAL_OR_CLOSED_SURFACE'
        if el in('scrim','backdrop','curtain','panel'): return 'PORTAL_OR_CLOSED_SURFACE'
        if len(caches[b]['elements'])>=77 and b!='sgs/choice-flow': return 'READ_CAP_81'
        return 'FIXTURE_LACKS_ELEMENT'
    if prop=='background-color' and ((L.get(short) and el in(None,'wrapper')) or (b,el) in BTN_LAYER): return 'PSEUDO_BG_LAYER'
    if prop in('border-color','border-style','border-width'): return 'NEEDS_BORDER_COMPANION'
    if prop in('background-size',) : return 'NEEDS_BG_IMAGE'
    if re.search(r'Overlay|overlay|Scrim',a) or el=='overlay': return 'NEEDS_OVERLAY_COMPANION'
    if prop=='outline-color' or 'focusRing' in a: return 'STATE_FOCUS_UNROUTED'
    if 'Hover' in a and not st: return 'DB_STATE_MISSING_HOVER'
    if st=='hover': return 'HOVER_POINTER_MISSES_ELEMENT'
    if st in('current','open','scrolled'): return 'STATE_NOT_RENDERED_BY_FIXTURE'
    if prop in('flex-direction','flex-wrap','justify-content') : return 'NEEDS_LAYOUT_MODE'
    if prop=='font-weight': return 'MARKER_EQUALS_REST'
    return 'RESIDUAL'
HAND={
 ('sgs/team-member','fontSize'):'GENUINE_BUG_NOT_READ',('sgs/team-member','fontWeight'):'GENUINE_BUG_NOT_READ',('sgs/team-member','fontStyle'):'GENUINE_BUG_NOT_READ',('sgs/team-member','lineHeight'):'GENUINE_BUG_NOT_READ',
 ('sgs/image-sequence','aspectRatio'):'MARKER_OFF_RENDER_WHITELIST',
 ('sgs/testimonial','ratingSize'):'DB_ROUTING_WRONG',('sgs/nav-bar-menu','collapsePoint'):'DB_ROUTING_WRONG',('sgs/nav-drawer','modality'):'DB_ROUTING_WRONG',
 ('sgs/nav-drawer','closeOffset'):'MARKER_WRONG_SHAPE',
 ('sgs/multi-button','columns'):'NEEDS_LAYOUT_MODE',('sgs/site-footer','columns'):'NEEDS_LAYOUT_MODE',
 ('sgs/brand-strip','fadeWidth'):'NEEDS_VARIANT_OR_TOGGLE',('sgs/process-steps','numberGap'):'NEEDS_VARIANT_OR_TOGGLE',('sgs/social-icons','iconBackground'):'NEEDS_VARIANT_OR_TOGGLE',('sgs/social-icons','iconBackgroundHover'):'NEEDS_VARIANT_OR_TOGGLE',('sgs/social-icons','iconBorderColourHover'):'NEEDS_VARIANT_OR_TOGGLE',
}
for a in ['closeFontSize','closeFontFamily','closeFontWeight','closeTextTransform','closeLetterSpacing','closeLineHeight']: HAND[('sgs/nav-drawer',a)]='NEEDS_VARIANT_OR_TOGGLE'
def classify3(e):
    r=[x for x in e['rows'] if x['css_property']][0]
    prop=r['css_property'].split(',')[0]; a=e['attr']; b=e['block']
    labels=[mm['label'] for x in e['markersNow'] for mm in x['markers']]
    if (b,a) in HAND: return HAND[(b,a)]
    if b=='sgs/accordion' and a in ctx_attrs(): return 'UID_COLLISION_CONTEXT'
    if b=='sgs/notice-banner' and a.startswith('iconCircle'): return 'NEEDS_VARIANT_OR_TOGGLE'
    if prop in('padding','margin') and r['tier_shape']=='tier_object' and not r['box_family'] and labels==['tiers']: return 'MARKER_WRONG_SHAPE'
    k=classify2(e)
    if k=='RESIDUAL': return 'UNEXPLAINED'
    return k
