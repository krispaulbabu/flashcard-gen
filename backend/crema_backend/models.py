"""Pydantic models: the API's request/response shapes and the card format the LLM must return."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

Difficulty = Literal["easy", "medium", "hard"]


# ---------- What the LLM returns (validated before anything reaches the UI) ----------


class LLMCard(BaseModel):
    front: str = Field(min_length=5, max_length=400)
    back: str = Field(min_length=1, max_length=1200)
    difficulty: Difficulty
    # From the [Page N] markers in the prompt; null when the model can't tell.
    page: int | None = None

    @field_validator("front", "back")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()


class LLMCardBatch(BaseModel):
    cards: list[LLMCard]


# JSON schema sent to OpenRouter as `response_format` so the model is constrained to this shape.
# Written by hand (not model_json_schema()) because strict mode wants a flat schema with
# additionalProperties: false and every property required.
CARD_BATCH_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["cards"],
    "properties": {
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["front", "back", "difficulty", "page"],
                "properties": {
                    "front": {"type": "string", "description": "The question side."},
                    "back": {"type": "string", "description": "The answer side."},
                    "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
                    "page": {
                        "type": ["integer", "null"],
                        "description": "Page number from the nearest [Page N] marker, or null.",
                    },
                },
            },
        }
    },
}


# ---------- API ----------


class DocumentRef(BaseModel):
    id: str
    name: str
    path: str


class GenerateRequest(BaseModel):
    # "random": each card gets a random level, so one batch mixes all three.
    difficulty: Difficulty | Literal["random"] = "medium"
    cards_per_document: int = Field(default=20, ge=1, le=200)
    # OpenRouter model id from Settings; empty means the default model.
    model: str | None = Field(default=None, max_length=200)


class Card(BaseModel):
    """A card as the UI receives it (matches the renderer's Card type)."""

    id: str
    front: str
    back: str
    difficulty: Difficulty
    source: str | None = None
    document_id: str | None = None


class DocumentError(BaseModel):
    document_id: str
    name: str
    message: str


class GenerateResponse(BaseModel):
    cards: list[Card]
    errors: list[DocumentError] = []
    model: str


class StoredDocument(BaseModel):
    id: str
    name: str
    size: int


class StoredProject(BaseModel):
    id: str
    name: str
    documents: list[StoredDocument]
    cards: list[Card]


class CardUpdate(BaseModel):
    difficulty: Difficulty


class ProjectName(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class FileToAdd(BaseModel):
    path: str = Field(min_length=1)
    name: str = Field(min_length=1)


class AddDocumentsRequest(BaseModel):
    files: list[FileToAdd] = Field(min_length=1)


class AddDocumentsResponse(BaseModel):
    documents: list[StoredDocument]
    failed: list[str]
