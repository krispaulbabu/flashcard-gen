"""OpenRouter client: send one chunk of a document, get back validated cards."""

import json
import os

import httpx
from pydantic import ValidationError

from .extract import Page
from .models import CARD_BATCH_JSON_SCHEMA, Difficulty, LLMCard, LLMCardBatch
from .prompts import SYSTEM_PROMPT, retry_prompt, user_prompt

DEFAULT_MODEL = "anthropic/claude-sonnet-5.5"
DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"


class LLMError(Exception):
    """A request to the model failed; the message is shown to the user."""


def model_name(override: str | None = None) -> str:
    """The model from Settings, or the default when the field is empty."""
    return (override or "").strip() or DEFAULT_MODEL


def _parse(content: str) -> list[LLMCard]:
    text = content.strip()
    # Some models wrap JSON in a ```json fence despite being asked not to.
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.rsplit("```", 1)[0]
    return LLMCardBatch.model_validate(json.loads(text)).cards


async def generate_cards_for_chunk(
    client: httpx.AsyncClient,
    *,
    document_name: str,
    pages: list[Page],
    mix: dict[Difficulty, int],
    part: int,
    total_parts: int,
    model: str,
    api_key: str,
) -> list[LLMCard]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": user_prompt(
                document_name=document_name,
                pages=pages,
                mix=mix,
                part=part,
                total_parts=total_parts,
            ),
        },
    ]

    # OPENROUTER_BASE_URL: only for pointing tests at a local stand-in for OpenRouter.
    base_url = os.environ.get("OPENROUTER_BASE_URL") or DEFAULT_BASE_URL
    headers = {
        "Authorization": f"Bearer {api_key}",
        "X-Title": "Retain",
    }

    # One retry: if the reply doesn't validate, show the model the error and ask again.
    for attempt in range(2):
        body = {
            "model": model,
            "messages": messages,
            # No temperature/top_p: newer models (e.g. Claude Sonnet 5.5) don't accept them, and
            # with require_parameters below any unsupported parameter means no provider matches.
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "flashcards", "strict": True, "schema": CARD_BATCH_JSON_SCHEMA},
            },
            # Only route to providers that actually honour response_format.
            "provider": {"require_parameters": True},
        }
        try:
            res = await client.post(f"{base_url}/chat/completions", json=body, headers=headers)
        except httpx.TimeoutException as e:
            # No retry: a model that's this slow will usually be slow again.
            raise LLMError(
                f"{model} took too long to reply (over {int(client.timeout.read or 0)} s). "
                "It may be busy; try again, or pick another model in Settings → AI provider."
            ) from e
        except httpx.HTTPError as e:
            raise LLMError(f"Couldn't reach OpenRouter ({type(e).__name__}).") from e

        if res.status_code == 401:
            raise LLMError("OpenRouter rejected the API key. Check it in Settings → AI provider.")
        if res.status_code == 402:
            raise LLMError("OpenRouter says the account is out of credits.")
        if res.status_code == 404:
            raise LLMError(
                f"No OpenRouter provider can run {model} with structured output. "
                "Pick a model that lists \"structured outputs\" on openrouter.ai (Settings → AI provider)."
            )
        if res.status_code >= 400:
            try:
                detail = res.json().get("error", {}).get("message") or res.text
            except ValueError:
                detail = res.text
            raise LLMError(f"OpenRouter error {res.status_code}: {detail[:300]}")

        data = res.json()
        try:
            content = data["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as e:
            raise LLMError("OpenRouter returned an unexpected response.") from e

        try:
            return _parse(content)
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == 1:
                raise LLMError("The model's reply didn't match the card format, even after a retry.") from e
            messages += [
                {"role": "assistant", "content": content},
                {"role": "user", "content": retry_prompt(str(e)[:1500])},
            ]

    raise AssertionError("unreachable")
