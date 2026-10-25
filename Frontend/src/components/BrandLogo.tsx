interface BrandLogoProps {
  className?: string;
}

const BrandLogo = ({ className }: BrandLogoProps) => (
  <img
    src="/codexa-logo.png"
    alt=""
    aria-hidden="true"
    className={className}
  />
);

export default BrandLogo;
