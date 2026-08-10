type ComingSoonNoticeProps = {
  badge: string;
  title: string;
  description: string;
  descriptionId?: string;
  className?: string;
};

export function ComingSoonNotice({ badge, title, description, descriptionId, className = "" }: ComingSoonNoticeProps) {
  return (
    <aside className={`coming-soon-notice ${className}`.trim()} aria-label={`${badge}: ${title}`}>
      <span className="coming-soon-notice__badge">{badge}</span>
      <div>
        <h2 className="coming-soon-notice__title">{title}</h2>
        <p id={descriptionId} className="coming-soon-notice__description">{description}</p>
      </div>
    </aside>
  );
}
