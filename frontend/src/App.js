import React from "react";
import Nav from "./components/Nav";
import ScrollExperience from "./components/ScrollExperience";
import HowToUse from "./components/HowToUse";
import Faq from "./components/Faq";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="App" data-testid="app-root">
      <Nav />
      <main>
        {/* The pinned/scroll cinematic experience — Hero through Results */}
        <ScrollExperience />

        {/* Post-cinematic sections on dark ink background */}
        <div className="bg-[#1F1F1F] text-[#F2EEE8]">
          <HowToUse />
          <Faq />
          <Footer />
        </div>
      </main>
    </div>
  );
}

export default App;
