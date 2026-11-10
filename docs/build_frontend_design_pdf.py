"""Build a print-ready HTML edition of the implemented frontend design spec."""

from __future__ import annotations

import argparse
import base64
import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "docs" / "FRONTEND_DESIGN_SPEC.md"
HERO = ROOT / "frontend" / "public" / "study-group-hero.png"


def image_data(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    mime = "image/png"
    return f"data:{mime};base64,{encoded}"


def inline_markdown(value: str) -> str:
    escaped = html.escape(value, quote=False)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    return escaped


def markdown_to_html(markdown: str) -> str:
    output: list[str] = []
    paragraph: list[str] = []
    list_open = False
    table_open = False

    def flush_paragraph() -> None:
        if paragraph:
            output.append(f"<p>{inline_markdown(' '.join(paragraph))}</p>")
            paragraph.clear()

    def close_list() -> None:
        nonlocal list_open
        if list_open:
            output.append("</ul>")
            list_open = False

    def close_table() -> None:
        nonlocal table_open
        if table_open:
            output.append("</tbody></table>")
            table_open = False

    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            close_list()
            close_table()
            continue

        if line.startswith("|"):
            flush_paragraph()
            close_list()
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                continue
            if not table_open:
                output.append('<table class="spec-table"><thead><tr>')
                output.extend(f"<th>{inline_markdown(cell)}</th>" for cell in cells)
                output.append("</tr></thead><tbody>")
                table_open = True
            else:
                output.append("<tr>")
                output.extend(f"<td>{inline_markdown(cell)}</td>" for cell in cells)
                output.append("</tr>")
            continue

        close_table()
        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading:
            flush_paragraph()
            close_list()
            level = len(heading.group(1))
            output.append(
                f"<h{level}>{inline_markdown(heading.group(2))}</h{level}>"
            )
            continue

        if line.startswith("- "):
            flush_paragraph()
            if not list_open:
                output.append("<ul>")
                list_open = True
            output.append(f"<li>{inline_markdown(line[2:])}</li>")
            continue

        close_list()
        paragraph.append(line)

    flush_paragraph()
    close_list()
    close_table()
    return "\n".join(output)


def svg_text(x: int, y: int, value: str, size: int = 16, color: str = "#172f50",
             weight: int = 500) -> str:
    return (
        f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" '
        f'font-weight="{weight}">{html.escape(value)}</text>'
    )


def svg_box(x: int, y: int, width: int, height: int, fill: str = "#ffffff",
            stroke: str = "#e1e8f0", radius: int = 12) -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" '
        f'fill="{fill}" stroke="{stroke}"/>'
    )


def screen_art(screen: dict[str, object], hero_data: str) -> str:
    role = str(screen["role"])
    kind = str(screen["kind"])
    title = str(screen["title"])
    subtitle = str(screen["subtitle"])
    details = [str(item) for item in screen.get("details", [])]
    width, height = 1200, 675
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        'role="img" aria-label="Interface design illustration">'
        '<rect width="1200" height="675" fill="#f7f9fc"/>',
    ]

    if role == "Public":
        parts.extend([
            '<rect width="1200" height="24" fill="#eaf2fd"/>',
            svg_text(520, 17, "Contact support", 10, "#2459a4", 700),
            '<rect y="24" width="1200" height="64" fill="#ffffff" stroke="#e5eaf1"/>',
            '<circle cx="52" cy="56" r="20" fill="#eaf2fd"/>',
            svg_text(42, 62, "L", 20, "#2459a4", 800),
            svg_text(82, 54, "LetLearnTogether", 17, "#173b6c", 750),
            svg_text(82, 71, "Learn. Practice. Succeed.", 10, "#748197"),
            svg_text(690, 61, "Home", 13, "#40516a"),
            svg_text(760, 61, "Document Library", 13, "#40516a"),
            svg_text(900, 61, "About", 13, "#40516a"),
            '<rect x="972" y="39" width="100" height="34" rx="8" fill="#ffffff" stroke="#cbd9ec"/>',
            svg_text(988, 61, "Install app", 12, "#2459a4", 700),
            svg_text(1090, 61, "Login", 13, "#40516a"),
            '<rect x="1130" y="39" width="62" height="34" rx="8" fill="#2563eb"/>',
            svg_text(1140, 61, "Register", 11, "#ffffff", 700),
        ])
        left, top, content_width = 48, 112, 1104
    else:
        parts.extend([
            '<rect width="1200" height="66" fill="#ffffff" stroke="#e5eaf1"/>',
            '<circle cx="39" cy="34" r="18" fill="#eaf2fd"/>',
            svg_text(31, 40, "L", 18, "#2459a4", 800),
            svg_text(67, 32, "LetLearnTogether", 15, "#173b6c", 750),
            svg_text(67, 49, "Learning portal", 10, "#748197"),
            svg_text(868, 38, "Example User", 12, "#20334e", 650),
            svg_text(965, 38, role, 11, "#748197"),
            '<rect x="1082" y="19" width="88" height="30" rx="8" fill="#ffffff" stroke="#e2e8f0"/>',
            svg_text(1101, 39, "Sign out", 11, "#52647a", 650),
            '<rect y="66" width="210" height="609" fill="#ffffff" stroke="#e5eaf1"/>',
            svg_text(28, 102, "WORKSPACE", 10, "#a0adbd", 800),
        ])
        nav_items = (
            ["Overview", "My courses", "Document library", "Quizzes", "Quiz history", "My submissions", "Upload document"]
            if role == "Student"
            else ["Teaching overview", "Review submissions", "Course quizzes", "Document library"]
            if role == "Lecturer"
            else ["Moderation center", "Document library"]
            if role == "Moderator"
            else ["Overview", "Accounts", "Courses", "System settings", "Activity log", "Quiz management", "Review & reports"]
        )
        for index, item in enumerate(nav_items):
            y = 130 + index * 42
            active = (index == 0) or (kind == "queue" and item in ("Review submissions", "Moderation center", "Review & reports"))
            if active:
                parts.append(f'<rect x="12" y="{y - 21}" width="186" height="36" rx="8" fill="#edf4fd"/>')
            parts.append(svg_text(30, y, item, 11, "#1c4d88" if active else "#64748b", 650))
        parts.append(svg_text(240, 98, role.upper() + " WORKSPACE", 10, "#5487d8", 800))
        left, top, content_width = 240, 116, 912

    if kind == "home":
        parts.extend([
            '<rect x="0" y="88" width="1200" height="320" fill="url(#hero)"/>',
            '<defs><linearGradient id="hero"><stop stop-color="#122f59"/><stop offset="1" stop-color="#2459a4"/></linearGradient></defs>',
            svg_text(58, 145, "YOUR LEARNING LIBRARY", 12, "#b9d4ff", 800),
            svg_text(58, 206, "Learn more.", 39, "#ffffff", 800),
            svg_text(58, 254, "Achieve more.", 39, "#a9cbff", 800),
            svg_text(58, 290, "Find study materials, past questions, assignments,", 15, "#d9e6fa"),
            svg_text(58, 314, "quizzes, and syllabuses in one place.", 15, "#d9e6fa"),
            '<rect x="58" y="340" width="164" height="42" rx="9" fill="#ffffff"/>',
            svg_text(76, 366, "Explore documents ↓", 13, "#173b6c", 700),
            f'<image href="{hero_data}" x="690" y="132" width="450" height="248" preserveAspectRatio="xMidYMid slice"/>',
            '<rect x="690" y="132" width="450" height="248" rx="16" fill="none" stroke="#ffffff" stroke-opacity=".4"/>',
            '<rect x="712" y="338" width="160" height="32" rx="9" fill="#ffffff"/>',
            svg_text(726, 359, "✓ Verified resources", 11, "#173b6c", 700),
        ])
    else:
        parts.extend([
            svg_text(left, top + 8, title, 26, "#172f50", 800),
            svg_text(left, top + 31, subtitle, 12, "#748197"),
        ])
        body_y = top + 58
        if kind == "about":
            parts.extend([
                svg_box(left, body_y, content_width, 176, "#edf4fd", "#d9e5f5", 16),
                svg_text(left + 28, body_y + 44, "ABOUT LETLEARNTOGETHER", 11, "#2459a4", 800),
                svg_text(left + 28, body_y + 91, "Learn. Share. Grow.", 33, "#173b6c", 800),
                svg_text(left + 28, body_y + 122, "Learning is better together. Resources for students and educators.", 14, "#52647a"),
                svg_box(left + 28, body_y + 139, 148, 27, "#2459a4", "#2459a4", 7),
                svg_text(left + 41, body_y + 158, "Explore the library", 10, "#ffffff", 700),
                svg_box(left, body_y + 194, 430, 122),
                svg_box(left + 448, body_y + 194, 464, 122, "#f4f8fe"),
                svg_text(left + 18, body_y + 224, "OUR MISSION", 10, "#2459a4", 800),
                svg_text(left + 18, body_y + 253, "Empower every learner", 18, "#173b6c", 700),
                svg_text(left + 466, body_y + 224, "OUR VISION", 10, "#2459a4", 800),
                svg_text(left + 466, body_y + 253, "A connected learning community", 17, "#173b6c", 700),
            ])
        elif kind == "form":
            card_width = 520 if role == "Public" else content_width
            card_x = (1200 - card_width) // 2 if role == "Public" else left
            parts.extend([svg_box(card_x, body_y, card_width, 394), svg_text(card_x + 28, body_y + 42, title, 23, "#173b6c", 750)])
            for index, label in enumerate(details[:5]):
                y = body_y + 78 + index * 55
                parts.append(svg_text(card_x + 28, y, label, 11, "#334155", 650))
                parts.append(svg_box(card_x + 28, y + 9, card_width - 56, 32, "#ffffff", "#cbd5e1", 7))
            parts.extend([
                f'<rect x="{card_x + 28}" y="{body_y + 356}" width="150" height="32" rx="7" fill="#2459a4"/>',
                svg_text(card_x + 48, body_y + 377, "Continue", 11, "#ffffff", 700),
            ])
        elif kind == "library":
            parts.extend([
                svg_box(left, body_y, content_width, 95, "#ffffff"),
                svg_text(left + 18, body_y + 30, "BROWSE BY FOLDER", 10, "#5487d8", 800),
                svg_text(left + 18, body_y + 53, "Course folders · academic year · semester · lecturer", 13, "#173b6c", 650),
                svg_box(left + 18, body_y + 64, 250, 22, "#f8fbff"),
                svg_box(left + 282, body_y + 64, 250, 22, "#f8fbff"),
                svg_box(left + 546, body_y + 64, 330, 22, "#f8fbff"),
                svg_box(left, body_y + 108, content_width, 72),
                svg_text(left + 18, body_y + 134, "Search documents", 11, "#748197"),
                svg_text(left + 18, body_y + 162, "Course", 10, "#52647a"),
                svg_text(left + 244, body_y + 162, "Academic year", 10, "#52647a"),
                svg_text(left + 470, body_y + 162, "Semester", 10, "#52647a"),
                svg_text(left + 696, body_y + 162, "Document type", 10, "#52647a"),
            ])
            for index in range(3):
                x = left + index * 306
                parts.extend([
                    svg_box(x, body_y + 196, 288, 206),
                    svg_box(x + 16, body_y + 214, 39, 43, "#fff0f0", "#ffdddd", 7),
                    svg_text(x + 21, body_y + 241, "PDF", 10, "#d14444", 800),
                    svg_text(x + 16, body_y + 281, ["ENG101", "CSEN301", "ENG201"][index], 10, "#2459a4", 800),
                    svg_text(x + 16, body_y + 305, "Verified study document", 13, "#1e3049", 700),
                    svg_text(x + 16, body_y + 327, "Midterm · 2026 · First semester", 9, "#748197"),
                    svg_box(x + 16, body_y + 349, 112, 31, "#ffffff", "#cbd9ec", 7),
                    svg_box(x + 138, body_y + 349, 134, 31, "#2459a4", "#2459a4", 7),
                    svg_text(x + 50, body_y + 369, "View", 10, "#2459a4", 700),
                    svg_text(x + 168, body_y + 369, "Download", 10, "#ffffff", 700),
                ])
        elif kind in ("dashboard", "admin"):
            if kind == "dashboard":
                parts.extend([
                    '<rect x="240" y="166" width="912" height="126" rx="14" fill="#edf4fd" stroke="#d9e5f5"/>',
                    svg_text(left + 22, 208, "STUDENT LEARNING SPACE" if role == "Student" else "TEACHING OVERVIEW", 10, "#2459a4", 800),
                    svg_text(left + 22, 241, "Welcome back!", 25, "#173b6c", 800),
                    svg_text(left + 22, 265, "Your learning activity and next steps.", 12, "#52647a"),
                ])
            metrics = details[:4] or ["Platform accounts", "Courses", "Awaiting review", "Open reports"]
            card_w = (content_width - 18 * (len(metrics) - 1)) // len(metrics)
            for index, label in enumerate(metrics):
                x = left + index * (card_w + 18)
                y = body_y + (132 if kind == "dashboard" else 0)
                parts.extend([
                    svg_box(x, y, card_w, 76),
                    svg_text(x + 15, y + 28, label, 10, "#748197"),
                    svg_text(x + 15, y + 58, ["12", "8", "3", "24%"][index], 22, "#2459a4", 800),
                ])
            panel_y = body_y + (226 if kind == "dashboard" else 96)
            parts.extend([
                svg_box(left, panel_y, content_width, 214),
                svg_text(left + 18, panel_y + 31, "QUICK ACCESS" if role == "Student" else "MANAGE THE PLATFORM", 10, "#5487d8", 800),
                svg_text(left + 18, panel_y + 59, "Recent activity and workspace tools", 16, "#173b6c", 700),
            ])
            for index, label in enumerate(details[4:8] or ["Document library", "Courses", "Review workspace", "Settings"]):
                x = left + 18 + (index % 2) * ((content_width - 52) // 2)
                y = panel_y + 82 + (index // 2) * 55
                parts.extend([svg_box(x, y, (content_width - 60) // 2, 42, "#f8fbff"), svg_text(x + 13, y + 26, label, 11, "#2459a4", 650)])
        elif kind == "catalog":
            parts.extend([
                svg_box(left, body_y, content_width, 82),
                svg_text(left + 16, body_y + 25, "Search quizzes     Course     Academic year     Semester", 11, "#52647a", 650),
                svg_box(left + 16, body_y + 38, content_width - 32, 30, "#ffffff", "#cbd5e1", 6),
            ])
            for index in range(3):
                x = left + index * 306
                parts.extend([
                    svg_box(x, body_y + 96, 288, 194),
                    svg_text(x + 16, body_y + 127, ["ENG101", "CSEN301", "ENG201"][index], 10, "#2459a4", 800),
                    svg_text(x + 16, body_y + 157, ["Academic writing", "Computer systems", "English grammar"][index], 14, "#173b6c", 700),
                    svg_text(x + 16, body_y + 182, "Course · year · semester", 10, "#748197"),
                    svg_box(x + 16, body_y + 226, 120, 34, "#2459a4", "#2459a4", 7),
                    svg_text(x + 37, body_y + 248, "Start quiz", 11, "#ffffff", 700),
                ])
        elif kind == "quiz":
            parts.extend([
                svg_box(left + 24, body_y, content_width - 48, 372),
                svg_text(left + 48, body_y + 36, "Question 2 of 8", 12, "#748197", 650),
                '<rect x="288" y="176" width="820" height="8" rx="4" fill="#e2e8f0"/>',
                '<rect x="288" y="176" width="205" height="8" rx="4" fill="#2459a4"/>',
                svg_text(left + 48, body_y + 94, "Question text appears here", 20, "#173b6c", 750),
            ])
            for index, label in enumerate(["Answer option A", "Answer option B", "Answer option C", "Answer option D"]):
                y = body_y + 122 + index * 46
                parts.extend([svg_box(left + 48, y, content_width - 144, 36, "#ffffff", "#dbe5f1", 8), svg_text(left + 64, y + 23, label, 12, "#334155")])
            parts.extend([
                svg_text(left + 48, body_y + 350, "Previous                     3 of 8 answered", 11, "#52647a"),
                svg_box(left + content_width - 168, body_y + 327, 118, 34, "#2459a4", "#2459a4", 7),
                svg_text(left + content_width - 151, body_y + 349, "Next →", 11, "#ffffff", 700),
            ])
        elif kind == "history":
            parts.extend([
                svg_box(left, body_y, content_width, 59),
                svg_text(left + 16, body_y + 25, "Filter by status / date                  Results and total count", 11, "#52647a"),
                svg_text(left + 16, body_y + 46, "Choose a filter to narrow the history list", 10, "#748197"),
            ])
            for index, label in enumerate(details[:5] or ["Recent item", "Course · document type · submitted date", "Review status · score or note"]):
                y = body_y + 76 + index * 56
                parts.extend([
                    svg_box(left, y, content_width, 46),
                    svg_text(left + 16, y + 20, label, 11, "#173b6c", 650),
                    svg_text(left + 16, y + 36, "Course · submitted date · status", 9, "#748197"),
                ])
        elif kind == "queue":
            parts.extend([
                svg_box(left, body_y, content_width, 55),
                svg_text(left + 16, body_y + 24, "Pending submissions     Open reports     Status filter", 11, "#52647a", 650),
            ])
            for index in range(2):
                y = body_y + 70 + index * 128
                parts.extend([
                    svg_box(left, y, content_width, 112),
                    svg_text(left + 16, y + 26, f"Submission {index + 1} · ENG101 · Midterm", 13, "#173b6c", 700),
                    svg_text(left + 16, y + 48, "Preview submitted file", 10, "#2459a4", 650),
                    svg_box(left + 16, y + 60, 574, 34, "#ffffff", "#cbd5e1", 6),
                    svg_box(left + 616, y + 60, 112, 34, "#2459a4", "#2459a4", 6),
                    svg_box(left + 740, y + 60, 112, 34, "#ffffff", "#cbd9ec", 6),
                    svg_text(left + 649, y + 82, "Approve", 10, "#ffffff", 700),
                    svg_text(left + 773, y + 82, "Reject", 10, "#2459a4", 700),
                ])
        elif kind == "management":
            parts.extend([
                svg_box(left, body_y, content_width, 54),
                svg_text(left + 16, body_y + 24, "Create new      View list      Search and refresh", 11, "#52647a", 650),
            ])
            for index, label in enumerate(details[:5] or ["Item name · course details", "Status · last updated", "Edit / view / remove"]):
                y = body_y + 68 + index * 53
                parts.extend([
                    svg_box(left, y, content_width, 43),
                    svg_text(left + 16, y + 26, label, 11, "#173b6c", 650),
                    svg_text(left + content_width - 135, y + 26, "Edit   Manage   ›", 10, "#2459a4", 650),
                ])
        elif kind == "settings":
            for index, label in enumerate(details[:5] or ["Announcement banner", "Support contact", "Public registration", "Student uploads"]):
                y = body_y + index * 72
                parts.extend([
                    svg_box(left, y, content_width, 59),
                    svg_text(left + 16, y + 23, label, 12, "#173b6c", 700),
                    svg_text(left + 16, y + 42, "Configure this option for the learning platform", 9, "#748197"),
                    '<rect x="1070" y="' + str(y + 17) + '" width="42" height="23" rx="12" fill="#2459a4"/>',
                    '<circle cx="1099" cy="' + str(y + 28) + '" r="8" fill="#ffffff"/>',
                ])
            parts.extend([
                svg_box(left, body_y + 306, 132, 34, "#2459a4", "#2459a4", 7),
                svg_text(left + 22, body_y + 328, "Save settings", 11, "#ffffff", 700),
            ])
        elif kind == "verify":
            card_x, card_y, card_w = left + 190, body_y + 18, 535
            parts.extend([
                svg_box(card_x, card_y, card_w, 327),
                svg_text(card_x + 28, card_y + 44, "✓", 25, "#2459a4", 800),
                svg_text(card_x + 28, card_y + 78, "Verify a document", 23, "#173b6c", 750),
                svg_text(card_x + 28, card_y + 103, "Check a document's current stamp status.", 11, "#748197"),
                svg_text(card_x + 28, card_y + 146, "Document verification ID", 11, "#334155", 650),
                svg_box(card_x + 28, card_y + 158, card_w - 56, 38, "#ffffff", "#cbd5e1", 7),
                svg_box(card_x + 28, card_y + 214, 160, 36, "#2459a4", "#2459a4", 7),
                svg_text(card_x + 45, card_y + 237, "Verify document", 11, "#ffffff", 700),
                svg_text(card_x + 28, card_y + 289, "Verification result and QR code appear here.", 10, "#748197"),
            ])

    parts.append("</svg>")
    return "".join(parts)


SCREENS: list[dict[str, object]] = [
    {"role": "Public", "kind": "home", "title": "Home hero", "route": "/",
     "subtitle": "Hero-only home layout matching the current frontend.",
     "details": ["Learn more. Achieve more.", "Explore documents → /library", "Study-group image", "Verified resources"]},
    {"role": "Public", "kind": "about", "title": "About", "route": "/about",
     "subtitle": "Mission, vision, offers, values, and community sections.",
     "details": ["Who we are", "Our mission", "Our vision", "What we offer", "Who we serve"]},
    {"role": "Public", "kind": "library", "title": "Document library", "route": "/library and /courses/…",
     "subtitle": "Shared folder, search, filter, verified document, and pagination pattern.",
     "details": ["Course folders", "Search by course code or title", "Course", "Academic year", "Semester", "Document type", "View", "Download"]},
    {"role": "Public", "kind": "form", "title": "Sign in", "route": "/login",
     "subtitle": "Email/password form with show/hide control and inline feedback.",
     "details": ["Email address", "Password", "Show password", "Sign in", "Create an account"]},
    {"role": "Public", "kind": "form", "title": "Create account", "route": "/register",
     "subtitle": "Registration form; when registration is disabled, a paused notice replaces it.",
     "details": ["Full name", "Email address", "Password", "Confirm password", "Show passwords"]},
    {"role": "Public", "kind": "catalog", "title": "Published quizzes", "route": "/quizzes",
     "subtitle": "Searchable quiz catalogue with course, year, and semester filters.",
     "details": ["Search quizzes", "Course", "Academic year", "Semester", "Start quiz"]},
    {"role": "Public", "kind": "verify", "title": "Verify a document", "route": "/verify and /verify/:token",
     "subtitle": "Enter a verification ID; token route adds status, document details, and QR result.",
     "details": ["Document verification ID", "Verify document", "Verified / Revoked", "QR code"]},
    {"role": "Student", "kind": "dashboard", "title": "Student learning overview", "route": "/student-dashboard (also signed-in /)",
     "subtitle": "Welcome panel, learning summaries, quick access, and recent activity.",
     "details": ["Your submissions", "Quiz attempts", "Account role", "My courses", "Browse documents", "Practice quizzes", "Upload materials"]},
    {"role": "Student", "kind": "catalog", "title": "My courses", "route": "/student/courses",
     "subtitle": "Course cards show enrollment progress and join/leave actions.",
     "details": ["Course code and title", "Lecturer", "Quizzes attempted", "Average score", "Enroll / Leave course"]},
    {"role": "Student", "kind": "library", "title": "Student document library", "route": "/library and /courses/…",
     "subtitle": "Public library inside the signed-in workspace; signed-in users can report a document.",
     "details": ["Search documents", "Folder browsing", "Verified document", "View", "Download", "Report document"]},
    {"role": "Student", "kind": "quiz", "title": "Quiz attempt", "route": "/quizzes/:quizId",
     "subtitle": "Question progress, answer selection, previous/next, and confirmed submission.",
     "details": ["Question progress", "Answer choices", "Answered count", "Previous", "Next", "Submit Quiz"]},
    {"role": "Student", "kind": "history", "title": "Quiz result and history", "route": "/quizzes/:quizId after submit; /quiz-history",
     "subtitle": "Server-calculated result and paginated attempt history.",
     "details": ["Your Results", "Score", "Try Again", "Back to Dashboard", "Quiz title and date", "Question count"]},
    {"role": "Student", "kind": "history", "title": "Document submissions", "route": "/document-history",
     "subtitle": "Submission status filter, review notes, verification links, and pagination.",
     "details": ["Review status", "File and course", "Submitted date", "Review note", "View document", "Verify stamp"]},
    {"role": "Student", "kind": "form", "title": "My uploads", "route": "/upload",
     "subtitle": "Course/type/file upload form with validation and embedded submission history.",
     "details": ["Course", "Document type", "Choose a file", "PDF / JPEG / PNG / WebP · 10 MiB", "Upload document"]},
    {"role": "Lecturer", "kind": "dashboard", "title": "Teaching overview", "route": "/lecturer (also signed-in /)",
     "subtitle": "Assigned course summaries, review counts, quizzes, and learning insights.",
     "details": ["Awaiting review", "Your quizzes", "Assigned courses", "Student quiz attempts", "Course roster", "Quiz reports", "Course materials", "Announcements"]},
    {"role": "Lecturer", "kind": "history", "title": "Course roster and progress", "route": "/lecturer/courses/:courseId/students",
     "subtitle": "Enrolled students, quiz attempts, scores, and expandable per-quiz progress.",
     "details": ["Enrolled students", "Published quizzes", "Student roster", "Average score", "Latest and best score"]},
    {"role": "Lecturer", "kind": "management", "title": "Course announcements", "route": "/lecturer/announcements?course_id=:id",
     "subtitle": "Choose a course, publish or edit an update, and manage announcement posts.",
     "details": ["Course selector", "Announcement title", "Message", "Publish", "Edit", "Delete"]},
    {"role": "Lecturer", "kind": "queue", "title": "Review submissions", "route": "/staff",
     "subtitle": "Preview submission, leave a student-visible note, approve or reject.",
     "details": ["Preview submitted file", "Review note", "Approve", "Reject"]},
    {"role": "Lecturer", "kind": "management", "title": "Quiz management and results", "route": "/quiz-management and /quiz-results/:quizId",
     "subtitle": "Create/edit quiz and review student performance reports.",
     "details": ["Course", "Quiz title", "Questions and options", "Correct answer", "Publication", "Attempts and average score"]},
    {"role": "Moderator", "kind": "queue", "title": "Moderation center", "route": "/staff and signed-in /",
     "subtitle": "Review queue plus report status totals, report filter, notes, and actions.",
     "details": ["Pending submissions", "Open reports", "In Review", "Resolved", "Dismissed", "Moderator note"]},
    {"role": "Admin", "kind": "admin", "title": "Platform overview", "route": "/admin (also signed-in /)",
     "subtitle": "Platform totals, responsibility cards, and management links.",
     "details": ["Platform accounts", "Courses", "Awaiting review", "Open reports", "Activity log", "Accounts and roles", "Academic courses", "System settings"]},
    {"role": "Admin", "kind": "management", "title": "Account management", "route": "/admin/accounts",
     "subtitle": "Create account and view/edit roles; the current account cannot be deleted.",
     "details": ["Name", "Email", "Initial password", "Role", "Create account", "Save role", "Delete"]},
    {"role": "Admin", "kind": "management", "title": "Course management", "route": "/admin/courses",
     "subtitle": "Create course, browse catalog, assign lecturer, or remove course.",
     "details": ["Course code", "Course title", "Academic year", "Semester", "Lecturer", "Create course", "Delete"]},
    {"role": "Admin", "kind": "settings", "title": "System settings", "route": "/admin/settings",
     "subtitle": "Announcement and support details; registration and student upload access.",
     "details": ["Announcement banner", "Support contact", "Public registration", "Student document uploads"]},
    {"role": "Admin", "kind": "history", "title": "Activity log", "route": "/admin/activity",
     "subtitle": "Paginated account, course, review, and settings activity with actor and time.",
     "details": ["Actor and role", "Activity summary", "Date and time", "Previous / Next"]},
]


def screen_gallery(hero_data: str) -> str:
    sections = []
    for role in ("Public", "Student", "Lecturer", "Moderator", "Admin"):
        cards = []
        for screen in SCREENS:
            if screen["role"] != role:
                continue
            art = screen_art(screen, hero_data)
            cards.append(
                '<article class="screen-card">'
                f'<div class="screen-image">{art}</div>'
                f'<h3>{html.escape(str(screen["title"]))}</h3>'
                f'<p class="route">{html.escape(str(screen["route"]))}</p>'
                f'<p>{html.escape(str(screen["subtitle"]))}</p>'
                '</article>'
            )
        sections.append(
            f'<section class="gallery-section"><h2>{role} interface designs</h2>'
            '<p class="gallery-note">Illustrations use the implemented routes, controls, '
            'brand colors, and page structure. Repeated routes share the interface shown.</p>'
            f'<div class="screen-grid">{"".join(cards)}</div></section>'
        )
    return "\n".join(sections)


def build_html(home_screenshot: Path | None) -> str:
    markdown_html = markdown_to_html(SPEC.read_text(encoding="utf-8"))
    hero_data = image_data(HERO)
    live_home = ""
    if home_screenshot and home_screenshot.exists():
        live_home = (
            '<figure class="live-capture">'
            f'<img src="{image_data(home_screenshot)}" alt="Captured home interface from the running application">'
            '<figcaption>Live application capture · home route · 1440 × 1000 viewport</figcaption>'
            '</figure>'
        )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LetLearnTogether Frontend Design Document</title>
<style>
@page {{ size: A4; margin: 15mm 14mm 17mm; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; color: #17243a; background: #fff; font: 10pt/1.55 Inter, "Segoe UI", Arial, sans-serif; }}
h1,h2,h3 {{ color: #173b6c; line-height: 1.2; }}
h1 {{ font-size: 30pt; margin: 0 0 12pt; }}
h2 {{ font-size: 19pt; margin: 25pt 0 10pt; padding-bottom: 5pt; border-bottom: 1px solid #dce5f1; }}
h3 {{ font-size: 13pt; margin: 12pt 0 5pt; }}
p {{ margin: 5pt 0 9pt; }}
ul {{ margin: 5pt 0 12pt; padding-left: 20pt; }}
li {{ margin: 3pt 0; }}
code {{ color: #174f91; background: #eef4fb; padding: 1px 3px; border-radius: 3px; font-size: .92em; }}
.cover {{ height: 260mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }}
.cover-brand {{ color: #2459a4; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }}
.cover h1 {{ max-width: 150mm; margin-top: 16pt; font-size: 34pt; }}
.cover p {{ color: #64748b; max-width: 145mm; font-size: 12pt; }}
.cover-photo {{ width: 100%; max-height: 96mm; object-fit: cover; border-radius: 13px; margin-top: 18pt; box-shadow: 0 10px 24px #173b6c22; }}
.cover-stamp {{ margin-top: 14pt; color: #2459a4; font-size: 9pt; font-weight: 700; }}
.live-capture {{ page-break-after: always; margin: 12pt 0; }}
.live-capture img {{ width: 100%; height: auto; border: 1px solid #dce5f1; border-radius: 7px; }}
.live-capture figcaption {{ margin-top: 5pt; color: #748197; font-size: 8pt; }}
.spec-content {{ font-size: 8.6pt; }}
.spec-content h1 {{ font-size: 23pt; }}
.spec-content h2 {{ page-break-after: avoid; }}
.spec-content h3 {{ font-size: 12pt; }}
.spec-table {{ width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.3pt; line-height: 1.4; margin: 9pt 0 15pt; }}
.spec-table th {{ background: #edf4fd; color: #173b6c; text-align: left; }}
.spec-table th,.spec-table td {{ border: 1px solid #dce5f1; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; }}
.spec-table tr {{ break-inside: avoid; }}
.spec-content table th:first-child {{ width: 7%; }}
.spec-content table th:nth-child(2) {{ width: 25%; }}
.spec-content table th:last-child {{ width: 68%; }}
.gallery-section {{ page-break-before: always; }}
.gallery-section h2 {{ margin-top: 0; }}
.gallery-note {{ color: #748197; font-size: 8pt; margin-bottom: 15pt; }}
.screen-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }}
.screen-card {{ break-inside: avoid; border: 1px solid #dce5f1; border-radius: 9px; padding: 8pt; background: #fff; }}
.screen-image {{ border: 1px solid #e4ebf4; border-radius: 6px; overflow: hidden; }}
.screen-image svg {{ display: block; width: 100%; height: auto; }}
.screen-card h3 {{ font-size: 10pt; margin: 7pt 0 1pt; }}
.screen-card p {{ font-size: 7.2pt; color: #64748b; margin: 2pt 0; }}
.screen-card p.route {{ color: #2459a4; font-family: Consolas, monospace; overflow-wrap: anywhere; }}
.gallery-section + .gallery-section {{ page-break-before: always; }}
.doc-footer {{ margin-top: 20pt; border-top: 1px solid #dce5f1; padding-top: 7pt; font-size: 7.5pt; color: #748197; }}
@media screen {{ body {{ max-width: 900px; margin: 30px auto; padding: 24px; }} }}
</style>
</head>
<body>
<header class="cover">
<div class="cover-brand">LetLearnTogether · Frontend design specification</div>
<h1>One platform.<br>One consistent interface.</h1>
<p>Implemented routes, visual language, and role-based screens — from the home page to the last administrative interface.</p>
<img class="cover-photo" src="{hero_data}" alt="Students studying together outdoors">
<div class="cover-stamp">Design reference · Based on the current frontend implementation · 2026</div>
</header>
{live_home}
<main class="spec-content">{markdown_html}</main>
{screen_gallery(hero_data)}
<footer class="doc-footer">LetLearnTogether · Frontend design document · Interface layouts follow the current frontend implementation.</footer>
</body>
</html>"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="Print-ready HTML output")
    parser.add_argument("--home-screenshot", type=Path, help="Optional live home screenshot")
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(build_html(args.home_screenshot), encoding="utf-8")
    print(f"Generated {args.output}")


if __name__ == "__main__":
    main()
