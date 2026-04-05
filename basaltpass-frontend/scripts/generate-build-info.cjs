const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const outputFile = path.join(projectRoot, 'src', 'shared', 'generated', 'buildInfo.ts')
const packageJsonPath = path.join(projectRoot, 'package.json')

function readPackageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    return packageJson.version || '0.1.0'
  } catch {
    return '0.1.0'
  }
}

function runGit(command) {
  try {
    return execSync(`git -c safe.directory=* ${command}`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function resolveVersion() {
  const envVersion = process.env.VITE_APP_VERSION?.trim()
  if (envVersion) {
    return envVersion
  }

  const exactTag = runGit('describe --tags --exact-match')
  if (exactTag) {
    return exactTag
  }

  const latestTag = runGit('describe --tags --abbrev=0')
  if (latestTag) {
    return latestTag
  }

  return `v${readPackageVersion()}`
}

function resolveCommit() {
  return runGit('rev-parse --short HEAD') || 'unknown'
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

const version = resolveVersion()
const commit = resolveCommit()
const generatedAt = new Date().toISOString()

const content = `export const buildInfo = {
  version: ${JSON.stringify(version)},
  commit: ${JSON.stringify(commit)},
  generatedAt: ${JSON.stringify(generatedAt)},
  copyrightStartYear: 2024,
} as const
`

ensureDir(outputFile)
fs.writeFileSync(outputFile, content, 'utf8')

console.log(`[build-info] version=${version} commit=${commit}`)
