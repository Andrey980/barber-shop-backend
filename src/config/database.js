const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'barbershop',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = connection.promise();
