require('dotenv').config({path: '.env.local'});
require('./api/utils/db').query("ALTER TABLE attendance ADD COLUMN source VARCHAR(10) DEFAULT 'auto';")
  .then(() => console.log('Done'))
  .catch(e => console.log(e.message))
  .finally(() => process.exit(0));
