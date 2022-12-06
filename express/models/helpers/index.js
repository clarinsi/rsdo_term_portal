const xss = require('xss')
const cache = require('../cache')
const Portal = require('../portal')

const INSTANCE_SETTING_NAMESPACE = 'instance-setting'
const INSTANCE_SETTING_CACHE_EXPIRE_TIME = 60 * 60 // 1 hour.
const SLOVENIAN_LANGUAGE_ID_CACHE_EXPIRE_TIME = 60 * 60 // 1 hour.

exports.intoDbArray = (inputData, mode) => {
  if (Array.isArray(inputData)) {
    return inputData
  } else if (inputData === undefined || inputData === '') {
    if (mode === 'always') return []
    if (mode === 'undefined') return undefined
    else return null
    // return mode === 'always' ? [] : null
  }
  return [inputData]
}

exports.removeHtmlTags = text => {
  return tagFilter.process(text)
}

// Returns setting value by its name from table instance_settings.
exports.getInstanceSetting = async settingName => {
  const settingCacheName = `${INSTANCE_SETTING_NAMESPACE}:${settingName}`
  let settingValue = await cache.get(settingCacheName)

  if (!settingValue) {
    settingValue = await Portal.getInstanceSettingValue(settingName)
    await cache.set(
      settingCacheName,
      settingValue,
      'EX',
      INSTANCE_SETTING_CACHE_EXPIRE_TIME
    )
  }

  return settingValue
}

// Deletes cached instance settings.
exports.clearCachedInstanceSettings = async () => {
  const settingNames = await Portal.fetchAllInstanceSettingNames()
  const settingCacheNames = settingNames.map(
    settingName => `${INSTANCE_SETTING_NAMESPACE}:${settingName}`
  )
  await cache.unlink(...settingCacheNames)
}

// Returns slovenian language id and keeps it cached.
exports.getSlovenianLanguageId = async () => {
  const settingCacheName = 'slovenian-language-id'
  let id = await cache.get(settingCacheName)

  if (!id) {
    id = (await Portal.getSlovenianLanguageId()).toString()
    await cache.set(
      settingCacheName,
      id,
      'EX',
      SLOVENIAN_LANGUAGE_ID_CACHE_EXPIRE_TIME
    )
  }

  return id
}

const tagFilter = new xss.FilterXSS({
  whiteList: {},
  stripIgnoreTag: true
})
