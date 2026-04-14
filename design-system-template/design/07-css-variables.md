# 7. CSS Variables

## One Group Light
```css
:root[data-theme="one-group"] {
  --background:#f5f3ed; --foreground:#141413; --card:#ffffff; --card-foreground:#141413;
  --popover:#ffffff; --popover-foreground:#141413; --primary:#762224; --primary-foreground:#fffcf8;
  --secondary:#e8e6dc; --secondary-foreground:#4d4c48; --muted:#f0eee6; --muted-foreground:#5e5d59;
  --accent:#c45a5c; --accent-foreground:#fffcf8; --destructive:#d4453a; --destructive-foreground:#ffffff;
  --border:#f0eee6; --input:#f0eee6; --ring:#d1cfc5; --radius:1rem;
  --chart-1:#762224; --chart-2:#c45a5c; --chart-3:#e8e6dc; --chart-4:#5e5d59; --chart-5:#323234;
  --sidebar:#ffffff; --sidebar-foreground:#141413; --sidebar-primary:#762224;
  --sidebar-primary-foreground:#fffcf8; --sidebar-accent:#f0eee6;
  --sidebar-accent-foreground:#762224; --sidebar-border:#f0eee6; --sidebar-ring:#d1cfc5;
}
```

## One Group Dark
```css
:root[data-theme="one-group"].dark {
  --background:#121214; --foreground:#fffcf8; --card:#323234; --card-foreground:#fffcf8;
  --popover:#323234; --popover-foreground:#fffcf8; --primary:#762224; --primary-foreground:#fffcf8;
  --secondary:#323234; --secondary-foreground:#fffcf8; --muted:#323234; --muted-foreground:#b0aea5;
  --accent:#c45a5c; --accent-foreground:#fffcf8; --destructive:#d4453a; --destructive-foreground:#ffffff;
  --border:#323234; --input:#323234; --ring:#323234; --radius:1rem;
  --chart-1:#c45a5c; --chart-2:#762224; --chart-3:#b0aea5; --chart-4:#87867f; --chart-5:#5e5d59;
  --sidebar:#323234; --sidebar-foreground:#fffcf8; --sidebar-primary:#762224;
  --sidebar-primary-foreground:#fffcf8; --sidebar-accent:#323234;
  --sidebar-accent-foreground:#c45a5c; --sidebar-border:#323234; --sidebar-ring:#323234;
}
```
