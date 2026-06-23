import { Bus } from "lucide-react";
import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Bus className="h-5 w-5 text-primary" />
            <span>Bus Go</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Link href="/login">
              <button className="text-sm font-medium hover:underline">
                Connexion
              </button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Bus Go - Plateforme de gestion de transport</p>
      </footer>
    </div>
  );
}