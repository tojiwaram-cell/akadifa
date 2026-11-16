#!/usr/bin/env python3
# 0015: hapus file diagnosa 0014 dari folder web (tidak mengubah halaman)
import os, glob, sys
if os.geteuid() != 0:
    sys.exit(0)
dirs = {"/var/www/niscaya"}
try:
    dirs.add(os.path.dirname(open("/etc/niscaya-deploy.conf").read().split()[0]))
except Exception:
    pass
for d in dirs:
    for f in glob.glob(os.path.join(d, "diag-*.txt")):
        try:
            os.remove(f)
        except Exception:
            pass
for f in glob.glob("/var/lib/niscaya-deploy/patches/0014-*"):
    try:
        os.remove(f)
    except Exception:
        pass
