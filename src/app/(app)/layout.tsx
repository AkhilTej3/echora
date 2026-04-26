import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto bg-[#121212] p-4 md:p-6 pb-36 md:pb-6">
          {children}
        </main>
      </div>
      <Player />
      <BottomNav />
    </div>
  );
}
