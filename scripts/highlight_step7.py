from PIL import Image, ImageDraw

# Open Step7.jpg
img = Image.open('public/installation-guide/Step7.jpg').convert('RGB')
w, h = img.size
print(f"Dimensions: {w}x{h}")

# The toggle switch for "Scan apps with Play Protect" is at top right
# Dimensions are roughly 1080x2160 or similar
# Toggle box:
toggle_box = (int(w * 0.79), int(h * 0.185), int(w * 0.98), int(h * 0.245))

draw = ImageDraw.Draw(img)
# Draw thick emerald highlighting rectangle
for i in range(7):
    b = (toggle_box[0] - i, toggle_box[1] - i, toggle_box[2] + i, toggle_box[3] + i)
    draw.rectangle(b, outline="#10B981")

img.save('public/installation-guide/Step7.jpg', 'JPEG', quality=95)
print("Step7.jpg highlighted successfully!")
