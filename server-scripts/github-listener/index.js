const crypto = require('crypto')
const express = require('express')
const bodyParser = require('body-parser')
const { exec } = require("child_process");

const secret = 'GET_SECRET_FROM_GITHUB';

const sigHeaderName = 'X-Hub-Signature'

const app = express()
app.use(bodyParser.json())

function verifyPostData(req, res, next) {
  const payload = JSON.stringify(req.body)
  if (!payload) {
    return next('Request body empty')
  }

  const sig = req.get(sigHeaderName) || ''
  const hmac = crypto.createHmac('sha1', secret)
  const digest = Buffer.from('sha1=' + hmac.update(payload).digest('hex'), 'utf8')
  const checksum = Buffer.from(sig, 'utf8')
  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    return next(`Request body digest (${digest}) did not match ${sigHeaderName} (${checksum})`)
  }
  return next()
}

function call(cmd) {
  console.log(new Date().toISOString(), "CALLING", cmd);
  exec(cmd);
}

app.post('/data', verifyPostData, function (req, res) {
  try {
    console.log(new Date().toISOString(), req.headers['x-github-event'], req.body.action);

    if(req.headers['x-github-event'] == 'push' && req.body.ref === 'refs/heads/main')
      call(`bash /home/safeuser/github-listener/new-main-push.sh`);

    if(req.headers['x-github-event'] == 'pull_request' && req.body.action.match(/opened/))
      call(`bash /home/safeuser/github-listener/new-pull-request.sh ${req.body.number}`);

    if(req.headers['x-github-event'] == 'pull_request' && req.body.action == 'synchronize')
      call(`bash /home/safeuser/github-listener/update-pull-request.sh ${req.body.number}`);

    if(req.headers['x-github-event'] == 'pull_request' && req.body.action == 'closed')
      call(`bash /home/safeuser/github-listener/close-pull-request.sh ${req.body.number}`);
  } catch(e) {
    console.log(new Date().toISOString(), "EXCEPTION", e);
  }
  res.status(200).send('Request body was signed')
})

app.use((err, req, res, next) => {
  if (err) console.error(err)
  res.status(403).send('Request body was not signed or verification failed')
})

app.listen(8140);
