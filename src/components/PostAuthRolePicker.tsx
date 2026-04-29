import { Button } from "@/components/ui/button";
import { Users, Star } from "lucide-react";
import type { UserRole } from "@/components/RoleSelection";

interface PostAuthRolePickerProps {
  email?: string;
  onSelect: (role: UserRole) => void;
}

const PostAuthRolePicker = ({ email, onSelect }: PostAuthRolePickerProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm w-full">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            DROPTHAT<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {email ? `Signed in as ${email}.` : "You're signed in."}
          </p>
          <p className="text-muted-foreground text-sm mt-1">Tell us who you are.</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-base font-semibold gap-2"
            onClick={() => onSelect("creator")}
          >
            <Star className="w-5 h-5" />
            I'M A CREATOR
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full text-base font-semibold gap-2 border-primary/30 hover:border-primary hover:text-primary"
            onClick={() => onSelect("customer")}
          >
            <Users className="w-5 h-5" />
            I'M A CUSTOMER
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} DTT. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default PostAuthRolePicker;