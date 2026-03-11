import { Category } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  HeartPulse,
  Home,
  CreditCard,
  Wifi,
} from "lucide-react";

const ICON_MAP = {
  Car,
  HeartPulse,
  Home,
  CreditCard,
  Wifi,
};

interface CategoryBadgeProps {
  category: Category;
  showIcon?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  showIcon = true,
  className,
}: CategoryBadgeProps) {
  const config = CATEGORIES[category];
  const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];

  return (
    <Badge variant="secondary" className={`${config.bgLight} ${className ?? ""}`}>
      {showIcon && Icon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
