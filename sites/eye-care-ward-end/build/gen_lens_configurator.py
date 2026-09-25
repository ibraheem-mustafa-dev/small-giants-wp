"""Generates lens-configurator.tree.json: Eye Care's lens configurator, saved as a Choice Flow (sgs_choice_flow
post, slug lens-configurator; built with scripts/wp-build-page.js --create sgs_choice_flow --slug
lens-configurator, then --post-id on rebuilds). The product template shows it through a linked sgs/choice-flow
(flowId lens-configurator) inside a full-screen sgs/modal that "Add my prescription" opens (#lens-configurator),
Spec 43 FR-43-6.
Copy, options and help text come from the draft (Eye Care Birmingham.dc.html, "---- lens flow ----" and the
sgs-lens-configurator section). Prices are NOT here: each priced question names a group of the site-wide
add-on price list (woo-seed/addon-prices.json, seeded with `wp sgs addon-prices seed`), which is the only
price authority (Spec 43 FR-43-17/18). Option pictures are eye-care-test media 447-458, rendered from the
draft's own SVGs (sites/eye-care-ward-end/assets/lens-options/)."""
import json
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lens-configurator.tree.json')
MEDIA = 'https://darkcyan-grouse-898606.hostingersite.com/wp-content/uploads/2026/09/'


def B(name, attrs=None, inner=None):
    d = {"name": name, "attributes": attrs or {}}
    if inner:
        d["innerBlocks"] = inner
    return d


def img(media_id, file):
    # Decorative illustrations: the option label carries the meaning.
    return {"id": media_id, "url": MEDIA + file, "alt": ""}


def opt(value, label, media_id, file, help_text, **extra):
    o = {"label": label, "value": value, "nextStepId": "", "image": img(media_id, file), "helpText": help_text}
    o.update(extra)
    return o


H2 = dict(level="h2", fontFamily="heading", fontWeight="500", fontSize={"desktop": 40, "mobile": 30},
          fontSizeUnit="px", lineHeight={"desktop": 1.05}, lineHeightUnit="unitless",
          margin={"desktop": {"bottom": "8px"}})
INTRO = dict(fontSize={"desktop": 15.5}, fontSizeUnit="px", textColour="text-muted",
             margin={"desktop": {"bottom": "26px"}})


def step(label, heading, intro, question):
    return B("sgs/form-step", {"label": label}, [
        B("sgs/heading", dict(H2, content=heading)),
        B("sgs/text", dict(INTRO, text=intro)),
        question,
    ])


use = B("sgs/choice-flow-question", dict(layout="grid", priceGroup="lens-use", options=[
    opt("distance", "Distance", 455, "use-distance.png",
        "Uses the main line of your prescription. This is what most people want in sunglasses — sharp vision "
        "looking ahead and into the distance."),
    opt("reading", "Reading", 457, "use-reading.png",
        "For reading in the garden or by the pool. Uses the “ADD” value on your prescription. You won't want to "
        "drive in these."),
    opt("varifocal", "Varifocal", 458, "use-varifocal.png",
        "Distance at the top, reading at the bottom, blended in between with no visible line. Usually for "
        "over-40s. I take the fitting measurements from a photo or in person."),
    opt("none", "No prescription", 456, "use-none.png",
        "Adds the frame to your bag exactly as the brand made it, with its original tinted lenses. You can always "
        "add prescription lenses later.", nextStepId="__terminal__", addToBagNow=True),
]))

thickness = B("sgs/choice-flow-question", dict(layout="grid", priceGroup="lens-thickness", options=[
    opt("std", "Standard · 1.5", 451, "thickness-std.png",
        "The standard lens material. Perfectly good for a mild prescription — going thinner would make no visible "
        "difference and cost you money for nothing."),
    opt("thin", "Thin · 1.6", 452, "thickness-thin.png",
        "Noticeably slimmer at the edge and lighter on your nose. The usual choice once your prescription gets past "
        "about ±2.00."),
    opt("xthin", "Extra thin · 1.67", 454, "thickness-xthin.png",
        "Worth it for a stronger prescription — it stops the lens edge standing proud of the frame and reduces the "
        "way strong lenses distort how your eyes look."),
    opt("ultra", "Ultra thin · 1.74", 453, "thickness-ultra.png",
        "The thinnest lens material available. If your prescription is strong, this is the difference between "
        "glasses you want to wear and glasses you tolerate."),
]))

finish = B("sgs/choice-flow-question", dict(layout="grid", priceGroup="lens-finish", options=[
    opt("tint", "Tinted to match", 450, "finish-tint.png",
        "I match the tint to the lenses the brand fitted, so the frame looks exactly as designed. Nobody will know "
        "they're prescription."),
    opt("pol", "Polarised", 449, "finish-pol.png",
        "A filter that cuts reflected glare rather than just dimming everything. If you drive a lot or spend time "
        "near water, this is the upgrade worth paying for."),
    opt("photo", "Light-reactive", 448, "finish-photo.png",
        "One pair that works indoors and out. Worth knowing they react to UV, so they stay lighter behind a car "
        "windscreen."),
    opt("clear", "Clear", 447, "finish-clear.png",
        "Sunglasses frames make excellent everyday glasses. Anti-reflective coating both sides, included."),
]))

tree = [
    B("sgs/choice-flow", dict(title="Add prescription lenses", maxWidth="1200px", progressStyle="bar",
                              showPricePanel=True, pricePanelTitle="Your order"), [
        step("What they're for", "What will you use them for?",
             "Your prescription tells you which. If there's an “ADD” column on it, varifocal is probably what "
             "you're after.", use),
        step("How thin", "How thin would you like them?",
             "Thinner lenses are lighter and sit neater in the frame. If you don't know your numbers, Standard is a "
             "safe pick — I'll check when your prescription arrives and tell you if something thinner is worth it.",
             thickness),
        step("Finish", "What finish?",
             "All of them block 100% of UV and come scratch-resistant.", finish),
        B("sgs/form-step", {"label": "Your bag"}, [
            B("sgs/choice-flow-result", dict(
                action="add-to-bag", heading="Ready for your bag",
                body="Your frame and lenses go in together. I'll ask for your prescription at checkout — you don't "
                     "need it to hand now, and nothing gets made until I've checked it.")),
        ]),
    ]),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
