import { AppShell } from '@/components/AppShell'
import { QuestionPlayer } from '@/components/QuestionExperience'
import { courseData } from '@/data/courseData'
import { useNavigation } from '@/hooks/useNavigation'
import { getLearningQuestions } from '@/lib/curriculum'
import { getAllFixedExams, getMockExamQuestions } from '@/lib/mockExams'
import { getFinalExamLevel, getFinalQuestions, getFinalQueueLevel } from '@/lib/finalReview'
import { BankPage } from '@/pages/BankPage'
import { CardsPage } from '@/pages/CardsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExamPage } from '@/pages/ExamPage'
import { FinalReviewPage } from '@/pages/FinalReviewPage'
import { LearnPage } from '@/pages/LearnPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SourcesPage } from '@/pages/SourcesPage'
import { StatsPage } from '@/pages/StatsPage'
import { WrongPage } from '@/pages/WrongPage'

export default function App() {
  const { target, navigate } = useNavigation()
  const params = target.params ?? {}

  const content = (() => {
    switch (target.view) {
      case 'learn': return <LearnPage data={courseData} selectedId={target.id} initialFile={params.file} navigate={navigate} />
      case 'bank': return <BankPage data={courseData} navigate={navigate} initialMode={params.mode === 'bank' ? 'bank' : 'course'} />
      case 'practice': {
        const ids = params.ids?.split(',').filter(Boolean)
        const questions = params.scope === 'curriculum'
          ? getLearningQuestions(courseData, params.concept)
          : params.scope === 'final'
          ? params.exam ? getMockExamQuestions(courseData, params.exam)
            : ids?.length ? ids.map((id) => courseData.questions.find((question) => question.id === id && question.finalExamId)).filter(Boolean) as typeof courseData.questions
            : getFinalQuestions(courseData, params)
          : params.scope === 'mock'
          ? getMockExamQuestions(courseData, params.exam ?? '')
          : ids?.length
          ? ids.map((id) => courseData.questions.find((question) => question.id === id)).filter(Boolean) as typeof courseData.questions
          : params.concept
            ? courseData.questions.filter((question) => question.conceptIds.includes(params.concept))
            : params.scope === 'wrong'
              ? courseData.questions.filter((question) => question.id === target.id)
              : courseData.questions
        const mockExam = ['mock', 'final'].includes(params.scope) ? getAllFixedExams(courseData).find((exam) => exam.id === params.exam) : undefined
        const finalLevel = params.level ?? (mockExam ? getFinalExamLevel(mockExam) : getFinalQueueLevel(courseData, questions))
        return <QuestionPlayer questions={questions} initialId={target.id} concepts={courseData.concepts} files={courseData.files} navigate={navigate} curriculumMode={params.scope === 'curriculum'} finalMode={params.scope === 'final'} finalLevel={finalLevel} mockExam={mockExam} />
      }
      case 'exam': return <ExamPage key={`${params.paper ?? 'custom'}-${params.review ?? 'take'}`} data={courseData} navigate={navigate} initialExamId={params.paper} reviewLatest={params.review === 'latest'} returnFinalLevel={params.level} />
      case 'final': return <FinalReviewPage key={params.level ?? 'standard'} data={courseData} navigate={navigate} initialLevel={params.level} />
      case 'wrong': return <WrongPage data={courseData} navigate={navigate} />
      case 'stats': return <StatsPage data={courseData} navigate={navigate} />
      case 'cards': return <CardsPage data={courseData} />
      case 'sources': return <SourcesPage data={courseData} navigate={navigate} />
      case 'settings': return <SettingsPage data={courseData} />
      default: return <DashboardPage data={courseData} navigate={navigate} />
    }
  })()

  return <AppShell activeView={(target.view === 'practice' && params.scope === 'final') || (target.view === 'exam' && params.paper?.startsWith('final-')) ? 'final' : target.view} totalConcepts={courseData.concepts.length} navigate={navigate}>{content}</AppShell>
}
