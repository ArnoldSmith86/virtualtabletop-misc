const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');
const config = require('./config.json');


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
    exec(`cd "${__dirname}"; df -h .; echo; free -h; echo; ls -ld servers/*/ common/*/*/; echo; tail -n 100 servers/*/*log puppeteer.log; echo; ps axf -o pid,start,args`, (error, stdout, stderr) => {
        let statusText = '<pre>';
        statusText += escapeHTML(stdout);
        statusText += '</pre>';
        res.writeHead(200, { 'Content-Type': 'text/html' });
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
                    call(`"${__dirname}/main-update.sh" "${config.vttAdminURL}" >> "${__dirname}/servers/MAIN.log" 2>&1`);
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

setInterval(() => {
    const serverDir = fs.readdirSync(`${__dirname}/servers`);
    const currentTime = Date.now();
    const oneHourAgo = currentTime - (60 * 60 * 1000);

    serverDir.forEach(server => {
        if (!server.match(/^PR-\d+$/))
            return;
        try {
            const logFilePath = `${__dirname}/servers/${server}/server.log`;
            const stats = fs.statSync(logFilePath);
            const modifiedTime = stats.mtimeMs;

            if (modifiedTime < oneHourAgo) {
                const PR = server.match(/PR-(\d+)/)[1];
                call(`"${__dirname}/pr-stop.sh" "${config.templatePath}" "${PR}"`);
            }
        } catch (e) {
            console.error(`Error checking server log for ${server} (${__dirname}/servers/${server}/server.log): ${e}`);
        }
    });
}, 5 * 60 * 1000);
