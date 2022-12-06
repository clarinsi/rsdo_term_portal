// TODO Possible duplicate methods in Dictionary model.
// TODO Ambiguous model name. There are also secondary domains, domain labels, ...

const db = require('./db')

class Domain {
  constructor({
    id,
    name_sl: nameSl,
    name_en: nameEn,
    udk_code: udkCode,
    cerif_name: cerifName,
    cerif_code: cerifCode,
    eurovoc_name: eurovocName,
    eurovoc_code: eurovocNode
  }) {
    this.id = id
    this.nameSl = nameSl
    this.nameEn = nameEn
    this.udkCode = udkCode
    this.cerifName = cerifName
    this.cerifCode = cerifCode
    this.eurovocName = eurovocName
    this.eurovocNode = eurovocNode
  }

  // Fetch all consultancy entries from DB.
  static async fetchAll() {
    // TODO Luka: Miha, define specific fields instead of using *.
    const { rows: fetchedConsEntries } = await db.query(`
        SELECT *
        FROM domain_primary`)
    const domains = fetchedConsEntries.map(domain => new this(domain))
    return domains
  }

  // Fetch domain by ID.
  static async fetchById(id) {
    // TODO Luka: Miha, define specific fields instead of using *.
    const { rows: domainEntity } = await db.query(
      `
    SELECT *
    FROM domain_primary
    WHERE id=$1`,
      [id]
    )

    const domain = new this(domainEntity[0])
    return domain
  }

  // Fetch domain by name.
  static async fetchByName(name) {
    // TODO Luka: Miha, define specific fields instead of using *.
    const { rows: domainEntity } = await db.query(
      `
    SELECT *
    FROM domain_primary
    WHERE name_sl=$1`,
      [name]
    )

    const domain = new this(domainEntity[0])
    return domain
  }

  // Fetch primary domain id by udk code.
  static async fetchIdByUdkCode(udkCode) {
    const {
      rows: [{ id }]
    } = await db.query('SELECT id FROM domain_primary WHERE udk_code = $1', [
      udkCode
    ])

    return id
  }
}

module.exports = Domain
