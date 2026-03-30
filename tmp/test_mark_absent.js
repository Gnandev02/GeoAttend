const handler = require('../api/mark-absent');

const req = {
    headers: {
        authorization: "Bearer FAKE_SECRET_123"
    }
};

const res = {
    status: function(s) {
        this.statusCode = s;
        return this;
    },
    json: function(data) {
        console.log(`[HTTP ${this.statusCode}] JSON Response:`, data);
    }
};

process.env.CRON_SECRET = "FAKE_SECRET_123";

async function run() {
    console.log("== Running Secure API Test ==");
    await handler(req, res);
    
    console.log("== Running Unauthorized Test ==");
    req.headers.authorization = "Bearer WRONG_SECRET";
    await handler(req, res);
    
    process.exit(0);
}

run();
