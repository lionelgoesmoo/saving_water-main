import Image from "next/image";

export default function PluvialLogo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/assets/Hand Holding Water Droplet.png"
      alt="Pluvial logo"
      width={size}
      height={size}
      className="object-contain"
      priority
    />
  );
}
