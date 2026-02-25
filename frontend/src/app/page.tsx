import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-lg font-bold text-gray-900">K12 XR</span>
          </div>
          <Link
            href="/create"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AI-Powered XR Content
            <br />
            <span className="text-blue-600">for K-12 Classrooms</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Transform simple prompts into immersive 3D educational experiences.
            Our multi-agent framework handles the complexity so teachers can
            focus on teaching.
          </p>
          <Link
            href="/create"
            className="inline-flex px-8 py-3 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Create XR Content
          </Link>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {[
            {
              icon: "📚",
              title: "Pedagogical Agent",
              desc: "Refines your prompt with curriculum alignment and learning objectives",
            },
            {
              icon: "🎨",
              title: "Execution Agent",
              desc: "Generates 3D models from text using AI-powered content creation",
            },
            {
              icon: "🛡️",
              title: "Safeguard Agent",
              desc: "Validates all content for K-12 safety, accuracy, and appropriateness",
            },
            {
              icon: "🎓",
              title: "Tutor Agent",
              desc: "Adds educational annotations, quizzes, and vocabulary to the 3D scene",
            },
          ].map((agent) => (
            <div
              key={agent.title}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{agent.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-1">
                {agent.title}
              </h3>
              <p className="text-sm text-gray-500">{agent.desc}</p>
            </div>
          ))}
        </div>

        {/* Use cases */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Three Diverse Scenarios
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🔬",
                title: "Science Visualization",
                desc: "Human anatomy, molecular structures, solar systems - bring abstract concepts to life in 3D",
                example: '"3D model of human heart for biology class"',
              },
              {
                icon: "🎨",
                title: "Arts Exploration",
                desc: "Historical sculptures, architectural wonders, artistic masterpieces in immersive detail",
                example: '"Ancient Greek temple for art history"',
              },
              {
                icon: "📖",
                title: "Creative Writing",
                desc: "Bring story settings and characters to life, making literature tangible and explorable",
                example: '"Medieval castle for creative writing prompt"',
              },
            ].map((scenario) => (
              <div
                key={scenario.title}
                className="bg-white rounded-xl p-6 border border-gray-100"
              >
                <div className="text-3xl mb-3">{scenario.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  {scenario.title}
                </h3>
                <p className="text-sm text-gray-500 mb-3">{scenario.desc}</p>
                <p className="text-xs text-blue-600 italic bg-blue-50 rounded-lg px-3 py-2">
                  {scenario.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <p className="text-center text-sm text-gray-400">
          K-12 XR Multi-Agent Framework — Democratizing XR Content Creation for
          Education
        </p>
      </footer>
    </div>
  );
}
