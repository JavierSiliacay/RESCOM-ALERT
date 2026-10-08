import os
from PIL import Image, ImageDraw, ImageFont

def generate_flow_diagram():
    # Crisp 2x Retina resolution
    W, H = 1460, 480
    
    # Clean background
    img = Image.new("RGBA", (W, H), (255, 255, 255, 0)) # transparent outer
    draw = ImageDraw.Draw(img)
    
    # Outer container with subtle border & background
    draw.rounded_rectangle(
        [(10, 10), (W - 10, H - 10)],
        radius=24,
        fill=(248, 250, 252), # slate-50
        outline=(226, 232, 240), # slate-200
        width=2
    )
    
    font_bold = "C:/Windows/Fonts/segoeuib.ttf"
    font_regular = "C:/Windows/Fonts/segoeui.ttf"
    font_semibold = "C:/Windows/Fonts/seguisb.ttf" if os.path.exists("C:/Windows/Fonts/seguisb.ttf") else font_bold
    
    f_step = ImageFont.truetype(font_bold, 17)
    f_title = ImageFont.truetype(font_bold, 21)
    f_sub = ImageFont.truetype(font_regular, 15)
    f_sub_bold = ImageFont.truetype(font_bold, 15)
    f_arrow_lbl = ImageFont.truetype(font_bold, 12)
    
    steps = [
        {
            "num": "1. DISPATCH",
            "icon": "public/icons_diagram/icon_web.png",
            "title": "Command Web Portal",
            "line1": "Officer transmits emergency",
            "line2": "order to target battalions",
            "badge_bg": (236, 253, 245),
            "badge_border": (167, 243, 208),
            "badge_text": (6, 95, 70),
            "top_bar": (5, 150, 105),
            "arrow_label": "CELLULAR SMS"
        },
        {
            "num": "2. TRANSMIT",
            "icon": "public/icons_diagram/icon_tower.png",
            "title": "Cellular Airwaves",
            "line1": "Smart / Globe / DITO network",
            "line2": "(Zero internet / data needed)",
            "badge_bg": (239, 246, 255),
            "badge_border": (191, 219, 254),
            "badge_text": (29, 78, 216),
            "top_bar": (37, 99, 235),
            "arrow_label": "AIRWAVE SIREN"
        },
        {
            "num": "3. SIREN WAKE",
            "icon": "public/icons_diagram/icon_phone.png",
            "title": "Soldier's Phone",
            "line1": "LOUD SIREN SOUNDS!",
            "line2": "Screen wakes up even on silent",
            "badge_bg": (254, 242, 242),
            "badge_border": (254, 202, 202),
            "badge_text": (220, 38, 38),
            "top_bar": (239, 68, 68),
            "arrow_label": "MUSTERING"
        },
        {
            "num": "4. COMPLIANCE",
            "icon": "public/icons_diagram/icon_check.png",
            "title": "Troop Headcount",
            "line1": "Soldier taps to stop siren",
            "line2": "and confirm readiness",
            "badge_bg": (236, 253, 245),
            "badge_border": (167, 243, 208),
            "badge_text": (4, 120, 87),
            "top_bar": (16, 185, 129),
            "arrow_label": ""
        }
    ]
    
    card_w = 270
    card_h = 390
    card_y = 45
    gap = 62
    start_x = 45
    
    for i, s in enumerate(steps):
        x = start_x + i * (card_w + gap)
        
        # Draw Card Background (White Card with subtle shadow/border)
        draw.rounded_rectangle(
            [(x, card_y), (x + card_w, card_y + card_h)],
            radius=18,
            fill=(255, 255, 255),
            outline=(226, 232, 240),
            width=2
        )
        
        # Color Accent Top Strip
        draw.rounded_rectangle(
            [(x + 1, card_y + 1), (x + card_w - 1, card_y + 8)],
            radius=4,
            fill=s["top_bar"]
        )
        
        # Step Number Badge
        bw, bh = 145, 34
        bx = x + (card_w - bw) // 2
        by = card_y + 22
        draw.rounded_rectangle(
            [(bx, by), (bx + bw, by + bh)],
            radius=17,
            fill=s["badge_bg"],
            outline=s["badge_border"],
            width=1
        )
        bbox = draw.textbbox((0, 0), s["num"], font=f_step)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((bx + (bw - tw) // 2, by + (bh - th) // 2 - 2), s["num"], fill=s["badge_text"], font=f_step)
        
        # Icon
        if os.path.exists(s["icon"]):
            icon = Image.open(s["icon"]).convert("RGBA")
            icon = icon.resize((100, 100), Image.Resampling.LANCZOS)
            icon_x = x + (card_w - 100) // 2
            icon_y = card_y + 72
            img.paste(icon, (icon_x, icon_y), icon)
            
        # Title
        bbox_t = draw.textbbox((0, 0), s["title"], font=f_title)
        tw_t = bbox_t[2] - bbox_t[0]
        draw.text((x + (card_w - tw_t) // 2, card_y + 198), s["title"], fill=(15, 23, 42), font=f_title)
        
        # Subtle Divider line
        draw.line([(x + 25, card_y + 242), (x + card_w - 25, card_y + 242)], fill=(241, 245, 249), width=2)
        
        # Description Line 1
        bbox_l1 = draw.textbbox((0, 0), s["line1"], font=f_sub_bold if i == 2 else f_sub)
        tw_l1 = bbox_l1[2] - bbox_l1[0]
        c1 = (220, 38, 38) if i == 2 else (71, 85, 105)
        f1 = f_sub_bold if i == 2 else f_sub
        draw.text((x + (card_w - tw_l1) // 2, card_y + 266), s["line1"], fill=c1, font=f1)
        
        # Description Line 2
        bbox_l2 = draw.textbbox((0, 0), s["line2"], font=f_sub_bold if i == 1 else f_sub)
        tw_l2 = bbox_l2[2] - bbox_l2[0]
        c2 = (29, 78, 216) if i == 1 else (100, 116, 139)
        f2 = f_sub_bold if i == 1 else f_sub
        draw.text((x + (card_w - tw_l2) // 2, card_y + 296), s["line2"], fill=c2, font=f2)
        
        # Geometric Arrow Connector to next card
        if i < 3:
            mid_x = x + card_w + gap // 2
            mid_y = card_y + card_h // 2
            
            # Subtle circle backdrop for arrow
            draw.ellipse(
                [(mid_x - 18, mid_y - 18), (mid_x + 18, mid_y + 18)],
                fill=(241, 245, 249),
                outline=(203, 213, 225),
                width=1
            )
            
            # Clean geometric right-arrow shape
            aw = 18
            ax1 = mid_x - aw // 2
            ax2 = mid_x + aw // 2
            
            # Arrow line & head
            draw.line([(ax1, mid_y), (ax2 - 2, mid_y)], fill=(71, 85, 105), width=3)
            # Arrow head polygon
            draw.polygon(
                [
                    (ax2 + 3, mid_y),
                    (ax2 - 6, mid_y - 6),
                    (ax2 - 4, mid_y),
                    (ax2 - 6, mid_y + 6)
                ],
                fill=(71, 85, 105)
            )
            
    output_path = "public/system-flow-diagram.png"
    img.save(output_path, "PNG", quality=95)
    print(f"Refined diagram created at {output_path}")

if __name__ == "__main__":
    generate_flow_diagram()
