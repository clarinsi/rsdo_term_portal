const db = require('./db')

const DemoPaginacija = {}

// Metoda za generacijo demo podatkov.
DemoPaginacija.initDemoData = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS demo_paginacija (zanimivo TEXT, nezanimivo1 TEXT, nezanimivo2 TEXT);

    DO $$
    BEGIN
    IF (SELECT COUNT(*) FROM demo_paginacija) = 0 THEN
      FOR stevec IN 1..9993 LOOP
        INSERT INTO demo_paginacija VALUES ('vrednost' || stevec, 'brezveze', 'tega res ne rabimo');
      END LOOP;
    END IF;
    END $$`)
}

// Metoda za poizvedbo demo podatkov za določeno stran.
DemoPaginacija.fetch = async (resultsPerPage, page) => {
  const {
    rows: [{ result }]
  } = await db.query(
    `
      SELECT jsonb_build_object(
        'pages_total', (
          SELECT CEIL(COUNT(*) / $1::float)
          FROM demo_paginacija
        ),
        'results', ARRAY(
          SELECT jsonb_build_object(
            'zanimivo', zanimivo,
            'nezanimivo1', nezanimivo1,
            'nezanimivo2', nezanimivo2
          )
          FROM demo_paginacija
          LIMIT $1
          OFFSET $2
        )
      ) result
    `,
    [resultsPerPage, resultsPerPage * (page - 1)]
  )

  return result
}

module.exports = DemoPaginacija
