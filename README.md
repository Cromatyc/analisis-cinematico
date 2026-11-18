# Análisis cinemático de mecanismos

Aplicación web para el análisis de **posición, velocidad y aceleración** de dos mecanismos:

- **Manivela-balancín** (cuatro barras, juntas revolutas)
- **Manivela-corredera** con descentrado (juntas revolutas y prismática)

Se ingresan las longitudes y los datos del eslabón de entrada (θ2, ω2, α2), y la aplicación calcula:

| | Manivela-balancín | Manivela-corredera |
|---|---|---|
| Posición | θ3, θ4, posición de A, B, G2, G3, G4, P3, P4 | θ3, d, posición de A, B, G2, G3, P3 |
| Velocidad | ω3, ω4, V_A, V_B, V_B/A, V_G2, V_G3, V_G4, V_P3, V_P4 | ω3, ḋ, V_A, V_B, V_B/A, V_G2, V_G3, V_G4, V_P3 |
| Aceleración | α3, α4, a_A, a_B, a_B/A, a_G2, a_G3, a_G4, a_P3, a_P4 | α3, d̈, a_A, a_B, a_B/A, a_G2, a_G3, a_G4, a_P3 |
| Otros | Condición de Grashof, ángulo de transmisión, K1–K5, A–F | Carrera, d mín./máx., ángulo de transmisión |
| **Fuerzas** (cap. 11) | F12, F32, F43, F14, par motor T12, F21, F41, fuerza y par de sacudimiento, fuerzas y pares de inercia, potencia | ídem, más la normal y la fricción de la guía |

### Fuerzas dinámicas

Si se ingresan las masas, los momentos de inercia (respecto al CG), las fuerzas externas en P3 y P4 y los pares externos T3 y T4, la aplicación resuelve el sistema de Newton-Euler de Norton (cap. 11):

- **Cuatro barras:** 9 ecuaciones con 9 incógnitas (F12, F32, F43, F14 y T12).
- **Manivela-corredera:** 8 ecuaciones; además admite fricción μ entre la corredera y la guía, opuesta a la velocidad.

Para las fuerzas externas:

- **Cuatro barras:** los ángulos δ_FP3 y δ_FP4 se miden respecto al eje X global.
- **Manivela-corredera:** δ_FP3 se mide respecto a la línea AB (figura P11-1), y la fuerza sobre la corredera, respecto a X.

Además de calcular, la aplicación:

- dibuja el mecanismo con los vectores de velocidad y aceleración y la trayectoria de los puntos;
- anima la vuelta de la manivela;
- grafica cualquier magnitud durante una vuelta completa;
- exporta los resultados en CSV;
- trae como ejemplos todas las filas (a–g) de las tablas del Norton.

## Uso

📄 **[Guía de uso en PDF](docs/Guia-de-uso.pdf)**: explica paso a paso cómo obtener la posición, la velocidad y la aceleración, dónde leer cada resultado y qué cambia con cada dato.

Aplicación en línea: https://cromatyc.github.io/analisis-cinematico/ (también se puede abrir directamente en una pestaña con `#balancin`, `#corredera` o `#verificacion`).

Basta con abrir `index.html` en el navegador; no requiere instalar nada.

Para servirla en local:

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

### Publicar en GitHub Pages

1. Crear un repositorio en GitHub y subir este proyecto:
   ```bash
   git remote add origin https://github.com/<usuario>/analisis-cinematico.git
   git push -u origin main
   ```
2. En GitHub, ir a **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
3. La aplicación queda en `https://<usuario>.github.io/analisis-cinematico/`.

## Verificación

El programa se comparó con las 7 filas de las Tablas **P11-1, P11-2 y P11-3** de Norton,
*Diseño de Maquinaria*, 4a Ed. En total son 133 valores:

- **127 coinciden** dentro del redondeo del libro.
- **6 son erratas del libro.** En cada uno, otros valores de la misma fila del libro solo se cumplen con el resultado del programa. La explicación está en `js/datos-norton.js`.

```bash
node test/verificar.js
```

El libro no publica las respuestas de fuerzas de estas tablas. Por eso el análisis dinámico se comprueba con dos métodos independientes del sistema matricial, en las 14 filas:

- **Balance de potencia** (trabajo virtual, sección 11.13).
- **Equilibrio global** del mecanismo.

También se comprueba con un caso estático resuelto a mano y con pruebas de la fricción:

```bash
node test/dinamica.js
```

Ambas comparaciones también se pueden ver en la pestaña **Verificación Norton** de la aplicación.

## Convenciones

- Ángulos en grados; ω en rad/s; α en rad/s². Las longitudes pueden estar en cualquier unidad, siempre que sea la misma para todas.
- Cuatro barras: a = eslabón 2, b = eslabón 3, c = eslabón 4, d = eslabón 1 (bancada).
- Manivela-corredera: a = manivela, b = biela, c = descentrado. θ3 es el ángulo del vector que va de B hacia A; por eso, en la configuración abierta, θ3 ≈ 180°.
- **Centros de gravedad:** R_g se mide desde el pivote del eslabón (O2, A, O4) y δ, respecto a la línea del eslabón.
- **Puntos P:** R_P se mide desde el CG del eslabón y δ_RP, respecto a la línea del eslabón (figuras P11-1 y P11-2).

## Fórmulas

Norton, *Diseño de Maquinaria* 4a Ed.:

| Mecanismo | Posición | Velocidad | Aceleración |
|---|---|---|---|
| Cuatro barras | ec. 4.10 | ec. 6.18 | ec. 7.12 |
| Manivela-corredera | ec. 4.17 | ec. 6.22 | ec. 7.16 |

Fuerzas dinámicas: cap. 11 (método matricial de Newton-Euler, secs. 11.6 a 11.8 y 11.13).

## Estructura

```
index.html            interfaz
docs/Guia-de-uso.pdf  guía de uso (fuente en docs/guia/guia.html)
css/estilos.css       estilos (tema claro/oscuro)
js/cinematica.js      cálculos (sin dependencias; sirve también en Node)
js/dinamica.js        fuerzas dinámicas (Newton-Euler)
js/datos-norton.js    datos y resultados de las tablas del libro
js/verificacion.js    comparación programa vs. libro
js/app.js             lógica de la interfaz
test/verificar.js     verificación cinemática por consola (Node)
test/dinamica.js      comprobación de las fuerzas dinámicas (Node)
python/               versión de consola en Python (solo cinemática)
```
