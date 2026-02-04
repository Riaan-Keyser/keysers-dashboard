import { Inter } from "next/font/google"
import "../globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Keysers - Quote Confirmation",
  description: "Review and confirm your camera equipment quote",
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {/* Simple header */}
          <header className="bg-white border-b shadow-sm">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <h1 className="text-3xl font-bold text-gray-900">Keysers</h1>
              <p className="text-sm text-gray-600 mt-1">Camera Equipment Specialists</p>
            </div>
          </header>
          
          {/* Main content */}
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
          
          {/* Simple footer */}
          <footer className="bg-white border-t mt-16">
            <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-600">
              <p className="font-semibold text-gray-900 mb-2">Keysers Camera Equipment</p>
              <p>&copy; {new Date().getFullYear()} Keysers. All rights reserved.</p>
              <p className="mt-3">
                <a 
                  href="https://keysers.co.za" 
                  className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.keysers.co.za
                </a>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Questions? Contact us at{" "}
                <a href="mailto:admin@keysers.co.za" className="text-blue-600 hover:underline">
                  admin@keysers.co.za
                </a>
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
