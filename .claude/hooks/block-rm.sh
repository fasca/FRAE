#!/bin/bash
# Bloque les commandes destructives (rm -rf)
COMMAND=$(jq -r '.tool_input.command // empty' < /dev/stdin)

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Commande rm -rf bloquée par hook de sécurité FRAE"
    }
  }'
else
  exit 0
fi
