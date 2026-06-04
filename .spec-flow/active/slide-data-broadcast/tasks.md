# 任务：Slide 元数据广播机制

## 阶段一：Setup

### T-001 保留 underlayEl 引用 [Low]

**文件**：`packages/webppt-core/src/core.ts`  
**内容**：将 underlay iframe 创建处的 `const el` 提升为 `let underlayEl: HTMLIFrameElement | null = null`，并在创建后赋值。  
**依赖**：无  
**状态**：⏳ Pending

---

## 阶段二：Implementation

### T-002 实现并导出 `collectSlideData` [Low]

**文件**：`packages/webppt-core/src/core.ts`  
**内容**：在 `SlideDeck` 函数**外部**实现 `export function collectSlideData(iframe)`，读取 `webppt:*` meta + `<title>` fallback。  
**依赖**：无  
**状态**：⏳ Pending

### T-003 在 `goto()` 中集成广播 [Medium]

**文件**：`packages/webppt-core/src/core.ts`  
**内容**：在 goto() 中 syncSlideIndexToUrl 之后，判断 readyState 决定立即广播还是等待 load，调用 broadcastSlideChange（内部函数，使用 T-001 的 underlayEl 和已有的 overlayEl）。  
**依赖**：T-001, T-002  
**状态**：⏳ Pending

---

## 阶段三：Testing（先写测试）

### T-004 `collectSlideData` 单元测试 [Low]

**文件**：`packages/webppt-core/src/core.test.ts`  
**内容**：

- 含 `webppt:title` meta → 返回 `{ title: 'xxx' }`
- 含多个 `webppt:*` meta → 全部解析
- 无 `webppt:` meta + 有 `<title>` → fallback
- 空 iframe → `{}`  
  **依赖**：T-002  
  **状态**：⏳ Pending

### T-005 `broadcastSlideChange` / goto 广播行为测试 [Medium]

**文件**：`packages/webppt-core/src/core.test.ts`  
**内容**：

- 有 overlay 时 goto() 后 overlay.contentWindow.postMessage 被调用，含 `{ type: 'webppt:slide-change', index }`
- 有 underlay 时同理
- 无 overlay/underlay 时 goto() 不抛错
- iframe 未加载时，load 触发后才发消息  
  **依赖**：T-003  
  **状态**：⏳ Pending

---

## 阶段四：Demo

### T-006 更新 examples/with-config 添加 overlay 演示 [Low]

**文件**：`packages/webppt-cli/demos/with-config/`  
**内容**：

1. 为每张 slide HTML 添加 `<meta name="webppt:title" content="...">` 或 `<title>`
2. 创建 `_overlay.html`，监听 `webppt:slide-change` 消息，左上角显示 `data.title`  
   **依赖**：T-003  
   **状态**：⏳ Pending

---

## 进度总览

| ID    | 任务                  | 复杂度 | 状态 |
| ----- | --------------------- | ------ | ---- |
| T-001 | 保留 underlayEl 引用  | Low    | ⏳   |
| T-002 | 实现 collectSlideData | Low    | ⏳   |
| T-003 | goto() 集成广播       | Medium | ⏳   |
| T-004 | collectSlideData 测试 | Low    | ⏳   |
| T-005 | goto 广播行为测试     | Medium | ⏳   |
| T-006 | with-config demo 演示 | Low    | ⏳   |
