# Cookbook: Add New Skill

Last Updated: 2026-02-14  
Owner: Engineering (Tech Lead)

## 1. Goal

在 `agents-js/skills/` 新增一个可被 Agent 发现与使用的 skill，且具备最小测试与文档闭环。

## 2. Preconditions

1. 明确 skill 的业务目标与边界
2. 确认运行环境（Node / Browser / 两者）
3. 明确是否依赖外部 API、权限或密钥

## 3. Required Structure

在 `skills/<skill_name>/` 至少包含：

1. `SKILL.md`
2. `tools.js`（若该 skill 需要工具）

`SKILL.md` SHOULD 包含：
- name / description
- 使用场景
- 工具清单与参数说明
- 已知限制与安全边界

## 4. Implementation Steps

1. 设计 skill 能力边界
2. 编写 `SKILL.md`（先文档后实现）
3. 实现 `tools.js`（结构化参数与结构化返回）
4. 配置风险等级与元数据（risk/meta）
5. 本地注册与发现验证（`list_available_skills` / `read_skill_documentation`）
6. 补测试（至少成功 + 失败路径）
7. 更新 docs（skills 或 cookbook）

## 5. Validation Commands

```bash
npm test
npm run build
```

发现链路建议手测：

```bash
node index.js "list available skills and read <skill_name> docs"
```

## 6. DoD Checklist

- [ ] skill 目录结构完整
- [ ] `SKILL.md` 可被读取且信息完整
- [ ] 工具返回为 JSON 可序列化对象
- [ ] 风险等级已定义
- [ ] 至少 1 个失败路径已覆盖
- [ ] docs 已更新

## 7. Common Pitfalls

1. `SKILL.md` 写了能力，但 `tools.js` 未实现
2. 工具名与现有工具冲突
3. 错误返回不可操作（无 hint）
4. 未声明运行环境限制（Node-only / Browser-only）
5. 改了 skill 但未补 discovery 验证

