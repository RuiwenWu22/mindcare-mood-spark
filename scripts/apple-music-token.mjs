#!/usr/bin/env node
/**
 * 在你自己的电脑上生成 Apple Music 开发者令牌（developer token）。
 * 私钥（.p8）只在这台电脑上读取，不会上传，也不需要发给任何人。
 *
 * 用法：
 *   node scripts/apple-music-token.mjs --team <Team ID> --key <Key ID> --p8 <AuthKey_XXXX.p8 的路径> [--days 180] [--origin https://你的网址]
 *
 * 令牌最长 180 天（Apple 的上限），过期后 MindCare 会自动退回手动输入，重新生成一个即可。
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const team = args.team;
const kid = args.key;
const p8 = args.p8;
const days = Math.min(Number(args.days ?? 180), 180);
const origins = (args.origin ?? "https://mindcare-mood-spark.lovable.app").split(",").map((s) => s.trim());

if (!team || !kid || !p8 || !Number.isFinite(days) || days <= 0) {
  console.error("用法：node scripts/apple-music-token.mjs --team <Team ID> --key <Key ID> --p8 <AuthKey.p8> [--days 180] [--origin https://...]");
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid };
// origin 限定只有这些网址能用这个令牌，令牌出现在网页里也不容易被别人拿去用
const payload = { iss: team, iat: now, exp: now + Math.floor(days * 86400) - 60, origin: origins };
const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
const key = createPrivateKey(readFileSync(p8, "utf8"));
const sig = sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" });

console.log(`${data}.${b64url(sig)}`);
console.error(`\n有效期到 ${new Date(payload.exp * 1000).toLocaleString("zh-CN")}，限定网址：${origins.join(", ")}`);
