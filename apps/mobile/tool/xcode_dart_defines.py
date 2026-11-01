#!/usr/bin/env python3
"""Emit DART_DEFINES for Xcode builds of the mobile app.

`String.fromEnvironment` is compile-time only. `flutter run` /
`flutter build` pass `--dart-define-from-file`, but hitting Run in Xcode
does not, so the app used to throw in `SupabaseConfig.assertConfigured`
and sit on a white screen.

If DART_DEFINES already contains SUPABASE_URL (Flutter CLI wrote it into
Generated.xcconfig, including a staging build), keep that value. Otherwise
encode `env/${APP_ENVIRONMENT:-production}.json` and append it.
"""

from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

MOBILE_ROOT = Path(__file__).resolve().parent.parent


def decode_defines(encoded: str) -> list[str]:
    if not encoded:
        return []
    decoded: list[str] = []
    for part in encoded.split(","):
        if not part:
            continue
        try:
            decoded.append(base64.b64decode(part).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            continue
    return decoded


def has_supabase_url(encoded: str) -> bool:
    return any(item.startswith("SUPABASE_URL=") for item in decode_defines(encoded))


def encode_env_file(path: Path) -> str:
    raw = json.loads(path.read_text())
    if not isinstance(raw, dict):
        raise SystemExit(f"{path} must be a JSON object")
    parts: list[str] = []
    for key, value in raw.items():
        parts.append(base64.b64encode(f"{key}={value}".encode()).decode("ascii"))
    return ",".join(parts)


def main() -> None:
    existing = os.environ.get("DART_DEFINES", "")
    if has_supabase_url(existing):
        sys.stdout.write(existing)
        return

    environment = os.environ.get("APP_ENVIRONMENT", "production")
    env_file = MOBILE_ROOT / "env" / f"{environment}.json"
    if not env_file.is_file():
        raise SystemExit(
            f"No Supabase env file at {env_file}. "
            "Set APP_ENVIRONMENT to production or staging."
        )

    encoded = encode_env_file(env_file)
    if existing:
        sys.stdout.write(f"{existing},{encoded}")
    else:
        sys.stdout.write(encoded)


if __name__ == "__main__":
    main()
