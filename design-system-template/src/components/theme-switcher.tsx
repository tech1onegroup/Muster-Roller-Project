"use client"

import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      <Button
        variant={theme === "light" ? "default" : "ghost"}
        size="icon-xs"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
      >
        <Sun className="size-3.5" />
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "ghost"}
        size="icon-xs"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
      >
        <Moon className="size-3.5" />
      </Button>
      <Button
        variant={theme === "system" ? "default" : "ghost"}
        size="icon-xs"
        onClick={() => setTheme("system")}
        aria-label="System preference"
      >
        <Monitor className="size-3.5" />
      </Button>
    </div>
  )
}
