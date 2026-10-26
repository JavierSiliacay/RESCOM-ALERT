from PIL import Image, ImageDraw

# Open Step7.jpg
img = Image.open('public/installation-guide/Step7.jpg').convert('RGB')
w, h = img.size

# High-contrast bold drawing
draw = ImageDraw.Draw(img)

# 1. Broad bounding box covering the entire row and toggle
# Left starts around 77% of width, top 17.5%, right 99%, bottom 25.5%
x1 = int(w * 0.77)
y1 = int(h * 0.175)
x2 = int(w * 0.99)
y2 = int(h * 0.255)

# Draw thick border (14 pixels wide) with bright vibrant emerald
for i in range(14):
    draw.rounded_rectangle((x1 - i, y1 - i, x2 + i, y2 + i), radius=20, outline="#00FF88")

# Save as Step_PlayProtect_Toggle.jpg to completely avoid browser cache
img.save('public/installation-guide/Step_PlayProtect_Toggle.jpg', 'JPEG', quality=95)
img.save('public/installation-guide/Step7.jpg', 'JPEG', quality=95)
print("Saved Step_PlayProtect_Toggle.jpg and Step7.jpg with high-contrast box!")
