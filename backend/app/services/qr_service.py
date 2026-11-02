import uuid
import os
import qrcode
from backend.app.core.config import settings

def generate_verification_stamp():
    """
    Generates a unique UUID token and creates a corresponding QR code image.
    Returns: (token_string, file_path_to_qr_image)
    """
    token = str(uuid.uuid4())
    
    qr_data = f"{settings.UPLOAD_DIR}/verify/{token}"
    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=5
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    qr_dir = os.path.join(settings.UPLOAD_DIR, "qr_codes")
    os.makedirs(qr_dir, exist_ok=True)
    qr_path = os.path.join(qr_dir, f"{token}.png")
    
    img.save(qr_path)
    
    return token, qr_path