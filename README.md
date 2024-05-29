##  介绍

由于官方的HBuilderX编译器打包wgt每次都要手动的操作有些繁琐，也不支持多环境打包，在开发阶段与原生项目交互调试是极其不方便。
而`uni-packing-wgt`正好可以解决这些问题。

`uni-packing-wgt`是uniapp跨平台多环境资源打包、调试、发布的脚本工具。


主要特性：

- 支持同时构建多个环境资源(dev、beta、release)包，也包括了wgt包。
- 支持上传发布到七牛云平台，其他云平台暂不支持，支持七牛刷新文件CDN缓存（暂对本公司服务有用）。
- 在构建资源包时也可以同步内置到原生项目上，方便在开发阶段与原生间的交互调试。
- 支持版本号自增，如果在原生项目上内置资源包调试，此时可用上，因为内置资源包调试版本号必须增加才会生效。

> 工具仅限于vite cli创建的项目使用，不支持HBuilderX创建的项目。

## 安装使用

安装：

```bash
npm i uni-packing-wgt
```

1、在`package.json`中配置uniapp的打包命令，如下：

```json
"build:app-plus-dev": "uni build -p app-plus --mode development --outDir=./dist/dev/app",
"build:app-plus-beta": "uni build -p app-plus --mode beta --outDir=./dist/beta/app",
"build:app-plus-release": "uni build -p app-plus --mode production --outDir=./dist/release/app"
```

其中`development`、`beta`、`production`是vite多环境配置的文件名，vite必须遵守这种命名规范，不然脚本会执行失败。

2、执行`build-wgt`命令生成wgt包

> 如果是在vscode和命令终端上运行命令，记得加上`npx`,即`npx build-wgt`, WebStorm则不用。

在初次执行命令时，会在项目根目录创建三个配置文件，可根据需求自由配置：

- config.json：常规配置，比如运行环境、版本管理、文件拷贝、上传等管理
- config-output.json：配置文件拷贝的输入、输出目录，用于uni模块在dev环境与原生资源同步调试
- config-release.json：发布环境的配置，比如cdn缓存、后台配置同步的管理

> config-output.json和config-release.json文件记得在`.gitignore`配置忽略不用提交，每个开发者的参数是不一样的。

**config.json**

```json
{
  "runDev": true, // 指定打包的环境
  "runBeta": false,
  "runRelease": false,
  "isIncrementVersion": true, // 版本是否自增
  "uploadWgtPackage": false, // wgt包是否上传到云平台上，需要结合upload参数使用
  "pkgCopyToNativeDir": false, // 是否将资源包同步到原生项目上，需要在config-output.json配置路径
  "upload": {
    "devAccessKey": "",
    "devSecretKey": "",
    "devBucket": "",
    "devDomainName": "",
    "devDir": "app"
  }

}
```

以dev环境为例，控制台输出结果：

``` bash
hzwei@HZWeis-Mac-mini uni-mall-staff % build-wgt

======开始生成资源包=====
======资源包生成完成=====
======资源包开始压缩=====
{ status: 'fulfilled', value: './dist/dev/__UNI__xxxx60.wgt' }
======资源包压缩任务完成=====
======资源包开始复制=====
{
  hash: 'Fop4lZ8NADlAsThMVWIiTjoTh_JT',
  key: 'app/dev/__UNI__xxxx60.wgt'
}
前往刷新url:  https://xxxx.com/app/dev/__UNI__xxxx60.wgt
======资源包上传完成=====

```











