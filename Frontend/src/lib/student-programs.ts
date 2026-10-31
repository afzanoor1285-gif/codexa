export const STUDENT_PROGRAMS = [
  { value: "BSCS", label: "BS Computer Science" },
  { value: "BSAI", label: "BS Artificial Intelligence (AI)" },
  { value: "BSSE", label: "BS Software Engineering" },
  { value: "BSIT", label: "BS Information Technology" },
  { value: "BSDS", label: "BS Data Science" },
  { value: "BSCY", label: "BS Cyber Security" },
  { value: "BSCE", label: "BS Computer Engineering" },
  { value: "BEE", label: "BS Electrical Engineering" },
  { value: "BSEE", label: "BS Electronics Engineering" },
  { value: "BSTE", label: "BS Telecom Engineering" },
  { value: "BSCSE", label: "BS Computer Systems Engineering" },
  { value: "OTHER", label: "Other" },
] as const;

export const UNSPECIFIED_PROGRAM = "UNSPECIFIED";
export const STUDENT_SEMESTERS = Array.from({ length: 8 }, (_, index) => index + 1);

export const getStudentProgramLabel = (program?: string | null) =>
  STUDENT_PROGRAMS.find((option) => option.value === program)?.label ??
  (program ? "Other / unlisted program" : "Program not provided");
