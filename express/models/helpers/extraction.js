const { readdir, stat } = require('fs/promises')
const { partial } = require('filesize')
const { DATA_FILES_PATH } = require('../../config/settings')

const formatFileSize = partial({ separator: ',' })

exports.deserialize = {
  extraction(extraction) {
    const deserializedExtraction = {
      id: extraction.id,
      name: extraction.name,
      status: extraction.status,
      corpusId: extraction.corpus_id,
      timeStarted: extraction.time_started,
      timeFinished: extraction.time_finished,
      ossParams: extraction.oss_params
    }

    return deserializedExtraction
  }
}

exports.getExtractionFilesPath = getExtractionFilesPath

exports.getDocumentsPath = extractionId => {
  return `${getExtractionFilesPath(extractionId)}/documents`
}

exports.getStopTermsPath = extractionId => {
  return `${getExtractionFilesPath(extractionId)}/stop_terms`
}

exports.getConllusPath = extractionId => {
  return `${getExtractionFilesPath(extractionId)}/conllu`
}

exports.getTermCandidatesPath = extractionId => {
  return `${getExtractionFilesPath(extractionId)}/term_candidates.json`
}

exports.getFileNamesInFolder = async folderPath => {
  const filenames = await readdir(folderPath)
  return filenames
}

exports.getFileStatsInFolder = async folderPath => {
  const filenames = await readdir(folderPath)
  const fileStats = await Promise.all(
    filenames.map(async filename => {
      const filePath = `${folderPath}/${filename}`
      const { mtimeMs: timeModified, size } = await stat(filePath)
      const sizeHumanReadable = formatFileSize(size)
      const fileStats = { filename, size: sizeHumanReadable, timeModified }
      return fileStats
    })
  )
  return fileStats
}

function getExtractionFilesPath(extractionId) {
  return `${DATA_FILES_PATH}/extraction/${extractionId}`
}
