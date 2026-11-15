#!/usr/bin/env python3
# 0006: pasang deployer v2 (patch idempoten + terhubung dengan updater lama). Bukan patch halaman.
import os, sys, subprocess
d = '/usr/local/bin/niscaya-deploy'
if os.path.exists(d) and 'auto-deploy v2' in open(d).read():
    print("0006: deployer v2 sudah terpasang"); sys.exit(0)
if os.geteuid() != 0:
    sys.exit(0)
subprocess.run(['bash', '-c', 'curl -fsSL "https://raw.githubusercontent.com/tojiwaram-cell/akadifa/main/niscaya/deploy.sh?t=$(date +%s)" -o /tmp/niscaya-deploy-v2.sh && bash -n /tmp/niscaya-deploy-v2.sh && install -m 755 /tmp/niscaya-deploy-v2.sh /usr/local/bin/niscaya-deploy && /usr/local/bin/niscaya-deploy'])
print("0006: deployer v2 dipasang")
sys.exit(0)
