# Student Management CRUD REST API

Requires Node.js 24 or later. Extract the ZIP, open the Student_API folder in VS Code, then run the following in its terminal.

    node --version
    node src/server.js

Leave the terminal open. Visit http://localhost:3000/api/students to read the list. A new database returns []. The project uses built-in Node.js modules and creates data/students.sqlite on startup. To inspect stored rows from a second terminal in the same folder:

    node src/list.js

## Use Postman Desktop
1. Import postman/Students.postman_collection.json. The collection provides baseUrl = http://localhost:3000. Leave the environment unselected.
2. Open the collection runner, select all 17 requests in the supplied order and run one iteration. TC-01 assigns a unique roll number and saves the ID returned by the server. Later requests use that ID.
3. For a live demo, send TC-01 through TC-05 one at a time. Run the database listing before and after the update. Show TC-06 and its 400 response. Send TC-13 to delete and TC-14 to verify 404. Inspect the database again.
4. Capture the create, read, update, delete, error and run-summary screens. Include method, URL, response body, status and Tests results. With 204 the response body is empty.
5. For the equivalent command-line run, while the server is running execute: npx --yes newman@6 run postman/Students.postman_collection.json (first use needs internet). On Windows PowerShell use npx.cmd if script execution is restricted.

## Routes
POST /api/students creates a row (201). GET /api/students lists rows (200). GET /api/students/:id reads one (200). PUT /api/students/:id replaces all four editable fields (200). DELETE /api/students/:id removes the row (204). Missing records return 404. Send JSON bodies with Content-Type: application/json.

    {"name":"Ali Ahmed","rollNo":"K26SW001","department":"Software Engineering","semester":1}

## Evidence
evidence/newman.txt is the console transcript. evidence/results.html displays the resolved requests, actual responses and assertion counts from that run. Open it in a browser. The test collection only updates and deletes its own created ID. An interrupted run can leave its sample row behind.

## Troubleshooting
If the port is already in use, stop the earlier server with Ctrl+C or set a different port. In PowerShell run $env:PORT="3001" before starting the server, then change the collection baseUrl to http://localhost:3001. If node:sqlite is unavailable, check that node --version reports v24 or later. Keep data/students.sqlite to preserve records. The server binds to the local machine for classroom demonstrations.
