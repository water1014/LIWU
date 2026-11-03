#!/usr/bin/env python3
"""可选步骤：把多文件工程压成一个可离线分享的 HTML。

日常开发不需要跑这个脚本，直接用浏览器打开 index.html 即可。
只有在需要发给别人一个文件、或贴到不支持多文件的平台时才打包。

用法：python3 build.py
产物：dist/liwu.standalone.html
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'dist' / 'liwu.standalone.html'

CSS_DIR = ROOT / 'assets' / 'css'
JS_DIR = ROOT / 'assets' / 'js'

CSS_ORDER = [
    '01-tokens.css', '02-shell.css', '03-chat.css',
    '04-apps.css', '05-life.css', '06-parts.css', '07-us.css', '09-fix.css', '10-look.css',
]
JS_ORDER = [
    '10-icons.js', '11-db.js', '12-core.js', '13-api.js', '14-ui.js',
    '20-home.js', '21-chat.js', '30-wb-mem.js', '31-archive-store.js',
    '32-beauty-settings.js', '33-life.js', '34-stickers.js', '35-us.js', '40-main.js',
]


def bundle(path, name):
    p = path / name
    if not p.exists():
        raise SystemExit(f'缺少文件：{p.relative_to(ROOT)}')
    return p.read_text(encoding='utf-8')


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = '\n'.join(bundle(CSS_DIR, f) for f in CSS_ORDER)
    js = '\n'.join(bundle(JS_DIR, f) for f in JS_ORDER)
    vue = (ROOT / 'vendor' / 'vue.global.prod.js').read_text(encoding='utf-8')

    # 壁纸内联为 data URI，单文件也能带着桌面背景走
    for name in ('wall-window', 'wall-curtain', 'wall-fog'):
        f = ROOT / 'assets' / 'img' / (name + '.jpg')
        if f.exists():
            b64 = base64.b64encode(f.read_bytes()).decode()
            css = css.replace(f'url(assets/img/{name}.jpg)', f'url(data:image/jpeg;base64,{b64})')
            js = js.replace(f'url(assets/img/{name}.jpg)', f'url(data:image/jpeg;base64,{b64})')

    # 去掉外链，换成内联
    html = re.sub(r'\n<link rel="stylesheet"[^>]*>', '', html)
    html = re.sub(r'\n<script src="[^"]*"></script>', '', html)

    head_style = '<style>\n' + css + '\n</style>\n</head>'
    html = html.replace('</head>', head_style, 1)

    inline = (
        '<script>' + vue.replace('</script', '<\\/script') + '</script>\n'
        '<script>\n' + js + '\n</script>\n'
    )
    html = html.replace('<script>\nif (\'serviceWorker\'', '<script>\n/* standalone: 无 service worker */\nif (false && \'serviceWorker\'', 1)
    html = html.replace('</body>', inline + '</body>', 1)

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f'打包完成：{OUT} · {len(html)/1024:.1f} KB')


if __name__ == '__main__':
    main()
