import { execSync } from "child_process";
import fs from "fs";

const USERNAME = process.env.GH_USERNAME || "telegrace";
const DATE = "2026-01-01";
const LIMIT = 1000;
const CONCURRENCY = 5; // avoid rate limits

function run(cmd) {
	return execSync(cmd, {
		encoding: "utf-8",
		stdio: ["pipe", "pipe", "ignore"],
	});
}

// ---------- STEP 1: FETCH PRS ----------
// -- involves: includes PRs where the user is author, assignee, reviewer, or mentioned in comments
// -- author: only includes PRs created by the user
// -- merged: only includes PRs that were merged
function fetchPRs() {
	console.log("Fetching PRs via search...");

	const cmd = `
  gh search prs \
    --author ${USERNAME} \
		--merged \
    --created ">=${DATE}" \
    --json title,body,repository,createdAt,closedAt,url,number \
    --limit ${LIMIT}
	`;

	const prs = JSON.parse(run(cmd));

	console.log(`Fetched ${prs.length} PRs`);
	return prs;
}

// ---------- STEP 2: DEDUPE ----------
function dedupePRs(prs) {
	const seen = new Set();

	return prs.filter((pr) => {
		if (seen.has(pr.url)) return false;
		seen.add(pr.url);
		return true;
	});
}

// ---------- STEP 3: ENRICH ----------
function enrichPR(pr) {
	try {
		const cmd = `
      gh pr view ${pr.url} \
      --json additions,deletions,files
    `;

		const extra = JSON.parse(run(cmd));

		return {
			...pr,
			additions: extra.additions || 0,
			deletions: extra.deletions || 0,
			files: extra.files?.map((f) => f.path) || [],
		};
	} catch {
		return {
			...pr,
			additions: 0,
			deletions: 0,
			files: [],
		};
	}
}

// concurrency control
async function enrichAll(prs) {
	const results = [];
	let index = 0;

	async function worker() {
		while (index < prs.length) {
			const i = index++;
			const enriched = enrichPR(prs[i]);
			results[i] = enriched;
		}
	}

	const workers = Array.from({ length: CONCURRENCY }, worker);
	await Promise.all(workers);

	return results;
}

// ---------- STEP 4: NORMALIZE REPO ----------
function getRepoName(pr) {
	return (
		pr.repository?.nameWithOwner ||
		`${pr.repository?.owner?.login}/${pr.repository?.name}` ||
		"unknown"
	);
}

// ---------- STEP 5: GROUP ----------
function groupByRepo(prs) {
	const grouped = {};

	for (const pr of prs) {
		const repo = getRepoName(pr);

		if (!grouped[repo]) grouped[repo] = [];

		grouped[repo].push({
			title: pr.title,
			body: pr.body,
			additions: pr.additions,
			deletions: pr.deletions,
			files: pr.files,
			createdAt: pr.createdAt,
			mergedAt: pr.closedAt,
			url: pr.url,
		});
	}

	// sort each repo by most recent
	for (const repo in grouped) {
		grouped[repo].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
	}

	return grouped;
}

// ---------- STEP 6: MAIN ----------
async function main() {
	const raw = fetchPRs();
	const deduped = dedupePRs(raw);

	console.log(`After dedupe: ${deduped.length} PRs`);

	console.log("Enriching PRs (parallel)...");
	const enriched = await enrichAll(deduped);

	console.log("Grouping by repo...");
	const grouped = groupByRepo(enriched);

	fs.writeFileSync("prs.json", JSON.stringify(grouped, null, 2));

	console.log(`Saved ${Object.keys(grouped).length} repos to prs.json ✅`);
}

main();
