"""
Validation des fichiers uploadés par magic bytes (signature réelle du fichier).
Ne pas se fier uniquement au content_type fourni par le client — il est falsifiable.
"""

from django.core.exceptions import ValidationError

# Taille maximale autorisée : 10 Mo
MAX_FILE_SIZE = 10 * 1024 * 1024

# Signatures magic bytes : (offset, signature_bytes)
_MAGIC = {
    "application/pdf":  [(0, b"%PDF")],
    "image/jpeg":       [(0, b"\xff\xd8\xff")],
    "image/jpg":        [(0, b"\xff\xd8\xff")],
    "image/png":        [(0, b"\x89PNG\r\n\x1a\n")],
}

# Types autorisés pour chaque contexte
ALLOWED_TYPES_DOCUMENT = {"application/pdf", "image/jpeg", "image/jpg", "image/png"}
ALLOWED_TYPES_IMAGE     = {"image/jpeg", "image/jpg", "image/png"}


def _read_header(f, n=16):
    """Lit les n premiers octets du fichier uploadé sans déplacer le curseur."""
    header = f.read(n)
    f.seek(0)
    return header


def _detect_magic(header: bytes) -> str | None:
    """Retourne le MIME réel détecté par magic bytes, ou None si inconnu."""
    for mime, signatures in _MAGIC.items():
        for offset, sig in signatures:
            if header[offset: offset + len(sig)] == sig:
                return mime
    return None


def validate_upload(file, allowed_types: set[str] = ALLOWED_TYPES_DOCUMENT) -> None:
    """
    Valide un fichier uploadé :
    1. Taille ≤ MAX_FILE_SIZE
    2. Type réel (magic bytes) dans allowed_types
    Lève ValidationError en cas d'échec.
    """
    if file.size > MAX_FILE_SIZE:
        raise ValidationError(
            f"Fichier trop volumineux ({file.size // 1024} Ko). Maximum : {MAX_FILE_SIZE // 1024 // 1024} Mo."
        )

    header = _read_header(file)
    detected = _detect_magic(header)

    if detected is None or detected not in allowed_types:
        raise ValidationError(
            "Format de fichier non autorisé. Seuls PDF, JPG et PNG sont acceptés."
        )
