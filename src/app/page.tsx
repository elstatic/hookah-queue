import CreateRoomForm from "@/components/CreateRoomForm";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-white">Hookah Queue</h1>
          <p className="text-white/50 mt-2">Очередь на кальян без хаоса</p>
        </div>
        <CreateRoomForm />
      </div>
    </main>
  );
}
