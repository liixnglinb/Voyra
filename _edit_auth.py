p = r"D:\LocalHub\src\components\AuthGate.jsx"
s = open(p, encoding="utf-8").read()

blocks = [
"""
          {/* 登录方式子 tab（仅登录模式显示） */}
          {mode === 'login' && (
            <div className="sx-tabs-sub" role="tablist">
              <button type=\"button\" role=\"tab\" aria-selected={tab === 'password'} className={'sx-tab ' + (tab === 'password' ? 'sx-on' : '')} onClick={() => switchTab('password')}>邮箱密码</button>
              <button type=\"button\" role=\"tab\" aria-selected={tab === 'otp'} className={'sx-tab ' + (tab === 'otp' ? 'sx-on' : '')} onClick={() => switchTab('otp')}>验证码</button>
            </div>
          )}
""",
"""
            {mode === 'login' && (<>
              <div className="sx-divider"><span>或</span></div>
              <button type=\"button\" className=\"sx-github\" onClick={handleGitHub}>
                <Github size={16} strokeWidth={1.9} /><span>使用 GitHub 登录</span>
              </button>
            </>)}
""",
]

for b in blocks:
    if b in s:
        s = s.replace(b, "")
        print("removed block")
    else:
        print("BLOCK NOT FOUND")

open(p, "w", encoding="utf-8").write(s)
print("done")
