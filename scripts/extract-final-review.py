"""Extract the supplied final-review PDF and render page thumbnails for inspection."""
import argparse
import json
from pathlib import Path

import pdfplumber
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("--output", default="analysis/professor-final-source.json")
parser.add_argument("--render-dir", default="tmp/pdfs/professor-final")
args = parser.parse_args()
render_dir = Path(args.render_dir)
render_dir.mkdir(parents=True, exist_ok=True)
pages = []
thumbnails = []
with pdfplumber.open(args.source) as pdf:
    for index, page in enumerate(pdf.pages, start=1):
        text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
        pages.append({"page": index, "text": text, "imageCount": len(page.images),
                      "width": float(page.width), "height": float(page.height)})
        picture = page.to_image(resolution=110).original.convert("RGB")
        picture.save(render_dir / f"page-{index:02}.png")
        picture.thumbnail((340, 480))
        tile = Image.new("RGB", (360, 510), "#ededed")
        tile.paste(picture, ((360 - picture.width) // 2, 24))
        ImageDraw.Draw(tile).text((10, 5), f"PDF page {index}", fill="black")
        thumbnails.append(tile)

for offset in range(0, len(thumbnails), 6):
    batch = thumbnails[offset:offset + 6]
    sheet = Image.new("RGB", (1080, 1020), "white")
    for number, tile in enumerate(batch):
        sheet.paste(tile, ((number % 3) * 360, (number // 3) * 510))
    sheet.save(render_dir / f"contact-{offset // 6 + 1}.png")

result = {"fileId": "prof-final", "title": "빅데이터 1~3장 교수님 최종 통합 정리",
          "sourcePath": str(Path(args.source).resolve()), "pageCount": len(pages), "pages": pages}
Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"pages": len(pages), "characters": sum(len(p["text"]) for p in pages),
                  "imageCounts": [p["imageCount"] for p in pages]}, ensure_ascii=False))
