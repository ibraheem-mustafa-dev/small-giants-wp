#!/bin/bash
# usage: trace.sh block attr
cd /c/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks
b=$1; a=$2
echo "##### $b :: $a"
grep -n -w "$a" src/blocks/$b/*.php src/blocks/$b/*.js src/blocks/$b/components/*.js src/blocks/$b/*.css 2>/dev/null | grep -v '^\S*:\s*[0-9]*:\s*\(//\|\*\|#\)' | cut -c1-220 | head -${3:-14}
