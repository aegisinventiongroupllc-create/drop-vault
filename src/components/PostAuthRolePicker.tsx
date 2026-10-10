import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Star } from "lucide-react";
import type { UserRole } from "@/components/RoleSelection";
import type { VaultType } from "@/lib/tokenEconomy";
import LegalFooter from "@/components/LegalFooter";
import { useCreatorText } from "@/i18n/creator";

interface PostAuthRolePickerProps {
  email?: string;
  onSelect: (role: UserRole, creatorSide?: VaultType) => void;
}

const PostAuthRolePicker = ({ email, onSelect }: PostAuthRolePickerProps) => {
  const [pickingSide, setPickingSide] = useState(false);
  const ct = useCreatorText();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            DROPTHAT<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {email ? ct.signed_in_as(email) : ct.signed_in}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {pickingSide ? ct.which_vault : ct.who_are_you}
          </p>
        </div>

        {pickingSide ? (
          <div className="flex flex-col gap-3 w-full">
            <Button
              variant="neon"
              size="lg"
              className="w-full text-base font-semibold"
              onClick={() => onSelect("creator", "women")}
            >
              {ct.womens_vault}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full text-base font-semibold border-primary/30 hover:border-primary hover:text-primary"
              onClick={() => onSelect("creator", "men")}
            >
              {ct.mens_vault}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground tracking-widest mt-1"
              onClick={() => setPickingSide(false)}
            >
              {ct.back}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            <Button
              variant="neon"
              size="lg"
              className="w-full text-base font-semibold gap-2"
              onClick={() => setPickingSide(true)}
            >
              <Star className="w-5 h-5" />
              {ct.im_creator}
            </Button>
            <p className="text-center text-xs font-bold tracking-widest text-primary">
              {ct.founding}
            </p>
            <Button
              variant="outline"
              size="lg"
              className="w-full text-base font-semibold gap-2 border-primary/30 hover:border-primary hover:text-primary"
              onClick={() => onSelect("customer")}
            >
              <Users className="w-5 h-5" />
              {ct.im_customer}
            </Button>
          </div>
        )}

      </div>
      <LegalFooter />
      </div>
    </div>
  );
};

export default PostAuthRolePicker;
