# Wiki Race
![Wiki race logo](./public/Wiki_race.png)

A competitive Wikipedia navigation game where players race from one Wikipedia page to another using only in-article links.

## 🎮 Game Overview

Navigate from a random starting Wikipedia page to a target page using only the links within articles. The challenge is to reach your destination with the fewest clicks and fastest time possible. Our Six Degrees of Wikipedia algorithm ensures every game has a solution within 4-6 degrees of separation.

**Play here: [https://wikirace.sidv.me](https://wikirace.sidv.me)**

## ✨ Features

- 🔐 **Secure Discord Authentication** - Login with your Discord/Google account to save stats
- 📊 **Personal Statistics** - Track games played, fastest times, and averages
- 🗺️ **Path Visualization** - See your complete navigation history
- ⬅️ **Backtrack Support** - Go back if you take a wrong turn
- 🎯 **Smart Game Generation** - Algorithm ensures all games are solvable
- 🌙 **Dark Mode Interface** - Easy on the eyes

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- PostgreSQL database (I used [Neon](https://neon.tech/))
- Clerk Auth

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/Sid-V/WikiRace.git
cd WikiRace
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Required environment variables:
```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Clerk Auth
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
```

4. Set up the database:
```bash
pnpm db:push
```

5. Start the development server:
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to play!

## 🏗️ Architecture

### Core Components

- **Game Engine** (`src/components/wiki-race-game.tsx`) - Main game logic and UI
- **Wikipedia API** (`src/lib/wikipedia.ts`) - Content fetching and sanitization  
- **Six Degrees Algorithm** (`src/lib/six-degrees.ts`) - Ensures game solvability
- **Authentication** - Clerk authentication with Discord/Google support
- **Database Layer** (`src/lib/db.ts`) - Prisma ORM with automated cleanup

### API Routes

- `POST /api/game/start` - Create new game session
- `POST /api/game/finish` - Complete game and update stats
- `POST /api/game/abandon` - Mark game as abandoned
- `GET /api/stats` - Retrieve user statistics

### Database Schema

```prisma
model User {
  id        String      @id  // Discord account ID
  games     Game[]
  userStats UserStats?
}

model Game {
  id              String    @id @default(cuid())
  userId          String
  startPage       String
  endPage         String
  startTime       DateTime
  endTime         DateTime?
  durationSeconds Int?
  clicks          Int?
  status          GameStatus // IN_PROGRESS, COMPLETED, ABANDONED
}

model UserStats {
  userId                 String @id
  gamesPlayed            Int    @default(0)
  totalDurationSeconds   BigInt @default(0)
  fastestDurationSeconds Int?
}
```

## 🔧 Development

### Commands

```bash
# Development
pnpm dev          # Start dev server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm preview      # Build and start production server

# Database (Prisma commands)
npx prisma db push      # Push schema changes
npx prisma generate     # Generate Prisma client

# Code Quality
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript checking only
```

### Key Algorithms

**Six Degrees Validation**: Before starting each game, we verify that a path exists between the start and end pages within 4-6 degrees of separation using breadth-first search.

**Content Sanitization**: Wikipedia content is processed to remove unnecessary elements while preserving essential navigation links and maintaining visual consistency. Also improves the performance by not rendering links that are not useful

**Automatic Cleanup**: Abandoned games are automatically marked after 30 minutes and deleted after 2 hours to maintain database performance.

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org) with App Router
- **Authentication**: [Clerk](https://clerk.com) with Discord/Google provider  
- **Database**: [Prisma](https://prisma.io) ORM with PostgreSQL
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com/)
- **Deployment**: [Vercel](https://vercel.com)
- **External APIs**: Wikipedia API for content fetching

Built on the [T3 Stack](https://create.t3.gg/) foundation.

## 📝 License

This project is open source under MIT.
