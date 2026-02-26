# 🎨 UI/UX 设计原则

`agents-js` 前端 UI 遵循 Apple 的极简主义美学 (Apple Minimalism)。

## 1. 视觉语言
- **排版**: 优先使用系统字体 `-apple-system, BlinkMacSystemFont, "Segoe UI"`。
- **色彩**: 极简配色，使用 `systemGray` 系列和 Apple 典型的蓝 (`#007AFF`) 作为高亮。
- **深度**: 使用极其微妙的阴影（`0 2px 8px rgba(0,0,0,0.06)`）而非厚重的边框。
- **留白**: 强调大面积留白，让对话内容成为核心。

## 2. 交互体验
- **微互动**: 所有的按钮和对话泡都应有 `0.2s ease` 的平滑过渡。
- **实时反馈**: 即使 Agent 正在思考，UI 也会显示思考步数，消除用户“死机”的错觉。
- **流式输出**: 结合 CSS 动画模拟打字机效果，使响应看起来更有生命力。
- **Thought Timeline**: 在同一 assistant 气泡内展示 Step/Tool/Approval/Execute 的可读时间线；只展示“动作与状态”，不输出原始 Chain-of-Thought；tool args 预览默认脱敏并截断。

## 3. 性能优化 (减负原则)
根据用户规则，我们严格控制 CPU 和 GPU 的压力：

- **零 Backdrop-Filter**: 默认不使用高斯模糊等高负载滤镜，确保低配设备流畅滚动。
- **属性优化**: 动画仅作用于 `opacity` 和 `transform`，以触发硬件加速并避免重绘。
- **DOM 最小化**: 仅在必要时更新对话历史 DOM，利用 `createDocumentFragment` 提升批量插入性能。
- **滚动优化**: 使用 `requestAnimationFrame` 保证对话自动滚动到底部时的平滑度。
