from pathlib import Path


OUTPUT = Path(r"C:\Prosjekt\nyfirmasjekk\output\pdf\faktura-2026-003-varneth-management-ness.pdf")
PRICE_TEXT = "1 990,00 kr"
INVOICE_DATE = "16.09.2026"
DUE_DATE = "30.09.2026"


def pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").encode("cp1252", errors="replace").decode("latin1")


commands: list[str] = []


def text(x: float, y: float, value: str, size: float = 10, bold: bool = False, color=(0.14, 0.2, 0.22)) -> None:
    font = "/F2" if bold else "/F1"
    commands.append(f"{color[0]} {color[1]} {color[2]} rg BT {font} {size} Tf {x} {y} Td ({pdf_text(value)}) Tj ET")


def line(x1: float, y1: float, x2: float, y2: float, color=(0.78, 0.82, 0.82), width: float = 0.6) -> None:
    commands.append(f"{color[0]} {color[1]} {color[2]} RG {width} w {x1} {y1} m {x2} {y2} l S")


def box(x: float, y: float, width: float, height: float, fill, stroke=None) -> None:
    commands.append(f"{fill[0]} {fill[1]} {fill[2]} rg {x} {y} {width} {height} re f")
    if stroke:
        commands.append(f"{stroke[0]} {stroke[1]} {stroke[2]} RG 0.6 w {x} {y} {width} {height} re S")


paper, blue, green = (0.99, 0.98, 0.95), (0.09, 0.23, 0.27), (0.08, 0.36, 0.26)
box(0, 0, 595, 842, paper)
text(56, 780, "FAKTURA", 25, True, blue)
text(56, 754, "LTJ-Production", 11, True)
text(56, 738, "v/ Lars Tangen Johannessen", 9)
text(56, 724, "kontakt@ltj-production.no", 9)

box(56, 658, 483, 48, (0.93, 0.96, 0.95), (0.72, 0.8, 0.77))
text(68, 688, "Fakturanr.", 8, True); text(68, 672, "2026-003", 10)
text(190, 688, "Fakturadato", 8, True); text(190, 672, INVOICE_DATE, 10)
text(312, 688, "Forfallsdato", 8, True); text(312, 672, DUE_DATE, 10)
text(450, 680, "TIL BETALING", 10, True, green)

text(56, 628, "Fra", 9, True, blue); text(310, 628, "Til", 9, True, blue)
text(56, 610, "LTJ-Production", 9, True); text(56, 596, "v/ Lars Tangen Johannessen", 9)
text(56, 582, "E-post: kontakt@ltj-production.no", 9); text(56, 568, "Org.nr.: Ikke oppgitt i grunnlaget", 9); text(56, 554, "Kontonr.: 6098.08.05657", 9)
text(310, 610, "Varneth Management Ness", 9, True); text(310, 596, "v/ Henning Stockmann Ness", 9)
text(310, 582, "Org.nr.: 938 358 311", 9); text(310, 568, "Haukedalsvegen 784", 9); text(310, 554, "6818 Haukedalen", 9); text(310, 540, "E-post: bhstockmann@gmail.com", 9)
line(56, 520, 539, 520)

box(56, 478, 483, 28, blue); text(68, 488, "FAKTURALINJER", 8, True, (1, 1, 1))
text(68, 461, "Beskrivelse", 9, True); text(418, 461, "Antall", 9, True); text(466, 461, "Pris", 9, True); text(516, 461, "Beløp", 9, True)
line(56, 452, 539, 452)
text(68, 432, "Nettside for Varneth Management Ness - design, struktur,", 9)
text(68, 418, "norsk/engelsk innhold, publisering på varneth.eu og teknisk oppsett.", 9)
text(423, 425, "1", 9); text(447, 425, PRICE_TEXT, 9); text(507, 425, PRICE_TEXT, 9)
line(56, 398, 539, 398)

text(365, 368, "Sum eks. mva", 9); text(483, 368, PRICE_TEXT, 9)
text(365, 350, "Mva", 9); text(483, 350, "0,00 kr", 9)
line(365, 336, 539, 336, blue, 1); text(365, 316, "Å betale", 11, True, blue); text(475, 316, PRICE_TEXT, 11, True, blue)

box(56, 208, 483, 78, (0.95, 0.97, 0.96), (0.8, 0.84, 0.84))
text(68, 266, "Betaling", 9, True, blue); text(68, 248, f"Vennligst betal 1 990,00 kr innen {DUE_DATE}.", 9)
text(68, 234, "Merk betalingen med fakturanummer: 2026-003.", 9); text(68, 216, "Merknad: Ikke MVA-registrert.", 9)
text(405, 254, "Arkivstatus", 9, True, blue); text(405, 236, "Klar for utsending", 10, True, green)
text(56, 168, "Dokumentert for intern fakturakontroll.", 8, False, (0.3, 0.36, 0.38))
text(56, 154, "Org.nr. for LTJ-Production er ikke oppgitt i grunnlaget.", 8, False, (0.3, 0.36, 0.38))

content = "\n".join(commands).encode("latin1")
objects = [
    b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >> endobj\n",
    f"4 0 obj << /Length {len(content)} >> stream\n".encode("latin1") + content + b"\nendstream endobj\n",
    b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj\n",
    b"6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj\n",
]
pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"); offsets = [0]
for obj in objects:
    offsets.append(len(pdf)); pdf.extend(obj)
xref = len(pdf); pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
for offset in offsets[1:]: pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
pdf.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii"))
OUTPUT.parent.mkdir(parents=True, exist_ok=True); OUTPUT.write_bytes(pdf)
