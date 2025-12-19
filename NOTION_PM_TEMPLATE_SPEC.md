# PM Command Center - Notion Template Specification
## For GR-PMCMD Product

---

## TO CREATE THIS TEMPLATE:

1. Go to https://notion.so
2. Create a new page called "PM Command Center Template"
3. Build the structure below
4. Click "Share" -> "Share to web" -> Enable "Allow duplicate as template"
5. Copy the share link and update GR-PMCMD/notion-template-link.txt

---

## TEMPLATE STRUCTURE

### Page: PM Command Center
**Icon:** Command center emoji or dashboard icon
**Cover:** Dark gradient or professional workspace image

### Section 1: Quick Dashboard (Callout Blocks)

```
[Callout] Active Projects: {{formula: count projects where status = Active}}
[Callout] Tasks Due This Week: {{formula: count tasks where due <= now() + 7d}}
[Callout] Blocked Items: {{formula: count tasks where status = Blocked}}
[Callout] Team Utilization: {{placeholder percentage}}
```

### Section 2: My Focus (Linked Database - Filtered View)
Filter: Assigned to Me AND Status != Done
Sort: Priority (High first), then Due Date
View: Board (Kanban)

### Section 3: Projects Database
**Database Properties:**
| Property | Type | Options |
|----------|------|---------|
| Name | Title | - |
| Status | Select | Not Started, Planning, Active, On Hold, Completed, Archived |
| Priority | Select | Critical, High, Medium, Low |
| Owner | Person | - |
| Start Date | Date | - |
| Target End | Date | - |
| Actual End | Date | - |
| Budget | Number | Currency |
| Spent | Number | Currency |
| Health | Select | Green, Yellow, Red |
| Category | Multi-select | Internal, Client, Product, Marketing, Operations |
| Description | Text | - |
| Related Tasks | Relation | -> Tasks Database |
| Stakeholders | Person | Multi-select |
| Risk Score | Formula | Based on overdue tasks + budget variance |

**Views:**
1. All Projects (Table)
2. Active Projects (Board by Status)
3. By Priority (Board)
4. Timeline (Timeline view)
5. My Projects (Filtered to current user)

### Section 4: Tasks Database
**Database Properties:**
| Property | Type | Options |
|----------|------|---------|
| Task | Title | - |
| Status | Status | Not Started, In Progress, In Review, Blocked, Done |
| Priority | Select | Urgent, High, Medium, Low |
| Assignee | Person | - |
| Project | Relation | -> Projects Database |
| Due Date | Date | - |
| Estimated Hours | Number | - |
| Actual Hours | Number | - |
| Tags | Multi-select | Bug, Feature, Documentation, Meeting, Research |
| Blockers | Text | - |
| Notes | Text | - |

**Views:**
1. All Tasks (Table)
2. Kanban by Status (Board)
3. My Tasks (Filtered)
4. Due This Week (Filtered + Sorted)
5. Blocked Items (Filtered: Status = Blocked)

### Section 5: Meetings Database
**Database Properties:**
| Property | Type | Options |
|----------|------|---------|
| Meeting | Title | - |
| Date | Date | With time |
| Type | Select | Standup, Planning, Review, 1:1, Client, All-Hands |
| Attendees | Person | Multi-select |
| Project | Relation | -> Projects Database |
| Agenda | Text | - |
| Notes | Text | Long text |
| Action Items | Relation | -> Tasks Database |
| Recording Link | URL | - |

**Views:**
1. Upcoming (Filtered: Date >= Today, Sorted by Date)
2. Past Meetings (Filtered: Date < Today)
3. By Project (Grouped)

### Section 6: Decisions Log Database
**Database Properties:**
| Property | Type | Options |
|----------|------|---------|
| Decision | Title | - |
| Date | Date | - |
| Project | Relation | -> Projects Database |
| Decision Maker | Person | - |
| Context | Text | - |
| Options Considered | Text | - |
| Rationale | Text | - |
| Impact | Select | High, Medium, Low |
| Status | Select | Proposed, Approved, Rejected, Revisit |

### Section 7: Risk Register Database
**Database Properties:**
| Property | Type | Options |
|----------|------|---------|
| Risk | Title | - |
| Project | Relation | -> Projects Database |
| Probability | Select | High, Medium, Low |
| Impact | Select | Critical, High, Medium, Low |
| Risk Score | Formula | Probability x Impact matrix |
| Mitigation | Text | - |
| Owner | Person | - |
| Status | Select | Open, Monitoring, Mitigated, Occurred, Closed |

---

## AUTOMATION RECIPES (Document in Template)

### Recipe 1: Weekly Status Email
```
Trigger: Every Monday 9 AM
Action: Send email with:
- Projects status summary
- Tasks due this week
- Blocked items count
```

### Recipe 2: Overdue Task Alert
```
Trigger: Task Due Date < Today AND Status != Done
Action: Send Slack/Email notification to Assignee
```

### Recipe 3: Project Health Update
```
Trigger: Any task marked Blocked
Action: Update Project Health to Yellow/Red
```

---

## QUICK START GUIDE (Include in Template)

1. **Duplicate this template** to your workspace
2. **Add your team** to the People properties
3. **Create your first project** in the Projects database
4. **Break down tasks** in the Tasks database
5. **Use the "My Focus" view** daily

---

## ESTIMATED BUILD TIME: 2-3 hours

After creating, share the public link and update:
`/home/matt-woodworth/dev/brainops-gumroad/src/GR-PMCMD/notion-template-link.txt`
