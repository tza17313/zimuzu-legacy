'use strict';

const express = require('express');
const {Feed} = require('feed');
const mongo = require('./utils/db');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

const {MONGO_DB_URL = 'mongodb://127.0.0.1:27017', MONGO_DB_NAME = 'zimuzu', MONGO_DB_COL_NAME} = process.env;
console.log('process.env:', process.env);

// App
const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/rss/:id', (req, res) => {
    const url = 'http://' + req.headers.host + req.url
    _q(req.params.id).then((result) => {
        const {s, f = 'MP4'} = req.query
        // f enum("APP","HDTV","MP4","WEB-1080P","WEB-720P","BD-1080P","BD-720P","4K-2160P")
        const info = result.data.info
        const list = result.data.list

        let feed = new Feed({
            title: info.cnname + ' / ' + info.enname,
            link: url,
            generator:"zimuzu-legacy",
            docs:"/rss/:id?s=1&f=MP4;  id为剧id，s为第几季，f为下载格式；  s为数字，比如1、2、3、4、5；  f可以为APP,HDTV,MP4,WEB-1080P,WEB-720P,BD-1080P,BD-720P,4K-2160P",
            description: info.aliaisname || info.cnname
        });

        let seasons = list
        if (!isNaN(s)) {
            seasons = seasons.filter((season) => ~~s === ~~season.season_num)
        } else {
            seasons.sort((a, b) => a.season_num - b.season_num)
        }

        for (let i = 0; i < seasons.length; i++) {
            let season = seasons[i]
            if (season.items[f]) {
                //根据视频格式过滤

                let sorted_ep = season.items[f].sort((a, b) => a.episode - b.episode)
                // 集数从小到大排序
                for (let j = 0; j < sorted_ep.length; j++) {
                    let ep = sorted_ep[j]
                    for (let j = 0; j < ep.files.length; j++) {
                        let file = ep.files[j]
                        if (~~file.way === 2) {
                            feed.addItem({
                                guid: ep.itemid + '_' + j,
                                title: ep.name,
                                link: file.address,
                                description: ep.name,
                                enclosure: {
                                    title: ep.name,
                                    length:ep.size,
                                    url: file.address,
                                    type: 'application/x-bittorrent'
                                }
                            })
                            break
                        }

                    }
                }


            }
        }


        res.send(feed.rss2());

    }).catch((err) => {
        console.log('/rss 错误:', err);
        res.status(500).send({
            status: 0,
            info: '500'
        });
    });

    async function _q(id) {
        try {
            let doc = await mongo.findOne({'id': Number(id)});
            if (doc && doc.data) {
                return doc.data;
            }
        } catch (e) {
            console.log('e:', e);

        }
    }
});

app.get('/api/resource', (req, res) => {
    _q(req.query).then((result) => {
        res.send(result);
    }).catch((err) => {
        console.log('/api/resource 错误:', e);
        res.status(500).send({
            status: 0,
            info: '500'
        });
    });

    async function _q(query) {
        if (query.id) {
            try {
                let doc = await mongo.findOne({'id': Number(query.id)});
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
                        data: doc.map((i) => i.data.data.info)
                    };
                }
            } catch (e) {
                console.log('e:', e);

            }
        }
        return {
            status: 0,
            info: 'not found'
        };
    }
});

mongo.init(MONGO_DB_URL, MONGO_DB_NAME, MONGO_DB_COL_NAME).then(() => {
    app.listen(PORT, HOST);
    console.log(`Running on http://${HOST}:${PORT}`);
}).catch((err) => {
    console.log('MongoDB 连接错误', err);
});

