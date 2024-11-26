const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');
const config = require('./config.json');
const persistentData = fs.existsSync(`${__dirname}/persistent-data.json`) ? require(`${__dirname}/persistent-data.json`) : {};

// Add this function near the top of the file, after the imports
function errorNotify(...args) {
    // Use the original error function to log the message
    originalConsoleError.apply(console, args);

    // Format the message
    const formattedMessage = args.join(' ');

    // Construct the curl command
    const command = `curl -H "Title: VTT Puppeteer Error" -H "Priority: high" -d "${formattedMessage}" ${config.ntfyURL}`;

    // Execute the command
    exec(command, (error, stdout, stderr) => {
        if (error) {
            // Use the original error function to avoid recursion
            originalConsoleError(`Failed to send ntfy notification: ${error}`);
        }
    });
}

// Replace console.error with the new wrapper
const originalConsoleError = console.error;
console.error = (...args) => {
    errorNotify(...args);
};

if(!fs.existsSync(`${__dirname}/servers`))
    fs.mkdirSync(`${__dirname}/servers`);

function html() {
    return fs.readFileSync(`${__dirname}/server-starter.htm`, 'utf8');
}

function puppeteerStart(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
    });
    req.on('end', () => {
        const { url } = JSON.parse(body);
        const urlMatch = url.match(/\/PR-(\d+)(\/|$)/);
        if (urlMatch) {
            const PR = urlMatch[1];
            call(`"${__dirname}/pr-start.sh" "${config.templatePath}" "${PR}" "${config.vttAdminURL}" "${config.ntfyURL}" >> "${__dirname}/servers/PR-${PR}.log" 2>&1`);
        } else if(url.match(/https:\/\/virtualtabletop\.io\//)) {
            call(`"${__dirname}/main-update.sh" "${config.vttAdminURL}" "${config.ntfyURL}" >> "${__dirname}/servers/MAIN.log" 2>&1`);
        }
        res.end();
    });
}

function puppeteerState(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
    });
    req.on('end', () => {
        const { url } = JSON.parse(body);
        const urlMatch = url.match(/\/PR-(\d+)(\/|$)/);
        if (urlMatch) {
            const PR = urlMatch[1];
            fs.readFile(__dirname + `/servers/PR-${PR}/state.json`, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error reading state file: ${err}`);
                    res.writeHead(500);
                    res.end();
                } else {
                    const state = data.trim();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(state);
                }
            });
        } else if(url.match(/https:\/\/virtualtabletop\.io\//)) {
            fs.readFile(__dirname + `/servers/MAIN/state.json`, 'utf8', (err, data) => {
                if (err) {
                    console.error(`Error reading state file: ${err}`);
                    res.writeHead(500);
                    res.end();
                } else {
                    const state = data.trim();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(state);
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });
}

// returns a tree of processes, disk usage, and memory usage of the server
function puppeteerServerStatus(req, res) {
    exec(`cd "${__dirname}"; df -h .; free -h; ls -ld servers/*/ common/*/*/; tail -n 100 servers/*/*log puppeteer.log; ps axf -o pid,start,args`, (error, stdout, stderr) => {
        let statusText = '<p><a href="/puppeteer' + config.vttAdminURL + '/errors">View Errors</a> | <a href="https://virtualtabletop.io' + config.vttAdminURL + '">MAIN Server Admin</a> | <a href="/puppeteer' + config.vttAdminURL + '/activity">View Activity</a></p>';
        statusText += '<style>.progress-bar { width: 300px; background-color: #e0e0e0; } .progress-bar-fill { height: 20px; background-color: #4CAF50; }</style>';
        const lines = stdout.split('\n');
        const dfHeaderLine = lines.find(line => line.startsWith('Filesystem'));
        const dfDataLine = lines[lines.indexOf(dfHeaderLine) + 1];
        const memLine = lines.find(line => line.startsWith('Mem:'));
        function parseHumanReadableSize(size) {
            const units = ['B', 'K', 'M', 'G', 'T', 'P'];
            const number = parseFloat(size);
            const unit = size.replace(/[^A-Z]/g, '').trim();
            const unitIndex = units.indexOf(unit.charAt(0).toUpperCase());
            return number * Math.pow(1024, unitIndex);
        }

        if (dfHeaderLine && dfDataLine) {
            const headers = dfHeaderLine.split(/\s+/);
            const data = dfDataLine.split(/\s+/);
            const usedIndex = headers.indexOf('Used');
            const availIndex = headers.indexOf('Avail');

            if (usedIndex !== -1 && availIndex !== -1) {
                const used = data[usedIndex];
                const avail = data[availIndex];
                const usedValue = parseHumanReadableSize(used);
                const availValue = parseHumanReadableSize(avail);
                const total = usedValue + availValue;
                const usedPercent = (usedValue / total) * 100;
                statusText += `<p>Disk Usage:</p><div class="progress-bar"><div class="progress-bar-fill" style="width:${usedPercent.toFixed(2)}%"></div></div>`;
                statusText += `<p>${used} used / ${avail} available</p>`;
            }
        }

        if (memLine) {
            const [, total, used, free] = memLine.split(/\s+/);
            const usedValue = parseHumanReadableSize(used);
            const totalValue = parseHumanReadableSize(total);
            const usedPercent = (usedValue / totalValue) * 100;
            statusText += `<p>RAM Usage:</p><div class="progress-bar"><div class="progress-bar-fill" style="width:${usedPercent.toFixed(2)}%"></div></div>`;
            statusText += `<p>${used} used / ${total} total</p>`;
        }

        statusText += '<pre>';
        statusText += escapeHTML(stdout);
        statusText += '</pre>';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(statusText);
    });
}

function puppeteerGitHistory(req, res) {
    exec(`cd "${__dirname}/servers/MAIN"; git log --pretty=format:"%h %ad %s%n" --date=short | tac`, (error, stdout, stderr) => {
        let statusText = '<base target=_blank><pre>';

        // Split the output into lines and process each one
        const lines = stdout.split('\n').filter(line => line.trim());
        let prCounter = 10001;
        let currentMonth = '';

        const processedLines = lines.map(line => {
            if (!line.trim()) return '';

            // Extract the hash, date, and message
            const parts = line.split(' ');
            const hash = parts[0];
            const date = parts[1];
            const message = parts.slice(2).join(' ');

            // Check if we're in a new month
            const lineMonth = date.substring(0, 7); // YYYY-MM
            let monthSeparator = '';
            if (lineMonth !== currentMonth) {
                if (currentMonth !== '') { // Don't add blank line before the first month
                    monthSeparator = '\n';
                }
                currentMonth = lineMonth;
            }

            // Create a line with the link, date, and message
            const processedLine = `${monthSeparator}<a href="https://test.virtualtabletop.io/PR-${prCounter}/">${hash}</a> ${date} ${escapeHTML(message)}`;
            prCounter++;

            return processedLine;
        });

        statusText += processedLines.join('\n');
        statusText += '</pre>';

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(statusText);
    });
}

const stackContextCache = persistentData.stackContextCache || {};

function puppeteerErrors(req, res) {
    const logPath = `${__dirname}/servers/MAIN/server.log`;
    const savePath = `${__dirname}/save/MAIN/errors`;

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { errorId } = JSON.parse(body);
                const errorPath = `${savePath}/${errorId}.json`;
                if (fs.existsSync(errorPath)) {
                    fs.unlinkSync(errorPath);
                    delete stackContextCache[errorId];
                }
                res.writeHead(200);
                res.end('OK');
            } catch (e) {
                res.writeHead(500);
                res.end('Error');
            }
            return;
        });
        return;
    }

    async function fetchSourceAndShowContext(url, position, errorId, contextSize = 100) {
        try {
            const cacheKey = `${url}:${position}`;
            if (stackContextCache[errorId]?.[cacheKey]) {
                return stackContextCache[errorId][cacheKey];
            }

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            });
            const code = await response.text();
            
            const start = Math.max(0, position - contextSize);
            const end = Math.min(code.length, position + contextSize);
            const context = code.substring(start, end);
            const highlightedContext = context.substring(0, position - start) + 
                `####REDSTART####${context[position - start]}####REDEND####` + 
                context.substring(position - start + 1);
            
            const result = `                <span style="color:grey">${highlightedContext.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/####REDSTART####/g, '<span style="color:red">').replace(/####REDEND####/g, '</span>')}</span>\n`;

            // Cache the result
            stackContextCache[errorId] = stackContextCache[errorId] || {};
            stackContextCache[errorId][cacheKey] = result;

            return result;
        } catch (error) {
            return '';
        }
    }

    fs.readFile(logPath, 'utf8', async (err, data) => {
        if (err) {
            console.error(`Error reading log file: ${err}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
            return;
        }

        const lines = data.split('\n');
        let errors = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('ERROR: Client error')) {
                const match = line.match(/^(\S+) ERROR: Client error (\w+):/);
                if (match) {
                    const [, timestamp, id] = match;
                    const errorFilePath = `${savePath}/${id}.json`;

                    if(!fs.existsSync(errorFilePath))
                        continue;
                    try {
                        const errorData = JSON.parse(fs.readFileSync(errorFilePath, 'utf8'));
                        const { message, error, userAgent, playerName, ...rest } = errorData;

                        let output = `<b>🖥️ Client Error</b>\n`;
                        output += `<b>🕒 Timestamp:</b>   ${timestamp}\n`;
                        output += `<b>💬 Message:</b>     ${message}\n`;
                        
                        const stackLines = error.split('\n');
                        output += `<b>❌ Error:</b>       ${stackLines[0]}\n`; // First line is the error message
                        
                        // Process remaining lines (stack trace)
                        for (const stackLine of stackLines.slice(1)) {
                            const urlMatch = stackLine.match(/(https:\/\/virtualtabletop\.io\/[^:]+):(\d+):(\d+)/);
                            if (urlMatch) {
                                const [fullMatch, fullUrl, line, column] = urlMatch;
                                const position = parseInt(column);
                                
                                output += `                ${stackLine.trim()}\n`;
                                output += await fetchSourceAndShowContext(fullUrl, position, id);
                            } else {
                                output += `                ${stackLine.trim()}\n`;
                            }
                        }

                        output += `<b>🌐 User Agent:</b>  ${userAgent}\n`;
                        output += `<b>👤 Player Name:</b> ${playerName}\n`;

                        delete rest.html;
                        delete rest.widgetsState;

                        output += `<details>`;
                        output += `<summary>Detailed JSON (click to expand)</summary>`;
                        output += `<pre>${JSON.stringify(rest, null, 2)}</pre>`;
                        output += `</details>`;
                        output += `<a href="/puppeteer${config.vttAdminURL}/error/${id}">View HTML</a>\n`;
                        output += `<button onclick="resolveError('${id}')">✓ Resolve</button>\n\n\n`;

                        errors.push(output);
                    } catch (readErr) {
                        console.error(`Error reading error file ${errorFilePath}: ${readErr}`);
                    }
                }
            } else if (line.trim().startsWith('Error:')) {
                // NodeJS crash detected
                let output = `<b>💥 NodeJS Crash</b>\n`;

                // Find the newest timestamp before the error
                let timestamp = '';
                for (let k = i - 1; k >= 0; k--) {
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(lines[k].trim())) {
                        timestamp = lines[k].trim().split(' ')[0];
                        break;
                    }
                }

                output += `<b>🕒 Timestamp:</b>   ${timestamp}\n`;
                output += `<b>❌ Error:</b>       ${line.trim()}\n`;
                output += `<b>📚 Stack Trace:</b>\n`;
                let j = i + 1;
                while (j < lines.length && lines[j].trim().startsWith('at ')) {
                    const line = lines[j].trim().replace(/^at /, '');
                    if (line.includes('file://')) {
                        output += `                ${line.replace(/(file:\/\/\/.*?MAIN\/)/g, '')}\n`;
                    } else {
                        output += `                <span style="opacity: 0.3;">${line}</span>\n`;
                    }
                    j++;
                }
                output += '\n';
                i = j - 1; // Skip processed lines

                errors.push(output);
            }
        }

        // Reverse the order of errors
        errors.reverse();

        let finalOutput = `
            <script>
            async function resolveError(id) {
                if (!confirm('Are you sure you want to resolve this error?')) return;
                const btn = event.target;
                btn.disabled = true;
                const res = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({errorId: id})
                });
                if (res.ok) {
                    btn.innerText = '✓ Done';
                }
            }
            </script>
            <pre>${errors.join('')}</pre>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(finalOutput);
    });
}

function puppeteerErrorReturnHTML(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    try {
        const errorID = req.url.split('/').pop();
        const errorData = JSON.parse(fs.readFileSync(`${__dirname}/save/MAIN/errors/${errorID}.json`, 'utf8'));
        res.end(errorData.html);
    } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Error not found');
    }
}

function escapeHTML(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function githubVerifyPostData(sig, payload) {
    const hmac = crypto.createHmac('sha1', config.githubWebhookSecret);
    const digest = Buffer.from('sha1=' + hmac.update(payload).digest('hex'), 'utf8');
    const checksum = Buffer.from(sig, 'utf8');
    return checksum.length === digest.length && crypto.timingSafeEqual(digest, checksum);
}

function githubWebhookReceived(req, res) {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });

    req.on('end', () => {
        try {
            // Verify the post data
            if (githubVerifyPostData(req.headers['x-hub-signature'], body)) {
                const payload = JSON.parse(body);

                console.log(new Date().toISOString(), 'GITHUB', req.headers['x-github-event'], payload.action);

                if (req.headers['x-github-event'] === 'push' && payload.ref === 'refs/heads/main') {
                    call(`"${__dirname}/main-update.sh" "${config.vttAdminURL}" "${config.ntfyURL}" >> "${__dirname}/servers/MAIN.log" 2>&1`);
                }

                if (req.headers['x-github-event'] === 'pull_request' && payload.action.match(/opened/)) {
                    call(`"${__dirname}/pr-open.sh" "${config.githubToken}" "${payload.number}" >> "${__dirname}/servers/PR-${payload.number}.log" 2>&1`);
                }

                if (req.headers['x-github-event'] === 'pull_request' && payload.action === 'synchronize') {
                    call(`"${__dirname}/pr-stop.sh" "${config.templatePath}" "${payload.number}" >> "${__dirname}/servers/PR-${payload.number}.log" 2>&1`);
                }

                if (req.headers['x-github-event'] === 'pull_request' && payload.action === 'closed') {
                    call(`"${__dirname}/pr-stop.sh" "${config.templatePath}" "${payload.number}" >> "${__dirname}/servers/PR-${payload.number}.log" 2>&1`);
                }

                res.statusCode = 200;
                res.end('Request body was signed');
            } else {
                console.log(new Date().toISOString(), 'ERROR', 'Request body was not signed');
                res.statusCode = 404;
                res.end('Request body was not signed');
            }
        } catch (e) {
            console.log(new Date().toISOString(), 'EXCEPTION', e);
        }
    });
}

function call(cmd) {
    console.log(new Date().toISOString(), 'CALLING', cmd);
    exec(cmd, (error) => {
        if (error) {
            console.error(new Date().toISOString(), 'ERROR', error);
        }
    });
}

function staticFile(req, res) {
    const file = fs.readFileSync(`${__dirname}${req.url}`);
    if(req.url.match(/\.js$/))
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
    else if(req.url.match(/\.css$/))
        res.writeHead(200, { 'Content-Type': 'text/css' });
    else if(req.url.match(/\.html?$/))
        res.writeHead(200, { 'Content-Type': 'text/html' });
    else if(req.url.match(/\.png$/))
        res.writeHead(200, { 'Content-Type': 'image/png' });
    else if(req.url.match(/\.svg$/))
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    else if(req.url.match(/\.json$/))
        res.writeHead(200, { 'Content-Type': 'application/json' });
    else if(req.url.match(/\.webm$/))
        res.writeHead(200, { 'Content-Type': 'video/webm' });
    else
        res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(file);
}

function puppeteerServerActivity(req, res) {
    const serverDir = fs.readdirSync(`${__dirname}/servers`);
    let statusText = '<h1>Server Activity</h1>';
    statusText += '<table border="1"><tr><th>Server</th><th>Last Modified</th><th>Room Activity</th><th>Last Activity</th></tr>';

    const promises = serverDir.map(async (server) => {
        if (!server.match(/^PR-\d+$/) && server !== 'MAIN') return;

        const PR = server === 'MAIN' ? 'MAIN' : server.match(/PR-(\d+)/)[1];
        const logFilePath = `${__dirname}/servers/${server}/server.log`;

        try {
            const stats = fs.statSync(logFilePath);
            const modifiedTime = new Date(stats.mtimeMs).toLocaleString();

            let roomActivity = 'N/A';
            if (server !== 'MAIN') {
                try {
                    const roomData = checkServerActivity(PR);
                    roomActivity = JSON.stringify(roomData, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
                } catch (error) {
                    roomActivity = `Error: ${error.message}`;
                }
            }

            return `<tr><td>${server}</td><td>${modifiedTime}</td><td><pre>${roomActivity}</pre></td><td>${lastActivity[PR] ? new Date(lastActivity[PR]).toLocaleString() : 'N/A'}</td></tr>`;
        } catch (e) {
            return `<tr><td>${server}</td><td colspan="4">Error: ${e.message}</td></tr>`;
        }
    });

    Promise.all(promises).then(rows => {
        statusText += rows.join('');
        statusText += '</table>';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(statusText);
    });
}

http.createServer((req, res) => {
    if (req.url === '/puppeteer/webhook' && req.method === 'POST') {
        githubWebhookReceived(req, res);
    } else if (req.url === '/puppeteer/start' && req.method === 'POST') {
        puppeteerStart(req, res);
    } else if (req.url === '/puppeteer/state' && req.method === 'POST') {
        puppeteerState(req, res);
    } else if (req.url === '/puppeteer/history' && req.method === 'GET') {
        puppeteerGitHistory(req, res);
    } else if (req.url === '/puppeteer'+config.vttAdminURL) {
        puppeteerServerStatus(req, res);
    } else if (req.url === '/puppeteer'+config.vttAdminURL+'/errors') {
        puppeteerErrors(req, res);
    } else if (req.url.match(new RegExp(`^/puppeteer${config.vttAdminURL}/error/`))) {
        puppeteerErrorReturnHTML(req, res);
    } else if (req.url === '/puppeteer'+config.vttAdminURL+'/activity') {
        puppeteerServerActivity(req, res);
    } else if (req.url.match(/^\/static\//)) {
        staticFile(req, res);
    } else if (req.url === '/502') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html());
    } else if (req.url === '/' && req.headers.host === 'playingcards.letz.dev') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(`${__dirname}/static/editor.htm`));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found - if this is supposed to work, report on our Discord server');
    }
}).listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
});

const previousRoomData = persistentData.previousRoomData || {};

function checkServerActivity(PR) {
    try {
        const serverMjsData = fs.readFileSync(`${__dirname}/servers/PR-${PR}/server.mjs`, 'utf8');
        if(!serverMjsData.match(/adminURL/))
            return {};

        const configData = fs.readFileSync(`${__dirname}/servers/PR-${PR}/config.json`, 'utf8');
        const serverConfig = JSON.parse(configData);
        const port = serverConfig.port;

        const stdout = require('child_process').execSync(`curl -s https://test.virtualtabletop.io/PR-${PR}/${config.vttAdminURL}`, { encoding: 'utf8' });
        const lines = stdout.split('\n');
        const roomData = {};

        lines.forEach(line => {
            const match = line.match(/<p><b><a href='(.+?)'>(.+?)<\/a><\/b>(?:\s*playing\s*(.+?):)?\s*(.+?)\s*\((\d+)\s*deltas transmitted\)<\/p>/);
            if (match) {
                const [, href, roomId, game, players, deltas] = match;
                roomData[roomId] = {
                    href,
                    game: game || '',
                    players: players.split(', '),
                    deltas: parseInt(deltas)
                };
            }
        });

        return roomData;
    } catch (error) {
        console.error(`Error checking server activity for PR-${PR}: ${error}`);
        return {};
    }
}

function hasActiveRoom(currentData, PR) {
    const previousData = previousRoomData[PR] || {};
    let hasActivity = false;

    for (const roomId in currentData) {
        const currentDeltas = currentData[roomId] || {};
        const previousDeltas = previousData[roomId] || {};

        if ((currentDeltas.deltas !== undefined ? currentDeltas.deltas : 0) > (previousDeltas.deltas !== undefined ? previousDeltas.deltas : -1)) {
            hasActivity = true;
            break;
        }
    }

    // Update the history
    previousRoomData[PR] = currentData;

    return hasActivity;
}

const lastActivity = persistentData.lastActivity || {};
setInterval(async () => {
    const serverDir = fs.readdirSync(`${__dirname}/servers`);
    const currentTime = Date.now();
    const oneHourAgo = currentTime - (60 * 60 * 1000);

    for (const server of serverDir) {
        if (!server.match(/^PR-\d+$/)) continue;

        const PR = server.match(/PR-(\d+)/)[1];
        const logFilePath = `${__dirname}/servers/${server}/server.log`;

        try {
            const stats = fs.statSync(logFilePath);
            const modifiedTime = stats.mtimeMs;

            if (modifiedTime < oneHourAgo) {
                try {
                    const roomData = checkServerActivity(PR);
                    const hasActivity = hasActiveRoom(roomData, PR);
                    if(hasActivity || !lastActivity[PR])
                        lastActivity[PR] = Date.now();

                    if (lastActivity[PR] < oneHourAgo && modifiedTime < oneHourAgo)
                        call(`"${__dirname}/pr-stop.sh" "${config.templatePath}" "${PR}" >> "${__dirname}/servers/PR-${PR}.log" 2>&1`);
                } catch (error) {
                    console.log(`Unable to check activity for PR-${PR}, shutting down based on log file age`);
                    call(`"${__dirname}/pr-stop.sh" "${config.templatePath}" "${PR}" >> "${__dirname}/servers/PR-${PR}.log" 2>&1`);
                }
            }
        } catch (e) {
            console.error(`Error checking server log for ${server} (${logFilePath}): ${e}`);
        }
    }

    let lastCheckedLine = persistentData.lastCheckedLine || 0;
    // Check for client and NodeJS errors in MAIN server
    const mainLogPath = `${__dirname}/servers/MAIN/server.log`;
    try {
        const data = fs.readFileSync(mainLogPath, 'utf8');
        const lines = data.split('\n');
        const newLines = lines.slice(lastCheckedLine);

        let clientErrors = 0;
        let nodeJSErrors = 0;

        newLines.forEach(line => {
            if (line.includes('ERROR: Client error')) {
                clientErrors++;
            } else if (line.trim().startsWith('Error:')) {
                nodeJSErrors++;
            }
        });
        lastCheckedLine = lines.length;

        if (clientErrors > 0 || nodeJSErrors > 0) {
            const message = `VTT Errors Detected:\n${clientErrors} client errors\n${nodeJSErrors} NodeJS errors`;
            call(`curl -H "Title: VTT Error Alert" -H "Priority: high" -d "${message}" ${config.ntfyURL}`);
        }
    } catch (err) {
        console.error(`Error reading MAIN server log: ${err}`);
    }

    // Update the last checked line number in config
    persistentData.lastCheckedLine = lastCheckedLine;
    persistentData.lastActivity = lastActivity;
    persistentData.previousRoomData = previousRoomData;
    persistentData.stackContextCache = stackContextCache;
    fs.writeFileSync(`${__dirname}/persistent-data.json`, JSON.stringify(persistentData, null, 2));
}, 5 * 60 * 1000);