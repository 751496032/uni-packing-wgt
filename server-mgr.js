/**
 * @author: HZWei
 * @date: 2024/5/22
 * @desc:
 */

const {initConfig, configFilePath, configOutputFilePath, configReleaseFilePath,manifestPath} = require("./file-mgr")
if (initConfig()) return;

const configRelease = require(configReleaseFilePath)
const config = require(configFilePath)

const manifest = require(manifestPath)

const enableServerLog = config.enableServerLog

const uniAppId = manifest.appid
const name = manifest.name
const description = manifest.description

const api = {
    baseUrl: configRelease.qiniu.baseUrl,
    login: configRelease.qiniu.api.login,
    cdn_cache_refresh: configRelease.qiniu.api.cdn_cache_refresh,
    refresh_history: configRelease.qiniu.api.refresh_history,
    token: configRelease.qiniu.token,
    username: configRelease.qiniu.account.username,
    password: configRelease.qiniu.account.password,
    configs: {
        key: configRelease.configs.key,
        token: configRelease.configs.token,
        devBaseUrl: "https://cim-test-api.yidejia.com/",
        betaBaseUrl: "https://cim-uat-api.yidejia.com/",
        releaseBaseUrl: "https://cim-api.yidejia.com/",
        devSign:"cpa4mqkuuf81l1qfgvqg",
        betaSign:"cpapae1jvotmrd3gcq30",
        releaseSign:"cpapaln18np8tarnts7g",
        commonConfig: "common/config",
        login: "user/login/code",
        baseUrlArray: [],
        username: configRelease.configs.account.username,
        password: configRelease.configs.account.password,
        android: configRelease.configs.updateAndroid,
        ios: configRelease.configs.updateIOS,
        updateDesc: configRelease.configs.updateDesc,
        dev: false,
        beta: false,
        release: false
    }
}
api.configs?.baseUrlArray.push(api.configs.devBaseUrl)
api.configs?.baseUrlArray.push(api.configs.betaBaseUrl)
api.configs?.baseUrlArray.push(api.configs.releaseBaseUrl)

const fs = require("fs");
const axios = require('axios');
axios.defaults.baseURL = api.baseUrl
axios.interceptors.request.use((config) => {
    // console.log("enableServerLog: ",enableServerLog)
    if (enableServerLog){
        console.log("")
        console.log("============ request ==============")
        console.log(`${config.baseURL}${config.url}`,config.method)
        console.log('data: ',config.data)
        console.log("")
    }
    if (config.baseURL ===  api.baseUrl) {
        if (config.url !== api.login) {
            config.headers["Authorization"] = `bearer ${api.token}`
        }
    }
    if (api.configs.baseUrlArray.includes(config.baseURL)) {
        if (api.configs.token) config.headers["token"] = `${api.configs.token}`
        config.headers["platform"] = "android"
        config.headers["apikey"] = "android"
    }

    return config
})


axios.interceptors.response.use( async (response) => {
    const baseURL = response.config.baseURL
    if (enableServerLog){
        console.log("============ response ==============")
        console.log(`${baseURL}${response.config.url}`,response.config.method, response.status)
        console.log('data: ', response.data)
    }
    switch (response.status) {
        case 200 :
            const code = response.data.code
            if (baseURL === api.baseUrl){
                if (code === 200 && response.config.url === api.login) {
                    api.token = response.data.data
                    let data = fs.readFileSync(configReleaseFilePath, "utf-8")
                    const json = JSON.parse(data)
                    json.qiniu.token = api.token;
                    data = JSON.stringify(json, null, 2);
                    fs.writeFileSync(configReleaseFilePath, data, "utf-8");
                    return response.data?.data ?? {}
                }
                if (code === 401){
                    const max = 3
                    for (let i = 0; i < max; i++) {
                        api.configs.token = await loginPlatform()
                        if (api.configs.token) break
                    }
                }
            }

            if (api.configs.baseUrlArray.includes(baseURL)){
                if (code === 0){
                    if (response.config.url === api.configs.login){
                        api.configs.token = response.data.data.token
                        let data = fs.readFileSync(configReleaseFilePath, "utf-8")
                        const json = JSON.parse(data)
                        json.configs.token = api.configs.token;
                        data = JSON.stringify(json, null, 2);
                        fs.writeFileSync(configReleaseFilePath, data, "utf-8");
                    }
                    return response.data?.data ?? {}
                }
            }

    }
    return response.data?.data ?? null
}, async (err) => {
    const config = err.response.config
    const data = err.response.data
    if (enableServerLog){
        console.error("=========== response err ===========")
        console.error(`${config.baseURL}${config.url}`, config.method)
        console.error(data)
    }

    const max = 3
    if (api.configs.baseUrlArray.includes(config.baseURL)) {
        if (data.code === 1) {
            for (let i = 0; i < max; i++) {
                api.configs.token = await loginMall()
                if (api.configs.token) break
            }
        }
    }
    // return data ?? {code: -1, data: null, message: err.response.statusText}
    return null
})


async function loginMall() {
    // const baseUrl = api.configs.devBaseUrl
    // axios.defaults.baseURL = baseUrl

    let baseUrl = api.configs.devBaseUrl
    let sign = api.configs.devSign
    if (api.configs.dev) {
        baseUrl = api.configs.devBaseUrl
        sign = api.configs.devSign
    }
    if (api.configs.beta) {
        baseUrl = api.configs.betaBaseUrl
        sign = api.configs.betaSign
    }
    if (api.configs.release) {
        baseUrl = api.configs.releaseBaseUrl
        sign = api.configs.releaseSign
    }

    let params = {
        phone: api.configs.username,
        code: api.configs.password,
        area_code: "+86",
        sign: sign,
        app_version: "1.0.0"
    }
    const data = await axios.post(api.configs.login, params, {baseURL: baseUrl})
    return data.token
}



async function updateConfig(params = {
    versionCode: 1,
    versionName: '1.0.0',
    url: '',
    dev: false, beta: false, release: false
}) {

    // const baseUrl = api.configs.devBaseUrl
    // axios.defaults.baseURL = baseUrl
    api.configs.dev = params.dev
    api.configs.beta =  params.beta
    api.configs.release =  params.release
    let baseUrl = api.configs.devBaseUrl
    if (params.dev) baseUrl = api.configs.devBaseUrl
    if (params.beta) baseUrl = api.configs.betaBaseUrl
    if (params.release) baseUrl = api.configs.releaseBaseUrl


    function envInfo(){
        console.log(`key: ${api.configs.key}`)
        if (params.dev) console.error(`dev: ${params.dev}`)
        if (params.beta) console.error(`beta: ${params.beta}`)
        if (params.release) console.error(`release: ${params.release}`)
        console.error(`baseUrl: ${baseUrl}`)
        console.error(``)
    }


    // 获取config配置
    const key = api.configs.key
    const res = await axios.get(`${api.configs.commonConfig}?key=${key}`, {baseURL: baseUrl})
    if (!res || !res.data){
        console.log(`========== 检查后台是否有配置: ${key}  ==========`)
        envInfo()
        return
    }
    let data = JSON.parse(res.data)
    if (!data){
        console.log("========== 配置数据不存在 ==========")
        return
    }
    // 查找对应的内容  插入新配置或替换
    let version = params.versionName
    let code = params.versionCode
    let url = params.url
    if (!data || !data.uniModuleArray){
        data = {
            uniModuleArray:[]
        }
    }
    let item = data?.uniModuleArray?.find((value) => value.appid === uniAppId)
    if (item){
        // 修改
        item.desc = description
        if (api.configs.android){
            item.android = {
                version: version,
                code: code,
                updateDesc: api.configs.updateDesc,
                url: url
            }
        }
        if (api.configs.ios){
            item.ios = {
                version: version,
                code: code,
                updateDesc: api.configs.updateDesc,
                url: url
            }
        }
    }else {
        // 新增
        const newItem = {
            moduleName: name,
            appid: uniAppId,
            desc: description
        }
        newItem.android = {
            version: version,
            code: code,
            updateDesc: api.configs.updateDesc,
            url: url
        }
        newItem.ios = newItem.android
        data?.uniModuleArray?.push(newItem)
    }

    // 更新
    const updateParam = {
        option_key: key, data: JSON.stringify(data,null,2)
    }
    const max = 3
    for (let i = 0; i < max; i++) {
        let updateRes = await axios.post(api.configs.commonConfig, updateParam, {baseURL: baseUrl})
        if (updateRes){
            console.log(`==========  后台配置同步完成 结果如下  ==========`)
            envInfo()
            console.log(JSON.stringify(data,null,2))
            break
        }
    }


}

async function loginPlatform() {
    const loginParam = {
        username: api.username, password: api.password
    }
    return await axios.post(api.login, loginParam,{ baseURL: api.baseUrl})
}

async function refreshCdnCache(url) {
    // axios.defaults.baseURL = configRelease.qiniu.baseUrl
    const refreshParam = {
        urls: url, dirs: ""
    }
    const max = 3
    for (let i = 0; i < max; i++) {
        let res = await axios.post(api.cdn_cache_refresh, refreshParam, {baseURL: api.baseUrl})
        if (res) {
            console.log(`========== 链接刷新完成 ==========`)
            console.log(`${url}`)
            console.log('')
            break
        }
    }
    let res = await axios.get(`${api.refresh_history}?operator_type=qiniu_refresh`,{baseURL: api.baseUrl})
    if (config.enableRefreshHistory){
        console.log(`========== 刷新历史记录 ==========`)
        console.log(res)
        console.log('')
    }


}

async function syncServer(params = {
    url: '', dev: false, beta: false, release: false
}) {
    if (!config.refreshUrl) return
    if (!api.username || !api.password || !api.configs.username || !api.configs.password || !api.baseUrl || !api.configs.key) {
       console.log("========== 检查配置是否正常 ==========")
        return
    }
    const manifest = require(manifestPath)
    params.versionName = manifest.versionName
    params.versionCode = manifest.versionCode
    // 刷新cdn
    await refreshCdnCache(params.url)
    // 更新配置
    await updateConfig(params)
}

module.exports = {syncServer}

