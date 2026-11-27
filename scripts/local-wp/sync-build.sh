#!/usr/bin/env bash
# Copies the repo's built plugins and theme into the local WSL mirror sites.
# Usage (from Windows): wsl -d Ubuntu -u root -- bash /mnt/c/Users/Bean/Projects/small-giants-wp/scripts/local-wp/sync-build.sh <local-eye-care|local-sandybrown|local-indus|local-mamas|local-sgs|local-mic|all>
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${1:-}"

# Refuse a missing or partial plugin build: rsync --delete would otherwise empty the site's build/ (a stopped
# `npm run build` cleans build/ before it writes). Every src block needs its built block.json.
check_build() {
  local src built
  src="$(find "$REPO/plugins/sgs-blocks/src/blocks" -mindepth 2 -maxdepth 2 -name block.json | wc -l)"
  built="$(find "$REPO/plugins/sgs-blocks/build/blocks" -mindepth 2 -maxdepth 2 -name block.json 2>/dev/null | wc -l)"
  if [ "$built" -eq 0 ] || [ "$built" -lt "$src" ]; then
    echo "Refusing to sync: plugins/sgs-blocks/build has $built built blocks, src has $src. Build first, or copy a green build from ~/.cache/sgs-deploy/<key>/build." >&2
    exit 1
  fi
}

# A tree on a Windows drive (/mnt/<x>/...) is read one file at a time through WSL's file bridge, which crawls when
# several syncs run at once (25 to 60 minutes for the plugin's ~7,000 files). Windows' own tar.exe packs it on the
# Windows side in seconds; the one archive crosses the bridge, unpacks under /tmp and is rsynced locally. A tree inside
# WSL, or a machine without tar.exe, is rsynced directly. Usage: copy_tree SRC DEST [EXCLUDE...] where each EXCLUDE is a
# top-level name (src, tests) or a name excluded anywhere (node_modules).
#
# tar.exe packs only what the checkout holds: the files git tracks, new files not yet committed (untracked and not
# ignored) and the gitignored folders a site loads (KEEP_IGNORED). Other gitignored files stay behind; in the shared
# checkout they are hundreds of MB (a reference plugin checkout in sgs-blocks/stackable, generative-background runs,
# caches). The folder is packed whole instead when git is missing, lists nothing (a copy that is not a checkout, or a
# folder its repo ignores) or lists a path that is not plain ASCII (tar.exe reads a list file in the Windows code page).
WINTAR=/mnt/c/Windows/System32/tar.exe
WINGIT="$(command -v git.exe || true)"
[ -n "$WINGIT" ] || WINGIT="/mnt/c/Program Files/Git/cmd/git.exe"
KEEP_IGNORED="build vendor styles"
# The pack's archive and list sit in the checkout beside SRC; an interrupted sync removes them on exit.
SYNC_TEMP=()
trap 'rm -rf "${SYNC_TEMP[@]}"' EXIT
# Writes the NUL-separated list of paths to pack (relative to SRC) to LIST; fails when git cannot list SRC or the list
# should not be used (see above).
pack_list() {
  local src="$1" list="$2" winsrc p held
  [ -x "$WINGIT" ] || return 1
  winsrc="$(wslpath -w "$src")"
  held="$(mktemp -d /tmp/sgs-sync-list.XXXXXX)"
  SYNC_TEMP+=("$held")
  "$WINGIT" -C "$winsrc" ls-files -z --deduplicate --cached --others --exclude-standard > "$held/all" || return 1
  "$WINGIT" -C "$winsrc" ls-files -z --deleted > "$held/gone" || return 1
  [ -s "$held/all" ] || return 1
  LC_ALL=C grep -qaP '[^\x00-\x7F]' "$held/all" && return 1
  local -A gone=()
  while IFS= read -r -d '' p; do gone["$p"]=1; done < "$held/gone"
  # Built under /tmp and written to LIST once: LIST sits on the Windows drive, where each append crosses the bridge.
  {
    while IFS= read -r -d '' p; do
      case "$p" in build/*|vendor/*|styles/*) continue ;; esac
      [ -n "${gone[$p]:-}" ] || printf '%s\0' "$p"
    done < "$held/all"
    for p in $KEEP_IGNORED; do
      if [ -e "$src/$p" ]; then printf '%s\0' "$p"; fi
    done
  } > "$held/out"
  cp "$held/out" "$list"
}
copy_tree() {
  local src="$1" dest="$2"; shift 2
  local rs=() tx=() name
  # tar.exe (bsdtar) matches an exclude anywhere in the path, so "./src" would also drop vendor/*/*/src: it skips only
  # node_modules (excluded everywhere anyway); the top-level names are excluded by the local rsync, which anchors them.
  for name in "$@"; do
    if [ "$name" = node_modules ]; then rs+=(--exclude=node_modules); tx+=(--exclude node_modules)
    else rs+=(--exclude="/$name"); fi
  done
  if [[ "$src" == /mnt/* ]] && [ -x "$WINTAR" ]; then
    local stage tarw tarl listl what try
    # mktemp makes the stage owner-only (700) and rsync -a copies the stage's own mode onto the destination folder, which
    # would leave the plugin or theme folder unreadable to every reader but www-data (the route reads it from Windows).
    stage="$(mktemp -d /tmp/sgs-sync.XXXXXX)"; chmod 755 "$stage"
    tarl="$(dirname "$src")/.sgs-sync-$$-$(basename "$src").tar"
    tarw="$(wslpath -w "$tarl")"
    listl="$tarl.list"
    SYNC_TEMP+=("$stage" "$tarl" "$listl")
    # A file another session deletes between the listing and the pack makes tar.exe fail: the second try lists afresh.
    for try in 1 2; do
      if pack_list "$src" "$listl"; then
        what=(--null -T "$(wslpath -w "$listl")")
      else
        rm -f "$listl"; what=(.)
        echo "copy_tree: packing the whole of $src (git gave no usable list)" >&2
      fi
      # -h follows links: the deploy's isolated worktree links vendor/ packages from the shared checkout, and an
      # unfollowed link would arrive as nothing (the mirror then fatals on the autoloader's missing files).
      if (cd "$src" && "$WINTAR" -chf "$tarw" "${tx[@]}" "${what[@]}") && tar -xf "$tarl" -C "$stage"; then
        rm -f "$tarl" "$listl"
        rsync -a --delete "${rs[@]}" "$stage/" "$dest/"
        rm -rf "$stage"
        return
      fi
      rm -f "$tarl" "$listl"; rm -rf "$stage"
      stage="$(mktemp -d /tmp/sgs-sync.XXXXXX)"; chmod 755 "$stage"
      SYNC_TEMP+=("$stage")
    done
    rm -rf "$stage"
    echo "copy_tree: tar.exe packing failed for $src; falling back to rsync over the file bridge" >&2
  fi
  rsync -a --delete "${rs[@]}" "$src/" "$dest/"
}

sync_site() {
  local site="$1" dir="/var/www/$1"
  [ -d "$dir/wp-content" ] || { echo "Missing $dir" >&2; exit 1; }
  echo "== $site"

  # The theme.json its test site runs: the client snapshot a deploy ships there, so default paint measured here
  # carries that snapshot's paint key (mirror_theme_json.py).
  # Worked out before anything is copied: a theme.json that cannot be resolved stops the sync with the copy untouched.
  local tj
  tj="$(mktemp)"
  # A scratch copy (scratch-mirror.sh) runs the theme.json of the mirror it was copied from.
  local tj_site="$site"
  [ -f "$dir/.scratch-source" ] && tj_site="$(cat "$dir/.scratch-source")"
  if [ -f "$dir/.scratch-target" ]; then
    # A scratch copy that holds a test site's own database runs that site's theme.json (scratch-mirror.sh target).
    python3 "$REPO/scripts/local-wp/mirror_theme_json.py" --target "$(cat "$dir/.scratch-target")" "$tj"
  else
    python3 "$REPO/scripts/local-wp/mirror_theme_json.py" "$tj_site" "$tj"
  fi

  # sgs-blocks: the built plugin without sources, tests or dev dependencies.
  copy_tree "$REPO/plugins/sgs-blocks" "$dir/wp-content/plugins/sgs-blocks" node_modules src tests .phpunit.cache

  # Every other plugins/sgs-* folder that already exists on this site's copy.
  for p in "$REPO"/plugins/sgs-*/; do
    name="$(basename "$p")"
    [ "$name" = "sgs-blocks" ] && continue
    if [ -d "$dir/wp-content/plugins/$name" ]; then
      copy_tree "${p%/}" "$dir/wp-content/plugins/$name" node_modules tests .phpunit.cache
    fi
  done

  copy_tree "$REPO/theme/sgs-theme" "$dir/wp-content/themes/sgs-theme" node_modules
  install -m 644 "$tj" "$dir/wp-content/themes/sgs-theme/theme.json"
  rm -f "$tj"

  # Mirror-only must-use plugins (calibration's render-context switch, scripts/local-wp/mu-plugins/): installed here,
  # never deployed to a hosted site.
  mkdir -p "$dir/wp-content/mu-plugins"
  install -m 644 "$REPO"/scripts/local-wp/mu-plugins/*.php "$dir/wp-content/mu-plugins/"

  chown -R www-data:www-data "$dir/wp-content/plugins" "$dir/wp-content/themes" "$dir/wp-content/mu-plugins"
  sudo -u www-data wp --path="$dir" cache flush
}

case "$TARGET" in
  local-eye-care|local-sandybrown|local-indus|local-mamas|local-sgs|local-mic|local-mediatest*|all) check_build ;;
esac

case "$TARGET" in
  local-eye-care|local-sandybrown|local-indus|local-mamas|local-sgs|local-mic) sync_site "$TARGET" ;;
  local-mediatest*) [ -f "/var/www/$TARGET/.scratch-source" ] || { echo "$TARGET is not a scratch copy (scratch-mirror.sh)" >&2; exit 1; }; sync_site "$TARGET" ;;
  all) sync_site local-eye-care; sync_site local-sandybrown; sync_site local-indus; sync_site local-mamas; sync_site local-sgs; sync_site local-mic ;;
  *) echo "Usage: $0 <local-eye-care|local-sandybrown|local-indus|local-mamas|local-sgs|local-mic|all|local-mediatest-*>" >&2; exit 2 ;;
esac
