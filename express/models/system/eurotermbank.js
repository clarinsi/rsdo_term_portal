const db = require('../../models/db')
const Cursor = require('pg-cursor')
const axios = require('axios').default
const xmlFlow = require('xml-flow')
const { removeHtmlTags } = require('../helpers')

const Eurotermbank = {}

// Push all changes to Eurotermbank.
Eurotermbank.push = async () => {
  const dbClient = await db.getClient()

  try {
    const { rows: dictrionariesToSync } = await dbClient.query(
      'SELECT id, name_sl FROM dictionary ORDER BY id'
    )

    for (const { id, name_sl: name } of dictrionariesToSync) {
      // Create/update collection metadata.
      await centralSyncApi.put(id.toString(), {
        name,
        domainid: 2841
      })

      const text = `
        SELECT
          id,
          term,
          definition,
          ARRAY(
            SELECT name
            FROM entry_domain_label edl
            LEFT JOIN domain_label dl ON dl.id = edl.domain_label_id
            WHERE entry_id = e.id
          ) domain_labels,
          ARRAY(
            SELECT jsonb_build_object(
              'link', link,
              'type', type)
            FROM entry_link
            WHERE entry_id = e.id
          ) links,
          ARRAY(
            SELECT jsonb_build_object(
              'lang_code', l.code,
              'terms', ef.term,
              'definition', ef.definition,
              'synonyms', ef.synonym)
          FROM entry_foreign ef
          LEFT JOIN LANGUAGE l ON l.id = ef.language_id
          WHERE entry_id = e.id
          ) foreign_entries
        FROM entry e
        WHERE
          e.dictionary_id = $1
          AND is_valid`
      const values = [id]

      const cursor = dbClient.query(new Cursor(text, values))

      let entries = []
      do {
        // Keep getting and sending entries in batches of 100.
        entries = await cursor.read(100)

        if (entries.length) {
          const tbxPayload = generateTbxPayload(entries)
          await centralSyncApi.post(`${id}/entries`, tbxPayload, {
            headers: { 'content-type': 'application/xml' }
          })
        }
      } while (entries.length === 100)
    }
  } finally {
    dbClient.release()
  }
}

const centralSyncApi = axios.create({
  baseURL:
    'https://test-fedterm.eurotermbank.com/api/termservice/sync/collection/external/',
  auth: {
    username: 'SlovenianNTP',
    password: '3l063Ni=p0tr4l(t3rm'
  }
})

function generateTbxPayload(entries) {
  // Opening boilerplate.
  let tbxPayload =
    '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE martif SYSTEM "https://eurotermbank.com/TBXcoreStructV02%20%281%29.dtd"><martif type="TBX" xml:lang="en"><martifHeader><fileDesc><sourceDesc><p>Sync collection sample</p></sourceDesc></fileDesc><encodingDesc><p type="XCSURI">https://eurotermbank.com/tbx-0.5.1.xcs</p></encodingDesc></martifHeader><text><body>'

  // Entry content TBX.
  tbxPayload += entries.reduce(
    (payload, entry) => (payload += generateEntryTbx(entry)),
    ''
  )

  // Closing boilerplate.
  tbxPayload += '</body></text></martif>'

  return tbxPayload
}

function generateEntryTbx(entry) {
  const entryObj = {
    $name: 'termEntry',
    $attrs: { id: entry.id },
    $markup: [
      {
        $name: 'langSet',
        $attrs: { 'xml:lang': 'sl' },
        $markup: [
          {
            $name: 'ntig',
            $markup: [
              {
                $name: 'termGrp',
                $markup: [{ $name: 'term', $text: removeHtmlTags(entry.term) }]
              }
            ]
          }
        ]
      }
    ]
  }

  if (entry.definition) {
    const definitionObj = {
      $name: 'descripGrp',
      $markup: [
        {
          $name: 'descrip',
          $attrs: { type: 'definition' },
          $text: removeHtmlTags(entry.definition)
        }
      ]
    }

    entryObj.$markup[0].$markup.push(definitionObj)
  }

  entry.foreign_entries.forEach(fEntry => {
    const fEntryObj = {
      $name: 'langSet',
      $attrs: { 'xml:lang': fEntry.lang_code },
      $markup: [
        {
          $name: 'ntig',
          $markup: [
            {
              $name: 'termGrp',
              $markup: [
                { $name: 'term', $text: removeHtmlTags(fEntry.terms[0]) }
              ]
            }
          ]
        }
      ]
    }

    if (fEntry.definition) {
      const fDefinitionObj = {
        $name: 'descripGrp',
        $markup: [
          {
            $name: 'descrip',
            $attrs: { type: 'definition' },
            $text: removeHtmlTags(fEntry.definition)
          }
        ]
      }

      fEntryObj.$markup.push(fDefinitionObj)
    }

    entryObj.$markup.push(fEntryObj)
  })

  return xmlFlow.toXml(entryObj)
}

module.exports = Eurotermbank
