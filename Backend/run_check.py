import sys
import json
import traceback
import importlib
from pathlib import Path


def main():
    # Startup check that validates Python syntax + imports.
    # Note: importing app.py may still attempt MongoDB connection in module scope.
    # We use a best-effort import and report the exact failure.
    try:
        repo_root = Path(__file__).resolve().parent
        sys.path.insert(0, str(repo_root))
        # app.py expects to be imported as top-level module `app`
        import app as app_module  # noqa: F401
        print(json.dumps({"ok": True, "message": "Backend app.py imported successfully."}))
    except Exception:
        print(json.dumps({"ok": False, "error": traceback.format_exc()}))


if __name__ == "__main__":
    main()

