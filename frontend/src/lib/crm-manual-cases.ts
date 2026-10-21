export type CrmManualCase = {
  id: string;
  companyName: string;
  orgNumber: string;
  contactName: string;
  email: string;
  receivedAt: string;
  status: string;
  summary: string;
  nextStep: string;
  contactPolicy: "await_customer" | "manual_review" | "closed";
  reviewDate: string | null;
  sourceFile: string;
};

export type CrmManualCaseWithEmail = CrmManualCase & { originalEmail: string };
