"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile } from "@/app/actions/user-actions";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ProfileTabProps {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    name: string | null;
    role?: string | null;
    fit_preference?: string | null;
    pronouns?: string | null;
  };
}

export function ProfileTab({ user, profile }: ProfileTabProps) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const res = await updateProfile(formData);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-10 border border-border/50 p-6 md:p-8 bg-background">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 border-b border-border/40 pb-8">
        <div className="h-20 w-20 bg-muted flex items-center justify-center text-foreground font-serif text-3xl shrink-0">
          {profile?.name?.[0].toUpperCase() || user.email?.[0].toUpperCase()}
        </div>

        <div className="text-center md:text-left space-y-1">
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
            {profile?.role === "admin" && (
              <span className="text-[10px] font-medium uppercase tracking-widest bg-foreground text-background px-2 py-0.5">
                Admin
              </span>
            )}
          </div>
          <h2 className="text-2xl font-serif text-foreground">
            {profile?.name || "Member"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {user.email}
          </p>
        </div>
      </div>

      <form action={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label
              htmlFor="name"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Display Name
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={profile?.name || ""}
              placeholder="John Doe"
              className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
            />
          </div>
          <div className="space-y-3">
            <Label
              htmlFor="pronouns"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Pronouns
            </Label>
            <Input
              id="pronouns"
              name="pronouns"
              defaultValue={profile?.pronouns || ""}
              placeholder="they/them"
              className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-3 max-w-md">
          <Label
            htmlFor="fit_preference"
            className="text-[11px] uppercase tracking-wider text-muted-foreground"
          >
            Fit Preference
          </Label>
          <Select
            name="fit_preference"
            defaultValue={profile?.fit_preference || "none"}
          >
            <SelectTrigger className="h-12 rounded-none bg-transparent border-border focus:border-foreground focus:ring-0 transition-colors">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-border shadow-md">
              <SelectItem value="none">No Preference</SelectItem>
              <SelectItem value="oversized">Oversized</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="fitted">Fitted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-6">
          <Button
            disabled={loading}
            type="submit"
            className="rounded-none h-12 px-8 text-xs uppercase tracking-widest min-w-[200px]"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
