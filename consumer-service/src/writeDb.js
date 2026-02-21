const { Pool } = require("pg");

module.exports = new Pool({
  connectionString: process.env.WRITE_DATABASE_URL
});