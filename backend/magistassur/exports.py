"""Fonctions d'export Excel et PDF pour les contrats Magistassur."""
import io
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from django.http import HttpResponse


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fmt(value):
    if value is None or value == "":
        return "—"
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    return str(value)


def _money(value):
    if value is None:
        return "—"
    try:
        return f"{int(value):,} FCFA".replace(",", " ")
    except Exception:
        return str(value)


# ═══════════════════════════════════════════════════════════════════════════
#  EXCEL
# ═══════════════════════════════════════════════════════════════════════════

_HEADER_FILL = PatternFill("solid", fgColor="1E3A5F")
_SECTION_FILL = PatternFill("solid", fgColor="2E75B6")
_ALT_FILL = PatternFill("solid", fgColor="EBF3FB")
_BORDER = Border(
    left=Side(style="thin", color="CCCCCC"),
    right=Side(style="thin", color="CCCCCC"),
    top=Side(style="thin", color="CCCCCC"),
    bottom=Side(style="thin", color="CCCCCC"),
)


def _xl_title(ws, text, row):
    ws.merge_cells(f"A{row}:B{row}")
    cell = ws[f"A{row}"]
    cell.value = text
    cell.font = Font(bold=True, color="FFFFFF", size=11)
    cell.fill = _SECTION_FILL
    cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    cell.border = _BORDER
    ws.row_dimensions[row].height = 22
    return row + 1


def _xl_row(ws, label, value, row, alt=False):
    a = ws[f"A{row}"]
    b = ws[f"B{row}"]
    a.value = label
    b.value = value
    a.font = Font(bold=True, size=10)
    b.font = Font(size=10)
    if alt:
        a.fill = _ALT_FILL
        b.fill = _ALT_FILL
    a.border = _BORDER
    b.border = _BORDER
    a.alignment = Alignment(indent=1)
    b.alignment = Alignment(wrap_text=True)
    ws.row_dimensions[row].height = 18
    return row + 1


def export_epargne_excel(contrat):
    wb = Workbook()
    ws = wb.active
    ws.title = "Contrat Épargne"
    ws.column_dimensions["A"].width = 35
    ws.column_dimensions["B"].width = 45

    # ── Titre principal ──
    ws.merge_cells("A1:B1")
    title = ws["A1"]
    title.value = "MAGIST'ASSUR — Contrat Épargne"
    title.font = Font(bold=True, color="FFFFFF", size=14)
    title.fill = _HEADER_FILL
    title.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    ws.merge_cells("A2:B2")
    sub = ws["A2"]
    sub.value = f"Exporté le {date.today().strftime('%d/%m/%Y')}   |   N° Police : {contrat.num_police or 'En attente'}"
    sub.font = Font(italic=True, size=10, color="555555")
    sub.alignment = Alignment(horizontal="center")
    ws.row_dimensions[2].height = 18

    r = 4
    alt = False

    # ── Identifiants ──
    r = _xl_title(ws, "IDENTIFIANTS", r)
    for lbl, val in [
        ("N° Police", _fmt(contrat.num_police)),
        ("Code Inspection", _fmt(contrat.code_inspection)),
        ("Statut", contrat.get_statut_display()),
        ("Date création", _fmt(contrat.created_at.date() if contrat.created_at else None)),
    ]:
        alt = not alt
        r = _xl_row(ws, lbl, val, r, alt)

    # ── Souscripteur ──
    r = _xl_title(ws, "SOUSCRIPTEUR", r)
    alt = False
    for lbl, val in [
        ("Nom complet", f"{contrat.client.nom} {contrat.client.prenoms}"),
        ("Civilité", _fmt(contrat.civilite)),
        ("Date de naissance", _fmt(contrat.date_naissance)),
        ("Pays/Ville naissance", _fmt(contrat.pays_naissance)),
        ("NNI", _fmt(contrat.nni)),
        ("Type pièce", contrat.get_type_piece_display() if contrat.type_piece else "—"),
        ("N° pièce", _fmt(contrat.numero_piece)),
        ("Validité pièce", _fmt(contrat.validite_piece)),
        ("Situation matrimoniale", contrat.get_situation_matrimoniale_display() if contrat.situation_matrimoniale else "—"),
        ("Nom époux/épouse", _fmt(contrat.nom_epoux)),
        ("Adresse postale", _fmt(contrat.adresse_postale)),
        ("Téléphone", _fmt(contrat.telephone)),
        ("WhatsApp", _fmt(contrat.whatsapp)),
        ("Email personnel", _fmt(contrat.email_personnel)),
        ("Résidence principale", _fmt(contrat.residence_principale)),
        ("Statut professionnel", contrat.get_statut_professionnel_display() if contrat.statut_professionnel else "—"),
        ("Profession", _fmt(contrat.profession_detail)),
        ("Secteur d'activité", _fmt(contrat.secteur_activite)),
        ("Revenu mensuel estimé", _money(contrat.revenu_mensuel)),
        ("Origine revenu", contrat.get_origine_revenu_display() if contrat.origine_revenu else "—"),
    ]:
        alt = not alt
        r = _xl_row(ws, lbl, val, r, alt)

    # ── Assuré ──
    r = _xl_title(ws, "ASSURÉ", r)
    alt = False
    if contrat.assure_idem:
        r = _xl_row(ws, "Assuré", "Identique au souscripteur", r, False)
    else:
        for lbl, val in [
            ("Nom & Prénoms", f"{contrat.assure_nom} {contrat.assure_prenoms}"),
            ("Date de naissance", _fmt(contrat.assure_date_naissance)),
            ("Lieu de naissance", _fmt(contrat.assure_lieu_naissance)),
            ("NNI", _fmt(contrat.assure_nni)),
            ("Type pièce", _fmt(contrat.assure_type_piece)),
            ("N° pièce", _fmt(contrat.assure_numero_piece)),
            ("Lien avec souscripteur", _fmt(contrat.assure_lien)),
            ("Téléphone", _fmt(contrat.assure_telephone)),
            ("Email", _fmt(contrat.assure_email)),
            ("Profession", _fmt(contrat.assure_profession)),
            ("Déjà souscrit NSIA ?", _fmt(contrat.assure_nsia_anterieur)),
            ("N° police antérieur", _fmt(contrat.assure_nsia_num_police)),
        ]:
            alt = not alt
            r = _xl_row(ws, lbl, val, r, alt)

    # ── Garanties & Cotisations ──
    r = _xl_title(ws, "GARANTIES & COTISATIONS", r)
    alt = False
    periodicite_labels = {"mensuelle": "Mensuelle", "trimestrielle": "Trimestrielle",
                          "semestrielle": "Semestrielle", "annuelle": "Annuelle"}
    for lbl, val in [
        ("Durée (années)", f"{contrat.duree_annees} ans"),
        ("Périodicité", periodicite_labels.get(contrat.periodicite, contrat.periodicite)),
        ("Montant cotisation", _money(contrat.montant_cotisation)),
        ("Prime annuelle", _money(int(contrat.montant_cotisation) * {"mensuelle": 12, "trimestrielle": 4, "semestrielle": 2}.get(contrat.periodicite, 1))),
        ("Date 1ère cotisation", _fmt(contrat.date_premiere_cotisation)),
        ("Date d'effet", _fmt(contrat.date_effet)),
        ("Capital constitué", _money(contrat.capital_constitue)),
        ("Mode de paiement", _fmt(contrat.mode_paiement)),
        ("N° compte (RIB)", _fmt(contrat.numero_compte)),
        ("Frais de gestion", f"{contrat.frais_gestion_pct} %"),
        ("Frais accessoires", _money(contrat.frais_accessoires)),
        ("Coût police", _money(contrat.cout_police)),
        ("Taux d'intérêt", f"{contrat.taux_interet} %"),
    ]:
        alt = not alt
        r = _xl_row(ws, lbl, val, r, alt)

    # ── Bénéficiaires ──
    r = _xl_title(ws, "BÉNÉFICIAIRES", r)
    alt = False
    for i, b in enumerate(contrat.beneficiaires.all(), 1):
        alt = not alt
        r = _xl_row(ws, f"Bénéficiaire {i}", f"{b.nom} — {b.en_qualite_de} — {b.taux_repartition}%", r, alt)

    # ── Correspondants ──
    r = _xl_title(ws, "CORRESPONDANTS", r)
    alt = False
    for c in contrat.correspondants.all():
        alt = not alt
        r = _xl_row(ws, f"Correspondant {c.numero}", f"{c.nom} {c.prenom} — {c.telephone}", r, alt)

    # ── Conseiller ──
    r = _xl_title(ws, "CONSEILLER / AGENT", r)
    if contrat.agent:
        _xl_row(ws, "Conseiller", f"{contrat.agent.nom} {contrat.agent.prenoms}", r, False)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"epargne_{contrat.id}_{date.today().isoformat()}.xlsx"
    response = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def export_prevoyance_excel(contrat):
    wb = Workbook()
    ws = wb.active
    ws.title = "Contrat Prévoyance"
    ws.column_dimensions["A"].width = 35
    ws.column_dimensions["B"].width = 45

    ws.merge_cells("A1:B1")
    title = ws["A1"]
    title.value = "MAGIST'ASSUR — Contrat Prévoyance"
    title.font = Font(bold=True, color="FFFFFF", size=14)
    title.fill = _HEADER_FILL
    title.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    ws.merge_cells("A2:B2")
    sub = ws["A2"]
    sub.value = f"Exporté le {date.today().strftime('%d/%m/%Y')}   |   N° Police : {contrat.num_police or 'En attente'}"
    sub.font = Font(italic=True, size=10, color="555555")
    sub.alignment = Alignment(horizontal="center")
    ws.row_dimensions[2].height = 18

    r = 4
    alt = False

    r = _xl_title(ws, "IDENTIFIANTS", r)
    for lbl, val in [
        ("N° Police", _fmt(contrat.num_police)),
        ("N° Client", _fmt(contrat.num_client)),
        ("Code Inspection", _fmt(contrat.code_inspection)),
        ("Statut", contrat.get_statut_display()),
        ("Date d'effet", _fmt(contrat.date_effet)),
        ("Date d'échéance", _fmt(contrat.date_echeance)),
    ]:
        alt = not alt
        r = _xl_row(ws, lbl, val, r, alt)

    r = _xl_title(ws, "SOUSCRIPTEUR", r)
    alt = False
    for lbl, val in [
        ("Nom complet", f"{contrat.client.nom} {contrat.client.prenoms}"),
        ("Civilité", _fmt(contrat.civilite)),
        ("Date de naissance", _fmt(contrat.date_naissance)),
        ("NNI", _fmt(contrat.nni)),
        ("Type pièce", contrat.get_type_piece_display() if contrat.type_piece else "—"),
        ("N° pièce", _fmt(contrat.numero_piece)),
        ("Situation matrimoniale", contrat.get_situation_matrimoniale_display() if contrat.situation_matrimoniale else "—"),
        ("Téléphone", _fmt(contrat.telephone)),
        ("Email personnel", _fmt(contrat.email_personnel)),
        ("Adresse postale", _fmt(contrat.adresse_postale)),
        ("Profession", _fmt(contrat.profession_detail)),
    ]:
        alt = not alt
        r = _xl_row(ws, lbl, val, r, alt)

    r = _xl_title(ws, "GARANTIES", r)
    alt = False
    for lbl, val in [
        ("Prévoyance Décès", _fmt(contrat.garantie_prevoyance_deces)),
        ("Frais Funéraires", _fmt(contrat.garantie_frais_funeraires)),
        ("Prime annuelle", _money(contrat.prime_annuelle)),
        ("Frais fixes", _money(contrat.frais_fixes)),
    ]:
        alt = not alt
        r = _xl_row(ws, lbl, val, r, alt)

    r = _xl_title(ws, "ASSURÉS ASSOCIÉS", r)
    alt = False
    for a in contrat.assures_associes.all():
        alt = not alt
        r = _xl_row(ws, a.get_lien_parente_display(), f"{a.nom} — {_fmt(a.date_naissance)} — Prime: {_money(a.prime)}", r, alt)

    r = _xl_title(ws, "BÉNÉFICIAIRES", r)
    alt = False
    for i, b in enumerate(contrat.beneficiaires.all(), 1):
        alt = not alt
        r = _xl_row(ws, f"Bénéficiaire {i}", f"{b.nom} — {b.en_qualite_de} — {b.taux_repartition}%", r, alt)

    r = _xl_title(ws, "CORRESPONDANT", r)
    _xl_row(ws, "Nom", f"{contrat.corresp_nom} {contrat.corresp_prenom}", r, False)
    r += 1
    _xl_row(ws, "Téléphone", _fmt(contrat.corresp_telephone), r, True)
    r += 1

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    filename = f"prevoyance_{contrat.id}_{date.today().isoformat()}.xlsx"
    response = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


# ═══════════════════════════════════════════════════════════════════════════
#  PDF  (reportlab)
# ═══════════════════════════════════════════════════════════════════════════

def _pdf_section(elements, text, styles):
    from reportlab.platypus import Paragraph, Spacer
    from reportlab.lib.units import mm
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(text, styles["section"]))
    elements.append(Spacer(1, 2 * mm))


def _pdf_rows(elements, rows, styles):
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.units import mm

    data = [[lbl, val] for lbl, val in rows]
    t = Table(data, colWidths=[70 * mm, 100 * mm])
    style = TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.Color(0.93, 0.96, 0.98)]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.Color(0.8, 0.8, 0.8)),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ])
    t.setStyle(style)
    elements.append(t)


def _build_pdf_styles():
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="title",
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=colors.Color(0.12, 0.23, 0.37),
        alignment=TA_CENTER,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="subtitle",
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="section",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=colors.white,
        backColor=colors.Color(0.18, 0.46, 0.71),
        leftIndent=4,
        spaceBefore=2,
        spaceAfter=2,
        leading=16,
    ))
    return styles


def export_epargne_pdf(contrat):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib import colors

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
        title=f"Contrat Épargne — {contrat.num_police or 'En attente'}",
    )

    styles = _build_pdf_styles()
    elements = []

    elements.append(Paragraph("MAGIST'ASSUR — Contrat Épargne", styles["title"]))
    elements.append(Paragraph(
        f"N° Police : <b>{contrat.num_police or 'En attente'}</b>   |   "
        f"Exporté le {date.today().strftime('%d/%m/%Y')}",
        styles["subtitle"]
    ))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.18, 0.46, 0.71)))
    elements.append(Spacer(1, 4 * mm))

    _pdf_section(elements, "IDENTIFIANTS", styles)
    _pdf_rows(elements, [
        ("N° Police", contrat.num_police or "En attente"),
        ("Code Inspection", _fmt(contrat.code_inspection)),
        ("Statut", contrat.get_statut_display()),
        ("Date création", _fmt(contrat.created_at.date() if contrat.created_at else None)),
    ], styles)

    _pdf_section(elements, "SOUSCRIPTEUR", styles)
    periodicite_labels = {"mensuelle": "Mensuelle", "trimestrielle": "Trimestrielle",
                          "semestrielle": "Semestrielle", "annuelle": "Annuelle"}
    _pdf_rows(elements, [
        ("Nom complet", f"{contrat.client.nom} {contrat.client.prenoms}"),
        ("Civilité", _fmt(contrat.civilite)),
        ("Date de naissance", _fmt(contrat.date_naissance)),
        ("NNI", _fmt(contrat.nni)),
        ("Type pièce", contrat.get_type_piece_display() if contrat.type_piece else "—"),
        ("N° pièce", _fmt(contrat.numero_piece)),
        ("Situation matrimoniale", contrat.get_situation_matrimoniale_display() if contrat.situation_matrimoniale else "—"),
        ("Téléphone", _fmt(contrat.telephone)),
        ("Email", _fmt(contrat.email_personnel)),
        ("Adresse", _fmt(contrat.adresse_postale)),
        ("Profession", _fmt(contrat.profession_detail)),
        ("Revenu mensuel", _money(contrat.revenu_mensuel)),
    ], styles)

    _pdf_section(elements, "GARANTIES & COTISATIONS", styles)
    prime_annuelle = int(contrat.montant_cotisation) * {"mensuelle": 12, "trimestrielle": 4, "semestrielle": 2}.get(contrat.periodicite, 1)
    _pdf_rows(elements, [
        ("Durée", f"{contrat.duree_annees} ans"),
        ("Périodicité", periodicite_labels.get(contrat.periodicite, contrat.periodicite)),
        ("Montant cotisation", _money(contrat.montant_cotisation)),
        ("Prime annuelle", _money(prime_annuelle)),
        ("Date d'effet", _fmt(contrat.date_effet)),
        ("Date 1ère cotisation", _fmt(contrat.date_premiere_cotisation)),
        ("Capital constitué", _money(contrat.capital_constitue)),
        ("Mode de paiement", _fmt(contrat.mode_paiement)),
        ("Frais de gestion", f"{contrat.frais_gestion_pct} %"),
        ("Taux d'intérêt", f"{contrat.taux_interet} %"),
    ], styles)

    beneficiaires = list(contrat.beneficiaires.all())
    if beneficiaires:
        _pdf_section(elements, "BÉNÉFICIAIRES", styles)
        _pdf_rows(elements, [
            (f"Bénéficiaire {i + 1}", f"{b.nom} — {b.en_qualite_de} — {b.taux_repartition}%")
            for i, b in enumerate(beneficiaires)
        ], styles)

    correspondants = list(contrat.correspondants.all())
    if correspondants:
        _pdf_section(elements, "CORRESPONDANTS", styles)
        _pdf_rows(elements, [
            (f"Correspondant {c.numero}", f"{c.nom} {c.prenom} — {c.telephone}")
            for c in correspondants
        ], styles)

    if contrat.agent:
        _pdf_section(elements, "CONSEILLER", styles)
        _pdf_rows(elements, [
            ("Conseiller", f"{contrat.agent.nom} {contrat.agent.prenoms}"),
        ], styles)

    doc.build(elements)
    buf.seek(0)
    filename = f"epargne_{contrat.id}_{date.today().isoformat()}.pdf"
    response = HttpResponse(buf.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def export_prevoyance_pdf(contrat):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib import colors

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm, bottomMargin=15 * mm,
        title=f"Contrat Prévoyance — {contrat.num_police or 'En attente'}",
    )

    styles = _build_pdf_styles()
    elements = []

    elements.append(Paragraph("MAGIST'ASSUR — Contrat Prévoyance", styles["title"]))
    elements.append(Paragraph(
        f"N° Police : <b>{contrat.num_police or 'En attente'}</b>   |   "
        f"Exporté le {date.today().strftime('%d/%m/%Y')}",
        styles["subtitle"]
    ))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.Color(0.18, 0.46, 0.71)))
    elements.append(Spacer(1, 4 * mm))

    _pdf_section(elements, "IDENTIFIANTS", styles)
    _pdf_rows(elements, [
        ("N° Police", contrat.num_police or "En attente"),
        ("N° Client", _fmt(contrat.num_client)),
        ("Code Inspection", _fmt(contrat.code_inspection)),
        ("Statut", contrat.get_statut_display()),
        ("Date d'effet", _fmt(contrat.date_effet)),
        ("Date d'échéance", _fmt(contrat.date_echeance)),
    ], styles)

    _pdf_section(elements, "SOUSCRIPTEUR", styles)
    _pdf_rows(elements, [
        ("Nom complet", f"{contrat.client.nom} {contrat.client.prenoms}"),
        ("Civilité", _fmt(contrat.civilite)),
        ("Date de naissance", _fmt(contrat.date_naissance)),
        ("NNI", _fmt(contrat.nni)),
        ("Type pièce", contrat.get_type_piece_display() if contrat.type_piece else "—"),
        ("N° pièce", _fmt(contrat.numero_piece)),
        ("Situation matrimoniale", contrat.get_situation_matrimoniale_display() if contrat.situation_matrimoniale else "—"),
        ("Téléphone", _fmt(contrat.telephone)),
        ("Email", _fmt(contrat.email_personnel)),
        ("Profession", _fmt(contrat.profession_detail)),
    ], styles)

    _pdf_section(elements, "GARANTIES", styles)
    _pdf_rows(elements, [
        ("Prévoyance Décès (45 000 FCFA/an)", _fmt(contrat.garantie_prevoyance_deces)),
        ("Frais Funéraires (58 000 FCFA/an)", _fmt(contrat.garantie_frais_funeraires)),
        ("Prime annuelle totale", _money(contrat.prime_annuelle)),
        ("Frais fixes", _money(contrat.frais_fixes)),
    ], styles)

    assures = list(contrat.assures_associes.all())
    if assures:
        _pdf_section(elements, "ASSURÉS ASSOCIÉS", styles)
        _pdf_rows(elements, [
            (a.get_lien_parente_display(), f"{a.nom} — {_fmt(a.date_naissance)} — Prime : {_money(a.prime)}")
            for a in assures
        ], styles)

    beneficiaires = list(contrat.beneficiaires.all())
    if beneficiaires:
        _pdf_section(elements, "BÉNÉFICIAIRES", styles)
        _pdf_rows(elements, [
            (f"Bénéficiaire {i + 1}", f"{b.nom} — {b.en_qualite_de} — {b.taux_repartition}%")
            for i, b in enumerate(beneficiaires)
        ], styles)

    if contrat.corresp_nom:
        _pdf_section(elements, "CORRESPONDANT", styles)
        _pdf_rows(elements, [
            ("Nom", f"{contrat.corresp_nom} {contrat.corresp_prenom}"),
            ("Téléphone", _fmt(contrat.corresp_telephone)),
            ("Email", _fmt(contrat.corresp_email)),
        ], styles)

    doc.build(elements)
    buf.seek(0)
    filename = f"prevoyance_{contrat.id}_{date.today().isoformat()}.pdf"
    response = HttpResponse(buf.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
