import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatMaria from "@/components/chat/ChatMaria";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <ChatMaria />
    </>
  );
}
