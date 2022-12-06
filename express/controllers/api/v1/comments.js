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

exports.seedComments = async (req, res) => {
  const { commentCount } = req.params
  await Comment.seed(commentCount)
  res.send(`${commentCount} new comments generated`)
}

exports.clearComments = async (req, res) => {
  await Comment.clear()
  res.send('All comments cleared')
}

exports.updateStatus = async (req, res) => {
  const commentId = req.body.params.id
  const commentStatus = req.body.params.status
  await Comment.updateStatus(commentId, commentStatus)
  res.send('Visibility changed')
}
