"use client";

// 通话界面上的「自动搭话」设置面板。

import { useEffect, useState } from "react";

import {
    type CallAutoChatConfig,
    type CallAutoChatStatus,
    MAX_INTERVAL_SECONDS,
    MAX_TURNS_LIMIT,
    MIN_INTERVAL_SECONDS,
    readCallAutoChatStatus,
} from "@/lib/call-auto-chat";

type CallAutoChatControlProps = {
    config: CallAutoChatConfig;
    onUpdate: (patch: Partial<CallAutoChatConfig>) => void;
};

/**
 * 通话界面上的自动搭话控制面板：
 * - 开关
 * - 间隔设置（秒）
 * - 上限设置（条）
 * - 实时状态显示
 */
export function CallAutoChatControl({ config, onUpdate }: CallAutoChatControlProps) {
    const [status, setStatus] = useState<CallAutoChatStatus | null>(null);

    // 每 500ms 读一次状态（用于显示倒计时）
    useEffect(() => {
        const timer = window.setInterval(() => {
            setStatus(readCallAutoChatStatus());
        }, 500);
        return () => window.clearInterval(timer);
    }, []);

    const formatRemain = (deadlineAt: number): string => {
        if (!deadlineAt) return "--";
        const remain = Math.max(0, (deadlineAt - Date.now()) / 1000);
        return `${remain.toFixed(1)}s`;
    };

    return (
        <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>自动搭话</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => onUpdate({ enabled: e.target.checked })}
                    />
                    <span>{config.enabled ? "已开启" : "已关闭"}</span>
                </label>
            </div>

            {config.enabled && (
                <>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                        <label style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>间隔（秒）</div>
                            <input
                                type="number"
                                min={MIN_INTERVAL_SECONDS}
                                max={MAX_INTERVAL_SECONDS}
                                value={config.minSeconds}
                                onChange={(e) => onUpdate({ minSeconds: Number(e.target.value) })}
                                style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}
                            />
                        </label>
                        <span style={{ marginTop: 20 }}>~</span>
                        <label style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>&nbsp;</div>
                            <input
                                type="number"
                                min={config.minSeconds}
                                max={MAX_INTERVAL_SECONDS}
                                value={config.maxSeconds}
                                onChange={(e) => onUpdate({ maxSeconds: Number(e.target.value) })}
                                style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}
                            />
                        </label>
                    </div>

                    <div style={{ marginTop: 10 }}>
                        <label>
                            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>本次上限（0=不限）</div>
                            <input
                                type="number"
                                min={0}
                                max={MAX_TURNS_LIMIT}
                                value={config.maxTurns}
                                onChange={(e) => onUpdate({ maxTurns: Number(e.target.value) })}
                                style={{ width: "100%", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}
                            />
                        </label>
                    </div>

                    {status && (
                        <div style={{ marginTop: 10, padding: 8, background: "rgba(0,0,0,0.2)", borderRadius: 6, fontSize: 11 }}>
                            <div style={{ opacity: 0.8, marginBottom: 4 }}>{status.reason}</div>
                            <div style={{ display: "flex", gap: 12, fontSize: 10, opacity: 0.6 }}>
                                <span>状态: {status.state}</span>
                                <span>剩余: {formatRemain(status.deadlineAt)}</span>
                                <span>已触发: {status.turns}/{status.maxTurns > 0 ? status.maxTurns : "不限"}</span>
                            </div>
                            {status.events.length > 0 && (
                                <div style={{ marginTop: 6, fontSize: 9, opacity: 0.5, maxHeight: 60, overflow: "auto" }}>
                                    {status.events.map((line, i) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
