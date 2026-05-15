# Purpose & Goals

## What Tisk Is

Tisk is a **collaborative, location-aware task manager** for mobile (iOS and Android). Its core thesis: tasks are more useful when the people around you can see what you're working on and where you are.

## Target User

Small groups — friends, roommates, small teams — who want shared visibility into tasks and each other's locations without needing a full project-management tool.

## Core Feature Set (current)

| Feature | Status |
|---|---|
| Task CRUD with priority, category, due date | Done |
| Subtasks per task | Done |
| Task filtering (all / active / completed) and sorting (date / priority / category) | Done |
| Custom categories (per user, color-able) | Done |
| Friend requests by username | Done |
| Real-time friend location sharing on a Leaflet map | Done |
| Location sharing opt-in toggle per user | Done |
| Profile editing (username, name, bio) | Done |
| Settings (dark mode, notifications, private profile, share location) | Done |

## Planned Features (not yet implemented)

- **AI photo verification** — users upload a photo of a completed task; an AI model checks if the photo matches the task description and marks it verified.
- **Push notifications** — the toggle exists in settings but no notification infrastructure is wired up.
- **Dark mode** — the toggle is in settings and is persisted, but the theme is not actually applied dynamically from the stored setting. It follows the OS preference instead.
- **Profile avatar upload** — the `avatar_url` field exists on profiles but there is no upload UI.
- **Date picker** — due dates are entered as raw text (`YYYY-MM-DD`); a proper date picker component is a UX improvement.

## Non-Goals

- This is not a team project management tool (no boards, sprints, assignments to others).
- No web dashboard — mobile-first only.
