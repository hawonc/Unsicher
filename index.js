const express = require('express');
const requestIp = require('request-ip')

const app = express();
const port = 3000;

var Fingerprint = require('express-fingerprint')

const parseIp = (req) =>
    req.headers['x-forwarded-for']?.split(',').shift()
    || req.socket?.remoteAddress

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

app.use(Fingerprint({
  parameters:[
      Fingerprint.useragent,
      Fingerprint.acceptHeaders,
      Fingerprint.geoip,
  ]
}))

app.get('*',function(req,res,next) {
  // Fingerprint object
  console.log(JSON.stringify(req.fingerprint))
  console.log(requestIp.getClientIp(req))
  console.log(parseIp(req))
  res.send("Hi, hope you enjoy sharing")
})