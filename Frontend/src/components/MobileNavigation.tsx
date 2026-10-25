import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export interface MobileNavigationItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
}

interface MobileNavigationProps {
  items: MobileNavigationItem[];
  label?: string;
}

const MobileNavigation = ({ items, label = "Open navigation menu" }: MobileNavigationProps) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="icon" className="shrink-0 lg:hidden" aria-label={label}>
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="left" className="flex flex-col">
      <SheetHeader>
        <Link to="/" className="mb-2 flex items-center gap-2">
          <BrandLogo className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold text-foreground">Codexa</span>
        </Link>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Navigate to another section.</SheetDescription>
      </SheetHeader>
      <nav aria-label="Mobile navigation" className="mt-4 flex flex-col gap-1">
        {items.map((item) => {
          const content = (
            <>
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </>
          );
          const className =
            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

          return item.href ? (
            <SheetClose asChild key={item.label}>
              <Link to={item.href} className={className} onClick={item.onSelect}>
                {content}
              </Link>
            </SheetClose>
          ) : (
            <SheetClose asChild key={item.label}>
              <button
                type="button"
                className={className}
                onClick={item.onSelect}
              >
                {content}
              </button>
            </SheetClose>
          );
        })}
      </nav>
    </SheetContent>
  </Sheet>
);

export default MobileNavigation;
