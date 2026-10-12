/**
 * Hardware Device Identification & Telemetry Helpers
 * Used across /download and /enlist to fingerprint physical hardware
 * and enforce single-device anti-impersonation security.
 */

export function getPersistentDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let storedId = localStorage.getItem("rescom_device_id");
    if (!storedId) {
      storedId = "dev_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem("rescom_device_id", storedId);
    }
    return storedId;
  } catch {
    return "dev_" + Math.random().toString(36).substring(2, 10);
  }
}

export function parseDeviceDetails(ua: string): { model: string; os: string } {
  let os = "Android";
  const osMatch = ua.match(/Android\s([0-9.]+)/i);
  if (osMatch) {
    os = `Android ${osMatch[1]}`;
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "iOS";
  } else if (/Windows/i.test(ua)) {
    os = "Windows";
  } else if (/Mac/i.test(ua)) {
    os = "macOS";
  }

  let model = "Android Device";
  // Look for build model in user agent, e.g. "; SM-A546E Build/" or "; 2201116SG Build/" or "; RMX3085 Build/"
  const modelMatch = ua.match(/;\s([^;]+)\sBuild\//i);
  if (modelMatch && modelMatch[1]) {
    const raw = modelMatch[1].trim();
    if (/SM-[A-Z0-9]+/i.test(raw)) {
      model = `Samsung Galaxy (${raw})`;
    } else {
      model = raw;
    }
  } else if (/SM-[A-Z0-9]+/i.test(ua)) {
    const sm = ua.match(/SM-[A-Z0-9]+/i);
    model = `Samsung Galaxy (${sm ? sm[0] : "A-Series"})`;
  } else if (/Samsung/i.test(ua)) {
    model = "Samsung Galaxy";
  } else if (/Realme/i.test(ua)) {
    model = "Realme Device";
  } else if (/Redmi|POCO|Xiaomi/i.test(ua)) {
    model = "Xiaomi / Redmi";
  } else if (/Oppo/i.test(ua)) {
    model = "Oppo Device";
  } else if (/Vivo/i.test(ua)) {
    model = "Vivo Device";
  } else if (/Infinix/i.test(ua)) {
    model = "Infinix Device";
  } else if (/Tecno/i.test(ua)) {
    model = "Tecno Device";
  } else if (/iPhone/i.test(ua)) {
    model = "Apple iPhone";
  }

  return { model, os };
}
