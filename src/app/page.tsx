import { TaskItem } from "@/components/ui/TaskItem";

const overdueTasks = [
  { id: 1, title: "Fix auth token refresh", project: "ADF Framework", priority: "P1", status: "blocked" },
  { id: 2, title: "Update connector error handling", project: "Work Management", priority: "P2", status: "pending" },
] as const;

const todayTasks = [
  { id: 3, title: "Review design brief feedback", project: "Consulting: Acme", priority: "P1", status: "in_progress" },
  { id: 4, title: "Draft quarterly board update", project: "Board Governance", priority: "P2", status: "pending" },
  { id: 5, title: "Migrate user settings schema", project: "SaaS Product", priority: "P3", status: "pending" },
] as const;

export default function Home() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col min-h-full bg-zed-main p-8 lg:p-12">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-10">
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">Today</h2>
          <p className="text-xs text-text-secondary mt-1 font-medium">{today} • 9 tasks</p>
        </header>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4 px-6">
            <h3 className="text-[10px] font-bold text-status-red tracking-widest uppercase">Overdue</h3>
            <span className="text-[10px] text-text-muted font-bold font-mono">({overdueTasks.length})</span>
            <div className="h-[1px] flex-1 bg-zed-border/50"></div>
          </div>
          <div className="bg-zed-sidebar/30 rounded-lg border border-zed-border/30 overflow-hidden backdrop-blur-sm">
            {overdueTasks.map((task) => (
              <TaskItem key={task.id} {...task} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4 px-6">
            <h3 className="text-[10px] font-bold text-text-secondary tracking-widest uppercase">Today</h3>
            <span className="text-[10px] text-text-muted font-bold font-mono">({todayTasks.length})</span>
            <div className="h-[1px] flex-1 bg-zed-border/50"></div>
          </div>
          <div className="bg-zed-sidebar/30 rounded-lg border border-zed-border/30 overflow-hidden backdrop-blur-sm">
            {todayTasks.map((task) => (
              <TaskItem key={task.id} {...task} />
            ))}
          </div>
        </section>
      </div>

      {/* Visual background element */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3"></div>
    </div>
  );
}
