import datetime
from io import BytesIO
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    and a consistent footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Draw a line above footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 36, 576, 36)
        
        # Footer text
        footer_text = f"Generated on {datetime.date.today().strftime('%B %d, %Y')} | VANIVILASAM L P SCHOOL | For official use only"
        page_text = f"Page {self._pageNumber} of {page_count}"
        
        self.drawString(36, 24, footer_text)
        self.drawRightString(576, 24, page_text)
        self.restoreState()


def get_pdf_styles():
    styles = getSampleStyleSheet()
    
    # Custom colors
    primary_color = colors.HexColor("#1e293b")
    text_color = colors.HexColor("#334155")
    
    # Title Style
    title_style = ParagraphStyle(
        'SchoolTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        alignment=1 # Center
    )
    
    # Subtitle Style
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#475569"),
        alignment=1 # Center
    )
    
    # Section Heading Style
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=5
    )

    # Standard body style
    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_color
    )
    
    # Table cell bold style
    cell_bold = ParagraphStyle(
        'CellBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    # Table header style
    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white,
        alignment=0
    )

    return {
        "title": title_style,
        "subtitle": subtitle_style,
        "section": section_style,
        "body": body_style,
        "cell_bold": cell_bold,
        "header": header_style
    }


def generate_student_pdf(
    student_name: str,
    class_name: str,
    section: str,
    parent_name: str,
    parent_phone: str,
    academic_year: str,
    working_days: int,
    present_days: int,
    absent_days: int,
    attendance_pct: float,
    records: List[Dict[str, Any]]
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=54
    )
    
    styles = get_pdf_styles()
    story = []
    
    # 1. School Header
    story.append(Paragraph("VANIVILASAM L P SCHOOL", styles["title"]))
    story.append(Paragraph("Thillenkeri, Uliyil", styles["subtitle"]))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(f"Attendance Report — {academic_year}", styles["subtitle"]))
    story.append(Spacer(1, 15))
    
    # 2. Student Metadata block (Table form)
    meta_data = [
        [
            Paragraph("Student Name:", styles["cell_bold"]), Paragraph(student_name, styles["body"]),
            Paragraph("Class / Section:", styles["cell_bold"]), Paragraph(f"{class_name} {section or ''}".strip(), styles["body"])
        ],
        [
            Paragraph("Parent Name:", styles["cell_bold"]), Paragraph(parent_name or "N/A", styles["body"]),
            Paragraph("Parent Phone:", styles["cell_bold"]), Paragraph(parent_phone or "N/A", styles["body"])
        ]
    ]
    meta_table = Table(meta_data, colWidths=[90, 180, 90, 180])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))
    
    # 3. Detailed Attendance Records Table
    story.append(Paragraph("Detailed Daily Logs", styles["section"]))
    
    table_data = [[
        Paragraph("Date", styles["header"]),
        Paragraph("Status", styles["header"]),
        Paragraph("Remarks / Reason", styles["header"])
    ]]
    
    for r in records:
        status_text = r["status"].capitalize()
        status_style = styles["body"]
        if status_text == "Absent":
            status_style = ParagraphStyle('Abs', parent=styles['body'], textColor=colors.HexColor("#ef4444"), fontName="Helvetica-Bold")
        elif status_text == "Late":
            status_style = ParagraphStyle('Lat', parent=styles['body'], textColor=colors.HexColor("#f59e0b"))

        table_data.append([
            Paragraph(r["date"].strftime('%B %d, %Y') if isinstance(r["date"], datetime.date) else str(r["date"]), styles["body"]),
            Paragraph(status_text, status_style),
            Paragraph(r["reason"] or "", styles["body"])
        ])
        
    log_table = Table(table_data, colWidths=[150, 100, 290])
    log_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(log_table)
    story.append(Spacer(1, 20))
    
    # 4. Summary Statistics (Bottom Table)
    story.append(Paragraph("Attendance Summary", styles["section"]))
    
    summary_data = [
        [
            Paragraph("Total School Working Days", styles["cell_bold"]),
            Paragraph("Days Present", styles["cell_bold"]),
            Paragraph("Days Absent", styles["cell_bold"]),
            Paragraph("Attendance Percentage", styles["cell_bold"])
        ],
        [
            Paragraph(str(working_days), styles["body"]),
            Paragraph(str(present_days), styles["body"]),
            Paragraph(str(absent_days), styles["body"]),
            Paragraph(f"{attendance_pct:.1f}%", ParagraphStyle('Pct', parent=styles['cell_bold'], fontSize=11, textColor=colors.HexColor("#16a34a") if attendance_pct >= 85 else colors.HexColor("#ca8a04")))
        ]
    ]
    summary_table = Table(summary_data, colWidths=[135, 135, 135, 135])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.75, colors.HexColor("#94a3b8")),
    ]))
    story.append(summary_table)
    
    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()


def generate_class_pdf(
    class_name: str,
    academic_year: str,
    working_days: int,
    students_summary: List[Dict[str, Any]]
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=54
    )
    
    styles = get_pdf_styles()
    story = []
    
    story.append(Paragraph("VANIVILASAM L P SCHOOL", styles["title"]))
    story.append(Paragraph("Thillenkeri, Uliyil", styles["subtitle"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Class Attendance Summary — Class {class_name} ({academic_year})", styles["subtitle"]))
    story.append(Spacer(1, 5))
    story.append(Paragraph(f"Total Academic Working Days: {working_days}", styles["section"]))
    story.append(Spacer(1, 10))
    
    table_data = [[
        Paragraph("Sl. No.", styles["header"]),
        Paragraph("Student Name", styles["header"]),
        Paragraph("Present Days", styles["header"]),
        Paragraph("Absent Days", styles["header"]),
        Paragraph("Percentage", styles["header"])
    ]]
    
    for i, s in enumerate(students_summary, 1):
        pct_color = colors.HexColor("#16a34a") if s["percentage"] >= 85 else colors.HexColor("#ca8a04")
        pct_style = ParagraphStyle('PctStyle', parent=styles['cell_bold'], textColor=pct_color)
        
        table_data.append([
            Paragraph(str(i), styles["body"]),
            Paragraph(s["name"], styles["cell_bold"]),
            Paragraph(str(s["present"]), styles["body"]),
            Paragraph(str(s["absent"]), styles["body"]),
            Paragraph(f"{s['percentage']:.1f}%", pct_style)
        ])
        
    summary_table = Table(table_data, colWidths=[50, 210, 90, 90, 100])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(summary_table)
    
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()


def generate_class_tc_pdf(
    class_name: str,
    academic_year: str,
    students_summary: List[Dict[str, Any]]
) -> bytes:
    """
    Format optimized specifically for Transfer Certificate (TC) records.
    Columns: Student Name | Class | Total Working Days | Present | Absent | %
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=54
    )
    
    styles = get_pdf_styles()
    story = []
    
    story.append(Paragraph("VANIVILASAM L P SCHOOL", styles["title"]))
    story.append(Paragraph("Thillenkeri, Uliyil", styles["subtitle"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Official Attendance Summary for Transfer Certificates (TC)", styles["subtitle"]))
    story.append(Paragraph(f"Academic Year: {academic_year} | Class: {class_name}", styles["subtitle"]))
    story.append(Spacer(1, 15))
    
    table_data = [[
        Paragraph("Student Name", styles["header"]),
        Paragraph("Class", styles["header"]),
        Paragraph("Total Working Days", styles["header"]),
        Paragraph("Present Days", styles["header"]),
        Paragraph("Absent Days", styles["header"]),
        Paragraph("Percentage", styles["header"])
    ]]
    
    for s in students_summary:
        table_data.append([
            Paragraph(s["name"], styles["cell_bold"]),
            Paragraph(class_name, styles["body"]),
            Paragraph(str(s["working_days"]), styles["body"]),
            Paragraph(str(s["present"]), styles["body"]),
            Paragraph(str(s["absent"]), styles["body"]),
            Paragraph(f"{s['percentage']:.1f}%", styles["cell_bold"])
        ])
        
    tc_table = Table(table_data, colWidths=[190, 60, 100, 60, 60, 70])
    tc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")), # Dark slate
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#64748b")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f1f5f9")]),
    ]))
    story.append(tc_table)
    
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
