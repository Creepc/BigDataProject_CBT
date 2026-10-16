import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const python = process.argv[2] ?? 'python'
const normalize = (value) => value.replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').trim()
const failures = []
let checked = 0
for (const file of ['lessons-notion12.json', 'lessons-notion34.json', 'lessons-web123.json']) {
  const { lessons } = JSON.parse(fs.readFileSync(path.join(root, 'analysis', file), 'utf8'))
  for (const lesson of lessons) {
    const example = lesson.codeExample
    if (!example || example.language !== 'python') continue
    checked += 1
    const result = spawnSync(python, ['-X', 'utf8', '-c', example.code], {
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    if (result.error || result.status !== 0 || normalize(result.stdout ?? '') !== normalize(example.expectedOutput)) {
      failures.push({ conceptId: lesson.conceptId, file, exit: result.status, expected: example.expectedOutput, actual: result.stdout, error: result.error?.message ?? result.stderr })
    }
  }
}
console.log(JSON.stringify({ checked, passed: checked - failures.length, failures }, null, 2))
if (failures.length) process.exitCode = 1
