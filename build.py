#!/usr/bin/env python3
"""把 src/ 下的 css / js 与 vue.js 打成单文件 liwu.html。

用法：  python3 build.py        # 产物：同目录 index.html（GitHub Pages 入口）与 liwu.html

源码分层：
  css  01-tokens.css 设计变量 → 02-shell.css 外壳与桌面 → 03-chat.css 聊天
       → 04-apps.css 其它应用 → 05-fix.css 收尾补丁
  js   10-icons / 11-db / 12-store / 13-ui / 20-home / 21-chat
       / 30-wb-mem / 31-archive-store / 32-beauty-settings / 40-main
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT / 'index.html'
COPY = ROOT / 'liwu.html'

css_files = ['01-tokens.css', '02-shell.css', '03-chat.css', '04-apps.css', '05-fix.css']
js_files = ['10-icons.js', '11-db.js', '12-store.js', '13-ui.js', '20-home.js',
            '21-chat.js', '30-wb-mem.js', '31-archive-store.js', '32-beauty-settings.js', '40-main.js']

css = '\n'.join((SRC / f).read_text() for f in css_files if (SRC / f).exists())
js = '\n'.join((SRC / f).read_text() for f in js_files if (SRC / f).exists())

vue = (ROOT / 'vue.js').read_text().replace('</script', '<\\/script')

html = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#E7E4DE">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%2317171B'/%3E%3Ctext x='16' y='22' font-size='15' font-family='Helvetica' fill='%23F2EFE9' text-anchor='middle'%3EL%3C/text%3E%3C/svg%3E">
<title>LIWU · 小手机</title>
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<noscript>需要开启 JavaScript 才能打开小手机。</noscript>
<script>{vue}</script>
<script>
{js}
</script>
</body>
</html>
"""

OUT.write_text(html)
COPY.write_text(html)
print(f'built {OUT} · {len(html)/1024:.1f} KB · css {len(css)/1024:.1f}KB js {len(js)/1024:.1f}KB')
