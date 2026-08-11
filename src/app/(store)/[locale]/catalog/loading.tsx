export default function CatalogLoading() {
  return (
    <main className="catalog-loading" aria-label="Loading catalog" aria-busy="true">
      <div className="shell catalog-loading__intro" />
      <div className="shell catalog-loading__layout">
        <div className="catalog-loading__filters" />
        <div className="catalog-loading__grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="catalog-loading__card" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
