import fitz
import os

pdf_path = "public/articles/strategi-manajemen-diri.pdf"
out_dir = "public/articles/slides"

os.makedirs(out_dir, exist_ok=True)
doc = fitz.open(pdf_path)

for i in range(len(doc)):
    page = doc.load_page(i)
    pix = page.get_pixmap(dpi=150)
    out_path = os.path.join(out_dir, f"slide-{i+1}.jpg")
    pix.save(out_path)
    print(f"Saved {out_path}")

print(f"Total pages: {len(doc)}")
