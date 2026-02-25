"use client";

interface StudentViewGridProps {
  className?: string;
}

const MOCK_STUDENTS = [
  { id: "s1", name: "Student 1", status: "viewing" },
  { id: "s2", name: "Student 2", status: "viewing" },
  { id: "s3", name: "Student 3", status: "idle" },
  { id: "s4", name: "Student 4", status: "viewing" },
];

export function StudentViewGrid({ className }: StudentViewGridProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Student Sessions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {MOCK_STUDENTS.map((student) => (
          <div
            key={student.id}
            className="border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-colors cursor-pointer"
          >
            <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
              <span className="text-2xl opacity-30">👤</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{student.name}</span>
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  student.status === "viewing"
                    ? "bg-green-400"
                    : "bg-gray-300"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
