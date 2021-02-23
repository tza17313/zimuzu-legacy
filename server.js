'use strict';

const express = require('express');
const mongo = require('./utils/db');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

const { MONGO_DB_URL = 'mongodb://127.0.0.1:27017', MONGO_DB_NAME = 'zimuzu', MONGO_DB_COL_NAME } = process.env;
console.log('process.env:', process.env);

// App
const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/api/resource', (req, res) => {
  _q(req.query).then((result) => {
    res.send(result);
  }).catch((err) => {
    console.log('/api/resource 错误:', e);
    res.status(500).send({
      status: 0,
      info: '500',
    });
  });

  async function _q(query) {
    if (query.id) {
      try {
        let doc = await mongo.findOne({ 'id': Number(query.id) });
        if (doc && doc.data) {
          return doc.data;
        }
      } catch (e) {
        console.log('e:', e);

      }
    }

    if (query.kw) {
      try {
        let doc = await mongo.search(query.kw);
        if (doc && doc.length) {
          return {
            status: 1,
            info: 'OK',
            data: doc.map((i) => i.data.data.info),
          };
        }
      } catch (e) {
        console.log('e:', e);

      }
    }
    return {
      status: 0,
      info: 'not found',
    };
  }
});

mongo.init(MONGO_DB_URL, MONGO_DB_NAME, MONGO_DB_COL_NAME).then(() => {
  app.listen(PORT, HOST);
  console.log(`Running on http://${HOST}:${PORT}`);
}).catch((err) => {
  console.log('MongoDB 连接错误', err);
});

