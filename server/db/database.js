const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect()
    .then((client) => {
        console.log("PostgreSQL connected successfully!");
        client.release();
    })
    .catch((err) => {
        console.error("PostgreSQL connection failed:");
        console.error(err.message);
    });

module.exports = pool;