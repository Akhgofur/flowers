export default function ProductLoading() {
  return (
    <main className="product-loading shell" aria-busy="true" aria-label="Mahsulot yuklanmoqda">
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
