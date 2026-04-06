import { useState, useCallback } from "react";
import { Play, Image as ImageIcon, Lock } from "lucide-react";

interface MediaItem {
  id: string;
  type: "photo" | "video";
  locked: boolean;
  color: string;
}

const generateMedia = (count: number): MediaItem[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `media-${i}`,
    type: i % 3 === 0 ? "video" : "photo",
    locked: i > 3,
    color: [
      "from-pink-900/40 to-purple-900/40",
      "from-blue-900/40 to-teal-900/40",
      "from-amber-900/40 to-orange-900/40",
      "from-violet-900/40 to-indigo-900/40",
      "from-red-900/40 to-pink-900/40",
    ][i % 5],
  }));

const BATCH = 12;

const CreatorMediaGrid = () => {
  const [items, setItems] = useState<MediaItem[]>(() => generateMedia(BATCH));
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setItems((prev) => [...prev, ...generateMedia(BATCH).map((m, i) => ({ ...m, id: `media-${prev.length + i}` }))]);
      setLoading(false);
    }, 400);
  }, [loading]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 200) loadMore();
    },
    [loadMore]
  );

  return (
    <div className="px-4 mt-6">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        Media Gallery
      </h3>
      <div className="max-h-[60vh] overflow-y-auto" onScroll={handleScroll}>
        <div className="grid grid-cols-3 gap-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br ${item.color} bg-card`}
            >
              {item.type === "video" && (
                <div className="absolute top-1.5 right-1.5 z-10">
                  <Play className="w-4 h-4 text-foreground drop-shadow" />
                </div>
              )}
              {item.locked && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorMediaGrid;
