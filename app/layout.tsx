import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'ECO SCUBA — Projektni studio', description: 'Strukturirano generisanje projektnih prijedloga za KVS „S.C.U.B.A.“ Sarajevo.' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="bs"><body>{children}</body></html> }
