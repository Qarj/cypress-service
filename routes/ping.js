const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.send('<!DOCTYPE html><html><body><h1>cypress-service is up!</h1></body></html>');
});

module.exports = router;
