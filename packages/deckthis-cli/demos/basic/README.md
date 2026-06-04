# basic demo

最简单的 deckthis 示例，三张纯 HTML 幻灯片，无需任何配置文件。

## 使用方法

```bash
deckthis demo basic   # 复制到当前目录
cd basic
deckthis .
```

## 文件说明

```
basic/
  01.html   # 第一张幻灯片
  02.html   # 第二张幻灯片
  03.html   # 第三张幻灯片
```

deckthis 会按文件名字母顺序自动发现所有不以 `_` 开头的 `.html` 文件作为幻灯片。
