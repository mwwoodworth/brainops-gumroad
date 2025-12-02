# ⚡ AI-Enhanced PM Accelerator Playbook
### Move from "Status Updater" to "Strategic Leader"

---

## 🎯 The Philosophy
Project Management isn't about updating Jira tickets; it's about **removing friction**. This toolkit uses AI to handle the administrative heavy lifting—meeting prep, status reports, risk analysis—so you can focus on leading your team.

---

## 🛠️ Core Workflows

### 1. The 5-Minute Meeting Prep
**The Problem:** Walking into meetings unprepared or spending 30 minutes reviewing notes.
**The Solution:**
1.  Open `prompts/meeting-prep.txt`.
2.  Paste in the raw transcript or notes from the previous meeting.
3.  **Result:** A structured agenda, a list of open action items, and specific "poker questions" to unblock the team.

### 2. The Executive Status Update
**The Problem:** Execs want "the big picture," not the details. You spend hours formatting slides.
**The Solution:**
1.  Open `prompts/executive-summary.txt`.
2.  Paste in your team's weekly updates (bullet points are fine).
3.  **Result:** A polished, high-level summary highlighting **Risks**, **Decisions Needed**, and **Milestones**.
4.  *Bonus:* Copy the output into `templates/weekly-status-email.md`.

### 3. Resource "Tetris" (Capacity Planning)
**The Problem:** Overbooking your best engineers/designers.
**The Solution:**
1.  Use `prompts/resource-optimization.txt`.
2.  Input current tasks and team availability.
3.  **Result:** A spotlight on bottlenecks and suggestions for rebalancing the load before burnout happens.

---

## 🧠 Best Practices

> **"Trust but Verify."**

*   **Dates & Dollars:** AI is great at text, sometimes bad at math. Always double-check budget sums and specific calendar dates.
*   **Context Window:** If you have massive documentation (e.g., a 50-page spec), summarize it in chunks or use a tool that supports large context windows (like Claude 3 Opus/Sonnet).
*   **Tone Adjustment:** The prompts are designed to be professional. If you need a more casual tone for internal Slack updates, just tell the AI: *"Rewrite this to be more casual/friendly."*

---

## 📂 Directory Structure

| Folder/File | Purpose |
| :--- | :--- |
| `prompts/` | The raw AI instructions to copy-paste. |
| `templates/` | Ready-to-use document formats (Status Reports, Kickoff Decks). |
| `video/` | (Link) Walkthrough of the system in action. |

---

## 🆘 Support
Stuck on a specific project challenge? Email **support@brainops.io**.