#!/usr/bin/env node
const fs = require("fs")
const path = require('path')
const execSync = require('child_process').execSync
const compressing = require('compressing');

const {initConfig, configFilePath, configOutputFilePath, configReleaseFilePath,manifestPath,manifestTsPath} = require("./file-mgr")
if (initConfig()) return ;

const manifest = require(manifestPath)

const config = require(configFilePath)
const uploader = require("./upload-tools")
const copyDirectory = require("./copy-directory")

// let mf = fs.readFileSync('./src/manifest.json', {encoding: 'utf-8'});
// const manifest = JSON.parse(removeComments(mf));

const appid = manifest.appid



const commands = []
if (config.runDev) commands.push('npm run build:app-plus-dev')
if (config.runBeta) commands.push('npm run build:app-plus-beta')
if (config.runRelease) commands.push('npm run build:app-plus-release')

if (commands.length === 0){
    console.error("no command")
    return
}
// if (config.runRelease && fs.existsSync(configReleaseFilePath)) {
//     const releaseConfig = require(configReleaseFilePath)
//     let code = releaseConfig.versionCode
//     let name = releaseConfig.versionName
    // if (config.isIncrementVersion){
    //     code += 1
    //     name = incrementVersion(name)
    //     releaseConfig.versionCode = code
    //     releaseConfig.versionName = name
    // }
//     changeVersion(code, name)
// } else {
if (config.isIncrementVersion) {
    let code = 0
    if (manifest.versionCode instanceof Number) {
        code = manifest.versionCode + 1;
    } else {
        code = parseInt(manifest.versionCode) + 1;
    }
    let name = incrementVersion(manifest.versionName)
    console.log("code: " + code, "name: " + name)
    changeVersion(code, name)
}

// }

function changeVersion(code, name) {
    // 更新版本号
    if (fs.existsSync(manifestTsPath)){
        let filePath = manifestTsPath
        const data = fs.readFileSync(filePath, "utf8")
        const modifiedData = data.replace(/versionName: '(.+?)'/, `versionName: '${name}'`).replace(/versionCode: '(\d+)'/, `versionCode: '${code}'`);
        fs.writeFileSync(filePath, modifiedData, "utf8")
        return
    }

    manifest.versionCode = code.toString()
    manifest.versionName = name
    let replaceFiles = [{
        path: manifestPath,
        name: 'manifest.json',
        content: JSON.stringify(manifest, null, 2)
    }]
    replaceFiles.forEach((file) => {
        fs.writeFileSync(file.path, file.content, {encoding: 'utf-8'})
    })

}


let err = false
const command = commands.join('\n')
console.log("======开始生成资源包=====")
try {
    execSync(command, {encoding: 'utf-8'})
} catch (e) {
    err = true
    console.error("资源包生成异常", e)
}
if (err) return
console.log("======资源包生成完成=====")

// wgt压缩打包
let wgtInfos = []
commands.forEach((c) => {
    let targetPath = ''
    let wgtOutFile = ''
    if (c.includes("dev")) {
        targetPath = "./dist/dev/app/"
        wgtOutFile = `./dist/dev/${appid}.wgt`
    }else if (c.includes("beta")){
        targetPath = "./dist/beta/app/"
        wgtOutFile = `./dist/beta/${appid}.wgt`
    }else if (c.includes("release")){
        targetPath = "./dist/release/app/"
        wgtOutFile = `./dist/release/${appid}.wgt`
    }
    if (!!targetPath && !!wgtOutFile){
        wgtInfos.push({targetPath, wgtOutFile})
    }
})
console.log("======资源包开始压缩=====")
Promise.allSettled(wgtInfos.map(item => generateWgt(item)))
    .then((r) => {
        console.log(...r)
        console.log("======资源包压缩任务完成=====")
        if (config.uploadWgtPackage) {
            let files = r.map(v => v.value)
            uploader.uploadFiles(...files).finally(() => {
                console.log("======资源包上传完成=====")
            })
        }
        if (config.pkgCopyToNativeDir && fs.existsSync(configOutputFilePath)) {
            console.log("======资源包开始复制=====")
            const output = require(configOutputFilePath)
            if (!!output.sourceDir && fs.existsSync(output.sourceDir)){
                copyDirectory.copy(output.sourceDir, output.targetDir)
                console.log("======资源包复制任务完成=====")
            }
        }
    }).catch((error) => {
        console.error("资源包压缩任务异常", error)
    })

function generateWgt(target = {targetPath: "", wgtOutFile: ""}) {
    const targetPath = target.targetPath
    const wgtOutFile = target.wgtOutFile
    return new Promise((resolve, reject) => {
        if (!targetPath || !wgtOutFile) {
            reject("target path not found")
            return
        }
        const tarStream = new compressing.zip.Stream()
        let paths = fs.readdirSync(targetPath)
        paths.forEach((item) => {
            let filePath = path.join(targetPath, item)
            tarStream.addEntry(filePath)
        })
        tarStream
            .pipe(fs.createWriteStream(wgtOutFile))
            .on('error', (err) => {
                reject(`${wgtOutFile}: ${err.message}`)
            })
            .on('finish', () => {
                resolve(`${wgtOutFile}`)
            })
    })
}


function removeComments(jsonString) {
    return jsonString.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
}


function incrementVersion(version) {
    const versionParts = version.split('.');
    const lastPartIndex = versionParts.length - 1;
    let lastPart = versionParts[lastPartIndex];
    if (!isNaN(lastPart)) {
        const incrementedPart = parseInt(lastPart, 10) + 1;
        if (incrementedPart === 10) {
            let carry = true;
            for (let i = lastPartIndex; i >= 0; i--) {
                const currentPart = versionParts[i];
                const incrementedCurrentPart = parseInt(currentPart, 10) + 1;

                if (isNaN(incrementedCurrentPart)) {
                    break;
                }

                if (incrementedCurrentPart === 10) {
                    versionParts[i] = '0';
                } else {
                    versionParts[i] = incrementedCurrentPart.toString();
                    carry = false;
                    break;
                }
            }

            if (carry) {
                versionParts.unshift('1');
            }
        } else {
            versionParts[lastPartIndex] = incrementedPart.toString();
        }
    } else {
        versionParts.push('1');
    }

    return versionParts.join('.');
}





