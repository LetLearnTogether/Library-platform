import io
from pathlib import Path

import pymupdf
import qrcode
from PIL import Image, ImageDraw

from app.core.config import PUBLIC_FRONTEND_URL


def create_verification_overlay(document_id: int, verification_token: str, approved_at=None) -> bytes:
    qr_image = qrcode.make(f"{PUBLIC_FRONTEND_URL}/verify/{verification_token}").convert("RGB")
    qr_image = qr_image.resize((180, 180))

    stamp = Image.new("RGBA", (330, 220), (255, 255, 255, 0))
    draw = ImageDraw.Draw(stamp)
    stamp.paste(qr_image.convert("RGBA"), (12, 24))

    draw.ellipse((205, 52, 305, 152), outline=(22, 101, 52, 255), width=4)
    draw.ellipse((211, 58, 299, 146), outline=(22, 101, 52, 255), width=1)
    draw.text((225, 74), "VERIFIED", fill=(22, 101, 52, 255))
    draw.text((223, 94), "LetLearn", fill=(22, 101, 52, 255))
    draw.text((220, 112), "Together", fill=(22, 101, 52, 255))
    draw.text((205, 164), f"Document #{document_id}", fill=(30, 41, 59, 255))
    draw.text((205, 184), verification_token[:18], fill=(71, 85, 105, 255))
    if approved_at:
        draw.text((205, 202), approved_at.strftime("%Y-%m-%d"), fill=(71, 85, 105, 255))

    output = io.BytesIO()
    stamp.save(output, format="PNG")
    return output.getvalue()


def stamp_document(
    file_path: Path,
    content_type: str,
    document_id: int,
    verification_token: str,
    approved_at=None,
) -> None:
    overlay = create_verification_overlay(document_id, verification_token, approved_at)
    if content_type == "application/pdf":
        stamp_pdf(file_path, overlay)
    else:
        stamp_image(file_path, content_type, overlay)


def stamp_pdf(file_path: Path, overlay: bytes) -> None:
    try:
        pdf = pymupdf.open(file_path)
    except pymupdf.FileDataError:
        return
    if pdf.page_count == 0:
        pdf.close()
        return

    overlay_image = pymupdf.Pixmap(overlay)
    stamp_width, stamp_height = overlay_image.width, overlay_image.height
    for page in pdf:
        page_rect = page.rect
        scale = min(150 / stamp_width, 95 / stamp_height)
        width = stamp_width * scale
        height = stamp_height * scale
        rect = pymupdf.Rect(
            page_rect.width - width - 18,
            page_rect.height - height - 18,
            page_rect.width - 18,
            page_rect.height - 18,
        )
        page.insert_image(rect, stream=overlay, overlay=True)

    temporary_path = file_path.with_name(f"{file_path.stem}.stamp.tmp.pdf")
    pdf.save(temporary_path, garbage=4, deflate=True)
    pdf.close()
    temporary_path.replace(file_path)


def stamp_image(file_path: Path, content_type: str, overlay: bytes) -> None:
    with Image.open(file_path) as source:
        document_image = source.convert("RGBA")
        stamp = Image.open(io.BytesIO(overlay)).convert("RGBA")
        stamp_width = max(1, min(max(180, int(document_image.width * 0.34)), document_image.width - 24))
        stamp_height = int(stamp.height * stamp_width / stamp.width)
        stamp = stamp.resize((stamp_width, stamp_height), Image.Resampling.LANCZOS)
        document_image.alpha_composite(
            stamp,
            (document_image.width - stamp_width - 12, document_image.height - stamp_height - 12),
        )

        temporary_path = file_path.with_name(f"{file_path.stem}.stamp.tmp{file_path.suffix}")
        if content_type == "image/jpeg":
            document_image.convert("RGB").save(temporary_path, format="JPEG")
        elif content_type == "image/webp":
            document_image.save(temporary_path, format="WEBP")
        else:
            document_image.save(temporary_path, format="PNG")
    temporary_path.replace(file_path)