const FormData = require('form-data')
const { createReadStream } = require('fs')
const { writeFile, readFile } = require('fs/promises')
const axios = require('axios')
const db = require('./db')
const {
  deserialize,
  getDocumentsPath,
  getStopTermsPath,
  getConllusPath,
  getTermCandidatesPath,
  getFileNamesInFolder,
  getFileStatsInFolder
} = require('./helpers/extraction')
const { extractionApiOrigin } = require('../config/keys')

const Extraction = {}

// Fetch all extractions for a specific user.
Extraction.fetchAllForUser = async userId => {
  const { rows: fetchedExtractions } = await db.query(
    'SELECT id, name, status, corpus_id, oss_params, time_started, time_finished FROM extraction WHERE user_id = $1 ORDER BY status ASC, id DESC, time_finished DESC',
    [userId]
  )

  return fetchedExtractions.map(fetchedExtraction =>
    deserialize.extraction(fetchedExtraction)
  )
}

// Count all extractions for a specific user.
Extraction.countAllForUser = async userId => {
  const {
    rows: [{ count: extractionCount }]
  } = await db.query('SELECT COUNT(*) FROM extraction WHERE user_id = $1', [
    userId
  ])

  return +extractionCount
}

// Create a new (own) extraction entry in DB.
Extraction.createOwn = async (userId, extractionName) => {
  const {
    rows: [{ id }]
  } = await db.query(
    'INSERT INTO extraction (user_id, name) VALUES ($1, $2) RETURNING id',
    [userId, extractionName]
  )

  return id
}

// Create a new (oss) extraction entry in DB.
Extraction.createOss = async (userId, extractionName) => {
  const {
    rows: [{ id }]
  } = await db.query(
    'INSERT INTO extraction (user_id, name, oss_params) VALUES ($1, $2, $3) RETURNING id',
    [userId, extractionName, { params: {}, status: 'new' }]
  )

  return id
}

// Fetch a specific extraction entry from DB.
Extraction.fetch = async id => {
  const {
    rows: [fetchedExtraction]
  } = await db.query(
    'SELECT id, user_id, name, status, corpus_id, oss_params, time_started, time_finished FROM extraction WHERE id = $1',
    [id]
  )

  return deserialize.extraction(fetchedExtraction)
}

// Fetch oss document types from DB.
Extraction.fetchOssDocumentTypes = async determinedLanguage => {
  const { rows: fetchedDocumentTypes } = await db.query(
    `SELECT id, name_${determinedLanguage} name FROM extraction_oss_document_types`
  )

  return fetchedDocumentTypes
}

// Fetch data of the author of a specific extraction entry from DB.
Extraction.fetchAuthorData = async id => {
  const {
    rows: [authorData]
  } = await db.query(
    `SELECT u.email, u.language
    FROM extraction e
    LEFT JOIN "user" u ON u.id = e.user_id
    WHERE e.id = $1`,
    [id]
  )

  return authorData
}

// Update extraction entry in DB.
Extraction.update = async (id, name) => {
  await db.query('UPDATE extraction SET name = $2 WHERE id = $1', [id, name])
}

// Delete a specific extraction entry from DB.
Extraction.delete = async id => {
  const {
    rows: [{ corpus_id: corpusId }]
  } = await db.query(
    'DELETE FROM extraction WHERE id = $1 RETURNING corpus_id',
    [id]
  )

  return corpusId
}

// Fetch all documents' names for a specific extraction.
Extraction.fetchAllDocumentsNames = async extractionId => {
  const documentsPath = getDocumentsPath(extractionId)
  const documentsNames = await getFileNamesInFolder(documentsPath)

  return documentsNames
}

// Fetch all documents' metadata for a specific extraction.
Extraction.fetchAllDocumentsStats = async extractionId => {
  const documentsPath = getDocumentsPath(extractionId)
  const documentsStats = await getFileStatsInFolder(documentsPath)

  return documentsStats
}

// Fetch all stop terms files' names for a specific extraction.
Extraction.fetchAllStopTermsFilesNames = async extractionId => {
  const stopTermsFilesPath = getStopTermsPath(extractionId)
  const stopTermsFilesNames = await getFileNamesInFolder(stopTermsFilesPath)

  return stopTermsFilesNames
}

// Fetch all stop terms files' metadata for a specific extraction.
Extraction.fetchAllStopTermsFilesStats = async extractionId => {
  const stopTermsFilesPath = getStopTermsPath(extractionId)
  const stopTermsFilesStats = await getFileStatsInFolder(stopTermsFilesPath)

  return stopTermsFilesStats
}

// Update OSS parameters for a specific extraction in DB.
Extraction.updateOssParams = async (extractionId, newOssParams) => {
  await db.query('UPDATE extraction SET oss_params = $1 WHERE id = $2', [
    newOssParams,
    extractionId
  ])
}

// Fetch term candidates JSON for a specific extraction.
Extraction.fetchTermCandidatesJson = async extractionId => {
  const termCandidatesPath = getTermCandidatesPath(extractionId)
  const fileContent = await readFile(termCandidatesPath, 'utf8')
  return fileContent
}

// Fetch the number of term candidates for a specific extraction.
Extraction.fetchTermCandidatesCount = async function (extractionId) {
  const termCandidatesJson = await this.fetchTermCandidatesJson(extractionId)
  const termCandidates = JSON.parse(termCandidatesJson).terminoloski_kandidati
  return termCandidates.length
}

// Fetch term candidates slice for a specific extraction.
Extraction.fetchTermCandidatesSlice = async function (
  extractionId,
  fromIndex,
  toIndex
) {
  const termCandidatesJson = await this.fetchTermCandidatesJson(extractionId)
  const termCandidates = JSON.parse(termCandidatesJson).terminoloski_kandidati
  const termCandidatesSlice = termCandidates.slice(fromIndex, toIndex)
  return termCandidatesSlice
}

// Mark extraction from own documents as began.
Extraction.beginOwn = async (extractionId, documentsNames) => {
  let timeStarted
  await db.transaction(async dbClient => {
    ;[
      {
        rows: [{ time_started: timeStarted }]
      }
    ] = await Promise.all([
      dbClient.query(
        "UPDATE extraction SET status = 'in progress', time_started = NOW() WHERE id = $1 RETURNING time_started",
        [extractionId]
      ),
      dbClient.query(
        'INSERT INTO extraction_job (extraction_id, job_type, filename) VALUES ($1, $2, UNNEST($3::VARCHAR[]))',
        [extractionId, 'doc to conllu', documentsNames]
      ),
      dbClient.query(
        'INSERT INTO extraction_job (extraction_id, job_type, filename) VALUES ($1, $2, $3)',
        [extractionId, 'conllus to term candidates', '']
      ),
      dbClient.query(
        'INSERT INTO extraction_job (extraction_id, job_type, filename) VALUES ($1, $2, $3)',
        [extractionId, 'concordancer', '']
      )
    ])
  })

  return timeStarted
}

// Mark extraction from OSS as began.
Extraction.beginOss = async extractionId => {
  let timeStarted
  await db.transaction(async dbClient => {
    ;[
      {
        rows: [{ time_started: timeStarted }]
      }
    ] = await Promise.all([
      dbClient.query(
        "UPDATE extraction SET status = 'in progress', time_started = NOW() WHERE id = $1 RETURNING time_started",
        [extractionId]
      ),
      dbClient.query(
        'INSERT INTO extraction_job (extraction_id, job_type, filename) VALUES ($1, $2, $3)',
        [extractionId, 'oss term candidates', '']
      )
    ])
  })

  return timeStarted
}

// Fetch all finished extractions for a specific user.
Extraction.fetchFinishedForUser = async userId => {
  const { rows: fetchedExtractions } = await db.query(
    'SELECT id, name FROM extraction WHERE user_id = $1 AND status = $2 ORDER BY id',
    [userId, 'finished']
  )

  return fetchedExtractions.map(fetchedExtraction =>
    deserialize.extraction(fetchedExtraction)
  )
}

// Supervise a specific extraction from own documents and bring it out of 'in progress' status.
// This is a temporary solution as explained in its execution context.
// It's also completely unmodular and a complete mess. Refactor at appropriate time.
Extraction.processOwn = async function (extractionId, extractionName) {
  // Get documents folder path and all documets' names witin.
  const documentsPath = getDocumentsPath(extractionId)
  const documentNames = await this.fetchAllDocumentsNames(extractionId)
  const conllusPath = getConllusPath(extractionId)
  const conllusPaths = []
  const MAX_BODY_LENGTH = 10 ** 9 // 1 GB
  const RETRY_SECONDS_INTERVAL = 60 // 1 minute
  const RETRY_SECONDS_MAX = 60 * 60 * 24 // 1 day
  // Using remote API, transform each document into conllu format.
  for (const documentName of documentNames) {
    const filePath = `${documentsPath}/${documentName}`
    try {
      const { data: data1 } = await retry(
        async () => {
          const form = new FormData()
          form.append('file', createReadStream(filePath), documentName)
          return await axios.post(
            `${extractionApiOrigin}/datotekaVConlluAsync`,
            form,
            {
              headers: {
                ...form.getHeaders()
              },
              maxBodyLength: MAX_BODY_LENGTH
            }
          )
        },
        RETRY_SECONDS_INTERVAL,
        RETRY_SECONDS_MAX
      )
      const remotejobId = +data1.check_job_url.split('/').at(-1)
      await db.query(
        "UPDATE extraction_job SET status = 'in progress', remote_job_id = $1, time_started = NOW() WHERE extraction_id = $2 AND job_type = $3 AND filename = $4",
        [remotejobId, extractionId, 'doc to conllu', documentName]
      )

      // Kristjan said: I don't have to wait for one job to finish to begin the next. I could launch all at once, which is the whole purpose of async processing.
      // Consider reworking it in such manner.
      // Poll job until finished.
      while (true) {
        await sleep(5)
        const { data: data2 } = await retry(
          async () => {
            return await axios.get(`${extractionApiOrigin}/job/${remotejobId}`)
          },
          RETRY_SECONDS_INTERVAL,
          RETRY_SECONDS_MAX
        )

        if (data2.finished_on) {
          if (data2.job_status !== 'finished processing (OK)') {
            throw Error(
              `Remote job with id ${remotejobId} failed with result:\n${data2.job_result}`
            )
          }

          // TODO Read the response as a stream and try to parse it's contents into a file (write stream)('stream-json' package?).
          const fileSavePath = `${conllusPath}/${documentName}.conllu`
          await writeFile(fileSavePath, data2.job_result)
          await db.query(
            "UPDATE extraction_job SET status = 'finished', time_finished = NOW() WHERE extraction_id = $1 AND job_type = $2 AND filename = $3",
            [extractionId, 'doc to conllu', documentName]
          )
          conllusPaths.push(fileSavePath)
          break
        }
      }
    } catch (error) {
      logExtractionError(error, extractionId, 'doc to conllu', documentName)
      await failTheJob(extractionId, 'doc to conllu', documentName)
    }
  }

  // Conllu transformation for all documents finished. Start extracting term candidates.
  // TODO This is a naive implementation which builds the whole payload in memory. Make it streamy.
  const conllusArr = []
  for (const conlluPath of conllusPaths) {
    const fileContent = await readFile(conlluPath, 'utf8')
    conllusArr.push(fileContent)
  }

  const stopTermsPath = getStopTermsPath(extractionId)
  const stopTermsFilesNames = await this.fetchAllStopTermsFilesNames(
    extractionId
  )
  const stopTermsSet = new Set()
  const stopTermsSeperator = /\r?\n/
  for (const stopTermsFileName of stopTermsFilesNames) {
    const fileContent = await readFile(
      `${stopTermsPath}/${stopTermsFileName}`,
      'utf8'
    )
    const stopTerms = fileContent.split(stopTermsSeperator)
    stopTerms.forEach(stopTerm => stopTermsSet.add(stopTerm.trim()))
  }
  stopTermsSet.delete('')
  const stopTermsArr = Array.from(stopTermsSet)
  const termCandidatesPath = getTermCandidatesPath(extractionId)

  try {
    const { data: data3 } = await retry(
      async () => {
        return await axios.post(
          `${extractionApiOrigin}/izlusciAsync`,
          {
            conllus: conllusArr,
            prepovedaneBesede: stopTermsArr,
            // TODO Enabled for all cases. Add a switch for users later.
            definicije: true
          },
          { maxBodyLength: MAX_BODY_LENGTH }
        )
      },
      RETRY_SECONDS_INTERVAL,
      RETRY_SECONDS_MAX
    )
    const remotejobId = +data3.check_job_url.split('/').at(-1)
    await db.query(
      "UPDATE extraction_job SET status = 'in progress', remote_job_id = $1, time_started = NOW() WHERE extraction_id = $2 AND job_type = $3 AND filename = $4",
      [remotejobId, extractionId, 'conllus to term candidates', '']
    )

    // Poll job until finished.
    while (true) {
      await sleep(5)
      const { data: data4 } = await retry(
        async () => {
          return await axios.get(`${extractionApiOrigin}/job/${remotejobId}`)
        },
        RETRY_SECONDS_INTERVAL,
        RETRY_SECONDS_MAX
      )
      if (data4.finished_on) {
        const { job_result: jobResult } = data4
        if (
          data4.job_status !== 'finished processing (OK)' ||
          !jobResult.terminoloski_kandidati
        ) {
          throw Error(
            `Remote job with id ${remotejobId} failed with result:\n${jobResult}`
          )
        }

        // TODO Read the response as a stream and try to parse it's contents into a file (write stream)('stream-json' package?).
        await writeFile(termCandidatesPath, JSON.stringify(jobResult))
        await db.query(
          "UPDATE extraction_job SET status = 'finished', time_finished = NOW() WHERE extraction_id = $1 AND job_type = $2 AND filename = $3",
          [extractionId, 'conllus to term candidates', '']
        )
        break
      }
    }
  } catch (error) {
    logExtractionError(error, extractionId, 'conllus to term candidates')
    await failTheJob(extractionId, 'conllus to term candidates', '')
    await skipConcordancerJob(extractionId)
    await failExtraction(extractionId)
    return
  }

  // Now we have conllus and term_candidates.json.
  // Start concondancer corpus processing.
  try {
    await db.query(
      "UPDATE extraction_job SET status = 'in progress', time_started = NOW() WHERE extraction_id = $1 AND job_type = $2 AND filename = $3",
      [extractionId, 'concordancer', '']
    )
    console.log('CREATING CORPUS')
    const {
      data: {
        entityInfo: { id: corpusId }
      }
    } = await axios.post('http://concordancer:5000/dashboard/corpus', {
      title: extractionName
    })

    await db.query('UPDATE extraction SET corpus_id = $1 WHERE id = $2', [
      corpusId,
      extractionId
    ])

    // Wait for creation of corpus.
    while (true) {
      console.log('SLEEP FOR 5 SECS')
      await sleep(5)
      const {
        data: { status }
      } = await axios.get(
        `http://concordancer:5000/dashboard/corpus/${corpusId}`
      )

      if (status === 'Creating') continue
      if (status === 'Active') break
      throw Error('Error creating concorcander corpus')
    }
    console.log('CORPUS CREATED')

    const inProgressStatusList = [
      'Waiting',
      'Importing',
      'ImportingCompleted',
      'Indexing',
      'IndexingCompleted'
    ]
    for (const conlluPath of conllusPaths) {
      const textPathParts = conlluPath.split('/')
      textPathParts[0] = '/data'
      const textPath = textPathParts.join('/')
      console.log('ADDING TEXT')
      const {
        data: {
          entityInfo: { id: textId }
        }
      } = await axios.post(
        `http://concordancer:5000/dashboard/corpus/${corpusId}/text`,
        { sourceFile: textPath }
      )

      // Wait for text ingestion.
      while (true) {
        console.log('SLEEP FOR 5 SECS')
        await sleep(5)
        const {
          data: { status }
        } = await axios.get(
          `http://concordancer:5000/dashboard/corpus/${corpusId}/text/${textId}`
        )

        if (inProgressStatusList.includes(status)) continue
        if (status === 'Active') break
        throw Error('Error importing concorcander text')
      }
      console.log('TEXT ADDED')
    }

    const termListPathParts = termCandidatesPath.split('/')
    termListPathParts[0] = '/data'
    const termListPath = termListPathParts.join('/')
    console.log('ADDING TERMS')
    const {
      data: {
        entityInfo: { id: termListId }
      }
    } = await axios.post(
      `http://concordancer:5000/dashboard/corpus/${corpusId}/termList`,
      { sourceFile: termListPath }
    )

    // Wait for term list ingestion.
    while (true) {
      console.log('SLEEP FOR 5 SECS')
      await sleep(5)
      const {
        data: { status }
      } = await axios.get(
        `http://concordancer:5000/dashboard/corpus/${corpusId}/termList/${termListId}`
      )

      if (inProgressStatusList.includes(status)) continue
      if (status === 'Active') break
      throw Error('Error importing concorcander text')
    }
    console.log('TERMS ADDED')

    await db.query(
      "UPDATE extraction_job SET status = 'finished', time_finished = NOW() WHERE extraction_id = $1 AND job_type = $2 AND filename = $3",
      [extractionId, 'concordancer', '']
    )

    await db.query(
      "UPDATE extraction SET status = 'finished', time_finished = NOW() WHERE id = $1",
      [extractionId]
    )
    console.log('EXTRACTION SUCCESSFUL')
  } catch (error) {
    logExtractionError(error, extractionId, 'concordancer')
    await failTheJob(extractionId, 'concordancer', '')
    await failExtraction(extractionId)
  }
}

// Supervise a specific extraction from OSS and bring it out of 'in progress' status.
// This is a temporary solution as explained in its execution context.
// It's also completely unmodular and a complete mess. Refactor at appropriate time.
Extraction.processOss = async function (extractionId, ossParams) {
  // TODO Consider if it would make sense to make stop term file reading streaming.
  // TODO Probably not, at least not while the the OSS enpoint is GET, due to limited length of URLs.
  // TODO Also consider refactoring certain parts,
  // TODO as some are identical or similar to Own variants or used earlier in the same pipeline.
  const RETRY_SECONDS_INTERVAL = 60 // 1 minute
  const RETRY_SECONDS_MAX = 60 * 60 * 24 // 1 day
  const stopTermsPath = getStopTermsPath(extractionId)
  const stopTermsFilesNames = await this.fetchAllStopTermsFilesNames(
    extractionId
  )
  const stopTermsSet = new Set()
  const stopTermsSeperator = /\r?\n/
  for (const stopTermsFileName of stopTermsFilesNames) {
    const fileContent = await readFile(
      `${stopTermsPath}/${stopTermsFileName}`,
      'utf8'
    )
    const stopTerms = fileContent.split(stopTermsSeperator)
    stopTerms.forEach(stopTerm => stopTermsSet.add(stopTerm.trim()))
  }
  stopTermsSet.delete('')
  const stopTerms = Array.from(stopTermsSet)

  const searchParams = new URLSearchParams({
    ...(ossParams.year && { leta: ossParams.year }),
    ...(ossParams.documentType && { vrste: ossParams.documentType }),
    ...(ossParams.keywords && { kljucneBesede: ossParams.keywords }),
    ...(ossParams.domainUdk && { udk: ossParams.domainUdk }),
    ...(stopTerms.length && { prepovedaneBesede: stopTerms }),
    // TODO Enabled for all cases. Add a switch for users later.
    definicije: true
  })

  const extractApiUrl = `${extractionApiOrigin}/oss/izlusciPoIskanjuAsync?${searchParams}`
  try {
    const { data: data1 } = await retry(
      async () => {
        return await axios.get(extractApiUrl)
      },
      RETRY_SECONDS_INTERVAL,
      RETRY_SECONDS_MAX
    )
    const remotejobId = +data1.check_job_url.split('/').at(-1)
    await db.query(
      "UPDATE extraction_job SET status = 'in progress', remote_job_id = $1, time_started = NOW() WHERE extraction_id = $2 AND job_type = $3 AND filename = $4",
      [remotejobId, extractionId, 'oss term candidates', '']
    )

    // Poll job until finished.
    while (true) {
      await sleep(5)
      const { data: data2 } = await retry(
        async () => {
          return await axios.get(`${extractionApiOrigin}/job/${remotejobId}`)
        },
        RETRY_SECONDS_INTERVAL,
        RETRY_SECONDS_MAX
      )
      if (data2.finished_on) {
        if (
          data2.job_status !== 'finished processing (OK)' ||
          !Array.isArray(data2.job_result?.terminoloski_kandidati)
        ) {
          throw Error(
            `Remote job with id ${remotejobId} failed with result:\n${data2.job_result}`
          )
        }

        // TODO Read the response as a stream and try to parse it's contents into a file (write stream)('stream-json' package?).
        const termCandidatesPath = getTermCandidatesPath(extractionId)
        await writeFile(termCandidatesPath, JSON.stringify(data2.job_result))
        await db.query(
          "UPDATE extraction_job SET status = 'finished', time_finished = NOW() WHERE extraction_id = $1 AND job_type = $2 AND filename = $3",
          [extractionId, 'oss term candidates', '']
        )
        break
      }
    }

    // Now we have term_candidates.json.
    // Mark extraction as finished.
    await db.query(
      "UPDATE extraction SET status = 'finished', time_finished = NOW() WHERE id = $1",
      [extractionId]
    )
  } catch (error) {
    logExtractionError(error, extractionId, 'oss term candidates')
    await failTheJob(extractionId, 'oss term candidates', '')
    await failExtraction(extractionId)
  }
}

async function failTheJob(extractionId, jobType, documentName) {
  await db.query(
    "UPDATE extraction_job SET status = 'failed', time_finished = NOW() WHERE extraction_id = $1 AND job_type = $2 AND filename = $3",
    [extractionId, jobType, documentName]
  )
}

async function skipConcordancerJob(extractionId) {
  await db.query(
    "UPDATE extraction_job SET status = 'skipped' WHERE extraction_id = $1 AND job_type = $2",
    [extractionId, 'concordancer']
  )
}

async function failExtraction(extractionId) {
  await db.query(
    "UPDATE extraction SET status = 'failed', time_finished = NOW() WHERE id = $1",
    [extractionId]
  )
}

function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

function logExtractionError(error, extractionId, jobType, filename) {
  // eslint-disable-next-line no-console
  console.error(
    Error(`Failed extraction job:
      extractionId: ${extractionId},
      jobType: ${jobType},
      filename: ${filename}`)
  )

  if (error.isAxiosError) error = Error(`Axios message: ${error.message}`)
  // eslint-disable-next-line no-console
  console.error(error)
}

async function retry(callback, everySeconds, maxSeconds) {
  const startTime = new Date()
  let numOfRetries = 0

  /* eslint-disable no-console */
  while (true) {
    try {
      const result = await callback()
      if (numOfRetries) {
        console.log(
          `Recovered after ${numOfRetries} retries and ${Math.floor(
            (new Date() - startTime) / 1000
          )} seconds`
        )
      }
      return result
    } catch (error) {
      const secondsSinceStart = Math.floor((new Date() - startTime) / 1000)
      const nextRetrySeconds = secondsSinceStart + everySeconds

      console.log('Failed inside retry')
      console.log(
        error.isAxiosError ? `Axios message: ${error.message}` : error
      )
      console.log({
        numOfRetries,
        secondsSinceStart,
        everySeconds,
        nextRetrySeconds,
        maxSeconds
      })

      if (nextRetrySeconds > maxSeconds) {
        console.log('FAILING RETRIES')
        throw error
      }

      console.log(`RETRYING IN ${everySeconds} SECONDS`)
      numOfRetries++
      await sleep(everySeconds)
    }
  }
  /* eslint-enable no-console */
}

module.exports = Extraction
