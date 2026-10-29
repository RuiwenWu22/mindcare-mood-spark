# 学情管理 skill：场景模版

`templates/` 里是 skill 支持的十种报告场景，各一份 PDF 样例，全部用示例数据生成，学生姓名是随机的。
`samples-all-formats.zip` 里有每个场景的 PDF、Word、HTML 三种格式，以及生成用的示例数据。
`skill-doubao-xueqing-manager.zip` 是 skill 安装包。

## 错题分析报告（模式 B）

| 模版 | 场景 | 什么时候用 | 需要的数据 |
|---|---|---|---|
| `B1-error-class.pdf` | 全班版 | 讲评一个班的错题、错因 | 逐题得分 + 题目档案 |
| `B2-error-student.pdf` | 单人版（有同班数据） | 某个学生的错题报告，带班级对比 | 全班逐题得分 |
| `B3-error-student-only.pdf` | 单人版（只有本人数据） | 只拿到一名学生的试卷 | 该生逐题得分；报告不含班级对比 |

## 成绩分析报告（模式 C）

| 模版 | 场景 | 什么时候用 | 需要的数据 |
|---|---|---|---|
| `C1-score-grade-multi-subject.pdf` | 年级 · 多科 · 含历次 | 教务处的年级月考 / 期中成绩分析 | 各科成绩；有上一场考试时加历次对比 |
| `C2-score-class-multi-subject.pdf` | 单班 · 多科 · 含历次 | 班主任看本班各科 | 同上，`--class` 写一个班 |
| `C3-score-class-item-scores.pdf` | 单班 · 单科 · 有小题分 | 任课教师看本班一科，含题型与选项分析 | 逐题得分 + 题目档案 |
| `C4-score-classes-total-only.pdf` | 多班 · 单科 · 只有总分 | 学校成绩表只有总分 | 总分（可含缺考） |

## 试卷分析报告（模式 E）

| 模版 | 场景 | 什么时候用 | 需要的数据 |
|---|---|---|---|
| `E1-paper-classes-item-scores.pdf` | 多班 · 有小题分 | 本人所带几个班一起做试卷分析 | 逐题得分 + 题目档案 |
| `E2-paper-classes-total-only.pdf` | 多班 · 只有总分 | 同上，但只有总分 | 总分 + 题目档案（列试卷结构用） |
| `E3-paper-class-item-scores.pdf` | 单班 · 有小题分 | 一个班的试卷分析 | 逐题得分 + 题目档案 |

模式 A（成绩录入）和模式 D（口径调整，如改及格线、导出 Word / HTML）不产出单独的报告：
A 产出飞书表格和数据集，D 修改设置后重新生成上面的报告。
