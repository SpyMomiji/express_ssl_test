const nPath = require("node:path");
const nProcess = require("node:process");
const nFs = require('node:fs');
const nHttps = require('node:https');
const nHttp = require('node:http');

const express = require("express");
const multer = require("multer");
const mime = require('mime-types');

const app = express();
const mpCwd = nProcess.cwd();
const uploadHtml = nPath.join( mpCwd, 'upload.htm' );
const error404 = nPath.join( mpCwd, '404.jpg' );
const iMulter = multer({ dest: nPath.join( mpCwd, 'upload' ), preservePath: true });

const hskey = 'privatekey.pem'; //你的密鑰
const hscert = 'certificate.pem'; //你的憑證


function makeHead(res, file){
    let lstat = nFs.lstatSync(file);
    let m_ = mime.lookup(file);
    res.setHeader('Last-Modified', lstat.mtime.toUTCString() );
    res.setHeader('Accept-Ranges', 'bytes' );
    res.setHeader('Content-Length', lstat.size );
    if(m_)
    res.setHeader('Content-Type', m_);
}

app.get('/', function(req, res, next ){
    res.sendFile(uploadHtml);
})

app.get('/upload/*', function(req, res, next ){
    let requistFile = nPath.join(mpCwd, decodeURI(req.path) );
    console.log(requistFile);
    //為避免疑惑的請求，此處會將能訪問的範圍限制在 upload 裡
    if( !nFs.existsSync(requistFile) || nPath.relative(nPath.join(mpCwd,'upload'), requistFile ).startsWith('..')){
        return next(404);
    } else {
        res.status(200);
        makeHead(res, requistFile );
        res.sendFile(requistFile);
    }
})

app.post('/',
/*  如果是在 async function 下
    await new Promise(function(resolve, reject){
        let iMulter = multer({ dest: nPath.join( mpCwd, 'upload' ), preservePath: true });
        iMulter.any()(req, res, (_)=>{_?reject(_):resolve()});
        //multer 處理完上傳內容後一定會調用 next，不論失敗與否
    })
    req.files; //然後很快就能在這裡取用
    req.body;
*/
iMulter.any(), //我全都要
function(req, res, next ){
    req.files.forEach( file => { //解決非英文字元亂碼的問題
        file.originalname = Buffer.from(file.originalname,'binary').toString();
    });
    console.log(req.files); //相同 name 的檔案都各自獨立
    console.log(req.body); //多個相同 name 會變成陣列，反之會變成字串
    for( let file of req.files ){
        let upload = nPath.join( file.destination, file.filename );
        let tobe = nPath.join( file.destination, file.originalname );
        if(nFs.existsSync(tobe)) nFs.unlinkSync(tobe);
        nFs.renameSync(upload,tobe);
    }

    res.status(200);
    makeHead(res, uploadHtml );
    res.sendFile(uploadHtml);

})

app.get('/*',function(req ,res ,next ){
    next(404);
})

app.use(function(err, req ,res ,next ){
    console.log(err); //全部都當成 404，但仍會打印錯誤
    res.status(404);
    makeHead(res, error404 );
    res.sendFile(error404);
})

if( nFs.existsSync(hskey) && nFs.existsSync(hscert) )
nHttps.createServer({
	key: nFs.readFileSync(hskey),
    cert: nFs.readFileSync(hscert)
}, app).listen(443, ()=>console.log('443 server on'));

nHttp.createServer({}, app).listen(80, ()=>console.log('80 server on'));


