import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function LastUpdated() {
  const [timestamp, setTimestamp] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 flex items-center justify-center gap-2 pb-6 text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      Last updated {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </div>
  );
}
