const xmlFlow = require('xml-flow')
const xss = require('xss')

exports.transformAndAppend = async (
  entries,
  exportFields,
  exportFile,
  exportFileFormat,
  dsvConfig
) => {
  let transformEntry
  if (exportFileFormat === 'xml') transformEntry = intoXml
  else if (dsvConfig) transformEntry = intoDsv(dsvConfig)
  else if (exportFileFormat === 'tbx') transformEntry = intoTbx
  else throw Error('Specified export format not supported yet')

  for (const entry of entries) {
    const transformedEntry = transformEntry(entry, exportFields)
    await exportFile.write(`${transformedEntry}\n`)
  }
}

function intoXml(entry, exportFields) {
  const entryObj = { $name: 'entry', $markup: [] }

  if (entry.term) {
    entryObj.$markup.push({ term: entry.term })
  }

  if (exportFields.domainLabels && entry.domain_labels.length) {
    const domainLabelsObj = {
      $name: 'domainLabels',
      $markup: entry.domain_labels.map(domainLabel => {
        return { domainLabel }
      })
    }
    entryObj.$markup.push(domainLabelsObj)
  }

  if (exportFields.label && entry.label) {
    entryObj.$markup.push({ label: entry.label })
  }

  if (exportFields.definition && entry.definition) {
    entryObj.$markup.push({ def: entry.definition })
  }

  if (exportFields.synonyms && entry.synonyms?.length) {
    const SynonymsObj = {
      $name: 'syns',
      $markup: entry.synonyms.map(synonym => {
        return { syn: synonym }
      })
    }
    entryObj.$markup.push(SynonymsObj)
  }

  if (exportFields.links && entry.links.length) {
    const LinksObj = {
      $name: 'links',
      $markup: entry.links.map(linkObj => {
        return {
          $name: 'link',
          $attrs: { type: linkObj.type },
          $text: linkObj.link
        }
      })
    }
    entryObj.$markup.push(LinksObj)
  }

  if (exportFields.other && entry.other) {
    entryObj.$markup.push({ other: entry.other })
  }

  if (exportFields.foreignTerms && entry.foreign_entries.length) {
    const fLangsObj = {
      $name: 'fLangs',
      $markup: entry.foreign_entries.map(fEntryObj => {
        const fLangObj = {
          $name: 'fLang',
          $attrs: { lang: fEntryObj.lang_code },
          $markup: []
        }

        if (fEntryObj.terms) {
          const fTermsObj = {
            $name: 'fTerms',
            $markup: fEntryObj.terms.map(term => {
              return { fTerm: term }
            })
          }
          fLangObj.$markup.push(fTermsObj)
        }

        if (exportFields.foreignDefinitions && fEntryObj.definition) {
          fLangObj.$markup.push({ fDef: fEntryObj.definition })
        }

        if (exportFields.foreignSynonyms && fEntryObj.synonyms?.length) {
          const fSynsObj = {
            $name: 'fSyns',
            $markup: fEntryObj.synonyms.map(synonym => {
              return { fSyn: synonym }
            })
          }
          fLangObj.$markup.push(fSynsObj)
        }

        return fLangObj
      })
    }
    entryObj.$markup.push(fLangsObj)
  }

  const shouldExportImages = exportFields.images && entry.image?.length
  const shouldExportAudio = exportFields.audio && entry.audio?.length
  const shouldExportVideos = exportFields.videos && entry.video?.length
  const shouldCreateMm =
    shouldExportImages || shouldExportAudio || shouldExportVideos

  if (shouldCreateMm) {
    const MmObj = {
      $name: 'mm',
      $markup: []
    }

    if (shouldExportImages) {
      entry.image.forEach(el => {
        MmObj.$markup.push({ image: el })
      })
    }

    if (shouldExportAudio) {
      entry.audio.forEach(el => {
        MmObj.$markup.push({ audio: el })
      })
    }

    if (shouldExportVideos) {
      entry.video.forEach(el => {
        MmObj.$markup.push({ video: el })
      })
    }

    entryObj.$markup.push(MmObj)
  }

  return xmlFlow.toXml(entryObj, { escape: str => str })
}

function intoDsv({ delimiter, languageCodes }) {
  return function (entry, exportFields) {
    const fieldsArr = [intoDsvField(entry.term)]

    if (exportFields.domainLabels) {
      fieldsArr.push(
        intoDsvField(
          entry.domain_labels.reduce((agg, domainLabel, index) => {
            agg += `${index ? '\n' : ''}${domainLabel}`
            return agg
          }, '')
        )
      )
    }

    if (exportFields.label) fieldsArr.push(intoDsvField(entry.label))

    if (exportFields.definition) fieldsArr.push(intoDsvField(entry.definition))

    if (exportFields.synonyms) {
      fieldsArr.push(
        intoDsvField(
          entry.synonyms?.reduce((agg, synonym, index) => {
            agg += `${index ? '\n' : ''}${synonym}`
            return agg
          }, '')
        )
      )
    }

    if (exportFields.links) {
      fieldsArr.push(
        intoDsvField(
          entry.links.reduce((agg, linkObj, index) => {
            agg += `${index ? '\n' : ''}[${linkObj.type[0]}t]${linkObj.link}`
            return agg
          }, '')
        )
      )
    }

    if (exportFields.other) fieldsArr.push(intoDsvField(entry.other))

    languageCodes?.forEach(languageCode => {
      const fEntryObj = entry.foreign_entries.find(
        entryObj => entryObj.lang_code === languageCode
      )

      fieldsArr.push(
        intoDsvField(
          fEntryObj?.terms?.reduce((agg, term, index) => {
            agg += `${index ? '\n' : ''}${term}`
            return agg
          }, '')
        )
      )
      if (exportFields.foreignDefinitions) {
        fieldsArr.push(intoDsvField(fEntryObj?.definition))
      }
      if (exportFields.foreignSynonyms) {
        fieldsArr.push(
          intoDsvField(
            fEntryObj?.synonyms?.reduce((agg, synonym, index) => {
              agg += `${index ? '\n' : ''}${synonym}`
              return agg
            }, '')
          )
        )
      }
    })

    if (exportFields.images) {
      fieldsArr.push(
        intoDsvField(
          entry.image?.reduce((agg, el, index) => {
            agg += `${index ? '\n' : ''}${el}`
            return agg
          }, '')
        )
      )
    }

    if (exportFields.audio) {
      fieldsArr.push(
        intoDsvField(
          entry.audio?.reduce((agg, el, index) => {
            agg += `${index ? '\n' : ''}${el}`
            return agg
          }, '')
        )
      )
    }

    if (exportFields.videos) {
      fieldsArr.push(
        intoDsvField(
          entry.video?.reduce((agg, el, index) => {
            agg += `${index ? '\n' : ''}${el}`
            return agg
          }, '')
        )
      )
    }

    return fieldsArr.join(delimiter)
  }
}

function intoDsvField(fieldString) {
  if (!fieldString) return ''
  return `"${fieldString.replaceAll('"', '""')}"`
}

const tbxLinkTypeMap = {
  related: 'relatedConcept',
  broader: 'relatedConceptBroader',
  narrow: 'relatedConceptNarrower'
}
const brTagPattern = /<br[^>]*>/
function intoTbx(entry, exportFields) {
  const entryObj = { $name: 'termEntry', $markup: [] }

  if (exportFields.images) {
    entry.image?.forEach(el => {
      entryObj.$markup.push({
        $name: 'xref',
        $attrs: { type: 'xGraphic' },
        $text: el
      })
    })
  }

  if (exportFields.audio) {
    entry.audio?.forEach(el => {
      entryObj.$markup.push({
        $name: 'xref',
        $attrs: { type: 'xAudio' },
        $text: el
      })
    })
  }

  if (exportFields.videos) {
    entry.video?.forEach(el => {
      entryObj.$markup.push({
        $name: 'xref',
        $attrs: { type: 'xVideo' },
        $text: el
      })
    })
  }

  const slLangObj = {
    $name: 'langSet',
    $attrs: { 'xml:lang': 'sl' },
    $markup: []
  }

  if (exportFields.label && entry.label) {
    slLangObj.$markup.push({
      $name: 'descrip',
      $attrs: { type: 'explanation' },
      $text: intoTbxMixed(entry.label)
    })
  }

  if (exportFields.definition && entry.definition) {
    slLangObj.$markup.push({
      $name: 'descrip',
      $attrs: { type: 'definition' },
      $text: intoTbxMixed(entry.definition)
    })
  }

  if (exportFields.links) {
    entry.links.forEach(linkObj => {
      slLangObj.$markup.push({
        $name: 'descrip',
        $attrs: { type: tbxLinkTypeMap[linkObj.type] },
        $text: intoTbxMixed(linkObj.link)
      })
    })
  }

  if (exportFields.other && entry.other) {
    const otherLines = entry.other.split(brTagPattern)
    otherLines.forEach(line => {
      slLangObj.$markup.push({
        $name: 'descrip',
        $attrs: { type: 'other' },
        $text: intoTbxMixed(line)
      })
    })
  }

  const shouldExportTerm = entry.term
  const shouldExportDomainLabels =
    exportFields.domainLabels && entry.domain_labels.length
  const shouldCreateTermNtig = shouldExportTerm || shouldExportDomainLabels

  if (shouldCreateTermNtig) {
    const termNtigObj = {
      $name: 'ntig',
      $markup: [{ $name: 'termGrp', $markup: [] }]
    }
    const termGrpMarkup = termNtigObj.$markup[0].$markup

    if (shouldExportTerm) {
      termGrpMarkup.push({ term: intoTbxMixed(entry.term) })
      termGrpMarkup.push({
        $name: 'termNote',
        $attrs: { type: 'termType' },
        $text: 'entryTerm'
      })
    }

    if (shouldExportDomainLabels) {
      entry.domain_labels.forEach(domainLabel => {
        termGrpMarkup.push({
          $name: 'termNote',
          $attrs: { type: 'domain' },
          $text: domainLabel
        })
      })
    }

    slLangObj.$markup.push(termNtigObj)
  }

  if (exportFields.synonyms) {
    entry.synonyms?.forEach(synonym => {
      slLangObj.$markup.push({
        $name: 'ntig',
        $markup: [
          {
            $name: 'termGrp',
            $markup: [
              { term: intoTbxMixed(synonym) },
              {
                $name: 'termNote',
                $attrs: { type: 'termType' },
                $text: 'synonym'
              }
            ]
          }
        ]
      })
    })
  }

  entryObj.$markup.push(slLangObj)

  if (exportFields.foreignTerms) {
    entry.foreign_entries.forEach(fEntryObj => {
      const langSetObj = {
        $name: 'langSet',
        $attrs: { 'xml:lang': fEntryObj.lang_code },
        $markup: []
      }

      if (exportFields.foreignDefinitions && fEntryObj.definition) {
        langSetObj.$markup.push({
          $name: 'descrip',
          $attrs: { type: 'definition' },
          $text: intoTbxMixed(fEntryObj.definition)
        })
      }

      fEntryObj.terms?.forEach(term => {
        langSetObj.$markup.push({
          $name: 'ntig',
          $markup: [
            {
              $name: 'termGrp',
              $markup: [{ term: intoTbxMixed(term) }]
            }
          ]
        })
      })

      if (exportFields.foreignSynonyms) {
        fEntryObj.synonyms?.forEach(synonym => {
          langSetObj.$markup.push({
            $name: 'ntig',
            $markup: [
              {
                $name: 'termGrp',
                $markup: [
                  { term: intoTbxMixed(synonym) },
                  {
                    $name: 'termNote',
                    $attrs: { type: 'termType' },
                    $text: 'synonym'
                  }
                ]
              }
            ]
          })
        })
      }

      entryObj.$markup.push(langSetObj)
    })
  }

  return xmlFlow.toXml(entryObj, { escape: str => str })
}

const tbxRichFilter = new xss.FilterXSS({
  whiteList: {
    sup: [],
    sub: [],
    b: [],
    i: []
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style']
})
const tagPattern = /<\s*(\/)?\s*([^\s/>]+)\s*>/g
function intoTbxMixed(mixedContentStr) {
  return tbxRichFilter
    .process(mixedContentStr)
    .replace(tagPattern, tbxMixedReplacer)
}

const tbxMixedTypeMap = {
  sup: 'superscript',
  sub: 'subscript',
  b: 'bold',
  i: 'italics'
}
function tbxMixedReplacer(match, closingSlash, tagName) {
  if (closingSlash) return '</hi>'
  return `<hi type="${tbxMixedTypeMap[tagName]}">`
}
