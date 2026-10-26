import os
from PIL import Image, ImageDraw

def highlight_box(image_path, output_path, box, outline_color="#10B981", width=6):
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    # Draw rounded or rectangle box
    for i in range(width):
        b = (box[0] - i, box[1] - i, box[2] + i, box[3] + i)
        draw.rectangle(b, outline=outline_color)
    img.save(output_path, "JPEG", quality=90)

base = "public/installation-guide"

# 1. Location Dialog: (390 x 866 approx)
# Highlight "While using the app" button
img1 = Image.open(f"{base}/step_location_raw.png")
w, h = img1.size
# "While using the app" button is at bottom sheet
box_loc = (int(w * 0.1), int(h * 0.75), int(w * 0.9), int(h * 0.81))
highlight_box(f"{base}/step_location_raw.png", f"{base}/Step_Location.jpg", box_loc)

# 2. Notification Dialog:
# Highlight "Allow" button
img2 = Image.open(f"{base}/step_notification_raw.png")
w, h = img2.size
box_notif = (int(w * 0.1), int(h * 0.81), int(w * 0.9), int(h * 0.87))
highlight_box(f"{base}/step_notification_raw.png", f"{base}/Step_Notification.jpg", box_notif)

# 3. SMS Permission Dialog (Optional):
# Highlight "Allow" button (or Don't allow note)
img3 = Image.open(f"{base}/step_sms_raw.png")
w, h = img3.size
box_sms = (int(w * 0.1), int(h * 0.81), int(w * 0.9), int(h * 0.87))
highlight_box(f"{base}/step_sms_raw.png", f"{base}/Step_SMS.jpg", box_sms, outline_color="#3B82F6")

# 4. Phone Setup / Pairing modal
img4 = Image.open(f"{base}/step_phone_pair_raw.png")
w, h = img4.size
box_pair = (int(w * 0.08), int(h * 0.74), int(w * 0.92), int(h * 0.92))
highlight_box(f"{base}/step_phone_pair_raw.png", f"{base}/Step_Pairing.jpg", box_pair)

# 5. Duty Status / Armed Dashboard
img5 = Image.open(f"{base}/step_duty_status_raw.png")
img5.convert("RGB").save(f"{base}/Step_Armed_Status.jpg", "JPEG", quality=90)

print("Annotated guide images successfully created!")
