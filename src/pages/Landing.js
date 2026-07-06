import React from "react";
import Nav from "../components/Nav";
import ScrollExperience from "../components/ScrollExperience";
import DetailsScene from "../components/DetailsScene";
import HowToUse from "../components/HowToUse";
import BuyBlock from "../components/BuyBlock";
import Faq from "../components/Faq";
import Footer from "../components/Footer";

export default function Landing() {
  return (
    <>
      <Nav />
      <main>
        {/* Cinematic scroll experience — Hero → statement → ingredients → results */}
        <ScrollExperience />

        {/* Post-cinematic sections on dark ink background */}
        <div className="bg-[#1F1F1F] text-[#F2EEE8]">
          {/* Magnified "See the details" back-label reveal */}
          <DetailsScene />

          {/* How-to-use 3 steps */}
          <HowToUse />

          {/* Buy + waitlist */}
          <BuyBlock />

          {/* FAQ + Footer */}
          <Faq />
          <Footer />
        </div>
      </main>
    </>
  );
}
