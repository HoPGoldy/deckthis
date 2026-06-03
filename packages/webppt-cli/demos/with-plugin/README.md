# with-plugin demo

演示如何编写和使用 webppt 插件。插件是一个普通函数，入参自定义，返回标准 `WebPPTConfig`，
通过组合 `order` / `assets` / `beforeEach` 来封装可复用的主题逻辑。

## 使用方法

```bash
webppt demo with-plugin   # 复制到当前目录
cd with-plugin
webppt .
```

## 文件说明

```
with-plugin/
  index.ts              # 调用插件，传入标题等参数
  01.html ~ 03.html     # 正文幻灯片（封面和致谢页由插件自动插入）
  _plugin/
    simple-theme.ts     # 插件实现：封装主题 CSS、封面页、致谢页
    simple-theme.css    # 主题样式
    cover.html          # 封面页模板（通过 data-* 属性接收标题）
    thanks.html         # 致谢页模板
    overlay.html        # 右下角水印层
```

## 插件机制

`simpleTheme` 插件内部：

1. 把自己的 CSS、封面页、致谢页通过 `assets` 注册为静态资源
2. 用 `order` 在幻灯片列表头尾插入封面和致谢页
3. 用 `beforeEach` 向每张幻灯片注入主题 CSS，并为封面/致谢页写入 `data-*` 参数
4. 用户传入的 `config` 会被叠加：用户的 `beforeEach` 会在插件注入之后执行

`getDeckDir()` 由 webppt 注入，插件用它构造 `_plugin/` 目录下各文件的绝对路径。
