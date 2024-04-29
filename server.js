const { Pool } = require("pg");

const argumentos = process.argv.slice(2);

const tipo_transaccion = argumentos[0];
const cuenta = argumentos[1];
const fecha = argumentos[2];
const descripcion = argumentos[3];
const monto = argumentos[4];
const cuentaDestino = argumentos[5];

const pool = new Pool({
  user: "user",
  host: "localhost",
  password: "password",
  database: "banco",
  port: 5432,
});

const consulta = async ({ cuenta }) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM transferencias WHERE cuenta_origen = $1 ORDER BY fecha DESC LIMIT 10;`,
      [cuenta]
    );
    console.log(` Las últimas 10 transferencias de la cuenta ${cuenta} son:`);
    console.log(rows);
  } catch (error) {
    console.error("Error al consultar las transferencias:", error);
  }
};

const consultaSaldo = async ({ cuenta }) => {
  try {
    const { rows } = await pool.query(`SELECT saldo FROM cuentas WHERE id = $1`, [
      cuenta
    ]);
    if (rows.length > 0) {
      console.log(`El saldo de la cuenta ${cuenta} es: ${rows[0].saldo}`);
    } else {
      console.log(`La cuenta ${cuenta} no existe.`);
    }
  } catch (error) {
    console.error("Error al consultar el saldo:", error);
  }
};

const nueva = async ({ descripcion, fecha, monto, cuenta, cuentaDestino }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      "INSERT INTO transferencias (descripcion, fecha, monto, cuenta_origen, cuenta_destino) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [descripcion, fecha, monto, cuenta, cuentaDestino]
    );

    await client.query(
      "UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2",
      [monto, cuenta]
    );

    await client.query(
      "UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2",
      [monto, cuentaDestino]
    );

    await client.query("COMMIT");
    console.log("Transacción realizada con éxito");
    console.log("Última transacción: ", result.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const funciones = {
  nueva,
  consulta,
  "consulta-saldo": consultaSaldo,
};

(async () => {
  try {
    await funciones[tipo_transaccion]({
      cuenta,
      fecha,
      descripcion,
      monto,
      cuentaDestino,
    });
  } catch (error) {
    console.log("Error:", error.message);
  } finally {
    await pool.end();
  }
})();

