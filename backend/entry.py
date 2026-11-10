"""PyInstaller entry point for the frozen backend (retain-backend / retain-backend.exe).

PyInstaller needs a plain script; this just runs retain_backend's normal entry point.
"""

from retain_backend.__main__ import main

if __name__ == "__main__":
    main()
