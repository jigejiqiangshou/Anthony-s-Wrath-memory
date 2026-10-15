// 文档一致性检查器 —— 对 specs/<NNN>-<slug>/ 下的 plan.md、tasks.md、spec.md 做机械核对。
// 用途:覆盖度与引用完整性必须靠机械核对,不能靠通读(本轮实测教训见 log/004)。
// 用法:node check-artifacts.mjs "<项目根目录>" "<specs/001-anthonys-wrath 的绝对路径>"
// 无第三方依赖,只用 Node 内置模块。

import { readFileSync } from "node:fs";
import { join } from "node:path";

const [, featureDir] = process.argv.slice(2);
if (!featureDir) {
	console.error('usage: node check-artifacts.mjs "<projectRoot>" "<featureDir>"');
	process.exit(2);
}
const read = (p) => readFileSync(join(featureDir, p), "utf8");
const problems = [];
const note = (m) => problems.push(m);

const tasksSrc = read("tasks.md");
const planSrc = read("plan.md");
const specSrc = read("spec.md");

// 任务条目:编号 / 可选标注 / 其余正文(允许跨行,直到下一条任务或下一个二级标题)
const blocks = [
	...tasksSrc.matchAll(
		/^- \[ \] (T\d{3})\s*(\[[^\]]*\])?([\s\S]*?)(?=^- \[ \] T\d{3}|\r?\n## |\s*$)/gm,
	),
];
const ids = blocks.map((m) => m[1]);
const nums = ids.map((id) => Number(id.slice(1)));

// 1. 编号:唯一、升序、连续
if (new Set(ids).size !== ids.length) note("tasks.md 有重复任务号");
if (nums.join(",") !== [...nums].sort((a, b) => a - b).join(","))
	note("tasks.md 编号不是升序");
if (nums.some((n, i) => n !== i + 1)) note("tasks.md 编号不连续(存在空洞)");

// 2. 依赖引用必须存在
for (const [, id, , rest] of blocks) {
	const m = rest.match(/\(depends:\s*([^)]+)\)/);
	if (!m) continue;
	for (const d of m[1].split(",").map((s) => s.trim()))
		if (!ids.includes(d)) note(`${id} 依赖的任务不存在: ${d}`);
}

// 3. 规格需求必须至少被一条任务承接(在标注或正文里出现即可)
//    豁免列表:必须写在这里并给出规格依据,不允许靠人记住例外。
const EXEMPT = new Map([
	[
		"EC-007",
		"spec.md 声明\"本项为设计约束,不单独安排验收手段\",复现需第三方 mod",
	],
]);
const coverageText = blocks.map((m) => `${m[2] ?? ""} ${m[3] ?? ""}`).join("\n");
const reqIds = [
	...new Set([...specSrc.matchAll(/\b(?:FR|SC|EC)-\d{3}\b/g)].map((m) => m[0])),
];
const unTagged = [];
for (const r of reqIds)
	if (!coverageText.includes(r) && !EXEMPT.has(r)) unTagged.push(r);
if (unTagged.length) note(`规格需求无任务承接: ${unTagged.join(", ")}`);

// 4. plan 引用的任务号必须存在
const planRefs = [...new Set([...planSrc.matchAll(/\bT\d{3}\b/g)].map((m) => m[0]))];
const dangling = planRefs.filter((r) => !ids.includes(r));
if (dangling.length) note(`plan 引用了不存在的任务号: ${dangling.join(", ")}`);

// 5. plan 里的 T-P/T-V 标签必须映射到任务号
planSrc.split(/\r?\n/).forEach((line, i) => {
	if (/T-(?:P\d|V\d)/.test(line) && !/T\d{3}/.test(line))
		note(`plan 第 ${i + 1} 行的 T-P/T-V 标签未映射到任务号`);
});

console.log(
	JSON.stringify(
		{
			ok: problems.length === 0,
			tasks: ids.length,
			requirements: reqIds.length,
			problems,
		},
		null,
		2,
	),
);
process.exitCode = problems.length === 0 ? 0 : 1;
