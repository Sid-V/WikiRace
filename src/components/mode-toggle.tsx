"use client"

import { Moon } from "lucide-react";
import { Button } from "~/components/ui/button";

export const ModeToggle = () => {
  return (
    <Button variant="outline" size="icon" aria-label="Dark mode (locked)">
      <Moon className="h-[1.2rem] w-[1.2rem]" />
    </Button>
  );
};
