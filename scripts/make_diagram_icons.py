import os
from PIL import Image, ImageDraw

os.makedirs("public/icons_diagram", exist_ok=True)

def draw_circle_bg(draw, size, bg_color):
    draw.ellipse([8, 8, size - 8, size - 8], fill=bg_color)

# 1. Web Portal / Laptop Icon
def make_web_icon():
    size = 256
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    draw_circle_bg(d, size, (236, 253, 245, 255)) # emerald-50
    
    # Laptop screen
    d.rounded_rectangle([52, 68, 204, 160], radius=10, fill=(6, 95, 70), outline=(4, 120, 87), width=4)
    # Screen inner display
    d.rectangle([62, 78, 194, 150], fill=(248, 250, 252))
    # Browser bar dots
    d.ellipse([70, 86, 76, 92], fill=(239, 68, 68))
    d.ellipse([82, 86, 88, 92], fill=(245, 158, 11))
    d.ellipse([94, 86, 100, 92], fill=(16, 185, 129))
    # Code / dashboard lines inside display
    d.rounded_rectangle([70, 104, 186, 112], radius=3, fill=(16, 185, 129))
    d.rounded_rectangle([70, 120, 140, 126], radius=3, fill=(100, 116, 139))
    d.rounded_rectangle([70, 134, 165, 140], radius=3, fill=(148, 163, 184))
    # Laptop base
    d.rounded_rectangle([36, 162, 220, 178], radius=6, fill=(15, 23, 42))
    d.rounded_rectangle([106, 162, 150, 167], radius=3, fill=(148, 163, 184))
    
    img.save("public/icons_diagram/icon_web.png")

# 2. Cloud Gateway Icon
def make_cloud_icon():
    size = 256
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    draw_circle_bg(d, size, (239, 246, 255, 255)) # blue-50
    
    # Cloud shape
    d.ellipse([70, 100, 130, 160], fill=(29, 78, 216))
    d.ellipse([100, 75, 170, 145], fill=(29, 78, 216))
    d.ellipse([140, 100, 190, 155], fill=(29, 78, 216))
    d.rectangle([95, 120, 170, 160], fill=(29, 78, 216))
    
    # Inner sync arrows / API text
    d.polygon([(110, 138), (128, 122), (128, 132), (150, 132), (150, 144), (128, 144), (128, 154)], fill=(255, 255, 255))
    img.save("public/icons_diagram/icon_cloud.png")

# 3. Cell Tower / SMS Network Icon
def make_tower_icon():
    size = 256
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    draw_circle_bg(d, size, (239, 246, 255, 255)) # blue-50
    
    # Antenna Mast
    d.line([(128, 60), (90, 195)], fill=(15, 23, 42), width=6)
    d.line([(128, 60), (166, 195)], fill=(15, 23, 42), width=6)
    # Crossbars
    d.line([(102, 145), (154, 145)], fill=(15, 23, 42), width=5)
    d.line([(112, 108), (144, 108)], fill=(15, 23, 42), width=5)
    # Diagonal braces
    d.line([(102, 145), (144, 108)], fill=(100, 116, 139), width=3)
    d.line([(154, 145), (112, 108)], fill=(100, 116, 139), width=3)
    # Transmitter tip
    d.ellipse([120, 52, 136, 68], fill=(220, 38, 38))
    # Signal waves left
    d.arc([75, 45, 125, 95], start=120, end=240, fill=(29, 78, 216), width=5)
    d.arc([55, 25, 125, 115], start=120, end=240, fill=(29, 78, 216), width=5)
    # Signal waves right
    d.arc([131, 45, 181, 95], start=300, end=60, fill=(29, 78, 216), width=5)
    d.arc([131, 25, 201, 115], start=300, end=60, fill=(29, 78, 216), width=5)
    
    img.save("public/icons_diagram/icon_tower.png")

# 4. Android Phone Icon
def make_phone_icon():
    size = 256
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    draw_circle_bg(d, size, (255, 251, 235, 255)) # amber-50
    
    # Phone body
    d.rounded_rectangle([75, 45, 181, 211], radius=18, fill=(15, 23, 42), outline=(100, 116, 139), width=3)
    # Phone screen
    d.rounded_rectangle([85, 65, 171, 191], radius=8, fill=(248, 250, 252))
    # Speaker notch
    d.rounded_rectangle([112, 53, 144, 57], radius=2, fill=(148, 163, 184))
    
    # Siren bell / shield inside phone screen
    d.polygon([(128, 90), (105, 135), (151, 135)], fill=(217, 119, 6))
    d.rounded_rectangle([100, 135, 156, 142], radius=2, fill=(217, 119, 6))
    d.ellipse([122, 142, 134, 150], fill=(217, 119, 6))
    # Exclamation in bell
    d.line([(128, 102), (128, 120)], fill=(255, 255, 255), width=4)
    d.ellipse([126, 125, 130, 129], fill=(255, 255, 255))
    
    # Tap button below
    d.rounded_rectangle([92, 160, 164, 180], radius=5, fill=(6, 95, 70))
    # Checkmark inside button
    d.line([(106, 170), (113, 175), (124, 165)], fill=(255, 255, 255), width=3)
    
    img.save("public/icons_diagram/icon_phone.png")

# 5. Checkmark / Headcount Icon
def make_check_icon():
    size = 256
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    draw_circle_bg(d, size, (236, 253, 245, 255)) # emerald-50
    
    # Military Shield
    d.polygon([(128, 50), (185, 75), (185, 135), (128, 195), (71, 135), (71, 75)], fill=(6, 95, 70), outline=(4, 120, 87), width=4)
    # Checkmark inside shield
    d.line([(98, 122), (118, 145), (158, 98)], fill=(255, 255, 255), width=10)
    
    img.save("public/icons_diagram/icon_check.png")

make_web_icon()
make_cloud_icon()
make_tower_icon()
make_phone_icon()
make_check_icon()
print("All diagram icons created successfully!")
