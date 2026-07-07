#!/usr/bin/env python3
"""Replace {{CLIENT_NAME}}, {{SLUG}}, {{DOMAIN}} tokens in every text file
under a directory, in place.

Uses plain string replacement (not regex/sed) so client names containing
characters like & or / never corrupt the substitution.

Usage: substitute.py <target-dir> <client-name> <slug> <domain>
"""
import os
import sys


def is_text_file(path):
    try:
        with open(path, "rb") as f:
            chunk = f.read(65536)
        chunk.decode("utf-8")
        return True
    except (UnicodeDecodeError, OSError):
        return False


def main():
    if len(sys.argv) != 5:
        print("usage: substitute.py <target-dir> <client-name> <slug> <domain>", file=sys.stderr)
        sys.exit(1)

    target_dir, client_name, slug, domain = sys.argv[1:5]
    replacements = {
        "{{CLIENT_NAME}}": client_name,
        "{{SLUG}}": slug,
        "{{DOMAIN}}": domain,
    }

    changed = 0
    for root, _dirs, files in os.walk(target_dir):
        for name in files:
            path = os.path.join(root, name)
            if not is_text_file(path):
                continue
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            new_content = content
            for token, value in replacements.items():
                new_content = new_content.replace(token, value)
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                changed += 1

    print(f"substituted tokens in {changed} file(s)")


if __name__ == "__main__":
    main()
