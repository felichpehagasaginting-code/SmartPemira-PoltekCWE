#!/bin/bash
# Diagnostic: namespace identity + listener reachability test
# Usage: netns-diag.sh spawn|check
PORT=3999
LOG=/tmp/mini-server.log

if [ "$1" = "spawn" ]; then
  echo "== NS identity of THIS shell:"
  echo "net: $(readlink /proc/self/ns/net)"
  echo "pid: $(readlink /proc/self/ns/pid)"
  setsid nohup python3 -m http.server $PORT --bind 0.0.0.0 > $LOG 2>&1 < /dev/null &
  disown
  SPID=$!
  sleep 2
  echo "== spawned pid: $SPID"
  echo "server net ns: $(readlink /proc/$SPID/ns/net 2>/dev/null || echo GONE)"
  echo "self curl: $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:$PORT)"
  echo "proc alive in ps: $(ps -p $SPID -o pid=,stat= 2>/dev/null || echo DEAD)"
  echo "$SPID" > /tmp/mini-server.pid
elif [ "$1" = "check" ]; then
  SPID=$(cat /tmp/mini-server.pid 2>/dev/null)
  echo "== NS identity of THIS shell:"
  echo "net: $(readlink /proc/self/ns/net)"
  echo "pid: $(readlink /proc/self/ns/pid)"
  echo "== server pid $SPID:"
  echo "proc alive in ps: $(ps -p $SPID -o pid=,stat= 2>/dev/null || echo DEAD)"
  echo "server net ns: $(readlink /proc/$SPID/ns/net 2>/dev/null || echo GONE)"
  echo "curl from here: $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:$PORT)"
  echo "listening :$PORT in /proc/net/tcp: $(grep -ci ":0F9F" /proc/net/tcp 2>/dev/null || echo 0)"
fi
