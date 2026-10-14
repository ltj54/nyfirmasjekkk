"""Generate Gunnar's invoice using the next PDF invoice number."""

from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "output" / "pdf"
numbers = []
for path in OUTPUT_DIR.glob("faktura-2026-*.pdf"):
    match = re.match(r"faktura-2026-(\d{3})-", path.name)
    if match:
        numbers.append(int(match.group(1)))
if sorted(numbers) != [1, 2, 3]:
    raise SystemExit(f"Unexpected invoice sequence: {sorted(numbers)}")

number = f"2026-{max(numbers) + 1:03d}"
destination = OUTPUT_DIR / f"faktura-{number}-fiskerikandidat-gunnar-davidsson.pdf"
if destination.exists():
    raise SystemExit(f"Invoice already exists: {destination}")

width, height = A4
navy = colors.HexColor("#1b2c48")
muted = colors.HexColor("#627087")
line = colors.HexColor("#d8e0ea")
light = colors.HexColor("#f3f6fa")
c = canvas.Canvas(str(destination), pagesize=A4, pageCompression=1)
c.setTitle(f"Faktura {number} - Fiskerikandidat Gunnar Davidsson")
c.setAuthor("LTJ PRODUCTION JOHANNESSEN")


def t(x, y, value, size=10.5, bold=False, color=navy):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, value)


def right(x, y, value, size=10.5, bold=False, color=navy):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawRightString(x, y, value)


left, right_edge = 52, width - 52
t(left, height - 76, "FAKTURA", 30, True)
right(right_edge, height - 72, number, 14, True)
c.setStrokeColor(line)
c.line(left, height - 98, right_edge, height - 98)

t(left, height - 130, "FRA", 10, True, muted)
t(left, height - 154, "LTJ PRODUCTION JOHANNESSEN", 12, True)
t(left, height - 173, "Org.nr. 838 632 122")
t(left, height - 191, "Øvre Holen 11F")
t(left, height - 209, "5163 LAKSEVÅG")
t(left, height - 227, "kontakt@ltj-production.no")

mid = 315
t(mid, height - 130, "TIL", 10, True, muted)
t(mid, height - 154, "FISKERIKANDIDAT", 12, True)
t(mid, height - 170, "GUNNAR DAVIDSSON", 12, True)
t(mid, height - 189, "Org.nr. 938 423 334")
t(mid, height - 207, "Kantarellvegen 64")
t(mid, height - 225, "9102 KVALØYSLETTA")

box_y = height - 326
c.setFillColor(light)
c.roundRect(left, box_y, right_edge - left, 72, 9, fill=1, stroke=0)
for x, label, value in [
    (left + 15, "FAKTURADATO", "14.10.2026"),
    (left + 175, "LEVERANSE", "11.10.2026"),
    (left + 340, "FORFALL", "28.10.2026"),
]:
    t(x, box_y + 49, label, 9, True, muted)
    t(x, box_y + 26, value, 12, True)

table_top = height - 370
t(left, table_top, "BESKRIVELSE", 9, True, muted)
right(right_edge - 134, table_top, "ANTALL", 9, True, muted)
right(right_edge, table_top, "BELØP", 9, True, muted)
c.setStrokeColor(line)
c.line(left, table_top - 12, right_edge, table_top - 12)
t(left, table_top - 39, "Nettside for Fiskerikandidat Gunnar Davidsson", 11, True)
t(left, table_top - 58, "Utvikling, innholdstilpasning og publisering på davidsson.no", 9.5)
right(right_edge - 134, table_top - 43, "1")
right(right_edge, table_top - 43, "1 990,00 kr")
c.line(left, table_top - 79, right_edge, table_top - 79)

total_y = table_top - 121
right(right_edge - 140, total_y, "Å BETALE", 11, True)
right(right_edge, total_y, "1 990,00 kr", 16, True)
t(left, total_y - 2, "Ikke registrert i Merverdiavgiftsregisteret.", 9, False, muted)

payment_y = total_y - 120
c.setFillColor(light)
c.roundRect(left, payment_y - 28, right_edge - left, 80, 9, fill=1, stroke=0)
t(left + 15, payment_y + 26, "BETALINGSINFORMASJON", 9, True, muted)
t(left + 15, payment_y + 4, "Kontonummer: 6098.08.05657", 12, True)
t(left + 15, payment_y - 15, f"Merk betalingen med fakturanummer {number}.", 9.5)

c.setStrokeColor(line)
c.line(left, 73, right_edge, 73)
t(left, 55, "LTJ PRODUCTION JOHANNESSEN  ·  Org.nr. 838 632 122", 8.5, False, muted)
right(right_edge, 55, "kontakt@ltj-production.no", 8.5, False, muted)
c.save()
print(destination)
