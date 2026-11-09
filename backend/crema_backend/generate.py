"""Orchestration: documents in, deduplicated cards out."""

import asyncio
import math
import random
from collections import Counter
import re
import uuid

import httpx

from .extract import ExtractionError, chunk_pages, extract_pages
from .llm import LLMError, generate_cards_for_chunk, model_name
from .models import Card, Difficulty, DocumentError, DocumentRef, GenerateRequest, GenerateResponse

# ~25k tokens of material per request: big enough that most lecture PDFs go in one call,
# small enough that long books are split and every part gets its share of cards.
MAX_CHARS_PER_CHUNK = 100_000
MAX_PARALLEL_REQUESTS = 4
# Seconds to wait for OpenRouter's reply to one request. Free models can queue for minutes;
# better to fail with a clear message than leave the user waiting.
REPLY_TIMEOUT = 90.0
DIFFICULTIES: list[Difficulty] = ["easy", "medium", "hard"]


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


async def generate(documents: list[DocumentRef], req: GenerateRequest, api_key: str) -> GenerateResponse:
    cards: list[Card] = []
    errors: list[DocumentError] = []
    seen: set[str] = set()
    limit = asyncio.Semaphore(MAX_PARALLEL_REQUESTS)
    model = model_name(req.model)

    async with httpx.AsyncClient(timeout=httpx.Timeout(REPLY_TIMEOUT, connect=10.0)) as client:
        for doc in documents:
            try:
                pages = await asyncio.to_thread(extract_pages, doc.path)
            except ExtractionError as e:
                errors.append(DocumentError(document_id=doc.id, name=doc.name, message=str(e)))
                continue

            chunks = chunk_pages(pages, MAX_CHARS_PER_CHUNK)
            total_chars = sum(len(p.text) for chunk in chunks for p in chunk)

            async def run(i: int, chunk_pages_: list) -> list:
                # Share the card budget across chunks by how much text each holds.
                share = sum(len(p.text) for p in chunk_pages_) / max(total_chars, 1)
                count = max(1, math.ceil(req.cards_per_document * share))
                if req.difficulty == "random":
                    levels = Counter(random.choices(DIFFICULTIES, k=count))
                    mix = {d: levels[d] for d in DIFFICULTIES if levels[d]}
                else:
                    mix = {req.difficulty: count}
                async with limit:
                    cards = await generate_cards_for_chunk(
                        client,
                        document_name=doc.name,
                        pages=chunk_pages_,
                        mix=mix,
                        part=i + 1,
                        total_parts=len(chunks),
                        model=model,
                        api_key=api_key,
                    )
                if req.difficulty == "random":
                    random.shuffle(cards)  # models tend to group by level; interleave them
                return cards

            results = await asyncio.gather(*(run(i, c) for i, c in enumerate(chunks)), return_exceptions=True)

            valid_pages = {p.number for p in pages if p.number is not None}
            for result in results:
                if isinstance(result, LLMError):
                    errors.append(DocumentError(document_id=doc.id, name=doc.name, message=str(result)))
                    continue
                if isinstance(result, BaseException):
                    raise result
                for c in result:
                    key = _norm(c.front)
                    if key in seen:
                        continue  # same question asked twice, e.g. across chunks
                    seen.add(key)
                    page = c.page if c.page in valid_pages else None
                    cards.append(
                        Card(
                            id=str(uuid.uuid4()),
                            front=c.front,
                            back=c.back,
                            difficulty=c.difficulty,
                            source=f"{doc.name} · p. {page}" if page else doc.name,
                            document_id=doc.id,
                        )
                    )

    # One error per document is enough for the UI.
    unique_errors = list({e.document_id: e for e in errors}.values())
    return GenerateResponse(cards=cards, errors=unique_errors, model=model)
