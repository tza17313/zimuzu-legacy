const MongoClient = require('mongodb').MongoClient;

let client = null;
let db = null;
let col_res = null;

function init(url, dbName, colName) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, _client) {
      if (err) {
        console.log('MongoDB 连接失败:', err);
        reject(err);
      } else {
        console.log(`MongoDB 连接成功 url: ${url}`);
        client = _client;
        db = client.db(dbName);

        db.listCollections({},{nameOnly:true}).toArray().then((list)=>{

          if (list.length === 1 || !colName && list.length > 0) {
            colName = list[0].name;
            console.log(`数据源已自动选择 db: ${dbName} col: ${list[0].name}`);
            //如果库中只有一个表，忽略env中指定表名
            //   或者未指定表名
          }
          col_res = db.collection(colName);
          resolve(_client);

        }).catch((e)=>{
          console.log('db.listCollections 错误:', e);
          reject(e)
        })


      }
    });
  });
}

function close() {
  client.close();
}


/**
 * 查询具体的信息
 * @param param
 * @param colName - 表
 * @returns {Promise}
 */
function findOne(param, colName) {
  let col = col_res;
  if (colName) {
    col = db.collection(colName);
  }
  if (!col) {
    return Promise.reject('db 还未初始化好');
  }
  return col.findOne(param, { projection: { '_id': 0 } });
}


/**
 * 查询列表 - 未做分页、最多99个
 * @param kw
 * @param colName - 表
 * @returns {Promise}
 */
function search(kw, colName) {
  return new Promise(function(resolve, reject) {
    let col = col_res;
    const reg = new RegExp(`.*${kw}.*`);
    if (colName) {
      col = db.collection(colName);
    }

    if (!col) {
      return reject('db 还未初始化好');
    }
    col.find({
      '$or': [
        { 'data.data.info.cnname': { '$regex': reg, '$options': '-i' } },
        { 'data.data.info.enname': { '$regex': reg, '$options': '-i' } },
        { 'data.data.info.aliasname': { '$regex': reg, '$options': '-i' } },
      ],
    }, {
      projection: {
        '_id': 0,
        'id': 0,
        'url': 0,
        'name': 0,
        expire: 0,
        expire_cst: 0,
        'data.data.list': 0,
      },
    }).limit(99).toArray(function(err, docs) {
      if (err) {
        reject(err);
      } else {
        resolve(docs);
      }
    });
  });
}


module.exports = {
  init,
  close,
  findOne,
  search,
};
