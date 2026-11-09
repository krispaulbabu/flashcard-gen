"""SQLite storage for projects, documents, cards and settings.

Layout of the data folder (Electron passes ~/Library/Application Support/Crema):
    crema.db              the database
    documents/<id>.<ext>  a copy of every uploaded file, so moving the original doesn't break a project
"""

import json
import shutil
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from .models import Card, StoredDocument, StoredProject

SCHEMA_VERSION = 1

SCHEMA = """
CREATE TABLE projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  REAL NOT NULL
);
CREATE TABLE documents (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    size        INTEGER NOT NULL,
    stored_path TEXT NOT NULL,
    added_at    REAL NOT NULL
);
CREATE INDEX documents_project ON documents(project_id, added_at);
CREATE TABLE cards (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- Cards outlive their document: removing a file keeps the cards made from it.
    document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    front       TEXT NOT NULL,
    back        TEXT NOT NULL,
    difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source      TEXT,
    created_at  REAL NOT NULL
);
CREATE INDEX cards_project ON cards(project_id, created_at);
CREATE TABLE settings (
    id    INTEGER PRIMARY KEY CHECK (id = 1),
    value TEXT NOT NULL
);
"""


class NotFound(Exception):
    pass


class Store:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.files_dir = data_dir / "documents"
        self.files_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = data_dir / "crema.db"
        with self._db() as db:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version == 0:
                db.executescript(SCHEMA)
                db.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
            elif version > SCHEMA_VERSION:
                raise RuntimeError("This database was made by a newer version of Crema.")

    @contextmanager
    def _db(self) -> Iterator[sqlite3.Connection]:
        # A connection per call: FastAPI runs sync endpoints on a thread pool.
        db = sqlite3.connect(self.db_path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("PRAGMA journal_mode = WAL")
        try:
            with db:  # commits, or rolls back on error
                yield db
        finally:
            db.close()

    # Projects

    def list_projects(self) -> list[StoredProject]:
        with self._db() as db:
            projects = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
            docs = db.execute("SELECT * FROM documents ORDER BY added_at, rowid").fetchall()
            cards = db.execute("SELECT * FROM cards ORDER BY created_at, rowid").fetchall()
        by_id = {p["id"]: StoredProject(id=p["id"], name=p["name"], documents=[], cards=[]) for p in projects}
        for d in docs:
            by_id[d["project_id"]].documents.append(_doc(d))
        for c in cards:
            by_id[c["project_id"]].cards.append(_card(c))
        return list(by_id.values())

    def create_project(self, name: str) -> StoredProject:
        project_id = str(uuid.uuid4())
        with self._db() as db:
            db.execute("INSERT INTO projects VALUES (?, ?, ?)", (project_id, name, time.time()))
        return StoredProject(id=project_id, name=name, documents=[], cards=[])

    def rename_project(self, project_id: str, name: str) -> None:
        with self._db() as db:
            if db.execute("UPDATE projects SET name = ? WHERE id = ?", (name, project_id)).rowcount == 0:
                raise NotFound

    def delete_project(self, project_id: str) -> None:
        with self._db() as db:
            paths = [r[0] for r in db.execute("SELECT stored_path FROM documents WHERE project_id = ?", (project_id,))]
            if db.execute("DELETE FROM projects WHERE id = ?", (project_id,)).rowcount == 0:
                raise NotFound
        for p in paths:
            Path(p).unlink(missing_ok=True)

    # Documents

    def add_documents(self, project_id: str, files: list[tuple[str, str]]) -> tuple[list[StoredDocument], list[str]]:
        """Copy each (source path, display name) into the data folder. Returns (added, names that failed)."""
        added, failed = [], []
        with self._db() as db:
            if not db.execute("SELECT 1 FROM projects WHERE id = ?", (project_id,)).fetchone():
                raise NotFound
            for src, name in files:
                doc_id = str(uuid.uuid4())
                dest = self.files_dir / f"{doc_id}{Path(name).suffix.lower()}"
                try:
                    shutil.copyfile(src, dest)
                except OSError:
                    failed.append(name)
                    continue
                size = dest.stat().st_size
                db.execute(
                    "INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?)",
                    (doc_id, project_id, name, size, str(dest), time.time()),
                )
                added.append(StoredDocument(id=doc_id, name=name, size=size))
        return added, failed

    def documents_for_generation(self, project_id: str) -> list[sqlite3.Row]:
        with self._db() as db:
            if not db.execute("SELECT 1 FROM projects WHERE id = ?", (project_id,)).fetchone():
                raise NotFound
            return db.execute(
                "SELECT id, name, stored_path FROM documents WHERE project_id = ? ORDER BY added_at, rowid",
                (project_id,),
            ).fetchall()

    def delete_document(self, doc_id: str) -> None:
        with self._db() as db:
            row = db.execute("SELECT stored_path FROM documents WHERE id = ?", (doc_id,)).fetchone()
            if not row:
                raise NotFound
            db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        Path(row[0]).unlink(missing_ok=True)

    # Cards

    def add_cards(self, project_id: str, cards: list[Card]) -> None:
        now = time.time()
        with self._db() as db:
            db.executemany(
                "INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    # Same timestamp for the batch; rowid keeps their order.
                    (c.id, project_id, c.document_id, c.front, c.back, c.difficulty, c.source, now)
                    for c in cards
                ],
            )

    def set_card_difficulty(self, card_id: str, difficulty: str) -> None:
        with self._db() as db:
            if db.execute("UPDATE cards SET difficulty = ? WHERE id = ?", (difficulty, card_id)).rowcount == 0:
                raise NotFound

    # Settings (one JSON blob; the renderer owns its shape)

    def get_settings(self) -> dict:
        with self._db() as db:
            row = db.execute("SELECT value FROM settings WHERE id = 1").fetchone()
        return json.loads(row[0]) if row else {}

    def put_settings(self, value: dict) -> None:
        with self._db() as db:
            db.execute(
                "INSERT INTO settings VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
                (json.dumps(value),),
            )


def _doc(row: sqlite3.Row) -> StoredDocument:
    return StoredDocument(id=row["id"], name=row["name"], size=row["size"])


def _card(row: sqlite3.Row) -> Card:
    return Card(
        id=row["id"],
        front=row["front"],
        back=row["back"],
        difficulty=row["difficulty"],
        source=row["source"],
        document_id=row["document_id"],
    )
