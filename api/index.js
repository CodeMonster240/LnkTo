'use strict';

const { createApp } = require('../app');

// Vercel invokes this Express app as a serverless function.
module.exports = createApp();
