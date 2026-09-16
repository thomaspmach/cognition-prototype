import { statusLabels, type CaseEvent } from "@/lib/kyc/model";

export function CaseHistory({ events }: { events: CaseEvent[] }) {
  return (
    <section className="mt-6 border-t pt-6" aria-labelledby="history-title">
      <h3 id="history-title" className="text-sm font-semibold">Activity</h3>
      {events.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No review events yet.</p> : (
        <ol className="mt-4 space-y-4">
          {[...events].reverse().map((event) => (
            <li key={event.id} className="border-l-2 border-border pl-4 text-sm">
              <p className="font-medium">
                {event.kind === "assignment"
                  ? `${event.fromAssigneeName || "Unassigned"} → ${event.toAssigneeName || "Unassigned"}`
                  : `${statusLabels[event.fromStatus]} → ${statusLabels[event.toStatus]}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{event.actorName} · <time dateTime={event.createdAt}>
                {event.createdAt.slice(0, 19).replace("T", " ")} UTC
              </time></p>
              {event.reason && <p className="mt-2 whitespace-pre-wrap break-words leading-6">{event.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
