"use client";

import { Circle, LayoutGrid, PanelLeftClose, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
  useAnimatedSidebar,
} from "@/components/motion/animated-sidebar";
import { ToolIcon } from "@/components/workspace/tool-icon";
import { availabilityLabels, toolRegistry } from "@/lib/tool-registry";
import { cn } from "@/lib/utils";

const navClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-sidebar-muted transition-colors hover:bg-muted hover:text-sidebar-foreground";
const activeClass = "bg-muted text-sidebar-foreground";

function SidebarNavigation() {
  const pathname = usePathname();
  const { isMobile, openMobile, setOpenMobile } = useAnimatedSidebar();
  useEffect(() => {
    if (!openMobile) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setOpenMobile(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openMobile, setOpenMobile]);
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <AnimatedSidebar
      ariaLabel="Workspace navigation"
      className="workspace-sidebar"
      panelClassName="bg-sidebar text-sidebar-foreground"
    >
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-sidebar-border">
          <Layers aria-hidden="true" className="size-4" />
        </span>
        <span className="font-semibold tracking-tight group-data-[state=collapsed]/sidebar:hidden">
          company<span className="ml-1 font-normal text-sidebar-muted">/ tools</span>
        </span>
      </div>
      <AnimatedSidebarContent className="px-3">
        <nav aria-label="Tools">
          <AnimatedSidebarGroup className="p-0">
            <AnimatedSidebarGroupLabel className="px-3 text-[10px] uppercase tracking-widest">
              Workspace
            </AnimatedSidebarGroupLabel>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <Link
                  href="/"
                  aria-label="Overview"
                  aria-current={pathname === "/" ? "page" : undefined}
                  title="Overview"
                  onNavigate={closeMobile}
                  className={cn(navClass, pathname === "/" && activeClass)}
                >
                  <LayoutGrid aria-hidden="true" className="size-4 shrink-0" />
                  <span className="group-data-[state=collapsed]/sidebar:hidden">Overview</span>
                </Link>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroup>
          <AnimatedSidebarGroup className="mt-6 p-0">
            <AnimatedSidebarGroupLabel className="px-3 text-[10px] uppercase tracking-widest">
              Internal tools
            </AnimatedSidebarGroupLabel>
            <AnimatedSidebarMenu className="gap-1">
              {toolRegistry.map((tool) => (
                <AnimatedSidebarMenuItem key={tool.id}>
                  {tool.route ? (
                    <Link
                      href={tool.route}
                      aria-label={tool.name}
                      aria-current={pathname === tool.route ? "page" : undefined}
                      title={tool.name}
                      onNavigate={closeMobile}
                      className={cn(navClass, pathname === tool.route && activeClass)}
                    >
                      <ToolIcon id={tool.id} className="size-4 shrink-0" />
                      <span className="group-data-[state=collapsed]/sidebar:hidden">
                        <span className="block font-medium">{tool.name}</span>
                        <span className="mt-0.5 block text-[11px] text-sidebar-muted">
                          {availabilityLabels[tool.availability]}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled
                        aria-label={`${tool.name} — Preview only`}
                        aria-describedby={`nav-preview-${tool.id}`}
                        title={`${tool.name} — Preview only. Not implemented.`}
                        className={cn(navClass, "cursor-not-allowed hover:bg-transparent")}
                      >
                        <ToolIcon id={tool.id} className="size-4 shrink-0" />
                        <span className="group-data-[state=collapsed]/sidebar:hidden">
                          <span className="block">{tool.name}</span>
                          <span className="mt-0.5 block text-[11px]">Preview only</span>
                        </span>
                      </button>
                      <span id={`nav-preview-${tool.id}`} className="sr-only">
                        This tool is not implemented and has no destination.
                      </span>
                    </>
                  )}
                </AnimatedSidebarMenuItem>
              ))}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroup>
        </nav>
      </AnimatedSidebarContent>
      <AnimatedSidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-2">
          <Circle aria-hidden="true" className="size-3 shrink-0 text-ring" />
          <div className="group-data-[state=collapsed]/sidebar:hidden">
            <p className="text-xs font-medium text-sidebar-foreground">Foundation build</p>
            <p className="mt-1 text-[11px] text-sidebar-muted">Internal tools · Prototype</p>
          </div>
        </div>
      </AnimatedSidebarFooter>
    </AnimatedSidebar>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentTool = toolRegistry.find((tool) => tool.route === pathname);
  const pageName = pathname === "/" ? "Overview" : currentTool?.name ?? "Page not found";

  return (
    <AnimatedSidebarProvider
      style={{ "--sidebar-width": "264px", "--sidebar-width-icon": "68px" }}
      className="min-h-svh"
    >
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-[100] -translate-y-24 rounded-lg bg-card px-4 py-2 text-foreground shadow-md focus:translate-y-0"
      >
        Skip to content
      </a>
      <SidebarNavigation />
      <div className="relative flex min-h-svh min-w-0 flex-1 flex-col bg-background">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AnimatedSidebarTrigger className="size-8 rounded-md text-muted-foreground">
              <PanelLeftClose aria-hidden="true" className="size-4" />
            </AnimatedSidebarTrigger>
            <span aria-hidden="true" className="text-border">/</span>
            <span className="truncate text-sm font-medium">{pageName}</span>
          </div>
          <span className="shrink-0 rounded-md border px-2 py-1 text-[11px] text-muted-foreground">
            Local prototype
          </span>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] min-w-0 p-5 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </AnimatedSidebarProvider>
  );
}
