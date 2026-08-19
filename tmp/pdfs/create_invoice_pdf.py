from pathlib import Path


OUTPUT = Path("output/pdf/faktura-2026-001-breathe-senja-betalt.pdf")
PRICE_TEXT = "1 990,00 kr"


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


paper = (0.99, 0.98, 0.95)
ink = (0.14, 0.2, 0.22)
blue = (0.09, 0.23, 0.27)
green = (0.08, 0.36, 0.26)

box(0, 0, 595, 842, paper)
text(56, 780, "FAKTURA", 25, True, blue)
text(56, 754, "LTJ-Production", 11, True)
text(56, 738, "v/ Lars Tangen Johannessen", 9)
text(56, 724, "kontakt@ltj-production.no", 9)

box(56, 658, 483, 48, (0.93, 0.96, 0.95), (0.72, 0.8, 0.77))
text(68, 688, "Fakturanr.", 8, True)
text(68, 672, "2026-001", 10)
text(190, 688, "Fakturadato", 8, True)
text(190, 672, "06.07.2026", 10)
text(312, 688, "Forfallsdato", 8, True)
text(312, 672, "20.07.2026", 10)
text(470, 680, "BETALT", 10, True, green)

text(56, 628, "Fra", 9, True, blue)
text(310, 628, "Til", 9, True, blue)
text(56, 610, "LTJ-Production", 9, True)
text(56, 596, "v/ Lars Tangen Johannessen", 9)
text(56, 582, "E-post: kontakt@ltj-production.no", 9)
text(56, 568, "Org.nr.: Ikke oppgitt i grunnlaget", 9)
text(56, 554, "Kontonr.: 6098.08.05657", 9)
text(310, 610, "Breathe Senja & Services Henriksen", 9, True)
text(310, 596, "v/ Roland Henriksen", 9)
text(310, 582, "Org.nr.: 937 296 355", 9)
text(310, 568, "Telefon: +47 46 54 45 10", 9)
text(310, 554, "E-post: roland.henriksen75@gmail.com", 9)
line(56, 536, 539, 536)

box(56, 494, 483, 28, blue)
text(68, 504, "FAKTURALINJER", 8, True, (1, 1, 1))
text(68, 477, "Beskrivelse", 9, True)
text(418, 477, "Antall", 9, True)
text(466, 477, "Pris", 9, True)
text(516, 477, "Beløp", 9, True)
line(56, 468, 539, 468)
text(68, 448, "Nettside for Breathe Senja - design, tekst/struktur,", 9)
text(68, 434, "bildearbeid, publisering og teknisk oppsett.", 9)
text(423, 441, "1", 9)
text(447, 441, PRICE_TEXT, 9)
text(507, 441, PRICE_TEXT, 9)
line(56, 414, 539, 414)

text(365, 384, "Sum eks. mva", 9)
text(483, 384, PRICE_TEXT, 9)
text(365, 366, "Mva", 9)
text(483, 366, "0,00 kr", 9)
line(365, 352, 539, 352, blue, 1)
text(365, 332, "Å betale", 11, True, blue)
text(475, 332, PRICE_TEXT, 11, True, blue)

box(56, 224, 483, 78, (0.95, 0.97, 0.96), (0.8, 0.84, 0.84))
text(68, 282, "Betaling", 9, True, blue)
text(68, 264, "Betalt. Opprinnelig betalingsfrist var 20.07.2026.", 9)
text(68, 250, "Betalingsdato er ikke oppgitt i grunnlaget.", 9)
text(68, 232, "Merknad: Ikke MVA-registrert.", 9)
text(405, 270, "Arkivstatus", 9, True, blue)
text(405, 252, "Sendt og betalt", 10, True, green)

text(56, 184, "Dokumentert for intern fakturakontroll.", 8, False, (0.3, 0.36, 0.38))
text(56, 170, "Org.nr. for LTJ-Production må fylles inn dersom fakturaen skal gjenbrukes som mal.", 8, False, (0.3, 0.36, 0.38))

content = "\n".join(commands).encode("latin1")
objects = [
    b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >> endobj\n",
    f"4 0 obj << /Length {len(content)} >> stream\n".encode("latin1") + content + b"\nendstream endobj\n",
    b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj\n",
    b"6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj\n",
]

pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
offsets = [0]
for obj in objects:
    offsets.append(len(pdf))
    pdf.extend(obj)
xref = len(pdf)
pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
for offset in offsets[1:]:
    pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
pdf.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii"))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_bytes(pdf)
