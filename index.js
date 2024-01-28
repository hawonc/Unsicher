const express = require('express');
const requestIp = require('request-ip');
const { sql } = require('./db/create_db');
const DeviceDetector = require('node-device-detector')
const http = require('http')
const fs = require('fs');
const { UserInfoContextImpl } = require('twilio/lib/rest/oauth/v1/userInfo');
var crypto = require("crypto");
const spawn = require("child_process").spawn;


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

app.post('/generate', (req, res) => {
  var id = crypto.randomBytes(20).toString('hex');
  var exploc = req.location;
  sql.query(`INSERT INTO aiData VALUES (?,?,?,?)`, [id, 0, "", exploc], (err) => {
    if (err) {
      console.log("error when accessing table", err);
      res.sendStatus(500);
    }
  })
  res.send('http://www.unsicher.us/'+id)
})

app.get('/view/:id', (req, res) => {
  sql.query(`SELECT * FROM clickInfo WHERE id=?`, req.params.id, (err, rows) => {
    if (err) {
      console.log("error when accessing table", err);
      res.sendStatus(500);
    }
    if (!rows){
      res.send('nobody has clicked the link yet')
    }
    sql.query(`SELECT * FROM aiData  WHERE id=?`, req.params.id, (err, rows2) => {
      if (err) {
        console.log("error when accessing table", err);
        res.send(500);
      }
    let info = {
      data : {
        date : rows[0].date,
        os : rows[0].os,
        client : rows[0].client,
        device : rows[0].device,
        nation : rows[0].nation,
        region : rows[0].region,},
      userinput : {
        nation: rows2[0].exploc,
      }
    }
    
    fs.writeFile ("./tools/info.json", JSON.stringify(info), function(err) {
      if (err) throw err;
        console.log('python ready to run');
        const ai = spawn('python3',["./tools/rating.py", req.params.id]);
        ai.stdout.on('data', (data) => {
            console.log("python done")
            sql.query(`SELECT rating, comment FROM aiData WHERE id=?`, req.params.id, (err, rows3) => {
              if (err) {
                console.log("error when accessing table", err);
                res.send(500);
              }
              
              res.send(rows3[0])
            })
         });
      }
    );
  })
    })
});

app.get('/:id', async (req,res) => {
  // Fingerprint the user
  const now = new Date()
  let userAgent = req.get('User-Agent')
  console.log("processing user agent...")
  let device = detector.detect(userAgent)
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