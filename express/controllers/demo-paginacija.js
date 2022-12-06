const DemoPaginacija = require('../models/demo-paginacija')
const { DEFAULT_HITS_PER_PAGE } = require('../config/settings')

const demoPaginacija = {}

demoPaginacija.izrišiStran = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const { pages_total: numberOfAllPages, results } = await DemoPaginacija.fetch(
    resultsPerPage,
    1
  )

  res.render('pages/demo-paginacija', { numberOfAllPages, results })
}

module.exports = demoPaginacija
