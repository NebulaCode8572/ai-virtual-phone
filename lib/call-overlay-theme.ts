// lib/call-overlay-theme.ts — 通话浮窗主题配置
//
// 安卓壳的原生浮窗与网页里的小窗共用一套配色，改一次两边都变。
// 配色存在 kv-db，壳通过 JS Bridge 读取并应用到原生 View 上。

import { kvGet, kvSet, registerKvMigration } from "./kv-db";

const STORAGE_KEY = "ai_phone_call_overlay_theme_v1";
registerKvMigration(STORAGE_KEY);

export type CallOverlayColors = {
    /** 快捷回复条底色（#RRGGBB） */
    bar: string;
    /** 快捷回复条透明度（0~1） */
    barAlpha: number;
    /** 回复条文字颜色 */
    text: string;
    /** 回复条次要文字颜色 */
    muted: string;
    /** 发送按钮底色 */
    accent: string;
    /** 发送按钮文字颜色 */
    sendText: string;
};

export const DEFAULT_CALL_OVERLAY_COLORS: CallOverlayColors = {
    bar: "#1c1c24",
    barAlpha: 0.92,
    text: "#f5f5f7",
    muted: "#a0a0a8",
    accent: "#4a90e2",
    sendText: "#ffffff",
};

function normalize(raw: unknown): CallOverlayColors {
    if (!raw || typeof raw !== "object") return { ...DEFAULT_CALL_OVERLAY_COLORS };
    const source = raw as Partial<CallOverlayColors>;
    const bar = typeof source.bar === "string" && /^#[0-9A-Fa-f]{6}$/.test(source.bar)
        ? source.bar
        : DEFAULT_CALL_OVERLAY_COLORS.bar;
    const barAlpha = typeof source.barAlpha === "number" && Number.isFinite(source.barAlpha)
        ? Math.min(1, Math.max(0, source.barAlpha))
        : DEFAULT_CALL_OVERLAY_COLORS.barAlpha;
    const text = typeof source.text === "string" && /^#[0-9A-Fa-f]{6}$/.test(source.text)
        ? source.text
        : DEFAULT_CALL_OVERLAY_COLORS.text;
    const muted = typeof source.muted === "string" && /^#[0-9A-Fa-f]{6}$/.test(source.muted)
        ? source.muted
        : DEFAULT_CALL_OVERLAY_COLORS.muted;
    const accent = typeof source.accent === "string" && /^#[0-9A-Fa-f]{6}$/.test(source.accent)
        ? source.accent
        : DEFAULT_CALL_OVERLAY_COLORS.accent;
    const sendText = typeof source.sendText === "string" && /^#[0-9A-Fa-f]{6}$/.test(source.sendText)
        ? source.sendText
        : DEFAULT_CALL_OVERLAY_COLORS.sendText;
    return { bar, barAlpha, text, muted, accent, sendText };
}

export function loadCallOverlayColors(): CallOverlayColors {
    if (typeof window === "undefined") return { ...DEFAULT_CALL_OVERLAY_COLORS };
    try {
        const raw = kvGet(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_CALL_OVERLAY_COLORS };
        return normalize(JSON.parse(raw));
    } catch {
        return { ...DEFAULT_CALL_OVERLAY_COLORS };
    }
}

export function saveCallOverlayColors(colors: CallOverlayColors): CallOverlayColors {
    const next = normalize(colors);
    if (typeof window !== "undefined") {
        kvSet(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event("call-overlay-theme-updated"));
    }
    return next;
}

const listeners = new Set<() => void>();

export function subscribeCallOverlayTheme(listener: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => listener();
    listeners.add(listener);
    window.addEventListener("call-overlay-theme-updated", handler);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("call-overlay-theme-updated", handler);
    };
}
