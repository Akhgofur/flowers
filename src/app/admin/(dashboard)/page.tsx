import Link from "next/link";
import { formatSum } from "@/shared/format";
import {
  getAdminCategories,
  getAdminOrders,
  getAdminProducts,
} from "@/lib/services/admin-service";

export default async function AdminDashboardPage() {
  const [products, categories, orders] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
    getAdminOrders(),
  ]);
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const activeProducts = products.filter((product) => product.status === "published").length;
  const unpricedProducts = products.filter(
    (product) => product.status === "published" && product.price === undefined
  ).length;
  const orderValue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((total, order) => total + order.total, 0);

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">Bugungi nazorat</p>
          <h1>Do‘kon holati</h1>
          <p>Katalog va buyurtmalardagi eng muhim ko‘rsatkichlar bir joyda.</p>
        </div>
        <Link href="/admin/products" className="admin-primary-button">+ Mahsulot qo‘shish</Link>
      </section>

      <section className="admin-stat-grid" aria-label="Do‘kon statistikasi">
        <article>
          <span>01</span>
          <p>Faol mahsulotlar</p>
          <strong>{activeProducts}</strong>
          <small>Jami {products.length} ta mahsulot</small>
        </article>
        <article>
          <span>02</span>
          <p>Kutilayotgan buyurtmalar</p>
          <strong>{pendingOrders}</strong>
          <small>Tez orada tasdiqlash kerak</small>
        </article>
        <article>
          <span>03</span>
          <p>Buyurtmalar qiymati</p>
          <strong>{formatSum(orderValue, "uz")}</strong>
          <small>Bekor qilinganlarsiz</small>
        </article>
        <article>
          <span>04</span>
          <p>Narxsiz mahsulotlar</p>
          <strong>{unpricedProducts}</strong>
          <small>{categories.length} ta kategoriya boshqaruvda</small>
        </article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-card admin-dashboard-orders">
          <div className="admin-card__header">
            <div>
              <p className="eyebrow">Oxirgi buyurtmalar</p>
              <h2>Harakat talab qiladiganlar</h2>
            </div>
            <Link href="/admin/orders">Barchasi →</Link>
          </div>
          {orders.length === 0 ? (
            <p className="admin-empty-copy">Hali birorta buyurtma yo‘q.</p>
          ) : (
            <div className="admin-mini-list">
              {orders.slice(0, 5).map((order) => (
                <article key={order.id}>
                  <div>
                    <strong>{order.number}</strong>
                    <span>{order.customer.fullName}</span>
                  </div>
                  <em data-status={order.status}>{order.status}</em>
                  <b>{formatSum(order.total, "uz")}</b>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="admin-card admin-dashboard-actions">
          <p className="eyebrow">Tezkor harakatlar</p>
          <h2>Do‘konni yangilang</h2>
          <div>
            <Link href="/admin/products">Mahsulotlarni tahrirlash <span>→</span></Link>
            <Link href="/admin/categories">Kategoriyalarni tartiblash <span>→</span></Link>
            <Link href="/admin/settings">Yetkazib berish narxini sozlash <span>→</span></Link>
          </div>
        </article>
      </section>
    </>
  );
}
