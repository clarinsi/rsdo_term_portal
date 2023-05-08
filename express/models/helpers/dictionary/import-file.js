const fs = require('fs')
const xmlFlow = require('xml-flow')
const debug = require('debug')('termPortal:models/helpers/dictionary')
const db = require('../../db')
const { intoDbArray } = require('..')
const { sanitizeField } = require('./index')

const JOBS_MAX = 50
const JOBS_MIN = 15

// Import given file into given dictionary.
exports.readFileIntoDb = (
  userId,
  dictionaryId,
  importFilePath,
  entryStatus,
  dbClient
) => {
  return new Promise((resolve, reject) => {
    const progress = {
      jobCount: 0,
      totalCount: 0,
      validCount: 0,
      isWholeFileRead: false,
      importError: null
    }
    entryStatus = entryStatus === 'complete' ? 'complete' : 'in_edit'
    const importFileReader = fs.createReadStream(importFilePath)
    const xmlStream = xmlFlow(importFileReader, {
      strict: true,
      trim: false,
      preserveMarkup: xmlFlow.ALWAYS,
      simplifyNodes: false,
      useArrays: xmlFlow.ALWAYS
    })
    const handleError = handleImportError(xmlStream, progress, reject)
    const handleEntry = handleEntryXml(
      userId,
      dictionaryId,
      entryStatus,
      progress,
      dbClient,
      resolve,
      handleError
    )

    xmlStream
      .on('error', () => {})
      .once('error', handleError)
      .on('end', () => (progress.isWholeFileRead = true))
      .on('tag:entry', handleEntry)
  })
}

function handleImportError(xmlStream, progress, reject) {
  return function handleError(error) {
    if (progress.importError) return

    progress.importError = error
    xmlStream.removeAllListeners('tag:entry')
    reject(error)
  }
}

function handleEntryXml(
  userId,
  dictionaryId,
  entryStatus,
  progress,
  dbClient,
  resolve,
  handleError
) {
  return async function handleEntry(entry) {
    if (progress.importError) return

    try {
      if (++progress.jobCount > JOBS_MAX) this.pause()

      const term = toMixedBasic(
        entry.$markup.find(el => el.$name === 'term')?.$markup
      )
      const hwGrp = entry.$markup.find(el => el.$name === 'hwGrp')
      const wordforms = hwGrp?.$attrs.wfs
      const accent = hwGrp?.$attrs.acc
      const pronunciation = hwGrp?.$attrs.pron
      const domainLabels = entry.$markup
        .find(el => el.$name === 'domainLabels')
        ?.$markup.filter(childEl => childEl.$name === 'domainLabel')
        .map(domainLabel => toText(domainLabel.$markup))
      const label = toMixedExtended(
        entry.$markup.find(el => el.$name === 'label')?.$markup
      )
      const definition = toMixedExtended(
        entry.$markup.find(el => el.$name === 'def')?.$markup
      )
      const synonyms = entry.$markup
        .find(el => el.$name === 'syns')
        ?.$markup.filter(childEl => childEl.$name === 'syn')
        .map(synonym => toMixedBasic(synonym.$markup))
      const links = entry.$markup
        .find(el => el.$name === 'links')
        ?.$markup.filter(childEl => childEl.$name === 'link')
        .map(link => ({
          link: toMixedBasic(link.$markup),
          type: link.$attrs.type
        }))
      const other = toMixedOther(
        entry.$markup.find(el => el.$name === 'other')?.$markup
      )
      let hasForeignTerms = false
      const foreignLanguageContent = entry.$markup
        .find(el => el.$name === 'fLangs')
        ?.$markup.filter(childEl => childEl.$name === 'fLang')
        .map(fLang => ({
          language: fLang.$attrs.lang,
          terms: fLang.$markup
            .find(el => el.$name === 'fTerms')
            ?.$markup.filter(childEl => childEl.$name === 'fTerm')
            .map(term => {
              const content = toMixedBasic(term.$markup)
              if (content.length) hasForeignTerms = true
              return content
            }),
          definition:
            toMixedExtended(
              fLang.$markup.find(el => el.$name === 'fDef')?.$markup
            ) || null,
          synonyms: fLang.$markup
            .find(el => el.$name === 'fSyns')
            ?.$markup.filter(childEl => childEl.$name === 'fSyn')
            .map(synonym => toMixedBasic(synonym.$markup))
        }))
      const multimedia = entry.$markup.find(el => el.$name === 'mm')?.$markup
      const images = []
      const audio = []
      const videos = []
      multimedia?.forEach(mm => {
        switch (mm.$name) {
          case 'image':
            images.push(toText(mm.$markup))
            break
          case 'audio':
            audio.push(toText(mm.$markup))
            break
          case 'video':
            videos.push(toText(mm.$markup))
        }
      })

      const isValid = !!term && (!!definition || hasForeignTerms)

      if (!entry.$markup.length) return

      const values = [
        dictionaryId,
        isValid,
        entryStatus,
        term || null,
        userId,
        null,
        wordforms,
        accent,
        pronunciation,
        intoDbArray(domainLabels, 'always'),
        label || null,
        definition || null,
        intoDbArray(synonyms),
        intoDbArray(links, 'always'),
        other || null,
        intoDbArray(foreignLanguageContent, 'always'),
        images.length ? images : null,
        audio.length ? audio : null,
        videos.length ? videos : null
      ]
      const text = `SELECT entry_new (${db.genParamStr(values)})`

      await dbClient.query(text, values)

      progress.totalCount++
      if (isValid) progress.validCount++
    } catch (error) {
      handleError(error)
    } finally {
      progress.jobCount--

      if (progress.jobCount < JOBS_MIN) this.resume()

      if (
        !progress.jobCount &&
        progress.isWholeFileRead &&
        !progress.importError
      ) {
        debug(`TOTAL ENTRIES: ${progress.totalCount}`)
        debug(`VALID ENTRIES: ${progress.validCount}`)
        resolve()
      }
    }
  }
}

function toText(markupObj) {
  return sanitizeField.toText(xmlFlow.toXml(markupObj))
}

function toMixedBasic(markupObj) {
  return sanitizeField.toMixedBasic(xmlFlow.toXml(markupObj))
}

function toMixedExtended(markupObj) {
  return sanitizeField.toMixedExtended(xmlFlow.toXml(markupObj))
}

function toMixedOther(markupObj) {
  return sanitizeField.toMixedOther(xmlFlow.toXml(markupObj))
}
