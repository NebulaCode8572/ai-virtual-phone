"use client";

// 通话浮窗主题设置页。

import { useState } from "react";

import {
    type CallOverlayColors,
    DEFAULT_CALL_OVERLAY_COLORS,
    loadCallOverlayColors,
    saveCallOverlayColors,
} from "@/lib/call-overlay-theme";

export function CallOverlaySettings() {
    const [colors, setColors] = useState<CallOverlayColors>(() => loadCallOverlayColors());

    const handleUpdate = (patch: Partial<CallOverlayColors>) => {
        const next = saveCallOverlayColors({ ...colors, ...patch });
        setColors(next);
    };

    const handleReset = () => {
        const next = saveCallOverlayColors(DEFAULT_CALL_OVERLAY_COLORS);
        setColors(next);
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>通话浮窗主题</h2>
                <button
                    type="button"
                    onClick={handleReset}
                    style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(255,255,255,0.05)",
                        cursor: "pointer",
                    }}
                >
                    恢复默认
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label>
                    <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.8 }}>回复条底色</div>
                    <input
                        type="color"
                        value={colors.bar}
                        onChange={(e) => handleUpdate({ bar: e.target.value })}
                        style={{ width: "100%", height: 40, borderRadius: 6, border: "none", cursor: "pointer" }}
                    />
                </label>

                <label>
                    <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.8 }}>回复条透明度</div>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={colors.barAlpha}
                        onChange={(e) => handleUpdate({ barAlpha: Number(e.target.value) })}
                        style={{ width: "100%" }}
                    />
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{(colors.barAlpha * 100).toFixed(0)}%</div>
                </label>

                <label>
                    <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.8 }}>文字颜色</div>
                    <input
                        type="color"
                        value={colors.text}
                        onChange={(e) => handleUpdate({ text: e.target.value })}
                        style={{ width: "100%", height: 40, borderRadius: 6, border: "none", cursor: "pointer" }}
                    />
                </label>

                <label>
                    <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.8 }}>次要文字颜色</div>
                    <input
                        type="color"
                        value={colors.muted}
                        onChange={(e) => handleUpdate({ muted: e.target.value })}
                        style={{ width: "100%", height: 40, borderRadius: 6, border: "none", cursor: "pointer" }}
                    />
                </label>

                <label>
                    <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.8 }}>发送按钮底色</div>
                    <input
                        type="color"
                        value={colors.accent}
                        onChange={(e) => handleUpdate({ accent: e.target.value })}
                        style={{ width: "100%", height: 40, borderRadius: 6, border: "none", cursor: "pointer" }}
                    />
                </label>

                <label>
                    <div style={{ fontSize: 13, marginBottom: 6, opacity: 0.8 }}>发送按钮文字颜色</div>
                    <input
                        type="color"
                        value={colors.sendText}
                        onChange={(e) => handleUpdate({ sendText: e.target.value })}
                        style={{ width: "100%", height: 40, borderRadius: 6, border: "none", cursor: "pointer" }}
                    />
                </label>
            </div>

            <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 12, opacity: 0.7 }}>
                <p style={{ margin: 0 }}>💡 这些配色同时应用于网页小窗和安卓原生浮窗的快捷回复条。</p>
            </div>
        </div>
    );
}
