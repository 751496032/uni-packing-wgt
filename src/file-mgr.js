const fs = require("fs")

const config = `{
    "runDev": true,
    "runBeta": false,
    "runRelease": false,
    "isIncrementVersion": true,
    "uploadWgtPackage": false,
    "pkgCopyToNativeDir": false,
    "refreshUrl": true,
    "enableRefreshHistory":false,
    "enableServerLog": false,
    "upload": {
        "devAccessKey": "",
        "devSecretKey": "",
        "devBucket": "",
        "devDomainName": "",
        "devDir": "app"
    }

}`

const configOutput = `{
    "sourceDir": "./dist/dev/app",
    "targetDir": "替换成项目路径/app/src/main/assets/apps/替换成uniAppId/www",
}`

const configRelease = `{
  "upload": {
    "accessKey": "",
    "secretKey": "",
    "bucket": "",
    "domainName": "",
    "dir": "app"
  },
  "qiniu": {
    "baseUrl": "",
    "api": {
      "login": "",
      "cdn_cache_refresh":"",
      "refresh_history":"",
    },
    "account": {
      "username": "",
      "password": ""
    },
    "token": ""
  },
  "configs": {
    "key": "app_test",
    "updateAndroid": true, 
    "updateIOS": true,
    "updateDesc": "测试",
    "account": {
      "username": 0,
      "password": 0
    },
    "token": ""
  },
  "versionName": "1.0.0",
  "versionCode": 1
}`

const rootDir = process.cwd()
const dir = `${rootDir}/configs/`
const configFilePath = dir + 'config.json'
const configOutputFilePath = dir + 'config-output.json'
const configReleaseFilePath = dir + 'config-release.json'

const manifestPath = `${rootDir}/src/manifest.json`

const manifestTsPath = `${rootDir}/manifest.config.ts`


const configs = new Map()
configs.set(configFilePath, config)
configs.set(configOutputFilePath, configOutput)
configs.set(configReleaseFilePath, configRelease)

function createFile(filePath, data) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true})
    }
    fs.writeFileSync(filePath, data, {encoding: 'utf8'})
    if (!fs.existsSync(filePath)) {
        throw Error("Couldn't create file: " + filePath)
    }

}

function initConfig() {
    let initConfig = true
    if (fs.existsSync(configFilePath)) {
        initConfig = false
        return initConfig
    }

    try {
        configs.forEach((value, key, map) => {
            createFile(key, value)
        })
        if (initConfig) {
            console.log("配置文件初始化成功，请配置相关参数再次执行命令")
        }
        return initConfig
    } catch (e) {
        console.error(e)
        return initConfig
    }
}

module.exports = {
    initConfig, configFilePath, configOutputFilePath, configReleaseFilePath, manifestPath, manifestTsPath
}

