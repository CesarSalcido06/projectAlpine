# Design Inspiration

## Reference Projects

### AppFlowy
- **Repo:** https://github.com/AppFlowy-IO/AppFlowy
- **Architecture:** Flutter + Rust dual-language
- **Key Features:**
  - Kanban boards for visual task organization
  - Database/grid views for structured data
  - Block-based editor (Notion-like)
  - Local-first with optional cloud sync
  - AI integration for productivity

### Focalboard
- **Repo:** https://github.com/mattermost/focalboard
- **Architecture:** Go backend + TypeScript frontend
- **Key Features:**
  - Board view (Kanban-style)
  - List view (traditional tasks)
  - Calendar view (timeline-based)
  - Custom properties per task
  - REST API with Swagger docs

## Design Principles for Project Alpine

1. **Multi-View Flexibility** - Same data represented as list, kanban, or calendar
2. **Local-First** - SQLite storage, works offline
3. **Clean UI** - Minimal, focused, easy on the eyes
4. **Student-Focused** - Quick entry, deadline awareness, category separation (classes vs sports)
5. **BenchAI Integration** - AI-powered task suggestions, natural language input

## UI Patterns to Adopt

- Block-based task cards (draggable)
- Color-coded categories/tags
- Progress indicators per category
- Quick-add floating action button
- Dark/light mode toggle
- Deadline countdown badges
