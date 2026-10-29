"use client";

// 通话里的「待发送队列」。

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

import { updateShellCallOverlayPending } from "@/lib/shell-call-overlay";

/** 一次最多排几条。超了说明对面一直说不完，先拒掉免得越积越多、
 *  等想起来时一股脑全发出去。 */
export const MAX_PENDING_REPLIES = 5;

/** 提交结果：直接发出 / 已排队 / 拒收（队列满或空文本） */
export type ReplySubmitResult = "sent" | "queued" | "rejected";

type UseCallReplyQueueParams = {
    /** 当前通话状态（state，不是 ref——要触发 flush 的 effect） */
    callState: string;
    /** 状态 ref：提交那一刻判断忙不忙，避免闭包拿到旧值 */
    callStateRef: MutableRefObject<string>;
    /** 真正发出去的入口（各通话屏的 runConversationTurn） */
    runTurn: (text: string) => void;
    /** 通话是否还在进行（挂断后不再补发） */
    active: boolean;
};

export function useCallReplyQueue({ callState, callStateRef, runTurn, active }: UseCallReplyQueueParams) {
    const queueRef = useRef<string[]>([]);
    const [pending, setPending] = useState(0);
    const runTurnRef = useRef(runTurn);
    runTurnRef.current = runTurn;

    const submit = useCallback((text: string): ReplySubmitResult => {
        const trimmed = text.trim();
        if (!trimmed) return "rejected";
        if (callStateRef.current === "IDLE") {
            runTurnRef.current(trimmed);
            return "sent";
        }
        if (queueRef.current.length >= MAX_PENDING_REPLIES) return "rejected";
        queueRef.current.push(trimmed);
        setPending(queueRef.current.length);
        return "queued";
    }, [callStateRef]);

    const clear = useCallback(() => {
        queueRef.current = [];
        setPending(0);
    }, []);

    useEffect(() => {
        updateShellCallOverlayPending(pending);
    }, [pending]);

    useEffect(() => {
        if (!active) return;
        if (callState !== "IDLE") return;
        if (queueRef.current.length === 0) return;
        const next = queueRef.current.shift();
        setPending(queueRef.current.length);
        if (next) runTurnRef.current(next);
    }, [active, callState]);

    useEffect(() => {
        if (!active) clear();
    }, [active, clear]);

    return { submit, pending, clear };
}
