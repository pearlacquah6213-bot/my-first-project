# HUNI VALLEY SHS — Student Registration Portal

Simple, minimal student registration portal built with pure Node.js (no external dependencies).

Run locally:

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
node server.js
# open http://localhost:3000 in your browser
```

Admin UI:
- Open `http://localhost:3000/admin` and login with basic auth. Default credentials are `admin` / `password`. Set `ADMIN_USER` and `ADMIN_PASS` env vars in production.

Files:
- `server.js` — Express server and API endpoints
- `db.js` — SQLite initialization and helpers
- `public/` — frontend files (`index.html`, `app.js`, `style.css`, `admin.html`, `admin.js`)
- `data/db.sqlite` — SQLite database file (created at runtime)

Docker:

Build and run with Docker:

```bash
docker build -t huni-portal .
docker run -p 3000:3000 --env ADMIN_USER=admin --env ADMIN_PASS=secret huni-portal

MySQL (XAMPP) setup

To use MySQL provided by XAMPP instead of the default JSON file storage:

1. Start MySQL from XAMPP Control Panel.
2. Create a database (example name `huni_portal`) using phpMyAdmin or mysql client.
3. Set environment variables before starting the server (PowerShell example):

```powershell
$env:DB_TYPE='mysql'
$env:DB_HOST='localhost'
$env:DB_USER='root'
$env:DB_PASS=''
$env:DB_NAME='huni_portal'
node server.js
```

The server will create the `registrations` table automatically if it does not exist.

```

