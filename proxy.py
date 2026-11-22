#!/usr/bin/env python3
# 里屋 · 本机中转
#
# 为什么要这个：网页是从 github.io（https）打开的，浏览器不让它直接咬
# api.deepseek.com / opencode.ai 这类接口（会被跨域挡住）。
# 这个小脚本在你手机上开一个本地小门，把请求原样转过去，再补上跨域许可。
#
# 用法（Ubuntu / 终端里）：
#     python3 proxy.py
# 然后在里屋「接线的地方」把接口地址改成：
#     http://127.0.0.1:8790/v1
# Key 和模型照旧填你自己的。
#
# 换别的接口：
#     python3 proxy.py https://api.deepseek.com 8791
# 那就把地址填成 http://127.0.0.1:8791/v1
#
# 关掉这个窗口，中转就停了。

import sys
import json
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UPSTREAM = sys.argv[1] if len(sys.argv) > 1 else 'https://opencode.ai/inference'
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8790

HOP_HEADERS = {'host', 'content-length', 'origin', 'referer', 'connection', 'accept-encoding'}


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Max-Age', '86400')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _forward(self, method):
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length) if length else None

        req = urllib.request.Request(UPSTREAM + self.path, data=body, method=method)
        for key, value in self.headers.items():
            if key.lower() in HOP_HEADERS:
                continue
            req.add_header(key, value)

        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = resp.read()
                self.send_response(resp.status)
                self._cors()
                self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
        except urllib.error.HTTPError as err:
            payload = err.read() or b'{}' 
            self.send_response(err.code)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as err:
            payload = json.dumps({'error': str(err)}).encode()
            self.send_response(502)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    def do_GET(self):
        self._forward('GET')

    def do_POST(self):
        self._forward('POST')

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print('里屋中转已启动 → ' + UPSTREAM)
    print('网页里把接口地址填成：http://127.0.0.1:' + str(PORT) + '/v1')
    print('关掉这个窗口，中转就停了。')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
