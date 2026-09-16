#!/bin/bash
# Detached dev server launcher — survives the calling shell session.
cd /home/z/my-project
export PORT=3000
exec /home/z/my-project/node_modules/.bin/next dev -p 3000
