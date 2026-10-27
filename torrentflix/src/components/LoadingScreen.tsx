export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-surface-600" />
        <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
      <p className="text-white/60 text-sm">Resolving torrent metadata...</p>
      <p className="text-white/30 text-xs mt-2">Finding peers via WebRTC</p>
    </div>
  );
}
