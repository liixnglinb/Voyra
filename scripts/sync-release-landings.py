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
    # 2026-10-13 校准（v0.9.0「深空工作台」）：0.8.0 × 5 处。
    "ai-chronicle": [("0.8.0", "0.9.0", 5)],
    # 2026-10-13 校准（v0.7.0 设计系统 v10）：0.6.0 × 17 处（含全部下载 URL）。
    "local-toolbox": [("0.6.0", "0.7.0", 17)],
    # 2026-10-07 学习通 v3.11.0：index.html 内 3.10.1 共 4 处（含 1 处公告文案，公告需单独改写
    # 而非机械替换版本，故实际执行时是「横幅 1 + 纯版本号 3」两步）。
    # 2026-10-13 校准（v3.13.0「深空工作台」）：3.11.2 × 3 处纯版本号 + 公告横幅单独改写。
    # 2026-10-13 校准（v3.13.1 修复设置页页签）：3.13.0 × 3 处纯版本号 + 公告横幅单独改写。
    "checkin": [("3.13.0", "3.13.1", 3)],
    # 2026-10-13 校准（v2.3.0 新图标）：2.2.1 × 7 处（含 TokenMonitor-setup 文件名）。
    "token-monitor": [("2.2.1", "2.3.0", 7)],
}

# ⚠️ 跑之前先看每个 slug 的当前命中数（v3.11.0 那轮实测）：
# - 字典按顺序执行，**ai-chronicle 若仍是旧版就会被先改写**（当时 0.6.12×5、0.6.13×0，
#   属于另一产品尚未发布，不该被本次发布顺带动到）；
# - token-monitor 两个版本都不在页面里时会在 count 断言处抛 ValueError 中断，
#   但那时 ai-chronicle 已经写盘了。
# 只发单个产品时，请临时把 UPDATES 缩到那一个 slug，或用一次性脚本（保留同样的
# 「精确命中数 + div 配平 + 无残留」断言），跑完删除。

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
