#!/bin/sh
# rebuild, capture render + road mask, compare. usage: tools/iter.sh [extra query]
set -e
cd "$(dirname "$0")/.."
bunx vite build >/dev/null
xvfb-run -a -s "-screen 0 1400x2200x24" node scripts/capture.mjs
OUT=screenshots/mask.png QUERY=mask=road xvfb-run -a -s "-screen 0 1400x2200x24" node scripts/capture.mjs >/dev/null
python3 tools/compare.py screenshots/render.png screenshots/mask.png
