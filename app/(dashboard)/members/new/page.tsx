import { PageHeader } from "@/components/shared/PageHeader";
import { MemberForm } from "@/components/members/MemberForm";

export default function NewMemberPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Register New Member"
        description="Fill in the details to register a new cooperative member"
      />
      <MemberForm />
    </div>
  );
}
