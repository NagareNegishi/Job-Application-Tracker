import { useEffect, useState } from "react"

type Theme = "light" | "dark"

// Passed as lazy initializer to useState, runs once on mount
function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme")
  if (stored === "light" || stored === "dark") return stored
  // Fall back to OS preference if no stored choice
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    // toggle(name, force), true adds, false removes
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  // Function form of setTheme, reads previous state and flip
  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark")

  return { theme, toggleTheme }
}
