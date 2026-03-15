#!/usr/bin/env bash
# Scripted demo for asciinema recording
# Usage: asciinema rec demo.cast -c 'bash demo.sh'

type_cmd() {
  local cmd="$1"
  echo -n "$ "
  for ((i=0; i<${#cmd}; i++)); do
    echo -n "${cmd:$i:1}"
    sleep 0.04
  done
  echo
  sleep 0.3
}

run_cmd() {
  type_cmd "$1"
  shift
  "$@"
  sleep 1.5
}

clear
echo "# MIT Dining MCP Server Demo"
echo "# Get real-time dining hall menus in Claude Code"
echo
sleep 2

type_cmd "claude mcp add mit-dining -- bunx mit-dining-mcp"
claude mcp add mit-dining -- bunx mit-dining-mcp 2>/dev/null || echo "Added stdio MCP server mit-dining"
sleep 1

echo
echo "# Now let's ask Claude about dinner tonight..."
echo
sleep 2

type_cmd "claude -p 'What's for dinner at Maseeh tonight? Keep it brief.'"
claude --allowedTools 'mcp__mit-dining__*' -p "What's for dinner at Maseeh tonight? Keep it brief — just the main entrees per station."
sleep 3

echo
echo "# Filter by dietary preference..."
echo
sleep 2

type_cmd "claude -p 'Find vegan options at Next House tonight'"
claude --allowedTools 'mcp__mit-dining__*' -p "Find vegan options at Next House tonight"
sleep 3

echo
echo "# Check the week ahead..."
echo
sleep 2

type_cmd "claude -p 'What's for lunch at Simmons tomorrow?'"
claude --allowedTools 'mcp__mit-dining__*' -p "What's for lunch at Simmons tomorrow?"
sleep 3

echo
echo "# Install: bunx mit-dining-mcp"
echo "# GitHub: github.com/hongnoul/mit-dining-mcp"
echo
sleep 3
