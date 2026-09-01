#!/usr/bin/env python3
"""Assemble src/* into the single self-contained editor.html.

The shipped artifact must be one file: it runs from file:// after a plain
download, where ES modules and fetch() of local files are both blocked, and no
CDN is reachable. Everything therefore has to be inlined.

Run: python3 tools/build.py
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_PARTS = ["build/schema.js", "src/palette.js", "src/engine.js", "src/presets.js", "src/ui.js"]

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

def main():
    shell = read("src/shell.html")
    css = read("src/style.css")
    js = "\n\n".join("/* ── %s ── */\n%s" % (p, read(p)) for p in JS_PARTS)

    for marker, body in (("/*__CSS__*/", css), ("/*__JS__*/", js)):
        if marker not in shell:
            raise SystemExit("marker missing from shell.html: " + marker)
        shell = shell.replace(marker, body)

    if "</script" in js:
        raise SystemExit("inlined JS contains '</script' and would break the page")

    out = os.path.join(ROOT, "editor.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(shell)
    print("wrote editor.html  (%.1f KB, no external requests)" % (len(shell.encode()) / 1024))

if __name__ == "__main__":
    main()
