from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


OUTPUT = r"C:\Prosjekt\zagros-forlag\docs\faktura-2026-002-zagros-forlag.pdf"
PRICE_TEXT = "1 990,00 kr"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    rightMargin=20 * mm,
    leftMargin=20 * mm,
    topMargin=18 * mm,
    bottomMargin=18 * mm,
    title="Faktura 2026-002 - Zagros Forlag & Oversettelse",
    author="LTJ-Production",
)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="InvoiceTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=colors.HexColor("#183b45"), spaceAfter=3))
styles.add(ParagraphStyle(name="Small", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=12, textColor=colors.HexColor("#4d5b61")))
styles.add(ParagraphStyle(name="Body", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=colors.HexColor("#233238")))
styles.add(ParagraphStyle(name="BodyBold", parent=styles["Body"], fontName="Helvetica-Bold"))
styles.add(ParagraphStyle(name="Right", parent=styles["Body"], alignment=TA_RIGHT))
styles.add(ParagraphStyle(name="RightSmall", parent=styles["Small"], alignment=TA_RIGHT))
styles.add(ParagraphStyle(name="Status", parent=styles["Body"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#155c43"), alignment=TA_RIGHT))

story = []
story.append(Paragraph("FAKTURA", styles["InvoiceTitle"]))
story.append(Paragraph("LTJ-Production", styles["BodyBold"]))
story.append(Paragraph("v/ Lars Tangen Johannessen", styles["Body"]))
story.append(Paragraph("kontakt@ltj-production.no", styles["Body"]))
story.append(Spacer(1, 11 * mm))

meta = [
    [Paragraph("<b>Fakturanr.</b><br/>2026-002", styles["Body"]), Paragraph("<b>Fakturadato</b><br/>03.09.2026", styles["Body"]), Paragraph("<b>Forfallsdato</b><br/>17.09.2026", styles["Body"]), Paragraph("TIL BETALING", styles["Status"])],
]
meta_table = Table(meta, colWidths=[42 * mm, 42 * mm, 42 * mm, 44 * mm])
meta_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#edf4f1")),
    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#b9ccc5")),
    ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d3e0db")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(meta_table)
story.append(Spacer(1, 12 * mm))

parties = Table([
    [Paragraph("<b>Fra</b><br/>LTJ-Production<br/>v/ Lars Tangen Johannessen<br/>E-post: kontakt@ltj-production.no<br/>Org.nr.: Ikke oppgitt i grunnlaget<br/>Kontonr.: 6098.08.05657", styles["Body"]), Paragraph("<b>Til</b><br/>Zagros Forlag &amp; Oversettelse<br/>v/ Eisa Bazyar<br/>Org.nr.: Ikke oppgitt i grunnlaget<br/>E-post: post@zagrosforlag.no", styles["Body"])],
], colWidths=[87 * mm, 87 * mm])
parties.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#d3d9da")),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(parties)
story.append(Spacer(1, 12 * mm))

story.append(Paragraph("FAKTURALINJER", styles["Small"]))
lines = [
    [Paragraph("<b>Beskrivelse</b>", styles["Body"]), Paragraph("<b>Antall</b>", styles["Right"]), Paragraph("<b>Pris</b>", styles["Right"]), Paragraph("<b>Beløp</b>", styles["Right"])],
    [Paragraph("Nettside for Zagros Forlag - design, struktur, flerspråklig innhold, publisering, domenekobling og Formspree-oppsett.", styles["Body"]), Paragraph("1", styles["Right"]), Paragraph(PRICE_TEXT, styles["Right"]), Paragraph(PRICE_TEXT, styles["Right"])],
]
lines_table = Table(lines, colWidths=[95 * mm, 18 * mm, 28 * mm, 33 * mm], repeatRows=1)
lines_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#183b45")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#cdd6d8")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(lines_table)
story.append(Spacer(1, 8 * mm))

totals = Table([
    [Paragraph("Sum eks. mva", styles["Body"]), Paragraph(PRICE_TEXT, styles["Right"])],
    [Paragraph("Mva", styles["Body"]), Paragraph("0,00 kr", styles["Right"])],
    [Paragraph("<b>Å betale</b>", styles["Body"]), Paragraph(f"<b>{PRICE_TEXT}</b>", styles["Right"])],
], colWidths=[130 * mm, 44 * mm])
totals.setStyle(TableStyle([
    ("LINEABOVE", (0, 2), (-1, 2), 1, colors.HexColor("#183b45")),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
]))
story.append(totals)
story.append(Spacer(1, 12 * mm))

payment = Table([
    [Paragraph("<b>Betaling</b><br/>Vennligst betal 1 990,00 kr til kontonummer 6098.08.05657 innen 17.09.2026.<br/>Merk betalingen med fakturanummer: 2026-002.<br/><br/><b>Merknad:</b> Ikke MVA-registrert.", styles["Body"]), Paragraph("<b>Arkivstatus</b><br/>Klar for utsending", styles["Body"])],
], colWidths=[120 * mm, 54 * mm])
payment.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f6f5")),
    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cdd6d8")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
]))
story.append(payment)
story.append(Spacer(1, 13 * mm))
story.append(Paragraph("Dokumentert for intern fakturakontroll. Org.nr. for LTJ-Production og kunden bør fylles inn dersom dette kreves før utsending.", styles["Small"]))

doc.build(story)
