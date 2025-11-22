# Roofing Intelligence Guide

**Version:** 1.0

## Overview
This guide explains how to leverage the Roofing Estimation Intelligence prompt pack to increase bid accuracy and win rates.

## Requirements
- Access to a Large Language Model (ChatGPT Plus, Claude 3 Opus/Sonnet, or similar).
- Basic project data (square footage, material preference, site conditions).

## Workflow
1. **Pre-Bid Analysis**: Use `prompts/pre-bid-analysis.txt` with your raw client notes to extract key requirements and missing information.
2. **Cost Calculation**: Use `prompts/cost-calculation.txt` to generate a baseline estimate range based on current market averages (verify locally).
3. **Risk Assessment**: Run `prompts/risk-assessment.txt` to identify safety hazards or logistical challenges that could eat into margins.

## Best Practices
- **Anonymize Data**: Remove client PII (Personally Identifiable Information) before pasting into public LLMs.
- **Verify Outputs**: AI provides estimates, not guarantees. Always double-check specific material prices with your local supplier.

## FAQ
**Q: Can this replace my estimator?**
A: No. It is a tool to speed up their work and catch errors.

**Q: Which AI model is best?**
A: We recommend models with strong reasoning capabilities like Claude 3.5 Sonnet or GPT-4o.
