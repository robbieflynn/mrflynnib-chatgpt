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

export function LogoLockup() {
  return (
    <Image
      className="brand-lockup"
      src="/images/mr-flynn-ib-lockup.png"
      width={1400}
      height={356}
      alt="Mr Flynn IB — IB Mathematics video lessons, IA guidance and past paper solutions"
      priority
    />
  );
}
