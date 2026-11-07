export type Company = {
  id: string;
  name: string;
  owner_id: string;
  level: number;
  xp: number;
  treasury_vnd: number;
  created_at: string;
};
export type Employee = {
  id: string;
  company_id: string;
  full_name: string;
  role: string;
  department: string;
  skill: number;
  morale: number;
  energy: number;
  salary_vnd: number;
  status: 'idle' | 'working';
  pos_x: number;
  pos_z: number;
};
export type Task = {
  id: string;
  company_id: string;
  employee_id: string;
  title: string;
  description: string;
  reward_vnd: number;
  progress: number;
  auto_mode: boolean;
  duration_minutes: number;
  due_at: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
};
export type Transaction = {
  id: string;
  amount_vnd: number;
  balance_after_vnd: number;
  kind: string;
  note: string;
  created_at: string;
};
export type ChatMessage = {
  id: string;
  actor: 'user' | 'assistant';
  content: string;
  created_at: string;
};
export type GameState = {
  company: Company | null;
  employees: Employee[];
  tasks: Task[];
  transactions: Transaction[];
  ceoProfile?: CEOProfile | null;
  learning?: CEOLearning[];
  certificate?: CEOCertificate | null;
  contracts?: Contract[];
  decisions?: CEODecision[];
  payrolls?: PayrollPeriod[];
};

export type CEOProfile = {user_id:string;display_name:string;bio:string;updated_at:string};
export type CEOLearning = {company_id:string;lesson_id:string;best_score:number;passed_at:string};
export type CEOCertificate = {id:string;company_id:string;code:string;issued_at:string};
export type Contract = {id:string;company_id:string;client_name:string;title:string;revenue_vnd:number;cost_vnd:number;status:'signed'|'completed';signed_at:string;completed_at:string|null};
export type CEODecision = {company_id:string;scenario_key:string;choice_index:number;delta_vnd:number;xp_gain:number;decided_at:string};
export type AcademyQuestion = {q:string;options:string[]};
export type AcademyLesson = {id:string;title:string;theory:string;example:string;exercise:string;questions:AcademyQuestion[]};
export type AcademyChapter = {id:string;title:string;description:string;lessons:AcademyLesson[]};

export type PayrollPeriod = {company_id:string;period:string;total_vnd:number;paid_at:string};

/** A CEO-controlled, persistent meeting. Does not imply autonomous LLM discussion. */
export type CompanyMeeting = {
  id: string;
  company_id: string;
  title: string;
  agenda: string;
  attendee_ids: string[];
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
  minutes_text: string;
};
export type MeetingFeed = { active: CompanyMeeting | null; history: CompanyMeeting[] };

/** Role-played AI council discussion generated in one bounded provider call. */
export type MeetingAITurn = { employeeId: string; round: 1 | 2; content: string };
export type MeetingAIDebate = {
  id: string; company_id: string; meeting_id: string; employee_ids: string[];
  provider: 'gemini' | 'openai'; status: 'running' | 'completed' | 'failed';
  transcript: MeetingAITurn[]; summary: string; recommendation: string;
  created_at: string; updated_at: string; completed_at: string | null;
};

/** v20: a CEO-approved work item linked to a real scheduled game task. */
export type MeetingAction = {
  id: string; meeting_id: string; employee_id: string; client_request_id: string;
  title: string; description: string; reward_vnd: number; duration_minutes: number;
  approved_at: string;
  report?: WorkReport | null;
  task: { id: string; status: 'in_progress' | 'completed' | 'cancelled'; progress: number; auto_mode: boolean;
    due_at: string | null; completed_at: string | null };
};

/** v23: snapshots of each edited document within one work-report revision. */
export type HandoffRubric = { category: string; categoryLabel: string; score: number;
  checks: { id: string; label: string; passed: boolean }[]; warnings: string[] };
export type HandoffVersion = { version_no: number; provider: 'simulated'|'gemini'|'openai';
  feedback: string; document: { title: string; summary: string; sections: { heading:string; body:string }[];
    nextSteps:string; caveats:string };
  quality: { passed:boolean; score:number; rubric?:HandoffRubric };
  created_at:string };

/** v21: deterministic simulated report generated when a council task reaches its deadline. */
export type MeetingHandoff = {
  id: string;
  revision_no: number;
  handoff_version?: number;
  latest_feedback?: string;
  versions?: HandoffVersion[];
  provider: 'simulated' | 'gemini' | 'openai';
  document: {
    title: string; summary: string;
    sections: { heading: string; body: string }[];
    nextSteps: string; caveats: string;
  };
  quality: {
    passed: boolean; score: number;
    checks: { id: string; label: string; passed: boolean }[];
    warnings: string[];
    rubric?: HandoffRubric;
  };
  created_at: string;
};

export type WorkReport = {
  id: string;
  status: 'awaiting_review' | 'revision_requested' | 'approved' | 'rejected';
  revision_no: number;
  content: string;
  review_notes: string;
  source: 'time_simulation';
  handoff?: MeetingHandoff | null;
  submitted_at: string;
  reviewed_at: string | null;
};
