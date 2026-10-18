import { AppShell } from '@/components/AppShell'
import { QuestionPlayer } from '@/components/QuestionExperience'
import { courseData } from '@/data/courseData'
import { useNavigation } from '@/hooks/useNavigation'
import { getLearningQuestions } from '@/lib/curriculum'
import { getMockExamQuestions } from '@/lib/mockExams'
import { BankPage } from '@/pages/BankPage'
import { CardsPage } from '@/pages/CardsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExamPage } from '@/pages/ExamPage'
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
          : params.scope === 'mock'
          ? getMockExamQuestions(courseData, params.exam ?? '')
          : ids?.length
          ? ids.map((id) => courseData.questions.find((question) => question.id === id)).filter(Boolean) as typeof courseData.questions
          : params.concept
            ? courseData.questions.filter((question) => question.conceptIds.includes(params.concept))
            : params.scope === 'wrong'
              ? courseData.questions.filter((question) => question.id === target.id)
              : courseData.questions
        return <QuestionPlayer questions={questions} initialId={target.id} concepts={courseData.concepts} files={courseData.files} navigate={navigate} curriculumMode={params.scope === 'curriculum'} mockExam={params.scope === 'mock' ? courseData.mockExams?.find((exam) => exam.id === params.exam) : undefined} />
      }
      case 'exam': return <ExamPage data={courseData} navigate={navigate} />
      case 'wrong': return <WrongPage data={courseData} navigate={navigate} />
      case 'stats': return <StatsPage data={courseData} navigate={navigate} />
      case 'cards': return <CardsPage data={courseData} />
      case 'sources': return <SourcesPage data={courseData} navigate={navigate} />
      case 'settings': return <SettingsPage data={courseData} />
      default: return <DashboardPage data={courseData} navigate={navigate} />
    }
  })()

  return <AppShell activeView={target.view} totalConcepts={courseData.concepts.length} navigate={navigate}>{content}</AppShell>
}
