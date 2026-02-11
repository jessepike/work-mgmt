export default function Loading() {
    return (
        <div className="flex flex-col min-h-full bg-zed-main p-8 lg:p-12">
            <div className="max-w-4xl mx-auto w-full">
                <div className="mb-10">
                    <div className="h-7 w-32 bg-zed-active rounded animate-pulse" />
                    <div className="h-4 w-48 bg-zed-active/50 rounded animate-pulse mt-2" />
                </div>
                <div className="space-y-12">
                    {[1, 2].map((i) => (
                        <div key={i}>
                            <div className="h-3 w-20 bg-zed-active/50 rounded animate-pulse mb-4 ml-6" />
                            <div className="bg-zed-sidebar/30 rounded-lg border border-zed-border/30 overflow-hidden">
                                {[1, 2, 3].map((j) => (
                                    <div key={j} className="flex items-center h-10 px-6 border-b border-zed-border/30 last:border-none">
                                        <div className="h-4 w-4 bg-zed-active rounded-full animate-pulse" />
                                        <div className="h-3 flex-1 bg-zed-active/50 rounded animate-pulse ml-4 max-w-[300px]" />
                                        <div className="h-3 w-16 bg-zed-active/30 rounded animate-pulse ml-auto" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
