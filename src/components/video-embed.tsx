export function VideoEmbed({
  title,
  videoId,
  playlistId,
}: {
  title: string;
  videoId?: string;
  playlistId?: string;
}) {
  const src = playlistId
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`
    : `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <div className="video-frame">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
