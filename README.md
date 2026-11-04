# NOVIQ store (static V1)

Run locally with a server (e.g. VS Code Live Server). Deploy on Cloudflare Pages.

## Product covers
Each card/product page draws a designed cover from its category (build = lime, learn = violet,
organize = ivory, practice = navy, bundle = violet/navy). To use your own artwork instead, add to the
product in `data/products.json`:

    "cover": "assets/products/git-guide-cover.webp",
    "cover_alt": "Git & GitHub Visual Guide cover",
    "cover_w": 800, "cover_h": 600

Covers load lazily. Use WebP, 4:3, ~800x600. Cover images replace the generated art and title,
so put the title in the image.
