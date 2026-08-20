#!/usr/bin/env python3
"""Verify the seven release-only homepage assets against the tracked manifest."""

import argparse
import hashlib
import json
import pathlib
import sys
import zipfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "web/fixtures/reference/home-assets-manifest.json"


def expected_assets(manifest_path):
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assets = []
    for item in manifest.get("assets", []):
        if item.get("source") != "crop":
            continue
        name = pathlib.PurePosixPath(item["local"]).name
        assets.append((name, item["sha256"]))
    if len(assets) != 7:
        raise ValueError(f"expected 7 crop assets in manifest, found {len(assets)}")
    return assets


def digest(data):
    return hashlib.sha256(data).hexdigest()


def verify_directory(directory, assets):
    directory = pathlib.Path(directory)
    failures = []
    for name, expected in assets:
        path = directory / name
        if not path.is_file():
            failures.append(f"missing: {path}")
            continue
        actual = digest(path.read_bytes())
        if actual != expected:
            failures.append(f"sha256 mismatch: {path} expected={expected} actual={actual}")
    return failures


def verify_ipa(ipa_path, assets):
    failures = []
    with zipfile.ZipFile(ipa_path) as archive:
        names = archive.namelist()
        for name, expected in assets:
            suffix = "/www/static/images/" + name
            matches = [member for member in names if member.endswith(suffix)]
            if len(matches) != 1:
                failures.append(f"IPA asset count {len(matches)}: {name}")
                continue
            actual = digest(archive.read(matches[0]))
            if actual != expected:
                failures.append(f"IPA sha256 mismatch: {name} expected={expected} actual={actual}")
    return failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("target", help="asset directory, or IPA when --ipa is used")
    parser.add_argument("--ipa", action="store_true", help="verify assets inside an IPA archive")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    args = parser.parse_args()

    try:
        assets = expected_assets(pathlib.Path(args.manifest))
        failures = verify_ipa(args.target, assets) if args.ipa else verify_directory(args.target, assets)
    except Exception as exc:
        print(f"HOME ASSET VERIFY FAILED: {exc}", file=sys.stderr)
        return 1
    if failures:
        for failure in failures:
            print(f"HOME ASSET VERIFY FAILED: {failure}", file=sys.stderr)
        return 1
    print(f"HOME ASSET VERIFY PASS: {len(assets)} assets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
