#!/bin/sh
# rebuild, capture render + road mask, compare. usage: tools/iter.sh [extra query]
set -e
cd "$(dirname "$0")/.."
bun run build >/dev/null
# ensure preview is up
if ! curl -sf -o /dev/null http://127.0.0.1:4173/; then
  bun run preview >/tmp/snow-avenue-preview.log 2>&1 &
  echo $! > /tmp/snow-avenue-preview.pid
  for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf -o /dev/null http://127.0.0.1:4173/ && break; sleep 0.4; done
fi
QUERY="${1:-}" xvfb-run -a -s "-screen 0 1400x2200x24" node scripts/capture.mjs
OUT=screenshots/mask.png QUERY="mask=road&${1:-}" xvfb-run -a -s "-screen 0 1400x2200x24" node scripts/capture.mjs >/dev/null
python3 tools/compare.py screenshots/render.png screenshots/mask.png
python3 tools/regions.py screenshots/render.png
