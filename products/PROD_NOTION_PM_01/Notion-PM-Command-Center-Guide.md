# PM Command Center Guide

## The Structure
The system relies on 3 core databases connected by Relations:
1. **Projects**: High-level initiatives.
2. **Tasks**: Atomic units of work.
3. **Meetings**: Chronological log.

## Relations
- Every **Task** belongs to a **Project**.
- Every **Meeting** can link to a **Project**.

## Dashboards
- **"My Day"**: Filters tasks where `Assignee = Me` and `Date = Today`.
- **"Executive View"**: Shows only Projects with `Status` and `Timeline`.
