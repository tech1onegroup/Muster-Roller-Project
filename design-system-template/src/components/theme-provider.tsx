"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

const ThemeContext = React.createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({
  theme: "system",
  setTheme: () => {},
})

export function useTheme() {
  return React.useContext(ThemeContext)
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme)

  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) setTheme(stored)
  }, [])

  React.useEffect(() => {
    const root = document.documentElement

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      root.classList.toggle("dark", mq.matches)
      const handler = (e: MediaQueryListEvent) =>
        root.classList.toggle("dark", e.matches)
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }

    root.classList.toggle("dark", theme === "dark")
  }, [theme])

  const handleSetTheme = React.useCallback((t: Theme) => {
    setTheme(t)
    localStorage.setItem("theme", t)
  }, [])

  return (
    <ThemeContext value={{ theme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext>
  )
}
