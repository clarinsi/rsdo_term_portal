const DemoPaginacija = require('../../../models/demo-paginacija')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')

exports.list = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  const { pages_total: numberOfAllPages, results } = await DemoPaginacija.fetch(
    resultsPerPage,
    page
  )

  res.send({ page, numberOfAllPages, results })
}
