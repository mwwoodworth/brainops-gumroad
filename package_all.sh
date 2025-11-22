#!/usr/bin/env bash
set -euo pipefail

# Package all BrainOps Gumroad products and bundles.
# Expects each product folder to contain all customer-facing assets
# (README-start-here.md, guides, prompts/templates, videos or links, etc.).
# Output ZIPs land in ./build/

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$ROOT/build"
mkdir -p "$BUILD"

pack() {
  local dir="$1"
  local zipname="$2"
  echo "Packing $dir -> $zipname"
  (cd "$ROOT/$dir" && zip -qr "$BUILD/$zipname" .)
}

# Products
pack "products/PROD_AI_ROOF_01"     "GR-ROOFINT-v1.0.zip"
pack "products/PROD_AI_PM_01"       "GR-PMACC-v1.0.zip"
pack "products/PROD_AI_LAUNCH_01"   "GR-LAUNCH-v1.0.zip"
pack "products/PROD_AUT_ONBOARD_01" "GR-ONBOARD-v1.0.zip"
pack "products/PROD_AUT_CONTENT_01" "GR-CONTENT-v1.0.zip"
pack "products/PROD_AUT_ROOFVAL_01" "GR-ROOFVAL-v1.0.zip"
pack "products/PROD_NOTION_PM_01"   "GR-PMCMD-v1.0.zip"
pack "products/PROD_CODE_ERP_STARTER" "GR-ERP-START-v1.0.zip"
pack "products/PROD_CODE_AI_ORCHESTRATOR" "GR-AI-ORCH-v1.0.zip"
pack "products/PROD_CODE_DASHBOARD_UI" "GR-UI-KIT-v1.0.zip"

# Bundles
pack "bundles/core-ai-prompts" "GR-CORE-AI-PROMPTS-v1.0.zip"
pack "bundles/automation-pack" "GR-AUTOMATION-PACK-v1.0.zip"
pack "bundles/ultimate"        "GR-ULTIMATE-v1.0.zip"

echo "All ZIPs created in $BUILD"
