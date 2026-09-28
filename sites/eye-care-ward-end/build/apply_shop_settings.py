"""Applies Eye Care's shop settings (the theme's Customizer > Shop Filters theme mods) to a site over SSH.
The reproducible record of those settings: re-run after a site rebuild. Values follow the draft's shop
(Eye Care Birmingham.dc.html): 270px filter column 40px from a grid of 18px gaps, "16 frames", the draft's five
sort options, and "Polarised only" (a product tag) at the bottom of the panel.

Usage: python apply_shop_settings.py [--path domains/<site>/public_html]   (default: eye-care-test)"""
import argparse
import shlex
import subprocess

SETTINGS = {
    'sgs_shop_hide_zero_decimals': '1',
    'sgs_shop_card_min_width': '250',
    'sgs_shop_col_gap': '18',
    'sgs_shop_row_gap': '18',
    'sgs_shop_narrow_layout': 'grid',
    'sgs_shop_filter_desktop_heading': '0',
    'sgs_shop_result_count_enabled': '1',
    'sgs_shop_result_count_label': 'Show %d frames',
    'sgs_shop_clear_label': 'Clear',
    'sgs_shop_filter_option_size': '13',
    'sgs_shop_filter_swatch_hover': '112',
    'sgs_shop_sort_arrow': 'browser',
    'sgs_shop_sort_size': '13.5',
    'sgs_shop_toggle_look': 'outlined',
    'sgs_shop_toggle_place': 'toolbar',
    'sgs_shop_filter_list_size': '14.5',
    'sgs_shop_filter_list_row': '7',
    'sgs_shop_filter_list_weight': '500',
    # The drawer's "Filter" heading at the draft's 22px (Bean 2026-09-28).
    'sgs_shop_filter_heading_size': '22',
    'sgs_shop_active_look': 'pills',
    'sgs_shop_active_prefix': '0',
    'sgs_shop_active_place': 'bar',
    'sgs_shop_toggle_count': '1',
    # The draft has no floating Filter button after scrolling (Bean 2026-09-27).
    'sgs_shop_sticky_trigger': '0',
    'sgs_shop_price_look': 'thin',
    'sgs_shop_gap_phone': '10',
    'sgs_shop_drawer_caps': '1',
    'sgs_shop_filter_panel_style': 'plain',
    'sgs_shop_filters_width': '270',
    'sgs_shop_layout_gap': '40',
    'sgs_shop_count_label': '%d frames',
    'sgs_shop_count_label_single': '%d frame',
    'sgs_shop_sort_biggest_saving_enabled': '1',
    'sgs_shop_sort_rrp_meta_key': '_sgs_rrp',
    'sgs_shop_sort_brand_az_enabled': '1',
    'sgs_shop_sort_menu': '\n'.join([
        'menu_order|Featured',
        'price|Price: low to high',
        'price-desc|Price: high to low',
        'sgs_biggest_saving|Biggest saving',
        'sgs_brand_az|Brand A–Z',
    ]),
    'sgs_shop_filter_boolean_enabled': '1',
    'sgs_shop_filter_boolean_source': 'tag',
    'sgs_shop_filter_boolean_term': 'polarised',
    'sgs_shop_filter_boolean_label': 'Polarised only',
    'sgs_shop_filter_boolean_position': 'bottom',
}

SSH = ['ssh', '-i', '~/.ssh/id_ed25519', '-p', '65002', 'u945238940@141.136.39.73']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--path', default='domains/darkcyan-grouse-898606.hostingersite.com/public_html')
    args = ap.parse_args()
    commands = [f'wp theme mod set {shlex.quote(k)} {shlex.quote(v)}' for k, v in SETTINGS.items()]
    remote = f'cd {shlex.quote(args.path)} && ' + ' && '.join(commands) + ' && wp theme mod list --format=csv | grep -c sgs_shop_'
    result = subprocess.run(SSH + [remote], capture_output=True, text=True, encoding='utf-8')
    print(result.stdout.strip() or result.stderr.strip())
    if result.returncode:
        raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
