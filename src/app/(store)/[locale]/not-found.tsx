import { Link } from "@/i18n/navigation";

export default function StoreNotFound() {
  return (
    <main className="store-not-found" aria-labelledby="store-not-found-title">
      <p className="eyebrow">Nafis Flowers</p>
      <h1 id="store-not-found-title">Bu gul sahifasi topilmadi</h1>
      <p>Manzil o‘zgargan yoki mahsulot hozir katalogda mavjud emas.</p>
      <Link className="primary-button" href="/catalog">
        Katalogga qaytish
      </Link>
    </main>
  );
}
