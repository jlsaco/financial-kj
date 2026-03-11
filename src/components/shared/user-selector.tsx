"use client";

import { UserId } from "@/types";
import { USERS, ALL_USER_IDS } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserSelectorProps {
  value: UserId;
  onChange: (userId: UserId) => void;
}

export function UserSelector({ value, onChange }: UserSelectorProps) {
  return (
    <div className="flex gap-2">
      {ALL_USER_IDS.map((id) => {
        const user = USERS[id];
        const isSelected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30"
            )}
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback
                className={cn(
                  "text-[10px] text-white",
                  user.color
                )}
              >
                {user.avatar}
              </AvatarFallback>
            </Avatar>
            {user.name}
          </button>
        );
      })}
    </div>
  );
}

interface UserAvatarProps {
  userId: UserId;
  className?: string;
}

export function UserAvatar({ userId, className }: UserAvatarProps) {
  const user = USERS[userId];
  return (
    <Avatar className={cn("h-6 w-6", className)}>
      <AvatarFallback className={cn("text-[10px] text-white", user.color)}>
        {user.avatar}
      </AvatarFallback>
    </Avatar>
  );
}
