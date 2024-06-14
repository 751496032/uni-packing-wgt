const qiniu = require("qiniu")
const path = require('path')
const fs = require("fs")


const {initConfig, configFilePath, configOutputFilePath, configReleaseFilePath, manifestPath} = require("./file-mgr")


const config = require(configFilePath)
const {syncServer, checkYiConfigExist} = require("./server-mgr");
const {isEmptyMulti} = require("./utils");

class Uploader {

    upload(filePath) {
        const isRelease = filePath.includes("release")
        const isBeta = filePath.includes("beta")
        const isDev = filePath.includes("dev")
        if (isRelease && !fs.existsSync(configReleaseFilePath)) {
            return
        }
        let bucket = config.upload.devBucket
        let accessKey = config.upload.devAccessKey
        let secretKey = config.upload.devSecretKey
        let domain = config.upload.devDomainName
        let dir = config.upload.devDir

        if (isRelease) {
            const releaseConfig = require(configReleaseFilePath)
            bucket = releaseConfig.upload.bucket
            accessKey = releaseConfig.upload.accessKey
            secretKey = releaseConfig.upload.secretKey
            domain = releaseConfig.upload.domainName
            dir = releaseConfig.upload.dir
        }
        if (isEmptyMulti(bucket, accessKey, secretKey, domain, dir)) {
            console.error("检查是否配置七牛相关参数")
            return
        }
        // 测试情况使用getFileName作为key

        let key = `${dir}/${Date.now()}`
        if (filePath?.includes("./dist")) {
            key = filePath.replace("./dist", dir)
        } else {
            key = `${dir}/${this.#getFileName(filePath)}`
        }
        let mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
        const options = {
            scope: bucket + ":" + key
        }
        const putPolicy = new qiniu.rs.PutPolicy(options)

        const uploadToken = putPolicy.uploadToken(mac)
        const configQi = new qiniu.conf.Config()
        const localFile = filePath
        const formUploader = new qiniu.form_up.FormUploader(configQi)
        const putExtra = new qiniu.form_up.PutExtra()
        const target = this
        return formUploader.putFile(uploadToken, key, localFile, putExtra, async function (respErr, respBody, respInfo) {
            if (respErr) {
                console.log("========上传失败========")
                console.error(respErr)
                return
            }

            if (respInfo.statusCode === 200) {
                console.log(respBody);
                const bucketManager = new qiniu.rs.BucketManager(mac, configQi)
                const publicDownloadUrl = bucketManager.publicDownloadUrl(domain, key)
                console.log("前往刷新url: ", publicDownloadUrl)
                if (checkYiConfigExist()) {
                    if (isDev) await syncServer({url: publicDownloadUrl, dev: true})
                    if (isBeta) await syncServer({url: publicDownloadUrl, beta: true})
                    if (isRelease) await syncServer({url: publicDownloadUrl, release: true})
                } else {
                    // 七牛sdk cdn
                    if (config.refreshUrl)
                        target.refreshCdn(accessKey, secretKey, publicDownloadUrl)
                }


            } else {
                console.log("========上传失败========")
                console.log(respInfo.statusCode);
                console.log(respBody);
            }
        })

    }

    refreshCdn(accessKey, secretKey, publicDownloadUrl) {
        let mac2 = new qiniu.auth.digest.Mac(accessKey, secretKey)
        let cdnManager = new qiniu.cdn.CdnManager(mac2);
        //URL 列表
        let urlsToRefresh = [publicDownloadUrl];
        //刷新链接，单次请求链接不可以超过100个，如果超过，请分批发送请求
        cdnManager.refreshUrls(urlsToRefresh, function (err, respBody, respInfo) {
            console.log("")
            console.log("=========== 缓存刷新结果 =============")
            if (err) {
                console.error(err)
                return
            }

            console.log(respInfo.statusCode);
            if (respInfo.statusCode === 200) {
                console.log(JSON.stringify(respBody, null, 2))
            }
        });
    }

    uploadFiles(...filePaths) {
        return Promise.allSettled(filePaths.map(path => this.upload(path)))
    }

    #getFileName = (filePath) => {
        return path.basename(filePath)
    }
}

module.exports = new Uploader()




