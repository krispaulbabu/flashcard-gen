"""PyInstaller entry point for the frozen backend (crema-backend / crema-backend.exe).

PyInstaller needs a plain script; this just runs crema_backend's normal entry point.
"""

from crema_backend.__main__ import main

if __name__ == "__main__":
    main()
