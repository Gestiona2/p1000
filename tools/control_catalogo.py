#!/usr/bin/env python3
"""Puente entre el catálogo de P1000 y la planilla del dueño.

    python3 tools/control_catalogo.py generar
    python3 tools/control_catalogo.py revisar Control-P1000.xlsx
    python3 tools/control_catalogo.py aplicar Control-P1000.xlsx

El dueño edita la planilla y la devuelve. `revisar` la compara con el catálogo
y explica, fila por fila, qué quedó mal y cómo se escribe bien. `aplicar` solo
escribe si no hay ningún error.

El descuento NO se lee de la planilla: se calcula de los dos precios con la
misma cuenta que usa la web. La columna de la planilla es solo una fórmula
orientativa.
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

RAIZ = Path(__file__).resolve().parent.parent
RUTA_PRODUCTOS = RAIZ / "src" / "datos" / "productos.json"
RUTA_CATEGORIAS = RAIZ / "src" / "datos" / "categorias.json"
RUTA_XLSX = RAIZ / "Control-P1000.xlsx"

FUENTE = Font(name="Arial", size=11)
FUENTE_TITULO = Font(name="Arial", size=11, bold=True, color="FFFFFF")
FONDO_TITULO = PatternFill("solid", fgColor="032F53")
AMARILLO = PatternFill("solid", fgColor="FFF2CC")
GRIS = PatternFill("solid", fgColor="EFEFEF")
CALCULO = PatternFill("solid", fgColor="D9EAD3")
EXITO = PatternFill("solid", fgColor="01ADB1")

COLUMNAS_PRODUCTO = [
    ("slug", "Código (no tocar)", GRIS, 26, False),
    ("titulo", "Nombre", AMARILLO, 32, True),
    ("categoria", "Categoría", AMARILLO, 18, True),
    ("marca", "Marca", AMARILLO, 16, True),
    ("color", "Color", AMARILLO, 26, True),
    ("material", "Material", AMARILLO, 22, True),
    ("tallas", "Tallas (separadas por coma; vacío = confirmar)", AMARILLO, 32, True),
    ("precio", "Precio ($)", AMARILLO, 13, True),
    ("precio_antes", "Precio anterior ($, vacío si no hay oferta)", AMARILLO, 20, True),
    ("descuento", "% descuento (se calcula solo)", CALCULO, 14, False),
    ("stock", "¿Hay existencias? (SI/NO)", AMARILLO, 16, True),
    ("destacado", "¿Destacado en portada? (SI/NO)", AMARILLO, 16, True),
    ("promo_flash", "¿Promoción relámpago? (SI/NO)", AMARILLO, 18, True),
    ("promo_flash_vence", "Vence (AAAA-MM-DD HH:MM, hora Bogotá; vacío = no vence sola)", AMARILLO, 30, True),
    ("promo_flash_donde", "¿Dónde aplica la promoción? (texto libre)", AMARILLO, 34, True),
    ("descripcion", "Descripción", AMARILLO, 60, True),
]

COLUMNAS_CATEGORIA = [
    ("slug", "Código (no tocar)", GRIS, 18, False),
    ("nombre", "Nombre", AMARILLO, 26, True),
    ("corto", "Nombre corto", AMARILLO, 18, True),
    ("titulo", "Título de la página", AMARILLO, 30, True),
    ("descripcion", "Descripción", AMARILLO, 55, True),
    ("orden", "Orden", AMARILLO, 8, True),
    ("activo", "¿Activa? (SI/NO)", AMARILLO, 14, True),
]

SI = {"SI", "SÍ", "TRUE", "VERDADERO", "1"}
NO = {"NO", "FALSE", "FALSO", "0"}
VENCE_PLANILLA = re.compile(r"^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$")
VENCE_ISO = re.compile(r"^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):00-05:00$")


def cargar_json(ruta):
    return json.loads(ruta.read_text(encoding="utf-8"))


def guardar_json(ruta, datos):
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def a_si_no(valor):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return ""
    if isinstance(valor, bool):
        return "SI" if valor else "NO"
    return str(valor).strip().upper()


def de_si_no(valor, campo, quien, errores, defecto=False):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return defecto, True
    texto = str(valor).strip().upper()
    if texto in SI:
        return True, True
    if texto in NO:
        return False, True
    errores.append(f"{quien}: '{campo}' debe ser SI o NO; tiene '{valor}'")
    return defecto, False


def vence_a_planilla(valor):
    if not valor:
        return ""
    coincide = VENCE_ISO.match(valor)
    if not coincide:
        return valor
    fecha, hora, minuto = coincide.groups()
    return f"{fecha} {hora}:{minuto}"


def vence_de_planilla(valor, quien, errores):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None
    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%dT%H:%M:00-05:00")
    texto = str(valor).strip()
    coincide = VENCE_PLANILLA.match(texto)
    if not coincide:
        errores.append(
            f"{quien}: 'vence' debe escribirse AAAA-MM-DD HH:MM "
            f"(ejemplo 2026-12-24 20:00, hora de Bogotá) o quedar vacío; tiene '{valor}'"
        )
        return None
    try:
        datetime.strptime(texto, "%Y-%m-%d %H:%M")
    except ValueError:
        errores.append(f"{quien}: la fecha de vencimiento '{texto}' no existe en el calendario")
        return None
    anio, mes, dia, hora, minuto = coincide.groups()
    return f"{anio}-{mes}-{dia}T{hora}:{minuto}:00-05:00"


def descuento_esperado(precio, precio_antes):
    if not precio or not precio_antes or precio_antes <= precio:
        return None
    return round((precio_antes - precio) / precio_antes * 100)


def leer_tallas(valor, quien, errores):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return []
    texto = str(valor).strip()
    partes = re.split(r"[,;]+", texto)
    tallas = []
    for parte in partes:
        parte = parte.strip()
        if not parte:
            continue
        rango = re.fullmatch(r"(\d{1,2})\s*-\s*(\d{1,2})", parte)
        if rango:
            inicio, fin = int(rango.group(1)), int(rango.group(2))
            if inicio > fin or fin - inicio > 30:
                errores.append(f"{quien}: el rango de tallas '{parte}' no es válido")
                continue
            for talla in range(inicio, fin + 1):
                tallas.append(str(talla))
            continue
        if not re.fullmatch(r"[0-9A-Za-z.+/-]{1,8}", parte):
            errores.append(f"{quien}: la talla '{parte}' no parece una talla real")
            continue
        tallas.append(parte)
    vistos = set()
    salida = []
    for talla in tallas:
        if talla not in vistos:
            vistos.add(talla)
            salida.append(talla)
    return salida


def validar_productos(productos, slugs_categoria):
    errores = []
    vistos = set()
    for p in productos:
        slug = p.get("slug") or "(sin código)"
        if slug in vistos:
            errores.append(f"{slug}: el producto está repetido")
        vistos.add(slug)
        if not p.get("titulo"):
            errores.append(f"{slug}: falta el nombre")
        if p.get("categoria") not in slugs_categoria:
            errores.append(f"{slug}: la categoría '{p.get('categoria')}' no existe en categorias.json")
        precio = p.get("precio")
        antes = p.get("precio_antes")
        if precio is not None and (not isinstance(precio, int) or precio <= 0):
            errores.append(f"{slug}: el precio debe ser un entero mayor que cero")
        if antes is not None:
            if not isinstance(antes, int) or antes <= 0:
                errores.append(f"{slug}: el precio anterior debe ser un entero mayor que cero")
            elif precio is None:
                errores.append(f"{slug}: hay precio anterior pero falta el precio actual")
            elif antes <= precio:
                errores.append(f"{slug}: el precio anterior debe ser mayor que el precio actual")
        if p.get("promo_flash") and precio is None:
            errores.append(f"{slug}: no puede tener promoción relámpago sin precio")
        if not p.get("promo_flash") and (p.get("promo_flash_vence") or p.get("promo_flash_donde")):
            errores.append(f"{slug}: hay datos de promoción pero '¿Promoción relámpago?' está en NO")
        if p.get("tallas") is not None and not isinstance(p.get("tallas"), list):
            errores.append(f"{slug}: las tallas deben ser una lista")
    return errores


def validar_categorias(categorias):
    errores = []
    vistos = set()
    for c in categorias:
        slug = c.get("slug") or "(sin código)"
        if slug in vistos:
            errores.append(f"{slug}: la categoría está repetida")
        vistos.add(slug)
        for campo in ("nombre", "corto", "titulo"):
            if not c.get(campo):
                errores.append(f"{slug}: falta '{campo}'")
        if not isinstance(c.get("orden"), int):
            errores.append(f"{slug}: el orden debe ser un número entero")
        if not isinstance(c.get("activo"), bool):
            errores.append(f"{slug}: '¿Activa?' debe ser SI o NO")
    return errores


def preparar_hoja(hoja, columnas, filas, color, titulo):
    hoja.title = titulo
    hoja.sheet_properties.tabColor = color
    hoja.freeze_panes = "A2"
    hoja.auto_filter.ref = f"A1:{get_column_letter(len(columnas))}{max(len(filas) + 1, 2)}"
    for col, (_campo, encabezado, fondo, ancho, _editable) in enumerate(columnas, start=1):
        celda = hoja.cell(row=1, column=col, value=encabezado)
        celda.font = FUENTE_TITULO
        celda.fill = FONDO_TITULO
        celda.alignment = Alignment(wrap_text=True, vertical="center")
        hoja.column_dimensions[get_column_letter(col)].width = ancho
    hoja.row_dimensions[1].height = 48


def generar():
    productos = cargar_json(RUTA_PRODUCTOS)
    categorias = cargar_json(RUTA_CATEGORIAS)

    libro = Workbook()
    hoja = libro.active
    preparar_hoja(hoja, COLUMNAS_PRODUCTO, productos, "032F53", "Productos")

    for fila, p in enumerate(productos, start=2):
        valores = {
            "slug": p.get("slug"),
            "titulo": p.get("titulo"),
            "categoria": p.get("categoria"),
            "marca": p.get("marca"),
            "color": p.get("color"),
            "material": p.get("material"),
            "tallas": ", ".join(p.get("tallas") or []),
            "precio": p.get("precio"),
            "precio_antes": p.get("precio_antes"),
            "descuento": (
                f'=IF(I{fila}="","",IF(OR(H{fila}="",H{fila}<=0),"",'
                f'ROUND((I{fila}-H{fila})/I{fila}*100)))'
            ),
            "stock": a_si_no(p.get("stock")),
            "destacado": a_si_no(p.get("destacado")),
            "promo_flash": a_si_no(p.get("promo_flash")),
            "promo_flash_vence": vence_a_planilla(p.get("promo_flash_vence")),
            "promo_flash_donde": p.get("promo_flash_donde"),
            "descripcion": p.get("descripcion"),
        }
        for col, (campo, _e, fondo, _a, _ed) in enumerate(COLUMNAS_PRODUCTO, start=1):
            celda = hoja.cell(row=fila, column=col, value=valores[campo])
            celda.font = FUENTE
            celda.fill = fondo
            celda.alignment = Alignment(vertical="top", wrap_text=campo in ("descripcion", "tallas"))

    hoja_cat = libro.create_sheet("Categorías")
    preparar_hoja(hoja_cat, COLUMNAS_CATEGORIA, categorias, "01ADB1", "Categorías")
    for fila, c in enumerate(categorias, start=2):
        valores = {campo: c.get(campo) for campo, *_ in COLUMNAS_CATEGORIA}
        valores["activo"] = a_si_no(c.get("activo"))
        for col, (campo, _e, fondo, _a, _ed) in enumerate(COLUMNAS_CATEGORIA, start=1):
            celda = hoja_cat.cell(row=fila, column=col, value=valores[campo])
            celda.font = FUENTE
            celda.fill = fondo
            celda.alignment = Alignment(vertical="top", wrap_text=campo == "descripcion")

    listas = libro.create_sheet("Listas")
    listas.sheet_state = "hidden"
    for i, c in enumerate(categorias, start=1):
        listas.cell(row=i, column=1, value=c["slug"])
    listas.cell(row=1, column=2, value="SI")
    listas.cell(row=2, column=2, value="NO")

    ultima = max(len(productos) + 1, 2)

    def desplegable(hoja_destino, col_letra, origen, mensaje):
        dv = DataValidation(type="list", formula1=origen, allow_blank=True)
        dv.error = mensaje
        dv.errorTitle = "Revisar"
        dv.showErrorMessage = True
        hoja_destino.add_data_validation(dv)
        dv.add(f"{col_letra}2:{col_letra}{ultima}")

    desplegable(hoja, "C", f"Listas!$A$1:$A${len(categorias)}", "Elige una categoría de la lista.")
    for col in ("K", "L", "M"):
        desplegable(hoja, col, "Listas!$B$1:$B$2", "Escribe SI o NO.")
    ultima_cat = max(len(categorias) + 1, 2)
    dv_cat = DataValidation(type="list", formula1="Listas!$B$1:$B$2", allow_blank=False)
    dv_cat.error = "Escribe SI o NO."
    dv_cat.showErrorMessage = True
    hoja_cat.add_data_validation(dv_cat)
    dv_cat.add(f"G2:G{ultima_cat}")

    entero = DataValidation(type="whole", operator="greaterThan", formula1=0, allow_blank=True)
    entero.error = "Escribe un número entero mayor que cero, sin puntos ni $ (por ejemplo 120000)."
    entero.showErrorMessage = True
    hoja.add_data_validation(entero)
    entero.add(f"H2:I{ultima}")
    dv_orden = DataValidation(type="whole", operator="greaterThanOrEqual", formula1=0, allow_blank=False)
    dv_orden.error = "El orden debe ser un número entero (1, 2, 3...)."
    dv_orden.showErrorMessage = True
    hoja_cat.add_data_validation(dv_orden)
    dv_orden.add(f"F2:F{ultima_cat}")

    instrucciones = libro.create_sheet("Instrucciones")
    instrucciones.sheet_properties.tabColor = "FBB73E"
    instrucciones.column_dimensions["A"].width = 112
    lineas = [
        "CÓMO USAR ESTA PLANILLA",
        "",
        "1. Edita solo las celdas AMARILLAS. Las grises (código y % descuento) no se tocan.",
        "2. El precio se escribe como número entero, sin puntos ni $: 120000.",
        "3. Si no hay oferta, deja 'Precio anterior' vacío. Si hay oferta, escríbelo y la web",
        "   calcula el porcentaje y el ahorro. No escribas el % a mano.",
        "4. En las columnas SI/NO elige de la lista. No escribas 'Sí, claro' ni 'x'.",
        "5. Las tallas van separadas por coma (36, 37, 38) o como rango (36-40).",
        "   Si no las sabes todavía, deja la celda vacía: la web pedirá la talla al cliente",
        "   y tú la confirmas por WhatsApp.",
        "6. No agregues ni borres filas. Para un producto nuevo o retirado, avísame y lo hago yo.",
        "7. No cambies los códigos de la columna A: son la llave del producto.",
        "8. La promoción relámpago solo sale si '¿Promoción relámpago?' está en SI, hay precio",
        "   y no está vencida. 'Vence' es opcional: si la dejas vacía, dura hasta que la apagues.",
        "9. '¿Dónde aplica la promoción?' es texto libre: 'Solo en la página web',",
        "   'En todas las sedes', 'Solo en la sede del centro', etc.",
        "10. En la hoja 'Categorías' puedes activar o desactivar un catálogo completo.",
        "    '¿Activa?' en SI lo muestra normal; en NO lo deja como 'Próximamente'.",
        "11. Guarda el archivo y envíamelo. Yo reviso fila por fila: si algo está mal, te digo",
        "    qué producto, qué pasa y cómo se escribe bien. Nada se publica hasta corregirlo.",
        "12. Las fotos no se editan aquí: van en la carpeta del sitio y las administro yo.",
    ]
    for i, linea in enumerate(lineas, start=1):
        celda = instrucciones.cell(row=i, column=1, value=linea)
        celda.font = Font(name="Arial", size=12, bold=(i == 1))
        celda.alignment = Alignment(wrap_text=True, vertical="top")

    libro.save(RUTA_XLSX)
    print(f"Planilla generada: {RUTA_XLSX} ({len(productos)} productos, {len(categorias)} categorías)")


def leer_filas(hoja, columnas):
    encabezados = [c.value for c in hoja[1]]
    indices = {}
    for campo, *_ in columnas:
        try:
            indices[campo] = next(i for i, h in enumerate(encabezados) if h and str(h).startswith(_titulo_de(columnas, campo)))
        except StopIteration:
            raise SystemExit(f"Falta la columna '{campo}' en la hoja '{hoja.title}'.")
    filas = []
    for fila in hoja.iter_rows(min_row=2, values_only=True):
        if not fila or not fila[0]:
            continue
        filas.append({campo: fila[indices[campo]] for campo, *_ in columnas})
    return filas


def _titulo_de(columnas, campo):
    for nombre, titulo, *_ in columnas:
        if nombre == campo:
            return titulo
    return campo


def construir_productos(filas, base, slugs_categoria):
    errores = []
    por_slug = {p["slug"]: p for p in base}
    vistos = set()
    productos = []
    for f in filas:
        slug = str(f["slug"]).strip()
        if slug in vistos:
            errores.append(f"{slug}: la fila está repetida")
            continue
        vistos.add(slug)
        if slug not in por_slug:
            errores.append(f"{slug}: no existe en el catálogo. No agregues filas.")
            continue
        p = dict(por_slug[slug])
        for campo in ("titulo", "marca", "color", "material", "descripcion", "promo_flash_donde"):
            valor = f[campo]
            p[campo] = None if valor is None or (isinstance(valor, str) and not valor.strip()) else str(valor).strip()
        categoria = f["categoria"]
        p["categoria"] = None if categoria is None or not str(categoria).strip() else str(categoria).strip()
        p["tallas"] = leer_tallas(f["tallas"], slug, errores)

        for campo in ("precio", "precio_antes"):
            valor = f[campo]
            if valor is None or (isinstance(valor, str) and not valor.strip()):
                p[campo] = None
            elif isinstance(valor, bool) or not isinstance(valor, (int, float)) or int(valor) != valor:
                errores.append(f"{slug}: '{campo}' debe ser un número entero; tiene '{valor}'")
            elif valor <= 0:
                errores.append(f"{slug}: '{campo}' debe ser mayor que cero; tiene '{valor}'")
            else:
                p[campo] = int(valor)

        p["stock"], _ = de_si_no(f["stock"], "stock", slug, errores, True)
        p["destacado"], _ = de_si_no(f["destacado"], "destacado", slug, errores, False)
        p["promo_flash"], _ = de_si_no(f["promo_flash"], "promo_flash", slug, errores, False)
        p["promo_flash_vence"] = vence_de_planilla(f["promo_flash_vence"], slug, errores)
        p["descuento"] = descuento_esperado(p.get("precio"), p.get("precio_antes"))
        productos.append(p)

    for slug in por_slug:
        if slug not in vistos:
            errores.append(f"{slug}: falta su fila en la planilla. No borres filas.")
    orden = [p["slug"] for p in base]
    productos.sort(key=lambda p: orden.index(p["slug"]))
    return productos, errores


def construir_categorias(filas, base):
    errores = []
    por_slug = {c["slug"]: c for c in base}
    vistos = set()
    categorias = []
    for f in filas:
        slug = str(f["slug"]).strip()
        if slug in vistos:
            errores.append(f"{slug}: la categoría está repetida")
            continue
        vistos.add(slug)
        if slug not in por_slug:
            errores.append(f"{slug}: la categoría no existe. No agregues filas.")
            continue
        c = dict(por_slug[slug])
        for campo in ("nombre", "corto", "titulo", "descripcion"):
            valor = f[campo]
            c[campo] = None if valor is None or (isinstance(valor, str) and not valor.strip()) else str(valor).strip()
        orden = f["orden"]
        if isinstance(orden, bool) or not isinstance(orden, (int, float)) or int(orden) != orden or orden < 0:
            errores.append(f"{slug}: el orden debe ser un entero mayor o igual a cero; tiene '{orden}'")
        else:
            c["orden"] = int(orden)
        c["activo"], _ = de_si_no(f["activo"], "activo", slug, errores, False)
        categorias.append(c)
    for slug in por_slug:
        if slug not in vistos:
            errores.append(f"{slug}: falta su fila en la hoja Categorías.")
    orden = [c["slug"] for c in base]
    categorias.sort(key=lambda c: orden.index(c["slug"]))
    return categorias, errores


def revisar(ruta_xlsx):
    libro = load_workbook(ruta_xlsx, data_only=False)
    base_p = cargar_json(RUTA_PRODUCTOS)
    base_c = cargar_json(RUTA_CATEGORIAS)
    slugs_categoria = {c["slug"] for c in base_c}
    productos, errores_p = construir_productos(leer_filas(libro["Productos"], COLUMNAS_PRODUCTO), base_p, slugs_categoria)
    categorias, errores_c = construir_categorias(leer_filas(libro["Categorías"], COLUMNAS_CATEGORIA), base_c)
    errores = errores_p + errores_c + validar_productos(productos, slugs_categoria) + validar_categorias(categorias)
    if errores:
        print(f"{len(errores)} problema(s) en {ruta_xlsx}:\n")
        for mensaje in errores[:80]:
            print(f"  - {mensaje}")
        if len(errores) > 80:
            print(f"  ... y {len(errores) - 80} más")
        print("\nNada se aplicó al catálogo.")
        return 1
    print(f"La planilla está bien: {len(productos)} productos y {len(categorias)} categorías, 0 problemas.")
    return 0


def aplicar(ruta_xlsx):
    libro = load_workbook(ruta_xlsx, data_only=False)
    base_p = cargar_json(RUTA_PRODUCTOS)
    base_c = cargar_json(RUTA_CATEGORIAS)
    slugs_categoria = {c["slug"] for c in base_c}
    productos, errores_p = construir_productos(leer_filas(libro["Productos"], COLUMNAS_PRODUCTO), base_p, slugs_categoria)
    categorias, errores_c = construir_categorias(leer_filas(libro["Categorías"], COLUMNAS_CATEGORIA), base_c)
    errores = errores_p + errores_c + validar_productos(productos, slugs_categoria) + validar_categorias(categorias)
    if errores:
        print(f"{len(errores)} problema(s), no se aplicó nada:\n")
        for mensaje in errores[:80]:
            print(f"  - {mensaje}")
        return 1
    guardar_json(RUTA_PRODUCTOS, productos)
    guardar_json(RUTA_CATEGORIAS, categorias)
    print(f"Aplicado: {len(productos)} productos y {len(categorias)} categorías.")
    generar()
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("generar", "revisar", "aplicar"):
        sys.exit(__doc__)
    accion = sys.argv[1]
    if accion == "generar":
        generar()
        sys.exit(0)
    if len(sys.argv) < 3:
        sys.exit("Falta el archivo: revisar|aplicar Control-P1000.xlsx")
    ruta = Path(sys.argv[2])
    if not ruta.exists():
        sys.exit(f"No existe el archivo: {ruta}")
    sys.exit(revisar(ruta) if accion == "revisar" else aplicar(ruta))
