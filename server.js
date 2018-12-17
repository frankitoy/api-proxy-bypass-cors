'use strict';

const chalk = require('chalk');
const express = require('express');
const fancyLog = require('fancy-log');
const hijackresponse = require('hijackresponse');
const httpProxy = require('http-proxy');
const https = require('https');
const morgan = require('morgan');
const toughCookie = require('tough-cookie');
const url = require('url');
const yargs = require('yargs');

const log = (...args) => fancyLog(name, ...args);

const argv = yargs
    .alias('p', 'port')
    .describe('port', 'Listen on port')
    .nargs('port', 1)
    .default('port', '8081')
    .argv;

const url = yargs
    .alias('u', 'url')
    .describe('url', 'URL to remote api')
    .nargs('url', 2)
    .argv;

const { name } = require('./package.json');
const { url, port } = argv;
const config = {
    '/api' : url
};

const app = express()
    .use(morgan('combined'));

for (const key of Object.keys(config)) {
    app.use(key, expressProxy(config[key]));
}

app.listen(port, () => {
    log('Serving', chalk.magenta(name), 'at', chalk.green('http://localhost:' + port));

    for (const key of Object.keys(config)) {
        log('Proxying', chalk.green(config[key]), 'via', chalk.green('http://localhost:' + port + key));
    }
});

function expressProxy(target) {
    const targetUrl = url.parse(target);
    const proxyConfig = { target, headers: { host: targetUrl.host } };

    if (targetUrl.protocol === 'https:') {
        proxyConfig.agent = https.globalAgent;
        proxyConfig.secure = false;
    }

    const proxyServer = httpProxy.createProxyServer(proxyConfig)
      .on('error', (err, req, res) => res.status(503).send('Service Unavailable'));

    return express.Router()
        .use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', req.headers['origin']);
            res.header('Access-Control-Allow-Credentials', true);

            next();
        })
        .options('/*', (req, res) => {
            res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
            res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);

            res.status(200).end();
        })
        .use((req, res, next) => {
            hijackresponse(res, (err, res) => {
                if (err) {
                    res.unhijack();

                    return next(err);
                }

                let cookies = res.getHeader('Set-Cookie');
                if (cookies) {
                    cookies = cookies.map(cookie => {
                        if (cookie) {
                            cookie = toughCookie.Cookie.parse(cookie);

                            cookie.domain = null;
                            cookie.secure = false;
                            cookie.path = '/';

                            cookie = cookie.toString();
                        }

                        return cookie;
                    });

                    res.setHeader('Set-Cookie', cookies)
                }

                res.pipe(res);
            });

            next();
        })
        .use((req, res) => proxyServer.web(req, res));
}