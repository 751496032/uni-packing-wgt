const qiniu = require("qiniu")
const path = require('path')
const fs = require("fs")


const {initConfig, configFilePath, configOutputFilePath, configReleaseFilePath,manifestPath} = require("./file-mgr")


const config = require(configFilePath)

class Uploader {

    #isRelease =  false

    upload(filePath) {
        this.#isRelease =  filePath.includes("release")
        if (this.#isRelease && !fs.existsSync(configReleaseFilePath)){
            return
        }
        let bucket = config.upload.devBucket
        let accessKey = config.upload.devAccessKey
        let secretKey = config.upload.devSecretKey
        let domain = config.upload.devDomainName
        let dir = config.upload.devDir

        if (this.#isRelease) {
            const releaseConfig = require(configReleaseFilePath)
            bucket = releaseConfig.upload.bucket
            accessKey = releaseConfig.upload.accessKey
            secretKey = releaseConfig.upload.secretKey
            domain = releaseConfig.upload.domainName
            dir = releaseConfig.upload.dir
        }
        // const fileName = this.#getFileName(filePath)
        const fileName = filePath.replace("./dist", dir)
        const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
        const options = {
            scope: bucket + ":" + fileName
        }
        const putPolicy = new qiniu.rs.PutPolicy(options)

        const uploadToken = putPolicy.uploadToken(mac)
        const configQi = new qiniu.conf.Config()
        const localFile = filePath
        const formUploader = new qiniu.form_up.FormUploader(configQi)
        const putExtra = new qiniu.form_up.PutExtra()

        return formUploader.putFile(uploadToken, fileName, localFile, putExtra, function (respErr, respBody, respInfo) {
            if (respErr) {
                console.log("========上传失败========")
                console.error(respErr)
                return
            }

            if (respInfo.statusCode === 200) {
                console.log(respBody);
                const bucketManager = new qiniu.rs.BucketManager(mac, configQi)
                const publicDownloadUrl = bucketManager.publicDownloadUrl(domain, fileName)
                console.log("前往刷新url: ", publicDownloadUrl)
            } else {
                console.log("========上传失败========")
                console.log(respInfo.statusCode);
                console.log(respBody);
            }
        })

    }

    uploadFiles(...filePaths) {
        return Promise.allSettled(filePaths.map(path => this.upload(path)))
    }

    #getFileName = (filePath) => {
        return path.basename(filePath)
    }
}

module.exports = new Uploader()




