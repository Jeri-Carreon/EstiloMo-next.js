import Navbar from '@/components/Navbar';
import Banner from '@/sections/Banner';
import OurServices from '@/sections/OurServices';
import AboutUsLanding from './aboutUs/page';
import ContactUs from '@/sections/ContactUs';
import Footer from '@/components/Footer';


function App() {
  return (
    <>
      <Navbar />
      <Banner />
      <OurServices />
      <AboutUsLanding />
      <ContactUs />
      <Footer />


    </>
  );
}

export default App;