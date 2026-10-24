import Image from "next/image";

export function LogoMark() {
  return (
    <Image
      className="brand-mark"
      src="/images/mr-flynn-mark.png"
      width={600}
      height={532}
      alt=""
      aria-hidden="true"
      priority
    />
  );
}

export function LogoLockup({ priority = false, tagline = "Your home for IB Mathematics" }: { priority?: boolean; tagline?: string | false }) {
  return (
    <span className="brand-lockup" role="img" aria-label={tagline ? `Mr Flynn IB — ${tagline}` : "Mr Flynn IB"}>
      <Image className="brand-lockup-mark" src="/images/mr-flynn-mark.png" width={600} height={532} alt="" aria-hidden="true" priority={priority} />
      <span className="brand-lockup-copy">
        <span className="brand-wordmark"><span>Mr.</span><b aria-hidden="true">+</b><span>Flynn IB</span></span>
        {tagline ? <span className="brand-tagline">{tagline}</span> : null}
      </span>
    </span>
  );
}
