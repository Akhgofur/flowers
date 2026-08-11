import { useTranslations } from "next-intl";

export default function ProductLoading() {
  const t = useTranslations("Product");

  return (
    <main className="product-loading shell" aria-busy="true" aria-label={t("loadingLabel")}>
      <div className="product-loading__image shimmer-block" />
      <div className="product-loading__content">
        <span className="shimmer-line shimmer-line--short" />
        <span className="shimmer-line shimmer-line--title" />
        <span className="shimmer-line shimmer-line--title" />
        <span className="shimmer-line" />
        <span className="shimmer-line" />
        <span className="shimmer-line shimmer-line--button" />
      </div>
    </main>
  );
}
