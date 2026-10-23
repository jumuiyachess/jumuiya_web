# The Gift of Chess - Jumuiya Web

This repository contains the web platform for **The Gift of Chess** nonprofit initiative.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: [Supabase](https://supabase.com/)
- **State Management**: Zustand
- **Email Service**: Resend
- **Icons**: Lucide React

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: v18.18+ or v20+ recommended
- **npm**: v9+ (comes bundled with Node.js)

---

## Getting Started

### 1. Clone the Repository

```bash 
git clone  https://github.com/jumuiyachess/jumuiya_web.git
cd jumuiya_web
```

### 2. Install Dependencies

Install all project dependencies using **npm**:

```bash
npm install
```

### 3. Environment Variables

Create your environment configuration file by copying `.env.example` (or configuring `.env.local`):

```bash
cp .env.example .env.local
```

Ensure the following environment variables are properly set:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (backend/admin operations)
- `RESEND_API_KEY` - API key for Resend email service (if applicable)

### 4. Run the Development Server

Start the local Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Available Scripts

In the project directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the development server on port 3000 |
| `npm run build` | Builds the application for production |
| `npm run start` | Runs the built production server |
| `npm run lint` | Runs ESLint to check for code issues |
| `npm run db:seed` | Seeds database content via `ts-node scripts/seedContent.ts` |

---

## License

This project is proprietary and maintained for The Gift of Chess initiative.
