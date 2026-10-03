# Image slots

The CSS already looks for these files. Drop them in with these exact names and they
show up automatically on top of the built-in SVG artwork (no HTML/CSS edits needed).
Until then, the SVG fallbacks (`*-fallback.svg`) are shown.

| File | Used on | Suggested size | What it should show |
|---|---|---|---|
| `hero.webp`   | Homepage hero (full width) | 2400x1350, under ~300 KB | Modern semi on an open American highway at golden hour/dawn, dramatic sky, empty space on the LEFT for the headline, no logos or readable text |
| `driver.webp` | Homepage "How it works" + drivers.html header | 1600x1200, under ~200 KB | Confident professional truck driver (generic, not a real person) beside a rig at a truck stop |
| `fleet.webp`  | Homepage carrier section + carriers.html header | 1600x1200, under ~200 KB | Fleet of semis lined up at a terminal/yard |
| `night.webp`  | Pay calculator background band | 2400x1000, under ~200 KB | Dark night highway texture / light trails (gets darkened heavily) |

Tip: `cwebp -q 78 -resize 2400 0 in.png -o hero.webp`
