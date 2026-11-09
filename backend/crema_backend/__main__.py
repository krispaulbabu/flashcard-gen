"""Entry point: `python -m crema_backend --port 8765 --data-dir <folder> [--reload]` (token in CREMA_TOKEN).

Electron starts this with a random port and a per-launch token, and is the only caller.
"""

import argparse
import asyncio
import hmac
import os
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Request

from .generate import generate
from .llm import LLMError
from .models import (
    AddDocumentsRequest,
    AddDocumentsResponse,
    CardUpdate,
    DocumentRef,
    GenerateRequest,
    GenerateResponse,
    ProjectName,
    StoredProject,
)
from .store import NotFound, Store

ACCEPTED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt", ".epub"}

_store: Store | None = None


def store() -> Store:
    # Opened lazily from the environment, because with --reload the app runs in a fresh
    # worker process that never sees main()'s arguments.
    global _store
    if _store is None:
        _store = Store(Path(os.environ["CREMA_DATA_DIR"]))
    return _store


@asynccontextmanager
async def lifespan(_app: FastAPI):
    store()  # fail at startup, not on the first request, if the database can't be opened
    exit_with_parent()
    yield


app = FastAPI(title="Crema backend", docs_url=None, redoc_url=None, lifespan=lifespan)


def require_token(x_crema_token: str = Header(default="")) -> None:
    # Only the Electron app that started us knows the token; other local programs can't call in.
    expected = os.environ.get("CREMA_TOKEN", "")
    if not expected or not hmac.compare_digest(x_crema_token, expected):
        raise HTTPException(status_code=401, detail="Bad token")


def not_found(what: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"That {what} no longer exists.")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


auth = [Depends(require_token)]


@app.get("/projects", response_model=list[StoredProject], dependencies=auth)
def list_projects() -> list[StoredProject]:
    return store().list_projects()


@app.post("/projects", response_model=StoredProject, dependencies=auth)
def create_project(body: ProjectName) -> StoredProject:
    return store().create_project(body.name.strip())


@app.patch("/projects/{project_id}", dependencies=auth)
def rename_project(project_id: str, body: ProjectName) -> dict:
    try:
        store().rename_project(project_id, body.name.strip())
    except NotFound:
        raise not_found("project")
    return {"ok": True}


@app.delete("/projects/{project_id}", dependencies=auth)
def delete_project(project_id: str) -> dict:
    try:
        store().delete_project(project_id)
    except NotFound:
        raise not_found("project")
    return {"ok": True}


@app.post("/projects/{project_id}/documents", response_model=AddDocumentsResponse, dependencies=auth)
def add_documents(project_id: str, body: AddDocumentsRequest) -> AddDocumentsResponse:
    files = [(f.path, f.name) for f in body.files if Path(f.name).suffix.lower() in ACCEPTED_EXTENSIONS]
    rejected = [f.name for f in body.files if Path(f.name).suffix.lower() not in ACCEPTED_EXTENSIONS]
    try:
        added, failed = store().add_documents(project_id, files)
    except NotFound:
        raise not_found("project")
    return AddDocumentsResponse(documents=added, failed=failed + rejected)


@app.delete("/documents/{doc_id}", dependencies=auth)
def delete_document(doc_id: str) -> dict:
    try:
        store().delete_document(doc_id)
    except NotFound:
        raise not_found("document")
    return {"ok": True}


@app.post("/projects/{project_id}/cards/generate", response_model=GenerateResponse, dependencies=auth)
async def generate_cards(
    project_id: str,
    req: GenerateRequest,
    request: Request,
    # Added by Electron's main process from the key saved in Settings (never stored here).
    x_openrouter_key: str = Header(default=""),
) -> GenerateResponse:
    api_key = x_openrouter_key.strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="Add your OpenRouter API key in Settings → AI provider.")
    try:
        rows = store().documents_for_generation(project_id)
    except NotFound:
        raise not_found("project")
    if not rows:
        raise HTTPException(status_code=400, detail="Add a document before generating cards.")
    docs = [DocumentRef(id=r["id"], name=r["name"], path=r["stored_path"]) for r in rows]
    # Cancel = Electron drops the connection. FastAPI wouldn't stop on its own (and would still
    # save the cards), so run the work as a task and cancel it when the caller goes away.
    task = asyncio.create_task(generate(docs, req, api_key))
    while not task.done():
        await asyncio.wait({task}, timeout=0.5)
        if not task.done() and await request.is_disconnected():
            task.cancel()
            raise HTTPException(status_code=499, detail="Cancelled.")
    try:
        result = task.result()
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    store().add_cards(project_id, result.cards)
    return result


@app.patch("/cards/{card_id}", dependencies=auth)
def update_card(card_id: str, body: CardUpdate) -> dict:
    try:
        store().set_card_difficulty(card_id, body.difficulty)
    except NotFound:
        raise not_found("card")
    return {"ok": True}


@app.get("/settings", dependencies=auth)
def get_settings() -> dict:
    return store().get_settings()


@app.put("/settings", dependencies=auth)
def put_settings(body: dict) -> dict:
    store().put_settings(body)
    return {"ok": True}


def exit_with_parent() -> None:
    """Electron's quit handler doesn't run on a crash or force quit, so also watch for it to disappear."""
    pid = int(os.environ.get("CREMA_PARENT_PID") or 0)
    if not pid:
        return

    def watch() -> None:
        while True:
            time.sleep(2)
            try:
                os.kill(pid, 0)  # signal 0: only checks the process exists
            except ProcessLookupError:
                os._exit(0)
            except PermissionError:
                pass  # exists, owned by someone else (shouldn't happen, but isn't "gone")

    threading.Thread(target=watch, daemon=True).start()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--data-dir", type=Path, required=True)
    # Dev only: restart when backend code changes, so edits apply without restarting the app.
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()
    os.environ["CREMA_DATA_DIR"] = str(args.data_dir.resolve())

    if args.reload:
        exit_with_parent()  # the reloader process; each worker also watches, via lifespan
        uvicorn.run(
            "crema_backend.__main__:app",
            host="127.0.0.1",
            port=args.port,
            log_level="info",
            reload=True,
            reload_dirs=[str(Path(__file__).parent)],
        )
    else:
        uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")


if __name__ == "__main__":
    main()
