# Deploy the PRime backend to Railway

The repository is ready for a Railway Django service, but it is not currently
linked or deployed. These steps create billable resources only when you choose
to do so in Railway.

## 1. Create the services

1. Push this repository to GitHub.
2. In Railway, create a project from that repository.
3. Set the Django service **Root Directory** to `/backend`.
4. Add a PostgreSQL service to the same Railway project.
5. Reference PostgreSQL's `DATABASE_URL` from the Django service.

## 2. Configure build and start commands

Use these service commands:

```text
Build:      python manage.py collectstatic --noinput
Pre-deploy: python manage.py migrate --noinput
Start:      gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

Railpack installs `backend/requirements.txt` before the build command. The
checked-in `backend/Procfile` also records the production start command.

## 3. Add environment variables

```dotenv
SECRET_KEY=<long-random-value>
DEBUG=False
ALLOWED_HOSTS=<your-service>.up.railway.app
DATABASE_URL=${{Postgres.DATABASE_URL}}
CORS_ALLOWED_ORIGINS=https://localhost,https://<your-web-domain>
CSRF_TRUSTED_ORIGINS=https://<your-web-domain>
GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=<android-client-id>.apps.googleusercontent.com
```

`https://localhost` is Capacitor's Android application origin; it is not the
backend API URL. Omit the Google IDs until Google login is configured. Generate
a Django secret locally, for example:

```powershell
python -c "from secrets import token_urlsafe; print(token_urlsafe(50))"
```

Never commit the generated value or the Railway database URL.

## 4. Deploy and initialize data

Deploy the Django service and confirm the migration step succeeds. Open a
Railway service shell once and seed the system exercise library:

```text
python manage.py seed_exercises
```

The seed command is safe to run again when the library changes.

## 5. Verify the deployment

Generate a Railway HTTPS domain, then visit:

```text
https://<your-service>.up.railway.app/api/health/
```

Expected JSON:

```json
{"status":"ok","message":"PRime backend is running"}
```

Copy that HTTPS domain into the Android build as
`VITE_API_BASE_URL=https://<your-service>.up.railway.app/api/`. Rebuild and run
`npx cap sync android`; changing an environment variable alone does not update
an existing APK.
