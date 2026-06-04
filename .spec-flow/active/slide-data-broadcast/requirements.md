# 需求：Slide 元数据广播机制

## 功能需求

**FR-001** — slide 元数据声明  
当 slide HTML 包含 `<meta name="webppt:{key}" content="{value}">` 时，系统应将所有匹配 `webppt:` 前缀的 meta 收集为键值对对象。

**FR-002** — `<title>` fallback  
当 slide 不含 `<meta name="webppt:title">` 但含有 `<title>` 时，系统应将 `document.title` 作为 `data.title` 的 fallback。

**FR-003** — 切换时广播  
当 `goto(index)` 被调用且 index 在合法范围内时，系统应向 overlay 和 underlay 的 `contentWindow` 发送 `postMessage`，消息结构为：

```ts
{ type: 'webppt:slide-change', index: number, ...data }
```

**FR-004** — 延迟广播（未加载 slide）  
当目标 slide iframe 尚未完成加载（`readyState !== 'complete'`）时，系统应等待其 `load` 事件触发后再执行广播，不阻塞 `goto()` 的 UI 切换（showSlide/preload）。

**FR-005** — 已加载 slide 立即广播  
当目标 slide iframe 已加载完成（`readyState === 'complete'`）时，系统应同步广播，无需等待。

**FR-006** — 无 overlay/underlay 时静默  
当 overlay 或 underlay 不存在时，系统不应抛出错误，广播仅发送给存在的目标。

## 非功能需求

**NFR-001** — slide 作者零 JS  
slide HTML 内不需要编写任何 JavaScript，仅通过 `<meta>` 标签声明数据。

**NFR-002** — 不影响现有测试  
新增逻辑不得破坏现有 DOM 结构、导航、键盘、URL 同步等测试。

## 验收标准

**AC-001** `collectSlideData` 单元测试

- 含 `webppt:title` meta → 返回 `{ title: '...' }`
- 含多个 `webppt:*` meta → 正确解析所有键值
- 无 `webppt:` meta 但有 `<title>` → 返回 `{ title: '...' }`（fallback）
- 空文档 → 返回 `{}`

**AC-002** `broadcastSlideChange` 单元测试

- `goto(1)` 后 overlay.contentWindow 收到 `{ type: 'webppt:slide-change', index: 1, ... }`
- `goto(1)` 后 underlay.contentWindow 收到同样消息
- 无 overlay 时不抛出错误
- iframe 未加载时，load 事件触发后才发送消息

**AC-003** 集成演示  
`examples/with-config` 中添加 `_overlay.html`，切换 slide 时左上角显示当前 slide 标题。
