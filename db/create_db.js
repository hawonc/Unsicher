const mysql = require('mysql');
var sql = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    timezone: 'Z'
    }
)

function makeTables(sql){
    sql.query('CREATE DATABASE IF NOT EXISTS unsicher;', function (err) {
        if (err) console.log(err);
        else {
            sql.query('USE unsicher;', function(err2) {
                if (err2) console.log(err2);
                else {
                    sql.query(`CREATE TABLE IF NOT EXISTS clickInfo(
                        id TEXT,
                        date TEXT,
                        ip TEXT,
                        os TEXT,
                        client TEXT,
                        device TEXT,
                        nation TEXT,
                        region TEXT,
                        city TEXT,
                        zip TEXT,
                        isp TEXT,
                        organization TEXT,
                        asn TEXT,
                        proxy TEXT
                    )`);

                }
            })
        }
    });
}

sql.connect(function(err) {
    if (err) throw err;
    console.log("Database connected");
    makeTables(sql);
});

module.exports = { sql };