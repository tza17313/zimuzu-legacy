'use strict';

const express = require('express');
const {Feed} = require('feed');
const mongo = require('./utils/db');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

const {
    MONGO_DB_URL = 'mongodb://127.0.0.1:27017',
    MONGO_DB_NAME = 'zimuzu',
    MONGO_DB_COL_NAME,
    RSS_HOST = 'http://127.0.0.1:8080'
} = process.env;
console.log('process.env:', process.env);

// App
const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.get('/rss/:id', (req, res) => {
    const host = RSS_HOST
    const url = host + req.url
    findOneById(req.params.id).then((result) => {
        const {s, f = 'MP4'} = req.query
        // f enum("APP","HDTV","MP4","WEB-1080P","WEB-720P","BD-1080P","BD-720P","4K-2160P")
        const info = result.data.info
        const list = result.data.list

        let subTitle=""
        if(!isNaN(s)){
            subTitle=`/第${s}季`
        }

        let feed = new Feed({
            title: info.cnname + subTitle + "/" + f,
            link: url,
            generator: 'zimuzu-legacy',
            docs: '/rss/:id?s=1&f=MP4;  id为剧id，s为第几季，f为下载格式；  s为数字，比如1、2、3、4、5；  f可以为APP,HDTV,MP4,WEB-1080P,WEB-720P,BD-1080P,BD-720P,4K-2160P',
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
                                description: `season_num:${season.season_num}  || formats:enum(${season.formats})`,
                                // enclosure: {
                                //     title: ep.name,
                                //     length: ep.size,
                                //     url: `${host}/enclosure/${req.params.id}_${season.season_num}_${f}_${ep.episode}_${j}`,
                                //     type: 'application/x-bittorrent'
                                // }
                            })
                            break
                        }

                    }
                }


            }
        }

        res.set('Content-Type', 'text/xml');
        res.send(feed.rss2());

    }).catch((err) => {
        console.log('/rss 错误:', err);
        res.status(500).send({
            status: 0,
            info: '500'
        });
    });

});

app.get('/enclosure/:id', (req, res) => {

    if (!req.params.id.split) {
        return res.status(500).send({
            status: 0,
            info: '/enclosure/:id id格式错误'
        });
    }
    const fileInfo = req.params.id.split('_') //  10733_5_MP4_1_1

    const id = fileInfo[0]
    const season_num = fileInfo[1]
    const foramt = fileInfo[2]
    const episode = fileInfo[3]
    const fileIndex = fileInfo[4]

    findOneById(id).then((result) => {
        const list = result.data.list

        const season = list.find((season) => ~~season_num === ~~season.season_num)
        if (season) {

            const epList = season.items[foramt]
            const epInfo = epList.find((_ep) => ~~episode === ~~_ep.episode)
            if (epInfo && epInfo.files[fileIndex]) {
                res.set('Content-Type', 'application/x-bittorrent')
                res.send(epInfo.files[fileIndex].address)
                return
            }
        }

        res.status(404).send({
            status: 0,
            info: '404'
        });


    }).catch((err) => {
        console.log('/rss 错误:', err);
        res.status(500).send({
            status: 0,
            info: '500'
        });
    });
});


async function findOneById(id) {
    try {
        let doc = await mongo.findOne({'id': Number(id)});
        if (doc && doc.data) {
            return doc.data;
        }
    } catch (e) {
        console.log('e:', e);

    }
}

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
    console.log(`Running on ${RSS_HOST}`);
}).catch((err) => {
    console.log('MongoDB 连接错误', err);
});

