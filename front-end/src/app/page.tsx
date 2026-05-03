import Navbar from '@/components/Navbar';
import Banner from '@/sections/Banner';
import OurServices from '@/sections/OurServices';
import AboutUsLanding from '@/sections/AboutUs';
import ContactUs from '@/sections/ContactUsLanding';
import Footer from '@/components/Footer';
import ChatbotFloatingButton from '@/components/ChatbotFloatingButton';

function App() {
  return (
    <>
      <Navbar />
      <Banner />
      <OurServices />
      <AboutUsLanding />
      <ContactUs />
      <Footer />
      <ChatbotFloatingButton />
    </>
  );
}

export default App;