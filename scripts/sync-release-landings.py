"""Mechanical fallback metadata sync for the four GitHub release landing pages.

No credentials, network calls or broad filesystem search. Each replacement has a
known count, and each HTML file retains balanced div markup.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPDATES = {
    # 2026-10-06 校准：AI 轨迹下载页当前线上是 0.6.12（index.html 内 5 处）。
    # 注意本脚本只改 public/<slug>/index.html，**不含 app-1.js 里的 `var fallback`**，
    # 那一处要一起改，否则版本代理挂掉时静态兜底会退回旧版本号。
    "ai-chronicle": [("0.6.12", "0.6.13", 5)],
    "local-toolbox": [("0.5.5", "0.5.7", 17)],
    "checkin": [("3.8.1", "3.9.0", 6)],
    "token-monitor": [("1.9.12", "2.0.0", 6)],
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
