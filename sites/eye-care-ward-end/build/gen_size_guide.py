"""Generates size-guide.tree.json: the content of Eye Care's size guide, an sgs_modal post (built with
scripts/wp-build-page.js --create sgs_modal, then --post-id on rebuilds) that the product template opens from
"Which size am I?" (#size-guide). Copy and values come from the draft (Eye Care Birmingham.dc.html, the
sgs-size-guide section)."""
import json
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'size-guide.tree.json')


def B(name, attrs=None, inner=None):
    d = {"name": name, "attributes": attrs or {}}
    if inner:
        d["innerBlocks"] = inner
    return d


def txt(text, **kw):
    return B("sgs/text", dict(text=text, **kw))


BOX = {"top": "1px", "right": "1px", "bottom": "1px", "left": "1px"}
THREE = {"desktop": "repeat(3,minmax(0,1fr))", "mobile": "repeat(3,minmax(0,1fr))"}
BIG = dict(fontFamily="heading", fontWeight="500", fontSize={"desktop": 32, "mobile": 26}, fontSizeUnit="px",
           letterSpacing={"desktop": 0.04}, letterSpacingUnit="em", textAlign="center")
CAP = dict(fontSize={"desktop": 12}, fontSizeUnit="px", letterSpacing={"desktop": 0.1}, letterSpacingUnit="em",
           textTransform="uppercase", textColour="text-label", textAlign="center")
GAP_B = {"desktop": {"bottom": "22px"}}


def ruled(rows):
    """A stack of white rows split by 1px hairlines (the draft's gap:1px on a border-coloured ground)."""
    return B("sgs/container", dict(layout="stack", contentWidth={"desktop": "full"}, gap={"desktop": "1px"},
                                   backgroundColour="border", borderWidth=BOX, borderColour="border", margin=GAP_B),
             rows)


def row(inner, pad="18px 20px", **kw):
    t, r = pad.split()
    return B("sgs/container", dict(backgroundColour="surface-alt",
                                   padding={"desktop": {"top": t, "right": r, "bottom": t, "left": r}}, **kw), inner)


def measure(title, body):
    return row([
        txt(title, fontSize={"desktop": 15.5}, fontSizeUnit="px", fontWeight="500"),
        txt(body, fontSize={"desktop": 14.5}, fontSizeUnit="px", textColour="text-muted",
            margin={"desktop": {"top": "5px"}}),
    ])


def band(name, value):
    return row([
        txt(name, fontSize={"desktop": 15}, fontSizeUnit="px"),
        txt(value, fontSize={"desktop": 15}, fontSizeUnit="px", textColour="text-muted"),
    ], pad="16px 20px", layout="flex", justifyContent="space-between", gap={"desktop": "12px"})


tree = [
    B("sgs/heading", dict(level="h2", content="Which size am I?", fontFamily="heading", fontWeight="500",
                          fontSize={"desktop": 24}, fontSizeUnit="px", margin={"desktop": {"bottom": "20px"}})),
    txt("The quickest way: pick up a pair of glasses you already like the fit of and look at the inside of the left "
        "arm. You'll find three numbers printed there.", fontSize={"desktop": 16}, fontSizeUnit="px",
        textColour="text-muted", margin={"desktop": {"bottom": "20px"}}),
    B("sgs/container", dict(backgroundColour="surface-alt", borderWidth=BOX, borderColour="border", margin=GAP_B,
                            padding={"desktop": {"top": "22px", "right": "22px", "bottom": "22px", "left": "22px"}}), [
        B("sgs/container", dict(layout="grid", gridTemplateColumns=THREE, gap={"desktop": "10px"}), [
            txt("55", **BIG), txt("▫ 18", **BIG), txt("137", **BIG)]),
        B("sgs/container", dict(layout="grid", gridTemplateColumns=THREE, gap={"desktop": "10px"},
                                margin={"desktop": {"top": "10px"}}), [
            txt("Lens width", **CAP), txt("Bridge", **CAP), txt("Temple", **CAP)]),
    ]),
    ruled([
        measure("Lens width — 42 to 62mm", "The width of one lens at its widest. This is the number that decides "
                "whether a frame looks too small or too big on you."),
        measure("Bridge — 14 to 24mm", "The gap between the lenses that sits over your nose. Too narrow and they "
                "pinch; too wide and they slide down."),
        measure("Temple — 130 to 150mm", "The length of the arm, ear bend included. I can adjust this in person, so "
                "it's the least critical of the three."),
    ]),
    ruled([
        band("Small", "lens width up to 52mm"),
        band("Medium", "53 to 57mm"),
        band("Large", "58mm and above"),
    ]),
    B("sgs/whatsapp-cta", dict(variant="card", cardTitle="Can't find the numbers?",
                               cardSubline="Send me a photo of the inside of the arm and I'll read it for you.",
                               backgroundColour="whatsapp-soft", cardBorderColour="whatsapp-line", cardBorderWidth=BOX,
                               cardBorderStyle="solid", cardTitleColour="text", cardSublineColour="text-muted")),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
