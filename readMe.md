# 人人影视历史资源查询


## 打包
`docker build -t zimuzu-legacy:1.0 .`

## 运行镜像

`docker run -d --name zimuzu-legacy \
     -p 8080:8080 \
     -e MONGO_DB_URL=mongodb://host.docker.internal:27017 \
     -e MONGO_DB_NAME=zimuzu \
     zimuzu-legacy:1.0 `

// host.docker.internal 会自动解析为宿主机的ip

## 发布镜像
`docker tag zimuzu-legacy:1.0 tza17313/zimuzu-legacy:1.0`
`docker push tza17313/zimuzu-legacy:1.0`
