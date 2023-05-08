const Comment = require('../../../models/comment')
const Entry = require('../../../models/entry')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')

exports.listComments = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const page = +req.query.p > 0 ? +req.query.p : 1
  const filters = { ctxType: req.query.ctx_type, ctxId: req.query.ctx_id }

  if (filters.ctxId === 'null') {
    filters.ctxId = null
  }

  if (filters.ctxType === 'entry_dict_int') {
    const { dictionary_id: dictionaryId } = await Entry.fetch(filters.ctxId)
    const isEditor = req.user.hasAnyDictionaryRole(dictionaryId)
    const isPortalAdmin = req.user.hasRole('portal admin')
    const isDictionariesAdmin = req.user.hasRole('dictionaries admin')
    if (!(isEditor || isPortalAdmin || isDictionariesAdmin)) {
      return res.status(400).end()
    }
  } else if (filters.ctxType === 'entry_consult_int') {
    const isConsultantForEntry = req.user.isEditorOfConsultancyEntry(
      filters.ctxId
    )
    const isPortalAdmin = req.user.hasRole('portal admin')
    const isConsultancyAdmin = req.user.hasRole('consultancy admin')
    if (!(isConsultantForEntry || isPortalAdmin || isConsultancyAdmin)) {
      return res.status(400).end()
    }
  }

  const {
    pages_total: numberOfAllPages,
    comments,
    comment_count: commentCount
  } = await Comment.list(filters, req.user, resultsPerPage, page)

  res.send({ page, numberOfAllPages, comments, commentCount })
}

exports.createComment = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE
  const receivedComment = req.body
  const { ctxType, ctxId } = receivedComment
  await Comment.create(receivedComment, req.user?.id)
  const filters = { ctxType, ctxId }
  const { pages_total: pagesTotal, comments } = await Comment.list(
    filters,
    req.user,
    resultsPerPage,
    'last'
  )
  if (ctxType === 'entry_dict_int' || ctxType === 'entry_dict_ext') {
    await Entry.indexIntoSearchEngine(ctxId)
  }
  res.send({ comments, pagesTotal })
}

exports.updateStatus = async (req, res) => {
  const commentId = req.body.params.id
  const commentStatus = req.body.params.status

  const { ctxType, ctxId } = await Comment.fetchContextById(commentId)

  let canUpdateStatus = false
  switch (ctxType) {
    case 'portal':
      if (req.user.hasRole('portal admin')) canUpdateStatus = true
      break

    case 'dictionary':
      if (
        req.user.hasRole('portal admin') ||
        req.user.hasRole('dictionaries admin')
      ) {
        canUpdateStatus = true
      }
      break

    case 'consultancy':
      if (
        req.user.hasRole('portal admin') ||
        req.user.hasRole('consultancy admin')
      ) {
        canUpdateStatus = true
      }
      break

    case 'entry_dict_ext': {
      const { dictionary_id: dictionaryId } = await Entry.fetch(ctxId)

      if (
        req.user.hasRole('portal admin') ||
        req.user.hasRole('dictionaries admin') ||
        req.user.hasDictionaryRole(dictionaryId, 'administration')
      ) {
        canUpdateStatus = true
      }
      break
    }

    default:
      throw Error('Invalid context type')
  }

  if (!canUpdateStatus) return res.status(400).end()

  await Comment.updateStatus(commentId, commentStatus)
  res.send('Visibility changed')
}
