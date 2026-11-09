"""Turn an uploaded file into plain text, keeping page numbers where the format has them."""

from dataclasses import dataclass
from pathlib import Path


class ExtractionError(Exception):
    """A document couldn't be read; the message is shown to the user."""


@dataclass
class Page:
    number: int | None  # None for formats without pages (txt, md, docx)
    text: str


def extract_pages(path: str) -> list[Page]:
    p = Path(path)
    if not path or not p.is_file():
        raise ExtractionError("File not found. It may have been moved or deleted since it was added.")

    suffix = p.suffix.lower()
    try:
        if suffix == ".pdf":
            pages = _pdf(p)
        elif suffix == ".docx":
            pages = _docx(p)
        elif suffix == ".epub":
            pages = _epub(p)
        elif suffix in (".md", ".txt"):
            pages = [Page(None, p.read_text(encoding="utf-8", errors="replace"))]
        else:
            raise ExtractionError(f"Unsupported file type: {suffix or 'none'}.")
    except ExtractionError:
        raise
    except Exception as e:  # corrupt or password-protected files, etc.
        raise ExtractionError(f"Couldn't read this file ({type(e).__name__}).") from e

    pages = [Page(pg.number, pg.text.strip()) for pg in pages if pg.text.strip()]
    if not pages:
        if suffix == ".pdf":
            raise ExtractionError("No text found. This looks like a scanned PDF, which isn't supported yet.")
        raise ExtractionError("No text found in this file.")
    return pages


def _pdf(p: Path) -> list[Page]:
    import pymupdf

    with pymupdf.open(p) as doc:
        if doc.needs_pass:
            raise ExtractionError("This PDF is password-protected.")
        return [Page(i + 1, page.get_text("text")) for i, page in enumerate(doc)]


def _docx(p: Path) -> list[Page]:
    import docx

    d = docx.Document(str(p))
    parts = [para.text for para in d.paragraphs]
    for table in d.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text for cell in row.cells))
    return [Page(None, "\n".join(parts))]


def _epub(p: Path) -> list[Page]:
    import ebooklib
    from bs4 import BeautifulSoup
    from ebooklib import epub

    book = epub.read_epub(str(p), options={"ignore_ncx": True})
    chapters = []
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        text = BeautifulSoup(item.get_content(), "html.parser").get_text("\n")
        chapters.append(Page(None, text))
    return chapters


def chunk_pages(pages: list[Page], max_chars: int) -> list[list[Page]]:
    """Group consecutive pages into chunks of at most ~max_chars, splitting oversized pages."""
    chunks: list[list[Page]] = []
    current: list[Page] = []
    size = 0
    for page in pages:
        pieces = [page.text[i : i + max_chars] for i in range(0, len(page.text), max_chars)] or [""]
        for piece in pieces:
            if current and size + len(piece) > max_chars:
                chunks.append(current)
                current, size = [], 0
            current.append(Page(page.number, piece))
            size += len(piece)
    if current:
        chunks.append(current)
    return chunks
