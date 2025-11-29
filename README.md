# TeleFile

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/azadi-gh/telefile)

## Description

TeleFile is a polished, minimal, and beautiful file-hosting web app that lets users upload files via a Cloudflare Worker-backed API and optionally forward them to a Telegram Bot (sendDocument) while storing rich metadata and simple file content previews in Durable Object storage. The app focuses on an elegant, distraction-free UX: a left folder pane for organization, a central file grid/list, and a right inspector for file details. Files can be uploaded via drag-and-drop or file picker; users can create, rename, and delete folders; each uploaded file is persisted (small-file demo store) and — if the user supplies a Telegram bot token in settings — the Worker will forward the uploaded file to Telegram and persist the returned telegram_file_id in metadata. The UI is built from shadcn/ui primitives and Tailwind. Data layer is backed by the GlobalDurableObject using new IndexedEntity-derived entities (FolderEntity, FileEntity, AppSettingsEntity). End-to-end flows are demo-ready in mock-mode (no token), and will switch to real Telegram uploads when a token is stored via the Settings UI.

A minimal, visually-pleasing file host that uploads files to a Telegram bot, supports folders, file meta, and an inspector UI — running on Cloudflare Workers + Durable Object.

## Features

- **File Uploads**: Drag-and-drop or file picker support for uploading files to Cloudflare Workers.
- **Telegram Integration**: Optional forwarding of files to a Telegram Bot via the Bot API (sendDocument), with metadata storage of telegram_file_id.
- **Folder Organization**: Create, rename, and delete folders; navigate hierarchical file structure.
- **File Management**: View uploaded files in a responsive grid/list, with previews (images, video, audio) or ASCII summaries.
- **Inspector Panel**: Contextual details for selected files, including metadata, timestamps, and actions like re-upload, rename, move, or delete.
- **Settings Management**: Securely store Telegram Bot Token in Durable Object; toggle mock mode; view setup instructions.
- **Responsive UI**: Beautiful, modern interface with shadcn/ui components, Tailwind styling, and micro-interactions (framer-motion).
- **Data Persistence**: Metadata and small file content stored in Cloudflare Durable Objects using IndexedEntity patterns.
- **API-Driven**: Hono-based backend with CORS-enabled endpoints for all operations; React Query for frontend caching and optimistic updates.
- **Mock Mode**: Fully functional without Telegram token for demos; seamless switch to real uploads.
- **Visual Excellence**: Minimalist design with generous whitespace, subtle gradients, hover states, and loading skeletons.

## Technology Stack

- **Frontend**: React 18, React Router 6, TypeScript, Tailwind CSS 3, shadcn/ui, Lucide React (icons), Framer Motion (animations), @tanstack/react-query (data fetching), Sonner (toasts), Zustand (state management), React Use (hooks).
- **Backend**: Hono (routing), Cloudflare Workers, Cloudflare Durable Objects (storage via GlobalDurableObject).
- **Shared**: Zod (validation), Immer (immutable updates).
- **Build & Dev**: Vite (bundling), Bun (package manager), Wrangler (Cloudflare deployment), ESLint (linting).
- **Utilities**: clsx, tailwind-merge, class-variance-authority, uuid.
- **Optional Integrations**: React Dropzone (drag-and-drop).

## Quick Start

### Prerequisites

- Bun installed (https://bun.sh/)
- Cloudflare account (for deployment; free tier sufficient for demos)
- Node.js (for local development if needed, but Bun is primary)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd telefile
   ```

2. Install dependencies using Bun:
   ```
   bun install
   ```

3. Generate TypeScript types for Cloudflare Workers:
   ```
   bun run cf-typegen
   ```

The project is now ready for local development or deployment.

## Usage

### Local Development

Start the development server:
```
bun run dev
```

The app will be available at `http://localhost:3000`. The frontend serves static assets, and API calls route through the local Worker (proxied by Vite).

### Key Workflows

- **Upload Files**: Drag files to the central pane or use the upload button. Progress shows per-file status; files appear in the current folder with pop-in animations.
- **Organize Folders**: Use the left sidebar to create new folders via the "New Folder" button (opens a sheet). Navigate by clicking folders.
- **View Details**: Select a file to open the right inspector panel, showing metadata, previews, and Telegram actions (if token configured).
- **Configure Telegram**: Open Settings (top-right gear icon) to paste a Bot Token (generated via @BotFather on Telegram). Enable real uploads; mock mode is default.
- **File Actions**: Right-click files for context menu (download, delete, share); inspector provides advanced options like re-upload or move.
- **Mock Demo**: Without a token, uploads store files locally in Durable Objects (small files only, <2MB). Add token for Telegram forwarding.

All interactions provide toast feedback (Sonner) and handle errors gracefully.

### API Endpoints

The backend exposes RESTful endpoints under `/api/*` (Hono router). Key paths:
- `POST /api/files` - Upload file (multipart/form-data).
- `GET /api/folders` - List folders (supports cursor/limit pagination).
- `POST /api/folders` - Create folder.
- `DELETE /api/files/:id` - Delete file.
- `POST /api/settings` - Update Bot Token (secure server-side storage).
- Responses follow `ApiResponse<T>` format from `shared/types.ts`.

Use the `api()` client in `src/lib/api-client.ts` for frontend calls.

## Development

### Project Structure

- `src/`: React frontend (pages, components, hooks, lib).
- `worker/`: Hono backend (routes in `user-routes.ts`, entities in `entities.ts`).
- `shared/`: TypeScript types and mock data.
- Core utilities in `worker/core-utils.ts` (Durable Objects, entities) — do not modify.

### Adding Features

- **New Entities**: Extend `IndexedEntity` in `worker/entities.ts` (e.g., `FolderEntity`, `FileEntity`).
- **API Routes**: Add to `worker/user-routes.ts` using helpers like `ok()`, `bad()`.
- **Frontend Components**: Use shadcn/ui primitives; import from `@/components/ui/*`.
- **State Management**: Use Zustand for client state (primitives only); React Query for API data.
- **Styling**: Tailwind utilities; extend theme in `tailwind.config.js`.
- **Testing**: Add unit tests with Vitest (not included); manual testing via dev server.

Lint code:
```
bun run lint
```

Build for production:
```
bun run build
```

### Environment Notes

- Bot Token is stored server-side in Durable Objects — never expose in client code.
- File storage is demo-only (base64 in DO for small files); production uses R2 or external services.
- Telegram limits: Max 2GB files, but Worker has body size limits (~100MB).

## Deployment

Deploy to Cloudflare Workers (edge runtime, global distribution):

1. Ensure Wrangler is installed (Bundled with Bun; or `bun add -D wrangler`).
2. Login to Cloudflare:
   ```
   wrangler login
   ```
3. Deploy:
   ```
   bun run deploy
   ```
   This builds the frontend (Vite) and deploys the Worker + assets.

The app will be live at `<your-worker>.<your-subdomain>.workers.dev`. Assets are served via Cloudflare Pages integration (automatic).

For custom domains or advanced config, edit `wrangler.jsonc` (do not modify bindings or DO names).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/azadi-gh/telefile)

### Post-Deployment

- Test uploads in mock mode.
- Generate Telegram Bot Token via @BotFather, then configure in Settings UI.
- Monitor via Cloudflare Dashboard (logs, metrics).

## Contributing

Contributions welcome! Fork the repo, create a feature branch, and submit a PR. Focus on:
- Bug fixes for uploads/Telegram integration.
- UI polish (responsive, accessibility).
- Performance optimizations (e.g., large file handling).

Follow the code style (ESLint, Prettier). See `package.json` scripts for tools.

## License

MIT License. See [LICENSE](LICENSE) for details.