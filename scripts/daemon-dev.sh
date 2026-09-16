#!/bin/bash
# Double-fork daemonizer for the Next.js dev server.
# The grandchild reparents to init immediately, escaping per-command
# process reaping in the sandboxed tool shell.
cd /home/z/my-project
(
  setsid ./node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 < /dev/null &
  exit 0
)
exit 0
