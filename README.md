# BigData Midterm Lab

「AI 기반 빅데이터 프로젝트」 중간고사 범위를 학습하기 위한 개인 CBT입니다. 제공된 7개 PDF를 페이지 단위로 검토해 개념, 출처, 문제, 선택지별 해설을 연결합니다.

[학습 사이트 열기](https://creepc.github.io/BigDataProject_CBT/)

## 콘텐츠 규모

- PDF 7개, 전체 317쪽 확인 및 페이지별 색인 317건
- 핵심 개념 110개, 4지선다 문항 116개(단일 정답 74개·복수 정답 42개)
- 개념별 상세 학습 본문 110개, 단계별 풀이 110개, 근거형 자가 점검 220개
- 실제 실행 결과를 검증한 Python 예제 21개
- 시각자료 해석 문항 20개(재구성 차트 10개·원본 강의 슬라이드 10개)
- 단원별 복습용 암기 카드 131개

시험 범위는 Netflix까지입니다. 별도 Titanic 실습은 학습·출제·복습·통계에서 제외합니다. `analysis/exam-scope.json`에 제외 항목과 페이지를 명시하며, 원본 PDF의 19·20·23쪽은 범위 밖, 18·21·22쪽은 Netflix 부분만 반영합니다.

## 핵심 기능

- 학습 목표·선수 용어·원리 설명·풀이 예제·비교·오개념·자가 점검을 한 흐름으로 읽는 개념 학습
- 개념 본문·예제 검색, 예상 학습 시간, 목차 이동, 이전·다음 개념과 원문 PDF 페이지 연결
- 단일 정답과 복수 정답을 지원하는 4지선다 문제은행
- 그래프 종류·의미·기울기·다변수 해석을 포함한 복합 문항
- 재구성 차트와 원본 강의 슬라이드를 함께 사용하는 시각자료 판독 문항
- 답안 제출 뒤 네 선택지의 용어 뜻·계산·판단 이유를 짧게 설명하는 해설
- 출제 범위·문항 수·시간·난이도 비율·무작위 순서를 조절하는 모의고사
- 오답 누적 기록, 최근 정답 여부, 복습 완료 상태, 취약 개념 분석
- 암기 카드, 학습 진도, 북마크, 기록 내보내기·가져오기
- 브라우저 `localStorage` 기반 영구 저장과 라이트/다크 모드
- GitHub Pages용 자동 배포 워크플로

## 로컬 실행

Node.js 24와 pnpm 11 기준입니다.

```bash
pnpm install
pnpm dev
```

프로덕션 검증:

```bash
pnpm content:build
pnpm test
pnpm typecheck
pnpm build
pnpm preview
```

Python 코드 예제의 실제 실행 결과를 확인하려면 pandas가 설치된 Python을 사용합니다.

```bash
node scripts/verify-lesson-code.mjs /absolute/path/to/python
```

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소의 `main` 브랜치에 push합니다.
2. 저장소의 **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 선택합니다.
3. `.github/workflows/deploy-pages.yml`이 테스트와 빌드를 통과하면 Pages URL이 생성됩니다.

Vite `base`는 상대 경로(`./`)이고 라우팅은 URL hash를 사용하므로, 사용자 사이트와 프로젝트 사이트 모두에서 하위 경로 문제 없이 동작합니다.

## 데이터와 정확성

- 원본 강의자료는 `public/pdfs/`에 영문 파일명으로 복사해 정적 배포 시 안전하게 제공합니다.
- 전체 분석 기록은 `analysis/`에 보관하고, 학습 앱이 사용하는 정규화 데이터는 `src/data/courseData.ts`에 있습니다.
- 상세 본문은 `analysis/lessons-*.json`에 분리해 보관합니다. `pnpm content:build`가 시험 범위의 110개 개념과 원고를 연결하고 누락·중복·출처 범위와 제외 내용 재유입을 검사합니다.
- 본문의 상황·수치 풀이·코드는 이해를 위한 학습 예시이며 강의 원본의 실제 관측 통계와 구별해 표시합니다.
- 강의자료에 직접 적힌 내용과 이해를 위한 보충 설명은 개념별 `evidenceType` 및 문항별 보충 표기로 구분합니다.
- `validateCourseData()`가 문항 ID 중복, 선택지 수, 단일·복수 정답 수, 출처·개념 참조를 검사합니다.

## 개인정보

학습 기록은 서버로 전송되지 않습니다. 같은 브라우저의 로컬 저장소에만 보관되며, 사용자가 직접 JSON으로 내보낼 수 있습니다.
