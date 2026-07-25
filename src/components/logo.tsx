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
