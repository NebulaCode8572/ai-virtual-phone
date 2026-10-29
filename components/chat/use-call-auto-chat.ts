"use client";

// 通话「自动搭话」的运行时：三种通话屏（语音 / 视频 / 群聊）共用一套逻辑。

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

import {
    type CallAutoChatConfig,
    type CallAutoChatStatus,
    clearCallAutoChatStatusReader,
    loadCallAutoChatConfig,
    publishCallAutoChatStatus,
    randomAutoChatDelaySeconds,
    saveCallAutoChatConfig,
} from "@/lib/call-auto-chat";

/** 诊断日志前缀：控制台里按它过滤，一眼看全自动搭话的心跳 */
const LOG_PREFIX = "[自动搭话]";

function debugLog(message: string) {
    if (typeof window !== "undefined"
        && (window as unknown as { __callAutoChatDebug?: boolean }).__callAutoChatDebug === false) {
        return;
    }
    console.log(`${LOG_PREFIX} ${message}`);
}

type UseCallAutoChatParams = {
    /** 通话是否进行中（CONNECTING / ENDED 之外）。结束后停表 */
    active: boolean;
    /** 读当前通话状态：只有 IDLE（谁也没在说）时才允许主动开口 */
    callStateRef: MutableRefObject<string>;
    /** 触发一次「角色主动开口」的对话轮 */
    runTurn: () => void;
    /** 开口前的准备（各通话屏在这里停掉在听的识别，免把角色自己的声音录进去） */
    beforeTrigger?: () => void;
    /** 倒计时归零、真的开口了（用于打日志或埋点；可选） */
    onTriggered?: () => void;
};

export function useCallAutoChat({
    active,
    callStateRef,
    runTurn,
    beforeTrigger,
    onTriggered,
}: UseCallAutoChatParams) {
    const [config, setConfig] = useState<CallAutoChatConfig>(() => loadCallAutoChatConfig());

    const runTurnRef = useRef(runTurn);
    const beforeTriggerRef = useRef(beforeTrigger);
    const onTriggeredRef = useRef(onTriggered);
    runTurnRef.current = runTurn;
    beforeTriggerRef.current = beforeTrigger;
    onTriggeredRef.current = onTriggered;

    const configRef = useRef(config);
    configRef.current = config;

    const deadlineRef = useRef(0);
    const turnsRef = useRef(0);
    const emptyTurnsRef = useRef(0);
    const lastReasonRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });
    const eventsRef = useRef<string[]>([]);
    const tickedAtRef = useRef(0);
    const reasonRef = useRef("尚未开始");

    const logReason = (key: string, message: string) => {
        const now = Date.now();
        const last = lastReasonRef.current;
        if (last.key === key && now - last.at < 5000) return;
        lastReasonRef.current = { key, at: now };
        debugLog(message);
    };

    const pushEvent = (message: string) => {
        const line = `${new Date().toLocaleTimeString("zh-CN", { hour12: false })} ${message}`;
        eventsRef.current = [...eventsRef.current, line].slice(-5);
        debugLog(message);
    };

    const buildStatus = useCallback((): CallAutoChatStatus => ({
        state: callStateRef.current,
        deadlineAt: deadlineRef.current,
        tickedAt: tickedAtRef.current,
        turns: turnsRef.current,
        maxTurns: configRef.current.maxTurns,
        emptyTurns: emptyTurnsRef.current,
        reason: reasonRef.current,
        events: eventsRef.current,
    }), [callStateRef]);

    const schedule = useCallback(() => {
        const current = configRef.current;
        if (!current.enabled) {
            deadlineRef.current = 0;
            return;
        }
        const backoff = 1 + Math.min(emptyTurnsRef.current, 3);
        deadlineRef.current = Date.now() + randomAutoChatDelaySeconds(current) * backoff * 1000;
    }, []);

    const notifyUserSpoke = useCallback(() => {
        turnsRef.current = 0;
        emptyTurnsRef.current = 0;
        deadlineRef.current = 0;
        pushEvent("你开口了：本轮计数与空转清零");
    }, []);

    const notifyAssistantSpoke = useCallback((produced: boolean) => {
        emptyTurnsRef.current = produced ? 0 : emptyTurnsRef.current + 1;
        schedule();
        const next = deadlineRef.current
            ? `，下次等待 ${((deadlineRef.current - Date.now()) / 1000).toFixed(1)}s`
            : "（未排期：开关关闭或通话已结束）";
        pushEvent(`角色开口一轮（${produced ? "有内容" : "空转"}）${next}`);
    }, [schedule]);

    const update = useCallback((patch: Partial<CallAutoChatConfig>) => {
        const before = configRef.current;
        const next = saveCallAutoChatConfig({ ...before, ...patch });
        setConfig(next);
        configRef.current = next;
        if (next.enabled !== before.enabled || next.maxTurns !== before.maxTurns) {
            turnsRef.current = 0;
            emptyTurnsRef.current = 0;
        }
        if (
            next.enabled !== before.enabled
            || next.minSeconds !== before.minSeconds
            || next.maxSeconds !== before.maxSeconds
        ) {
            deadlineRef.current = next.enabled
                ? Date.now() + randomAutoChatDelaySeconds(next) * 1000
                : 0;
            pushEvent(
                next.enabled
                    ? `设置变更：间隔 ${next.minSeconds}~${next.maxSeconds}s，`
                      + `上限 ${next.maxTurns > 0 ? `${next.maxTurns} 条` : "不限"}，已重排`
                    : "设置变更：自动搭话已关闭",
            );
        }
        return next;
    }, []);

    useEffect(() => {
        if (!active) {
            deadlineRef.current = 0;
            pushEvent("通话不在进行中，心跳停表");
            return;
        }
        if (!config.enabled) {
            deadlineRef.current = 0;
            pushEvent("自动搭话已关闭，心跳停表");
            return;
        }
        publishCallAutoChatStatus(buildStatus);
        if (!deadlineRef.current) {
            const firstDelay = randomAutoChatDelaySeconds(config);
            deadlineRef.current = Date.now() + firstDelay * 1000;
            pushEvent(
                `心跳启动：首次等待 ${firstDelay.toFixed(1)}s`
                + `（间隔 ${config.minSeconds}~${config.maxSeconds}s，`
                + `上限 ${config.maxTurns > 0 ? `${config.maxTurns} 条` : "不限"}）`,
            );
        }
        tickedAtRef.current = Date.now();
        const timer = window.setInterval(() => {
            tickedAtRef.current = Date.now();
            const current = configRef.current;
            if (!current.enabled) return;
            const limit = current.maxTurns;
            const turns = limit > 0 ? `${turnsRef.current}/${limit}` : `${turnsRef.current}/不限`;
            const state = callStateRef.current;
            const deadline = deadlineRef.current;
            const remain = deadline
                ? `${Math.max(0, (deadline - Date.now()) / 1000).toFixed(1)}s`
                : "待重排";
            const head = `状态=${state} 剩余=${remain} 空转=${emptyTurnsRef.current} 本轮=${turns}`;
            if (state !== "IDLE") {
                reasonRef.current = "角色或你正在说话，等安静下来再开口";
                logReason(`state:${state}`, `${head} → 有人在说，本轮不触发`);
                return;
            }
            if (limit > 0 && turnsRef.current >= limit) {
                reasonRef.current = `已达本次通话上限（${limit} 条），你开口后才重新计数`;
                logReason("limit", `${head} → 已达本次通话上限，等你开口才重新计数`);
                return;
            }
            if (!deadline || Date.now() < deadline) {
                reasonRef.current = "静默倒计时中";
                debugLog(`${head} → 等待中`);
                return;
            }
            turnsRef.current += 1;
            deadlineRef.current = 0;
            reasonRef.current = "刚触发，正在等角色回应";
            pushEvent(`触发自动搭话（第 ${turnsRef.current} 条）`);
            beforeTriggerRef.current?.();
            onTriggeredRef.current?.();
            runTurnRef.current();
        }, 1000);
        return () => {
            window.clearInterval(timer);
            clearCallAutoChatStatusReader(buildStatus);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, config]);

    return { config, update, schedule, notifyUserSpoke, notifyAssistantSpoke };
}
