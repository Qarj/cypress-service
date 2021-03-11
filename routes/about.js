const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    const version = process.env.npm_package_version;
    res.send(
        `<!DOCTYPE html><html><head><link rel="stylesheet" href="/static/summary.css"></head><body><h1>cypress-service version ${version}</h1></body></html>`,
    );
});

module.exports = router;
