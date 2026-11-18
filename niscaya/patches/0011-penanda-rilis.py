#!/usr/bin/env python3
# 0011: penanda rilis (meta tag tak terlihat) untuk memastikan VPS sudah memasang versi terbaru
import sys, re
REL = "0045"
path = sys.argv[1]; src = open(path, encoding="utf-8").read()
tag = '<meta name="niscaya-rilis" content="%s">' % REL
if tag in src: sys.exit(0)
if 'name="niscaya-rilis"' in src: src = re.sub(r'<meta name="niscaya-rilis" content="[^"]*">', tag, src, count=1)
elif "<head>" in src: src = src.replace("<head>", "<head>\n" + tag, 1)
else: sys.exit(0)
open(path, "w", encoding="utf-8").write(src); print("0011: penanda rilis", REL)
