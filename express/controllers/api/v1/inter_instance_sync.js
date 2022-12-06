const InterInstanceSync = require('../../../models/inter_instance_sync')

exports.listDictionaries = async (req, res) => {
  const dictionaries = await InterInstanceSync.listDictionaries()
  res.send(dictionaries)
}

exports.syncDictionary = async (req, res) => {
  const did = req.params.dictionaryId
  const since = req.query.lastSynced
    ? req.query.lastSynced
    : '2000-01-01 00:00:00'
  const entriesToSync = await InterInstanceSync.getUpdatedEntriesSince(
    did,
    since
  )
  res.send(entriesToSync)
}
