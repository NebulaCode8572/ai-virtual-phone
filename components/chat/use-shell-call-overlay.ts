"use client";

// 安卓壳原生浮窗的 React Hook 封装。

import { useEffect } from "react";

import {
    hideShellCallOverlay,
    SHELL_CALL_OVERLAY_TAP_EVENT,
    showShellCallOverlay,
} from "@/lib/shell-call-overlay";

type UseShellCallOverlayParams = {
    /** 是否显示原生浮窗 */
    show: boolean;
    /** 会话 ID */
    sessionId: string;
    /** 角色 ID */
    characterId: string;
    /** 通话类型 */
    kind: "voice" | "video";
    /** 原生浮窗被点击时恢复全屏 */
    onRestore: () => void;
};

/**
 * 托管安卓壳的原生通话浮窗：
 * - show=true 时显示
 * - show=false 时隐藏
 * - 监听原生浮窗的点击事件，触发 onRestore
 */
export function useShellCallOverlay({
    show,
    sessionId,
    characterId,
    kind,
    onRestore,
}: UseShellCallOverlayParams) {
    useEffect(() => {
        if (!show) {
            hideShellCallOverlay();
            return;
        }
        showShellCallOverlay(sessionId, characterId, kind);
        return () => {
            hideShellCallOverlay();
        };
    }, [show, sessionId, characterId, kind]);

    useEffect(() => {
        if (!show) return;
        const handler = () => onRestore();
        window.addEventListener(SHELL_CALL_OVERLAY_TAP_EVENT, handler);
        return () => {
            window.removeEventListener(SHELL_CALL_OVERLAY_TAP_EVENT, handler);
        };
    }, [show, onRestore]);
}
