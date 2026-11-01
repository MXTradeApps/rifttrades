#!/bin/sh
# Xcode's Flutter "Run Script" / scheme prepare hook. Ensures DART_DEFINES
# include the Supabase env file when the build was started from Xcode rather
# than `flutter run --dart-define-from-file=…`.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DART_DEFINES="$(/usr/bin/env python3 "$SCRIPT_DIR/../../tool/xcode_dart_defines.py")"
export DART_DEFINES
exec /bin/sh "$FLUTTER_ROOT/packages/flutter_tools/bin/xcode_backend.sh" "$@"
