#!/usr/bin/env node

const fs = require('fs');
const express = require('express');
const server = express();
const request = require('request');
const promClient = require('prom-client');
const register = promClient.register;

const balance = new promClient.Gauge({
    name: 'one_cloud_balance',
    help: 'account balance',
    labelNames: [
        'account_id',
        'account_email',
        'balance_till_date_utc',
    ],
});

let config = fs.readFileSync(__dirname + '/config.json');
config = JSON.parse(config);

const API_KEY = config.api_key;

server.get('/metrics', (req, res) => {

    res.set('Content-Type', register.contentType);
    res.end(register.metrics());

});

setInterval(() => {

    let options = {

        url: 'https://api.1cloud.ru/account',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },

    };

    request(options, (err, res, body) => {

        if (err || res.statusCode != 200) return;

        body = JSON.parse(body);

        let date = body.BalanceTillDateUtc
            .replace(/^(\d+)\-(\d+)\-(\d+)$/, '$3.$2.$1');

        balance.set({
            account_id: body.ID,
            account_email: body.Email,
            balance_till_date_utc: date,
        }, body.Balance);

    });

}, 5000);

console.log(`Server listening to ${config.port}, metrics exposed on /metrics endpoint`);
server.listen(config.port);
