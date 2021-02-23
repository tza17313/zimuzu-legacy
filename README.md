# 人人影视历史资源查询

支持任意可运行docker的平台；

灵感、数据来自BennyThink大佬的分享：https://github.com/tgbot-collection/YYeTsBot

鉴于docker-compose在群晖、unraid中运行比较麻烦，以及我只需要网站部分的功能；

所以我用node.js将web部分的逻辑分类出来了，页面功能做了精简；仅保留剧名搜索和下载页；

运行原理：zimuzu-legacy负责提供http服务，数据源由单独的mongo提供；

github地址：https://github.com/tza17313/zimuzu-legacy

## 运行方法

### 安装最新版本的MongoDB

> 如果已安装MongoDB，跳至 **将数据导入MongoDB中**

1、获取最新版的 MongoDB 镜像：`docker pull mongo:latest`

2、运行容器`docker run --name mongo -p 27017:27017 -v /my/own/datadir:/data/db -d mongo`

如果需要添加认证、配置文件，请查看官方文档：https://hub.docker.com/_/mongo

群晖、威联通、unraid等nas系统都有提供docker图形化界面，在图形化界面中安装的方法请自行上网搜索

### 将数据导入MongoDB中

1、下载MongoDB的历史数据 yyets_mongodb.zip：https://mega.nz/folder/8SQUQDDA#B_pUPBIvCcfc2u4gpJvPyA

2、上传zip文件至nas系统中，并解压，记住文件地址，群晖的文件管理器右键->属性中可以看到详细的路径，比如：`/volume1/data/yyets/resource.bson`；

3、打开nas的ssh功能；

> 以群晖为例：控制面板=>终端机和SNMP=>启用SSH功能，记下端口号;
> unraid可以直接用网页的终端功能

5、以管理员身份登录：`ssh user@192.168.1.100 -p 7010`，然后输入user对应的密码
 > user为有administrator权限的账号  
 > 192.168.1.100为nas ip地址  
 > 7010为ssh端口号  
 > 以上三项请自行替换
 
6、切换为root身份：`sudo -i`，输入user对应的密码
 > 群晖执行docker命令需要root权限
 > unraid不需要这一步

7、获取MongoDB的container id:`docker ps -a`

8、复制文件至docker中：`docker cp /volume1/data/yyets 218f799d8055:/tmp`
 > /volume1/data/yyets 为第2步解压的文件， yyets文件夹下有resource.bson、resource.metadata.json两个文件  
 > 218f799d8055为mongo对应的container id  
 > /tmp为docker容器中的目录  
 > /volume1/data/yyets 和 218f799d8055 这两项请自行替换  

9、进入容器：`docker exec -it 218f799d8055 bash`

10、导入数据：`mongorestore -d zimuzu /tmp/yyets`

导入成功后，可以使用mongo shell验证下数据是否导入成功；

 > mega网盘需科学上网才能访问

### 运行zimuzu-legacy

1、获取最新版的镜像：`docker push tza17313/zimuzu-legacy:latest`  

2、运行容器：
```bash
docker run -d --name zimuzu-legacy \ 
    -p 8080:8080 \ 
    -e MONGO_DB_URL=mongodb://host.docker.internal:27017 \ 
    -e MONGO_DB_NAME=zimuzu \ 
    tza17313/zimuzu-legacy
```

3、访问http://192.168.1.100:8080访问网站

> host.docker.internal为docker容器中指向宿主机的域名
> 27017为mongo映射到宿主机上的端口号
> mongodb://host.docker.internal:27017也可以替换为mongodb://192.168.1.100:27017这种ip的方式

> 也可以使用图形化界面安装
