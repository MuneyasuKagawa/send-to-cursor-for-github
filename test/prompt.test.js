const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const context = vm.createContext({ console });
for (const source of [
  "src/i18n.js",
  "src/locales/ja.js",
  "src/locales/en.js",
  "src/config.js",
  "src/prompt.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, source), "utf8"), context, {
    filename: source,
  });
}

const ns = context.SendToCursor;

const values = {
  repository: "octocat/hello-world",
  prNumber: "42",
  prTitle: "Improve the greeting",
  prUrl: "https://github.com/octocat/hello-world/pull/42",
  headBranch: "feature/greeting",
  headLabel: "octocat:feature/greeting",
  baseBranch: "main",
  author: "octocat",
  commentUrl:
    "https://github.com/octocat/hello-world/pull/42#discussion_r123",
  filePath: "src/greeting.js",
  lines: "12-18",
  checkName: "test",
  checkUrl:
    "https://github.com/octocat/hello-world/actions/runs/123/job/456",
  issueNumber: "7",
  issueTitle: "Support another greeting",
  issueUrl: "https://github.com/octocat/hello-world/issues/7",
  issueLabels: "enhancement",
};

test("Japanese and English catalogs have the same keys", () => {
  assert.deepEqual(
    Object.keys(ns.MESSAGES.ja).sort(),
    Object.keys(ns.MESSAGES.en).sort(),
  );
});

test("every default template declares the trust boundary and read-only scope", () => {
  for (const language of ns.LANGUAGES) {
    ns.setLanguage(language);
    for (const target of ns.TARGETS) {
      const template = ns.defaultTemplate(target.id);
      assert.match(
        template,
        language === "ja" ? /安全上の制約/ : /Safety constraints/,
      );
      assert.match(
        template,
        language === "ja"
          ? /ファイル.*変更せず/
          : /Do not change code|Do not change code, dependencies/,
      );
    }
  }
});

test("default templates only use placeholders declared by their target", () => {
  const placeholder = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
  for (const language of ns.LANGUAGES) {
    ns.setLanguage(language);
    for (const target of ns.TARGETS) {
      const used = [...ns.defaultTemplate(target.id).matchAll(placeholder)].map(
        (match) => match[1],
      );
      assert.deepEqual(
        [...new Set(used)].sort(),
        [...target.placeholders].sort(),
      );
    }
  }
});

test("renderTemplate drops empty sections without reinterpreting inserted text", () => {
  const rendered = ns.renderTemplate(
    "## Optional\n- File: {{filePath}}\n## Body\n{{commentBody}}\n- Repo: {{repository}}",
    {
      filePath: "",
      commentBody: "Use the literal placeholder {{repository}}.",
      repository: "octocat/hello-world",
    },
  );

  assert.doesNotMatch(rendered, /Optional/);
  assert.match(rendered, /literal placeholder \{\{repository\}\}/);
  assert.match(rendered, /Repo: octocat\/hello-world/);
});

test("truncation keeps both ends and never splits emoji", () => {
  ns.setLanguage("en");
  const result = ns.buildPromptDeeplink({
    template: "Context\n{{commentBody}}\nInstructions\nDo not edit files.",
    values: {},
    body: `START🙂${"middle".repeat(500)}END🚀`,
    bodyKey: "commentBody",
    linkMode: "protocol",
    urlLimit: 500,
  });

  assert.equal(result.truncated, true);
  assert.ok(result.url.length <= 500);
  assert.match(result.prompt, /START🙂/);
  assert.match(result.prompt, /END🚀/);
  assert.match(result.prompt, /middle of the GitHub body was omitted/);
  assert.doesNotThrow(() => decodeURIComponent(result.url.split("?text=")[1]));
});

test("an oversized fixed template falls back to a valid deeplink", () => {
  ns.setLanguage("en");
  const result = ns.buildPromptDeeplink({
    template: `BEGIN${"あ".repeat(1000)}{{commentBody}}${"い".repeat(1000)}END`,
    values: {},
    body: "body",
    bodyKey: "commentBody",
    linkMode: "protocol",
    urlLimit: 500,
  });

  assert.equal(result.truncated, true);
  assert.ok(result.url.length <= 500);
  assert.match(result.prompt, /^BEGIN/);
  assert.match(result.prompt, /END$/);
  assert.match(result.prompt, /middle of the prompt was omitted/);
});

test("default templates preserve their instructions when a long body is shortened", () => {
  for (const language of ns.LANGUAGES) {
    ns.setLanguage(language);
    for (const target of ns.TARGETS) {
      const result = ns.buildPromptDeeplink({
        template: ns.defaultTemplate(target.id),
        values,
        body: "本文🙂".repeat(5000),
        bodyKey: target.bodyKey,
        linkMode: "protocol",
        urlLimit: ns.URL_LIMIT,
      });

      assert.equal(result.truncated, true);
      assert.ok(result.url.length <= ns.URL_LIMIT);
      assert.match(
        result.prompt,
        new RegExp(ns.t("prompt.truncationNote").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
      assert.doesNotMatch(
        result.prompt,
        new RegExp(
          ns
            .t("prompt.fallbackTruncationNote")
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      );
    }
  }
});
