"use client";

import { useState } from "react";
import {
  Settings,
  Smartphone,
  Shield,
  Key,
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Wifi,
  BatteryCharging,
  Sliders,
  Check,
  Info,
} from "lucide-react";
import { DEFAULT_GATEWAY_CONFIG, SmsGatewayConfig } from "@/lib/sms";

export default function GatewaySettingsPage() {
  const [config, setConfig] = useState<SmsGatewayConfig>(DEFAULT_GATEWAY_CONFIG);
  const [isSaved, setIsSaved] = useState(false);

  // Test SMS Dispatcher State
  const [testNumber, setTestNumber] = useState("09171234567");
  const [testMessage, setTestMessage] = useState("10RCDG GATEWAY TEST: Communication link is operational.");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    mode?: string;
  } | null>(null);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [testNumber],
          message: testMessage,
          title: "GATEWAY TEST",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `SMS dispatched successfully (ID: ${data.messageId || "TX-OK"}).`,
          mode: data.mode,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Failed to dispatch test SMS.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Network error connecting to SMS API endpoint.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase mb-1">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            Hardware & Gateway Configuration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            SMS Gateway Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your Android phone gateway, TextBee API keys, and test live transmissions.
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-3 bg-white border border-emerald-200 px-4 py-2.5 rounded-xl shadow-xs self-start sm:self-auto">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gateway Status</div>
            <div className="text-xs font-bold text-emerald-800">Online & Ready</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: API Configuration & Hardware Specs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main API Settings Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100/60 text-emerald-800">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">TextBee Gateway API Credentials</h2>
                  <p className="text-xs text-slate-500">Connect to your 10RCDG Android dedicated SMS gateway phone</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  TextBee API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="Enter your TextBee API Key (e.g. txb_live_...)"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-mono"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Obtained from your TextBee dashboard under Device Settings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Target Device ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={config.deviceId}
                    onChange={(e) => setConfig({ ...config, deviceId: e.target.value })}
                    placeholder="Enter TextBee Device ID (e.g. dev_64fa...)"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-mono"
                  />
                  <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Default Unit Call Sign Prefix
                </label>
                <input
                  type="text"
                  value={config.senderPrefix}
                  onChange={(e) => setConfig({ ...config, senderPrefix: e.target.value })}
                  placeholder="[10RCDG ALERT]"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {isSaved && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Settings saved successfully.
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Configuration
                </button>
              </div>
            </form>
          </div>

          {/* Connected Gateway Hardware Telemetry Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registered Gateway Device</h3>
                  <p className="text-xs text-slate-500">Physical Android handset managing mass outgoing broadcasts</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Link
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  Handset Model
                </div>
                <div className="text-xs font-bold text-slate-800">{config.phoneModel}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase mb-1">
                  <Wifi className="w-3.5 h-3.5" />
                  SIM Carrier
                </div>
                <div className="text-xs font-bold text-slate-800">{config.simCarrier}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase mb-1">
                  <BatteryCharging className="w-3.5 h-3.5" />
                  Battery Level
                </div>
                <div className="text-xs font-bold text-emerald-700">{config.batteryLevel}% (Plugged In)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Instant Live SMS Test Tool */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-300" />
                <h3 className="text-sm font-bold">Live Transmission Test</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-800 px-2 py-0.5 rounded-md text-emerald-200">
                Diagnostics
              </span>
            </div>

            <form onSubmit={handleSendTestSms} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Dispatch an immediate test SMS to any mobile phone to confirm handset connectivity and SIM transmission.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Recipient Mobile Number
                </label>
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="09171234567"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Test Message
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed font-mono"
                  required
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <div>{testResult.message}</div>
                    {testResult.mode && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Mode: {testResult.mode}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isTesting}
                className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test SMS
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Guidance Info Card */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Shield className="w-4 h-4 text-amber-700" />
              Operational Protocol
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Ensure the gateway Android handset is connected to active Wi-Fi or mobile data with sufficient prepaid/postpaid SMS allowance. Keep the TextBee Android app running in the background.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
