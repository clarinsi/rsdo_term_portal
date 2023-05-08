const { readdir, stat } = require('fs/promises')
const path = require('path')
const { partial } = require('filesize')
const { DATA_FILES_PATH } = require('../../config/settings')

const formatFileSize = partial({ separator: ',' })

exports.deserialize = {
  extraction(extraction) {
    const deserializedExtraction = {
      id: extraction.id,
      userId: extraction.user_id,
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

exports.getFileStats = getFileStats

exports.getFileStatsInFolder = async folderPath => {
  const filenames = await readdir(folderPath)
  const filePaths = filenames.map(filename => `${folderPath}/${filename}`)
  const fileStats = await Promise.all(filePaths.map(getFileStats))
  fileStats.sort((a, b) => a.timeModified - b.timeModified)
  return fileStats
}

async function getFileStats(filePath) {
  const filename = path.basename(filePath)
  const { mtimeMs: timeModified, size } = await stat(filePath)
  const sizeHumanReadable = formatFileSize(size)
  const fileStats = { filename, size: sizeHumanReadable, timeModified }
  return fileStats
}

function getExtractionFilesPath(extractionId) {
  return `${DATA_FILES_PATH}/extraction/${extractionId}`
}
