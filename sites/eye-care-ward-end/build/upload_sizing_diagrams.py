"""Uploads the Sizing tab's two frame drawings (assets/sizing/frame-front.svg and frame-side.svg, the draft's frame
strokes only; the sgs/measured-diagram block draws the dimension lines) to a site's media library over SSH, then
proves each upload kept its viewBox and has a non-zero width and height (the block sizes its overlay from them).

Idempotent: reuses the attachment whose slug already matches. Prints a JSON map {front|side: {id, url, width,
height}} for gen_single_product.py.

Usage: python upload_sizing_diagrams.py [--path domains/<site>/public_html]   (default: eye-care-test)"""
import argparse
import json
import os
import shlex
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets', 'sizing')
HOST = 'u945238940@141.136.39.73'
SSH = ['ssh', '-i', '~/.ssh/id_ed25519', '-p', '65002', HOST]
SCP = ['scp', '-i', os.path.expanduser('~/.ssh/id_ed25519'), '-P', '65002']
DRAWINGS = {
    'front': ('frame-front.svg', 'eye-care-sizing-frame-front', 'Frame drawing, front view'),
    'side': ('frame-side.svg', 'eye-care-sizing-frame-side', 'Frame drawing, side view'),
}


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        sys.exit(f'Failed ({result.returncode}): {result.stderr.strip() or result.stdout.strip()}')
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--path', default='domains/darkcyan-grouse-898606.hostingersite.com/public_html')
    args = parser.parse_args()
    wp = f'cd {shlex.quote(args.path)} && wp --user=Claude'
    out = {}
    for view, (file_name, slug, title) in DRAWINGS.items():
        existing = run(SSH + [f'{wp} post list --post_type=attachment --name={slug} --field=ID'])
        if existing:
            attachment = existing.splitlines()[0]
        else:
            remote_tmp = f'{slug}.svg'
            run(SCP + [os.path.join(ASSETS, file_name), f'{HOST}:{remote_tmp}'])
            attachment = run(SSH + [f'{wp} media import ~/{remote_tmp} --title={shlex.quote(title)} --porcelain && rm -f ~/{remote_tmp}'])
            run(SSH + [f'{wp} post update {attachment} --post_name={slug}'])
        php = (
            f'$id={int(attachment)};$f=get_attached_file($id);$m=wp_get_attachment_metadata($id);'
            '$svg=(string)file_get_contents($f);'
            'echo wp_json_encode(array("url"=>wp_get_attachment_url($id),"width"=>(int)($m["width"]??0),'
            '"height"=>(int)($m["height"]??0),"viewBox"=>false!==strpos($svg,"viewBox=")));'
        )
        info = json.loads(run(SSH + [f'{wp} eval {shlex.quote(php)}']))
        if not info['viewBox'] or info['width'] <= 0 or info['height'] <= 0:
            sys.exit(f'{view}: attachment {attachment} lost its viewBox or size: {info}')
        out[view] = {'id': int(attachment), 'url': info['url'], 'width': info['width'], 'height': info['height']}
    print(json.dumps(out, indent=2))


if __name__ == '__main__':
    main()
