# 把窗台场景里的景深（BokehPass）关掉。
# 它把焦点以外全化开，手机上就是一片朦胧。
import re, sys, pathlib

p = pathlib.Path('windowsill/index.html')
s = p.read_text(encoding='utf-8')
before = s

# 1) 模糊半径归零（数字特征最稳定，minify 了也认得）
for a, b in [
    ('maxblur:.011', 'maxblur:0'),
    ('maxblur: .011', 'maxblur:0'),
    ('maxblur:0.011', 'maxblur:0'),
    ('aperture:.0006', 'aperture:0'),
    ('aperture: .0006', 'aperture:0'),
    ('aperture:0.0006', 'aperture:0'),
    ('focus:20', 'focus:200'),
]:
    s = s.replace(a, b)

# 2) 实在不行，把 addPass(bokeh) 这一行抹掉
s = re.sub(r'composer\s*\.\s*addPass\s*\(\s*bokeh\s*\)\s*;?', '', s)

if s == before:
    print('一行也没改到。把 windowsill/index.html 里含 maxblur 的那段发我。')
    sys.exit(1)

p.write_text(s, encoding='utf-8')
print('改完了，长度', len(before), '->', len(s))
