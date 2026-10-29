# 通话功能增量更新

> 本次更新实现了全局通话管理、可拖动浮窗、自动搭话、消息队列、语音留档等核心功能。

## 核心改动

### 1. 全局通话状态管理

**文件：** `lib/call-session-store.ts`

将通话状态从聊天室内部提升为全局管理，解决原实现中：
- 切换会话时通话界面随聊天室卸载
- 回到桌面整个通话直接销毁

**关键功能：**
- `startCall()` - 发起/接听通话
- `minimizeCall()` / `restoreCall()` - 缩成小窗/恢复全屏
- `endCall()` - 挂断并广播结束事件
- `isCallActiveForSession()` - 判断会话是否在通话中

### 2. 通话悬浮小窗

**文件：** `components/chat/call-mini-window.tsx`

可拖动、可缩放的通话小窗，位置和尺寸记录在本地存储。

**手势支持：**
- **轻点** → 回到全屏通话
- **拖动** → 移动位置
- **右下角拖拽** → 缩放尺寸
- **长按** → 弹出快捷回复条（无需跳回通话界面）

### 3. 自动搭话机制

**文件：** 
- `lib/call-auto-chat.ts` - 配置管理
- `components/chat/use-call-auto-chat.ts` - 运行时逻辑
- `components/chat/call-auto-chat-control.tsx` - 设置面板

**功能：**
- 通话中用户长时间不出声时，角色主动开口
- 随机间隔（如 20~60 秒），模拟真人节奏
- 条数上限保护，避免无人时无限烧 token
- 实时状态显示（倒计时、触发条数、诊断日志）

### 4. 消息排队机制

**文件：** `components/chat/use-call-reply-queue.ts`

角色正在说话时，用户发送的消息自动排队，等角色说完再发出。

**特性：**
- 最多排队 5 条，超出拒收并提示
- 小窗显示「待发 N」角标
- 手动消息优先，自动搭话自然让路

### 5. 通话语音留档

**文件：** `lib/call-audio-storage.ts`

TTS 合成的语音自动落库，支持复听原音。

**特性：**
- 音频存入 IndexedDB，返回 `media-store://` 引用
- 默认保留 30 天或 400 段，超出自动清理
- 消息被编辑/删除时同步清理关联音频
- 宿主 API 零改动（`mediaData` 透传 + `voice.play` 支持引用）

### 6. 安卓原生浮窗对接

**文件：**
- `lib/shell-call-overlay.ts` - 通信桥
- `components/chat/use-shell-call-overlay.ts` - React Hook

通话缩小窗后，在安卓壳环境下挂载系统级原生浮窗（切桌面/别的 App 仍可见）。

### 7. 浮窗主题配置

**文件：**
- `lib/call-overlay-theme.ts` - 配置管理
- `components/settings/call-overlay-settings.tsx` - 设置页

网页小窗和安卓原生浮窗共用一套配色，改一次两边都变。

### 8. 通话常驻层

**文件：** `components/chat/call-layer.tsx`

由 `desktop-shell` 常驻渲染，不再挂在聊天室内部。

**效果：**
- 切会话、回桌面、开别的 App 不影响通话
- 缩成小窗时浮窗留在手机界面上
- 会话/角色按 id 实时读取，避免状态不同步

## 使用指南

### 接入通话层

在 `desktop-shell` 或顶层布局中引入：

```tsx
import { CallLayer } from "@/components/chat/call-layer";

export function Layout() {
  return (
    <>
      {/* 你的正常内容 */}
      <CallLayer />
    </>
  );
}
```

### 发起通话

```tsx
import { startCall } from "@/lib/call-session-store";

// 发起语音通话
startCall({
  sessionId: "session-123",
  characterId: "char-456",
  kind: "voice",
  initiator: "user",
});
```

### 在通话屏中使用新功能

```tsx
import { useCallAutoChat } from "@/components/chat/use-call-auto-chat";
import { useCallReplyQueue } from "@/components/chat/use-call-reply-queue";
import { useShellCallOverlay } from "@/components/chat/use-shell-call-overlay";
import { CallMiniWindow } from "@/components/chat/call-mini-window";

function VoiceCallScreen({ minimized, onMinimize, onRestore }) {
  const callStateRef = useRef("IDLE");
  
  // 自动搭话
  const autoChat = useCallAutoChat({
    active: true,
    callStateRef,
    runTurn: () => runConversationTurn(),
  });
  
  // 消息队列
  const replyQueue = useCallReplyQueue({
    callState: callStateRef.current,
    callStateRef,
    runTurn: (text) => runConversationTurn(text),
    active: true,
  });
  
  // 原生浮窗
  useShellCallOverlay({
    show: minimized,
    sessionId: session.id,
    characterId: character.id,
    kind: "voice",
    onRestore,
  });
  
  // 小窗渲染
  if (minimized) {
    return (
      <CallMiniWindow
        imageUrl={character.avatar}
        title={character.name}
        meta={["语音通话", formatDuration(duration)]}
        ariaLabel="点击恢复通话"
        onRestore={onRestore}
        onReply={(text) => replyQueue.submit(text) !== "rejected"}
        pendingCount={replyQueue.pending}
      />
    );
  }
  
  // 全屏通话界面...
}
```

## 故障排查

| 现象 | 排查方向 |
|-----|---------|
| 切会话时通话界面消失 | 检查 `CallLayer` 是否挂在正确位置（desktop-shell，而非聊天室内） |
| 小窗点击无反应 | 检查 `onRestore` 是否传入 `minimizeCall` / `restoreCall` |
| 自动搭话不触发 | 打开控制台搜索 `[自动搭话]`，查看诊断日志 |
| 消息发了没反应 | 检查 `replyQueue.pending` 是否显示排队中 |
| 复听音色不对 | 检查消息 `mediaData.callAudioRef` 是否存在 |

## 相关文档

- `docs/call-feature-porting-guide.md` - 详细移植指南
- `docs/always-on-call-guide.md` - 「煲电话粥」体验指南
- `docs/custom-app-call-audio.md` - 自定义 APP 接入语音留档
