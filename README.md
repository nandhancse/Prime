# PRime

**Workout tracking made simple.**

PRime is a React web app and Capacitor Android app backed by a Django REST API. SQLite keeps local setup simple; production deployments use PostgreSQL through `DATABASE_URL`.

## Current features

- Responsive dark landing page with a live backend health indicator
- Account registration and login with JWT access/refresh tokens
- Google sign-in support for web and Android, using the same Django JWT session
- Capacitor Android wrapper for the existing React application
- Protected dashboard and authenticated navigation
- Seeded exercise library plus user-owned custom exercises
- Workout programs with ordered days, exercises, set/rep/weight targets, and one active program
- Live workout sessions with editable sets, completion, cancellation, and duration tracking
- Completed workout history with set details and total volume
- Development-only protected diagnostics page at `/dev-status`
- Server-side ownership checks so users cannot access another user's private data

## Technology

- Frontend: React 19, Vite 8, JavaScript, React Router, Axios, and normal CSS
- Backend: Python, Django 6, Django REST Framework, Simple JWT, and django-cors-headers
- Database: SQLite locally and PostgreSQL in production

## Project structure

```text
Prime/
|-- frontend/                 React + Vite application
|   |-- android/              Capacitor Android project
|   |-- resources/            App icon and splash-screen guidance
|   `-- src/
|       |-- api/              Axios client and API modules
|       |-- components/       Reusable layout and form components
|       |-- context/          Authentication context
|       |-- pages/            Public and protected route pages
|       `-- styles/           Normal CSS stylesheets
|-- backend/                  Django REST API
|   |-- accounts/             Registration, login, profile, and auth tests
|   |-- core/                 Health-check API
|   |-- exercises/            Exercise library and seed command
|   |-- programs/             Workout program management
|   |-- workouts/             Sessions, sets, and history
|   |-- config/               Django settings and root URLs
|   `-- .venv/                Local Python virtual environment (ignored)
|-- docs/                     Google sign-in, Android, and release guides
|-- .github/workflows/        Manual debug-APK workflow
|-- .gitignore
`-- README.md
```

## Backend setup

From the project root in Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_exercises
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Run only one Django development server on port `8000`. If Django reports that the port is already in use, stop the older server terminal before starting another one.

On macOS or Linux, replace `.\.venv\Scripts\python.exe` with `.venv/bin/python`.

The seed command is idempotent: running it again updates the system exercise definitions without creating duplicates.

Copy `backend/.env.example` to `backend/.env` if your shell or development tooling loads dotenv files, or set the values in your shell. Django does not load `.env` files itself. Google sign-in needs the trusted OAuth client IDs:

```dotenv
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

Never commit real client secrets, signing keys, or production Django secrets.

Production uses Gunicorn, WhiteNoise, and PostgreSQL. Railway setup and the
required security variables are documented in
[docs/BACKEND_DEPLOYMENT.md](docs/BACKEND_DEPLOYMENT.md).

## Frontend setup

Open another terminal from the project root:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev -- --host localhost --port 5173
```

Open `http://localhost:5173`. Vite proxies `/api` to the local Django server during development.

The checked-in `frontend/.env.development` supplies the relative `/api/` URL.

For Google sign-in, copy `frontend/.env.example` to `frontend/.env.local` and add the OAuth web client ID. Leave the API URL empty for local web development:

```dotenv
VITE_API_BASE_URL=
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Restart Vite after changing environment variables. A mobile build cannot use the Vite proxy, so set `VITE_API_BASE_URL` to a deployed HTTPS API URL before building the app.

## Android app

The Android project wraps the same production Vite build with Capacitor. After configuring the frontend environment:

```powershell
cd frontend
npm.cmd run build
npx.cmd cap sync android
npx.cmd cap open android
```

Use Android Studio to run the app on an emulator/device or create an APK. Setup details are in [Android build instructions](docs/ANDROID_BUILD.md), [Google login setup](docs/GOOGLE_LOGIN_SETUP.md), and [APK release instructions](docs/RELEASE_APK.md). Custom production icons and splash art are intentionally not fabricated; see [frontend/resources/README.md](frontend/resources/README.md).

For installation, download `prime-v1.0.0.apk` from the official GitHub
Release, open it on the Android device, and approve installation from that
source if Android requests it. A warning about apps distributed outside Google
Play is expected for a GitHub release.

## Tests and build checks

Run backend tests from the `backend` directory so Django discovers every app test:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test
```

Run frontend checks from the `frontend` directory:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

## Main API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health/` | Public backend health check |
| `POST` | `/api/auth/register/` | Create an account |
| `POST` | `/api/auth/login/` | Receive JWT tokens and user details |
| `POST` | `/api/auth/google/` | Exchange a verified Google ID token for JWT tokens |
| `POST` | `/api/auth/token/refresh/` | Refresh an access token |
| `GET` | `/api/auth/profile/` | Read the authenticated profile |
| `GET/POST` | `/api/exercises/` | List exercises or create a custom exercise |
| `GET/POST` | `/api/programs/` | List or create workout programs |
| `POST` | `/api/programs/:id/activate/` | Activate a workout program |
| `GET` | `/api/workouts/` | List completed workout history |
| `GET` | `/api/workouts/active/` | Read the active workout, if any |
| `POST` | `/api/workouts/start/` | Start a workout from a program day |
| `PATCH` | `/api/workouts/sets/:id/` | Update weight, reps, or completion |
| `POST` | `/api/workouts/:id/complete/` | Complete a workout |
| `POST` | `/api/workouts/:id/cancel/` | Cancel a workout |

Except for health, registration, login, Google login, and token refresh, API endpoints require a valid JWT access token.

## Development diagnostics

When Vite runs in development mode, authenticated users see a small **Dev status** link. The protected `/dev-status` page checks backend health, authentication, profile, exercises, programs, and the active workout API without displaying tokens or secrets. The route and link are omitted from production builds through `import.meta.env.DEV`.

## Current limitations

- SQLite is intended only for local setup; production requires `DATABASE_URL`.
- JWT tokens currently use browser local storage for this development version; production authentication should be reviewed and hardened before deployment.
- Google sign-in requires real Google Cloud OAuth credentials and must be tested on the final web origin and signed Android build.
- There is no password reset or account-management UI yet.
- Exercise and history lists are not paginated yet.
- Production configuration is prepared, but no Railway project or HTTPS backend is currently connected.
- No release APK is committed; build and sign it only after the API URL, OAuth clients, app icon, and signing key are ready.

The next infrastructure milestone is supplying deployment/OAuth/signing credentials and testing the signed APK against the real HTTPS backend. Advanced gym features remain intentionally out of scope for this version.
