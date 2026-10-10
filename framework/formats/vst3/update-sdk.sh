#!/usr/bin/env bash
# Re-vendors the parts of the Steinberg VST3 SDK that Aether uses into ./sdk.
#
#   framework/formats/vst3/update-sdk.sh [tag]
#
# The SDK is MIT-licensed since 3.8 (see docs/framework/vst3-sdk.md). Only the plugin side
# (base, pluginterfaces, public.sdk sources) and the tools the build uses later
# (validator, moduleinfotool) are copied; VSTGUI, docs, examples and AU/AAX wrappers are not.
set -euo pipefail

TAG="${1:-v3.8.1_build_84}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HERE/sdk"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$TAG" \
    https://github.com/steinbergmedia/vst3sdk.git "$WORK/vst3sdk"
git -C "$WORK/vst3sdk" submodule update --quiet --init --depth 1 \
    base pluginterfaces public.sdk
COMMIT="$(git -C "$WORK/vst3sdk" rev-parse HEAD)"

SRC="$WORK/vst3sdk"
rm -rf "$DEST"
mkdir -p "$DEST/public.sdk/source" "$DEST/public.sdk/samples"

cp "$SRC/LICENSE.txt" "$DEST/"
cp -R "$SRC/base" "$SRC/pluginterfaces" "$DEST/"
cp "$SRC/public.sdk/LICENSE.txt" "$SRC/public.sdk/README.md" "$DEST/public.sdk/"
cp -R "$SRC/public.sdk/source/common" "$SRC/public.sdk/source/main" \
    "$SRC/public.sdk/source/vst" "$DEST/public.sdk/source/"
rm -rf "$DEST/public.sdk/source/vst/"{aaxwrapper,auv3wrapper,auwrapper,basewrapper,interappaudio}

mkdir -p "$DEST/public.sdk/samples/vst-hosting" "$DEST/public.sdk/samples/vst-utilities"
cp -R "$SRC/public.sdk/samples/vst-hosting/validator" "$DEST/public.sdk/samples/vst-hosting/"
cp -R "$SRC/public.sdk/samples/vst-utilities/moduleinfotool" \
    "$DEST/public.sdk/samples/vst-utilities/"

# Git metadata of the submodules is not part of the vendored copy.
find "$DEST" -name .git -prune -exec rm -rf {} +

cat > "$DEST/VERSION" <<EOF
Steinberg VST3 SDK
tag:    $TAG
commit: $COMMIT
source: https://github.com/steinbergmedia/vst3sdk
EOF

echo "Vendored VST3 SDK $TAG ($COMMIT) into $DEST"
