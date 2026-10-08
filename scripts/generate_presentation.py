import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_system_deck():
    prs = Presentation()
    # 16:9 Widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # 1:1 RESCOM Design System Palette (from mobile/src/theme.ts and dashboard)
    C_BG = RGBColor(248, 250, 252)          # slate-50 (#f8fafc)
    C_CARD = RGBColor(255, 255, 255)        # white (#ffffff)
    C_BORDER = RGBColor(226, 232, 240)      # slate-200 (#e2e8f0)
    C_BORDER_SOFT = RGBColor(241, 245, 249) # slate-100 (#f1f5f9)
    C_SUBTLE = RGBColor(248, 250, 252)      # slate-50 (#f8fafc)

    C_TEXT = RGBColor(15, 23, 42)           # slate-900 (#0f172a)
    C_TEXT_BODY = RGBColor(51, 65, 85)      # slate-700 (#334155)
    C_TEXT_MUTED = RGBColor(100, 116, 139)  # slate-500 (#64748b)
    C_TEXT_FAINT = RGBColor(148, 163, 184)  # slate-400 (#94a3b8)

    # Tactical Accents
    C_PRIMARY = RGBColor(6, 95, 70)         # emerald-800 (#065f46) - Army Green
    C_PRIMARY_TEXT = RGBColor(4, 120, 87)   # emerald-700 (#047857)
    C_PRIMARY_SOFT = RGBColor(236, 253, 245)# emerald-50 (#ecfdf5)
    C_PRIMARY_TINT = RGBColor(209, 250, 229)# emerald-100 (#d1fae5)
    C_PRIMARY_BORDER = RGBColor(167, 243, 208) # emerald-200 (#a7f3d0)

    C_AMBER = RGBColor(217, 119, 6)         # amber-600 (#d97706)
    C_AMBER_DARK = RGBColor(146, 64, 14)    # amber-800 (#92400e)
    C_AMBER_SOFT = RGBColor(255, 251, 235)  # amber-50 (#fffbeb)
    C_AMBER_BORDER = RGBColor(252, 211, 77) # amber-300 (#fcd34d)

    C_RED = RGBColor(185, 28, 28)           # red-700 (#b91c1c)
    C_RED_DARK = RGBColor(127, 29, 29)      # red-900 (#7f1d1d)
    C_RED_SOFT = RGBColor(254, 242, 242)    # red-50 (#fef2f2)
    C_RED_BORDER = RGBColor(254, 202, 202)  # red-200 (#fecaca)

    C_BLUE = RGBColor(29, 78, 216)          # blue-700
    C_BLUE_SOFT = RGBColor(239, 246, 255)   # blue-50
    C_BLUE_BORDER = RGBColor(191, 219, 254) # blue-200

    logo_path = os.path.abspath("public/rescom-emblem.jpg")
    seal_path = os.path.abspath("public/rescom-pa-seal.png")

    blank_layout = prs.slide_layouts[6]

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG
        bg.line.fill.background()
        return bg

    def add_top_nav(slide, category_text, title_text, slide_num, total_slides=9):
        # Category Badge Pill
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.4), Inches(3.2), Inches(0.36))
        badge.fill.solid()
        badge.fill.fore_color.rgb = C_PRIMARY_SOFT
        badge.line.color.rgb = C_PRIMARY_BORDER
        badge.line.width = Pt(1)
        tf_b = badge.text_frame
        p_b = tf_b.paragraphs[0]
        p_b.text = f"●  {category_text.upper()}"
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = C_PRIMARY_TEXT
        p_b.alignment = PP_ALIGN.CENTER

        # Slide Main Title
        tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.82), Inches(9.8), Inches(0.65))
        tf = tb.text_frame
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(24)
        p.font.bold = True
        p.font.color.rgb = C_TEXT

        # Top Right Unit Branding
        if os.path.exists(logo_path):
            slide.shapes.add_picture(logo_path, Inches(12.0), Inches(0.4), width=Inches(0.65))

        tb_brand = slide.shapes.add_textbox(Inches(10.2), Inches(0.42), Inches(1.7), Inches(0.6))
        tf_brand = tb_brand.text_frame
        tf_brand.margin_left = tf_brand.margin_top = tf_brand.margin_right = tf_brand.margin_bottom = 0
        p = tf_brand.paragraphs[0]
        p.text = "10RCDG RESCOM"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = C_PRIMARY
        p.alignment = PP_ALIGN.RIGHT
        p2 = tf_brand.add_paragraph()
        p2.text = "PHILIPPINE ARMY"
        p2.font.size = Pt(9)
        p2.font.color.rgb = C_TEXT_MUTED
        p2.alignment = PP_ALIGN.RIGHT

        # Subtle divider line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.52), Inches(11.733), Inches(0.015))
        line.fill.solid()
        line.fill.fore_color.rgb = C_BORDER
        line.line.fill.background()

        # Footer
        add_footer(slide, slide_num, total_slides)

    def add_footer(slide, slide_num, total_slides=9):
        # Footer text
        tb_f = slide.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(5.5), Inches(0.35))
        tf_f = tb_f.text_frame
        tf_f.margin_left = tf_f.margin_top = tf_f.margin_right = tf_f.margin_bottom = 0
        p = tf_f.paragraphs[0]
        p.text = "10th Regional Community Defense Group  •  Reserve Command, Philippine Army"
        p.font.size = Pt(9.5)
        p.font.color.rgb = C_TEXT_MUTED

        # Classification
        tb_c = slide.shapes.add_textbox(Inches(5.0), Inches(6.9), Inches(4.5), Inches(0.35))
        tf_c = tb_c.text_frame
        tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0
        p = tf_c.paragraphs[0]
        p.text = "// RESTRICTED — TECHNICAL BRIEFING & COMMAND DEFENSE //"
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_FAINT
        p.alignment = PP_ALIGN.CENTER

        # Slide Number Pill
        num_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(11.833), Inches(6.85), Inches(0.7), Inches(0.32))
        num_box.fill.solid()
        num_box.fill.fore_color.rgb = C_CARD
        num_box.line.color.rgb = C_BORDER
        num_box.line.width = Pt(1)
        tf_n = num_box.text_frame
        p_n = tf_n.paragraphs[0]
        p_n.text = f"{slide_num:02d} / {total_slides:02d}"
        p_n.font.size = Pt(9.5)
        p_n.font.bold = True
        p_n.font.color.rgb = C_TEXT_MUTED
        p_n.alignment = PP_ALIGN.CENTER

    # ==========================================
    # SLIDE 1: COVER SLIDE (Consistent Light System Theme)
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Main Card Container
    card1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(0.8), Inches(10.333), Inches(5.9))
    card1.fill.solid()
    card1.fill.fore_color.rgb = C_CARD
    card1.line.color.rgb = C_BORDER
    card1.line.width = Pt(1.5)

    # Top dual logos
    if os.path.exists(logo_path):
        s1.shapes.add_picture(logo_path, Inches(5.6), Inches(1.2), width=Inches(1.0))
    if os.path.exists(seal_path):
        s1.shapes.add_picture(seal_path, Inches(6.8), Inches(1.2), width=Inches(1.0))

    # Badge pill
    badge1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.3), Inches(2.35), Inches(4.7), Inches(0.38))
    badge1.fill.solid()
    badge1.fill.fore_color.rgb = C_PRIMARY_SOFT
    badge1.line.color.rgb = C_PRIMARY_BORDER
    badge1.line.width = Pt(1)
    tf = badge1.text_frame
    p = tf.paragraphs[0]
    p.text = "OFFICIAL MILITARY MOBILIZATION SYSTEM"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_PRIMARY_TEXT
    p.alignment = PP_ALIGN.CENTER

    # Title
    tbox = s1.shapes.add_textbox(Inches(2.0), Inches(2.85), Inches(9.333), Inches(2.2))
    tf = tbox.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = "10RCDG RESCOM-ALERT"
    p.font.size = Pt(38)
    p.font.bold = True
    p.font.color.rgb = C_TEXT
    p.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = "Tactical Mass Emergency Siren & Rapid Mobilization Notification Architecture"
    p2.font.size = Pt(16)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.alignment = PP_ALIGN.CENTER

    p3 = tf.add_paragraph()
    p3.text = "\nTechnical Evaluation & Budget Defense for Official Alphanumeric SENDER ID Implementation"
    p3.font.size = Pt(13)
    p3.font.bold = True
    p3.font.color.rgb = C_PRIMARY_TEXT
    p3.alignment = PP_ALIGN.CENTER

    # Presenter Pill Box
    p_box = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.2), Inches(5.35), Inches(6.9), Inches(0.8))
    p_box.fill.solid()
    p_box.fill.fore_color.rgb = C_SUBTLE
    p_box.line.color.rgb = C_BORDER
    p_box.line.width = Pt(1)
    tf_p = p_box.text_frame
    tf_p.word_wrap = True

    p = tf_p.paragraphs[0]
    p.text = "Presented by: Javier Siliacay (aka vier from USTP Autotronics)"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT
    p.alignment = PP_ALIGN.CENTER

    p2 = tf_p.add_paragraph()
    p2.text = "Solo Systems Architect & Full-Stack Developer  •  October 2026"
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.alignment = PP_ALIGN.CENTER

    add_footer(s1, 1, 9)

    s1.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "Good morning, Colonel, distinguished officers, and members of the 10RCDG Command Staff.\n"
        "Today, I am proud to present the RESCOM-ALERT System — a homegrown, modern tactical mass notification and emergency siren alert ecosystem built specifically for the rapid recall and mobilization of our reserve personnel.\n"
        "Today's briefing will outline the operational problem we solved, a live demonstration of the technology, and the budget justification for acquiring an Official Telco Alphanumeric Sender ID."
    )

    # ==========================================
    # SLIDE 2: THE OPERATIONAL CHALLENGE
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_top_nav(s2, "Operational Problem", "The Critical Operational Gap in Personnel Recall", 2)

    cards_data = [
        ("74% SILENT PHONES", "Critical Orders Missed During Sleep & Duty", 
         "Standard text messages and chat pings generate a subtle 1-second chime.\n\nAt night, during emergencies, or in noisy work environments, personnel sleep through or fail to notice mobilization alerts.",
         C_RED, C_RED_SOFT, C_RED_BORDER),
        ("DATA DEPENDENCY", "Chat Apps Fail During Blackouts & Disasters", 
         "Facebook Messenger and Viber require active mobile data or Wi-Fi.\n\nDuring severe weather or earthquakes, cell towers lose data bandwidth, leaving troop group chats completely stranded.",
         C_AMBER, C_AMBER_SOFT, C_AMBER_BORDER),
        ("ZERO HEADCOUNT", "Commanders Kept in the Dark", 
         "Traditional SMS blasts offer zero acknowledgment tracking.\n\nCommanders cannot accurately tally how many troops are awake, armed with orders, and actively en route to Headquarters.",
         C_BLUE, C_BLUE_SOFT, C_BLUE_BORDER)
    ]

    left = Inches(0.8)
    for title, subtitle, desc, accent, bg_color, border_color in cards_data:
        card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(1.8), Inches(3.64), Inches(4.8))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_BORDER
        card.line.width = Pt(1.5)

        # Top Accent Header Box
        h_box = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), Inches(2.0), Inches(3.24), Inches(0.65))
        h_box.fill.solid()
        h_box.fill.fore_color.rgb = bg_color
        h_box.line.color.rgb = border_color
        h_box.line.width = Pt(1)
        tf_h = h_box.text_frame
        p_h = tf_h.paragraphs[0]
        p_h.text = title
        p_h.font.size = Pt(13)
        p_h.font.bold = True
        p_h.font.color.rgb = accent
        p_h.alignment = PP_ALIGN.CENTER

        # Text content
        tb = s2.shapes.add_textbox(left + Inches(0.25), Inches(2.8), Inches(3.14), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = subtitle
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = C_TEXT

        p2 = tf.add_paragraph()
        p2.text = "\n" + desc
        p2.font.size = Pt(11.5)
        p2.font.color.rgb = C_TEXT_BODY

        left += Inches(4.04)

    s2.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "Sir, our current reliance on group chats and ordinary SMS poses three dangerous vulnerabilities during Red Alert conditions:\n"
        "1. Sleep and Silent Modes: Over 70% of reservists keep their phones on silent or Do Not Disturb. A standard SMS ding cannot wake a sleeping soldier.\n"
        "2. Infrastructure Fragility: Messenger and Viber collapse when data lines or electrical grids fail.\n"
        "3. Zero Headcount Visibility: Commanders blast an announcement into a chat and have no real-time telemetry on who actually received the mobilization order."
    )

    # ==========================================
    # SLIDE 3: THE RESCOM-ALERT SOLUTION
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_top_nav(s3, "System Solution", "The 2-Pillar Tactical Architecture", 3)

    pillars = [
        ("PILLAR 1: COMMAND WEB CONSOLE", 
         "Mission Control for Officers & Operations Staff",
         [
             "Real-time Reservist Roster segmented by CDC Units (1001st, 1002nd, etc.)",
             "Instant 1-Click Red Alert & Disaster Mobilization Siren Dispatch",
             "Passcode-secured Self-Enlistment with Command Review & Approval",
             "Live Download Telemetry with 1-phone = 1-headcount deduplication"
         ],
         C_PRIMARY, C_PRIMARY_SOFT, C_PRIMARY_BORDER),
        ("PILLAR 2: SOLDIER MOBILE ENGINE", 
         "Tactical Companion App on Android (Offline-Ready)",
         [
             "Hardware USAGE_ALARM override: sounds siren at max volume on Silent/Mute/DND",
             "Full-screen lockscreen takeover: turns on device screen with 10RCDG emblem",
             "Works 100% offline via SMS payload (Zero internet data required)",
             "One-tap acknowledgment: 'I RECEIVED THIS ORDER' receipt confirmation"
         ],
         C_BLUE, C_BLUE_SOFT, C_BLUE_BORDER)
    ]

    left = Inches(0.8)
    for title, subtitle, bullets, accent, bg_soft, border_col in pillars:
        card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(1.8), Inches(5.66), Inches(4.8))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_BORDER
        card.line.width = Pt(1.5)

        # Header tag
        tag = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.3), Inches(2.1), Inches(5.06), Inches(0.6))
        tag.fill.solid()
        tag.fill.fore_color.rgb = bg_soft
        tag.line.color.rgb = border_col
        tag.line.width = Pt(1)
        tf_t = tag.text_frame
        p_t = tf_t.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = accent
        p_t.alignment = PP_ALIGN.CENTER

        tb = s3.shapes.add_textbox(left + Inches(0.4), Inches(2.9), Inches(4.86), Inches(3.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = subtitle + "\n"
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = C_TEXT

        for b in bullets:
            p = tf.add_paragraph()
            p.text = "✓  " + b
            p.font.size = Pt(11.5)
            p.font.color.rgb = C_TEXT_BODY

        left += Inches(6.06)

    s3.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "To solve this, we developed a dual-pillar system:\n"
        "Pillar 1 is our centralized Command Web Console where headquarters officers manage personnel, monitor rosters, and fire alerts.\n"
        "Pillar 2 is the Native Android Companion App installed on every reservist's phone. Even without internet, when an official SMS hits the phone, the app's native background service intercepts it, overrides all volume and DND settings, wakes up the screen, and sounds a persistent tactical siren until acknowledged."
    )

    # ==========================================
    # SLIDE 4: HOW THE HARDWARE ALARM WORKS
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_top_nav(s4, "Technical Architecture", "Under the Hood: Native Alarm & Audio Override", 4)

    steps = [
        ("01", "SMS DISPATCH", "Headquarters sends structured mobilization order via gateway.", C_PRIMARY, C_PRIMARY_SOFT),
        ("02", "BACKGROUND INTERCEPT", "SmsAlertReceiver intercepts SMS at Android OS level (even if app is closed).", C_BLUE, C_BLUE_SOFT),
        ("03", "AUDIO STREAM OVERRIDE", "TacticalAlarmManager forces USAGE_ALARM stream at maximum hardware volume.", C_AMBER, C_AMBER_SOFT),
        ("04", "SCREEN WAKE TAKEOVER", "AlarmManager launches AlertActivity, waking screen over keyguard/lock screen.", C_RED, C_RED_SOFT),
        ("05", "OFFICER ACKNOWLEDGMENT", "Troop taps '✓ I Received This Order', killing siren and logging response.", C_PRIMARY, C_PRIMARY_SOFT)
    ]

    top = Inches(1.8)
    for num, title, desc, accent, bg_pill in steps:
        box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), top, Inches(11.733), Inches(0.88))
        box.fill.solid()
        box.fill.fore_color.rgb = C_CARD
        box.line.color.rgb = C_BORDER
        box.line.width = Pt(1.5)

        # Number Badge
        nb = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), top + Inches(0.14), Inches(0.6), Inches(0.6))
        nb.fill.solid()
        nb.fill.fore_color.rgb = bg_pill
        nb.line.color.rgb = accent
        nb.line.width = Pt(1)
        tf_nb = nb.text_frame
        p_nb = tf_nb.paragraphs[0]
        p_nb.text = num
        p_nb.font.size = Pt(12)
        p_nb.font.bold = True
        p_nb.font.color.rgb = accent
        p_nb.alignment = PP_ALIGN.CENTER

        # Step Title Box
        st_box = s4.shapes.add_textbox(Inches(1.8), top + Inches(0.14), Inches(3.0), Inches(0.6))
        tf_st = st_box.text_frame
        tf_st.margin_left = tf_st.margin_top = tf_st.margin_right = tf_st.margin_bottom = 0
        p = tf_st.paragraphs[0]
        p.text = title
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = C_TEXT

        # Description
        d_box = s4.shapes.add_textbox(Inches(5.0), top + Inches(0.14), Inches(7.3), Inches(0.6))
        tf_d = d_box.text_frame
        tf_d.margin_left = tf_d.margin_top = tf_d.margin_right = tf_d.margin_bottom = 0
        p = tf_d.paragraphs[0]
        p.text = desc
        p.font.size = Pt(12)
        p.font.color.rgb = C_TEXT_BODY

        top += Inches(1.0)

    s4.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "Here is how the native Android architecture guarantees 100% penetration:\n"
        "Even when the soldier's phone is locked, asleep, and in their pocket, the native Android SmsAlertReceiver listens at the OS level.\n"
        "It uses the Android ALARM_CLOCK category — the exact same privileged channel used by your morning clock alarm. It bypasses Silent, Mute, and Do Not Disturb, maximizes hardware volume, and forces the display on with the official 10RCDG emblem."
    )

    # ==========================================
    # SLIDE 5: LIVE DEMONSTRATION WORKFLOW
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_top_nav(s5, "Operational Demo", "Live Demonstration Phase (Hands-On Proof)", 5)

    demo_phases = [
        ("STAGE 1: THE DISPATCH", "Headquarters Command Console", 
         "1. Officer logs into secure Command Console.\n2. Selects Target CDC Unit (e.g. 1001st CDC).\n3. Enters mobilization directive.\n4. Clicks 'TRANSMIT EMERGENCY SIREN'.",
         C_PRIMARY, C_PRIMARY_SOFT),
        ("STAGE 2: THE RECEPTION", "Soldier Device (Locked & Muted)", 
         "1. Phone is intentionally set to Silent / Mute.\n2. SMS arrives at device.\n3. Screen wakes up with circular 10RCDG emblem.\n4. High-priority siren sounds at max volume.",
         C_AMBER, C_AMBER_SOFT),
        ("STAGE 3: THE READINESS", "Accountability & Receipt", 
         "1. Soldier views urgent orders and drill code.\n2. Soldier taps '✓ I RECEIVED THIS ORDER'.\n3. Siren silences immediately.\n4. Command console logs troop acknowledgment.",
         C_BLUE, C_BLUE_SOFT)
    ]

    left = Inches(0.8)
    for title, subtitle, content, accent, bg_soft in demo_phases:
        card = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(1.8), Inches(3.64), Inches(4.8))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_BORDER
        card.line.width = Pt(1.5)

        h_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), Inches(2.0), Inches(3.24), Inches(0.55))
        h_box.fill.solid()
        h_box.fill.fore_color.rgb = bg_soft
        h_box.line.color.rgb = accent
        h_box.line.width = Pt(1)
        tf_h = h_box.text_frame
        p_h = tf_h.paragraphs[0]
        p_h.text = title
        p_h.font.size = Pt(12)
        p_h.font.bold = True
        p_h.font.color.rgb = accent
        p_h.alignment = PP_ALIGN.CENTER

        tb = s5.shapes.add_textbox(left + Inches(0.25), Inches(2.7), Inches(3.14), Inches(3.7))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = subtitle + "\n"
        p.font.size = Pt(12.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT

        for line in content.split("\n"):
            p = tf.add_paragraph()
            p.text = line
            p.font.size = Pt(11)
            p.font.color.rgb = C_TEXT_BODY

        left += Inches(4.04)

    s5.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "[PAUSE FOR LIVE DEMO]\n"
        "Sir, at this moment, I invite you to observe my test device. As you can see, this phone is currently muted and locked.\n"
        "From our Command Portal, I will now transmit a live drill alert...\n"
        "[FIRE SMS ALERT]\n"
        "As you can hear and see, the phone instantly wakes up, overrides the mute switch, displays the 10RCDG emblem, and sounds the tactical siren. The troop taps 'I Received This Order' to stop the alarm and register compliance."
    )

    # ==========================================
    # SLIDE 6: THE REGULATORY BOTTLENECK (THE PITCH FOR SENDER ID)
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_top_nav(s6, "Strategic Requirement", "The National Telecom Barrier: Why We Need SENDER ID", 6)

    # Left: Current Prototype Limitation
    c1 = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.66), Inches(4.8))
    c1.fill.solid()
    c1.fill.fore_color.rgb = C_CARD
    c1.line.color.rgb = C_RED_BORDER
    c1.line.width = Pt(1.5)

    badge_l = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.1), Inches(2.1), Inches(5.06), Inches(0.55))
    badge_l.fill.solid()
    badge_l.fill.fore_color.rgb = C_RED_SOFT
    badge_l.line.color.rgb = C_RED_BORDER
    badge_l.line.width = Pt(1)
    tf = badge_l.text_frame
    p = tf.paragraphs[0]
    p.text = "CURRENT PROTOTYPE (SIM GATEWAY)"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_RED
    p.alignment = PP_ALIGN.CENTER

    tb1 = s6.shapes.add_textbox(Inches(1.1), Inches(2.8), Inches(5.06), Inches(3.6))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p = tf1.paragraphs[0]
    p.text = "Peer-to-Peer SIM Limitations (Globe / Smart / DITO):\n"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT

    bullets1 = [
        "NTC Mandate: Telcos aggressively block all web links (.com, .app) on SIM traffic to fight smishing scams.",
        "Throughput Bottleneck: Max 10–15 SMS per minute; inadequate for 1,000+ regional troops during fast mobilization.",
        "Unknown Sender: Appears as an ordinary 11-digit number (e.g. 0917-xxx-xxxx); soldiers suspect it is spam.",
        "Carrier Ban Risk: High burst volumes can cause telcos to temporarily flag and suspend the physical SIM."
    ]
    for b in bullets1:
        p = tf1.add_paragraph()
        p.text = "✗  " + b
        p.font.size = Pt(11)
        p.font.color.rgb = C_RED_DARK

    # Right: The Solution (Official SENDER ID)
    c2 = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.86), Inches(1.8), Inches(5.66), Inches(4.8))
    c2.fill.solid()
    c2.fill.fore_color.rgb = C_CARD
    c2.line.color.rgb = C_PRIMARY_BORDER
    c2.line.width = Pt(1.5)

    badge_r = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.16), Inches(2.1), Inches(5.06), Inches(0.55))
    badge_r.fill.solid()
    badge_r.fill.fore_color.rgb = C_PRIMARY_SOFT
    badge_r.line.color.rgb = C_PRIMARY_BORDER
    badge_r.line.width = Pt(1)
    tf = badge_r.text_frame
    p = tf.paragraphs[0]
    p.text = "ENTERPRISE ALPHANUMERIC SENDER ID"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_PRIMARY
    p.alignment = PP_ALIGN.CENTER

    tb2 = s6.shapes.add_textbox(Inches(7.16), Inches(2.8), Inches(5.06), Inches(3.6))
    tf2 = tb2.text_frame
    tf2.word_wrap = True

    p = tf2.paragraphs[0]
    p.text = "Carrier A2P Whitelist (e.g. '10RCDG' or 'RESCOM-PA'):\n"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT

    bullets2 = [
        "100% Delivery Whitelist: Fully exempt from carrier anti-spam firewalls; permits safe delivery of official app links.",
        "Ultra-High Throughput: Dispatches 100+ SMS/sec; notifies 1,000+ troops in under 15 seconds.",
        "Official Military Branding: Recipient sees '10RCDG' directly in SMS header — eliminates doubt or suspicion.",
        "Carrier SLA Guarantee: 99.99% operational uptime backed by Smart, Globe, and DITO national backbones."
    ]
    for b in bullets2:
        p = tf2.add_paragraph()
        p.text = "✓  " + b
        p.font.size = Pt(11)
        p.font.color.rgb = C_PRIMARY_TEXT

    s6.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "Now, Sir, this brings us to the core objective of today's defense: securing budget for an Official Telco Alphanumeric SENDER ID.\n"
        "Currently, our proof-of-concept operates via a physical SIM gateway. While it proves the software works, Philippine NTC regulations mandate that telcos block all web links sent from personal SIMs, and SIMs are rate-limited to just a few messages per minute.\n"
        "With an official SENDER ID — such as '10RCDG' or 'RESCOM-PA' — our dispatches bypass all spam firewalls, deliver at 100 SMS per second, and bear the proud, official military header that troops trust immediately."
    )

    # ==========================================
    # SLIDE 7: BUDGET & RESOURCE REQUIREMENTS
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_top_nav(s7, "Resource Allocation", "Budget Proposal & Implementation Investment", 7)

    # Table of investment
    table_shape = s7.shapes.add_table(5, 4, Inches(0.8), Inches(1.8), Inches(11.733), Inches(3.6))
    table = table_shape.table

    table.columns[0].width = Inches(3.0)
    table.columns[1].width = Inches(4.5)
    table.columns[2].width = Inches(2.2)
    table.columns[3].width = Inches(2.033)

    headers = ["Item / Component", "Operational Purpose", "Provider / Channel", "Estimated Allocation"]
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_PRIMARY
        for p in cell.text_frame.paragraphs:
            p.font.bold = True
            p.font.size = Pt(11)
            p.font.color.rgb = RGBColor(255, 255, 255)

    rows = [
        ("Official SENDER ID Registration", "Registration of '10RCDG' or 'RESCOM-PA' with NTC & Telcos", "Telco A2P (Smart / Globe)", "One-Time Setup Fee"),
        ("SMS Bulk Credit Allocation", "Credit pool for periodic drills, disaster warnings & red alert recall", "Telco Direct / Enterprise Tier", "Quarterly Operating Fund"),
        ("Cloud Infrastructure & Database", "24/7 High-availability server for real-time troop roster & tracking", "Convex / Vercel Enterprise", "Annual Server Maintenance"),
        ("Maintenance & Security Updates", "Android OS patch compatibility (Android 14/15/16) and cipher security", "USTP Dev / 10RCDG Cyber Team", "Institutional Partnership")
    ]

    for row_idx, data in enumerate(rows):
        for col_idx, text in enumerate(data):
            cell = table.cell(row_idx + 1, col_idx)
            cell.text = text
            cell.fill.solid()
            cell.fill.fore_color.rgb = C_CARD if row_idx % 2 == 0 else C_SUBTLE
            for p in cell.text_frame.paragraphs:
                p.font.size = Pt(10.5)
                p.font.color.rgb = C_TEXT_BODY

    # Summary callout below table
    callout = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.65), Inches(11.733), Inches(1.05))
    callout.fill.solid()
    callout.fill.fore_color.rgb = C_PRIMARY_SOFT
    callout.line.color.rgb = C_PRIMARY_BORDER
    callout.line.width = Pt(1)
    tb = callout.text_frame
    p = tb.paragraphs[0]
    p.text = "STRATEGIC VALUE PROPOSITION:"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_PRIMARY_TEXT
    p = tb.add_paragraph()
    p.text = "For a fraction of the cost of commercial foreign emergency software, 10RCDG secures a tailored, sovereign defense asset that delivers instantaneous regional command control over thousands of reservists."
    p.font.size = Pt(11)
    p.font.color.rgb = C_TEXT_BODY

    s7.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "Here is the budgetary roadmap, Sir.\n"
        "The software architecture itself is already 100% built and functional — there is zero development lag.\n"
        "The investment requested today is strictly for telco carrier onboarding: the one-time NTC/Telco Sender ID registration fee and a quarterly SMS allocation pool for operational exercises and real-world disaster activations."
    )

    # ==========================================
    # SLIDE 8: ROLLOUT ROADMAP
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_top_nav(s8, "Operational Phases", "Deployment Roadmap & Implementation Schedule", 8)

    phases = [
        ("PHASE 1 (COMPLETED)", "POC & Field Testing", "October 2026",
         "• Full-stack Next.js Command Portal built\n• Android lockscreen siren engine verified\n• Public download portal (/download) live\n• Offline SMS receiver validated on devices",
         C_PRIMARY, C_PRIMARY_SOFT),
        ("PHASE 2 (CURRENT)", "SENDER ID & Carrier Link", "November 2026",
         "• File NTC accreditation documents\n• Onboard Smart & Globe A2P accounts\n• Register official '10RCDG' Sender ID\n• Configure high-speed SMS API gateway",
         C_BLUE, C_BLUE_SOFT),
        ("PHASE 3 (DEPLOYMENT)", "Regional CDC Rollout", "December 2026",
         "• Sideload distribution across 1001st-1005th CDCs\n• Conduct scheduled Command Comms Check\n• Integrate battalion roster databases\n• Full operational readiness handover",
         C_AMBER, C_AMBER_SOFT)
    ]

    left = Inches(0.8)
    for title, subtitle, date_tag, bullets, accent, bg_soft in phases:
        card = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(1.8), Inches(3.64), Inches(4.8))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD
        card.line.color.rgb = C_BORDER
        card.line.width = Pt(1.5)

        h_box = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), Inches(2.0), Inches(3.24), Inches(0.65))
        h_box.fill.solid()
        h_box.fill.fore_color.rgb = bg_soft
        h_box.line.color.rgb = accent
        h_box.line.width = Pt(1)
        tf_h = h_box.text_frame
        p_h = tf_h.paragraphs[0]
        p_h.text = f"{date_tag.upper()} • {title}"
        p_h.font.size = Pt(11)
        p_h.font.bold = True
        p_h.font.color.rgb = accent
        p_h.alignment = PP_ALIGN.CENTER

        tb = s8.shapes.add_textbox(left + Inches(0.25), Inches(2.8), Inches(3.14), Inches(3.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = subtitle + "\n"
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = C_TEXT

        for line in bullets.split("\n"):
            p = tf.add_paragraph()
            p.text = line
            p.font.size = Pt(11)
            p.font.color.rgb = C_TEXT_BODY

        left += Inches(4.04)

    s8.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "Our rollout schedule is agile and immediate.\n"
        "Phase 1 is already finished and operating today.\n"
        "Upon funding approval, Phase 2 takes 2 to 3 weeks for carrier paperwork and SENDER ID whitelisting.\n"
        "By December, all Community Defense Centers under 10RCDG can be fully onboarded and drilled."
    )

    # ==========================================
    # SLIDE 9: CONCLUSION & ACTION (Consistent Light Theme)
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)

    card9 = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(0.8), Inches(10.333), Inches(5.9))
    card9.fill.solid()
    card9.fill.fore_color.rgb = C_CARD
    card9.line.color.rgb = C_BORDER
    card9.line.width = Pt(1.5)

    # Emblems
    if os.path.exists(logo_path):
        s9.shapes.add_picture(logo_path, Inches(5.6), Inches(1.2), width=Inches(1.0))
    if os.path.exists(seal_path):
        s9.shapes.add_picture(seal_path, Inches(6.8), Inches(1.2), width=Inches(1.0))

    # Badge pill
    badge9 = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.8), Inches(2.35), Inches(5.7), Inches(0.38))
    badge9.fill.solid()
    badge9.fill.fore_color.rgb = C_PRIMARY_SOFT
    badge9.line.color.rgb = C_PRIMARY_BORDER
    badge9.line.width = Pt(1)
    tf = badge9.text_frame
    p = tf.paragraphs[0]
    p.text = "EMPOWERING 10RCDG WITH MISSION-CRITICAL READINESS"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_PRIMARY_TEXT
    p.alignment = PP_ALIGN.CENTER

    tbox9 = s9.shapes.add_textbox(Inches(2.0), Inches(2.9), Inches(9.333), Inches(2.3))
    tf9 = tbox9.text_frame
    tf9.word_wrap = True

    p = tf9.paragraphs[0]
    p.text = "“When Every Second Counts, Silence is Not an Option.”"
    p.font.size = Pt(30)
    p.font.bold = True
    p.font.color.rgb = C_TEXT
    p.alignment = PP_ALIGN.CENTER

    p2 = tf9.add_paragraph()
    p2.text = "\nThank you, Sir / Ma'am. The floor is now open for questions, technical inquiry, and live inspection."
    p2.font.size = Pt(15)
    p2.font.bold = True
    p2.font.color.rgb = C_PRIMARY_TEXT
    p2.alignment = PP_ALIGN.CENTER

    # Presenter Pill Box
    p_box9 = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3.2), Inches(5.35), Inches(6.9), Inches(0.8))
    p_box9.fill.solid()
    p_box9.fill.fore_color.rgb = C_SUBTLE
    p_box9.line.color.rgb = C_BORDER
    p_box9.line.width = Pt(1)
    tf_p9 = p_box9.text_frame
    tf_p9.word_wrap = True

    p = tf_p9.paragraphs[0]
    p.text = "Javier Siliacay (aka vier from USTP Autotronics)  •  Lead Developer"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT
    p.alignment = PP_ALIGN.CENTER

    p2 = tf_p9.add_paragraph()
    p2.text = "10RCDG RESCOM-ALERT Project  •  October 2026"
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.alignment = PP_ALIGN.CENTER

    add_footer(s9, 9, 9)

    s9.notes_slide.notes_text_frame.text = (
        "SPEAKER SCRIPT:\n"
        "In closing, Colonel and members of the Command Staff: during severe weather disasters or urgent territorial defense mobilization, seconds save lives. We cannot afford to have critical orders sitting silently in a locked phone.\n"
        "RESCOM-ALERT ensures that every command reaches its target with audible force and instant accountability.\n"
        "Thank you very much, Sir/Ma'am. I am ready to answer any questions or demonstrate any part of the system."
    )

    output_path = os.path.abspath("10RCDG_RESCOM_ALERT_Deck.pptx")
    prs.save(output_path)
    print(f"Presentation successfully updated at: {output_path}")

    public_path = os.path.abspath("public/10RCDG_RESCOM_ALERT_Deck.pptx")
    try:
        prs.save(public_path)
    except Exception as e:
        pass

if __name__ == "__main__":
    create_system_deck()
