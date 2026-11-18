# -*- coding: utf-8 -*-
"""
ANÁLISIS CINEMÁTICO DE MECANISMOS DE CUATRO BARRAS (método de Norton)
=====================================================================
A partir de los datos del eslabón de entrada (eslabón 2: θ2, ω2, α2) calcula
posición, velocidad y aceleración de los demás eslabones para:

  1) Mecanismo manivela-balancín (cuatro barras, juntas revolutas)
  2) Mecanismo manivela-corredera (descentrado), juntas revolutas y prismática

Fórmulas: Norton, Diseño de Maquinaria 4a Ed., caps. 4, 6 y 7
(las mismas de las diapositivas "Cuatro Barras - A. Cinemático ...").

Convenciones (iguales al libro):
  Cuatro barras:  a = eslabón 2 (manivela), b = eslabón 3 (acoplador),
                  c = eslabón 4 (balancín), d = eslabón 1 (bancada)
  Manivela-corredera: a = manivela, b = biela, c = descentrado,
                  d = posición de la corredera.
                  θ3 es el ángulo del vector R3 que va de B hacia A
                  (por eso en la configuración abierta θ3 ≈ 180°).
  Ángulos en grados (entrada/salida), ω en rad/s, α en rad/s².

Uso:
  python analisis_cinematico.py              -> menú interactivo
  python analisis_cinematico.py --verificar  -> compara con las tablas del Norton
"""

import math
import sys

# ----------------------------------------------------------------------------
# utilidades
# ----------------------------------------------------------------------------
RAD = math.pi / 180.0


def norm_deg(ang):
    """Ángulo en grados llevado al rango [0, 360)."""
    return ang % 360.0


def polar(z):
    """Número complejo -> (magnitud, ángulo en grados [0,360))."""
    return abs(z), norm_deg(math.degrees(math.atan2(z.imag, z.real)))


def cis(theta):
    """e^{jθ} con θ en radianes."""
    return complex(math.cos(theta), math.sin(theta))


# ----------------------------------------------------------------------------
# 1) CUATRO BARRAS (MANIVELA-BALANCÍN)
# ----------------------------------------------------------------------------
def cuatro_barras(a, b, c, d, th2_deg, w2, al2, abierta=True):
    """Posición, velocidad y aceleración de un cuatro barras.

    abierta=True  -> configuración abierta   (signo - en las ecuaciones de θ3, θ4)
    abierta=False -> configuración cruzada   (signo +)
    Devuelve un diccionario con θ3, θ4 (grados), ω3, ω4, α3, α4 y vectores útiles.
    """
    th2 = th2_deg * RAD

    # --- Posición (ec. 4.10 de Norton) ---
    K1 = d / a
    K2 = d / c
    K3 = (a**2 - b**2 + c**2 + d**2) / (2 * a * c)
    K4 = d / b
    K5 = (c**2 - d**2 - a**2 - b**2) / (2 * a * b)

    A = math.cos(th2) - K1 - K2 * math.cos(th2) + K3
    B = -2 * math.sin(th2)
    C = K1 - (K2 + 1) * math.cos(th2) + K3
    D = math.cos(th2) - K1 + K4 * math.cos(th2) + K5
    E = -2 * math.sin(th2)
    F = K1 + (K4 - 1) * math.cos(th2) + K5

    disc4 = B**2 - 4 * A * C
    disc3 = E**2 - 4 * D * F
    if disc4 < -1e-12 or disc3 < -1e-12:
        raise ValueError("El mecanismo no se puede ensamblar en θ2 = %.2f° "
                         "(discriminante negativo: posición fuera de Grashof)." % th2_deg)
    disc4 = max(disc4, 0.0)
    disc3 = max(disc3, 0.0)

    s = -1.0 if abierta else 1.0
    th4 = 2 * math.atan((-B + s * math.sqrt(disc4)) / (2 * A))
    th3 = 2 * math.atan((-E + s * math.sqrt(disc3)) / (2 * D))

    # --- Velocidad (ec. 6.18) ---
    w3 = (a * w2 / b) * math.sin(th4 - th2) / math.sin(th3 - th4)
    w4 = (a * w2 / c) * math.sin(th2 - th3) / math.sin(th4 - th3)

    # --- Aceleración (ec. 7.12) ---
    Aa = c * math.sin(th4)
    Ba = b * math.sin(th3)
    Ca = (a * al2 * math.sin(th2) + a * w2**2 * math.cos(th2)
          + b * w3**2 * math.cos(th3) - c * w4**2 * math.cos(th4))
    Da = c * math.cos(th4)
    Ea = b * math.cos(th3)
    Fa = (a * al2 * math.cos(th2) - a * w2**2 * math.sin(th2)
          - b * w3**2 * math.sin(th3) + c * w4**2 * math.sin(th4))
    al3 = (Ca * Da - Aa * Fa) / (Aa * Ea - Ba * Da)
    al4 = (Ca * Ea - Ba * Fa) / (Aa * Ea - Ba * Da)

    # --- Vectores de puntos A y B ---
    RA = a * cis(th2)
    RB = RA + b * cis(th3)
    VA = a * w2 * 1j * cis(th2)
    VB = c * w4 * 1j * cis(th4)
    AA = a * (1j * al2 - w2**2) * cis(th2)
    AB = c * (1j * al4 - w4**2) * cis(th4)

    return dict(th2=th2, th3=th3, th4=th4, w2=w2, w3=w3, w4=w4,
                al2=al2, al3=al3, al4=al4, a=a, b=b, c=c, d=d,
                RA=RA, RB=RB, VA=VA, VB=VB, AA=AA, AB=AB,
                tipo="cuatro_barras", abierta=abierta)


def cg_cuatro_barras(r, Rg2, d2, Rg3, d3, Rg4, d4):
    """Velocidad y aceleración de los centros de gravedad (ángulos δ en grados,
    medidos respecto a la línea de cada eslabón, como en la figura P11-2)."""
    th2, th3, th4 = r["th2"], r["th3"], r["th4"]
    w2, w3, w4 = r["w2"], r["w3"], r["w4"]
    al2, al3, al4 = r["al2"], r["al3"], r["al4"]
    e2 = cis(th2 + d2 * RAD)
    e3 = cis(th3 + d3 * RAD)
    e4 = cis(th4 + d4 * RAD)
    VG2 = Rg2 * 1j * w2 * e2
    VG3 = r["VA"] + Rg3 * 1j * w3 * e3
    VG4 = Rg4 * 1j * w4 * e4
    AG2 = Rg2 * (1j * al2 - w2**2) * e2
    AG3 = r["AA"] + Rg3 * (1j * al3 - w3**2) * e3
    AG4 = Rg4 * (1j * al4 - w4**2) * e4
    return dict(VG2=VG2, VG3=VG3, VG4=VG4, AG2=AG2, AG3=AG3, AG4=AG4)


# ----------------------------------------------------------------------------
# 2) MANIVELA-CORREDERA
# ----------------------------------------------------------------------------
def manivela_corredera(a, b, c, th2_deg, w2, al2, abierta=True):
    """Posición, velocidad y aceleración de un manivela-corredera descentrado.

    abierta=True  -> θ3 = arcsen(-(a senθ2 - c)/b) + π   (corredera a la derecha)
    abierta=False -> θ3 = arcsen((a senθ2 - c)/b)        (cruzada)
    """
    th2 = th2_deg * RAD
    arg = (a * math.sin(th2) - c) / b
    if abs(arg) > 1 + 1e-12:
        raise ValueError("El mecanismo no se puede ensamblar en θ2 = %.2f° "
                         "(|a senθ2 - c| > b)." % th2_deg)
    arg = max(-1.0, min(1.0, arg))

    # --- Posición (ec. 4.17) ---
    if abierta:
        th3 = math.asin(-arg) + math.pi
    else:
        th3 = math.asin(arg)
    d = a * math.cos(th2) - b * math.cos(th3)

    # --- Velocidad (ec. 6.22) ---
    w3 = (a / b) * (math.cos(th2) / math.cos(th3)) * w2
    d_dot = -a * w2 * math.sin(th2) + b * w3 * math.sin(th3)

    # --- Aceleración (ec. 7.16) ---
    al3 = (a * al2 * math.cos(th2) - a * w2**2 * math.sin(th2)
           + b * w3**2 * math.sin(th3)) / (b * math.cos(th3))
    d_ddot = (-a * al2 * math.sin(th2) - a * w2**2 * math.cos(th2)
              + b * al3 * math.sin(th3) + b * w3**2 * math.cos(th3))

    RA = a * cis(th2)
    RB = complex(d, c)
    VA = a * w2 * 1j * cis(th2)
    AA = a * (1j * al2 - w2**2) * cis(th2)

    return dict(th2=th2, th3=th3, w2=w2, w3=w3, al2=al2, al3=al3,
                d=d, d_dot=d_dot, d_ddot=d_ddot, a=a, b=b, c=c,
                RA=RA, RB=RB, VA=VA, AA=AA,
                VB=complex(d_dot, 0), AB=complex(d_ddot, 0),
                tipo="manivela_corredera", abierta=abierta)


def cg_manivela_corredera(r, Rg2, d2, Rg3, d3):
    """Velocidad y aceleración de los CG. δ3 se mide desde la línea A→B
    (dirección θ3 + π), como en la figura P11-1."""
    th2, th3 = r["th2"], r["th3"]
    w2, w3, al2, al3 = r["w2"], r["w3"], r["al2"], r["al3"]
    e2 = cis(th2 + d2 * RAD)
    e3 = cis(th3 + math.pi + d3 * RAD)
    VG2 = Rg2 * 1j * w2 * e2
    VG3 = r["VA"] + Rg3 * 1j * w3 * e3
    AG2 = Rg2 * (1j * al2 - w2**2) * e2
    AG3 = r["AA"] + Rg3 * (1j * al3 - w3**2) * e3
    return dict(VG2=VG2, VG3=VG3, VG4=r["VB"], AG2=AG2, AG3=AG3, AG4=r["AB"])


# ----------------------------------------------------------------------------
# impresión de resultados
# ----------------------------------------------------------------------------
def fmt_vec(z):
    m, ang = polar(z)
    return "%10.4f  ∠ %8.3f°" % (m, ang)


def imprimir(r):
    conf = "ABIERTA" if r["abierta"] else "CRUZADA"
    print()
    print("=" * 62)
    if r["tipo"] == "cuatro_barras":
        print(" RESULTADOS – CUATRO BARRAS (MANIVELA-BALANCÍN) – %s" % conf)
        print("=" * 62)
        print(" a=%.4g  b=%.4g  c=%.4g  d=%.4g" % (r["a"], r["b"], r["c"], r["d"]))
        print("-" * 62)
        print(" POSICIÓN")
        print("   θ2 = %10.4f°" % norm_deg(math.degrees(r["th2"])))
        print("   θ3 = %10.4f°" % norm_deg(math.degrees(r["th3"])))
        print("   θ4 = %10.4f°" % norm_deg(math.degrees(r["th4"])))
        print(" VELOCIDAD ANGULAR [rad/s]")
        print("   ω2 = %10.4f" % r["w2"])
        print("   ω3 = %10.4f" % r["w3"])
        print("   ω4 = %10.4f" % r["w4"])
        print(" ACELERACIÓN ANGULAR [rad/s²]")
        print("   α2 = %10.4f" % r["al2"])
        print("   α3 = %10.4f" % r["al3"])
        print("   α4 = %10.4f" % r["al4"])
    else:
        print(" RESULTADOS – MANIVELA-CORREDERA – %s" % conf)
        print("=" * 62)
        print(" a=%.4g  b=%.4g  descentrado c=%.4g" % (r["a"], r["b"], r["c"]))
        print("-" * 62)
        print(" POSICIÓN")
        print("   θ2 = %10.4f°" % norm_deg(math.degrees(r["th2"])))
        print("   θ3 = %10.4f°" % norm_deg(math.degrees(r["th3"])))
        print("   d  = %10.4f   (posición de la corredera)" % r["d"])
        print(" VELOCIDAD")
        print("   ω2 = %10.4f rad/s" % r["w2"])
        print("   ω3 = %10.4f rad/s" % r["w3"])
        print("   ḋ  = %10.4f       (velocidad de la corredera)" % r["d_dot"])
        print(" ACELERACIÓN")
        print("   α2 = %10.4f rad/s²" % r["al2"])
        print("   α3 = %10.4f rad/s²" % r["al3"])
        print("   d̈  = %10.4f       (aceleración de la corredera)" % r["d_ddot"])
    print("-" * 62)
    print(" PUNTOS (magnitud ∠ ángulo)")
    print("   R_A = " + fmt_vec(r["RA"]))
    print("   R_B = " + fmt_vec(r["RB"]))
    print("   V_A = " + fmt_vec(r["VA"]))
    print("   V_B = " + fmt_vec(r["VB"]))
    print("   A_A = " + fmt_vec(r["AA"]))
    print("   A_B = " + fmt_vec(r["AB"]))
    print("=" * 62)


def dibujar(r):
    """Dibuja el mecanismo en la posición calculada (requiere matplotlib)."""
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib no está instalado; no se puede dibujar.")
        return
    O2 = 0j
    A, B = r["RA"], r["RB"]
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot([O2.real, A.real], [O2.imag, A.imag], "o-", lw=3, label="Eslabón 2")
    ax.plot([A.real, B.real], [A.imag, B.imag], "o-", lw=3, label="Eslabón 3")
    if r["tipo"] == "cuatro_barras":
        O4 = complex(r["d"], 0)
        ax.plot([O4.real, B.real], [O4.imag, B.imag], "o-", lw=3, label="Eslabón 4")
        ax.plot([O2.real, O4.real], [0, 0], "k--", lw=1, label="Eslabón 1 (bancada)")
    else:
        w, h = 0.08 * r["b"], 0.05 * r["b"]
        ax.add_patch(plt.Rectangle((B.real - w / 2, B.imag - h / 2), w, h,
                                   fill=False, lw=2, label="Corredera (4)"))
        xs = [min(0, B.real) - r["a"], max(B.real, 0) + r["a"]]
        ax.plot(xs, [r["c"] - h / 2] * 2, "k--", lw=1, label="Guía")
    ax.set_aspect("equal")
    ax.grid(True, alpha=0.3)
    ax.legend()
    ax.set_title("Mecanismo en θ2 = %.2f°" % math.degrees(r["th2"]))
    plt.show()


# ----------------------------------------------------------------------------
# menú interactivo
# ----------------------------------------------------------------------------
def pedir(msg, defecto=None):
    while True:
        txt = input("  %s%s: " % (msg, " [%s]" % defecto if defecto is not None else ""))
        if txt.strip() == "" and defecto is not None:
            return float(defecto)
        try:
            return float(txt.replace(",", "."))
        except ValueError:
            print("    Valor no válido, intente de nuevo.")


def pedir_conf():
    t = input("  Configuración (A = abierta, C = cruzada) [A]: ").strip().upper()
    return t != "C"


def menu():
    while True:
        print()
        print("╔══════════════════════════════════════════════════════╗")
        print("║        ANÁLISIS CINEMÁTICO DE MECANISMOS             ║")
        print("╠══════════════════════════════════════════════════════╣")
        print("║ 1. Cuatro barras  (manivela-balancín)                ║")
        print("║ 2. Manivela-corredera                                ║")
        print("║ 3. Verificar contra las tablas del Norton            ║")
        print("║ 0. Salir                                             ║")
        print("╚══════════════════════════════════════════════════════╝")
        op = input("Opción: ").strip()
        try:
            if op == "1":
                print("\n Datos de los eslabones:")
                a = pedir("a  (eslabón 2, manivela)")
                b = pedir("b  (eslabón 3, acoplador)")
                c = pedir("c  (eslabón 4, balancín)")
                d = pedir("d  (eslabón 1, bancada)")
                print(" Datos del eslabón de entrada (2):")
                th2 = pedir("θ2 [°]")
                w2 = pedir("ω2 [rad/s]")
                al2 = pedir("α2 [rad/s²]", 0)
                ab = pedir_conf()
                r = cuatro_barras(a, b, c, d, th2, w2, al2, ab)
                imprimir(r)
            elif op == "2":
                print("\n Datos de los eslabones:")
                a = pedir("a  (eslabón 2, manivela)")
                b = pedir("b  (eslabón 3, biela)")
                c = pedir("c  (descentrado)", 0)
                print(" Datos del eslabón de entrada (2):")
                th2 = pedir("θ2 [°]")
                w2 = pedir("ω2 [rad/s]")
                al2 = pedir("α2 [rad/s²]", 0)
                ab = pedir_conf()
                r = manivela_corredera(a, b, c, th2, w2, al2, ab)
                imprimir(r)
            elif op == "3":
                verificar()
                continue
            elif op == "0":
                return
            else:
                continue
            if input(" ¿Dibujar el mecanismo? (s/N): ").strip().lower() == "s":
                dibujar(r)
        except ValueError as e:
            print("\n  ERROR:", e)


# ----------------------------------------------------------------------------
# verificación contra Norton 4a Ed. (Tablas P11-1, P11-2 y P11-3, fila b)
# ----------------------------------------------------------------------------
def _comparar(nombre, calc, libro, tol):
    err = abs(calc - libro)
    ok = err <= tol
    print("   %-14s calc = %11.3f   libro = %11.3f   %s" %
          (nombre, calc, libro, "OK" if ok else "<-- DIFERENTE"))
    return ok


def _comparar_vec(nombre, z, mag, ang, tol_m, tol_a=0.1):
    m, a = polar(z)
    da = abs((a - norm_deg(ang) + 180) % 360 - 180)
    ok = abs(m - mag) <= tol_m and da <= tol_a
    print("   %-14s calc = %9.2f ∠%7.2f°   libro = %9.2f ∠%7.2f°   %s" %
          (nombre, m, a, mag, norm_deg(ang), "OK" if ok else "<-- DIFERENTE"))
    return ok


def verificar():
    todo_ok = True

    print("\n" + "=" * 78)
    print(" VERIFICACIÓN 1: MANIVELA-CORREDERA – Norton Tabla P11-1 / P11-2, fila b")
    print("   a=3, b=10, descentrado c=1, θ2=30°, ω2=15 rad/s, α2=-5 rad/s²")
    print("=" * 78)
    r = manivela_corredera(3, 10, 1, 30, 15, -5, abierta=True)
    g = cg_manivela_corredera(r, Rg2=1, d2=20, Rg3=4, d3=-30)
    todo_ok &= _comparar("θ3 [°]", norm_deg(math.degrees(r["th3"])), 177.13, 0.01)
    todo_ok &= _comparar("ω3 [rad/s]", r["w3"], -3.90, 0.01)
    todo_ok &= _comparar("α3 [rad/s²]", r["al3"], 34.33, 0.01)
    todo_ok &= _comparar_vec("V_G2", g["VG2"], 15.0, 140, 0.01)
    todo_ok &= _comparar_vec("V_G3", g["VG3"], 40.35, 140.14, 0.01)
    todo_ok &= _comparar_vec("V_G4 (ḋ)", g["VG4"], 24.45, 180, 0.01)
    todo_ok &= _comparar_vec("A_G2", g["AG2"], 225.06, 231.27, 0.01)
    todo_ok &= _comparar_vec("A_G3", g["AG3"], 589.43, 200.05, 0.01)
    todo_ok &= _comparar_vec("A_G4 (d̈)", g["AG4"], 711.97, 180, 0.01)

    print("\n" + "=" * 78)
    print(" VERIFICACIÓN 2: CUATRO BARRAS – Norton Tabla P11-3, fila b")
    print("   a=3, b=10, c=12, d=6, θ2=30°, ω2=10 rad/s, α2=-5 rad/s²")
    print("=" * 78)
    r = cuatro_barras(3, 10, 12, 6, 30, 10, -5, abierta=True)
    g = cg_cuatro_barras(r, Rg2=1, d2=20, Rg3=4, d3=-30, Rg4=6, d4=40)
    todo_ok &= _comparar("θ3 [°]", norm_deg(math.degrees(r["th3"])), 90.15, 0.01)
    todo_ok &= _comparar("θ4 [°]", norm_deg(math.degrees(r["th4"])), 106.60, 0.01)
    todo_ok &= _comparar("ω3 [rad/s]", r["w3"], -10.31, 0.01)
    todo_ok &= _comparar("ω4 [rad/s]", r["w4"], -7.66, 0.01)
    todo_ok &= _comparar("α3 [rad/s²]", r["al3"], 140.96, 0.01)
    todo_ok &= _comparar("α4 [rad/s²]", r["al4"], 161.75, 0.01)
    todo_ok &= _comparar_vec("A_G2", g["AG2"], 100.12, 232.86, 0.01)
    todo_ok &= _comparar_vec("A_G3", g["AG3"], 985.27, 194.75, 0.01)
    todo_ok &= _comparar_vec("A_G4", g["AG4"], 1032.32, 256.52, 0.01)

    print("\n" + "=" * 78)
    print(" VERIFICACIÓN 3: Ejemplo de clase (diapositivas) a=2, b=7, c=9, d=6, θ2=30°")
    print("=" * 78)
    ra = cuatro_barras(2, 7, 9, 6, 30, 1, 0, abierta=True)
    rc = cuatro_barras(2, 7, 9, 6, 30, 1, 0, abierta=False)
    todo_ok &= _comparar("θ3 abierta", math.degrees(ra["th3"]), 88.83, 0.01)
    todo_ok &= _comparar("θ4 abierta", math.degrees(ra["th4"]), 117.30, 0.05)   # en la diapositiva está redondeado
    todo_ok &= _comparar("θ3 cruzada", math.degrees(rc["th3"]), -115.21, 0.01)
    todo_ok &= _comparar("θ4 cruzada", math.degrees(rc["th4"]), -143.65, 0.05)

    print("\n RESULTADO GLOBAL:", "TODO COINCIDE CON EL LIBRO ✔" if todo_ok
          else "HAY DIFERENCIAS ✘")
    return todo_ok


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    if "--verificar" in sys.argv:
        sys.exit(0 if verificar() else 1)
    menu()
