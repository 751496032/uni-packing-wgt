const fs = require("fs")
const path  = require("path")

class CopyDirectory{

    copy(src, dest) {
        try {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, {recursive: true})
            }
            const files = fs.readdirSync(src, {encoding: "utf-8", withFileTypes: true})

            files.forEach((item) => {
                const sourcePath = path.join(src, item.name)
                const targetPath = path.join(dest, item.name)
                // console.log(sourcePath, targetPath)
                if (item.isDirectory()) {
                    this.copy(sourcePath, targetPath)
                } else {
                    fs.copyFileSync(sourcePath, targetPath)
                }
            })
        }catch (e) {
            console.error(e)
        }

    }
}

module.exports = new CopyDirectory()