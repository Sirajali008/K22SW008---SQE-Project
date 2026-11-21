# Student Hub: Frontend for the Student Management API

A modern, responsive web interface for the Student Management REST API. It uses plain HTML, CSS and JavaScript (ES modules) and a tiny Node.js server with no npm dependencies.

## Features
- Dashboard cards: total students, departments, and average semester
- Searchable, filterable and sortable student table with pagination
- Add, view, edit and delete students (create, read, update, delete)
- Client-side validation that mirrors the API rules
- Duplicate roll number detection (shown on the Roll No field)
- Friendly error messages when the API is offline
- Light and dark themes (remembers your choice)
- Responsive layout for desktop and mobile

## Folder structure
    Student_Frontend/
      server.js              Serves the UI and proxies /api/* to the API
      package.json
      README.md
      public/
        index.html           Page layout and dialogs
        css/styles.css       Theme, layout and components
        js/api.js            Calls to the REST API
        js/app.js            Table, forms, filters and interactions

## Setup: step by step

### 1. Check your Node.js version
    node --version

The API requires Node.js 24 or later because it uses the built-in `node:sqlite` module. Install it from https://nodejs.org if your version is older.

### 2. Start everything with one command
Keep the folders together as they are in the full package:

    Student_Management_Full/
      Student_API/
      Student_Frontend/

Then run:

    cd Student_Frontend
    node server.js

The launcher starts the API automatically (if it isn't already running), then serves the UI. You should see:

    Student Hub is ready: http://localhost:5173

### 3. Open the app
Visit http://localhost:5173. The badge should read "API connected."

Press Ctrl+C in the terminal to stop both the frontend and the API.

If you already started the API yourself in another terminal, the launcher detects it and simply uses it.

## Using VS Code
1. Open the full project folder in VS Code.
2. Open two terminals (Terminal > New Terminal).
3. Run `node server.js` from `Student_Frontend`. It starts the API too.
4. Press Ctrl+click (or Cmd+click) on the link printed in the terminal.

## Configuration (optional)
Set these environment variables before starting `server.js`:

| Variable   | Default       | Purpose                              |
|------------|---------------|--------------------------------------|
| PORT       | 5173          | Port for the frontend                |
| API_PORT   | 3000          | Port where the Student API runs      |
| API_HOST   | 127.0.0.1     | Host where the Student API runs      |
| API_DIR    | ../Student_API | Folder of the Student API to launch |

Windows PowerShell example:

    $env:PORT="8080"
    node server.js

## How it connects to the API
The browser only talks to the frontend server (port 5173). That server forwards every `/api/...` request to the Student API (port 3000) and passes the response back. This keeps the API code unchanged and avoids CORS configuration.

## Troubleshooting
- **"API offline"**: the API could not start. Read the lines prefixed with [API] in the terminal, then click Refresh.
- **"Could not find the API"**: keep Student_API next to Student_Frontend, or set API_DIR.
- **"Address already in use"**: another program uses the port. Stop the old process with Ctrl+C, or pick another port (see Configuration).
- **Changes to CSS or JS not showing**: hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R).
- **"Roll number already exists"**: roll numbers are unique and case-insensitive. Use a different number.
- **Node version error about node:sqlite**: upgrade the API's Node.js to version 24 or later.
