import { ProjectCard } from "@/components/ui/ProjectCard";
import { IconPlus, IconAdjustmentsHorizontal } from "@tabler/icons-react";

const projects = [
    { name: "ADF Framework", category: "ENGINEERING", tasksCount: 12, blockedCount: 2, currentFocus: "Plugin system refactor", progress: 45, health: "yellow", syncing: true },
    { name: "Work Management", category: "PRODUCT", tasksCount: 8, blockedCount: 0, currentFocus: "Brief review and finalization", progress: 15, health: "green" },
    { name: "SaaS Product", category: "DEV", tasksCount: 24, blockedCount: 5, currentFocus: "Auth system migration", progress: 68, health: "red", syncing: true },
    { name: "Consulting: Acme", category: "BUSINESS", tasksCount: 6, blockedCount: 0, currentFocus: "Q1 delivery sprint", progress: 80, health: "green" },
    { name: "Knowledge Base", category: "INTERNAL", tasksCount: 10, blockedCount: 1, currentFocus: "Search ranking improvements", progress: 55, health: "green", syncing: true },
    { name: "Board Governance", category: "BOARD", tasksCount: 4, blockedCount: 1, currentFocus: "Quarterly review prep", progress: 30, health: "yellow" },
    { name: "Personal", category: "PERSONAL", tasksCount: 5, blockedCount: 0, currentFocus: "Tax prep and filing", progress: 40, health: "green" },
    { name: "Capabilities Registry", category: "DEV", tasksCount: 3, blockedCount: 0, currentFocus: "Inventory documentation", progress: 70, health: "green", syncing: true },
] as const;

export default function PortfolioPage() {
    return (
        <div className="flex flex-col min-h-full bg-zed-main">
            <header className="px-8 h-14 flex items-center justify-between border-b border-zed-border bg-zed-header/30 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-6">
                    <nav className="flex items-center gap-1 bg-zed-active/50 p-1 rounded-sm border border-zed-border/50">
                        <button className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase bg-zed-active text-primary rounded-sm shadow-sm">All</button>
                        <button className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors">Dev</button>
                        <button className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-secondary transition-colors">Business</button>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded border border-zed-border hover:bg-zed-hover">
                        <IconAdjustmentsHorizontal className="w-3.5 h-3.5" />
                        Sort
                    </button>
                    <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-primary text-white px-3 py-1.5 rounded hover:opacity-90 transition-all shadow-sm shadow-primary/20">
                        <IconPlus className="w-3.5 h-3.5" />
                        New Project
                    </button>
                </div>
            </header>

            <div className="p-8 lg:p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1400px] mx-auto">
                    {projects.map((project) => (
                        <ProjectCard key={project.name} {...project} />
                    ))}
                </div>
            </div>

            <footer className="mt-auto h-8 bg-zed-header border-t border-zed-border flex items-center justify-between px-8 text-[9px] font-bold tracking-[0.15em] text-text-muted uppercase">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted opacity-30"></span>
                        8 Total Projects
                    </span>
                    <span className="flex items-center gap-2 text-status-red">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-red"></span>
                        1 Critical
                    </span>
                    <span className="flex items-center gap-2 text-status-yellow">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-yellow"></span>
                        2 At Risk
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    System Status:
                    <span className="text-status-green">Optimal</span>
                </div>
            </footer>
        </div>
    );
}
