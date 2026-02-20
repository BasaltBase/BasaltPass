#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-up}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNDIR="$ROOT/.basaltpass-dev"
LOGDIR="$RUNDIR/logs"

mkdir -p "$LOGDIR"

backend_pid_file="$RUNDIR/backend.pid"
user_pid_file="$RUNDIR/user.pid"
tenant_pid_file="$RUNDIR/tenant.pid"
admin_pid_file="$RUNDIR/admin.pid"

backend_log="$LOGDIR/backend.log"
user_log="$LOGDIR/user.log"
tenant_log="$LOGDIR/tenant.log"
admin_log="$LOGDIR/admin.log"

pid_from_port() {
  local port="$1"
  if ! command -v ss >/dev/null 2>&1; then
    return 0
  fi

  # Example ss output contains users:(("node",pid=1234,fd=19))
  ss -ltnpH "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n1 || true
}

wait_for_port_pid() {
  local port="$1"
  local timeout_seconds="${2:-10}"

  local deadline=$((SECONDS + timeout_seconds))
  while (( SECONDS < deadline )); do
    local pid
    pid="$(pid_from_port "$port")"
    if [[ -n "$pid" ]] && is_pid_running "$pid"; then
      echo "$pid"
      return 0
    fi
    sleep 0.2
  done
  return 1
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

is_pid_listening_on_port() {
  local pid="$1"
  local port="$2"
  local port_pid
  port_pid="$(pid_from_port "$port")"
  [[ -n "$pid" ]] && [[ -n "$port_pid" ]] && [[ "$pid" == "$port_pid" ]]
}

read_pid() {
  local file="$1"
  [[ -f "$file" ]] && cat "$file" || true
}

stop_pidfile() {
  local name="$1"
  local file="$2"

  local pid
  pid="$(read_pid "$file")"
  if [[ -z "$pid" ]]; then
    return 0
  fi

  if is_pid_running "$pid"; then
    echo "Stopping $name (pid $pid)"
    kill "$pid" 2>/dev/null || true

    # wait up to ~5s
    for _ in {1..25}; do
      if ! is_pid_running "$pid"; then
        break
      fi
      sleep 0.2
    done

    if is_pid_running "$pid"; then
      echo "Force killing $name (pid $pid)"
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi

  rm -f "$file"
}

stop_port() {
  local name="$1"
  local port="$2"
  local pid_file="$3"

  local pid
  pid="$(read_pid "$pid_file")"
  if [[ -z "$pid" ]]; then
    pid="$(pid_from_port "$port")"
  fi

  if [[ -z "$pid" ]]; then
    return 0
  fi

  if is_pid_running "$pid"; then
    echo "Stopping $name on port $port (pid $pid)"
    kill "$pid" 2>/dev/null || true

    for _ in {1..25}; do
      if ! is_pid_running "$pid"; then
        break
      fi
      sleep 0.2
    done

    if is_pid_running "$pid"; then
      echo "Force killing $name (pid $pid)"
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi

  rm -f "$pid_file"
}

start_backend() {
  local existing
  existing="$(read_pid "$backend_pid_file")"
  if [[ -n "$existing" ]] && is_pid_running "$existing"; then
    echo "Backend already running (pid $existing)"
    return 0
  fi

  # If already running but pidfile is missing (manual start), adopt by port.
  local port_pid
  port_pid="$(pid_from_port 8101)"
  if [[ -n "$port_pid" ]] && is_pid_running "$port_pid"; then
    echo "Backend already running on :8101 (pid $port_pid)"
    echo "$port_pid" >"$backend_pid_file"
    return 0
  fi

  local backend_dir="$ROOT/basaltpass-backend"
  local cfg_rel="config/config.yaml"

  if [[ ! -d "$backend_dir" ]]; then
    echo "Backend directory not found: $backend_dir" >&2
    exit 1
  fi

  echo "Starting backend on :8101"
  (
    cd "$backend_dir"

    # Avoid Go toolchain mismatches when a legacy GOROOT is injected by the container.
    unset GOROOT || true

    # Only set BASALTPASS_CONFIG if the file exists.
    if [[ -f "$cfg_rel" ]]; then
      nohup env BASALTPASS_CONFIG="$cfg_rel" go run ./cmd/basaltpass >"$backend_log" 2>&1 &
    else
      nohup go run ./cmd/basaltpass >"$backend_log" 2>&1 &
    fi

    # Prefer the actual listener PID (basaltpass) once :8101 is bound.
    if listener_pid="$(wait_for_port_pid 8101 15)"; then
      echo "$listener_pid" >"$backend_pid_file"
    else
      echo $! >"$backend_pid_file"
    fi
  )
}

start_frontend() {
  local name="$1"
  local pid_file="$2"
  local log_file="$3"
  local npm_script="$4"
  local port="${5:-}"

  local existing
  existing="$(read_pid "$pid_file")"
  if [[ -n "$existing" ]] && is_pid_running "$existing"; then
    if [[ -n "$port" ]] && is_pid_listening_on_port "$existing" "$port"; then
      echo "$name already running (pid $existing)"
      return 0
    fi

    # Stale pidfile: process exists but is not listening on the expected port.
    echo "Removing stale PID for $name (pid $existing, expected :$port)"
    rm -f "$pid_file"
  fi

  # If already running but pidfile is missing (manual start), adopt by port.
  if [[ -n "$port" ]]; then
    local port_pid
    port_pid="$(pid_from_port "$port")"
    if [[ -n "$port_pid" ]] && is_pid_running "$port_pid"; then
      echo "$name already running on :$port (pid $port_pid)"
      echo "$port_pid" >"$pid_file"
      return 0
    fi
  fi

  echo "Starting $name"
  (
    cd "$ROOT/basaltpass-frontend"
    nohup npm run "$npm_script" >"$log_file" 2>&1 &

    # Prefer the actual listener PID (node) once the port is bound.
    if [[ -n "$port" ]] && listener_pid="$(wait_for_port_pid "$port" 15)"; then
      echo "$listener_pid" >"$pid_file"
    else
      echo $! >"$pid_file"
    fi
  )
}

status() {
  local bp up tp ap
  bp="$(read_pid "$backend_pid_file")"
  up="$(read_pid "$user_pid_file")"
  tp="$(read_pid "$tenant_pid_file")"
  ap="$(read_pid "$admin_pid_file")"

  # If pidfiles are missing/stale, try to infer by port.
  if [[ -z "${bp:-}" ]] || ! is_pid_running "${bp:-0}"; then bp="$(pid_from_port 8101)"; fi
  if [[ -z "${up:-}" ]] || ! is_pid_running "${up:-0}"; then up="$(pid_from_port 5101)"; fi
  if [[ -z "${tp:-}" ]] || ! is_pid_running "${tp:-0}"; then tp="$(pid_from_port 5102)"; fi
  if [[ -z "${ap:-}" ]] || ! is_pid_running "${ap:-0}"; then ap="$(pid_from_port 5103)"; fi

  echo "Repo: $ROOT"
  echo "Run dir: $RUNDIR"
  echo

  printf "%-10s %s\n" "backend" "${bp:-<none>}"; [[ -n "${bp:-}" ]] && is_pid_listening_on_port "$bp" 8101 && echo "  - running" || echo "  - stopped"
  printf "%-10s %s\n" "user" "${up:-<none>}"; [[ -n "${up:-}" ]] && is_pid_listening_on_port "$up" 5101 && echo "  - running" || echo "  - stopped"
  printf "%-10s %s\n" "tenant" "${tp:-<none>}"; [[ -n "${tp:-}" ]] && is_pid_listening_on_port "$tp" 5102 && echo "  - running" || echo "  - stopped"
  printf "%-10s %s\n" "admin" "${ap:-<none>}"; [[ -n "${ap:-}" ]] && is_pid_listening_on_port "$ap" 5103 && echo "  - running" || echo "  - stopped"

  echo
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp | grep -E ':(5101|5102|5103|8101)\b' || true
  fi
}

logs() {
  echo "Tail logs (Ctrl+C to stop):"
  echo "- $backend_log"
  echo "- $user_log"
  echo "- $tenant_log"
  echo "- $admin_log"
  echo
  tail -n 80 -f "$backend_log" "$user_log" "$tenant_log" "$admin_log"
}

healthcheck() {
  local ok=0

  # brief retries after startup
  local tries=20
  for i in $(seq 1 "$tries"); do
    curl -fsS http://127.0.0.1:8101/health >/dev/null && break
    sleep 0.2
  done
  curl -fsS http://127.0.0.1:8101/health >/dev/null && echo "8101 OK" || { echo "8101 FAIL"; ok=1; }

  for port in 5101 5102 5103; do
    for i in $(seq 1 "$tries"); do
      curl -fsS "http://127.0.0.1:$port/" >/dev/null && break
      sleep 0.2
    done
    curl -fsS "http://127.0.0.1:$port/" >/dev/null && echo "$port OK" || { echo "$port FAIL"; ok=1; }
  done
  return "$ok"
}

case "$cmd" in
  up)
    start_backend
    start_frontend "frontend-user" "$user_pid_file" "$user_log" "dev:user" 5101
    start_frontend "frontend-tenant" "$tenant_pid_file" "$tenant_log" "dev:tenant" 5102
    start_frontend "frontend-admin" "$admin_pid_file" "$admin_log" "dev:admin" 5103

    echo
    status
    echo
    echo "URLs:" 
    echo "- Backend:  http://localhost:8101/health"
    echo "- User:     http://localhost:5101/"
    echo "- Tenant:   http://localhost:5102/"
    echo "- Admin:    http://localhost:5103/"
    echo
    echo "Logs: $LOGDIR (or run: scripts/dev.sh logs)"

    # best-effort quick probe
    if command -v curl >/dev/null 2>&1; then
      echo
      echo "Health check:"
      healthcheck || true
    fi
    ;;

  down|stop)
    stop_port "frontend-admin" 5103 "$admin_pid_file"
    stop_port "frontend-tenant" 5102 "$tenant_pid_file"
    stop_port "frontend-user" 5101 "$user_pid_file"
    stop_port "backend" 8101 "$backend_pid_file"

    # extra safety if pidfiles are stale
    pkill -f "node .*vite" 2>/dev/null || true
    pkill -f "go run .*cmd/basaltpass" 2>/dev/null || true

    echo "Stopped."
    ;;

  status)
    status
    ;;

  logs)
    logs
    ;;

  health)
    healthcheck
    ;;

  *)
    echo "Usage: scripts/dev.sh {up|down|status|logs|health}" >&2
    exit 2
    ;;
esac
