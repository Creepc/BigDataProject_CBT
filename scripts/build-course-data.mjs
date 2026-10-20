import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const examScope = JSON.parse(fs.readFileSync(path.join(root, 'analysis', 'exam-scope.json'), 'utf8'))
const excludedConcepts = new Set(examScope.excludedConcepts)
const inputs = [
  { file: 'notion12.json', scope: 'n12' },
  { file: 'notion34.json', scope: 'n34' },
  { file: 'web123.json', scope: 'web' },
]

for (const input of inputs) {
  const fullPath = path.join(root, 'analysis', input.file)
  if (!fs.existsSync(fullPath)) throw new Error(`Missing analysis file: ${fullPath}`)
  input.data = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  for (const [collection, setting] of [['units', 'excludedUnits'], ['concepts', 'excludedConcepts'], ['questions', 'excludedQuestions'], ['flashcards', 'excludedFlashcards']]) {
    const excluded = new Set(examScope[setting])
    input.data[collection] = (input.data[collection] ?? []).filter((item) => !excluded.has(`${input.scope}-${item.id}`))
  }
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
const inScopePages = (fileId, pages) => numbers(pages).filter((page) => !(examScope.excludedPages[fileId] ?? []).includes(page))

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
      pages: inScopePages(concept.fileId, concept.pages ?? concept.pageNumbers),
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
    excludedPages: examScope.excludedPages[file.id] ?? [],
    partialPages: examScope.partialPages[file.id] ?? [],
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
  ...((examScope.excludedPages[file.id] ?? []).includes(Number(summary.page)) ? {
    title: '시험 범위 밖의 추가 실습',
    keyPoints: ['사용자가 지정한 중간고사 범위에 포함되지 않는 추가 실습 페이지입니다.'],
    visuals: [], codes: [], excludedFromExam: true,
  } : {
    title: summary.title ?? `${file.title} ${summary.page}쪽`,
    keyPoints: strings(summary.keyPoints ?? summary.points),
    visuals: strings(summary.visuals ?? summary.images ?? summary.tables),
    codes: strings(summary.codes ?? summary.code),
  }),
}))))

const finalConfig = JSON.parse(fs.readFileSync(path.join(root, 'analysis', 'professor-final-review.json'), 'utf8'))
const finalPages = JSON.parse(fs.readFileSync(path.join(root, 'analysis', 'professor-final-pages.json'), 'utf8'))
files.push({
  id: 'prof-final', title: '빅데이터 1~3장 교수님 최종 통합 정리', shortTitle: '교수님 최종 정리 · 1~3장',
  path: '노션자료/빅데이터1~3장(통합정리본).pdf', pdfUrl: 'pdfs/professor-final-review.pdf', week: 3, kind: '노션',
  pageCount: 19, analyzedPages: Array.from({ length: 19 }, (_, index) => index + 1), unreadablePages: [],
  topics: ['프로젝트와 재현성', '5V·병목·분산', 'Netflix 품질·EDA'], color: '#3159d8',
  note: '19쪽의 텍스트·표·개념도를 확인했습니다. 시험 전 구술 강조 사항은 최종 대비 페이지에서 기존 강의자료와 함께 연결합니다. 카탈로그의 한계와 추천 후보 생성·성과 평가를 구별합니다.',
})
pageSummaries.push(...finalPages.map((summary, index) => ({ fileId: 'prof-final', page: index + 1, ...summary })))

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
        const explanation = String(option.explanation ?? option.reason ?? '').trim()
        const correctedStatement = option.correctedStatement ?? option.correction ?? (correct ? text : '')
        return { id: `o${index + 1}`, text, correct, explanation, correctedStatement }
      }),
      conceptIds: strings(question.conceptIds ?? question.relatedConceptIds)
        .map((id) => conceptIdLookup.get(`${input.scope}:${id}`))
        .filter(Boolean),
      sourceRefs: asArray(sourceList).map((source) => ({ fileId: source.fileId, pages: inScopePages(source.fileId, source.pages ?? source.page) })).filter((source) => source.pages.length),
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

const questionBankFiles = [
  'questions-notion12.json', 'questions-notion34.json', 'questions-web123.json',
  'mock-questions-notion12.json', 'mock-questions-notion34.json', 'mock-questions-web123.json',
  'final-questions-systems.json', 'final-questions-infrastructure.json', 'final-questions-netflix.json',
  'foundation-questions-systems.json', 'foundation-questions-infrastructure.json', 'foundation-questions-netflix.json',
]
for (const file of questionBankFiles) {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'analysis', file), 'utf8'))
  for (const question of bank.questions) {
    questions.push({
      ...question,
      options: question.options.map((option, index) => ({
        ...option,
        id: `o${index + 1}`,
        explanation: String(option.explanation ?? '').trim(),
      })),
      sourceRefs: question.sourceRefs.map((ref) => ({ ...ref, pages: inScopePages(ref.fileId, ref.pages) })).filter((ref) => ref.pages.length),
      additionalExample: question.additionalExample ?? '',
      supplemental: question.finalReview ? question.finalReview.evidence === 'supplement' : true,
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
    pages: inScopePages(source.fileId ?? card.fileId, source.pages ?? card.pages),
  }
}))

const lessonFiles = ['lessons-notion12.json', 'lessons-notion34.json', 'lessons-web123.json']
const lessonMap = new Map()
for (const file of lessonFiles) {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'analysis', file), 'utf8'))
  for (const lesson of source.lessons ?? []) {
    if (excludedConcepts.has(lesson.conceptId)) continue
    lesson.sourceRefs = lesson.sourceRefs.map((ref) => ({ ...ref, pages: inScopePages(ref.fileId, ref.pages) })).filter((ref) => ref.pages.length)
    if (lessonMap.has(lesson.conceptId)) throw new Error(`Duplicate lesson: ${lesson.conceptId}`)
    lessonMap.set(lesson.conceptId, lesson)
  }
}

const concepts = normalizedConcepts.map((concept) => {
  const direct = questions.filter((question) => question.conceptIds.includes(concept.id)).map((question) => question.id)
  const unitRelated = direct.length ? [] : questions
    .filter((question) => question.conceptIds.some((id) => normalizedConcepts.find((item) => item.id === id)?.unit === concept.unit))
    .map((question) => question.id)
    .slice(0, 3)
  return { ...concept, relatedQuestionIds: [...direct, ...unitRelated], lesson: lessonMap.get(concept.id) }
})

const mockExamConfig = JSON.parse(fs.readFileSync(path.join(root, 'analysis', 'mock-exams.json'), 'utf8'))
const mockExams = mockExamConfig.exams.map((exam) => {
  // Interleave the three authoring banks so each exam mixes all source groups.
  const groups = ['mock-n12-', 'mock-n34-', 'mock-web-'].map((prefix) =>
    questions.filter((question) => question.mockExamId === exam.id && question.id.startsWith(prefix)))
  const questionIds = []
  for (let index = 0; index < Math.max(...groups.map((group) => group.length)); index += 1) {
    for (const group of groups) if (group[index]) questionIds.push(group[index].id)
  }
  return { ...exam, questionIds }
})

const finalReview = {
  ...finalConfig,
  exams: finalConfig.exams.map((exam) => {
    const prefixes = exam.level === 'foundation' ? ['basic-sys-', 'basic-inf-', 'basic-nfx-'] : ['final-sys-', 'final-inf-', 'final-nfx-']
    const groups = prefixes.map((prefix) =>
      questions.filter((question) => question.finalExamId === exam.id && question.id.startsWith(prefix)))
    const questionIds = []
    for (let index = 0; index < Math.max(...groups.map((group) => group.length)); index += 1) {
      for (const group of groups) if (group[index]) questionIds.push(group[index].id)
    }
    return { ...exam, questionIds }
  }),
}

const courseData = {
  files,
  pageSummaries,
  concepts,
  questions,
  flashcards,
  mockExams,
  finalReview,
  generatedAt: new Date().toISOString().slice(0, 10),
}

if (/titanic|타이타닉|Survived|PassengerId|Pclass|SibSp|Parch|생존율|생존자/i.test(JSON.stringify(courseData))) {
  throw new Error('시험 범위 밖의 별도 실습 내용이 학습 데이터에 남아 있습니다.')
}

const errors = []
const hasText = (value) => typeof value === 'string' && value.trim().length > 0
const hasTexts = (value, minimum = 1) => Array.isArray(value) && value.length >= minimum && value.every(hasText)
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
for (const id of lessonMap.keys()) if (!conceptIds.has(id)) errors.push(`Unknown lesson concept: ${id}`)
for (const concept of concepts) {
  if (!concept.relatedQuestionIds.length) errors.push(`${concept.id}: no related questions`)
  const lesson = concept.lesson
  if (!lesson) { errors.push(`${concept.id}: no in-depth lesson`); continue }
  if (!hasTexts(lesson.objectives, 3) || !Array.isArray(lesson.prerequisites) || lesson.prerequisites.length < 2 || !Array.isArray(lesson.sections) || lesson.sections.length < 3 || !Array.isArray(lesson.checks) || lesson.checks.length < 2 || !hasTexts(lesson.takeaways, 3)) errors.push(`${concept.id}: incomplete lesson structure`)
  for (const item of lesson.prerequisites ?? []) if (!hasText(item.term) || !hasText(item.explanation)) errors.push(`${concept.id}: incomplete prerequisite`)
  for (const section of lesson.sections ?? []) if (!hasText(section.title) || !hasTexts(section.paragraphs, 2)) errors.push(`${concept.id}: incomplete lesson section`)
  for (const check of lesson.checks ?? []) if (!hasText(check.question) || !hasText(check.answer) || !hasText(check.explanation)) errors.push(`${concept.id}: incomplete self-check`)
  if (!hasText(lesson.workedExample?.title) || !hasText(lesson.workedExample?.scenario) || !Array.isArray(lesson.workedExample?.steps) || lesson.workedExample.steps.length < 3 || !hasText(lesson.workedExample?.conclusion)) errors.push(`${concept.id}: incomplete worked example`)
  for (const step of lesson.workedExample?.steps ?? []) if (!hasText(step.title) || !hasText(step.explanation)) errors.push(`${concept.id}: incomplete worked example step`)
  if (lesson.codeExample && (!['python', 'text'].includes(lesson.codeExample.language) || !hasText(lesson.codeExample.code) || !hasText(lesson.codeExample.expectedOutput) || !hasText(lesson.codeExample.explanation) || !hasTexts(lesson.codeExample.notes))) errors.push(`${concept.id}: incomplete code example`)
  if (!lesson.sourceRefs?.length) errors.push(`${concept.id}: lesson has no source`)
  for (const ref of lesson.sourceRefs ?? []) {
    if (!fileIds.has(ref.fileId) || !ref.pages?.length) errors.push(`${concept.id}: invalid lesson source`)
    for (const page of ref.pages ?? []) if (!Number.isInteger(page) || page < 1 || page > (filePageCounts.get(ref.fileId) ?? 0)) errors.push(`${concept.id}: invalid lesson source page ${page}`)
  }
}
const finalQuestions = questions.filter((question) => question.finalExamId)
if (finalReview.exams.length !== 6 || finalQuestions.length !== 240) errors.push('Final review requires six papers and 240 questions')
for (const examLevel of ['foundation', 'challenge']) {
  if (finalReview.exams.filter((exam) => (exam.level ?? 'challenge') === examLevel).length !== 3) errors.push(`${examLevel}: expected three final papers`)
}
const finalIds = new Set()
const focusIds = new Set(finalReview.focusItems.map((item) => item.id))
const topicIds = new Set(finalReview.topics.map((topic) => topic.id))
for (const exam of finalReview.exams) {
  const items = exam.questionIds.map((id) => questions.find((question) => question.id === id))
  if (items.length !== 40 || new Set(exam.questionIds).size !== 40) errors.push(`${exam.id}: expected 40 unique final questions`)
  if (exam.level === 'foundation') {
    if (items.filter((question) => question?.difficulty === '쉬움').length !== 20 || items.filter((question) => question?.difficulty === '보통').length !== 20 || items.some((question) => question?.difficulty === '어려움')) errors.push(`${exam.id}: expected easy 20 / medium 20 / hard 0`)
    if (items.some((question) => question?.finalReview?.evidence === 'supplement' || question?.supplemental)) errors.push(`${exam.id}: foundation papers must stay within the core scope`)
    if (items.some((question) => question?.prompt.length > 220)) errors.push(`${exam.id}: shorten foundation prompts to at most 220 characters`)
  } else {
    if (items.filter((question) => question?.difficulty === '어려움').length !== 28 || items.filter((question) => question?.difficulty === '보통').length !== 12) errors.push(`${exam.id}: expected hard 28 / medium 12`)
    if (items.filter((question) => question?.finalReview?.evidence === 'supplement').length !== 4) errors.push(`${exam.id}: expected four supplemental items`)
  }
  if (items.filter((question) => question?.mode === 'multiple').length < 12 || items.filter((question) => question?.visual).length < 5) errors.push(`${exam.id}: insufficient multiple or visual items`)
  for (const id of exam.questionIds) {
    if (finalIds.has(id)) errors.push(`${id}: reused final question`)
    finalIds.add(id)
    if (questions.find((question) => question.id === id)?.finalExamId !== exam.id) errors.push(`${id}: final exam membership error`)
  }
}
for (const question of finalQuestions) {
  if (!finalIds.has(question.id) || question.mockExamId || question.learningStage) errors.push(`${question.id}: invalid final question allocation`)
  const meta = question.finalReview
  if (!meta || !topicIds.has(meta.topicId) || !['pdf', 'lecture', 'supplement'].includes(meta.evidence) || !meta.focusIds?.length || meta.focusIds.some((id) => !focusIds.has(id))) errors.push(`${question.id}: missing final evidence classification`)
  if (meta?.evidence === 'pdf' && !question.sourceRefs.some((ref) => ref.fileId === 'prof-final')) errors.push(`${question.id}: PDF item has no final PDF reference`)
  const detail = question.detailedExplanation
  if (!hasText(detail?.concept) || detail.concept.length < 100 || !hasTexts(detail?.steps, 3) || detail.steps.some((step) => step.length < 20) || !hasText(detail?.pitfall) || detail.pitfall.length < 20 || question.review.length < 80 || question.additionalExample.length < 30) errors.push(`${question.id}: incomplete final detailed explanation`)
}
for (const id of focusIds) if (!finalQuestions.some((question) => question.finalReview?.evidence !== 'supplement' && question.finalReview?.focusIds.includes(id))) errors.push(`${id}: final oral emphasis is not covered`)
for (const id of topicIds) if (!finalQuestions.some((question) => question.finalReview?.evidence !== 'supplement' && question.finalReview?.topicId === id)) errors.push(`${id}: final topic has no core question`)
for (const examLevel of ['foundation', 'challenge']) {
  const levelExams = new Set(finalReview.exams.filter((exam) => (exam.level ?? 'challenge') === examLevel).map((exam) => exam.id))
  const levelQuestions = finalQuestions.filter((question) => levelExams.has(question.finalExamId))
  for (const id of focusIds) if (!levelQuestions.some((question) => question.finalReview.evidence !== 'supplement' && question.finalReview.focusIds.includes(id))) errors.push(`${examLevel}: missing oral focus ${id}`)
  for (const id of topicIds) if (!levelQuestions.some((question) => question.finalReview.evidence !== 'supplement' && question.finalReview.topicId === id)) errors.push(`${examLevel}: missing topic ${id}`)
}
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
    if (option.correctedStatement !== undefined && !hasText(option.correctedStatement)) errors.push(`${question.id}: empty corrected statement`)
    if (!hasText(option.text) || typeof option.correct !== 'boolean') errors.push(`${question.id}: invalid option`)
    if (option.explanation.length > 180 || /이 선택지는|혼동|핵심 (?:판별 )?기준|고치면 올바른 설명/.test(option.explanation)) errors.push(`${question.id}: verbose option explanation`)
  }
  for (const ref of question.sourceRefs) {
    if (!fileIds.has(ref.fileId)) errors.push(`${question.id}: unknown file ${ref.fileId}`)
    if (!ref.pages.length) errors.push(`${question.id}: no source page for ${ref.fileId}`)
    for (const page of ref.pages) if (page > (filePageCounts.get(ref.fileId) ?? 0)) errors.push(`${question.id}: invalid page ${page} for ${ref.fileId}`)
  }
}
const learningStages = ['기초', '원리', '적용', '종합']
const questionIds = new Set()
const prompts = new Set()
for (const question of questions) {
  if (questionIds.has(question.id)) errors.push(`${question.id}: duplicate question ID`)
  questionIds.add(question.id)
  const prompt = question.prompt.replace(/\s+/g, '').toLowerCase()
  if (prompts.has(prompt)) errors.push(`${question.id}: duplicate question prompt`)
  prompts.add(prompt)
  if (question.learningStage) {
    if (!learningStages.includes(question.learningStage)) errors.push(`${question.id}: unknown learning stage`)
    if (!conceptIds.has(question.learningConceptId) || !question.conceptIds.includes(question.learningConceptId)) errors.push(`${question.id}: invalid learning concept`)
    const concept = concepts.find((item) => item.id === question.learningConceptId)
    if (!Array.isArray(question.learningObjectiveIndices) || !question.learningObjectiveIndices.length || question.learningObjectiveIndices.some((index) => !Number.isInteger(index) || index < 0 || index >= (concept?.lesson?.objectives.length ?? 0))) errors.push(`${question.id}: invalid learning objectives`)
    if (!hasText(question.review) || !hasText(question.memoryTip)) errors.push(`${question.id}: missing standalone learning explanation`)
    const allowedSources = [{ fileId: concept?.fileId, pages: concept?.pages ?? [] }, ...(concept?.lesson?.sourceRefs ?? [])]
    if (question.sourceRefs.some((ref) => ref.pages.some((page) => !allowedSources.some((source) => source.fileId === ref.fileId && source.pages.includes(page))))) errors.push(`${question.id}: source outside learning concept evidence`)
  }
  if (question.mockExamId) {
    if (!mockExams.some((exam) => exam.id === question.mockExamId)) errors.push(`${question.id}: unknown fixed mock exam`)
    if (question.learningStage) errors.push(`${question.id}: fixed mock exam must not replace the learning course`)
    const detail = question.detailedExplanation
    if (!hasText(detail?.concept) || detail.concept.length < 100 || !hasTexts(detail?.steps, 3) || detail.steps.some((step) => step.length < 20) || !hasText(detail?.pitfall) || detail.pitfall.length < 20) errors.push(`${question.id}: incomplete detailed explanation`)
    if (!hasText(question.review) || question.review.length < 80 || !hasText(question.additionalExample) || question.additionalExample.length < 30) errors.push(`${question.id}: missing standalone concept review or transfer example`)
    const evidence = question.conceptIds.flatMap((id) => {
      const concept = concepts.find((item) => item.id === id)
      return [{ fileId: concept?.fileId, pages: concept?.pages ?? [] }, ...(concept?.lesson?.sourceRefs ?? [])]
    })
    if (question.sourceRefs.some((ref) => ref.pages.some((page) => !evidence.some((source) => source.fileId === ref.fileId && source.pages.includes(page))))) errors.push(`${question.id}: mock source outside connected concept evidence`)
  }
}

if (mockExams.length !== 5 || new Set(mockExams.map((exam) => exam.id)).size !== 5) errors.push('Exactly five unique fixed mock exams are required')
const mockIds = new Set()
for (const exam of mockExams) {
  if (!hasText(exam.title) || !hasText(exam.description) || !Number.isInteger(exam.minutes) || exam.minutes <= 0) errors.push(`${exam.id}: invalid exam metadata`)
  if (exam.questionIds.length !== 40) errors.push(`${exam.id}: expected 40 new questions, got ${exam.questionIds.length}`)
  const items = exam.questionIds.map((id) => questions.find((question) => question.id === id))
  if (items.filter((question) => question?.mode === 'multiple').length < 10) errors.push(`${exam.id}: insufficient multiple-answer items`)
  if (items.filter((question) => question?.visual).length < 4) errors.push(`${exam.id}: insufficient visual questions`)
  for (const id of exam.questionIds) {
    if (mockIds.has(id)) errors.push(`${exam.id}: question reused across fixed exams: ${id}`)
    mockIds.add(id)
    const question = questions.find((item) => item.id === id)
    if (!question || question.mockExamId !== exam.id || !id.startsWith('mock-')) errors.push(`${exam.id}: invalid fixed mock question ${id}`)
  }
}
if (mockIds.size !== 200 || questions.filter((question) => question.mockExamId).length !== 200) errors.push('Fixed mock exams must contain exactly 200 new unique questions')
const mockConceptIds = new Set(questions.filter((question) => question.mockExamId).flatMap((question) => question.conceptIds))
for (const concept of concepts) if (!mockConceptIds.has(concept.id)) errors.push(`${concept.id}: not covered by the new fixed mock exams`)
for (const concept of concepts) {
  const course = questions.filter((question) => question.learningConceptId === concept.id)
  if (course.length !== 4 || learningStages.some((stage) => !course.some((question) => question.learningStage === stage))) errors.push(`${concept.id}: incomplete four-stage question course`)
  const covered = new Set(course.flatMap((question) => question.learningObjectiveIndices ?? []))
  if (concept.lesson.objectives.some((_, index) => !covered.has(index))) errors.push(`${concept.id}: uncovered learning objective`)
}
for (const card of flashcards) {
  if (!conceptIds.has(card.conceptId)) errors.push(`${card.id}: unknown concept ${card.conceptId}`)
  if (!fileIds.has(card.fileId)) errors.push(`${card.id}: unknown file ${card.fileId}`)
  if (!card.pages.length) errors.push(`${card.id}: no source pages`)
}
if (errors.length) throw new Error(`Course data validation failed:\n${errors.join('\n')}`)

const output = `import type { CourseData } from '@/types'\n\nexport const courseData: CourseData = ${JSON.stringify(courseData, null, 2)}\n`
fs.writeFileSync(path.join(root, 'src', 'data', 'courseData.ts'), output, 'utf8')
const coverage = concepts.map((concept) => {
  const course = questions.filter((question) => question.learningConceptId === concept.id)
  return {
    conceptId: concept.id, name: concept.name, fileId: concept.fileId,
    totalQuestions: questions.filter((question) => question.conceptIds.includes(concept.id)).length,
    learningQuestions: course.map(({ id, learningStage }) => ({ id, stage: learningStage })),
    objectives: concept.lesson.objectives.map((objective, index) => ({ objective, questionIds: course.filter((question) => question.learningObjectiveIndices.includes(index)).map((question) => question.id) })),
  }
})
fs.writeFileSync(path.join(root, 'analysis', 'question-coverage.json'), `${JSON.stringify({ conceptCount: concepts.length, learningQuestionCount: coverage.reduce((sum, item) => sum + item.learningQuestions.length, 0), coverage }, null, 2)}\n`, 'utf8')
fs.writeFileSync(path.join(root, 'analysis', 'mock-exam-coverage.json'), `${JSON.stringify({
  examCount: mockExams.length,
  newQuestionCount: mockIds.size,
  coveredConcepts: mockConceptIds.size,
  exams: mockExams.map((exam) => {
    const items = questions.filter((question) => question.mockExamId === exam.id)
    return { ...exam,
      multiple: items.filter((question) => question.mode === 'multiple').length,
      visuals: items.filter((question) => question.visual).length,
      conceptIds: [...new Set(items.flatMap((question) => question.conceptIds))],
    }
  }),
}, null, 2)}\n`, 'utf8')
fs.writeFileSync(path.join(root, 'analysis', 'professor-final-coverage.json'), `${JSON.stringify({
  questionCount: finalQuestions.length,
  coreCount: finalQuestions.filter((question) => question.finalReview.evidence !== 'supplement').length,
  supplementalCount: finalQuestions.filter((question) => question.finalReview.evidence === 'supplement').length,
  exams: finalReview.exams.map((exam) => {
    const items = finalQuestions.filter((question) => question.finalExamId === exam.id)
    return { ...exam, easy: items.filter((question) => question.difficulty === '쉬움').length, medium: items.filter((question) => question.difficulty === '보통').length, hard: items.filter((question) => question.difficulty === '어려움').length, multiple: items.filter((question) => question.mode === 'multiple').length, visuals: items.filter((question) => question.visual).length }
  }),
  focusCoverage: finalReview.focusItems.map((focus) => ({ ...focus, questionIds: finalQuestions.filter((question) => question.finalReview.evidence !== 'supplement' && question.finalReview.focusIds.includes(focus.id)).map((question) => question.id) })),
  foundationQuestionCount: finalQuestions.filter((question) => finalReview.exams.some((exam) => exam.id === question.finalExamId && exam.level === 'foundation')).length,
}, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({
  files: files.length,
  pages: pageSummaries.length,
  concepts: normalizedConcepts.length,
  lessons: lessonMap.size,
  selfChecks: [...lessonMap.values()].reduce((sum, lesson) => sum + lesson.checks.length, 0),
  codeExamples: [...lessonMap.values()].filter((lesson) => lesson.codeExample).length,
  questions: questions.length,
  learningQuestions: questions.filter((question) => question.learningStage).length,
  coveredObjectives: concepts.reduce((sum, concept) => sum + concept.lesson.objectives.length, 0),
  multiple: questions.filter((question) => question.mode === 'multiple').length,
  visuals: questions.filter((question) => question.visual).length,
  flashcards: flashcards.length,
  fixedMockExams: mockExams.length,
  newMockQuestions: mockIds.size,
  mockCoveredConcepts: mockConceptIds.size,
}, null, 2))
