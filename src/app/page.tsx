import { getUsuariosAction } from "./actions/auth"
import { LoginForm } from "./components/login"

export default async function LoginPage() {
  const { usuarios } = await getUsuariosAction()

  return (
    <div className="min-h-screen flex flex-col bg-background-light text-[#101519] font-display overflow-x-hidden">
      {/* Decorative Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] bg-blue-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-[20%] w-[30vw] h-[30vw] bg-primary/30 rounded-full blur-[80px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col gap-8">
          {/* Header */}
          <header className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-3xl text-[#101519]">
                fitness_center
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-bold tracking-tight">DuoFit</h1>
              <p className="text-lg text-slate-500">Foco na meta, sem segredo.</p>
            </div>
          </header>

          {/* Login Card */}
          <section className="bg-white rounded-4xl shadow-xl p-8 border border-slate-100">
            <LoginForm usuarios={usuarios} />
          </section>
        </div>
      </main>
    </div>
  )
}
