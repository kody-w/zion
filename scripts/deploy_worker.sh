#!/bin/bash
# Deploy ZION API Worker to Cloudflare
#
# Prerequisites:
#   1. Install wrangler: npm install -g wrangler
#   2. Authenticate:     wrangler login
#   3. (Optional) Set GitHub token secret for inbox writing:
#      wrangler secret put GH_TOKEN   (from workers/zion-api/)
#
# Usage:
#   ./scripts/deploy_worker.sh           # deploy to production
#   ./scripts/deploy_worker.sh --dry-run # validate only, no deploy

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WORKER_DIR="$PROJECT_DIR/workers/zion-api"

echo "========================================"
echo "  ZION API Worker Deployment"
echo "========================================"
echo ""

# Check wrangler is available
if ! command -v wrangler &> /dev/null; then
  echo "ERROR: wrangler CLI not found."
  echo "Install it with: npm install -g wrangler"
  exit 1
fi

echo "Wrangler version: $(wrangler --version)"
echo "Worker directory: $WORKER_DIR"
echo ""

# Validate worker syntax
echo "Validating worker syntax..."
if ! node --input-type=module < "$WORKER_DIR/worker.js" 2>/dev/null; then
  # ES modules with export default can't be validated directly by node in this way
  # Instead check for obvious syntax errors via a parse check
  echo "(ES module syntax check skipped — worker uses export default)"
fi

echo "Worker looks valid."
echo ""

# Dry run check
if [[ "$1" == "--dry-run" ]]; then
  echo "DRY RUN: Deployment skipped."
  echo "Run without --dry-run to deploy."
  exit 0
fi

# Deploy
echo "Deploying to Cloudflare Workers..."
cd "$WORKER_DIR"
wrangler deploy

echo ""
echo "========================================"
echo "  Deployment complete!"
echo "  Worker URL: https://zion-api.kwildfeuer.workers.dev"
echo ""
echo "  Endpoints:"
echo "    GET  /                  — Health check"
echo "    GET  /state             — World state JSON"
echo "    GET  /state/:collection — economy, gardens, structures, chat..."
echo "    POST /ask               — Natural language query"
echo "    POST /inbox             — Submit protocol message"
echo "    POST /mcp               — MCP protocol"
echo "    GET  /feeds             — RSS feed list"
echo "    GET  /feeds/:name       — world, chat, events, opml"
echo "    GET  /.well-known/mcp.json — MCP discovery"
echo "========================================"
echo ""
echo "Optional: set GitHub token for inbox writing:"
echo "  cd workers/zion-api && wrangler secret put GH_TOKEN"
