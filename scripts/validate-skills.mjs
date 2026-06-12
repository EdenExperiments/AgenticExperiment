import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, ".cursor", "skills", "skills.index.json");
const skillsRoot = path.join(repoRoot, ".cursor", "skills");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectSkillFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSkillFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "SKILL.md") {
      files.push(fullPath);
    }
  }

  return files;
}

function relativePosix(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function parseFrontmatterBlock(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

function folderNameFromSkillPath(skillPath) {
  const parts = skillPath.split("/");
  const skillIdx = parts.lastIndexOf("SKILL.md") - 1;
  return skillIdx >= 0 ? parts[skillIdx] : null;
}

function validateSkillMarkdown(content, expectedName, skillPath) {
  const issues = [];
  const frontmatter = parseFrontmatterBlock(content);
  if (!frontmatter) {
    issues.push("missing YAML frontmatter");
  }
  if (!content.includes("name:")) {
    issues.push("missing frontmatter name");
  }
  if (!content.includes("description:")) {
    issues.push("missing frontmatter description");
  }
  const folderName = folderNameFromSkillPath(skillPath);
  if (folderName && expectedName && folderName !== expectedName) {
    issues.push(`directory name '${folderName}' does not match skill name '${expectedName}'`);
  }
  if (frontmatter && frontmatter.includes("paths:")) {
    const pathsSection = frontmatter.split("paths:")[1] ?? "";
    if (!pathsSection.includes("- ")) {
      issues.push("paths frontmatter present but no list entries found");
    }
  }
  if (!content.includes("## When to use")) {
    issues.push("missing '## When to use' section");
  }
  if (!content.includes("## Inputs")) {
    issues.push("missing '## Inputs' section");
  }
  if (!content.includes("## Outputs")) {
    issues.push("missing '## Outputs' section");
  }
  if (!content.includes("## Examples")) {
    issues.push("missing '## Examples' section");
  }
  if (expectedName && !content.includes(`name: ${expectedName}`)) {
    issues.push(`frontmatter name does not match '${expectedName}'`);
  }
  return issues;
}

async function main() {
  const failures = [];

  if (!(await fileExists(indexPath))) {
    console.error(`Missing skills index: ${relativePosix(indexPath)}`);
    process.exit(1);
  }

  let index;
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    index = JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse skills index: ${String(error)}`);
    process.exit(1);
  }

  if (!Array.isArray(index.skills) || index.skills.length === 0) {
    failures.push("skills.index.json must contain a non-empty 'skills' array");
  }

  const seenNames = new Set();
  const seenPaths = new Set();

  for (const [idx, skill] of (index.skills ?? []).entries()) {
    const context = `skills[${idx}]`;
    for (const field of ["name", "path", "domain", "when_to_use"]) {
      if (!skill?.[field] || typeof skill[field] !== "string") {
        failures.push(`${context} missing string field '${field}'`);
      }
    }

    if (!skill?.name || !skill?.path) {
      continue;
    }

    if (seenNames.has(skill.name)) {
      failures.push(`${context} duplicate skill name '${skill.name}'`);
    }
    seenNames.add(skill.name);

    if (seenPaths.has(skill.path)) {
      failures.push(`${context} duplicate skill path '${skill.path}'`);
    }
    seenPaths.add(skill.path);

    if (!skill.path.startsWith(".cursor/skills/")) {
      failures.push(`${context} path must start with '.cursor/skills/'`);
    }

    const absolutePath = path.join(repoRoot, skill.path);
    if (!(await fileExists(absolutePath))) {
      failures.push(`${context} file not found: ${skill.path}`);
      continue;
    }

    const content = await fs.readFile(absolutePath, "utf8");
    const issues = validateSkillMarkdown(content, skill.name, skill.path);
    for (const issue of issues) {
      failures.push(`${skill.path}: ${issue}`);
    }
  }

  const allSkillFiles = await collectSkillFiles(skillsRoot);
  for (const file of allSkillFiles) {
    const rel = relativePosix(file);
    if (!seenPaths.has(rel)) {
      failures.push(`skills.index.json missing entry for ${rel}`);
    }
  }

  if (failures.length > 0) {
    console.error("Skill validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Skill validation passed (${index.skills.length} indexed skill(s), ${allSkillFiles.length} discovered file(s)).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
