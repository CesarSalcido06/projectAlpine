# Project Alpine

A full-stack productivity application for managing tasks and tracking goals with gamification elements.

**Live Demo:** [alpine.cesarsalcido.xyz](https://alpine.cesarsalcido.xyz)

## Features

### Task Management
- Create, edit, and organize tasks with custom categories and tags
- Set urgency levels (Low, Medium, High, Critical) with visual indicators
- Due date tracking with overdue notifications
- Archive system for completed tasks
- Inline creation of categories and tags

### Goal Tracker (Gamification)
- Track daily/weekly/monthly habits and goals
- XP and leveling system for motivation
- Streak tracking with visual progress
- Achievement badges

### Calendar Views
- Day, Week, and Month views
- Visual task density indicators
- Click-through to task details

### Analytics Dashboard
- Task completion trends
- Urgency distribution charts
- Productivity statistics

### Multi-User System
- Secure authentication with JWT
- Per-user isolated databases (complete data separation)
- Admin user management panel
- First registered user becomes admin

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Chakra UI** - Component library with dark theme
- **React Context** - State management

### Backend
- **Node.js + Express** - REST API server
- **SQLite + Sequelize** - Database with ORM
- **JWT** - Secure authentication
- **bcrypt** - Password hashing

### DevOps
- **Docker & Docker Compose** - Containerized deployment
- **Nginx** - Reverse proxy (production)
- **Health checks** - Container orchestration

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Express API    │
│   (Port 3000)   │     │   (Port 5000)   │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼─────┐           ┌───────▼───────┐
              │ master.db │           │ users/{id}/   │
              │  (auth)   │           │  alpine.db    │
              └───────────┘           └───────────────┘
```

Each user gets their own SQLite database for complete data isolation.

## Project Structure

```
projectAlpine/
├── src/
│   ├── frontend/          # Next.js application
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # React components
│   │   ├── contexts/      # State management
│   │   └── lib/           # API client & types
│   │
│   └── backend/           # Express API
│       ├── src/
│       │   ├── routes/    # API endpoints
│       │   ├── models/    # Sequelize models
│       │   ├── middleware/# Auth & rate limiting
│       │   └── db/        # Database management
│       └── Dockerfile
│
├── docker-compose.yml     # Container orchestration
└── docs/                  # Design documentation
```

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/CesarSalcido06/projectAlpine.git
cd projectAlpine

# Create environment file
cp .env.example .env
# Edit .env and set a secure JWT_SECRET

# Start the application
docker compose up -d

# Access at http://localhost:3000
```

### Local Development

```bash
# Backend
cd src/backend
npm install
npm run dev

# Frontend (separate terminal)
cd src/frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/tasks` | List tasks (filtered) |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/trackers` | List goal trackers |
| POST | `/api/trackers/:id/log` | Log progress |
| GET | `/api/stats` | Get analytics |

## Screenshots

*Dashboard with task list and calendar view*

*Goal tracker with XP progress and streaks*

*Statistics page with completion trends*

## License

MIT
