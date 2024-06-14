/**
 * @author: HZWei
 * @date: 2024/6/14
 * @desc:
 */

function isEmpty(value) {
    return !value || value?.length === 0
}

function isEmptyMulti(...values) {
    return values.filter((v) => isEmpty(v)).length > 0
}

module.exports = { isEmpty , isEmptyMulti }