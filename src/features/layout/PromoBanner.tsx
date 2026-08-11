export type PromoBannerProps = {
  onSelectGiftCategory: () => void;
};

export function PromoBanner({ onSelectGiftCategory }: PromoBannerProps) {
  return (
    <section id="gift" className="promo section" tabIndex={-1}>
      <div className="shell promo__card">
        <div className="promo__ornament" aria-hidden="true">
          <span>✿</span>
          <span>❀</span>
          <span>✿</span>
        </div>
        <div className="promo__content">
          <p className="eyebrow">Tayyor sovg'a marosimi</p>
          <h2>Guldan ko'ra ko'proq e'tibor</h2>
          <p>
            Nafis quti, tabriknoma va yangi gullarni bir tanlovda jamlang.
            Floristimiz uni siz uchun tayyorlaydi.
          </p>
          <button className="secondary-button" type="button" onClick={onSelectGiftCategory}>
            Sovg'a qutilarini tanlash
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
