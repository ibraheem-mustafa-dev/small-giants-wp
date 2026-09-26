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


def opt(value, label, media_id, file, help_text, description="", **extra):
    o = {"label": label, "value": value, "nextStepId": "", "image": img(media_id, file), "helpText": help_text}
    if description:
        o["description"] = description
    o.update(extra)
    return o


# Step order (0-based, the flow's own DOM order): questions 0-3, then one result per path.
STEP_LATER, STEP_UPLOAD, STEP_TYPE, STEP_FRAME_ONLY = 4, 5, 6, 7

# FR-43-24 (v1.8.0): the question's title and intro paragraph are now first-class
# attributes on sgs/choice-flow-question itself (render.php emits the h3/p there,
# styled at 38px/28px in the showcase layout) — no separate sgs/heading/sgs/text
# blocks. Using those would either leave the title/intro blank (unset attribute)
# or double them up (block's own h3/p alongside the manual ones).
# Every question's title: the draft's Playfair headings are medium weight (500), not bold.
WEIGHT = "500"


def step(label, question):
    return B("sgs/form-step", {"label": label}, [question])


use = B("sgs/choice-flow-question", dict(
    layout="grid", priceGroup="lens-use", pricePrefix="from", questionFontWeight=WEIGHT,
    question="What will you use them for?",
    intro="Your prescription tells you which. If there's an “ADD” column on it, varifocal is probably what "
          "you're after.",
    options=[
    opt("distance", "Distance", 455, "use-distance.png",
        "Uses the main line of your prescription. This is what most people want in sunglasses — sharp vision "
        "looking ahead and into the distance.", description="Driving, walking about, everyday wear.", summaryText="Distance lenses"),
    opt("reading", "Reading", 457, "use-reading.png",
        "For reading in the garden or by the pool. Uses the “ADD” value on your prescription. You won't want to "
        "drive in these.", description="Close work, in the sun.", summaryText="Reading lenses"),
    opt("varifocal", "Varifocal", 458, "use-varifocal.png",
        "Distance at the top, reading at the bottom, blended in between with no visible line. Usually for "
        "over-40s. I take the fitting measurements from a photo or in person.",
        description="Near and far in one lens, no line.", summaryText="Varifocal lenses"),
    opt("none", "No prescription", 456, "use-none.png",
        "Adds the frame to your bag exactly as the brand made it, with its original tinted lenses. You can always "
        "add prescription lenses later.", description="Keep the lenses they come with.",
        nextStepId=str(STEP_FRAME_ONLY), addToBagNow=True),
]))

# Badge/default text is verbatim from the draft: thickness's "std" carries "Most people pick this"
# (Eye Care Birmingham.dc.html:1429, the `rec` flag on thickOptions:1998); the prescription step's
# "later" carries "Easiest" (dc.html:1483, the `pref` flag on rxModes:2018).
thickness = B("sgs/choice-flow-question", dict(
    layout="grid", priceGroup="lens-thickness", questionFontWeight=WEIGHT,
    question="How thin would you like them?",
    intro="Thinner lenses are lighter and sit neater in the frame. If you don't know your numbers, Standard is "
          "a safe pick — I'll check when your prescription arrives and tell you if something thinner is worth "
          "it.",
    options=[
    opt("std", "Standard · 1.5", 451, "thickness-std.png",
        "The standard lens material. Perfectly good for a mild prescription — going thinner would make no visible "
        "difference and cost you money for nothing.",
        description="Fine for most prescriptions up to about ±2.00.",
        isDefault=True, badge="Most people pick this"),
    opt("thin", "Thin · 1.6", 452, "thickness-thin.png",
        "Noticeably slimmer at the edge and lighter on your nose. The usual choice once your prescription gets past "
        "about ±2.00.", description="Around 20% thinner. For ±2.00 to ±4.00."),
    opt("xthin", "Extra thin · 1.67", 454, "thickness-xthin.png",
        "Worth it for a stronger prescription — it stops the lens edge standing proud of the frame and reduces the "
        "way strong lenses distort how your eyes look.",
        description="Around 35% thinner. For ±4.00 to ±6.00."),
    opt("ultra", "Ultra thin · 1.74", 453, "thickness-ultra.png",
        "The thinnest lens material available. If your prescription is strong, this is the difference between "
        "glasses you want to wear and glasses you tolerate.",
        description="The thinnest made. For ±6.00 and above."),
]))

# Draft's finish-step intro (dc.html:1461) also tells the shopper to watch the stage image change as they
# pick — a showcase-specific line (the compact layout has no persistent product image to watch), kept
# verbatim because the showcase stage does exactly that (FR-43-24's swap-on-selection).
finish = B("sgs/choice-flow-question", dict(
    layout="grid", priceGroup="lens-finish", questionFontWeight=WEIGHT,
    question="What finish?",
    intro="All of them block 100% of UV and come scratch-resistant. Watch the frame on the left change as you "
          "pick.",
    options=[
    opt("tint", "Tinted to match", 450, "finish-tint.png",
        "I match the tint to the lenses the brand fitted, so the frame looks exactly as designed. Nobody will know "
        "they're prescription.", description="Same colour and depth as the original lenses.", stageEffect="dim"),
    opt("pol", "Polarised", 449, "finish-pol.png",
        "A filter that cuts reflected glare rather than just dimming everything. If you drive a lot or spend time "
        "near water, this is the upgrade worth paying for.",
        description="Kills glare off water, roads and windscreens.", stageEffect="deepen"),
    opt("photo", "Light-reactive", 448, "finish-photo.png",
        "One pair that works indoors and out. Worth knowing they react to UV, so they stay lighter behind a car "
        "windscreen.", description="Clear indoors, dark outside in under a minute.", stageEffect="soften"),
    opt("clear", "Clear", 447, "finish-clear.png",
        "Sunglasses frames make excellent everyday glasses. Anti-reflective coating both sides, included.",
        description="Turn them into everyday glasses.", stageEffect="brighten"),
]))

# The draft's prescription step (dc.html:1481-1486) shows its `desc` directly under the title with no
# "?" toggle at all (unlike the three steps above) — so that copy maps to `description` here, not
# `helpText`; a `helpText` value would wrongly add a toggle button the draft never has on this step.
rx = B("sgs/choice-flow-question", dict(
    layout="grid", questionFontWeight=WEIGHT,
    # The draft's own eyebrow for this last step (so the count reads "of 3"), and its stage line.
    eyebrow="Last bit — and it can wait", summaryLabel="Prescription",
    question="Your prescription",
    intro="It needs to be under two years old and from a UK optician — whoever tested your eyes has to give "
          "you a copy if you ask. You don't need it to hand right now.",
    options=[
    {"label": "Send it later", "value": "later", "nextStepId": str(STEP_LATER),
     "description": "Order now and I'll WhatsApp you a link for it. Nothing gets made until it arrives.",
     "isDefault": True, "badge": "Easiest", "summaryText": "Sending it later"},
    {"label": "Upload a photo", "value": "upload", "nextStepId": str(STEP_UPLOAD),
     "description": "A phone photo of the paper copy is fine.", "summaryText": "Photo uploaded"},
    {"label": "Type it in", "value": "type", "nextStepId": str(STEP_TYPE),
     "description": "If you've got the numbers in front of you.", "summaryText": "Entered online"},
]))

READY = "Your frame and lenses go in together."


def result(label, heading, body, fields=None):
    """A purchase step: optional fields, then the add-to-bag result (Spec 43 FR-43-21)."""
    return B("sgs/form-step", {"label": label}, (fields or []) + [
        B("sgs/choice-flow-result", dict(action="add-to-bag", heading=heading, body=body))])


def rx_box(name, label, step, lo, hi, placeholder, required=False):
    return B("sgs/form-field-number", dict(fieldName=name, label=label, width="third", step=step, min=lo, max=hi,
                                          placeholder=placeholder, required=required))


TYPED = [
    rx_box("rx_r_sph", "Right SPH", "0.25", "-30", "30", "-2.25", True),
    rx_box("rx_r_cyl", "Right CYL", "0.25", "-10", "10", "-0.50"),
    rx_box("rx_r_axis", "Right AXIS", "1", "0", "180", "180"),
    rx_box("rx_l_sph", "Left SPH", "0.25", "-30", "30", "-2.00", True),
    rx_box("rx_l_cyl", "Left CYL", "0.25", "-10", "10", "-0.25"),
    rx_box("rx_l_axis", "Left AXIS", "1", "0", "180", "175"),
]
TYPED_HELP = ("Copy the numbers exactly, including the + or −. If a box is empty or says “DS”, leave it blank. I read "
              "every prescription myself before anything is cut.")

PHOTO = [B("sgs/form-field-file", dict(
    fieldName="rx_photo", label="Photo of your prescription", required=True,
    allowedTypes=["image/jpeg", "image/png", "image/webp"], maxSize=10,
    uploadText="Drop a photo or screenshot here",
    helpText="A phone photo of the paper copy is fine, as long as every number is readable."))]

tree = [
    # The root, matching the draft's lens dialog (dc.html "sgs-lens-configurator"):
    # - flowLayout "showcase" (FR-43-24): the full-screen stage-beside-questions layout.
    # - showHeader, the site's EC mark (media 198, ec-logo.png) at the draft's 16px height, closeStyle "text".
    # - progressCounts "current": question 1 of 4 fills a quarter, as the draft does.
    # - stepCountLabel "Question": "Question 1 of 3" (the prescription step has its own eyebrow).
    # - progressColour "accent" (#9C8B78, the draft's var(--acc)); stageColour #F3F0EB (the draft's stage and
    #   chosen-card fill, which the Eye Care palette has no token for).
    # - summaryBaseLabel "Frame" and the "Lenses · not chosen yet" placeholder line; no panel title.
    # - The WhatsApp help card: note and link verbatim, the WhatsApp icon and the palette's WhatsApp colours.
    # - The footer's "Frame only? Skip the lenses" link (it takes the "No prescription" route).
    B("sgs/choice-flow", dict(title="Add prescription lenses", progressStyle="bar", flowLayout="showcase",
                              showPricePanel=True, pricePanelTitle="", stickyFooter=True,
                              showHeader=True, closeStyle="text", headerLogoHeight=16,
                              headerLogo={"id": 198, "url": MEDIA + "ec-logo.png", "alt": ""},
                              progressColour="accent", progressCounts="current", stepCountLabel="Question",
                              stageColour="#F3F0EB", summaryBaseLabel="Frame",
                              summaryPendingLabel="Lenses", summaryPendingText="not chosen yet",
                              stageNote="Not sure which to pick?",
                              stageNoteLink={
                                  "url": "https://wa.me/4479605978",
                                  "text": "Happy to talk it through — message me and we'll choose together.",
                              },
                              stageNoteIcon="whatsapp", stageNoteIconColour="whatsapp",
                              stageNoteBorderColour="whatsapp-line", stageNoteHoverColour="whatsapp-soft",
                              skipPrompt="Frame only?", skipLabel="Skip the lenses"), [
        step("What they're for", use),
        step("How thin", thickness),
        step("Finish", finish),
        step("Your prescription", rx),
        result("Send it later", "Perfect — order now and I'll WhatsApp you a link for it.",
               "I make the lenses once it arrives, nothing is charged twice, and if you change your mind before I cut "
               "them I refund the lenses in full."),
        result("Upload a photo", "Add your photo", READY, PHOTO),
        result("Type it in", "Type in your prescription", TYPED_HELP, TYPED),
        result("Frame only", "Your frame, as the brand made it",
               "It goes in your bag with its original tinted lenses. You can add prescription lenses later."),
    ]),
]

with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(tree, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print('wrote', OUT)
