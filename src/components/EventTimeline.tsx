import { useMemo } from "react";
import { useInsights } from "@/hooks/useReports";

interface Event {
  id: string;
  date: string;
  title: string;
  description: string;
}

export default function EventTimeline() {
  const { data: insights } = useInsights();

  const events: Event[] = useMemo(() => {
    if (!insights) return [];
    return insights
      .filter((insight) => !insight.is_numerical)
      .map((insight) => ({
        id: insight.id,
        date: new Date(insight.created_at).toLocaleDateString(),
        title: insight.label,
        description: insight.value,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [insights]);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Event Timeline</h2>
      <div className="relative border-l-2 border-gray-700">
        {events.map((event, index) => (
          <div key={event.id} className="mb-8 flex items-center w-full">
            <div className="absolute -left-1.5 w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="ml-6 bg-gray-800 p-4 rounded-lg w-full">
              <p className="font-bold text-lg">{event.title}</p>
              <p className="text-sm text-gray-400 mb-2">{event.date}</p>
              <p>{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
