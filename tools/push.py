"""
把本地提交推送到 GitHub，并在首次运行时引导完成认证。

为什么单独用Python 写：
  .bat 按系统代码页解析内容，UTF-8 写的中文会变成乱码，
  且行尾必须是 CRLF 否则 cmd 会吞掉每行行首字符。
  所以 .bat 保持纯 ASCII + CRLF，所有中文提示交给这里打印。

用法：
  双击 推送.bat
或
  python tools/push.py
"""
import os
import re
import subprocess
import sys


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_URL = 'https://github.com/zzzzzy2k/boring-hundred.git'
CRED = os.path.expanduser('~\\.git-credentials')


def out(s=''):
    try:
        print(s)
    except UnicodeEncodeError:
        #管道/重定向时按 OEM 代码页输出，避免乱码
        sys.stdout.reconfigure(encoding='cp%d' % (0 or 936))
        print(s)


def run(cmd, **kw):
    """执行命令并透传输出"""
    return subprocess.run(cmd, cwd=ROOT, **kw)


def step(n, total, title):
    out()
    out('=' * 58)
    out(' [%d/%d] %s' % (n, total, title))
    out('=' * 58)


def check_proxy():
    """这台机器曾写过一条指向 127.0.0.1:7890 的死代理，
    代理软件没运行时会让所有 GitHub 操作失败，且报错信息很难懂。"""
    step(1, 3, '检查 GitHub 代理配置')
    p = run(['git', 'config', '--global', '--get-regexp', r'http.*proxy'],
            capture_output=True, text=True)
    if p.returncode == 0 and p.stdout.strip():
        out('检测到全局代理配置：')
        for line in p.stdout.strip().splitlines():
            out('    ' + line)
        out()
        out('如果你的代理软件正在运行，这些配置是必要的，保持不动即可。')
        out('如果没运行，push 会失败，可执行：')
        out('    git config --global --unset-all "http.https://github.com.proxy"')
    else:
        out('没有全局代理配置，直接走网络。')


def guide_auth():
    step(2, 3, 'GitHub 认证')
    if os.path.exists(CRED):
        out('已存在凭据文件，跳过引导。')
        out('路径：%s' % CRED)
        out('如需重新认证，删掉这个文件再运行一次即可。')
        return

    out()
    out('  首次推送需要你登录 GitHub。git 会提示两项：')
    out()
    out('    Username : 你的 GitHub 用户名  ->  zzzzzy2k')
    out('    Password : 这里要填 **Token**，不是登录密码')
    out('           （GitHub 从 2021 年起就停用密码认证了）')
    out()
    out('  拿 token 只需一次，大约 1 分钟：')
    out('    1. 打开  https://github.com/settings/tokens')
    out('    2. 点最上面 Generate new token  >  Generate new token (classic)')
    out('    3. Note 随便填，比如 "my laptop"')
    out('    4. 勾选 repo 这一项（gist 勾不勾都行）')
    out('    5. 拉到最底下点 Generate token')
    out('    6. 复制那串 ghp_ 开头的字符')
    out()
    out('  粘贴到 Password 位置。粘贴时屏幕不显示字符，是正常的，')
    out('  粘完直接回车即可。')
    out()
    out('  凭据会存到 %s' % CRED)
    out('  之后以后推送都不用再输了。')
    out()


def do_push():
    step(3, 3, '推送到 origin/main')

    # 远端地址可能带不带 .git 都要能推
    p = run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True)
    if p.returncode != 0:
        run(['git', 'remote', 'add', 'origin', REPO_URL])
        out('已添加远端：%s' % REPO_URL)
    elif p.stdout.strip() not in (REPO_URL, REPO_URL[:-4]):
        run(['git', 'remote', 'set-url', 'origin', REPO_URL])
        out('远端地址已修正为：%s' % REPO_URL)

    # 有没有要推的东西
    p = run(['git', 'rev-list', '--count', 'HEAD'], capture_output=True, text=True)
    n = p.stdout.strip() or '0'
    out('本地有 %s 个提交' % n)

    p = run(['git', 'push', '-u', 'origin', 'main'])
    if p.returncode != 0:
        out()
        out('[X] 推送失败。常见原因：')
        out('    - Token 没勾 repo 权限，或已过期 -> 重新生成一个')
        out('    - 仓库名拼错 -> 确认 https://github.com/zzzzzy2k/boring-hundred')
        out('    - 网络被墙 -> 需要开启代理后重试')
        return False

    out()
    out('[OK] 推送成功')
    return True


def next_steps():
    out()
    out('=' * 58)
    out(' 下一步：开启 GitHub Pages')
    out('=' * 58)
    out()
    out('  1. 打开  https://github.com/zzzzzy2k/boring-hundred/settings/pages')
    out('  2. Source 选  Deploy from a branch')
    out('  3. Branch 选 main，目录选 / (root)')
    out('  4. 点 Save，等 1~2 分钟')
    out()
    out('  之后访问： https://zzzzzy2k.github.io/boring-hundred/')
    out()
    out('  打开后可以：')
    out('    - 安卓/桌面 Chrome：菜单里「安装应用」，装到桌面后断网可用')
    out('    - iPhone Safari：分享 -> 添加到主屏幕')
    out()


if __name__ == '__main__':
    out()
    out('  小事杂货铺 -> GitHub 推送')
    out()

    check_proxy()
    guide_auth()

    if do_push():
        next_steps()
        sys.exit(0)
    sys.exit(1)