# Project Alpine

A minimal, dark-themed task manager for balancing academics and athletics.

## Vision

A clean, intuitive task management system built for students who need to juggle coursework, assignments, practice schedules, and competitions. Track your tasks, see your trends, stay on top of your game.

## MVP Features

### Task Management
- **CRUD Operations** - Create, read, update, delete tasks
- **Urgency Levels** - Low, Medium, High, Critical (color-coded)
- **Custom Tags** - Multiple tags per task, create your own
- **Custom Categories** - General default + user-defined
- **Archive System** - Soft delete for completed/old tasks

### Calendar Views
- **Day View** - Focus on today's tasks
- **Week View** - 7-day spread
- **Month View** - Full calendar grid

### Analytics & Trends
- Tag usage over time
- Completion rate tracking
- Urgency distribution
- Busiest periods visualization

## Tech Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- Chakra UI (dark theme)
- Recharts (stats visualization)

**Backend:**
- Node.js + Express
- SQLite + Sequelize ORM

## UI Design

- Dark-first theme
- Minimal layout
- Mobile-responsive
- High contrast for readability

## Project Structure

```
projectAlpine/
├── docs/           # Specifications and design docs
├── logs/           # Session logs
└── src/
    ├── frontend/   # Next.js app
    └── backend/    # Express API
```

## Status

🚧 In Development

## Links

- [MVP Specification](docs/MVP-SPEC.md)
- [Design Inspiration](docs/DESIGN-INSPIRATION.md)
