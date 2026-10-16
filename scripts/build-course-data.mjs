import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const inputs = [
  { file: 'notion12.json', scope: 'n12' },
  { file: 'notion34.json', scope: 'n34' },
  { file: 'web123.json', scope: 'web' },
]

for (const input of inputs) {
  const fullPath = path.join(root, 'analysis', input.file)
  if (!fs.existsSync(fullPath)) throw new Error(`Missing analysis file: ${fullPath}`)
  input.data = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
}

const fileMeta = {
  'notion-w1': { shortTitle: '노션 1주차 · 빅데이터 환경', pdfUrl: 'pdfs/notion-week1.pdf', week: 1, kind: '노션', color: '#3159d8' },
  'notion-w2': { shortTitle: '노션 2주차 · 빅데이터란', pdfUrl: 'pdfs/notion-week2.pdf', week: 2, kind: '노션', color: '#496bd6' },
  'w3-infra': { shortTitle: '노션 3주차 · 인프라', pdfUrl: 'pdfs/notion-week3.pdf', week: 3, kind: '노션', color: '#2f8f72' },
  'w4-netflix': { shortTitle: '노션 4주차 · Netflix 분석', pdfUrl: 'pdfs/notion-week4-netflix.pdf', week: 4, kind: '노션', color: '#c95e57' },
  web1: { shortTitle: '웹 1주차 · 오리엔테이션', pdfUrl: 'pdfs/website-week1.pdf', week: 1, kind: '웹사이트', color: '#6750c7' },
  web2: { shortTitle: '웹 2주차 · 빅데이터와 생성형 AI', pdfUrl: 'pdfs/website-week2.pdf', week: 2, kind: '웹사이트', color: '#b26a20' },
  web3: { shortTitle: '웹 3주차 · Netflix EDA', pdfUrl: 'pdfs/website-week3-netflix.pdf', week: 3, kind: '웹사이트', color: '#d04b73' },
}

const asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value]
const numbers = (value) => asArray(value).map(Number).filter((item) => Number.isFinite(item) && item > 0)
const numericValues = (value) => asArray(value).map(Number).filter((item) => Number.isFinite(item))
const strings = (value) => asArray(value).map((item) => typeof item === 'string' ? item : JSON.stringify(item)).filter(Boolean)
const difficulty = (value) => ({ easy: '쉬움', medium: '보통', hard: '어려움', 기초: '쉬움', 심화: '보통' }[String(value).toLowerCase()] ?? (['쉬움', '보통', '어려움'].includes(value) ? value : '보통'))
const level = (value) => ({ 쉬움: '기초', 보통: '심화', 어려움: '시험 대비' }[difficulty(value)])
const scoped = (scope, id) => `${scope}-${String(id)}`

const unitLookup = new Map()
for (const input of inputs) {
  for (const unit of input.data.units ?? []) unitLookup.set(scoped(input.scope, unit.id), unit.title ?? unit.name ?? String(unit.id))
}

const conceptIdLookup = new Map()
for (const input of inputs) {
  for (const concept of input.data.concepts ?? []) conceptIdLookup.set(`${input.scope}:${concept.id}`, scoped(input.scope, concept.id))
}

const conceptEvidence = (scope, value) => {
  const raw = String(value ?? '')
  if (/official|verification/.test(raw)) return '강의자료+공식검증'
  if (/instructor_note_aligned_synthesis|cross_document_critical_review|derived_from/.test(raw)) return '강의자료+보충설명'
  if (scope === 'n12' && /standard-concept/.test(raw)) return '강의자료+보충설명'
  return '강의자료'
}

const normalizedConcepts = []
for (const input of inputs) {
  for (const concept of input.data.concepts ?? []) {
    const comparisons = asArray(concept.comparisons).map((item, index) => typeof item === 'string'
      ? { target: `비교 ${index + 1}`, difference: item }
      : { target: item.target ?? item.against ?? item.name ?? `비교 ${index + 1}`, difference: item.difference ?? item.description ?? JSON.stringify(item) })
    const unitKey = scoped(input.scope, concept.unit ?? concept.unitId ?? '')
    const namedImportance = { low: 2, medium: 3, high: 5 }[String(concept.importance).toLowerCase()]
    const rawImportance = namedImportance ?? Number(concept.importance)
    const importance = Math.min(5, Math.max(1, Number.isFinite(rawImportance) ? Math.round(rawImportance) : 3))
    const conceptDifficulty = difficulty(concept.difficulty)
    normalizedConcepts.push({
      id: scoped(input.scope, concept.id),
      name: concept.name ?? concept.title ?? String(concept.id),
      unit: input.scope === 'n34' && concept.id === 'C34'
        ? '전처리·시각화·관계 분석 실습'
        : unitLookup.get(unitKey) ?? concept.unit ?? '기타',
      fileId: concept.fileId,
      pages: numbers(concept.pages ?? concept.pageNumbers),
      definition: concept.definition ?? concept.summary ?? '',
      easyExplanation: concept.easyExplanation ?? concept.easy_explanation ?? concept.definition ?? '',
      mechanism: strings(concept.mechanism ?? concept.principles ?? concept.process),
      examples: strings(concept.examples ?? concept.example),
      comparisons,
      examPoints: strings(concept.examPoints ?? concept.keyPoints ?? concept.exam_points),
      misconceptions: strings(concept.misconceptions ?? concept.commonMistakes),
      relatedConceptIds: strings(concept.relatedConceptIds ?? concept.relatedConcepts)
        .map((id) => conceptIdLookup.get(`${input.scope}:${id}`))
        .filter(Boolean),
      level: level(conceptDifficulty),
      difficulty: conceptDifficulty,
      importance,
      evidenceType: conceptEvidence(input.scope, concept.evidenceType),
      tags: [...new Set([
        concept.name ?? concept.title,
        unitLookup.get(unitKey),
        ...strings(concept.examPoints ?? concept.keyPoints).slice(0, 3),
      ].filter(Boolean).flatMap((item) => String(item).split(/[·,/]/)).map((item) => item.trim()).filter((item) => item.length <= 24))],
    })
  }
}

const fileUnits = new Map()
for (const input of inputs) {
  for (const unit of input.data.units ?? []) {
    for (const fileId of asArray(unit.fileIds ?? unit.fileId)) {
      const existing = fileUnits.get(fileId) ?? []
      fileUnits.set(fileId, [...existing, unit.title ?? unit.name].filter(Boolean))
    }
  }
}

const qualityNotesByFile = new Map()
for (const input of inputs) {
  for (const note of strings(input.data.qualityNotes)) {
    let attached = false
    for (const file of input.data.files ?? []) {
      const meta = fileMeta[file.id]
      if (note.includes(`${meta?.week}주차`) || (file.id.includes('w4') && note.includes('Netflix'))) {
        qualityNotesByFile.set(file.id, [...(qualityNotesByFile.get(file.id) ?? []), note])
        attached = true
      }
    }
    if (!attached && input.scope === 'n34') qualityNotesByFile.set('w4-netflix', [...(qualityNotesByFile.get('w4-netflix') ?? []), note])
  }
  for (const note of input.data.verificationNotes ?? []) {
    for (const source of note.documentPages ?? []) {
      const value = `${note.topic}: ${note.examHandling ?? note.verifiedInterpretation ?? note.documentClaim}`
      qualityNotesByFile.set(source.fileId, [...(qualityNotesByFile.get(source.fileId) ?? []), value])
    }
  }
}

const files = inputs.flatMap((input) => input.data.files ?? []).map((file) => {
  const meta = fileMeta[file.id]
  if (!meta) throw new Error(`Missing file metadata for ${file.id}`)
  const allPages = numbers(file.analyzedPages)
  const unreadablePages = numbers(file.unreadablePages)
  return {
    id: file.id,
    title: file.title,
    shortTitle: meta.shortTitle,
    path: file.path,
    pdfUrl: meta.pdfUrl,
    week: meta.week,
    kind: meta.kind,
    pageCount: Number(file.pageCount),
    analyzedPages: allPages,
    unreadablePages,
    topics: [...new Set([...(fileUnits.get(file.id) ?? []).slice(0, 4), ...normalizedConcepts.filter((concept) => concept.fileId === file.id).slice(0, 3).map((concept) => concept.name)])],
    color: meta.color,
    note: [
      unreadablePages.length
        ? `판독이 어려운 페이지: ${unreadablePages.join(', ')}쪽`
        : '모든 페이지의 텍스트와 시각 요소를 확인했습니다. 표지·목차처럼 시험 개념이 없는 페이지도 분석 완료 수에 포함됩니다.',
      ...(qualityNotesByFile.get(file.id) ?? []),
    ].join(' '),
  }
})

const pageSummaries = inputs.flatMap((input) => (input.data.files ?? []).flatMap((file) => (file.pageSummaries ?? []).map((summary) => ({
  fileId: file.id,
  page: Number(summary.page),
  title: summary.title ?? `${file.title} ${summary.page}쪽`,
  keyPoints: strings(summary.keyPoints ?? summary.points),
  visuals: strings(summary.visuals ?? summary.images ?? summary.tables),
  codes: strings(summary.codes ?? summary.code),
}))))

const inferQuestionType = (question) => {
  const text = `${question.prompt} ${question.review ?? ''}`
  const chartVisual = ['bar', 'line', 'histogram', 'scatter', 'box', 'mini-line-data'].includes(question.visual?.kind)
  if (chartVisual || /차트|히스토그램|막대.?(그래프|차트)|박스.?플롯|산점도|선.? 그래프|기울기|시각화|히트맵|그래프 (?:유형|해석|선택|축|추세|급락)/.test(text)) return '그래프 해석'
  if (/코드|함수|명령|groupby|explode|split|describe|실행|출력|API/.test(text)) return '코드·결과 해석'
  if (/순서|절차|단계|흐름/.test(text)) return '순서·절차'
  if (/옳지 않은|틀린|오개념|할 수 없는|부적절|단정하면 안|주의할 점|오류|불일치|안전하게 해석|증명/.test(text)) return '오개념 판별'
  if (/차이|비교|구분|대비/.test(text)) return '비교 분석'
  if (/상황|사례|조직|팀이|시스템|전환하려|설계|준수해야|적절한|적합한|선택해야|가장 먼저|필요한 항목|직접 답할 수|복합.?질문/.test(text)) return '상황 적용'
  if (/특징|역할|핵심 기능|구성 요소|해당하는 것|옳은 것을 모두/.test(text)) return '특징 구분'
  if (/무엇인가|의미|정의|가리키는/.test(text)) return '개념 정의'
  return '원리 이해'
}

const sourceImages = {
  'n12:q01': { page: 4, title: '빅데이터 소프트웨어 스택', alt: 'Linux, HDFS, MapReduce, 분석 라이브러리 계층을 보여주는 원본 슬라이드' },
  'n12:q03': { page: 14, title: '운영체제 핵심 기능 표', alt: 'CPU, 메모리, 저장장치 관리 기능을 비교한 원본 표' },
  'n12:q04': { page: 15, title: '프로그램과 프로세스', alt: '하드디스크의 프로그램이 메인메모리와 CPU에서 프로세스로 실행되는 구조도' },
  'n12:q05': { page: 19, title: '운영체제 계층 구조', alt: '응용, 사용자 인터페이스, 시스템 호출, 커널, 드라이버, 하드웨어의 계층 구조도' },
  'n12:q06': { page: 22, title: '인쇄 요청과 디바이스 드라이버', alt: '응용 프로그램, 운영체제, 디바이스 드라이버, 프린터 간 요청 흐름' },
  'n12:q08': { page: 36, title: '프로세스 상태 전이', alt: '생성, 준비, 실행, 종료 상태와 PCB 전이를 보여주는 상태도' },
  'n12:q13': { page: 56, title: '파일 테이블과 저장 블록', alt: '파일 A부터 E의 블록 좌표와 저장장치 격자를 연결한 원본 표' },
  'n12:q15': { page: 58, title: '하드디스크 조각 모음', alt: '초기 상태와 조각난 상태의 저장 블록 격자 비교' },
  'n12:q27': { page: 60, title: 'FAT32 연결 할당', alt: '파일 테이블에서 다음 블록 포인터를 따라가는 FAT32 구조' },
  'n12:q29': { page: 61, title: '빈 공간 리스트', alt: '파일 삭제 전후 빈 블록 연결 리스트 비교' },
}

const normalizeVisual = (raw, questionKey) => {
  if (!raw) return undefined
  const sourceImage = sourceImages[questionKey]
  if (sourceImage) return {
    kind: 'source-image',
    title: sourceImage.title,
    labels: [],
    series: [],
    note: 'PDF 원본 슬라이드의 표·구조도를 문항 판독용으로 표시합니다.',
    sourceImage: {
      path: `figures/notion-w1/p${sourceImage.page}.png`,
      alt: sourceImage.alt,
      caption: `${sourceImage.title} · 노션 1주차 ${sourceImage.page}쪽 원본`,
      fileId: 'notion-w1',
      page: sourceImage.page,
    },
  }
  if (raw.kind === 'mini-line-data') {
    return {
      kind: 'line',
      title: '구간별 기울기 계산 연습',
      xLabel: '시점',
      yLabel: '값',
      labels: strings(raw.x),
      series: [{ name: '관측값', values: numericValues(raw.y) }],
      note: raw.analysisRule ?? '',
    }
  }

  if (!['bar', 'line', 'histogram', 'scatter', 'box'].includes(raw.kind)) return undefined
  const series = asArray(raw.series).map((item, index) => {
    const rawValues = asArray(item.values ?? item.data)
    const outliers = numericValues(item.outliers)
    const pairs = rawValues.filter((value) => Array.isArray(value) && value.length >= 2)
    if (raw.kind === 'scatter' && pairs.length === rawValues.length && pairs.length > 0) {
      return {
        name: item.name ?? `계열 ${index + 1}`,
        xValues: pairs.map((value) => Number(value[0])).filter(Number.isFinite),
        values: pairs.map((value) => Number(value[1])).filter(Number.isFinite),
        ...(outliers.length ? { outliers } : {}),
      }
    }
    return {
      name: item.name ?? `계열 ${index + 1}`,
      values: numericValues(rawValues),
      ...(outliers.length ? { outliers } : {}),
    }
  }).filter((item) => item.values.length > 0)
  if (!series.length) return undefined
  return {
    kind: raw.kind,
    title: raw.title ?? '문항 시각자료',
    xLabel: raw.xLabel ?? '',
    yLabel: raw.yLabel ?? '',
    labels: strings(raw.labels),
    series,
    note: raw.note ?? '',
  }
}

const questions = []
const professorFocusIds = new Set([
  'n12:q26',
  'n34:Q21', 'n34:Q26', 'n34:Q28', 'n34:Q30', 'n34:Q31', 'n34:Q32',
  'web:q17', 'web:q21', 'web:q22', 'web:q25', 'web:q27', 'web:q33', 'web:q37', 'web:q40', 'web:q44', 'web:q48',
])
for (const input of inputs) {
  for (const question of input.data.questions ?? []) {
    const questionKey = `${input.scope}:${question.id}`
    const mode = ['multiple', '복수', 'multi'].includes(String(question.mode ?? question.type).toLowerCase()) ? 'multiple' : 'single'
    const sourceList = asArray(question.sourceRefs ?? question.source)
    const visual = normalizeVisual(question.visual, questionKey)
    const graphFocus = visual && visual.kind !== 'source-image'
    const professorFocus = graphFocus
      ? '교수님 필기에 맞춰 그래프 유형·축·집계 단위·분모를 먼저 확인하고, “급격함”은 기울기와 수치 기준으로 명세합니다.'
      : professorFocusIds.has(questionKey)
        ? '교수님 필기에 맞춰 질문의 조건을 명확히 정의하고, 필요한 컬럼·함수·분모·임계값을 함께 명세합니다.'
        : undefined
    questions.push({
      id: scoped(input.scope, question.id),
      prompt: question.prompt ?? question.question,
      mode,
      options: asArray(question.options).map((option, index) => {
        const text = option.text ?? option.label
        const correct = Boolean(option.correct ?? option.isCorrect)
        const base = String(option.explanation ?? option.reason ?? '').trim().replace(/[.。]?$/, '.')
        const correctedStatement = option.correctedStatement ?? option.correction ?? (correct ? text : '')
        const criterion = question.review ?? question.conceptReview ?? '문제에 제시된 정의·조건·분석 단위'
        const explanation = correct
          ? `${base} 이 선택지는 “${text}”를 뜻하며, 핵심 판별 기준인 “${criterion}”와 일치한다. 따라서 문제의 조건에 직접 부합하는 정답이다.`
          : `${base} 이 선택지는 “${text}”를 주장하지만, 대상·방향·순서·단위 또는 해석 범위 중 하나를 혼동한다. 핵심 기준인 “${criterion}”와 어긋나므로 정답이 될 수 없다. “${correctedStatement}”로 고치면 올바른 설명이 된다.`
        return { id: `o${index + 1}`, text, correct, explanation, correctedStatement }
      }),
      conceptIds: strings(question.conceptIds ?? question.relatedConceptIds)
        .map((id) => conceptIdLookup.get(`${input.scope}:${id}`))
        .filter(Boolean),
      sourceRefs: asArray(sourceList).map((source) => ({ fileId: source.fileId, pages: numbers(source.pages ?? source.page) })),
      difficulty: difficulty(question.difficulty),
      type: question.category ?? inferQuestionType(question),
      review: question.review ?? question.conceptReview ?? '',
      memoryTip: question.memoryTip ?? question.examTip ?? '',
      additionalExample: question.additionalExample ?? question.example ?? '',
      professorFocus,
      supplemental: Boolean(question.supplemental || question.visual?.kind === 'mini-line-data' || visual?.note?.includes('보충')),
      ...(visual ? { visual } : {}),
    })
  }
}

const flashcards = inputs.flatMap((input) => (input.data.flashcards ?? []).map((card) => {
  const source = asArray(card.source)[0] ?? card
  const rawConcept = input.scope === 'n34' && card.id === 'F38'
    ? 'C27'
    : asArray(card.conceptIds ?? card.conceptId)[0]
  return {
    id: scoped(input.scope, card.id),
    front: String(card.front).replace(/란\?$/, '의 뜻은?'),
    back: card.back,
    conceptId: conceptIdLookup.get(`${input.scope}:${rawConcept}`) ?? scoped(input.scope, rawConcept ?? 'unknown'),
    fileId: source.fileId ?? card.fileId,
    pages: numbers(source.pages ?? card.pages),
  }
}))

const concepts = normalizedConcepts.map((concept) => {
  const direct = questions.filter((question) => question.conceptIds.includes(concept.id)).map((question) => question.id)
  const unitRelated = direct.length ? [] : questions
    .filter((question) => question.conceptIds.some((id) => normalizedConcepts.find((item) => item.id === id)?.unit === concept.unit))
    .map((question) => question.id)
    .slice(0, 3)
  return { ...concept, relatedQuestionIds: [...direct, ...unitRelated] }
})

const courseData = {
  files,
  pageSummaries,
  concepts,
  questions,
  flashcards,
  generatedAt: new Date().toISOString().slice(0, 10),
}

const errors = []
const fileIds = new Set(files.map((file) => file.id))
const conceptIds = new Set(normalizedConcepts.map((concept) => concept.id))
const filePageCounts = new Map(files.map((file) => [file.id, file.pageCount]))
for (const file of files) {
  if (file.analyzedPages.length !== file.pageCount) errors.push(`${file.id}: analyzed ${file.analyzedPages.length}/${file.pageCount}`)
  const expected = Array.from({ length: file.pageCount }, (_, index) => index + 1)
  if (JSON.stringify([...new Set(file.analyzedPages)].sort((a, b) => a - b)) !== JSON.stringify(expected)) errors.push(`${file.id}: analyzed page set is incomplete`)
  const summaries = pageSummaries.filter((summary) => summary.fileId === file.id)
  if (summaries.length !== file.pageCount) errors.push(`${file.id}: summaries ${summaries.length}/${file.pageCount}`)
}
for (const concept of normalizedConcepts) {
  if (!fileIds.has(concept.fileId)) errors.push(`${concept.id}: unknown file ${concept.fileId}`)
  if (!concept.pages.length) errors.push(`${concept.id}: no source pages`)
  for (const page of concept.pages) if (page > (filePageCounts.get(concept.fileId) ?? 0)) errors.push(`${concept.id}: invalid page ${page}`)
}
for (const concept of concepts) if (!concept.relatedQuestionIds.length) errors.push(`${concept.id}: no related questions`)
for (const question of questions) {
  if (question.options.length !== 4) errors.push(`${question.id}: ${question.options.length} options`)
  const correct = question.options.filter((option) => option.correct).length
  if (question.mode === 'single' && correct !== 1) errors.push(`${question.id}: single with ${correct} correct`)
  if (question.mode === 'multiple' && correct < 2) errors.push(`${question.id}: multiple with ${correct} correct`)
  for (const id of question.conceptIds) if (!conceptIds.has(id)) errors.push(`${question.id}: unknown concept ${id}`)
  if (!question.sourceRefs.length) errors.push(`${question.id}: no source reference`)
  if (!question.conceptIds.length) errors.push(`${question.id}: no concept reference`)
  for (const option of question.options) {
    if (!option.explanation) errors.push(`${question.id}: option without explanation`)
    if (!option.correctedStatement) errors.push(`${question.id}: option without corrected statement`)
  }
  for (const ref of question.sourceRefs) {
    if (!fileIds.has(ref.fileId)) errors.push(`${question.id}: unknown file ${ref.fileId}`)
    if (!ref.pages.length) errors.push(`${question.id}: no source page for ${ref.fileId}`)
    for (const page of ref.pages) if (page > (filePageCounts.get(ref.fileId) ?? 0)) errors.push(`${question.id}: invalid page ${page} for ${ref.fileId}`)
  }
}
for (const card of flashcards) {
  if (!conceptIds.has(card.conceptId)) errors.push(`${card.id}: unknown concept ${card.conceptId}`)
  if (!fileIds.has(card.fileId)) errors.push(`${card.id}: unknown file ${card.fileId}`)
  if (!card.pages.length) errors.push(`${card.id}: no source pages`)
}
if (errors.length) throw new Error(`Course data validation failed:\n${errors.join('\n')}`)

const output = `import type { CourseData } from '@/types'\n\nexport const courseData: CourseData = ${JSON.stringify(courseData, null, 2)}\n`
fs.writeFileSync(path.join(root, 'src', 'data', 'courseData.ts'), output, 'utf8')
console.log(JSON.stringify({
  files: files.length,
  pages: pageSummaries.length,
  concepts: normalizedConcepts.length,
  questions: questions.length,
  multiple: questions.filter((question) => question.mode === 'multiple').length,
  visuals: questions.filter((question) => question.visual).length,
  flashcards: flashcards.length,
}, null, 2))
