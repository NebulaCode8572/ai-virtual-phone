"use client";

// 通话模式：enhanced=增强通话（可拖动小窗 / 自动搭话 / 消息排队 / 原生浮窗 / 语音留档），
// legacy=传统通话（与旧版行为一致）。
// 存 localStorage，与业务数据分离，不需要跟着备份走。

export type CallMode = "enhanced" | "legacy";

const STORAGE_KEY = "ai-phone:call-mode";
const CHANGE_EVENT = "call-mode-changed";

export const DEFAULT_CALL_MODE: CallMode = "enhanced";

export function loadCallMode(): CallMode {
    if (typeof window === "undefined") return DEFAULT_CALL_MODE;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw === "legacy" || raw === "enhanced" ? raw : DEFAULT_CALL_MODE;
    } catch {
        return DEFAULT_CALL_MODE;
    }
}

export function saveCallMode(mode: CallMode): CallMode {
    if (typeof window === "undefined") return mode;
    try {
        window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // 隐私模式 / 配额满：不阻断设置流程
    }
    window.dispatchEvent(new CustomEvent<CallMode>(CHANGE_EVENT, { detail: mode }));
    return mode;
}

export function isEnhancedCallMode(): boolean {
    return loadCallMode() === "enhanced";
}

/** 订阅模式变更（设置页改完、通话外的其他界面想同步时用） */
export function subscribeCallMode(listener: (mode: CallMode) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => listener(loadCallMode());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
}
