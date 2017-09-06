
var savePath = './img/';// 修改储存目录 /xxx/xxx/ (最后要加一个 '/' )

var superagent = require('superagent');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');

var finishCount = 0;// 已抓取的链接数量
var initConCount = 2; // 设置默认并发数量
var host = 'https://www.xxxx.com/htm/piclist2/'; // 默认起始页面
var toNextPage = true;// 是否需要自动抓取下一页
var pageNum = 1;// 需要抓取的页码
var pageSize = 10; // 抓取页数
var url = 'https://www.xxxx.com'; // 根站点,用于拼接图片地址

var start = function (host,toNextPage) {
    console.log('========================爬虫程序开始=============================');
    var uri = host ;
    superagent
        .get(uri)
        .end(function(err, res) {
            if(err){
                return console.log('错误：' + err);
            }
            // 解析获取到的dom
            var $ = cheerio.load(res.text);
            // 获取当前uri页面的所有图片页面链接
            var liS = $('.textList').find('li');
            // 图片页面链接集合
            var pagelinkArrs = [];
            liS.find('a').each(function () {
                var obj = {
                    title:$(this).text(),
                    link:$(this).attr('href')
                }
                pagelinkArrs.push(obj);
            });
            // 如果目录不存在则新建
            if (!fs.existsSync(savePath)) {
                fs.mkdirSync(savePath);
            }

            //pagelinkArrs.length = 5; // 设置只获取前5个链接

            if(pagelinkArrs.length >0 ){
                // 控制并发数请求图片页面链接，默认为每次发送initConCount次请求，即每次获取initConCount个页面资源
                async.mapLimit(pagelinkArrs,initConCount, function (item,callback) {
                    // 图片页面名称作为当前页面所有图片存放的目录
                    var title = savePath+item.title;
                    // 获取当前页面链接
                    var link = url+item.link;
                    if(link){
                        console.log('开始下载 ' +item.title+ ' 页面中图片资源。。。');
                        superagent
                            .get(link)
                            .end(function(err, res) {
                                // 获取当前链接dom元素
                                var $$ = cheerio.load(res.text);
                                // 如果目录不存在则新建
                                if (!fs.existsSync(title)) {
                                    fs.mkdirSync(title);
                                }
                                // 获取页面中所有图片集合
                                var imgs = $$('.picContent').find('img');
                                var imgsArr= [];
                                imgs.each(function () {
                                    imgsArr.push($$(this).attr('src'));
                                });
                                // 图片下载
                                imageDownload(imgsArr,title,item.title,function (_title) {
                                    // 总下载数量递增
                                    finishCount ++ ;
                                    console.log('第 '+finishCount+' 个链接  '+_title +'  所有图片已全部下载');
                                    // 结束回调，继续下一个链接
                                    callback(null,item);
                                });
                            });
                    }else{
                        console.log('获取不到link');
                    }
                },function () {
                    console.log('当前链接 '+host +' 爬取结束，共下载 ' + pagelinkArrs.length +' 个页面图片资源');
                    // 设置自动抓取下一页则执行如下
                    if(toNextPage){
                        // 如果抓取的页码没有超过设置的数量则执行如下
                        if(pageNum <= pageSize){
                            pageNum ++ ; // 页码递增
                            host = host + pageNum + '.htm';
                            console.log('继续抓取下一页 当前链接为 ' + host);
                            start(host,toNextPage);
                        }else {
                            console.log('========================爬虫程序结束=============================');
                        }
                    }
                })
            }
        });
};

// 图片下载
var imageDownload = function(newArr,dir,title,callback){
    // 如果目录不存在则新建
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    // 每次下载5张图片
    async.mapLimit(newArr,5, function (img,callback) {
        var filename = img.substring(img.lastIndexOf('\/')+1);
        // 文件不存在则下载
        if (!fs.existsSync(dir +'/'+ filename)) {
            var writeStream = fs.createWriteStream(dir +'/'+ filename);
            writeStream.on('close', function() {
                console.log('已成功下载： ' + filename);
                // 成功回调，继续下载下一张图片
                callback(null,img);
            });
            var req = superagent.get(img)
            req.pipe(writeStream);
        }else {
            // 文件已存在，下载下一张图片
            console.log('文件 ' +filename+ ' 已存在，跳过。');
            callback(null,img);
        }
    },function () {
        // 当前链接全部下载完成
        callback(title);
    });
};

// 爬虫程序开始
start(host,toNextPage);
