import {
  Header,
  Hero,
  Segments,
  Problems,
  Solutions,
  BeforeAfter,
  Plans,
  FAQ,
  Footer,
} from '@/components/landing';

const WHATSAPP_NUMBER = '5511999999999'; // Configure o número real aqui

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background landing-theme">
      <Header />
      <main>
        <Hero whatsappNumber={WHATSAPP_NUMBER} />
        <Segments />
        <Problems />
        <Solutions />
        <BeforeAfter />
        <Plans />
        <FAQ />
      </main>
      <Footer whatsappNumber={WHATSAPP_NUMBER} />
    </div>
  );
}
