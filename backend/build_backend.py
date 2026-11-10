"""Freeze the backend into dist/retain-backend/ (a folder with the executable and its libraries).

Run from backend/:  uv run python build_backend.py
Must run on the OS it's for: PyInstaller can't build Windows binaries on macOS or vice versa.
"""

import PyInstaller.__main__

PyInstaller.__main__.run(
    [
        "entry.py",
        "--name=retain-backend",
        "--onedir",  # a folder, not one file: starts in ~1s instead of unpacking every launch
        "--noconfirm",
        "--clean",
        "--console",  # Electron hides the window (windowsHide) and reads stdout for logs
        # Loaded by name at runtime, so PyInstaller can't see them:
        "--collect-submodules=uvicorn",
        "--collect-data=docx",  # python-docx's default template
        "--collect-submodules=ebooklib",
    ]
)
