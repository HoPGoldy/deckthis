# Tasks：主题插件系统

## 任务列表

### 阶段一：类型层

#### T-001 更新 types.ts ⏳

- **复杂度**：Low
- **文件**：`packages/webppt-cli/src/types.ts`
- **内容**：
  - 新增 `BeforeEachContext` 类型
  - 新增 `BeforeEachFn` 类型
  - `WebPPTConfig.order` 改为 `(discovered: string[]) => string[]`
  - 新增 `WebPPTConfig.assets?: string[]`
  - 新增 `WebPPTConfig.beforeEach?: BeforeEachFn`
- **依赖**：无

---

### 阶段二：核心逻辑

#### T-002 更新 cli.ts / buildSlidesConfig ⏳

- **复杂度**：Low
- **文件**：`packages/webppt-cli/src/cli.ts`
- **内容**：
  - `order` 处理改为调用函数
  - overlay/underlay 自动检测文件名保持 `_overlay.html`/`_underlay.html`（现有逻辑兼容）
- **依赖**：T-001

#### T-003 更新 dev-server.ts ⏳

- **复杂度**：Medium
- **文件**：`packages/webppt-cli/src/dev-server.ts`
- **内容**：
  - `DevServerOptions` 新增 `getPluginConfig()` 方法
  - `/*` 路由添加 assets fallback 逻辑（含冲突黄色警告）
  - `/*` 路由对幻灯片文件执行 `beforeEach`
- **依赖**：T-001

#### T-004 更新 cli.ts / runCli（传递 pluginConfig） ⏳

- **复杂度**：Low
- **文件**：`packages/webppt-cli/src/cli.ts`
- **内容**：
  - `startDevServer` 调用时传入 `getPluginConfig`
  - `onFileChange` 中同步更新 pluginConfig
- **依赖**：T-002、T-003

---

### 阶段三：测试更新

#### T-005 更新 types.test.ts ⏳

- **复杂度**：Low
- **文件**：`packages/webppt-cli/src/types.test.ts`
- **内容**：更新 `order` 相关测试用例为函数形式

#### T-006 更新 cli.test.ts ⏳

- **复杂度**：Low
- **文件**：`packages/webppt-cli/src/cli.test.ts`
- **内容**：
  - 测试 `overlay.html` / `underlay.html` 自动检测
  - 测试 `order` 函数形式
  - 测试 `RESERVED` 文件排除

#### T-007 更新 dev-server.test.ts ⏳

- **复杂度**：Medium
- **文件**：`packages/webppt-cli/src/dev-server.test.ts`
- **内容**：
  - 测试 assets fallback 路由
  - 测试 assets 冲突警告
  - 测试 `beforeEach` 对幻灯片的转换
  - 测试 `beforeEach` 不作用于 overlay/underlay

---

## 进度追踪

| 任务  | 状态 | 备注              |
| ----- | ---- | ----------------- |
| T-001 | ⏳   |                   |
| T-002 | ⏳   | 依赖 T-001        |
| T-003 | ⏳   | 依赖 T-001        |
| T-004 | ⏳   | 依赖 T-002、T-003 |
| T-005 | ⏳   |                   |
| T-006 | ⏳   |                   |
| T-007 | ⏳   |                   |
