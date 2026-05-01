import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function saveFoodData(data: any) {
  const client = await pool.connect();
  try {
    // TODO: Implement PostGIS storage logic
    // Using GEOGRAPHY(Point, 4326)
    
    /*
    const query = `
      INSERT INTO food_places (name, location, price_level, avg_price, meta_data)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, $5, $6)
      ON CONFLICT (source_id) DO UPDATE SET ...
    `;
    */
    
    console.log("[DB] Saving data...");
  } finally {
    client.release();
  }
}
