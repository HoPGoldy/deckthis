# 提案：Slide 元数据广播机制

## 背景

当前 webppt 的 slide、overlay、underlay 是三个独立的 iframe，彼此无法感知对方状态。overlay 常见需求（页码、当前章节标题、主题色）都需要访问当前 slide 的上下文数据，但目前没有任何传递渠道。

## 目标

- [ ] slide 作者可以用 **零 JS** 的方式声明本页元数据（标题、节名、任意 KV）
- [ ] shell 切换 slide 时自动将元数据广播给 overlay 和 underlay
- [ ] overlay/underlay 通过监听 `message` 事件接收数据，实现动态标题、进度等 UI

## 非目标

- 不支持 slide 运行时动态修改 meta 后重新广播（加载后静态读取即可）
- 不处理跨域 iframe（webppt 所有 iframe 均同源）
- 不提供 slide 主动 push 数据的 JS API（meta 标签已足够，避免两套机制并存）

## 范围

**In-scope**

- `core.ts`：`collectSlideData()` 辅助函数 + `broadcastSlideChange()` + `goto()` 集成
- `core.test.ts`：对应单元测试
- `examples/with-config`：添加 `_overlay.html` 演示标题显示

**Out-of-scope**

- CLI / dev-server 改动
- overlay/underlay 的具体 UI 样式（由用户自行编写）

## 风险

| 风险                                      | 概率 | 缓解                                            |
| ----------------------------------------- | ---- | ----------------------------------------------- |
| iframe 尚未 load 时读不到 contentDocument | 高   | load 事件回调中延迟读取                         |
| 测试环境（jsdom）iframe 无法真实加载 HTML | 中   | 在测试中直接写 iframe.contentDocument 模拟 meta |

## 开放问题

- `<title>` 作为 `webppt:title` 的 fallback 是否需要？→ **是**，降低 AI 生成 slide 的心智负担
