const User = require('../../../models/user')
const { DEFAULT_HITS_PER_PAGE } = require('../../../config/settings')

const users = {}
users.listUsers = async (req, res) => {
  const resultsPerPage = req.user?.hitsPerPage || DEFAULT_HITS_PER_PAGE

  const page = +req.query.p > 0 ? +req.query.p : 1

  const { pages_total: numberOfAllPages, results } = await User.fetchAll(
    resultsPerPage,
    page
  )

  res.send({ page, numberOfAllPages, results })
}

users.updateHitsPerPage = async (req, res) => {
  const hitAmount = req.body.hitAmount

  await User.updateHitsPerPage(req.user.userName, hitAmount)

  res.status(200).send()
}

users.updateFristNameAndSurname = async (req, res) => {
  const firstname = req.body.name
  const surname = req.body.surname

  await User.updateFirstNameAndLastName(req.user.userName, firstname, surname)

  res.status(200).send()
}

module.exports = users
