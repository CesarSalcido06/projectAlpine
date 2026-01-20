# Project Alpine - MVP Specification

## Overview
A minimal, dark-themed task manager with multiple calendar views and tag-based analytics.

---

## Core Features (v1.0)

### Task Management (CRUD)
- Create tasks with title, description, due date
- Edit existing tasks
- Delete tasks
- Archive completed tasks (soft delete)

### Task Properties
| Property | Type | Description |
|----------|------|-------------|
| Title | string | Required, task name |
| Description | text | Optional, details |
| Due Date | datetime | When task is due |
| Urgency | enum | Low, Medium, High, Critical |
| Category | reference | Link to category |
| Tags | array | Multiple tags per task |
| Status | enum | Pending, In Progress, Completed, Archived |
| Created At | datetime | Auto-generated |
| Updated At | datetime | Auto-generated |

### Views
- **Day View** - Tasks for a single day
- **Week View** - 7-day spread
- **Month View** - Calendar grid with task indicators

### Tags System
- Multiple tags per task
- Custom tag creation (user-defined)
- Color-coded tags
- Tag-based filtering

### Urgency Levels
- Low (green indicator) - Can wait
- Medium (yellow indicator) - Should do soon
- High (orange indicator) - Needs attention
- Critical (red indicator) - Do immediately

### Categories
- Default: General
- Custom category creation
- Category-based filtering

### Statistics & Trends
- Tasks completed per tag (over time)
- Busiest days/weeks visualization
- Difficulty distribution charts
- Tag usage frequency
- Completion rate trends

---

## UI/UX Requirements

### Theme
- **Dark-first** design
- Light mode toggle (secondary)
- High contrast for readability

### Layout
- **Minimal** - no clutter
- Clean navigation
- Focus on content
- Mobile-responsive

### Components
- Task cards (draggable where applicable)
- Quick-add input
- Filter sidebar (collapsible)
- Stats dashboard section

---

## Tech Stack

### Frontend
- Next.js 14+ (App Router)
- React 18+
- Chakra UI (dark theme)
- React Query (data fetching)
- Chart.js or Recharts (stats visualization)

### Backend
- Node.js + Express
- SQLite + Sequelize ORM
- RESTful API

### Not in MVP
- BenchAI integration (deferred)
- Real-time sync
- Multi-user/auth
- Mobile app

---

## Database Schema (Draft)

```
tasks
├── id (PRIMARY KEY)
├── title (VARCHAR)
├── description (TEXT)
├── due_date (DATETIME)
├── urgency (ENUM)
├── category_id (FK)
├── status (ENUM)
├── created_at (DATETIME)
└── updated_at (DATETIME)

categories
├── id (PRIMARY KEY)
├── name (VARCHAR)
├── color (VARCHAR)
└── is_default (BOOLEAN)

tags
├── id (PRIMARY KEY)
├── name (VARCHAR)
└── color (VARCHAR)

task_tags (junction)
├── task_id (FK)
└── tag_id (FK)
```

---

## API Endpoints (Draft)

### Tasks
- `GET /api/tasks` - List all (with filters)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete/archive task

### Categories
- `GET /api/categories` - List all
- `POST /api/categories` - Create custom
- `DELETE /api/categories/:id` - Remove custom

### Tags
- `GET /api/tags` - List all
- `POST /api/tags` - Create tag
- `DELETE /api/tags/:id` - Remove tag

### Stats
- `GET /api/stats/tags` - Tag usage over time
- `GET /api/stats/completion` - Completion rates
- `GET /api/stats/urgency` - Urgency distribution
