import re, json, sqlite3, collections, sys
from pathlib import Path
ROOT=Path(r'C:/Users/Bean/Projects/small-giants-wp')
BL=ROOT/'plugins/sgs-blocks/src/blocks'
INC=ROOT/'plugins/sgs-blocks/includes'
CACHE=ROOT/'scripts/computed-route/cache'
H=json.load(open('helpers.json'))
c=sqlite3.connect('file:C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db?mode=ro',uri=True)
rows=[] or c.execute("select block_slug,attr_name,role,css_property,css_element,css_state,css_tier,box_family,tier_shape,source,enum_values,attr_type from block_attributes where source in ('sgs','sgs-ext','sgs-fx')").fetchall()
def strip_php(t): return re.sub(r'/\*.*?\*/','',re.sub(r'(?m)^\s*(//|#).*$','',t),flags=re.S)
def strip_js(t): return re.sub(r'/\*.*?\*/','',re.sub(r'(?m)^\s*//.*$','',t),flags=re.S)
def split_args(s,i):
    d=1;cur=[];out=[];q=None
    while i<len(s) and d>0:
        ch=s[i]
        if q:
            cur.append(ch)
            if ch==chr(92): cur.append(s[i+1:i+2]); i+=2; continue
            if ch==q: q=None
        elif ch in "'\"": q=ch;cur.append(ch)
        elif ch=='(': d+=1;cur.append(ch)
        elif ch==')':
            d-=1
            if d==0: out.append(''.join(cur)); return out
            cur.append(ch)
        elif ch==',' and d==1: out.append(''.join(cur));cur=[]
        else: cur.append(ch)
        i+=1
    return out
