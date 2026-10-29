// lib/shell-call-overlay.ts — 安卓壳原生浮窗对接
//
// 通话缩成小窗后，网页里显示的是 call-mini-window.tsx 渲染的 fixed 定位小窗。
// 安卓壳环境下，可以挂一个原生浮窗（悬浮在系统级，切到桌面或别的 App 仍可见）。
// 这里是 WebView ↔ 原生浮窗的通信桥，双向同步状态（小窗显示 / 待发消息条数）。

/** 安卓壳注入的全局对象（老壳或浏览器环境没有） */
interface ShellBridge {
    showCallOverlay?: (sessionId: string, characterId: string, kind: string) => void;
    hideCallOverlay?: () => void;
    updateCallOverlayPending?: (count: number) => void;
}

function getShellBridge(): ShellBridge | null {
    if (typeof window === "undefined") return null;
    const bridge = (window as unknown as { ShellBus?: ShellBridge }).ShellBus;
    return bridge || null;
}

/**
 * 显示原生通话浮窗（从全屏通话缩成小窗时调用）。
 * 非壳环境或老壳上是 no-op。
 */
export function showShellCallOverlay(sessionId: string, characterId: string, kind: "voice" | "video"): void {
    const bridge = getShellBridge();
    if (!bridge?.showCallOverlay) return;
    try {
        bridge.showCallOverlay(sessionId, characterId, kind);
    } catch (error) {
        console.warn("[shell-call-overlay] showCallOverlay 失败", error);
    }
}

/**
 * 隐藏原生通话浮窗（通话挂断或从小窗恢复全屏时调用）。
 */
export function hideShellCallOverlay(): void {
    const bridge = getShellBridge();
    if (!bridge?.hideCallOverlay) return;
    try {
        bridge.hideCallOverlay();
    } catch (error) {
        console.warn("[shell-call-overlay] hideCallOverlay 失败", error);
    }
}

/**
 * 更新原生浮窗上的「待发送」角标（排队消息条数）。
 * 0 时角标隐藏。
 */
export function updateShellCallOverlayPending(count: number): void {
    const bridge = getShellBridge();
    if (!bridge?.updateCallOverlayPending) return;
    try {
        bridge.updateCallOverlayPending(Math.max(0, Math.floor(count)));
    } catch (error) {
        console.warn("[shell-call-overlay] updateCallOverlayPending 失败", error);
    }
}

/**
 * 原生浮窗被点击时会触发 shell-call-overlay-tap 事件，
 * 通话层监听后恢复全屏。
 */
export const SHELL_CALL_OVERLAY_TAP_EVENT = "shell-call-overlay-tap";
