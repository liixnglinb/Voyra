"""Mechanical fallback metadata sync for the four GitHub release landing pages.

No credentials, network calls or broad filesystem search. Each replacement has a
known count, and each HTML file retains balanced div markup.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPDATES = {
    "ai-chronicle": [("0.6.5", "0.6.6", 6)],
    "local-toolbox": [("0.3.0", "0.4.0", 17)],
    "checkin": [("3.8.0", "3.8.1", 6)],
    "token-monitor": [("1.9.7", "1.9.12", 7)],
}

def main():
    for slug, changes in UPDATES.items():
        path = ROOT / "public" / slug / "index.html"
        text = path.read_text(encoding="utf-8")
        original = text
        for before, after, expected in changes:
            count = text.count(before)
            if count == 0 and after in text:
                continue
            if count != expected:
                raise ValueError(f"{slug}: {before!r} expected {expected}, got {count}")
            text = text.replace(before, after)
        if text.count("<div") != text.count("</div>"):
            raise ValueError(f"{slug}: invalid div balance")
        if text != original:
            path.write_text(text, encoding="utf-8")
        print(f"{slug}: fallback release metadata synchronized")

if __name__ == "__main__":
    main()
