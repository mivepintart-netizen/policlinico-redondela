import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogoProvider from "@/components/CatalogoProvider";
import { cargarCatalogo } from "@/lib/catalogo";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Siempre datos frescos (precios, profesionales y festivos los cambia la clínica)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  let catalogo;
  try {
    catalogo = await cargarCatalogo(supabaseServidor());
  } catch (e) {
    console.error("No se pudo cargar el catálogo", e);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {catalogo ? (
          <CatalogoProvider catalogo={catalogo}>{children}</CatalogoProvider>
        ) : (
          <div className="mx-auto max-w-md px-4 pb-20 pt-32 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">No podemos cargar las citas ahora mismo</h1>
            <p className="mt-2 text-tinta-suave">Inténtalo de nuevo en unos minutos o llámanos para reservar.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
