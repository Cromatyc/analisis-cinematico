// Ejecutar con:  node test/verificar.js
// Compara el programa con todas las filas de las Tablas P11-1, P11-2 y P11-3 de Norton.
const { verificarTodo } = require("../js/verificacion.js");

const res = verificarTodo();
let fallas = 0, total = 0, erratas = 0;
const f2 = (x) => (Array.isArray(x) ? `${x[0].toFixed(2)} ∠ ${x[1].toFixed(2)}°` : x.toFixed(3));

for (const grupo of [res.corredera, res.cuatroBarras]) {
  for (const fila of grupo) {
    console.log(`\nTabla ${fila.tabla} – fila ${fila.fila} (config. ${fila.config})`);
    for (const c of fila.comparaciones) {
      total++;
      if (c.estado === "falla") fallas++;
      if (c.estado === "errata") erratas++;
      const marca = { ok: "OK ", errata: "ERR", falla: "XX " }[c.estado];
      console.log(`  ${marca} ${c.nombre.padEnd(12)} programa = ${f2(c.calc).padStart(20)}   libro = ${f2(c.libro).padStart(20)}`);
      if (c.errata) console.log(`        errata del libro: ${c.errata}`);
    }
  }
}
console.log(`\n${total - fallas - erratas}/${total} coinciden exactamente, ${erratas} son erratas documentadas del libro, ${fallas} fallas.`);
process.exit(fallas ? 1 : 0);
