import json,csv,collections
import classify_dead as C
E=json.load(open('entries.json',encoding='utf8'))
dead=[e for e in E if e['cat']=='dead']
rows=[]
for e in dead:
    rr=[x for x in e['rows'] if x['css_property']]
    if not rr: rows.append((e,'NO_CSS_PROPERTY_ROW',None)); continue
    rows.append((e,C.classify3(e),rr[0]))
cnt=collections.Counter(k for _,k,_ in rows)
print('total dead',len(dead)); [print(k,v) for k,v in cnt.most_common()]
with open('dead-classified.csv','w',newline='',encoding='utf8') as f:
    w=csv.writer(f); w.writerow(['block','attr','class','css_property','css_element','css_state','measured','site'])
    for e,k,r in rows:
        w.writerow([e['block'],e['attr'],k,r['css_property'] if r else '',r['css_element'] if r else '',r['css_state'] if r else '',e['measured'],e['site']])
