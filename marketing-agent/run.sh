#!/bin/bash
# Sarah — Fun Small Talk Marketing Agent
# Orchestrated by Fred (Claude)
#
# Usage:
#   bash run.sh           — full daily brief (reddit + quora)
#   bash run.sh reddit    — Reddit pipeline only
#   bash run.sh quora     — Quora answers only
#   bash run.sh content   — Weekly content batch only
#   bash run.sh all       — Everything (reddit + quora + content)

TOOLS_DIR="$(cd "$(dirname "$0")/tools" && pwd)"

case "${1:-brief}" in
  reddit)
    echo "Sarah: Running Reddit pipeline..."
    node "$TOOLS_DIR/reddit-search.js" 15 | tee /tmp/sarah-reddit-search.txt
    POSTS_FILE=$(grep '__OUTPUT_FILE__' /tmp/sarah-reddit-search.txt | sed 's/__OUTPUT_FILE__://')
    node "$TOOLS_DIR/draft-comments.js" "$POSTS_FILE" 5
    ;;
  quora)
    echo "Sarah: Running Quora pipeline..."
    node "$TOOLS_DIR/quora-drafts.js"
    ;;
  content)
    echo "Sarah: Generating content batch..."
    node "$TOOLS_DIR/content-writer.js"
    ;;
  all)
    node "$TOOLS_DIR/daily-brief.js" --all
    ;;
  *)
    node "$TOOLS_DIR/daily-brief.js"
    ;;
esac
