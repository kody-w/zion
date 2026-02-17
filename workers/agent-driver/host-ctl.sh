#!/bin/bash
# Manage the ZION World Host daemon on macOS
#
# Usage:
#   ./host-ctl.sh install   — Install and start the daemon
#   ./host-ctl.sh start     — Start the daemon
#   ./host-ctl.sh stop      — Stop the daemon
#   ./host-ctl.sh restart   — Restart the daemon
#   ./host-ctl.sh status    — Check if running
#   ./host-ctl.sh logs      — Tail the logs
#   ./host-ctl.sh uninstall — Stop and remove the daemon

set -e

LABEL="com.zion.world-host"
PLIST_SRC="$(cd "$(dirname "$0")" && pwd)/com.zion.world-host.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"

case "${1:-status}" in
  install)
    cp "$PLIST_SRC" "$PLIST_DST"
    launchctl load "$PLIST_DST"
    echo "✅ Installed and started. Logs: tail -f /tmp/zion-host.log"
    ;;
  uninstall)
    launchctl unload "$PLIST_DST" 2>/dev/null || true
    rm -f "$PLIST_DST"
    echo "✅ Uninstalled."
    ;;
  start)
    launchctl start "$LABEL"
    echo "✅ Started."
    ;;
  stop)
    launchctl stop "$LABEL"
    echo "✅ Stopped."
    ;;
  restart)
    launchctl stop "$LABEL" 2>/dev/null || true
    sleep 2
    launchctl start "$LABEL"
    echo "✅ Restarted."
    ;;
  status)
    if launchctl list | grep -q "$LABEL"; then
      PID=$(launchctl list | grep "$LABEL" | awk '{print $1}')
      echo "✅ Running (PID: $PID)"
      echo "Uptime log:"
      tail -3 /tmp/zion-host.log 2>/dev/null || echo "  (no logs yet)"
    else
      echo "❌ Not running"
    fi
    ;;
  logs)
    tail -f /tmp/zion-host.log
    ;;
  *)
    echo "Usage: $0 {install|uninstall|start|stop|restart|status|logs}"
    exit 1
    ;;
esac
