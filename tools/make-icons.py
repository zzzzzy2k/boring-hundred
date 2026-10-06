"""
生成 PWA 图标（纯标准库手写 PNG 编码，不依赖 PIL / Pillow）

图案：一���半开的抽屉——米色底 + 浅色抽屉面 + 陶土橙抽屉身 + 两个圆把手。
正好对应「杂货铺 / 抽屉里放小事」的意象，缩到 32px 也认得出来。

改配色或形状：直接改下面「配色」和 build() 里的坐标系常量，然后重跑本脚本。
生成的 png 会覆盖到项目根目录（它们是必须提交到git 的产物）。
"""
import zlib
import struct
import os


def write_png(path, size, draw_fn):
    """把 draw_fn(x, y) -> (r,g,b,a) 的画布编码成 PNG"""
    raw = bytearray()
    for y in range(size):
        raw.append(0)                      # PNG filter type 0 (None)
        for x in range(size):
            r, g, b, a = draw_fn(x, y)
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    return len(png)


# ---- 与 index.html 一致的配色 ----
BG     = (247, 245, 240)   # 暖米色 --bg
CREAM  = (252, 250, 246)   # 抽屉面
ACCENT = (224, 122, 95)    # 陶土橙 --accent
ACC_D  = (194, 95, 67)     # --accent-deep

SS = 4                     # 超采样倍数，越大边缘越平滑（4 已足够）


def blend(dst, src, a):
    """把 src 以覆盖率 a 叠到 dst 上"""
    return tuple(round(d + (s - d) * a) for d, s in zip(dst, src))


def cov_box(x, y, l, t, r, b):
    """点 (x,y) 对矩形 [l,r]x[t,b] 的覆盖率"""
    hits = 0
    for sy in range(SS):
        for sx in range(SS):
            px = x + (sx + 0.5) / SS
            py = y + (sy + 0.5) / SS
            if l <= px <= r and t <= py <= b:
                hits += 1
    return hits / (SS * SS)


def cov_round_box(x, y, l, t, r, b, rad):
    """圆角矩形覆盖率"""
    hits = 0
    for sy in range(SS):
        for sx in range(SS):
            px = x + (sx + 0.5) / SS
            py = y + (sy + 0.5) / SS
            if px < l or px > r or py < t or py > b:
                continue
            cx = min(max(px, l + rad), r - rad)
            cy = min(max(py, t + rad), b - rad)
            dx, dy = px - cx, py - cy
            if dx * dx + dy * dy <= rad * rad + 1e-9:
                hits += 1
    return hits / (SS * SS)


def build(size, inset_ratio):
    """
    在 100x100 相对坐标系里作画，再映射到 size x size。
    inset_ratio = 内容占整图的比例。
      普通图标 0.66  留白多些，像app 图标
      maskable 0.54 留足安全区（系统会裁成圆形/squircle，不能切到内容）
    """
    base = size * inset_ratio
    ox = oy = (size - base) / 2
    u = base / 100.0

    def P(v):
        return ox + v * u

    # 相对 100 坐标系的矩形：(left, top, right, bottom)
    body = (18, 26, 82, 88)
    face = (18, 26, 82, 60)          # 上半稍亮，暗示「打开的抽屉」
    h1   = (44, 46, 56, 52)          # 上把手
    h2   = (44, 68, 56, 74)          # 下把手

    def render(x, y):
        col = BG
        for (l, t, r, b, color, rad) in [
            (body[0], body[1], body[2], body[3], ACCENT, 7),
            (face[0], face[1], face[2], face[3], CREAM, 7),
        ]:
            a = cov_round_box(x, y, P(l), P(t), P(r), P(b), rad * u)
            if a > 0:
                col = blend(col, color, a)
        for (l, t, r, b) in [h1, h2]:
            a = cov_round_box(x, y, P(l), P(t), P(r), P(b), (b - t) / 2 * u)
            if a > 0:
                col = blend(col, ACC_D, a)
        return (col[0], col[1], col[2], 255)

    return render


def make_icon(size, maskable=False):
    if maskable:
        inner = build(size, 0.54)
        return lambda x, y: inner(x, y)

    inner = build(size, 0.66)
    rad = size * 0.225

    def draw(x, y):
        a = cov_round_box(x, y, 0, 0, size - 1, size - 1, rad)
        if a <= 0:
            return (0, 0, 0, 0)
        col = inner(x, y)
        return (col[0], col[1], col[2], round(255 * a))
    return draw


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)

    for name, size, mask in [
        ('icon-192.png',192, False),
        ('icon-512.png',              512, False),
        ('icon-maskable-192.png',     192, True),
        ('icon-maskable-512.png',     512, True),
        ('apple-touch-icon.png',      180, False),
        ('favicon-32.png',32,  False),
    ]:
        n = write_png(name, size, make_icon(size, mask))
        print(f'{name:26} {size:>3}x{size:<3} {n/1024:5.1f} KB')